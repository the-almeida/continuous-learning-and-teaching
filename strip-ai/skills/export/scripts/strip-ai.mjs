#!/usr/bin/env node
// Deterministic half of /strip-ai:export. The skill drives these steps and
// does the judgment work (cleaning references, fixing tests) in between.
//
//   prepare <project>            copy the project to a temp work dir
//   env-in  <workRoot>           copy the source's git-ignored .env files in, for test runs only
//   strip   <workRoot>           delete AI tooling files and folders
//   scan    <workRoot> [--json]  list AI references, PII and secrets (masked)
//   redact  <workRoot>           replace high-confidence PII and secrets
//   zip     <workRoot> [--name n] [--out file] [--allow-env path]... [--force]
//   cleanup <workRoot>           delete the work dir
//
// The original project is never written to.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { git, executableFiles, isGitRepo, listFiles, listIgnoredFiles } from './lib/git.mjs'
import { collectIdentities } from './lib/identity.mjs'
import { redactTree } from './lib/redact.mjs'
import { aiPathToRemove, isEnvFile } from './lib/rules.mjs'
import { scanTree } from './lib/scan.mjs'
import { readZip, writeZip } from './lib/zip.mjs'

const WORK_PREFIX = 'strip-ai-'
const HEAVY_DIRS = new Set([
  '.git', 'node_modules', '.next', '.nuxt', '.turbo', '.cache', 'dist', 'build', 'out',
  'target', '.venv', 'venv', '__pycache__', '.pytest_cache', 'coverage', '.gradle',
])

function fail(message) {
  console.error(`strip-ai: ${message}`)
  process.exit(1)
}

function print(obj) {
  console.log(JSON.stringify(obj, null, 2))
}

function native(base, rel) {
  return path.join(base, ...rel.split('/'))
}

function loadState(workRoot) {
  const file = path.join(workRoot ?? '', 'state.json')
  if (!workRoot || !fs.existsSync(file)) fail(`no work dir at ${workRoot}. Run "prepare" first.`)
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function loadIdentity(workRoot) {
  return JSON.parse(fs.readFileSync(path.join(workRoot, 'identity.json'), 'utf8'))
}

function walk(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!HEAVY_DIRS.has(entry.name)) walk(path.join(dir, entry.name), base, out)
    } else if (entry.isFile()) {
      out.push(path.relative(base, path.join(dir, entry.name)).split(path.sep).join('/'))
    }
  }
  return out
}

/** Files that would go into the zip: everything not ignored by the project's own .gitignore. */
function exportFiles(workDir) {
  return listFiles(workDir).filter((rel) => {
    const abs = native(workDir, rel)
    return fs.existsSync(abs) && fs.statSync(abs).isFile()
  })
}

function prepare(projectArg) {
  const source = path.resolve(projectArg ?? process.cwd())
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) fail(`not a directory: ${source}`)
  const name = path.basename(source)
  const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), WORK_PREFIX))
  const workDir = path.join(workRoot, name)

  const fromGit = isGitRepo(source)
  const files = fromGit ? listFiles(source) : walk(source)
  let copied = 0
  for (const rel of files) {
    const from = native(source, rel)
    if (!fs.existsSync(from) || !fs.statSync(from).isFile()) continue // deleted or submodule
    const to = native(workDir, rel)
    fs.mkdirSync(path.dirname(to), { recursive: true })
    fs.copyFileSync(from, to)
    copied++
  }
  fs.mkdirSync(workDir, { recursive: true })
  // A private repo inside the work dir gives the export the project's own .gitignore semantics.
  git(workDir, ['-c', 'init.defaultBranch=main', 'init', '-q'])

  const state = {
    source,
    name,
    workDir,
    fromGit,
    executables: fromGit ? executableFiles(source) : [],
    createdAt: new Date().toISOString(),
  }
  fs.writeFileSync(path.join(workRoot, 'state.json'), JSON.stringify(state, null, 2))
  // Raw identities stay in the temp work root only. They are needed to redact and are deleted by cleanup.
  const identity = fromGit ? collectIdentities(source) : { names: [], emails: [], handles: [] }
  fs.writeFileSync(path.join(workRoot, 'identity.json'), JSON.stringify(identity))
  print({
    workRoot,
    workDir,
    files: copied,
    source: fromGit ? 'git (tracked + untracked, .gitignore respected)' : 'directory walk (no git)',
    identities: { names: identity.names.length, emails: identity.emails.length, handles: identity.handles.length },
  })
}

