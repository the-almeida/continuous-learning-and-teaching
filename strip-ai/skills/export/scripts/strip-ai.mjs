#!/usr/bin/env node
// Deterministic half of /strip-ai:export. Claude does the judgment work;
// this script does everything that can be checked, and refuses to move on
// while anything is unchecked. `status` always says what is next.
//
//   prepare <project> [--own|--third-party]   copy the project into a new work dir
//   env-in <WR>                               copy the source's ignored .env files in, for test runs only
//   check <WR> setup|baseline|final "<command>" [--approved "<who allowed it>"]
//                                             run a project command and record its result
//   check <WR> baseline --none "<reason>"     record that the project has no checks
//   languages <WR> [--keep "<A,B>"|--keep all] list the project's languages; keep only those the user accepts
//   strip <WR>                                delete AI tooling files and folders
//   inventory <WR>                            list candidate identifiers (domains, profiles, authors, emails)
//   identity <WR> list [--all]|add <kind> <value> [--as <placeholder>]|remove <value>|confirm
//   scan <WR> [--all]                         list findings that still need a fix or a decision
//   redact <WR>                               replace PII, secrets, personal documents and image metadata
//   placeholder <WR> <file>                   replace one document's content with a same-type placeholder
//   rename <WR> <from> <to>                   rename a file by hand, keeping track of where it came from
//   allow <WR> <finding-id> --reason "<why>"  decide to keep one finding
//   allow <WR> --rule <rule> [--file <glob>] --reason "<why>"
//   status <WR>                               what is done, what is next
//   zip <WR> [--name <name>] [--out <file>]   build, verify independently, write the report
//   finalize <WR>                             check the report and the zip one last time
//   cleanup <WR> | cleanup --stale            delete the work dir
//
// The original project is never written to.
import fs from 'node:fs'
import path from 'node:path'
import { checkFindings, checkTable, loadChecks, recordNoChecks, runCheck } from './lib/checks.mjs'
import { addDecision, decisionFor, loadDecisions, unresolved, validateReason } from './lib/decisions.mjs'
import { changedSinceBaseline, diffFindings } from './lib/diff.mjs'
import { PLACEHOLDER_FORMATS, placeholderFor } from './lib/documents.mjs'
import { native, readJson, readText, sha256, writeJson } from './lib/files.mjs'
import { listIgnoredFiles, listSourceFiles, workGit } from './lib/git.mjs'
import { scanContext } from './lib/context.mjs'
import { collectIdentities, identityTokens, keepSeenPeople, personalDomains, wordsOf } from './lib/identity.mjs'
import { buildInventory } from './lib/inventory.mjs'
import { languageBreakdown } from './lib/languages.mjs'
import { findLeaks, findTokens } from './lib/leaks.mjs'
import { redactTree } from './lib/redact.mjs'
import { buildReport, TODO } from './lib/report.mjs'
import { aiPathTerm, aiPathToRemove, isEnvFile, mask } from './lib/rules.mjs'
import { findingId, scanText, scanTree } from './lib/scan.mjs'
import { verifyZip } from './lib/verify.mjs'
import {
  entryData, exportFiles, HEAVY_DIRS, isSymlinkEntry, isWorkRoot, loadState, prepareWork, saveState,
  sourceFingerprint, staleWorkRoots, treeFingerprint, workPath,
} from './lib/workspace.mjs'
import { buildZip } from './lib/zip.mjs'

function fail(message) {
  console.error(`strip-ai: ${message}`)
  process.exit(1)
}

function print(obj) {
  console.log(JSON.stringify(obj, null, 2))
}

const now = () => new Date().toISOString()
const loadIdentity = (wr) => readJson(workPath(wr, 'identity.json'))
const saveIdentity = (wr, identity) => writeJson(workPath(wr, 'identity.json'), identity)
// Raw values redaction replaced: temp work root only, never printed or reported.
const loadOriginals = (wr) => readJson(workPath(wr, 'originals.json'), [])

function context(workRoot, state) {
  const identity = loadIdentity(workRoot)
  // The rules redact actually used (placeholders chosen against the project's own values), when still current.
  const saved = readJson(workPath(workRoot, 'rules.json'), null)
  return scanContext(identity, {
    rules: saved?.identityVersion === identity.version ? saved.rules : undefined,
    originals: loadOriginals(workRoot),
    aiNames: state.aiNames ?? [],
  })
}

