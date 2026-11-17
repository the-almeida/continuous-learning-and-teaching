// Projects the operator does not own: contributors are matched by full name
// and email only, organizations are not people, license notices stay as the
// license requires, and the project's code never runs without approval or
// with the operator's credentials.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { scanContext } from '../skills/export/scripts/lib/context.mjs'
import { git as safeGit } from '../skills/export/scripts/lib/git.mjs'
import { collectIdentities, identityTokens, keepSeenPeople, wordsOf } from '../skills/export/scripts/lib/identity.mjs'
import { redactTree } from '../skills/export/scripts/lib/redact.mjs'
import { scanTree } from '../skills/export/scripts/lib/scan.mjs'
import { readZip } from '../skills/export/scripts/lib/zip.mjs'
import { cli, cliEnv, cliOk, git, openFindings, prepare, read, tempDir, write } from './helpers.mjs'

const OPERATOR = { name: 'Gus Operator', email: 'gus@operator-site.dev', osUser: 'runner' }

/** A public project: authored by others, cloned with no local git identity. */
function publicProject(t) {
  const base = tempDir(t)
  const dir = path.join(base, 'react')
  fs.mkdirSync(dir)
  git(dir, '-c', 'init.defaultBranch=main', 'init', '-q')
  git(dir, 'config', 'core.autocrlf', 'false')
  write(dir, 'LICENSE', 'MIT License\n\nCopyright (c) Mark Smith <mark@smith.dev>\n\nPermission is hereby granted...\n')
  write(dir, 'README.md', 'See https://github.com/facebook/react and the markdown docs. Bookmark it.\nCreated by Mark Smith (mark@smith.dev), with help from Ana Lima.\n')
  write(dir, 'src/index.js', '// Copyright 2020 Mark Smith <mark@smith.dev>\n// Maintained by Mark Smith\nexport const author = "Mark Smith"\n')
  write(dir, 'CODEOWNERS', '* @gaearon @facebook/core\n')
  git(dir, 'add', '-A')
  const as = (name, email) => ['-c', `user.name=${name}`, '-c', `user.email=${email}`]
  git(dir, ...as('Mark Smith', 'mark@smith.dev'), 'commit', '-q', '-m', 'init')
  git(dir, ...as('Ana Lima', 'ana@lima.dev'), 'commit', '-q', '--allow-empty', '-m', 'docs')
  git(dir, ...as('linus', 'linus@kernel.example'), 'commit', '-q', '--allow-empty', '-m', 'one-word name')
  git(dir, ...as('Zed Unseen', 'zed@unseen.dev'), 'commit', '-q', '--allow-empty', '-m', 'never mentioned in files')
  git(dir, 'remote', 'add', 'origin', 'https://github.com/facebook/react.git')
  return { base, dir }
}

test('a project the operator never committed to is third-party; one they committed to is their own', (t) => {
  const { dir } = publicProject(t)
  const id = collectIdentities(dir, { operator: OPERATOR })
  assert.equal(id.mode, 'third-party')
  assert.equal(collectIdentities(dir, { operator: { ...OPERATOR, email: 'ana@lima.dev' } }).mode, 'own')
  assert.equal(collectIdentities(dir, { operator: OPERATOR, mode: 'own' }).mode, 'own')
})

test('in a third-party project the remote owner is not a person, and contributors are full names and emails only', (t) => {
  const { dir } = publicProject(t)
  const id = collectIdentities(dir, { operator: OPERATOR })
  assert.deepEqual(id.remoteOwners, ['facebook'])
  assert.ok(!id.handles.includes('facebook'))
  assert.ok(id.handles.includes('gaearon'), 'CODEOWNERS lists people')
  assert.ok(id.names.includes('Mark Smith') && id.names.includes('Ana Lima'))
  assert.ok(!id.names.includes('linus') && id.dropped.some((d) => d.value === 'linus'))
  assert.deepEqual(id.domains, ['operator-site.dev'], "contributors' email domains are not personal sites")
  assert.ok(!identityTokens(id).some((t) => ['mark', 'smith', 'lima'].includes(t)), 'only the operator is searched piece by piece')
})

test('contributors whose names never occur in the files are left out', (t) => {
  const { dir } = publicProject(t)
  const words = new Set(wordsOf('Created by Mark Smith and Ana Lima. cvGusOperator.pdf'))
  const kept = keepSeenPeople(collectIdentities(dir, { operator: OPERATOR }), words)
  assert.ok(kept.names.includes('Mark Smith') && kept.names.includes('Ana Lima') && kept.names.includes('Gus Operator'))
  assert.ok(!kept.names.includes('Zed Unseen'))
  assert.ok(kept.unseen >= 1)
})

