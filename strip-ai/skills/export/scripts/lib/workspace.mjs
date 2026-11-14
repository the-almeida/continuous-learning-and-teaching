// The work dir: a private copy of the project where every change happens.
// It is a git repo with one baseline commit, so every change the export
// makes (by the script or by Claude) is a reviewable diff, and files the
// project tracks are exported even when they match its .gitignore.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { crlfToLf, isInside, native, readJson, sha256, writeJson } from './files.mjs'
import { autocrlfPaths, indexModes, isGitRepo, isShallow, listSourceFiles, workGit } from './git.mjs'

export const WORK_PREFIX = 'strip-ai-'
export const STATE_VERSION = 2
export const HEAVY_DIRS = new Set([
  '.git', 'node_modules', '.next', '.nuxt', '.svelte-kit', '.turbo', '.cache', '.parcel-cache', 'dist',
  'build', 'out', 'target', '.venv', 'venv', '__pycache__', '.pytest_cache', '.mypy_cache', 'coverage',
  '.gradle', '.terraform', 'vendor', 'Pods', 'bower_components',
])

export function workPath(workRoot, name) {
  return path.join(workRoot, name)
}

export function loadState(workRoot) {
  const file = workPath(workRoot ?? '', 'state.json')
  if (!workRoot || !fs.existsSync(file)) throw new Error(`no work dir at ${workRoot}. Run "prepare" first.`)
  const state = readJson(file)
  if (state.version !== STATE_VERSION) throw new Error(`work dir ${workRoot} was made by another version of strip-ai. Run "prepare" again.`)
  return state
}

export function saveState(workRoot, state) {
  writeJson(workPath(workRoot, 'state.json'), state)
}

function inHeavyDir(rel) {
  return rel.split('/').slice(0, -1).some((p) => HEAVY_DIRS.has(p))
}

function walk(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!HEAVY_DIRS.has(entry.name)) walk(path.join(dir, entry.name), base, out)
    } else out.push(path.relative(base, path.join(dir, entry.name)).split(path.sep).join('/'))
  }
  return out
}

/**
 * Copies the project into a new work dir. Returns { workRoot, state }.
 * Never writes to the source.
 */
export function prepareWork(sourceArg) {
  const source = path.resolve(sourceArg)
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) throw new Error(`not a directory: ${source}`)
  const fromGit = isGitRepo(source)
  let tracked = []
  let untracked = []
  let modes = new Map()
  let crlf = new Set()
  if (fromGit) {
    ;({ tracked, untracked } = listSourceFiles(source))
    modes = indexModes(source)
    crlf = autocrlfPaths(source)
  } else tracked = walk(source)

  const skipped = { heavyUntracked: {}, symlinksOutside: [], submodules: [], missingInWorktree: [], special: [] }
  const keptUntracked = []
  for (const rel of untracked) {
    if (inHeavyDir(rel)) {
      const dir = rel.split('/').find((p) => HEAVY_DIRS.has(p))
      skipped.heavyUntracked[dir] = (skipped.heavyUntracked[dir] ?? 0) + 1
    } else keptUntracked.push(rel)
  }

  const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), WORK_PREFIX))
  const workDir = path.join(workRoot, 'project')
  fs.mkdirSync(workDir)
  const symlinks = {}
  const executables = []
  const normalized = []
  const sourceHashes = {}
  const copiedUntracked = []
  const untrackedSet = new Set(keptUntracked)

  for (const rel of [...new Set([...tracked, ...keptUntracked])]) {
    const mode = modes.get(rel)
    if (mode === '160000') {
      skipped.submodules.push(rel)
      continue
    }
    const from = native(source, rel)
    let st
    try {
      st = fs.lstatSync(from)
    } catch {
      skipped.missingInWorktree.push(rel)
      continue
    }
    const to = native(workDir, rel)
    // On Windows with core.symlinks=false a symlink is checked out as a text file holding its target.
    if (mode === '120000' || st.isSymbolicLink()) {
      const target = st.isSymbolicLink() ? fs.readlinkSync(from) : fs.readFileSync(from, 'utf8').trim()
      const resolved = path.resolve(path.dirname(from), target)
      // A link to a file outside the project would put that file's content in the export.
      if (path.isAbsolute(target) || !isInside(source, resolved)) {
        skipped.symlinksOutside.push(rel)
        continue
      }
      const posixTarget = target.split(path.sep).join('/')
      symlinks[rel] = posixTarget
      sourceHashes[rel] = `link:${posixTarget}`
      fs.mkdirSync(path.dirname(to), { recursive: true })
      try {
        fs.symlinkSync(target, to)
      } catch {
        fs.writeFileSync(to, posixTarget) // no symlink permission (Windows): the zip still stores a link
      }
      continue
    }
    if (!st.isFile()) {
      skipped.special.push(rel)
      continue
    }
    let data = fs.readFileSync(from)
    sourceHashes[rel] = sha256(data)
    if (crlf.has(rel)) {
      data = crlfToLf(data)
      normalized.push(rel)
    }
    fs.mkdirSync(path.dirname(to), { recursive: true })
    fs.writeFileSync(to, data)
    if (mode === '100755' || (process.platform !== 'win32' && (st.mode & 0o111) !== 0)) {
      executables.push(rel)
      try {
        fs.chmodSync(to, 0o755)
      } catch {
        // Windows: the bit is carried by state.executables instead.
      }
    }
    if (untrackedSet.has(rel)) copiedUntracked.push(rel)
  }

  workGit(workRoot, workDir, ['init', '-q'])
  workGit(workRoot, workDir, ['add', '-A', '-f'])
  workGit(workRoot, workDir, ['commit', '-q', '--allow-empty', '-m', 'strip-ai baseline'])
  const state = {
    version: STATE_VERSION,
    source,
    name: path.basename(source),
    workDir,
    fromGit,
    // For a folder inside a repository, the zip goes next to the repository, never inside it.
    repoRoot: fromGit ? path.resolve(workGit(workRoot, workDir, ['-C', source, 'rev-parse', '--show-toplevel']).trim()) : null,
    shallow: fromGit && isShallow(source),
    baseline: workGit(workRoot, workDir, ['rev-parse', 'HEAD']).trim(),
    executables: executables.sort(),
    symlinks,
    untracked: copiedUntracked.sort(),
    normalizedLineEndings: normalized.sort(),
    skipped,
    sourceFingerprint: fingerprintOf(sourceHashes),
    sourceFiles: Object.keys(sourceHashes).sort(),
    steps: { prepare: new Date().toISOString() },
    renamed: {},
    aiNames: [],
  }
  saveState(workRoot, state)
  return { workRoot, state }
}