/** Everything known about the export right now. */
function evaluate(workRoot) {
  const state = loadState(workRoot)
  const ctx = context(workRoot, state)
  const files = exportFiles(workRoot, state)
  const fingerprint = treeFingerprint(workRoot, state, files)
  const checks = loadChecks(workRoot)
  const decisions = loadDecisions(workRoot)
  const findings = [
    ...scanTree(state.workDir, files, ctx, (rel) => isSymlinkEntry(state, rel)),
    ...diffFindings(workRoot, state, files, findingId, ctx.cleanPath),
    ...(state.steps.strip ? checkFindings(checks, fingerprint, findingId) : []),
  ]
  writeJson(workPath(workRoot, 'findings.json'), findings)
  return { state, ctx, files, fingerprint, checks, decisions, findings, open: unresolved(findings, decisions) }
}

function summarize(findings) {
  const out = {}
  for (const f of findings) {
    out[f.severity] ??= {}
    out[f.severity][f.rule] = (out[f.severity][f.rule] ?? 0) + 1
  }
  return out
}

function printFindings(list, decisions, limit = 300) {
  const order = ['block', 'review', 'clean', 'fixture']
  const sorted = [...list].sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity) || a.file.localeCompare(b.file))
  for (const f of sorted.slice(0, limit)) {
    const decided = decisionFor(f, decisions) ? '  [allowed]' : ''
    console.log(`${f.id}  ${f.severity.padEnd(6)} ${f.rule.padEnd(22)} ${f.file}${f.line ? `:${f.line}` : ''}  ${f.value}${f.count > 1 ? `  (${f.count}x)` : ''}${decided}`)
  }
  if (sorted.length > limit) console.log(`… ${sorted.length - limit} more in findings.json`)
}

// ---------------------------------------------------------------- commands

function prepare(projectArg, flags) {
  if (flags.own && flags['third-party']) fail('pass --own or --third-party, not both')
  const mode = flags.own ? 'own' : flags['third-party'] ? 'third-party' : 'auto'
  const { workRoot, state } = prepareWork(projectArg ?? process.cwd())
  let identity = collectIdentities(state.source, { mode: !state.fromGit && mode === 'auto' ? 'third-party' : mode })
  if (!state.fromGit && mode === 'auto') identity.modeReason = 'not a git repo, so ownership is unknown: pass --own if it is yours'
  if (identity.mode === 'third-party') {
    // Thousands of contributors: keep only those whose names occur in the files at all.
    const words = new Set()
    for (const rel of exportFiles(workRoot, state)) {
      const text = readText(native(state.workDir, rel))
      if (text !== null) for (const w of wordsOf(text)) words.add(w)
    }
    identity = keepSeenPeople(identity, words)
  }
  saveIdentity(workRoot, identity)
  state.mode = identity.mode
  saveState(workRoot, state)
  print({
    workRoot,
    mode: identity.mode,
    modeReason: identity.modeReason,
    files: state.sourceFiles.length,
    untracked: state.untracked.length,
    lineEndingsNormalized: state.normalizedLineEndings.length,
    skipped: {
      symlinksOutsideProject: state.skipped.symlinksOutside.length,
      submodules: state.skipped.submodules.length,
      untrackedInDependencyFolders: state.skipped.heavyUntracked,
      missingInWorktree: state.skipped.missingInWorktree.length,
    },
    identities: {
      names: identity.names.length,
      emails: identity.emails.length,
      handles: identity.handles.length,
      domains: identity.domains.length,
      dropped: identity.dropped.length,
      ...(identity.unseen ? { contributorsNotInFiles: identity.unseen } : {}),
    },
    warnings: [
      ...(state.shallow ? ['shallow clone: authors of older commits are unknown. Add them with "identity add".'] : []),
      ...(state.fromGit ? [] : ['not a git repo: no identities were collected. Add them with "identity add".']),
    ],
    next:
      identity.mode === 'third-party'
        ? 'third-party code: ask the user before running anything. If they approve, run installs and checks with "check ... --approved <reason>"; if not, "check <WR> baseline --none <reason>"'
        : `env-in ${workRoot}, install dependencies in ${state.workDir}, then "check ${workRoot} baseline <command>" for each check`,
  })
}

function envIn(workRoot, flags) {
  const state = loadState(workRoot)
  // Secrets the user put in a third-party project's .env would reach that project's untrusted code.
  if (state.mode === 'third-party' && flags.approved === undefined) {
    fail('third-party project: its code would read these .env files. Ask the user, then pass --approved "<who approved and when>"')
  }
  if (!state.fromGit) return print({ copied: [], note: 'source is not a git repo; nothing is ignored' })
  const copied = []
  for (const rel of listIgnoredFiles(state.source)) {
    if (!isEnvFile(path.posix.basename(rel)) || rel.split('/').some((p) => HEAVY_DIRS.has(p))) continue
    const to = native(state.workDir, rel)
    if (fs.existsSync(to)) continue
    fs.mkdirSync(path.dirname(to), { recursive: true })
    fs.copyFileSync(native(state.source, rel), to)
    copied.push(rel)
  }
  print({ copied, note: 'These stay ignored in the work dir, so they are never exported.' })
}