function envIn(workRoot) {
  const state = loadState(workRoot)
  if (!state.fromGit) return print({ copied: [], note: 'source is not a git repo; env files were already copied' })
  const copied = []
  for (const rel of listIgnoredFiles(state.source)) {
    const base = path.posix.basename(rel)
    if (!isEnvFile(base) || rel.split('/').some((p) => HEAVY_DIRS.has(p))) continue
    const to = native(state.workDir, rel)
    if (fs.existsSync(to)) continue
    fs.mkdirSync(path.dirname(to), { recursive: true })
    fs.copyFileSync(native(state.source, rel), to)
    copied.push(rel)
  }
  print({ copied, note: 'These stay git-ignored in the work dir, so "zip" leaves them out.' })
}

function strip(workRoot) {
  const state = loadState(workRoot)
  const targets = new Set()
  for (const rel of listFiles(state.workDir)) {
    const target = aiPathToRemove(rel)
    if (target) targets.add(target)
  }
  // Names of the removed commands, skills and agents, so references like /name or @name can be found.
  const aiNames = new Set(state.aiNames ?? [])
  for (const rel of listFiles(state.workDir)) {
    if (!aiPathToRemove(rel)) continue
    const m =
      /(?:^|\/)(?:commands|agents|prompts|chatmodes)\/(?:.*\/)?([^/]+?)(?:\.(?:prompt|chatmode|agent))?\.md$/i.exec(rel) ??
      /(?:^|\/)skills\/([^/]+)\/SKILL\.md$/i.exec(rel)
    if (m) aiNames.add(m[1])
  }
  for (const target of targets) fs.rmSync(native(state.workDir, target), { recursive: true, force: true })
  state.aiNames = [...aiNames].sort()
  fs.writeFileSync(path.join(workRoot, 'state.json'), JSON.stringify(state, null, 2))
  print({ removed: [...targets].sort(), aiCommandNames: state.aiNames })
}

function summarize(findings) {
  const bySeverity = {}
  for (const f of findings) {
    bySeverity[f.severity] ??= {}
    bySeverity[f.severity][f.rule] = (bySeverity[f.severity][f.rule] ?? 0) + 1
  }
  return bySeverity
}

function scan(workRoot, flags) {
  const state = loadState(workRoot)
  const findings = scanTree(state.workDir, exportFiles(state.workDir), loadIdentity(workRoot), state.aiNames)
  fs.writeFileSync(path.join(workRoot, 'findings.json'), JSON.stringify(findings, null, 2))
  if (flags.json) return print(findings)
  console.log(JSON.stringify({ counts: summarize(findings), full: path.join(workRoot, 'findings.json') }, null, 2))
  const order = ['block', 'review', 'clean']
  const seen = new Set()
  const shown = findings
    .filter((f) => order.includes(f.severity))
    .filter((f) => {
      const key = `${f.severity}\0${f.rule}\0${f.file}\0${f.line}`
      return !seen.has(key) && seen.add(key)
    })
    .sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity))
  for (const f of shown.slice(0, 400)) console.log(`${f.severity.padEnd(6)} ${f.rule.padEnd(20)} ${f.file}:${f.line}  ${f.value}`)
  if (shown.length > 400) console.log(`... ${shown.length - 400} more in findings.json`)
}

function redact(workRoot) {
  const state = loadState(workRoot)
  const result = redactTree(state.workDir, exportFiles(state.workDir), loadIdentity(workRoot))
  fs.writeFileSync(path.join(workRoot, 'redactions.json'), JSON.stringify(result, null, 2))
  print({
    filesChanged: result.changedFiles.length,
    renamed: result.renamed,
    redactions: result.redactions.map((r) => `${r.category}: ${r.original} -> ${r.placeholder} (${r.count}x in ${r.files.length} file(s))`),
    full: path.join(workRoot, 'redactions.json'),
  })
}

