// Who the project's people are (commit authors, co-authors, git config, remote
// owners, OS user, package.json, CODEOWNERS) and how their names, handles,
// emails and personal domains are spotted and replaced.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { tryGit } from './git.mjs'
import { GENERIC_USERS } from './rules.mjs'

// Words that are names of nothing in particular: as a handle or one-word
// name they would redact half the codebase (a username "code" or "work").
export const COMMON_WORDS = new Set(`
  about access account admin agent alpha android api app apps archive assets auth author backend base beta
  bin blog bot build cache client cloud code config console contact core data database debug default demo
  design desktop dev devel developer docs domain draft email engine example feature files fix frontend
  github gitlab guest hello help home host index info init internal intern lab laptop legacy lib library
  linux local login mac macbook main mail master media mobile model module new node office old open owner
  page personal play plugin portal private project prod production public python react release repo root
  sandbox school script server service setup shared site source spike src staff stage staging start
  static studio support system team temp template test tester tmp tool tools ubuntu user users web
  website windows work workspace www
  casa codigo dados desenvolvedor exemplo projeto servidor sistema teste trabalho usuario
`.split(/\s+/).filter(Boolean))

const SYSTEM_NAMES = /^(github|gitlab|bitbucket|gitea|forgejo|web-flow|github enterprise|azure devops|unknown|anonymous|nobody|root|admin|administrator|user|developer|dev|author|owner|your name|your full name|full name|first last|name|test|test user|tester|me|ci|build|automation|system|default)$/i
const SYSTEM_EMAILS = new Set(['noreply@github.com', 'noreply@gitlab.com', 'you@example.com', 'your.email@example.com', 'email@example.com'])
const BOT_PATTERN = /bot\b|\[bot\]|dependabot|renovate|github-actions|actions@github|claude|copilot|anthropic|openai|cursor|gpt|gemini|codex/i

// Mailbox providers: their domains say nothing about who the owner is.
const PUBLIC_MAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'yahoo.com',
  'yahoo.com.br', 'icloud.com', 'me.com', 'mac.com', 'proton.me', 'protonmail.com', 'pm.me', 'aol.com',
  'gmx.com', 'gmx.net', 'yandex.com', 'zoho.com', 'hey.com', 'fastmail.com', 'uol.com.br', 'bol.com.br',
  'terra.com.br', 'ig.com.br', 'users.noreply.github.com', 'users.noreply.gitlab.com',
])

const COMBINING = /[\u0300-\u036f]/g

export function foldAccents(s) {
  return s.normalize('NFD').replace(COMBINING, '')
}

/**
 * Accent-free copy of `text` plus, for each of its characters, the index of
 * the original character it came from. Matching runs on the copy (so
 * "María" and "Maria" are the same name); replacing uses the map, so the
 * original text around a match is kept exactly.
 */
export function foldWithMap(text) {
  let out = ''
  const map = []
  for (let i = 0; i < text.length; ) {
    const ch = String.fromCodePoint(text.codePointAt(i))
    const folded = ch.normalize('NFD').replace(COMBINING, '')
    for (let k = 0; k < folded.length; k++) {
      out += folded[k]
      map.push(i)
    }
    i += ch.length
  }
  map.push(text.length)
  return { out, map }
}

function originalRange(text, map, start, end) {
  let to = map[end]
  while (to < text.length && /[\u0300-\u036f]/.test(text[to])) to++ // a decomposed accent belongs to the match
  return [map[start], to]
}

export function emptyIdentity() {
  return { version: 1, mode: 'own', names: [], emails: [], handles: [], domains: [], literals: [], dropped: [], operator: { names: [], emails: [], handles: [] }, remoteOwners: [] }
}

/** Domains of the owner's own mailboxes, as in me@maria-silva.dev. Public providers are skipped. */
export function personalDomains(emails) {
  return [...new Set(emails.map((e) => e.slice(e.lastIndexOf('@') + 1).toLowerCase()))].filter(
    (d) => d.includes('.') && !PUBLIC_MAIL_DOMAINS.has(d) && !d.endsWith('.local') && !d.endsWith('.invalid'),
  )
}

