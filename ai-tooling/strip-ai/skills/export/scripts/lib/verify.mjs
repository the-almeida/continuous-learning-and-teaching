// Reads the finished zip back with a different implementation (Python's
// zipfile, Info-ZIP unzip, bsdtar, or PowerShell's Expand-Archive on
// Windows), compares every file byte for byte with what was meant to be
// written, and returns the extracted tree so the caller can scan it again.
// A bug in the built-in zip writer cannot hide behind the built-in reader.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { native, sha256 } from './files.mjs'
import { readZip } from './zip.mjs'

const PY_EXTRACT = [
  'import sys, zipfile',
  'z = zipfile.ZipFile(sys.argv[1])',
  'bad = z.testzip()',
  'if bad: sys.exit("bad entry: " + bad)',
  'z.extractall(sys.argv[2])',
].join('\n')

function run(cmd, args) {
  return spawnSync(cmd, args, { encoding: 'utf8', timeout: 600000, windowsHide: true })
}

function extractors(zip, dest) {
  const list = []
  for (const [py, pre] of [['python3', []], ['python', []], ['py', ['-3']]]) {
    list.push({ tool: `${py} zipfile`, probe: () => run(py, [...pre, '-c', 'import zipfile']).status === 0, extract: () => run(py, [...pre, '-I', '-c', PY_EXTRACT, zip, dest]) })
  }
  list.push({ tool: 'unzip', probe: () => run('unzip', ['-v']).status === 0, extract: () => run('unzip', ['-q', '-o', zip, '-d', dest]) })
  list.push({
    tool: 'bsdtar',
    probe: () => /bsdtar|libarchive/i.test(run('tar', ['--version']).stdout ?? ''),
    extract: () => run('tar', ['-xf', zip, '-C', dest]),
  })
  if (process.platform === 'win32') {
    const q = (p) => `'${p.replace(/'/g, "''")}'`
    for (const ps of ['pwsh', 'powershell']) {
      list.push({
        tool: `${ps} Expand-Archive`,
        probe: () => run(ps, ['-NoProfile', '-NonInteractive', '-Command', 'exit 0']).status === 0,
        extract: () => run(ps, ['-NoProfile', '-NonInteractive', '-Command', `Expand-Archive -LiteralPath ${q(zip)} -DestinationPath ${q(dest)} -Force`]),
      })
    }
  }
  return list
}

function walk(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(abs, base, out)
    else out.push(path.relative(base, abs).split(path.sep).join('/'))
  }
  return out
}

function builtInExtract(zip, dest) {
  for (const e of readZip(zip)) {
    const abs = native(dest, e.name)
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, e.data)
  }
}

/**
 * expected: [{ name, sha256, symlink }] as written. Returns
 * { tool, independent, dest, problems }. Symlinks are only checked for
 * presence: extractors differ in whether they recreate them.
 */
export function verifyZip(zip, dest, expected) {
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(dest, { recursive: true })
  const problems = []
  let tool = null
  for (const x of extractors(zip, dest)) {
    if (!x.probe()) continue
    tool = x.tool
    const r = x.extract()
    if (r.status !== 0) problems.push(`${x.tool} could not extract the zip: ${(r.stderr || r.stdout || r.error?.message || '').trim().slice(0, 300)}`)
    break
  }
  const independent = tool !== null
  if (!independent) {
    tool = 'built-in reader (no python, unzip, bsdtar or PowerShell found)'
    builtInExtract(zip, dest)
  }
  if (problems.length) return { tool, independent, dest, problems }

  const want = new Map(expected.map((e) => [e.name, e]))
  const got = new Set(walk(dest))
  for (const [name, e] of want) {
    const abs = native(dest, name)
    let st
    try {
      st = fs.lstatSync(abs)
    } catch {
      problems.push(`missing after extraction: ${name}`)
      continue
    }
    if (e.symlink || st.isSymbolicLink()) continue
    if (sha256(fs.readFileSync(abs)) !== e.sha256) problems.push(`content differs after extraction: ${name}`)
  }
  for (const name of got) if (!want.has(name)) problems.push(`unexpected file after extraction: ${name}`)
  return { tool, independent, dest, problems }
}