function languagesCmd(workRoot, flags) {
  const state = loadState(workRoot)
  const files = exportFiles(workRoot, state)
  const breakdown = languageBreakdown(state.workDir, files)
  const summary = breakdown.map(({ paths, ...l }) => l)
  if (flags.keep === undefined) {
    return print({
      languages: summary,
      decided: state.languages?.kept ?? null,
      next: `show this to the user, ask which languages their model accepts, then: languages ${workRoot} --keep "<Language A,Language B>" (or --keep all)`,
    })
  }
  if (state.steps.strip) fail('languages are decided before "strip": run "prepare" again to change them')
  const known = new Map(breakdown.map((l) => [l.language.toLowerCase(), l]))
  const wanted = flags.keep.trim().toLowerCase() === 'all' ? [...known.keys()] : flags.keep.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)
  const unknown = wanted.filter((w) => !known.has(w))
  if (unknown.length) fail(`not among the detected languages: ${unknown.join(', ')}. Use the exact names "languages" printed.`)
  if (!wanted.length) fail('keep at least one language, or stop the export')
  const kept = breakdown.filter((l) => wanted.includes(l.language.toLowerCase()))
  const excluded = breakdown.filter((l) => !wanted.includes(l.language.toLowerCase()))
  for (const l of excluded) for (const rel of l.paths) fs.rmSync(native(state.workDir, rel), { force: true })
  const removed = new Set(excluded.flatMap((l) => l.paths))
  state.untracked = state.untracked.filter((r) => !removed.has(r))
  for (const r of removed) delete state.symlinks[r]
  if (removed.size) {
    // The user's choice is the new starting point: later diffs show only what cleaning changed.
    workGit(workRoot, state.workDir, ['add', '-A'])
    workGit(workRoot, state.workDir, ['commit', '-q', '-m', 'strip-ai: languages the user excluded'])
    state.baseline = workGit(workRoot, state.workDir, ['rev-parse', 'HEAD']).trim()
  }
  state.languages = {
    kept: kept.map((l) => ({ language: l.language, type: l.type, files: l.files, lines: l.lines })),
    excluded: excluded.map((l) => ({ language: l.language, type: l.type, files: l.files, lines: l.lines })),
  }
  state.steps.languages = now()
  saveState(workRoot, state)
  const noCode = !kept.some((l) => ['programming', 'markup'].includes(l.type))
  print({
    kept: kept.map((l) => `${l.language} (${l.files} file(s))`),
    removed: excluded.map((l) => `${l.language} (${l.files} file(s))`),
    warning: noCode ? 'no programming or markup language is left: confirm with the user that the export is still wanted' : undefined,
    next: 'baseline checks',
  })
}

function check(workRoot, phase, args, flags) {
  const state = loadState(workRoot)
  if (!state.steps.languages) fail('decide the languages first: "languages <WR>", ask the user, then "languages <WR> --keep ..."')
  if (phase === 'baseline' && state.steps.strip) fail('baseline checks must run before "strip", on the untouched copy. Run "prepare" again.')
  if (flags.none !== undefined) {
    if (phase !== 'baseline') fail('--none only applies to baseline')
    recordNoChecks(workRoot, validateReason(flags.none))
    return print({ recorded: 'no checks', reason: flags.none })
  }
  const command = args.join(' ')
  if (!command.trim()) fail('pass the command to run, in quotes')
  // Untrusted code only runs with the user's explicit go-ahead, and never sees their credentials.
  const thirdParty = state.mode === 'third-party'
  if (thirdParty && flags.approved === undefined) {
    fail('this is a third-party project: running its code needs the user\'s approval. Ask them, then pass --approved "<who approved and when>"')
  }
  const approval = flags.approved !== undefined ? validateReason(flags.approved) : undefined
  const { run, tail } = runCheck(workRoot, state.workDir, phase, command, {
    timeoutSec: Number(flags.timeout ?? 1800),
    fingerprint: treeFingerprint(workRoot, state),
    scrub: thirdParty,
    approval,
  })
  console.log(tail)
  print({ phase, command: run.command, exitCode: run.exitCode, timedOut: run.timedOut, scrubbedEnv: run.scrubbedEnv, seconds: Math.round(run.durationMs / 1000), log: run.log })
}

