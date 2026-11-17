import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

// A repository received as an archive can carry its own .git/config, and
// core.fsmonitor there runs a command on every status or ls-files. It is
// switched off for every call.
const SAFE = ['-c', 'core.fsmonitor=false']

export function git(cwd, args, options = {}) {
  return execFileSync('git', [...SAFE, ...args], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 1 << 30,
    stdio: ['pipe', 'pipe', 'pipe'],
    ...options,
  })
}

export function tryGit(cwd, args) {
  try {
    return git(cwd, args)
  } catch {
    return null
  }
}

export function isGitRepo(dir) {
  return tryGit(dir, ['rev-parse', '--is-inside-work-tree'])?.trim() === 'true'
}

export function isShallow(dir) {
  return tryGit(dir, ['rev-parse', '--is-shallow-repository'])?.trim() === 'true'
}

function nulList(out) {
  return out.split('\0').filter(Boolean)
}

/**
 * Tracked files (including ones that match .gitignore, like a force-added
 * .env.development) and untracked files that .gitignore does not exclude.
 */
export function listSourceFiles(dir) {
  return {
    tracked: [...new Set(nulList(git(dir, ['ls-files', '--cached', '-z', '--', '.'])))],
    untracked: nulList(git(dir, ['ls-files', '--others', '--exclude-standard', '-z', '--', '.'])),
  }
}

/** Index mode per path: 100644, 100755 (executable), 120000 (symlink), 160000 (submodule). */
export function indexModes(dir) {
  const modes = new Map()
  for (const entry of nulList(git(dir, ['ls-files', '--stage', '-z', '--', '.']))) {
    const tab = entry.indexOf('\t')
    modes.set(entry.slice(tab + 1), entry.slice(0, 6))
  }
  return modes
}

/**
 * Paths whose working-tree copy has CRLF only because of a Windows checkout
 * (core.autocrlf): git stores them with LF and no attribute asks for CRLF.
 */
export function autocrlfPaths(dir) {
  const out = tryGit(dir, ['ls-files', '--eol', '-z', '--', '.'])
  const paths = new Set()
  for (const entry of nulList(out ?? '')) {
    const tab = entry.indexOf('\t')
    const info = entry.slice(0, tab)
    if (/\bi\/lf\b/.test(info) && /\bw\/crlf\b/.test(info) && !/eol=crlf/.test(info)) paths.add(entry.slice(tab + 1))
  }
  return paths
}

export function listIgnoredFiles(dir) {
  return nulList(git(dir, ['ls-files', '--others', '--ignored', '--exclude-standard', '-z', '--', '.']))
}

/**
 * Git for the private repo inside the work dir. It ignores the user's global
 * and system config, so their hooks, LFS filters, autocrlf and identity never
 * run or leak into it.
 */
export function workGit(workRoot, workDir, args, options = {}) {
  const config = path.join(workRoot, 'gitconfig')
  const hooks = path.join(workRoot, 'no-hooks')
  if (!fs.existsSync(config)) fs.writeFileSync(config, '')
  fs.mkdirSync(hooks, { recursive: true })
  const pinned = [
    '-c', `core.hooksPath=${hooks}`, '-c', 'core.autocrlf=false', '-c', 'core.safecrlf=false',
    '-c', 'core.quotepath=false', '-c', 'user.name=strip-ai', '-c', 'user.email=strip-ai@example.invalid',
    '-c', 'commit.gpgsign=false', '-c', 'init.defaultBranch=main', '-c', 'gc.auto=0',
  ]
  return git(workDir, [...pinned, ...args], {
    ...options,
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: config, GIT_TERMINAL_PROMPT: '0' },
  })
}