function parsePerson(text) {
  const m = /^\s*([^<(]*?)\s*(?:<([^>]+)>)?\s*(?:\(.*\))?\s*$/.exec(text)
  return m ? { name: m[1], email: m[2] } : {}
}

/** The person running the export: their global git identity and OS user. */
export function readOperator() {
  const home = os.homedir()
  return {
    name: tryGit(home, ['config', '--global', 'user.name'])?.trim(),
    email: tryGit(home, ['config', '--global', 'user.email'])?.trim(),
    osUser: os.userInfo().username,
  }
}

function collector() {
  const c = { names: new Set(), emails: new Set(), handles: new Set(), dropped: [] }
  c.addName = (raw, { singleWord = true } = {}) => {
    const name = (raw ?? '').trim().replace(/\s+/g, ' ')
    if (!name) return
    if (name.length < 4) return c.dropped.push({ kind: 'name', value: name, reason: 'shorter than 4 characters' })
    if (SYSTEM_NAMES.test(name)) return c.dropped.push({ kind: 'name', value: name, reason: 'system or placeholder account' })
    if (!name.includes(' ')) {
      if (COMMON_WORDS.has(name.toLowerCase())) return c.dropped.push({ kind: 'name', value: name, reason: 'common word' })
      if (!singleWord) return c.dropped.push({ kind: 'name', value: name, reason: 'single-word contributor name (only full names are matched)' })
    }
    c.names.add(name)
  }
  c.addHandle = (raw) => {
    const handle = (raw ?? '').trim()
    if (!handle) return
    if (handle.length < 4) return c.dropped.push({ kind: 'handle', value: handle, reason: 'shorter than 4 characters' })
    const lower = handle.toLowerCase()
    if (COMMON_WORDS.has(lower) || GENERIC_USERS.has(lower)) return c.dropped.push({ kind: 'handle', value: handle, reason: 'common word' })
    c.handles.add(handle)
  }
  c.addPerson = (name, email, options) => {
    if (BOT_PATTERN.test(`${name ?? ''} ${email ?? ''}`)) return
    c.addName(name, options)
    const e = (email ?? '').trim().toLowerCase()
    if (!e || SYSTEM_EMAILS.has(e) || !e.includes('@')) return
    c.emails.add(e)
    const gh = /^(?:\d+\+)?([^@]+)@users\.noreply\.(?:github|gitlab)\.com$/.exec(e)
    if (gh) c.addHandle(gh[1])
  }
  return c
}

/** People recorded in the project: commit authors, co-authors, package.json, CODEOWNERS. */
function projectPeople(sourceDir, options) {
  const c = collector()
  const log = tryGit(sourceDir, ['log', '--all', '--format=%an%x00%ae%x00%cn%x00%ce'])
  for (const line of (log ?? '').split('\n').filter(Boolean)) {
    const [an, ae, cn, ce] = line.split('\0')
    c.addPerson(an, ae, options)
    c.addPerson(cn, ce, options)
  }
  const trailers = tryGit(sourceDir, ['log', '--all', '--format=%(trailers:key=Co-authored-by,key=Signed-off-by,valueonly)'])
  for (const line of (trailers ?? '').split('\n').filter(Boolean)) {
    const p = parsePerson(line)
    c.addPerson(p.name, p.email, options)
  }
  const pkgPath = path.join(sourceDir, 'package.json')
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
      for (const a of [pkg.author, ...(pkg.contributors ?? []), ...(pkg.maintainers ?? [])].filter(Boolean)) {
        const p = typeof a === 'string' ? parsePerson(a) : a
        c.addPerson(p.name, p.email, options)
      }
    } catch {
      // A malformed package.json is reported by the project's own tooling.
    }
  }
  for (const rel of ['CODEOWNERS', '.github/CODEOWNERS', 'docs/CODEOWNERS', '.gitlab/CODEOWNERS']) {
    const file = path.join(sourceDir, rel)
    if (!fs.existsSync(file)) continue
    const text = fs.readFileSync(file, 'utf8')
    for (const m of text.matchAll(/(?<![\w/])@([A-Za-z0-9-]+)(?![\w/])/g)) c.addHandle(m[1])
    for (const m of text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) c.addPerson(undefined, m[0], options)
  }
  return c
}

