import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { emptyIdentity } from '../skills/export/scripts/lib/identity.mjs'

export const CLI = fileURLToPath(new URL('../skills/export/scripts/strip-ai.mjs', import.meta.url))

export const nobody = () => emptyIdentity()
export const owner = () => ({ ...emptyIdentity(), names: ['Maria Silva'], emails: ['maria.silva@gmail.com'], handles: ['the-msilva'] })

/** A temp dir removed after the test, whether it passed or not. */
export function tempDir(t, prefix = 'strip-ai-t-') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  return dir
}

export function write(root, rel, content) {
  const abs = path.join(root, ...rel.split('/'))
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, content)
  return abs
}

export function read(root, rel) {
  return fs.readFileSync(path.join(root, ...rel.split('/')), 'utf8')
}

export function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

export function initRepo(dir, { name = 'Maria Silva', email = 'maria.silva@gmail.com' } = {}) {
  git(dir, '-c', 'init.defaultBranch=main', 'init', '-q')
  git(dir, 'config', 'user.name', name)
  git(dir, 'config', 'user.email', email)
  git(dir, 'config', 'core.autocrlf', 'false')
  git(dir, 'config', 'commit.gpgsign', 'false')
}

export function commitAll(dir, message = 'init') {
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '--allow-empty', '-m', message)
}

export function canSymlink(dir) {
  const probe = path.join(dir, `.symlink-probe-${process.pid}`)
  try {
    fs.symlinkSync('target', probe)
    fs.unlinkSync(probe)
    return true
  } catch {
    return false
  }
}

/** Runs the CLI. Returns { status, stdout, stderr, json } where json parses the last JSON object printed. */
export function cli(...args) {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', maxBuffer: 1 << 26 })
  const json = () => {
    const start = r.stdout.lastIndexOf('\n{') + 1
    return JSON.parse(r.stdout.slice(start))
  }
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, json }
}

export function cliOk(...args) {
  const r = cli(...args)
  if (r.status !== 0) throw new Error(`strip-ai ${args[0]} failed (${r.status}): ${r.stderr || r.stdout}`)
  return r
}

/** Starts a work dir for `project` and removes it after the test. */
export function prepare(t, project) {
  const r = cliOk('prepare', project)
  const { workRoot } = r.json()
  t.after(() => cli('cleanup', workRoot))
  return workRoot
}

/** Open finding ids from `scan`, by rule. */
export function openFindings(workRoot) {
  const r = cliOk('scan', workRoot)
  return r.stdout
    .split('\n')
    .filter((l) => /^f[0-9a-f]{10}\s/.test(l))
    .map((l) => {
      const [id, severity, rule, file] = l.split(/\s+/)
      return { id, severity, rule, file }
    })
}

// Built at runtime so the repository never contains strings shaped like live credentials.
const chars = (n, alphabet = 'Ab3Cd5Ef7Gh9Jk2Lm4Np6Qr8St') => Array.from({ length: n }, (_, i) => alphabet[(i * 7) % alphabet.length]).join('')
const hex = (n) => chars(n, '0123456789abcdef')
export const SECRET_SAMPLES = {
  'private-key': ['-----BEGIN RSA PRIVATE', 'KEY-----\n', chars(64), '\n-----END RSA PRIVATE KEY-----'].join(' '),
  'anthropic-key': 'sk-' + 'ant-' + chars(40),
  'openai-key': 'sk-' + 'proj-' + chars(40),
  'aws-key': 'AK' + 'IA' + chars(16, 'ABCDEFGHJKLMNPQRSTUVWXYZ234567'),
  'github-token': 'gh' + 'p_' + chars(36),
  'slack-token': 'xo' + 'xb-' + chars(24),
  'slack-webhook': 'https://hooks.slack.com/' + 'services/' + chars(9) + '/' + chars(24),
  'google-api-key': 'AI' + 'za' + chars(35),
  'stripe-key': 'sk' + '_live_' + chars(24),
  'stripe-webhook-secret': 'wh' + 'sec_' + chars(32),
  jwt: 'ey' + 'J' + chars(20) + '.ey' + 'J' + chars(20) + '.' + chars(20),
  'sentry-dsn': 'https://' + hex(32) + '@o123.ingest.sentry.io/' + '4501',
  'posthog-key': 'ph' + 'c_' + chars(40),
  'resend-key': 're' + '_' + chars(8) + '_' + chars(20),
  'npm-token': 'np' + 'm_' + chars(36),
  'sendgrid-key': 'S' + 'G.' + chars(22) + '.' + chars(43),
}
