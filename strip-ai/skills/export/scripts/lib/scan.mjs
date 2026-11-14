// Finds AI references, PII and secrets. Every finding has a stable id (rule,
// file and the matched value or line), so a decision about it survives line
// shifts. Values are masked, so anything built from findings never leaks
// what it describes.
//
// severity: 'block' (must be fixed, or allowed with a reason), 'review'
// (needs a decision), 'clean' (AI reference to clean or keep with a reason),
// 'fixture' (kept, informational only).
import fs from 'node:fs'
import path from 'node:path'
import { MAX_SCAN_BYTES, isBinary, native, sha256 } from './files.mjs'
import { documentText, isDocument, isPlaceholder, personalDataReasons } from './documents.mjs'
import { stripImageMetadata } from './images.mjs'
import { findLeaks, findTokens } from './leaks.mjs'
import {
  AI_TEXT_RULES, CARD_RE, CNPJ_RE, CPF_RE, EMAIL_RE, GENERIC_SECRET_RE, GENERIC_USERS, HOME_PATH_RE, IBAN_RE,
  IPV4_RE, LOCKFILES, PHONE_RES, SECRET_ASSIGNMENT_RE, SECRET_RULES, SSN_RE, URL_CREDENTIALS_RE, aiPathTerm,
  aiPathToRemove, classifyEmail, isEnvFile, isFixtureUrlCredential, isPublicIp, isPublishedExample, isRealCard,
  isRealCnpj, isRealCpf, isRealIban, isRealSsn, isUrlCredentialContext, looksLikeRealSecret, mask,
} from './rules.mjs'

// Image formats that can carry EXIF/XMP but that the script does not rewrite.
const UNSTRIPPED_IMAGES = /\.(webp|heic|heif|avif|tiff?|gif|jxl)$/i

export function findingId(rule, file, key) {
  return 'f' + sha256(`${rule}\0${file}\0${String(key).toLowerCase()}`).slice(0, 10)
}

function lineIndex(text) {
  const starts = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1)
  return (offset) => {
    let lo = 0
    let hi = starts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (starts[mid] <= offset) lo = mid
      else hi = mid - 1
    }
    return lo + 1
  }
}

function lineAt(text, index) {
  const start = text.lastIndexOf('\n', index) + 1
  const end = text.indexOf('\n', index)
  return text.slice(start, end === -1 ? undefined : end)
}

/** Rules for the project's own AI command, skill and agent names (/wc-tdd, @reviewer). */
export function aiNameRules(aiNames = []) {
  return aiNames.map((name) => ({
    id: 'ai-command',
    re: new RegExp(`(?<![A-Za-z0-9-])[/@]${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9])`, 'g'),
  }))
}

/** Masks emails and identity spellings inside an excerpt shown for an AI reference. */
function maskExcerpt(line, ctx) {
  let out = line.replace(EMAIL_RE, (m) => mask(m))
  out = ctx.matcher.replace(out, (m) => mask(m))
  return out.trim().slice(0, 160)
}

/**
 * ctx: { matcher, aiNames, originals (lowercased raw values already
 * redacted), tokens (identity pieces) }
 */
export function scanText(relPath, text, ctx) {
  const findings = []
  const at = lineIndex(text)
  const base = path.posix.basename(relPath).toLowerCase()
  const lockfile = LOCKFILES.has(base)
  const add = (rule, severity, index, raw, shown = mask(raw)) =>
    findings.push({ id: findingId(rule, relPath, raw), rule, severity, file: relPath, line: at(index), value: shown })

  if (!lockfile) {
    for (const { id, re } of [...AI_TEXT_RULES, ...aiNameRules(ctx.aiNames)]) {
      for (const m of text.matchAll(re)) {
        const line = lineAt(text, m.index)
        findings.push({ id: findingId(id, relPath, line.trim()), rule: id, severity: 'clean', file: relPath, line: at(m.index), value: maskExcerpt(line, ctx) })
      }
    }
  }

  for (const { id, re } of SECRET_RULES) {
    for (const m of text.matchAll(re)) add(id, isPublishedExample(m[0]) ? 'fixture' : 'block', m.index, m[0])
  }
  for (const m of text.matchAll(URL_CREDENTIALS_RE)) {
    add('url-credentials', isFixtureUrlCredential(m[3], m[4]) ? 'fixture' : 'block', m.index, m[3])
  }
  for (const m of ctx.matcher.find(text)) add('identity', 'block', m.index, m.text)

  if (!lockfile) {
    for (const m of text.matchAll(EMAIL_RE)) {
      if (isUrlCredentialContext(text, m.index)) continue
      const kind = classifyEmail(m[0])
      if (kind === 'real') add('email', 'block', m.index, m[0])
      else if (kind === 'fixture') add('email', 'fixture', m.index, m[0])
    }
    for (const m of text.matchAll(CPF_RE)) if (isRealCpf(m[0])) add('cpf', 'block', m.index, m[0])
    for (const m of text.matchAll(CNPJ_RE)) if (isRealCnpj(m[0])) add('cnpj', 'block', m.index, m[0])
    for (const m of text.matchAll(HOME_PATH_RE)) {
      if (!GENERIC_USERS.has(m[2].toLowerCase())) add('home-path', 'block', m.index, m[0])
    }
    for (const re of PHONE_RES) for (const m of text.matchAll(re)) add('phone', 'review', m.index, m[0])
    if (!base.endsWith('.svg')) {
      for (const m of text.matchAll(IPV4_RE)) if (isPublicIp(m.slice(1, 5))) add('public-ip', 'review', m.index, m[0])
    }
    for (const m of text.matchAll(GENERIC_SECRET_RE)) if (looksLikeRealSecret(m[2])) add('generic-secret', 'review', m.index, m[2])
    for (const m of text.matchAll(SECRET_ASSIGNMENT_RE)) if (looksLikeRealSecret(m[2])) add('generic-secret', 'review', m.index, m[2])
    for (const m of text.matchAll(CARD_RE)) if (isRealCard(m[0])) add('card-number', 'review', m.index, m[0])
    for (const m of text.matchAll(IBAN_RE)) if (isRealIban(m[0])) add('iban', 'review', m.index, m[0])
    for (const m of text.matchAll(SSN_RE)) if (isRealSsn(m[0])) add('ssn', 'review', m.index, m[0])
  }
  if (isEnvFile(base)) {
    // Any env file that would ship needs a look: templates are named .env.example.
    const assignment = /^\s*(?:export\s+)?[A-Za-z_][A-Za-z0-9_]*\s*=\s*\S+/m.exec(text)
    if (assignment) add('env-file', 'block', assignment.index, `env file with values: ${base}`, base)
  }
  return findings
}

