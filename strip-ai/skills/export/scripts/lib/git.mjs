import { execFileSync } from 'node:child_process'

export function git(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 1 << 30,
    stdio: ['ignore', 'pipe', 'pipe'],
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

/** Tracked plus untracked files that .gitignore does not exclude, relative to `dir`. */
export function listFiles(dir) {
  const out = git(dir, ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', '.'])
  return [...new Set(out.split('\0').filter(Boolean))]
}

/** Untracked files that .gitignore excludes, relative to `dir`. */
export function listIgnoredFiles(dir) {
  const out = git(dir, ['ls-files', '--others', '--ignored', '--exclude-standard', '-z', '--', '.'])
  return out.split('\0').filter(Boolean)
}

/** Tracked files with the executable bit, so the zip keeps hooks runnable even when exported from Windows. */
export function executableFiles(dir) {
  const out = git(dir, ['ls-files', '--stage', '-z', '--', '.'])
  const result = []
  for (const entry of out.split('\0').filter(Boolean)) {
    const tab = entry.indexOf('\t')
    if (entry.startsWith('100755')) result.push(entry.slice(tab + 1))
  }
  return result
}
