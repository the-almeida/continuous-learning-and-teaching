import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { exportFiles, isWorkRoot, prepareWork, sourceFingerprint } from '../skills/export/scripts/lib/workspace.mjs'
import { canSymlink, cli, commitAll, git, initRepo, read, tempDir, write } from './helpers.mjs'

function project(t) {
  const base = tempDir(t)
  const dir = path.join(base, 'app')
  fs.mkdirSync(dir)
  initRepo(dir)
  return { base, dir }
}

function work(t, dir) {
  const { workRoot, state } = prepareWork(dir)
  t.after(() => fs.rmSync(workRoot, { recursive: true, force: true }))
  return { workRoot, state }
}

test('files the project tracks are exported even when they match .gitignore; ignored untracked files are not', (t) => {
  const { dir } = project(t)
  write(dir, '.gitignore', '.env*\nnode_modules/\n')
  write(dir, '.env.development', 'API_URL=http://localhost:3000\n')
  git(dir, 'add', '-f', '.env.development')
  write(dir, 'index.js', 'x\n')
  commitAll(dir)
  write(dir, '.env.local', 'SECRET=1\n')
  write(dir, 'node_modules/a/index.js', 'a\n')
  const { workRoot, state } = work(t, dir)
  assert.deepEqual(exportFiles(workRoot, state), ['.env.development', '.gitignore', 'index.js'])
})

test('untracked files are copied and listed; untracked dependency folders that .gitignore misses are skipped', (t) => {
  const { dir } = project(t)
  write(dir, 'index.js', 'x\n')
  commitAll(dir)
  write(dir, 'notes.md', 'wip\n')
  write(dir, 'node_modules/a/index.js', 'a\n')
  const { workRoot, state } = work(t, dir)
  assert.deepEqual(state.untracked, ['notes.md'])
  assert.deepEqual(state.skipped.heavyUntracked, { node_modules: 1 })
  assert.deepEqual(exportFiles(workRoot, state), ['index.js', 'notes.md'])
  write(state.workDir, 'node_modules/b/index.js', 'installed in the work dir\n')
  assert.deepEqual(exportFiles(workRoot, state), ['index.js', 'notes.md'], 'an install in the work dir never reaches the export')
})

test('a symlink to a file outside the project is not followed; one inside is kept as a link', (t) => {
  const { base, dir } = project(t)
  if (!canSymlink(dir)) return t.skip('symlinks need extra permissions on this machine')
  fs.writeFileSync(path.join(base, 'outside-secret.txt'), 'TOP SECRET\n')
  fs.symlinkSync(path.join(base, 'outside-secret.txt'), path.join(dir, 'linked-secret.txt'))
  write(dir, 'README.md', 'hi\n')
  fs.symlinkSync('README.md', path.join(dir, 'readme-link.md'))
  commitAll(dir)
  const { workRoot, state } = work(t, dir)
  assert.deepEqual(state.skipped.symlinksOutside, ['linked-secret.txt'])
  assert.deepEqual(state.symlinks, { 'readme-link.md': 'README.md' })
  assert.deepEqual(exportFiles(workRoot, state), ['README.md', 'readme-link.md'])
  assert.equal(fs.existsSync(path.join(state.workDir, 'linked-secret.txt')), false)
})

test('CRLF that a Windows checkout added is turned back into the LF git stores; intended CRLF is kept', (t) => {
  const { dir } = project(t)
  write(dir, '.gitattributes', '*.bat eol=crlf\n')
  write(dir, 'run.sh', '#!/bin/sh\necho hi\n')
  write(dir, 'run.bat', '@echo hi\r\n')
  commitAll(dir)
  git(dir, 'config', 'core.autocrlf', 'true')
  fs.rmSync(path.join(dir, 'run.sh'))
  git(dir, 'checkout', '--', 'run.sh')
  assert.match(read(dir, 'run.sh'), /\r\n/, 'precondition: the checkout has CRLF')
  const { state } = work(t, dir)
  assert.equal(read(state.workDir, 'run.sh'), '#!/bin/sh\necho hi\n')
  assert.equal(read(state.workDir, 'run.bat'), '@echo hi\r\n')
  assert.deepEqual(state.normalizedLineEndings, ['run.sh'])
})

test('the executable bit comes from git, so it survives a Windows checkout', (t) => {
  const { dir } = project(t)
  git(dir, 'config', 'core.filemode', 'false') // as on Windows: the working tree has no executable bit
  write(dir, 'hook.sh', 'exit 0\n')
  git(dir, 'add', 'hook.sh')
  git(dir, 'update-index', '--chmod=+x', 'hook.sh')
  commitAll(dir)
  const { state } = work(t, dir)
  assert.deepEqual(state.executables, ['hook.sh'])
})

test('the work dir is a repo with a baseline commit, and the source fingerprint notices any change', (t) => {
  const { dir } = project(t)
  write(dir, 'a.txt', 'one\n')
  commitAll(dir)
  const { state } = work(t, dir)
  assert.match(state.baseline, /^[0-9a-f]{40}$/)
  assert.equal(sourceFingerprint(state), state.sourceFingerprint)
  write(dir, 'a.txt', 'changed\n')
  assert.notEqual(sourceFingerprint(state), state.sourceFingerprint)
})

test('cleanup refuses anything that is not a work dir', (t) => {
  const dir = tempDir(t, 'not-a-work-dir-')
  assert.equal(isWorkRoot(dir), false)
  assert.notEqual(cli('cleanup', dir).status, 0)
  assert.ok(fs.existsSync(dir))
})
