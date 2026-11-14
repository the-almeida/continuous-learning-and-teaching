// Collects who owns the source project (commit authors, git config, remote
// owners, OS user, package.json author) so their names, handles and emails
// can be found and redacted anywhere in the export.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { tryGit } from './git.mjs'
import { GENERIC_USERS } from './rules.mjs'

const BOT_PATTERN = /bot\b|\[bot\]|dependabot|renovate|github-actions|actions@github|claude|copilot|anthropic|openai|cursor|gpt|gemini|codex/i

export function collectIdentities(sourceDir) {
  const names = new Set()
  const emails = new Set()
  const handles = new Set()

  const addPerson = (name, email) => {
    if (BOT_PATTERN.test(`${name ?? ''} ${email ?? ''}`)) return
    if (name && name.trim().length >= 4) names.add(name.trim())
    if (email) {
      emails.add(email.trim().toLowerCase())
      const gh = /^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/i.exec(email.trim())
      if (gh) handles.add(gh[1])
    }
  }

  const log = tryGit(sourceDir, ['log', '--format=%an%x00%ae%x00%cn%x00%ce'])
  for (const line of (log ?? '').split('\n').filter(Boolean)) {
    const [an, ae, cn, ce] = line.split('\0')
    addPerson(an, ae)
    addPerson(cn, ce)
  }
  addPerson(tryGit(sourceDir, ['config', 'user.name'])?.trim(), tryGit(sourceDir, ['config', 'user.email'])?.trim())

  const remotes = tryGit(sourceDir, ['remote', '-v']) ?? ''
  for (const m of remotes.matchAll(/(?:github\.com|gitlab\.com|bitbucket\.org)[:/]([A-Za-z0-9_.-]+)\//g)) {
    handles.add(m[1])
  }

  const osUser = os.userInfo().username
  if (osUser && !GENERIC_USERS.has(osUser.toLowerCase())) handles.add(osUser)

  const pkgPath = path.join(sourceDir, 'package.json')
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
      const authors = [pkg.author, ...(pkg.contributors ?? [])].filter(Boolean)
      for (const a of authors) {
        if (typeof a === 'string') {
          const m = /^([^<(]+?)\s*(?:<([^>]+)>)?\s*(?:\(.*\))?$/.exec(a)
          if (m) addPerson(m[1], m[2])
        } else addPerson(a.name, a.email)
      }
    } catch {
      // Malformed package.json is reported by the project's own tooling.
    }
  }

  for (const h of [...handles]) if (h.length < 3 || GENERIC_USERS.has(h.toLowerCase())) handles.delete(h)
  return { names: [...names], emails: [...emails], handles: [...handles] }
}

const PLACEHOLDER_NAMES = [
  ['Jane', 'Doe'], ['John', 'Roe'], ['Alex', 'Poe'], ['Sam', 'Moe'], ['Kim', 'Loe'],
]

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Keeps the casing style of the matched text: all lower, all upper, or as written. */
function matchCase(match, placeholder) {
  if (match === match.toLowerCase()) return placeholder.toLowerCase()
  if (match === match.toUpperCase()) return placeholder.toUpperCase()
  return placeholder
}

/**
 * One pattern per spelling of the owner's names and handles, each with the
 * placeholder it is redacted to. Scan and redact share this list so a finding
 * always has a matching replacement. The concatenated spelling of a full name
 * (JaneDoe) also matches inside words, as in cvJaneDoe.pdf.
 */
export function identityPatterns(identity) {
  const patterns = []
  const add = (literal, placeholder, loose) => {
    const body = escapeRegExp(literal)
    const re = new RegExp(loose ? body : `(?<![A-Za-z0-9-])${body}(?![A-Za-z0-9-])`, 'gi')
    patterns.push({ literal, re, replace: (m) => matchCase(m, placeholder) })
  }
  identity.names.forEach((name, i) => {
    const tokens = name.split(/\s+/).filter(Boolean)
    const [first, last] = PLACEHOLDER_NAMES[i] ?? [`Person${i + 1}`, 'Doe']
    add(name, `${first} ${last}`, false)
    if (tokens.length >= 2) {
      const joined = tokens.join('')
      add(joined, `${first}${last}`, joined.length >= 10)
      add(tokens.join('-'), `${first}-${last}`, false)
      add(tokens.join('_'), `${first}_${last}`, false)
    }
  })
  identity.handles.forEach((handle, i) => add(handle, i === 0 ? 'example-user' : `example-user-${i + 1}`, false))
  // Longest literals first, so a full name wins over a handle it contains.
  return patterns.sort((a, b) => b.literal.length - a.literal.length)
}