function fingerprintOf(hashes) {
  return sha256(Object.keys(hashes).sort().map((rel) => `${rel}\0${hashes[rel]}\n`).join(''))
}

/** Hashes the source files that were copied. A different value means the original project changed since prepare. */
export function sourceFingerprint(state) {
  const hashes = {}
  for (const rel of state.sourceFiles) {
    const abs = native(state.source, rel)
    try {
      const st = fs.lstatSync(abs)
      if (st.isSymbolicLink()) hashes[rel] = `link:${fs.readlinkSync(abs).split(path.sep).join('/')}`
      else if (state.symlinks[rel] !== undefined) hashes[rel] = `link:${fs.readFileSync(abs, 'utf8').trim()}`
      else hashes[rel] = sha256(fs.readFileSync(abs))
    } catch {
      hashes[rel] = 'missing'
    }
  }
  return fingerprintOf(hashes)
}

/**
 * Files that go into the zip: what the work repo tracks (the baseline) plus
 * new files that .gitignore does not exclude, minus deleted ones. Untracked
 * files under dependency or build folders (node_modules after an install
 * in a project that does not ignore it) never count.
 */
export function exportFiles(workRoot, state) {
  const nul = (out) => out.split('\0').filter(Boolean)
  const tracked = nul(workGit(workRoot, state.workDir, ['ls-files', '--cached', '-z']))
  const others = nul(workGit(workRoot, state.workDir, ['ls-files', '--others', '--exclude-standard', '-z'])).filter((r) => !inHeavyDir(r))
  return [...new Set([...tracked, ...others])]
    .filter((rel) => {
      try {
        const st = fs.lstatSync(native(state.workDir, rel))
        return st.isFile() || st.isSymbolicLink()
      } catch {
        return false
      }
    })
    .sort()
}

export function isSymlinkEntry(state, rel) {
  if (state.symlinks[rel] !== undefined) return true
  try {
    return fs.lstatSync(native(state.workDir, rel)).isSymbolicLink()
  } catch {
    return false
  }
}

/** Bytes a zip entry gets: file content, or the link target for a symlink. */
export function entryData(state, rel) {
  const abs = native(state.workDir, rel)
  if (state.symlinks[rel] !== undefined) return Buffer.from(state.symlinks[rel])
  const st = fs.lstatSync(abs)
  if (st.isSymbolicLink()) return Buffer.from(fs.readlinkSync(abs).split(path.sep).join('/'))
  return fs.readFileSync(abs)
}

/** One hash for the whole export as it is now. Checks and zips record it, so a later edit shows they are stale. */
export function treeFingerprint(workRoot, state, files = exportFiles(workRoot, state)) {
  const hashes = {}
  for (const rel of files) hashes[rel] = sha256(entryData(state, rel))
  return fingerprintOf(hashes)
}

/** Work roots left by runs that did not clean up, older than `maxAgeMs`. */
export function staleWorkRoots(maxAgeMs) {
  const tmp = os.tmpdir()
  const now = Date.now()
  return fs
    .readdirSync(tmp)
    .filter((n) => n.startsWith(WORK_PREFIX))
    .map((n) => path.join(tmp, n))
    .filter((p) => {
      try {
        return fs.existsSync(path.join(p, 'state.json')) && now - fs.statSync(p).mtimeMs > maxAgeMs
      } catch {
        return false
      }
    })
}

export function isWorkRoot(dir) {
  const resolved = path.resolve(dir ?? '')
  return (
    path.dirname(resolved) === path.resolve(os.tmpdir()) &&
    path.basename(resolved).startsWith(WORK_PREFIX) &&
    fs.existsSync(path.join(resolved, 'state.json'))
  )
}