function remoteOwners(sourceDir) {
  const remotes = tryGit(sourceDir, ['remote', '-v']) ?? ''
  return [...new Set([...remotes.matchAll(/(?:github\.com|gitlab\.com|bitbucket\.org)[:/]([A-Za-z0-9_.-]+)\//g)].map((m) => m[1]))]
}

/**
 * Own project: everyone recorded in it is matched in every spelling, and the
 * remote owner is a person. Third-party project (the operator is not among
 * its authors): contributors are matched by full name and email only, the
 * remote owner (often an organization) is only listed in the inventory, and
 * only the operator's own identity is searched piece by piece.
 */
export function collectIdentities(sourceDir, { mode = 'auto', operator = readOperator() } = {}) {
  const local = { name: tryGit(sourceDir, ['config', 'user.name'])?.trim(), email: tryGit(sourceDir, ['config', 'user.email'])?.trim() }
  const op = collector()
  op.addPerson(operator.name, operator.email)
  op.addPerson(local.name, local.email)
  if (operator.osUser) op.addHandle(operator.osUser)

  const probe = projectPeople(sourceDir, {})
  const authorEmails = probe.emails
  const authorNames = new Set([...probe.names].map((n) => n.toLowerCase()))
  const isAuthor = [...op.emails].some((e) => authorEmails.has(e)) || [...op.names].some((n) => authorNames.has(n.toLowerCase()))
  const resolved = mode === 'auto' ? (isAuthor ? 'own' : 'third-party') : mode
  const people = resolved === 'own' ? probe : projectPeople(sourceDir, { singleWord: false })
  const owners = remoteOwners(sourceDir)
  if (resolved === 'own') owners.forEach((o) => people.addHandle(o))

  const names = [...new Set([...op.names, ...people.names])]
  const emails = [...new Set([...op.emails, ...people.emails])]
  const handles = [...new Set([...op.handles, ...people.handles])]
  const dropped = [...op.dropped, ...people.dropped]
  const seen = new Set()
  return {
    ...emptyIdentity(),
    mode: resolved,
    modeReason: mode !== 'auto' ? 'chosen explicitly' : isAuthor ? 'you are one of its commit authors' : 'you are not among its commit authors',
    names,
    emails,
    handles,
    // A contributor's work email domain (google.com) is not personal; only the operator's own domains are.
    domains: personalDomains(resolved === 'own' ? emails : [...op.emails]),
    operator: { names: [...op.names], emails: [...op.emails], handles: [...op.handles] },
    remoteOwners: resolved === 'own' ? [] : owners,
    dropped: dropped.filter((d) => !seen.has(`${d.kind}\0${d.value}`) && seen.add(`${d.kind}\0${d.value}`)),
  }
}

/** Words in a text, split at punctuation and at camelCase, lowercased and accent-free. */
export function wordsOf(text) {
  return foldAccents(text).match(/[A-Z]?[a-z]+|[A-Z]+(?![a-z])|\d+/g)?.map((w) => w.toLowerCase()) ?? []
}

/**
 * Third-party projects can list thousands of contributors. Only those whose
 * every name token (or handle) occurs somewhere in the files are kept: the
 * others cannot be matched anyway, and dropping them keeps scans fast.
 */
export function keepSeenPeople(identity, words) {
  if (identity.mode !== 'third-party') return identity
  const operatorNames = new Set(identity.operator.names)
  const operatorHandles = new Set(identity.operator.handles)
  const seenName = (n) => operatorNames.has(n) || wordsOf(n).every((t) => words.has(t))
  const seenHandle = (h) => operatorHandles.has(h) || words.has(h.toLowerCase().replace(/[-_.]/g, '')) || wordsOf(h).every((t) => words.has(t))
  const names = identity.names.filter(seenName)
  const handles = identity.handles.filter(seenHandle)
  return { ...identity, names, handles, unseen: identity.names.length - names.length + identity.handles.length - handles.length }
}

/**
 * Each piece of an identity on its own (first name, surname, handle parts,
 * joined handle, email local parts, domain labels). The audit searches these
 * to find spellings the redaction rules did not know, like a surname inside
 * a domain.
 */
export function identityTokens(identity) {
  // In a third-party project only the operator is searched piece by piece:
  // contributors' first names (Mark) would hit ordinary words (markdown).
  if (identity.mode === 'third-party' && identity.operator) {
    return identityTokens({ ...emptyIdentity(), ...identity.operator, domains: identity.domains })
  }
  const tokens = new Set()
  const addParts = (s) => {
    for (const base of new Set([s.toLowerCase(), foldAccents(s.toLowerCase())])) {
      for (const t of base.split(/[^a-z0-9\u00c0-\u024f]+/)) if (t.length >= 4 && !COMMON_WORDS.has(t)) tokens.add(t)
    }
  }
  identity.names.forEach(addParts)
  for (const h of identity.handles) {
    addParts(h)
    const joined = foldAccents(h.toLowerCase()).replace(/[-_.]/g, '')
    if (joined.length >= 4 && !COMMON_WORDS.has(joined)) tokens.add(joined)
  }
  identity.emails.forEach((e) => addParts(e.slice(0, e.lastIndexOf('@'))))
  for (const d of identity.domains) addParts(d.slice(0, d.lastIndexOf('.')))
  return [...tokens].sort()
}

const FIRST = ['Jane', 'John', 'Alex', 'Sam', 'Kim', 'Pat', 'Lee', 'Max', 'Ray', 'Ann', 'Eve', 'Ted']
const LAST = ['Doe', 'Roe', 'Poe', 'Moe', 'Loe', 'Coe', 'Hoe', 'Zoe']

/** Keeps the casing style of the matched text: all lower, all upper, or as written. */
export function matchCase(match, placeholder) {
  if (match === match.toLowerCase()) return placeholder.toLowerCase()
  if (match === match.toUpperCase()) return placeholder.toUpperCase()
  return placeholder
}

/**
 * Literal spellings to replace, each with its placeholder. A placeholder is
 * never one that already occurs in the project (`isUsed`), so an owner's
 * name never collides with an existing "Jane Doe" fixture, and two people
 * never share one.
 */
export function identityRules(identity, isUsed = () => false) {
  const rules = []
  const tokens = identityTokens(identity)
  const taken = new Set()
  const usable = (p) => {
    const lower = p.toLowerCase()
    return !taken.has(lower) && !isUsed(lower) && !tokens.some((t) => lower.includes(t))
  }
  const add = (literal, placeholder, kind, loose = false) => {
    if (literal && literal.length >= 3) rules.push({ literal, placeholder, kind, loose })
  }
  const pairs = FIRST.flatMap((f) => LAST.map((l) => [f, l]))

  identity.names.forEach((name, index) => {
    const pair = pairs.find(([f, l]) => [`${f} ${l}`, `${f}${l}`, `${f}-${l}`, `${f}_${l}`, `${f}.${l}`].every(usable))
    const [f, l] = pair ?? [`Person${index + 1}`, 'Doe']
    for (const v of [`${f} ${l}`, `${f}${l}`, `${f}-${l}`, `${f}_${l}`, `${f}.${l}`]) taken.add(v.toLowerCase())
    for (const base of new Set([name, foldAccents(name)])) {
      const t = base.split(/\s+/).filter(Boolean)
      if (t.length === 1) {
        add(base, f, 'name')
        continue
      }
      const variants = [t]
      if (t.length > 2) variants.push([t[0], t[t.length - 1]]) // "Maria A. B. Silva" also as "Maria Silva"
      for (const v of variants) {
        add(v.join(' '), `${f} ${l}`, 'name')
        const joined = v.join('')
        add(joined, `${f}${l}`, 'name', joined.length >= 10)
        add(v.join('-'), `${f}-${l}`, 'name')
        add(v.join('_'), `${f}_${l}`, 'name')
        add(v.join('.'), `${f}.${l}`, 'name')
      }
    }
  })

  const handlePlaceholders = ['example-user', ...Array.from({ length: 98 }, (_, i) => `example-user-${i + 2}`)]
  identity.handles.forEach((handle, index) => {
    const ph = handlePlaceholders.find((p) => usable(p) && usable(p.replace(/-/g, ''))) ?? `example-user-x${index}`
    taken.add(ph)
    taken.add(ph.replace(/-/g, ''))
    for (const base of new Set([handle, foldAccents(handle)])) {
      add(base, ph, 'handle')
      // the-almeida also shows up as thealmeida (a personal domain, a bucket name).
      const joined = base.replace(/[-_.]/g, '')
      if (joined !== base && joined.length >= 6) add(joined, ph.replace(/-/g, ''), 'handle', joined.length >= 10)
    }
  })

  const domainPlaceholders = ['personal-site.example', ...Array.from({ length: 98 }, (_, i) => `personal-site-${i + 2}.example`)]
  identity.domains.forEach((domain, index) => {
    const ph = domainPlaceholders.find(usable) ?? `personal-site-x${index}.example`
    taken.add(ph)
    add(domain, ph, 'domain')
  })
  for (const { value, placeholder } of identity.literals) add(value, placeholder || 'REDACTED', 'literal')

  const seen = new Set()
  return rules
    .filter((r) => !seen.has(r.literal.toLowerCase()) && seen.add(r.literal.toLowerCase()))
    .sort((a, b) => b.literal.length - a.literal.length)
}

/** Every placeholder identityRules could hand out, so the caller can check which ones the project already uses. */
export function placeholderCandidates() {
  const out = new Set()
  for (const f of FIRST) {
    for (const l of LAST) for (const v of [`${f} ${l}`, `${f}${l}`, `${f}-${l}`, `${f}_${l}`, `${f}.${l}`]) out.add(v.toLowerCase())
  }
  out.add('example-user').add('exampleuser').add('personal-site.example')
  for (let i = 2; i <= 99; i++) out.add(`example-user-${i}`).add(`exampleuser${i}`).add(`personal-site-${i}.example`)
  return [...out]
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * One combined regex for every spelling, so a repo with hundreds of
 * contributors is scanned in one pass per file. Boundaries are letters and
 * digits only: "maria-silva-portfolio" and "maria_silva_cv" still match.
 */
export function createIdentityMatcher(rules) {
  const key = (s) => foldAccents(s).toLowerCase()
  const byKey = new Map()
  for (const r of rules) if (!byKey.has(key(r.literal))) byKey.set(key(r.literal), r)
  const unique = [...byKey.values()].sort((a, b) => b.literal.length - a.literal.length)
  const strict = unique.filter((r) => !r.loose).map((r) => escapeRegExp(foldAccents(r.literal)))
  const loose = unique.filter((r) => r.loose).map((r) => escapeRegExp(foldAccents(r.literal)))
  const parts = []
  if (strict.length) parts.push(`(?<![A-Za-z0-9])(?:${strict.join('|')})(?![A-Za-z0-9])`)
  if (loose.length) parts.push(`(?:${loose.join('|')})`)
  const source = parts.join('|')
  const regex = () => new RegExp(source, 'gi')
  const matches = (text) => {
    if (!parts.length) return []
    const { out, map } = foldWithMap(text)
    return [...out.matchAll(regex())].map((m) => {
      const [start, end] = originalRange(text, map, m.index, m.index + m[0].length)
      return { index: start, end, text: text.slice(start, end), rule: byKey.get(m[0].toLowerCase()) }
    })
  }
  return {
    empty: parts.length === 0,
    rules: unique,
    find: matches,
    test: (text) => parts.length > 0 && regex().test(foldAccents(text)),
    replace(text, onMatch) {
      const found = matches(text)
      if (!found.length) return text
      let out = ''
      let last = 0
      for (const m of found) {
        out += text.slice(last, m.index) + onMatch(m.text, m.rule)
        last = m.end
      }
      return out + text.slice(last)
    },
  }
}
