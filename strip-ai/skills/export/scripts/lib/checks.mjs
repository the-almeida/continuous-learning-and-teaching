// The project's own checks (tests, typecheck, lint), run by the script so the
// before/after comparison is a record, not a recollection. Each run stores
// the exit code and the tree fingerprint it ran against: a final run is only
// valid for the exact files that get zipped.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { readJson, writeJson } from './files.mjs'

function file(workRoot) {
  return path.join(workRoot, 'checks.json')
}

export function loadChecks(workRoot) {
  return readJson(file(workRoot), { runs: [], none: null })
}

function normalize(command) {
  return command.trim().replace(/\s+/g, ' ')
}

// Variables a build or test needs that carry no credentials. Everything else
// (tokens, keys, cloud credentials in the operator's shell) is left out.
const SAFE_ENV = [
  'PATH', 'Path', 'PATHEXT', 'SystemRoot', 'SYSTEMROOT', 'SystemDrive', 'ComSpec', 'COMSPEC', 'windir', 'WINDIR', 'OS',
  'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'LANG', 'LANGUAGE', 'LC_ALL', 'LC_CTYPE', 'TERM', 'TZ', 'SHELL',
  'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'no_proxy',
  'NODE_EXTRA_CA_CERTS', 'SSL_CERT_FILE', 'SSL_CERT_DIR', 'REQUESTS_CA_BUNDLE', 'CURL_CA_BUNDLE', 'GIT_SSL_CAINFO',
]

/** An environment for untrusted code: no credentials, and a throwaway home, cache and temp folder. */
export function scrubbedEnv(workRoot) {
  const home = path.join(workRoot, 'sandbox-home')
  const tmp = path.join(workRoot, 'sandbox-tmp')
  for (const d of [home, tmp]) fs.mkdirSync(d, { recursive: true })
  const env = {
    HOME: home, USERPROFILE: home, APPDATA: path.join(home, 'AppData', 'Roaming'), LOCALAPPDATA: path.join(home, 'AppData', 'Local'),
    XDG_CONFIG_HOME: path.join(home, '.config'), XDG_CACHE_HOME: path.join(home, '.cache'), TMPDIR: tmp, TMP: tmp, TEMP: tmp,
  }
  for (const k of SAFE_ENV) if (process.env[k] !== undefined) env[k] = process.env[k]
  return env
}

/**
 * phase: 'setup' (an install step, recorded but not compared), 'baseline'
 * (before cleaning) or 'final' (after). `scrub` runs the command without the
 * operator's credentials; `approval` records who allowed untrusted code to run.
 */
export function runCheck(workRoot, workDir, phase, command, { timeoutSec = 1800, fingerprint, scrub = false, approval }) {
  if (!['setup', 'baseline', 'final'].includes(phase)) throw new Error(`phase must be "setup", "baseline" or "final", not "${phase}"`)
  const checks = loadChecks(workRoot)
  const cmd = normalize(command)
  if (phase === 'final' && !checks.runs.some((r) => r.phase === 'baseline' && r.command === cmd)) {
    throw new Error(`"${cmd}" has no baseline run. Final checks must repeat a baseline command exactly.`)
  }
  const started = Date.now()
  const result = spawnSync(cmd, {
    cwd: workDir,
    shell: true,
    encoding: 'utf8',
    maxBuffer: 1 << 28,
    timeout: timeoutSec * 1000,
    env: { ...(scrub ? scrubbedEnv(workRoot) : process.env), CI: 'true', NO_COLOR: '1', FORCE_COLOR: '0' },
  })
  fs.mkdirSync(path.join(workRoot, 'logs'), { recursive: true })
  const log = path.join(workRoot, 'logs', `${phase}-${checks.runs.length + 1}.log`)
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  fs.writeFileSync(log, output)
  const run = {
    phase,
    command: cmd,
    exitCode: result.status,
    timedOut: result.error?.code === 'ETIMEDOUT',
    error: result.error && result.error.code !== 'ETIMEDOUT' ? String(result.error.message) : undefined,
    durationMs: Date.now() - started,
    fingerprint,
    scrubbedEnv: scrub,
    approval,
    log,
    at: new Date().toISOString(),
  }
  checks.runs.push(run)
  writeJson(file(workRoot), checks)
  return { run, tail: output.trimEnd().split('\n').slice(-40).join('\n') }
}

export function recordNoChecks(workRoot, reason) {
  const checks = loadChecks(workRoot)
  checks.none = { reason, at: new Date().toISOString() }
  writeJson(file(workRoot), checks)
}

function latest(runs, phase) {
  const byCommand = new Map()
  for (const r of runs) if (r.phase === phase) byCommand.set(r.command, r)
  return byCommand
}

/** Summary per command: baseline and final exit codes. */
export function checkTable(checks) {
  const base = latest(checks.runs, 'baseline')
  const fin = latest(checks.runs, 'final')
  return [...base.keys()].map((command) => ({ command, baseline: base.get(command), final: fin.get(command) }))
}

/** Problems that keep the export from being trustworthy, as findings. */
export function checkFindings(checks, currentFingerprint, findingId) {
  const out = []
  const add = (rule, command, value) =>
    out.push({ id: findingId(rule, 'checks', command), rule, severity: 'block', file: 'checks', line: 0, value })
  const table = checkTable(checks)
  if (!table.length && !checks.none) {
    add('checks-missing', '-', 'no baseline check recorded: run "check <workRoot> baseline <command>" or "check <workRoot> baseline --none <reason>"')
  }
  for (const { command, baseline, final } of table) {
    if (!final) add('final-check-missing', command, `run "check <workRoot> final ${command}"`)
    else if (final.fingerprint !== currentFingerprint) add('final-check-stale', command, 'files changed after this run: run it again')
    else if (baseline.exitCode === 0 && final.exitCode !== 0) add('check-regression', command, `passed before cleaning, fails now (exit ${final.exitCode})`)
  }
  return out
}