function strip(workRoot) {
  const state = loadState(workRoot)
  const checks = loadChecks(workRoot)
  if (!checks.runs.some((r) => r.phase === 'baseline') && !checks.none) {
    fail('record baseline checks first ("check <WR> baseline <command>", or "--none <reason>"), so there is something to compare against')
  }
  const files = exportFiles(workRoot, state)
  const targets = new Set()
  const aiNames = new Set(state.aiNames ?? [])
  for (const rel of files) {
    const target = aiPathToRemove(rel)
    if (!target) continue
    targets.add(target)
    const m =
      /(?:^|\/)(?:commands|agents|prompts|chatmodes)\/(?:.*\/)?([^/]+?)(?:\.(?:prompt|chatmode|agent))?\.md$/i.exec(rel) ??
      /(?:^|\/)skills\/([^/]+)\/SKILL\.md$/i.exec(rel)
    if (m) aiNames.add(m[1])
  }
  for (const target of targets) fs.rmSync(native(state.workDir, target), { recursive: true, force: true })
  state.removedAi = [...new Set([...(state.removedAi ?? []), ...targets])].sort()
  state.aiNames = [...aiNames].sort()
  state.steps.strip = now()
  saveState(workRoot, state)
  print({ removed: [...targets].sort(), aiCommandNames: state.aiNames, next: `inventory ${workRoot} and identity ${workRoot} list` })
}

function inventory(workRoot) {
  const state = loadState(workRoot)
  const identity = loadIdentity(workRoot)
  const inv = buildInventory(state.workDir, exportFiles(workRoot, state))
  print({
    note: 'Raw values, for this session only. Add every one that identifies a real person (the owner or anyone else): identity add <kind> <value>.',
    remoteOwners: identity.remoteOwners?.length
      ? { values: identity.remoteOwners, note: 'Owner of the remote. Not redacted: add it as a handle only if it is a person, not an organization.' }
      : undefined,
    emails: inv.emails,
    domains: inv.domains,
    profiles: inv.profiles,
    authorLines: inv.authorLines,
  })
  state.steps.inventory = now()
  saveState(workRoot, state)
}

function identityCmd(workRoot, sub, args, flags) {
  const state = loadState(workRoot)
  const identity = loadIdentity(workRoot)
  const kinds = { name: 'names', handle: 'handles', email: 'emails', domain: 'domains' }
  if (sub === 'list' || !sub) {
    const cap = (list) => (flags.all || list.length <= 50 ? list : [...list.slice(0, 50), `… ${list.length - 50} more (--all)`])
    return print({
      version: identity.version,
      mode: identity.mode,
      modeReason: identity.modeReason,
      confirmed: state.steps.identity?.version === identity.version,
      operator: identity.operator,
      names: cap(identity.names),
      emails: cap(identity.emails),
      handles: cap(identity.handles),
      domains: identity.domains,
      literals: identity.literals,
      dropped: cap(identity.dropped),
      tokens: identityTokens(identity),
      note:
        identity.mode === 'third-party'
          ? 'Third-party project: contributors are matched by full name and email; only the operator is searched piece by piece. Remove entries that are organizations, not people. Every domain listed is replaced everywhere.'
          : 'Raw values, for this session only. Remove common words and company domains that are not people; add what is missing.',
    })
  }
  if (sub === 'add') {
    const [kind, ...rest] = args
    const value = rest.join(' ').trim()
    if (!kind || !value) fail('usage: identity <WR> add name|handle|email|domain|text <value> [--as <placeholder>]')
    if (value.length < 3) fail('value too short to redact safely')
    if (kind === 'text') identity.literals.push({ value, placeholder: flags.as ?? 'REDACTED' })
    else if (kinds[kind]) {
      const list = identity[kinds[kind]]
      if (!list.some((v) => v.toLowerCase() === value.toLowerCase())) list.push(kind === 'email' ? value.toLowerCase() : value)
      if (kind === 'email') identity.domains = [...new Set([...identity.domains, ...personalDomains([value.toLowerCase()])])]
    } else fail(`unknown kind "${kind}": use name, handle, email, domain or text`)
  } else if (sub === 'remove') {
    const value = args.join(' ').trim().toLowerCase()
    let removed = 0
    for (const key of Object.values(kinds)) {
      const before = identity[key].length
      identity[key] = identity[key].filter((v) => v.toLowerCase() !== value)
      removed += before - identity[key].length
    }
    const before = identity.literals.length
    identity.literals = identity.literals.filter((l) => l.value.toLowerCase() !== value)
    removed += before - identity.literals.length
    if (!removed) fail(`"${value}" is not in the identity list`)
  } else if (sub === 'confirm') {
    state.steps.identity = { version: identity.version, at: now() }
    saveState(workRoot, state)
    return print({ confirmed: identity.version, next: `scan ${workRoot}, clean AI references, then redact ${workRoot}` })
  } else fail(`unknown identity command "${sub}"`)
  identity.version++
  saveIdentity(workRoot, identity)
  print({ version: identity.version, note: 'identity changed: confirm it again, then (re)run redact' })
}

function scan(workRoot, flags) {
  const { findings, open, decisions } = evaluate(workRoot)
  const shown = flags.all ? findings : open
  print({ open: open.length, total: findings.length, counts: summarize(open) })
  printFindings(shown, decisions)
}