test('license files and copyright lines are kept verbatim; everything else about contributors is redacted', (t) => {
  const { dir } = publicProject(t)
  const identity = collectIdentities(dir, { operator: OPERATOR })
  const files = ['LICENSE', 'README.md', 'src/index.js']
  const result = redactTree(dir, files, identity, { keepNotices: true })
  assert.deepEqual(result.keptNotices, ['LICENSE'])
  assert.equal(read(dir, 'LICENSE'), 'MIT License\n\nCopyright (c) Mark Smith <mark@smith.dev>\n\nPermission is hereby granted...\n')
  const readme = read(dir, 'README.md')
  assert.ok(readme.startsWith('See https://github.com/facebook/react and the markdown docs. Bookmark it.\n'), 'organization and ordinary words untouched')
  const [, mark, ana] = /Created by (\w+ \w+) \(user1@example\.com\), with help from (\w+ \w+)\./.exec(readme) ?? []
  assert.ok(mark && ana && mark !== ana && ![mark, ana].some((n) => /Mark|Smith|Ana|Lima/.test(n)), readme)
  assert.equal(read(dir, 'src/index.js'), `// Copyright 2020 Mark Smith <mark@smith.dev>\n// Maintained by ${mark}\nexport const author = "${mark}"\n`)

  const ctx = scanContext(identity, { originals: result.rawOriginals, rules: result.rules })
  const findings = scanTree(dir, files, ctx)
  assert.deepEqual(findings.filter((f) => f.severity !== 'fixture').map((f) => [f.rule, f.file]), [])
  assert.ok(findings.some((f) => f.file === 'LICENSE' && f.value.startsWith('kept (license notice)')))
})

test("the project's code needs approval to run, and runs without the operator's credentials", (t) => {
  const { dir } = publicProject(t)
  const wr = prepare(t, dir)
  assert.equal(cliOk('status', wr).stdout.split('\n')[0].startsWith('mode: third-party'), true)
  cliOk('languages', wr, '--keep', 'all')
  const printEnv = 'node -e "console.log(\'SECRET=\' + (process.env.STRIP_AI_TEST_SECRET || \'none\'), \'HOME=\' + require(\'os\').homedir())"'
  const refused = cli('check', wr, 'baseline', printEnv)
  assert.notEqual(refused.status, 0)
  assert.match(refused.stderr, /needs the user's approval/)
  assert.notEqual(cli('check', wr, 'baseline', printEnv, '--approved', 'ok').status, 0, 'a vague approval is refused')
  const ran = cliEnv({ STRIP_AI_TEST_SECRET: 'hunter2-live-token' }, 'check', wr, 'baseline', printEnv, '--approved', 'user approved running the tests in chat')
  assert.equal(ran.status, 0, ran.stderr)
  assert.match(ran.stdout, /SECRET=none/)
  assert.ok(ran.stdout.includes(`HOME=${path.join(wr, 'sandbox-home')}`), ran.stdout)
  assert.equal(ran.json().scrubbedEnv, true)
  assert.match(cli('env-in', wr).stderr, /would read these \.env files/)
})

test('a repository config cannot run commands through core.fsmonitor', (t) => {
  const dir = tempDir(t)
  git(dir, '-c', 'init.defaultBranch=main', 'init', '-q')
  write(dir, 'a.txt', 'a\n')
  git(dir, 'add', 'a.txt')
  const marker = path.join(dir, 'fsmonitor-ran')
  write(dir, 'hook.sh', `#!/bin/sh\necho ran > "${marker.replace(/\\/g, '/')}"\nexit 1\n`)
  fs.chmodSync(path.join(dir, 'hook.sh'), 0o755)
  git(dir, 'config', 'core.fsmonitor', path.join(dir, 'hook.sh').replace(/\\/g, '/'))
  try {
    git(dir, 'status', '--porcelain')
  } catch {
    // git may complain about the hook's output; only whether it ran matters.
  }
  if (!fs.existsSync(marker)) return t.skip('this git does not run core.fsmonitor here')
  fs.rmSync(marker)
  safeGit(dir, ['status', '--porcelain'])
  safeGit(dir, ['ls-files', '--cached', '--others', '--exclude-standard'])
  assert.equal(fs.existsSync(marker), false)
})

test('a third-party project goes through the whole workflow without running its code', (t) => {
  const { base, dir } = publicProject(t)
  const wr = prepare(t, dir)
  cliOk('languages', wr, '--keep', 'all')
  cliOk('check', wr, 'baseline', '--none', 'third-party code, the user chose not to run it')
  cliOk('strip', wr)
  const inv = cliOk('inventory', wr).json()
  assert.deepEqual(inv.remoteOwners.values, ['facebook'])
  cliOk('identity', wr, 'confirm')
  const redacted = cliOk('redact', wr).json()
  assert.deepEqual(redacted.licenseNoticesKept, ['LICENSE'])
  const open = openFindings(wr)
  assert.ok(!open.some((f) => f.rule === 'identity-token'), 'no first-name noise from contributors')
  for (const f of open) cliOk('allow', wr, f.id, '--reason', 'reviewed by the test: harmless in this fixture project')
  const zipped = cliOk('zip', wr, '--name', 'react-snapshot').json()
  const entries = new Map(readZip(zipped.zip).map((e) => [e.name, e.data.toString('utf8')]))
  assert.match(entries.get('react-snapshot/LICENSE'), /Copyright \(c\) Mark Smith <mark@smith\.dev>/)
  assert.match(entries.get('react-snapshot/README.md'), /github\.com\/facebook\/react and the markdown docs/)
  assert.doesNotMatch(entries.get('react-snapshot/README.md'), /Mark Smith|mark@smith|Ana Lima/)
  const report = fs.readFileSync(zipped.report, 'utf8')
  assert.match(report, /third-party: contributors' full names and emails redacted/)
  assert.match(report, /License notices kept verbatim/)
  fs.writeFileSync(zipped.report, report.replace(/<!-- strip-ai:todo -->[^\n]*/g, 'Nothing.'))
  assert.equal(cliOk('finalize', wr).json().ready, true)
  assert.ok(fs.existsSync(path.join(base, 'react-snapshot-clean.zip')))
})