function zip(workRoot, flags) {
  const state = loadState(workRoot)
  const files = exportFiles(state.workDir).filter((rel) => rel !== '.git' && !rel.startsWith('.git/'))
  const problems = []

  for (const rel of files) if (aiPathToRemove(rel)) problems.push(`AI tooling file still present: ${rel}`)
  for (const rel of files) {
    if (isEnvFile(path.posix.basename(rel)) && !flags.allowEnv.includes(rel)) {
      problems.push(`env file would be included: ${rel} (blank its secrets, then pass --allow-env ${rel}, or delete it)`)
    }
  }
  const blocking = scanTree(state.workDir, files, loadIdentity(workRoot)).filter((f) => f.severity === 'block')
  if (blocking.length && !flags.force) {
    for (const f of blocking.slice(0, 50)) problems.push(`${f.rule} at ${f.file}:${f.line} (${f.value})`)
    if (blocking.length > 50) problems.push(`... ${blocking.length - 50} more blocking findings`)
  }
  if (problems.length) fail(`refusing to zip:\n  - ${problems.join('\n  - ')}`)

  const rootName = flags.name ?? state.name
  let out = flags.out ? path.resolve(flags.out) : path.join(path.dirname(state.source), `${rootName}-clean.zip`)
  if (!flags.out && fs.existsSync(out)) out = out.replace(/\.zip$/, `-${Date.now()}.zip`)
  const executables = new Set(state.executables)
  const entries = files.sort().map((rel) => {
    const abs = native(state.workDir, rel)
    const stat = fs.statSync(abs)
    const exec = executables.has(rel) || (process.platform !== 'win32' && stat.mode & 0o111)
    return { name: `${rootName}/${rel}`, data: fs.readFileSync(abs), mode: exec ? 0o755 : 0o644, mtime: stat.mtime }
  })
  writeZip(out, entries)
  const check = readZip(out)
  if (check.length !== entries.length) fail(`zip verification failed: wrote ${entries.length}, read ${check.length}`)
  print({
    zip: out,
    report: out.replace(/\.zip$/, '.report.md'),
    files: entries.length,
    bytes: fs.statSync(out).size,
    forcedPastFindings: flags.force ? blocking.length : 0,
  })
}

function cleanup(workRoot) {
  const resolved = path.resolve(workRoot ?? '')
  const inTmp = path.dirname(resolved) === path.resolve(os.tmpdir())
  if (!inTmp || !path.basename(resolved).startsWith(WORK_PREFIX) || !fs.existsSync(path.join(resolved, 'state.json'))) {
    fail(`refusing to delete ${resolved}: not a strip-ai work dir`)
  }
  fs.rmSync(resolved, { recursive: true, force: true })
  print({ deleted: resolved })
}

function parseFlags(args) {
  const flags = { allowEnv: [], json: false, force: false }
  const positional = []
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--json') flags.json = true
    else if (a === '--force') flags.force = true
    else if (a === '--name') flags.name = args[++i]
    else if (a === '--out') flags.out = args[++i]
    else if (a === '--allow-env') flags.allowEnv.push(args[++i])
    else positional.push(a)
  }
  return { flags, positional }
}

const [command, ...rest] = process.argv.slice(2)
const { flags, positional } = parseFlags(rest)
const commands = {
  prepare: () => prepare(positional[0]),
  'env-in': () => envIn(positional[0]),
  strip: () => strip(positional[0]),
  scan: () => scan(positional[0], flags),
  redact: () => redact(positional[0]),
  zip: () => zip(positional[0], flags),
  cleanup: () => cleanup(positional[0]),
}
if (!commands[command]) fail(`unknown command "${command ?? ''}". Use: ${Object.keys(commands).join(', ')}`)
commands[command]()