function redact(workRoot) {
  const state = loadState(workRoot)
  const identity = loadIdentity(workRoot)
  if (!state.steps.strip) fail('run "strip" first')
  if (!state.steps.inventory) fail('review the inventory first: "inventory <WR>", then add any identifier it shows with "identity add"')
  if (state.steps.identity?.version !== identity.version) fail('confirm the identity list first: "identity <WR> list", then "identity <WR> confirm"')
  const { rawOriginals, renamedRaw, rules, ...result } = redactTree(state.workDir, exportFiles(workRoot, state), identity, {
    isSymlink: (rel) => isSymlinkEntry(state, rel),
    keepNotices: identity.mode === 'third-party',
  })
  writeJson(workPath(workRoot, 'originals.json'), [...new Set([...loadOriginals(workRoot), ...rawOriginals])])
  writeJson(workPath(workRoot, 'rules.json'), { identityVersion: identity.version, rules })
  const previous = readJson(workPath(workRoot, 'redactions.json'), null)
  writeJson(workPath(workRoot, 'redactions.json'), previous ? mergeRedactions(previous, result) : result)
  state.renamed ??= {}
  for (const r of renamedRaw) {
    state.renamed[r.to] = state.renamed[r.from] ?? r.from
    delete state.renamed[r.from]
  }
  state.steps.redact = { identityVersion: identity.version, at: now() }
  saveState(workRoot, state)
  const { open } = evaluate(workRoot)
  print({
    filesChanged: result.changedFiles.length,
    renamed: result.renamed,
    renameConflicts: result.renameConflicts.map((c) => `${c.masked} -> ${c.target} exists already: rename it by hand`),
    replacedDocuments: result.replacedDocuments,
    documentsNeedingAction: result.documentsNeedingAction.map((d) => ({ ...d, action: `no placeholder builder for this type (supported: ${PLACEHOLDER_FORMATS.join(', ')}): write a neutral file of the same type` })),
    strippedImageMetadata: result.strippedMetadata,
    licenseNoticesKept: result.keptNotices.length ? result.keptNotices : undefined,
    redactions: result.redactions.map((r) => `${r.category}: ${r.original} -> ${r.placeholder} (${r.count}x in ${r.files.length} file(s))`),
    suspiciousIdentities: result.suspiciousIdentities.length
      ? result.suspiciousIdentities.map((s) => `${s.literal} replaced ${s.count} times: check it is a person, not a common word`)
      : undefined,
    openFindings: summarize(open),
    next: `scan ${workRoot}`,
  })
}

function mergeRedactions(a, b) {
  return {
    ...b,
    changedFiles: [...new Set([...a.changedFiles, ...b.changedFiles])].sort(),
    renamed: [...a.renamed, ...b.renamed],
    replacedDocuments: [...a.replacedDocuments, ...b.replacedDocuments],
    strippedMetadata: [...a.strippedMetadata, ...b.strippedMetadata],
    keptNotices: [...new Set([...(a.keptNotices ?? []), ...(b.keptNotices ?? [])])],
    redactions: [...a.redactions, ...b.redactions],
  }
}

function placeholder(workRoot, rel) {
  const state = loadState(workRoot)
  const abs = native(state.workDir, rel ?? '')
  if (!rel || !fs.existsSync(abs)) fail(`no such file in the work dir: ${rel}`)
  const data = placeholderFor(rel)
  if (!data) fail(`no placeholder builder for ${path.extname(rel)} (supported: ${PLACEHOLDER_FORMATS.join(', ')})`)
  fs.writeFileSync(abs, data)
  const redactions = readJson(workPath(workRoot, 'redactions.json'), null)
  if (redactions) {
    redactions.replacedDocuments.push({ file: rel, reasons: ['replaced by hand after review'] })
    writeJson(workPath(workRoot, 'redactions.json'), redactions)
  }
  print({ replaced: rel, bytes: data.length })
}

function rename(workRoot, from, to) {
  const state = loadState(workRoot)
  if (!from || !to) fail('usage: rename <WR> <from> <to>')
  const src = native(state.workDir, from)
  const dest = native(state.workDir, to)
  if (!fs.existsSync(src)) fail(`no such file in the work dir: ${from}`)
  if (fs.existsSync(dest)) fail(`${to} exists already`)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.renameSync(src, dest)
  state.renamed ??= {}
  state.renamed[to] = state.renamed[from] ?? from
  delete state.renamed[from]
  saveState(workRoot, state)
  const redactions = readJson(workPath(workRoot, 'redactions.json'), null)
  if (redactions) {
    redactions.renamed.push({ from: mask(from), to })
    writeJson(workPath(workRoot, 'redactions.json'), redactions)
  }
  print({ renamed: to, note: 'update every reference to the old name' })
}

