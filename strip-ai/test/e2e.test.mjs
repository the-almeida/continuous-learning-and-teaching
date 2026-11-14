// The whole workflow through the CLI, on a project built to trip every
// earlier failure: a symlink to a secret outside the project, a tracked file
// that matches .gitignore, a rename that would overwrite a file, a fixture
// email the placeholder could collide with, CRLF from a Windows checkout, a
// GitHub web merge, the owner's name in the folder, a personal domain only
// the inventory knows, an accented spelling of the owner's name, Portuguese
// AI prose and an untracked scratch file.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { readZip } from '../skills/export/scripts/lib/zip.mjs'
import { canSymlink, cli, cliOk, commitAll, git, initRepo, openFindings, prepare, read, tempDir, write } from './helpers.mjs'

const OWNER_CHECK = 'node -e "process.exit(require(\'./owner.js\').owner().includes(\'@\') ? 0 : 1)"'

function hostileProject(t) {
  const base = tempDir(t)
  const dir = path.join(base, 'maria-silva-portfolio')
  fs.mkdirSync(dir)
  initRepo(dir)
  const symlinks = canSymlink(dir)
  fs.writeFileSync(path.join(base, 'outside-secret.txt'), 'TOP SECRET OUTSIDE REPO\n')
  write(dir, '.gitignore', 'node_modules/\n.env*\n')
  if (symlinks) {
    fs.symlinkSync(path.join(base, 'outside-secret.txt'), path.join(dir, 'linked-secret.txt'))
    fs.symlinkSync('README.md', path.join(dir, 'readme-link.md'))
  }
  write(dir, '.env.development', 'API_URL=http://localhost:3000\n')
  git(dir, 'add', '-f', '.env.development')
  write(dir, 'cvMariaSilva.txt', 'real cv\n')
  write(dir, 'cvJaneDoe.txt', 'fixture persona\n')
  write(dir, 'seed.yml', 'seed: user1@example.com\nowner: joao.pereira@empresa.com.br\n')
  write(dir, 'run.sh', '#!/bin/sh\necho hi\n')
  write(dir, 'ci.md', 'Uses GitHub Actions. Fill in Your Name here.\n')
  write(dir, 'LEIAME.md', 'Este projeto foi feito com IA e um agente de inteligência artificial.\n')
  write(dir, 'prompts/system.txt', 'Review this diff for bugs.\n')
  write(dir, 'docker-compose.yml', 'db:\n  password: Zq8vL2pX9wRt\n')
  write(dir, 'AUTHORS', 'Autora: María Silva, site https://superdoc.thealmeida.online\n')
  write(dir, 'README.md', '# Demo\nBy Maria Silva. Built with Claude Code.\n')
  write(dir, '.claude/commands/ship.md', 'ship it\n')
  write(dir, 'CLAUDE.md', '# rules\n')
  write(dir, 'tests/owner.test.js', 'test("owner", () => {\n  expect(owner()).toBe("joao.pereira@empresa.com.br")\n})\n')
  write(dir, 'owner.js', 'module.exports.owner = () => "joao.pereira@empresa.com.br"\n')
  git(dir, 'add', '-A')
  git(dir, 'update-index', '--chmod=+x', 'run.sh') // through git, so the bit is recorded on Windows too
  git(dir, 'commit', '-q', '-m', 'init')
  git(dir, '-c', 'user.name=GitHub', '-c', 'user.email=noreply@github.com', 'commit', '-q', '--allow-empty', '-m', 'Merge pull request #1')
  git(dir, 'config', 'core.autocrlf', 'true')
  fs.rmSync(path.join(dir, 'run.sh'))
  git(dir, 'checkout', '--', 'run.sh')
  write(dir, 'scratch-notes.md', 'untracked scratch\n')
  return { base, dir, symlinks }
}

function fail(args, pattern) {
  const r = cli(...args)
  assert.notEqual(r.status, 0, `expected "${args[0]}" to refuse`)
  assert.match(r.stderr, pattern)
}

