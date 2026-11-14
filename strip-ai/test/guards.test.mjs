// The guards that keep the export honest: decisions need specific reasons,
// checks are records tied to the exact files, and a silenced test is caught.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { checkFindings, loadChecks, runCheck } from '../skills/export/scripts/lib/checks.mjs'
import { addDecision, loadDecisions, unresolved, validateReason } from '../skills/export/scripts/lib/decisions.mjs'
import { diffFindings } from '../skills/export/scripts/lib/diff.mjs'
import { findingId } from '../skills/export/scripts/lib/scan.mjs'
import { exportFiles, prepareWork, saveState } from '../skills/export/scripts/lib/workspace.mjs'
import { commitAll, initRepo, tempDir, write } from './helpers.mjs'

const finding = (rule, file, severity = 'review') => ({ id: findingId(rule, file, 'v'), rule, severity, file, line: 1, value: 'x' })

test('vague reasons are refused', () => {
  for (const r of ['ok', 'fine', 'false positive', 'needed for tests', 'n/a', 'short']) assert.throws(() => validateReason(r), /too vague/, r)
  assert.equal(validateReason('localhost URL used only in development'), 'localhost URL used only in development')
})

test('a decision must match a finding, and some findings can never be allowed', (t) => {
  const root = tempDir(t)
  const findings = [finding('env-file', '.env.development', 'block'), finding('ai-acronym', 'src/a.ts', 'clean'), finding('ai-acronym', 'docs/b.md', 'clean'), finding('ai-tooling-file', 'CLAUDE.md', 'block')]
  assert.throws(() => addDecision(root, { id: 'f0000000000' }, 'a specific enough reason', findings), /no finding/)
  assert.throws(() => addDecision(root, { id: findings[3].id }, 'a specific enough reason', findings), /cannot be allowed/)
  assert.throws(() => addDecision(root, { rule: 'ai-acronym', glob: 'lib/**' }, 'a specific enough reason', findings), /matches no finding/)
  addDecision(root, { id: findings[0].id }, 'only a localhost URL, no secret', findings)
  addDecision(root, { rule: 'ai-acronym', glob: 'src/**' }, 'product feature: the app calls a model API', findings)
  assert.deepEqual(unresolved(findings, loadDecisions(root)).map((f) => f.file), ['docs/b.md', 'CLAUDE.md'])
})

test('fixtures never need a decision', () => {
  assert.deepEqual(unresolved([finding('email', 'a.ts', 'fixture')], { byId: {}, byRule: [] }), [])
})

test('a final check must repeat a baseline command, run on the zipped files, and not regress', (t) => {
  const root = tempDir(t)
  const dir = tempDir(t)
  assert.throws(() => runCheck(root, dir, 'final', 'node -e 0', { fingerprint: 'a' }), /no baseline run/)
  runCheck(root, dir, 'baseline', 'node -e "process.exit(0)"', { fingerprint: 'a' })
  const rules = () => checkFindings(loadChecks(root), 'b', findingId).map((f) => f.rule)
  assert.deepEqual(rules(), ['final-check-missing'])
  runCheck(root, dir, 'final', 'node -e "process.exit(0)"', { fingerprint: 'a' })
  assert.deepEqual(rules(), ['final-check-stale'])
  runCheck(root, dir, 'baseline', 'node -e "process.exit(1)"', { fingerprint: 'a' })
  runCheck(root, dir, 'final', 'node -e "process.exit(1)"', { fingerprint: 'b' })
  runCheck(root, dir, 'final', 'node -e "process.exit(0)"', { fingerprint: 'b' })
  assert.deepEqual(rules(), [], 'a baseline failure that still fails, or now passes, is not a regression')
})

test('a check that passed before cleaning and fails after is a regression', (t) => {
  const root = tempDir(t)
  const dir = tempDir(t)
  write(dir, 'flag', '1')
  const cmd = 'node -e "process.exit(require(\'fs\').readFileSync(\'flag\',\'utf8\') === \'1\' ? 0 : 1)"'
  runCheck(root, dir, 'baseline', cmd, { fingerprint: 'a' })
  write(dir, 'flag', '0')
  runCheck(root, dir, 'final', cmd, { fingerprint: 'b' })
  assert.deepEqual(checkFindings(loadChecks(root), 'b', findingId).map((f) => f.rule), ['check-regression'])
})

function testProject(t) {
  const base = tempDir(t)
  const dir = path.join(base, 'app')
  fs.mkdirSync(dir)
  initRepo(dir)
  write(dir, 'tests/a.test.js', 'test("a", () => {\n  expect(1).toBe(1)\n  expect(2).toBe(2)\n})\n')
  write(dir, 'tests/b.test.js', 'test("b", () => {\n  expect(true).toBe(true)\n})\n')
  write(dir, 'tests/maria-silva.test.js', 'test("c", () => {\n  expect(3).toBe(3)\n})\n')
  write(dir, 'src/index.js', 'x\n')
  commitAll(dir)
  const { workRoot, state } = prepareWork(dir)
  t.after(() => fs.rmSync(workRoot, { recursive: true, force: true }))
  return { workRoot, state }
}

const diffRules = (workRoot, state) => diffFindings(workRoot, state, exportFiles(workRoot, state), findingId).map((f) => [f.rule, f.file])

test('a deleted test, a new skip and fewer assertions are caught', (t) => {
  const { workRoot, state } = testProject(t)
  fs.rmSync(path.join(state.workDir, 'tests', 'b.test.js'))
  write(state.workDir, 'tests/a.test.js', 'test.skip("a", () => {\n  expect(1).toBe(1)\n})\n')
  assert.deepEqual(diffRules(workRoot, state).sort(), [
    ['assertions-reduced', 'tests/a.test.js'],
    ['test-file-deleted', 'tests/b.test.js'],
    ['test-skip-added', 'tests/a.test.js'],
  ])
})

test('a renamed test file is compared with its original, not reported as deleted', (t) => {
  const { workRoot, state } = testProject(t)
  fs.renameSync(path.join(state.workDir, 'tests', 'maria-silva.test.js'), path.join(state.workDir, 'tests', 'jane-doe.test.js'))
  assert.deepEqual(diffRules(workRoot, state).sort(), [['added-file', 'tests/jane-doe.test.js'], ['test-file-deleted', 'tests/maria-silva.test.js']], 'precondition: unknown renames look like a deletion')
  state.renamed = { 'tests/jane-doe.test.js': 'tests/maria-silva.test.js' }
  saveState(workRoot, state)
  assert.deepEqual(diffRules(workRoot, state), [])
})

test('files created during the export are listed', (t) => {
  const { workRoot, state } = testProject(t)
  write(state.workDir, 'coverage-summary.txt', 'written by a test run\n')
  assert.deepEqual(diffRules(workRoot, state), [['added-file', 'coverage-summary.txt']])
})