function allow(workRoot, args, flags) {
  const { findings, ctx } = evaluate(workRoot)
  const reason = flags.reason
  if (reason && (ctx.matcher.test(reason) || ctx.tokens.some((t) => reason.toLowerCase().includes(t)))) {
    fail('the reason contains a piece of an identity. Describe the value without quoting it.')
  }
  try {
    const matched = addDecision(workRoot, { id: args[0], rule: flags.rule, glob: flags.file }, reason, findings)
    print({ allowed: matched.length, rule: matched[0].rule, reason })
  } catch (e) {
    fail(e.message)
  }
}

function status(workRoot) {
  const e = evaluate(workRoot)
  const { state, checks, open, ctx } = e
  const identity = ctx.identity
  const table = checkTable(checks)
  const zipValid = state.zip && fs.existsSync(state.zip.path) && state.zip.treeFingerprint === e.fingerprint
  const steps = [
    ['prepare', true, state.steps.prepare],
    ['languages decided', Boolean(state.steps.languages), state.languages ? `kept: ${state.languages.kept.map((l) => l.language).join(', ')}` : `languages ${workRoot}`],
    ['baseline checks', table.length > 0 || Boolean(checks.none), checks.none ? `none: ${checks.none.reason}` : `${table.length} command(s)`],
    ['strip', Boolean(state.steps.strip), state.steps.strip ? `${(state.removedAi ?? []).length} path(s) removed` : `strip ${workRoot}`],
    ['inventory reviewed', Boolean(state.steps.inventory), state.steps.inventory ? 'listed' : `inventory ${workRoot}`],
    ['identity confirmed', state.steps.identity?.version === identity.version, `version ${identity.version}`],
    ['redact', state.steps.redact?.identityVersion === identity.version, state.steps.redact ? `with identity version ${state.steps.redact.identityVersion}` : `redact ${workRoot}`],
    ['final checks', table.length ? table.every((c) => c.final && c.final.fingerprint === e.fingerprint) : Boolean(checks.none), table.map((c) => `${c.command}: ${c.final ? (c.final.fingerprint === e.fingerprint ? `exit ${c.final.exitCode}` : 'stale') : 'missing'}`).join('; ') || 'not needed'],
    ['findings resolved', open.length === 0, `${open.length} open: ${JSON.stringify(summarize(open))}`],
    ['zip verified', Boolean(zipValid), state.zip ? (zipValid ? `${state.zip.path} (${state.zip.tool})` : 'stale: files changed after zip, zip again') : 'not built'],
    ['finalize', Boolean(zipValid && state.steps.finalize && state.report?.zipSha256 === state.zip.sha256), state.steps.finalize ?? 'not run'],
  ]
  console.log(`mode: ${state.mode ?? 'own'}${identity.modeReason ? ` (${identity.modeReason})` : ''}`)
  for (const [name, done, detail] of steps) console.log(`${done ? '✓' : '✗'} ${name.padEnd(20)} ${detail ?? ''}`)
  const next = steps.find(([, done]) => !done)
  console.log(next ? `\nNext: ${next[0]}` : '\nREADY: nothing left to do.')
}

function chooseOut(state, rootName, outFlag) {
  if (outFlag) return path.resolve(outFlag)
  const dir = path.dirname(state.repoRoot ?? state.source)
  let out = path.join(dir, `${rootName}-clean.zip`)
  for (let i = 2; fs.existsSync(out); i++) out = path.join(dir, `${rootName}-clean-${i}.zip`)
  return out
}

function nameProblems(name, ctx) {
  const problems = []
  if (ctx.matcher.test(name) || ctx.tokens.some((t) => name.toLowerCase().includes(t))) problems.push('contains a piece of an identity')
  if (aiPathTerm(name)) problems.push(`contains the AI term "${aiPathTerm(name)}"`)
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) problems.push('use letters, digits, dots, dashes and underscores only')
  return problems
}

