import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { detectLanguage } from '../skills/export/scripts/lib/languages.mjs'
import { readZip } from '../skills/export/scripts/lib/zip.mjs'
import { cli, cliOk, commitAll, initRepo, openFindings, prepare, tempDir, write } from './helpers.mjs'

const lang = (rel, head = '') => detectLanguage(rel, Buffer.from(head)).language

test('languages come from names, extensions and shebangs', () => {
  assert.equal(lang('src/app.tsx'), 'TypeScript')
  assert.equal(lang('script.ahk'), 'AutoHotkey')
  assert.equal(lang('build/Dockerfile'), 'Dockerfile')
  assert.equal(lang('Makefile'), 'Makefile')
  assert.equal(lang('pnpm-lock.yaml'), 'Lockfile')
  assert.equal(lang('.gitignore'), 'Ignore List')
  assert.equal(lang('.husky/pre-commit', 'pnpm test\n'), 'Shell')
  assert.equal(lang('bin/tool', '#!/usr/bin/env python3\nprint(1)\n'), 'Python')
  assert.equal(lang('bin/run', '#!/bin/bash\n'), 'Shell')
  assert.equal(lang('README.md'), 'Markdown')
  assert.equal(lang('logo.png'), 'Images')
  assert.equal(lang('data.weird'), 'Unknown (.weird)')
})

function polyglot(t) {
  const base = tempDir(t)
  const repo = path.join(base, 'mono')
  const dir = path.join(repo, 'tools')
  fs.mkdirSync(dir, { recursive: true })
  initRepo(repo)
  write(dir, 'main.ts', 'export const x = 1\n')
  write(dir, 'main.test.ts', 'test("x", () => expect(1).toBe(1))\n')
  write(dir, 'helper.py', 'print("hi")\n')
  write(dir, 'tests/test_helper.py', 'def test_x():\n    assert True\n')
  write(dir, 'run.ahk', 'MsgBox "hi"\n')
  write(dir, 'README.md', '# Tools\n')
  commitAll(repo)
  return { base, repo, dir }
}

test('the user keeps some languages; files in the others leave the export before anything else runs', (t) => {
  const { base, dir } = polyglot(t)
  const wr = prepare(t, dir)
  assert.match(cli('check', wr, 'baseline', '--none', 'nothing runnable in this fixture').stderr, /decide the languages first/)
  const listed = cliOk('languages', wr).json().languages.map((l) => l.language).sort()
  assert.deepEqual(listed, ['AutoHotkey', 'Markdown', 'Python', 'TypeScript'])
  assert.match(cli('languages', wr, '--keep', 'TypeScript,Cobol').stderr, /not among the detected languages: cobol/)

  const kept = cliOk('languages', wr, '--keep', 'TypeScript, markdown').json()
  assert.deepEqual(kept.removed.sort(), ['AutoHotkey (1 file(s))', 'Python (2 file(s))'])
  assert.equal(fs.existsSync(path.join(wr, 'project', 'helper.py')), false)
  assert.match(cliOk('status', wr).stdout, /✓ languages decided\s+kept: TypeScript, Markdown/)

  cliOk('check', wr, 'baseline', '--none', 'nothing runnable in this fixture')
  cliOk('strip', wr)
  assert.match(cli('languages', wr, '--keep', 'all').stderr, /before "strip"/)
  cliOk('inventory', wr)
  cliOk('identity', wr, 'confirm')
  cliOk('redact', wr)
  assert.ok(!openFindings(wr).some((f) => f.rule === 'test-file-deleted'), 'a test removed with its language is not a silenced test')

  for (const f of openFindings(wr)) cliOk('allow', wr, f.id, '--reason', 'reviewed: harmless content of the test fixture')
  const zipped = cliOk('zip', wr, '--name', 'tools').json()
  assert.equal(path.dirname(zipped.zip), base, 'a folder inside a repo is zipped next to the repo, not inside it')
  assert.deepEqual(readZip(zipped.zip).map((e) => e.name).sort(), ['tools/README.md', 'tools/main.test.ts', 'tools/main.ts'])
  const report = fs.readFileSync(zipped.report, 'utf8')
  assert.match(report, /\| Python \| programming \| 2 \| excluded by the user \|/)
  assert.match(report, /\| TypeScript \| programming \| 2 \| kept \|/)
})