export function scanPath(relPath, ctx) {
  const findings = []
  const add = (rule, severity, raw, shown) => findings.push({ id: findingId(rule, relPath, raw), rule, severity, file: relPath, line: 0, value: shown })
  if (aiPathToRemove(relPath)) add('ai-tooling-file', 'block', relPath, relPath)
  else {
    const term = aiPathTerm(relPath)
    if (term) add('ai-path', 'clean', term, `"${term}" in path`)
  }
  if (ctx.matcher.test(relPath)) add('identity-in-path', 'block', relPath, mask(relPath))
  return findings
}

/** Documents with personal data block the zip until replaced; the others need a look. */
export function scanDocument(relPath, buf, ctx) {
  if (isPlaceholder(relPath, buf)) return []
  const text = documentText(relPath, buf)
  const reasons = personalDataReasons(relPath, text, ctx.matcher)
  const finding = (rule, severity, value) => ({ id: findingId(rule, relPath, rule), rule, severity, file: relPath, line: 0, value })
  if (reasons.length) return [finding('document-with-pii', 'block', reasons.join(', '))]
  return [finding('document', 'review', text === null ? 'content not readable by the script' : 'no personal data detected by the script')]
}

function tokenFindings(relPath, buf, ctx, rule = 'identity-token') {
  return findTokens(relPath, buf, ctx.tokens).map(({ token, count }) => ({
    id: findingId(rule, relPath, token),
    rule,
    severity: 'review',
    file: relPath,
    line: 0,
    value: `${mask(token)} ×${count}`,
  }))
}

/**
 * Every file ends up in exactly one bucket, so nothing is skipped silently:
 * text (pattern rules), document (judged as a whole), image (metadata), other
 * binary (byte-level search for known values), symlink (target only), or too
 * large (reported).
 */
export function scanFile(workDir, relPath, ctx, { symlink = false } = {}) {
  const findings = scanPath(relPath, ctx)
  if (symlink) return findings
  const abs = native(workDir, relPath)
  const size = fs.statSync(abs).size
  if (size > MAX_SCAN_BYTES) {
    findings.push({ id: findingId('not-scanned', relPath, size), rule: 'not-scanned', severity: 'review', file: relPath, line: 0, value: `${Math.round(size / 1048576)} MB, over the scan limit` })
    return findings
  }
  const buf = fs.readFileSync(abs)
  const leakRule = isBinary(buf) ? 'known-value-in-binary' : 'redacted-value-left'
  const values = isBinary(buf) ? ctx.allValues : ctx.originals
  if (!isBinary(buf)) {
    findings.push(...scanText(relPath, buf.toString('utf8'), ctx))
    if (isDocument(relPath)) {
      findings.push({ id: findingId('document', relPath, 'text'), rule: 'document', severity: 'review', file: relPath, line: 0, value: 'text data file: check rows for personal data' })
    }
  } else {
    const docFindings = isDocument(relPath) ? scanDocument(relPath, buf, ctx) : []
    findings.push(...docFindings)
    const metadata = stripImageMetadata(buf)
    if (metadata?.removed.length) {
      findings.push({ id: findingId('image-metadata', relPath, 'metadata'), rule: 'image-metadata', severity: 'block', file: relPath, line: 0, value: metadata.removed.join(', ') })
    } else if (UNSTRIPPED_IMAGES.test(relPath)) {
      findings.push({ id: findingId('image-metadata-unchecked', relPath, 'format'), rule: 'image-metadata-unchecked', severity: 'review', file: relPath, line: 0, value: 'format whose metadata (EXIF, XMP) the script cannot strip' })
    }
    if (docFindings.some((f) => f.severity === 'block')) return findings
  }
  for (const leak of findLeaks(relPath, buf, values)) {
    findings.push({ id: findingId(leakRule, relPath, leak.value), rule: leakRule, severity: 'block', file: relPath, line: 0, value: `${leak.masked} in ${leak.where}` })
  }
  findings.push(...tokenFindings(relPath, buf, ctx))
  return findings
}

export function dedupe(findings) {
  const byId = new Map()
  for (const f of findings) {
    const existing = byId.get(f.id)
    if (existing) existing.count++
    else byId.set(f.id, { ...f, count: 1 })
  }
  return [...byId.values()]
}

export function scanTree(workDir, files, ctx, isSymlink = () => false) {
  const findings = []
  for (const rel of files) findings.push(...scanFile(workDir, rel, ctx, { symlink: isSymlink(rel) }))
  return dedupe(findings)
}