function zip(workRoot, flags) {
  const e = evaluate(workRoot)
  const { state, ctx, files, open, decisions } = e
  const identity = ctx.identity
  if (state.steps.redact?.identityVersion !== identity.version) fail('run "redact" with the confirmed identity first')
  if (open.length) {
    printFindings(open, decisions, 50)
    fail(`${open.length} finding(s) still need a fix or a decision ("allow"). See above or run "scan".`)
  }
  const rootName = flags.name ?? ctx.cleanPath(state.name)
  const problems = nameProblems(rootName, ctx)
  if (problems.length) fail(`zip root name "${rootName}" ${problems.join('; ')}: pass --name <clean-name>`)
  const out = chooseOut(state, rootName, flags.out)
  const outProblems = nameProblems(path.basename(out, '.zip'), ctx)
  if (outProblems.length) fail(`zip file name ${outProblems.join('; ')}: pass --out`)

  const executables = new Set(state.executables)
  const entries = files.map((rel) => {
    const symlink = isSymlinkEntry(state, rel)
    const abs = native(state.workDir, rel)
    const exec = !symlink && (executables.has(rel) || (process.platform !== 'win32' && (fs.statSync(abs).mode & 0o111) !== 0))
    return { name: `${rootName}/${rel}`, data: entryData(state, rel), mode: exec ? 0o755 : 0o644, symlink }
  })
  // A zip this work dir built before is replaced, so an outdated one is never left next to the project.
  const previous = state.zip
  if (previous && fs.existsSync(previous.path) && sha256(fs.readFileSync(previous.path)) === previous.sha256) {
    fs.rmSync(previous.path, { force: true })
    fs.rmSync(previous.report, { force: true })
  }
  delete state.zip
  saveState(workRoot, state)
  const zipBuf = buildZip(entries)
  fs.writeFileSync(out, zipBuf)
  const verifyDir = workPath(workRoot, 'verify')
  const verification = verifyZip(out, verifyDir, entries.map((x) => ({ name: x.name, sha256: sha256(x.data), symlink: x.symlink })))
  // Scan the independently extracted files exactly as the work dir was scanned.
  if (!verification.problems.length) {
    const extracted = path.join(verifyDir, rootName)
    const again = scanTree(extracted, files, ctx, (rel) => isSymlinkEntry(state, rel))
    for (const f of unresolved(again, decisions)) verification.problems.push(`after extraction: ${f.rule} at ${f.file} (${f.value})`)
  }
  fs.rmSync(verifyDir, { recursive: true, force: true })
  if (verification.problems.length) {
    fs.rmSync(out, { force: true })
    fail(`verification failed, zip deleted:\n  - ${verification.problems.slice(0, 50).join('\n  - ')}`)
  }

  const zipSha = sha256(zipBuf)
  const report = out.replace(/\.zip$/i, '.report.md')
  const redactions = readJson(workPath(workRoot, 'redactions.json'), { redactions: [], renamed: [], replacedDocuments: [], strippedMetadata: [] })
  const changes = changedSinceBaseline(workRoot, state)
  const checks = loadChecks(workRoot)
  const findings = readJson(workPath(workRoot, 'findings.json'), [])
  const decided = [
    ...Object.values(decisions.byId).map((d) => ({ rule: d.rule, file: d.file, value: d.value, reason: d.reason })),
    ...decisions.byRule.map((d) => ({ rule: d.rule, file: d.glob, value: `${d.matched} finding(s)`, reason: d.reason })),
  ]
  fs.writeFileSync(
    report,
    buildReport({
      rootName,
      zipName: path.basename(out),
      sha256: zipSha,
      files: entries.length,
      bytes: zipBuf.length,
      verifier: verification.tool,
      independent: verification.independent,
      date: now().slice(0, 10),
      mode: state.mode,
      keptNotices: redactions.keptNotices ?? [],
      languages: state.languages,
      shallow: state.shallow,
      noChecks: checks.none?.reason,
      checks: checkTable(checks),
      removedAi: (state.removedAi ?? []).map(ctx.cleanPath),
      aiNames: state.aiNames ?? [],
      redactions: redactions.redactions,
      renamed: redactions.renamed.map((r) => r.to),
      replacedDocuments: redactions.replacedDocuments,
      strippedMetadata: redactions.strippedMetadata,
      normalized: state.normalizedLineEndings,
      decisions: decided,
      changes: {
        modified: changes.filter((c) => c.status === 'M').length,
        deleted: changes.filter((c) => c.status === 'D').length,
        added: findings.filter((f) => f.rule === 'added-file').map((f) => f.file),
      },
      skipped: {
        symlinksOutside: state.skipped.symlinksOutside.length,
        submodules: state.skipped.submodules.map(ctx.cleanPath),
        heavyUntracked: state.skipped.heavyUntracked,
        missingInWorktree: state.skipped.missingInWorktree.length,
      },
    }),
  )
  state.zip = { path: out, sha256: zipSha, files: entries.length, bytes: zipBuf.length, tool: verification.tool, independent: verification.independent, treeFingerprint: e.fingerprint, report, rootName }
  delete state.steps.finalize
  saveState(workRoot, state)
  print({
    zip: out,
    sha256: zipSha,
    files: entries.length,
    verifiedBy: verification.tool,
    independent: verification.independent,
    report,
    next: `fill every "${TODO}" section in the report, then: finalize ${workRoot}`,
  })
}