test('the full workflow refuses every shortcut and produces a clean, verified zip', (t) => {
  const { base, dir, symlinks } = hostileProject(t)
  const before = fs.readFileSync(path.join(dir, 'README.md'), 'utf8')
  const wr = prepare(t, dir)
  const work = path.join(wr, 'project')

  fail(['strip', wr], /baseline checks first/)
  cliOk('check', wr, 'baseline', 'sh run.sh')
  cliOk('check', wr, 'baseline', OWNER_CHECK)
  cliOk('strip', wr)
  fail(['check', wr, 'baseline', 'sh run.sh'], /before "strip"/)

  fail(['redact', wr], /inventory first/)
  const inventory = cliOk('inventory', wr).json()
  assert.ok(inventory.domains.some((d) => d.value === 'superdoc.thealmeida.online'), 'the inventory shows the personal domain')
  fail(['redact', wr], /confirm the identity/)
  const identity = cliOk('identity', wr, 'list').json()
  assert.ok(identity.dropped.some((d) => d.value === 'GitHub'), 'the GitHub web merge is not a person')
  cliOk('identity', wr, 'add', 'domain', 'thealmeida.online')
  cliOk('identity', wr, 'confirm')
  cliOk('redact', wr)

  const open = openFindings(wr)
  const rules = new Set(open.map((f) => f.rule))
  for (const rule of ['env-file', 'identity-in-path', 'generic-secret', 'untracked-file', 'ai-phrase', 'ai-path', 'ai-claude', 'final-check-missing']) {
    assert.ok(rules.has(rule), `expected an open ${rule} finding`)
  }
  fail(['zip', wr, '--name', 'portfolio'], /still need a fix or a decision/)

  // What Claude does with the findings.
  cliOk('rename', wr, 'cvMariaSilva.txt', 'cv-owner.txt')
  write(work, 'LEIAME.md', 'Este projeto é um portfólio.\n')
  write(work, 'README.md', '# Demo\nBy Jane Doe.\n')
  fs.rmSync(path.join(work, 'prompts'), { recursive: true })
  fs.rmSync(path.join(work, 'scratch-notes.md'))
  write(work, 'docker-compose.yml', 'db:\n  password: change-me\n')
  const envId = openFindings(wr).find((f) => f.rule === 'env-file').id
  fail(['allow', wr, envId, '--reason', 'ok'], /too vague/)
  fail(['allow', wr, envId, '--reason', 'kept because it belongs to thealmeida'], /piece of an identity/)
  cliOk('allow', wr, envId, '--reason', 'only a localhost API URL used in development, no secret')

  cliOk('check', wr, 'final', 'sh run.sh')
  cliOk('check', wr, 'final', OWNER_CHECK)
  assert.deepEqual(openFindings(wr), [])

  fail(['zip', wr, '--name', 'maria-silva-portfolio'], /piece of an identity/)
  fail(['zip', wr, '--name', 'agentic-portfolio'], /AI term/)
  const zipped = cliOk('zip', wr, '--name', 'portfolio').json()
  if (process.env.STRIP_AI_REQUIRE_INDEPENDENT) assert.ok(zipped.independent, `verified by ${zipped.verifiedBy}`)
  assert.equal(zipped.zip, path.join(base, 'portfolio-clean.zip'))

  const entries = new Map(readZip(zipped.zip).map((e) => [e.name, e]))
  const text = [...entries.values()].map((e) => e.data.toString('utf8')).join('\n').toLowerCase()
  for (const needle of ['maria', 'silva', 'thealmeida', 'joao', 'pereira', 'top secret', 'zq8v', 'claude', 'feito com ia']) {
    assert.equal(text.includes(needle), false, `zip still contains "${needle}"`)
  }
  assert.equal([...entries.keys()].some((n) => /maria|silva|claude|prompts|scratch/i.test(n)), false)
  assert.ok(entries.has('portfolio/.env.development'), 'tracked file matching .gitignore is kept')
  assert.equal(entries.get('portfolio/run.sh').data.toString(), '#!/bin/sh\necho hi\n')
  assert.equal(entries.get('portfolio/run.sh').mode, 0o755)
  assert.equal(entries.get('portfolio/seed.yml').data.toString(), 'seed: user1@example.com\nowner: user2@example.com\n')
  assert.match(entries.get('portfolio/ci.md').data.toString(), /GitHub Actions\. Fill in Your Name/)
  if (symlinks) {
    assert.ok(entries.get('portfolio/readme-link.md').symlink)
    assert.equal(entries.has('portfolio/linked-secret.txt'), false)
  }

  // The report must be completed, and must not leak.
  fail(['finalize', wr], /strip-ai:todo/)
  const reportPath = zipped.report
  let report = read(base, path.basename(reportPath))
  assert.ok(report.includes(zipped.sha256))
  const filled = report
    .replace(/<!-- strip-ai:todo --> One line per file[^\n]*/, '- `README.md`, `LEIAME.md`: removed AI sentences. `prompts/`: deleted.')
    .replace(/<!-- strip-ai:todo --> Table: Test[^\n]*/, 'None.')
  fs.writeFileSync(reportPath, filled.replace(/<!-- strip-ai:todo --> Suites skipped[^\n]*/, 'Kept the file of María Silva under another name.'))
  fail(['finalize', wr], /report leaks/)
  fs.writeFileSync(reportPath, filled.replace(/<!-- strip-ai:todo --> Suites skipped[^\n]*/, 'Nothing.'))

  // Any edit after the zip makes it stale.
  write(work, 'ci.md', 'edited after zipping\n')
  fail(['finalize', wr], /changed after the zip/)
  write(work, 'ci.md', 'Uses GitHub Actions. Fill in Your Name here.\n')
  const done = cliOk('finalize', wr).json()
  assert.equal(done.ready, true)
  assert.equal(done.sourceUnchanged, true)
  assert.match(cliOk('status', wr).stdout, /READY/)
  assert.equal(fs.readFileSync(path.join(dir, 'README.md'), 'utf8'), before, 'the original project is untouched')
})

test('a test silenced during the export blocks the zip', (t) => {
  const base = tempDir(t)
  const dir = path.join(base, 'app')
  fs.mkdirSync(dir)
  initRepo(dir)
  write(dir, 'tests/a.test.js', 'test("a", () => {\n  expect(1).toBe(1)\n})\n')
  commitAll(dir)
  const wr = prepare(t, dir)
  cliOk('check', wr, 'baseline', '--none', 'the project has no runnable test command')
  cliOk('strip', wr)
  cliOk('inventory', wr)
  cliOk('identity', wr, 'confirm')
  cliOk('redact', wr)
  write(path.join(wr, 'project'), 'tests/a.test.js', 'test.skip("a", () => {\n  expect(1).toBe(1)\n})\n')
  assert.deepEqual(openFindings(wr).map((f) => f.rule), ['test-skip-added'])
  fail(['zip', wr, '--name', 'app'], /still need a fix/)
})
