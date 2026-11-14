// What changed since the baseline commit, checked for ways a test can be
// silenced instead of fixed: a deleted test file, a new skip, fewer
// assertions. Also lists files the export gained (by a tool or by hand) and
// files that were never committed in the original project.
import fs from 'node:fs'
import { native } from './files.mjs'
import { workGit } from './git.mjs'

export const TEST_FILE =
  /(^|\/)(__tests__|tests?|specs?|e2e)\/|\.(test|spec)\.[cm]?[jt]sx?$|(^|\/)test_[^/]+\.py$|_test\.(py|go)$|Tests?\.(java|kt|cs)$|_spec\.rb$/i

const SKIP_MARKERS =
  /\b(?:it|test|describe|context|suite)\.(?:skip|todo|only)\b|\bx(?:it|test|describe)\s*\(|@pytest\.mark\.(?:skip|skipif|xfail)|@unittest\.skip|\bpytest\.skip\(|\bt\.Skip(?:Now|f)?\(|#\[ignore\]|@(?:Disabled|Ignore)\b|\bpending\(\)/g
const ASSERTIONS = /\bexpect\s*\(|\bassert\w*\s*[(.]|\.should\b|\bt\.(?:Error|Fatal|Fail)\w*\(|\brequire\.\w+\(|\bassertThat\s*\(/g

const count = (text, re) => (text.match(re) ?? []).length

function nul(out) {
  return out.split('\0').filter(Boolean)
}

/** Paths in the baseline commit. */
export function baselineFiles(workRoot, state) {
  return nul(workGit(workRoot, state.workDir, ['ls-tree', '-r', '-z', '--name-only', state.baseline]))
}

function baselineContent(workRoot, state, rel) {
  return workGit(workRoot, state.workDir, ['show', `${state.baseline}:${rel}`])
}

/** Tracked paths that differ from the baseline: [{ status: 'M'|'D'|'T', path }]. */
export function changedSinceBaseline(workRoot, state) {
  const parts = nul(workGit(workRoot, state.workDir, ['diff', '--no-renames', '--name-status', '-z', state.baseline]))
  const out = []
  for (let i = 0; i < parts.length; i += 2) out.push({ status: parts[i][0], path: parts[i + 1] })
  return out
}

export function diffFindings(workRoot, state, files, findingId, cleanPath = (p) => p) {
  const out = []
  const add = (rule, severity, file, key, value) => out.push({ id: findingId(rule, file, key), rule, severity, file, line: 0, value })
  const renamedFrom = new Map(Object.entries(state.renamed ?? {}).map(([to, from]) => [from, to]))
  const exported = new Set(files)

  for (const { status, path: rel } of changedSinceBaseline(workRoot, state)) {
    const target = status === 'D' ? renamedFrom.get(rel) : rel
    if (!TEST_FILE.test(rel) && !(target && TEST_FILE.test(target))) continue
    if (!target || !exported.has(target)) {
      add('test-file-deleted', 'block', cleanPath(rel), 'deleted', 'test file removed: restore it, or allow with the reason it had to go')
      continue
    }
    const before = baselineContent(workRoot, state, rel)
    let after
    try {
      after = fs.readFileSync(native(state.workDir, target), 'utf8')
    } catch {
      continue
    }
    const skips = [count(before, SKIP_MARKERS), count(after, SKIP_MARKERS)]
    if (skips[1] > skips[0]) add('test-skip-added', 'block', target, `${skips[0]}->${skips[1]}`, `skip/only markers went from ${skips[0]} to ${skips[1]}`)
    const asserts = [count(before, ASSERTIONS), count(after, ASSERTIONS)]
    if (asserts[1] < asserts[0]) add('assertions-reduced', 'review', target, `${asserts[0]}->${asserts[1]}`, `assertions went from ${asserts[0]} to ${asserts[1]}`)
  }

  const inBaseline = new Set(baselineFiles(workRoot, state))
  const renamedTargets = new Set(Object.keys(state.renamed ?? {}))
  for (const rel of files) {
    if (!inBaseline.has(rel) && !renamedTargets.has(rel)) add('added-file', 'review', rel, 'added', 'not in the original project: created during the export')
  }
  for (const rel of state.untracked ?? []) {
    if (exported.has(rel)) add('untracked-file', 'review', rel, 'untracked', 'never committed in the original project')
  }
  return out
}