function finalize(workRoot) {
  const e = evaluate(workRoot)
  const { state, ctx } = e
  const z = state.zip
  if (!z) fail('run "zip" first')
  const problems = []
  if (!fs.existsSync(z.path)) problems.push(`zip missing: ${z.path}`)
  else if (sha256(fs.readFileSync(z.path)) !== z.sha256) problems.push('the zip changed after it was verified: run "zip" again')
  if (z.treeFingerprint !== e.fingerprint) problems.push('files changed after the zip was built: run "zip" again')
  if (!fs.existsSync(z.report)) problems.push(`report missing: ${z.report}`)
  let text = fs.existsSync(z.report) ? fs.readFileSync(z.report, 'utf8') : ''
  if (text.includes(TODO)) problems.push(`the report still has "${TODO}" sections to fill`)
  if (!text.includes(z.sha256)) problems.push('the report does not carry the zip SHA-256: run "zip" again')
  // The report sits next to the zip and could be shared with it: it must not leak either.
  const leaks = [
    ...scanText('report', text, ctx).filter((f) => !f.rule.startsWith('ai-') && f.severity !== 'fixture'),
    ...findLeaks('report', Buffer.from(text), ctx.allValues).map((l) => ({ rule: 'known-value', value: l.masked })),
    ...findTokens('report', Buffer.from(text), ctx.tokens).map((t) => ({ rule: 'identity-token', value: mask(t.token) })),
  ]
  for (const l of leaks) problems.push(`the report leaks: ${l.rule} (${l.value})`)
  if (problems.length) fail(`not ready:\n  - ${problems.join('\n  - ')}`)

  const sourceUnchanged =
    sourceFingerprint(state) === state.sourceFingerprint &&
    (!state.fromGit || sameFileSet(state))
  if (!sourceUnchanged) {
    text = text.replace(/\n## Checks/, '\n> ⚠️ The original project changed while the export ran. The zip reflects it as it was at the start.\n\n## Checks')
    fs.writeFileSync(z.report, text)
  }
  state.steps.finalize = now()
  state.report = { zipSha256: z.sha256, sha256: sha256(text) }
  saveState(workRoot, state)
  print({ ready: true, zip: z.path, sha256: z.sha256, report: z.report, sourceUnchanged, next: `cleanup ${workRoot}` })
}

function sameFileSet(state) {
  const { tracked, untracked } = listSourceFiles(state.source)
  const now = new Set([...tracked, ...untracked.filter((r) => !r.split('/').slice(0, -1).some((p) => HEAVY_DIRS.has(p)))])
  const before = new Set([...state.sourceFiles, ...state.skipped.symlinksOutside, ...state.skipped.submodules, ...state.skipped.special])
  return [...now].every((r) => before.has(r) || state.skipped.missingInWorktree.includes(r))
}

function cleanup(workRoot, flags) {
  if (flags.stale) {
    const stale = staleWorkRoots(24 * 3600 * 1000)
    for (const dir of stale) fs.rmSync(dir, { recursive: true, force: true })
    return print({ deleted: stale })
  }
  if (!isWorkRoot(workRoot)) fail(`refusing to delete ${workRoot}: not a strip-ai work dir`)
  fs.rmSync(path.resolve(workRoot), { recursive: true, force: true })
  print({ deleted: path.resolve(workRoot) })
}

// ---------------------------------------------------------------- dispatch

function parseArgs(argv) {
  const flags = {}
  const positional = []
  const valued = new Set(['--name', '--out', '--reason', '--rule', '--file', '--as', '--timeout', '--none', '--approved', '--keep'])
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (valued.has(a)) flags[a.slice(2)] = argv[++i] ?? ''
    else if (a === '--all') flags.all = true
    else if (a === '--own') flags.own = true
    else if (a === '--third-party') flags['third-party'] = true
    else if (a === '--stale') flags.stale = true
    else positional.push(a)
  }
  return { flags, positional }
}

const [command, ...rest] = process.argv.slice(2)
const { flags, positional } = parseArgs(rest)
const [wr, ...more] = positional
const commands = {
  prepare: () => prepare(wr, flags),
  'env-in': () => envIn(wr, flags),
  check: () => check(wr, more[0], more.slice(1), flags),
  languages: () => languagesCmd(wr, flags),
  strip: () => strip(wr),
  inventory: () => inventory(wr),
  identity: () => identityCmd(wr, more[0], more.slice(1), flags),
  scan: () => scan(wr, flags),
  redact: () => redact(wr),
  placeholder: () => placeholder(wr, more[0]),
  rename: () => rename(wr, more[0], more[1]),
  allow: () => allow(wr, more, flags),
  status: () => status(wr),
  zip: () => zip(wr, flags),
  finalize: () => finalize(wr),
  cleanup: () => cleanup(wr, flags),
}
if (!commands[command]) fail(`unknown command "${command ?? ''}". Use: ${Object.keys(commands).join(', ')}`)
try {
  commands[command]()
} catch (err) {
  fail(err.message)
}
