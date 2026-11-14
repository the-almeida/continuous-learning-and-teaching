// End to end: a throwaway git repo goes through every CLI step and the
// resulting zip is read back and checked.
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { readZip } from '../skills/export/scripts/lib/zip.mjs'

const CLI = fileURLToPath(new URL('../skills/export/scripts/strip-ai.mjs', import.meta.url))

function run(...args) {
  return JSON.parse(execFileSync(process.execPath, [CLI, ...args], { encoding: 'utf8' }))
}

function write(root, rel, content) {
  const abs = path.join(root, ...rel.split('/'))
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, content)
}

function makeProject() {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'strip-ai-test-'))
  const root = path.join(parent, 'demo-app')
  fs.mkdirSync(root)
  const g = (...args) => execFileSync('git', args, { cwd: root, stdio: 'ignore' })
  g('-c', 'init.defaultBranch=main', 'init', '-q')
  g('config', 'user.name', 'Maria Silva')
  g('config', 'user.email', 'maria.silva@gmail.com')
  write(root, '.gitignore', 'node_modules/\n.env.local\n')
  write(root, 'CLAUDE.md', '# rules\n')
  write(root, '.claude/commands/ship.md', 'ship it\n')
  write(root, 'README.md', 'Run /ship when done.\nContact maria.silva@gmail.com\n')
  write(root, 'LICENSE', 'Copyright (c) 2026 Maria Silva\n')
  write(root, 'src/app.test.js', 'expect(owner).toBe("maria.silva@gmail.com")\n')
  write(root, '.husky/pre-commit', 'npm test\n')
  write(root, '.env.local', 'SECRET=abc123\n')
  write(root, 'node_modules/x/index.js', 'x\n')
  g('add', '-A')
  // Through git, not chmod, so the executable bit is recorded on Windows too.
  g('update-index', '--chmod=+x', '.husky/pre-commit')
  g('commit', '-q', '-m', 'init')
  write(root, 'notes/untracked.md', 'not committed yet\n')
  return { parent, root }
}

test('prepare -> strip -> redact -> zip produces a clean archive and leaves the source untouched', () => {
  const { parent, root } = makeProject()
  const before = fs.readFileSync(path.join(root, 'README.md'), 'utf8')
  const { workRoot, workDir } = run('prepare', root)
  try {
    assert.deepEqual(run('strip', workRoot), { removed: ['.claude', 'CLAUDE.md'], aiCommandNames: ['ship'] })
    run('env-in', workRoot)
    assert.ok(fs.existsSync(path.join(workDir, '.env.local')), 'env file copied for test runs')

    // A blocking finding stops the zip.
    const blocked = spawnSync(process.execPath, [CLI, 'zip', workRoot], { encoding: 'utf8' })
    assert.notEqual(blocked.status, 0)
    assert.match(blocked.stderr, /email at README\.md:2/)

    run('redact', workRoot)
    const { zip } = run('zip', workRoot, '--name', 'demo')
    assert.equal(zip, path.join(parent, 'demo-clean.zip'))

    const entries = readZip(zip)
    const names = entries.map((e) => e.name).sort()
    assert.deepEqual(names, [
      'demo/.gitignore', 'demo/.husky/pre-commit', 'demo/LICENSE', 'demo/README.md',
      'demo/notes/untracked.md', 'demo/src/app.test.js',
    ])
    const text = Object.fromEntries(entries.map((e) => [e.name, e.data.toString('utf8')]))
    assert.equal(text['demo/LICENSE'], 'Copyright (c) 2026 Jane Doe\n')
    assert.equal(text['demo/src/app.test.js'], 'expect(owner).toBe("user1@example.com")\n')
    assert.equal(entries.find((e) => e.name === 'demo/.husky/pre-commit').mode, 0o755)
    assert.equal(fs.readFileSync(path.join(root, 'README.md'), 'utf8'), before, 'source not modified')
  } finally {
    run('cleanup', workRoot)
    fs.rmSync(parent, { recursive: true, force: true })
  }
  assert.equal(fs.existsSync(workRoot), false)
})

test('cleanup refuses to delete a directory that is not a work dir', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'not-strip-'))
  const result = spawnSync(process.execPath, [CLI, 'cleanup', dir], { encoding: 'utf8' })
  assert.notEqual(result.status, 0)
  assert.ok(fs.existsSync(dir))
  fs.rmSync(dir, { recursive: true })
})
