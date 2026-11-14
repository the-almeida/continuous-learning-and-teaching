// Finds AI references, PII and secrets in the export. Findings carry masked
// values only, so reports built from them never leak what they describe.
import fs from 'node:fs'
import path from 'node:path'
import {
  AI_TEXT_RULES, CNPJ_RE, CPF_RE, EMAIL_RE, GENERIC_SECRET_RE,
  GENERIC_USERS, HOME_PATH_RE, IPV4_RE, LOCKFILES, PHONE_RES, SECRET_RULES, URL_CREDENTIALS_RE,
  classifyEmail, isEnvFile, isUrlCredentialContext, isFixtureUrlCredential, isPublicIp, isPublishedExample, isRealCnpj,
  isRealCpf, looksLikeRealSecret, mask,
} from './rules.mjs'
import { identityPatterns } from './identity.mjs'
import { documentText, isDocument, isPlaceholder, personalDataReasons } from './documents.mjs'
import { stripImageMetadata } from './images.mjs'
import { canaries, findLeaks } from './leaks.mjs'

export const MAX_SCAN_BYTES = 50 * 1024 * 1024

function isBinary(buf) {
  return buf.subarray(0, 8192).includes(0)
}

/** Text content, or null for binary files and files too large to scan. */
export function readText(absPath) {
  if (fs.statSync(absPath).size > MAX_SCAN_BYTES) return null
  const buf = fs.readFileSync(absPath)
  return isBinary(buf) ? null : buf.toString('utf8')
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

/**
 * severity: 'block' (must be gone before zipping), 'clean' (AI reference to
 * clean by judgment), 'review' (needs a human-style look), 'fixture' (kept).
 */
/** Rules for the project's own AI command, skill and agent names (/wc-tdd, @reviewer). */
export function aiNameRules(aiNames = []) {
  return aiNames.map((name) => ({
    id: 'ai-command',
    re: new RegExp(`(?<![A-Za-z0-9-])[/@]${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9])`, 'g'),
  }))
}

function excerpt(text, index) {
  const start = text.lastIndexOf('\n', index) + 1
  const end = text.indexOf('\n', index)
  return text.slice(start, end === -1 ? undefined : end).trim().slice(0, 160)
}

export function scanText(relPath, text, identity, aiNames = []) {
  const findings = []
  const at = lineIndex(text)
  const base = path.posix.basename(relPath).toLowerCase()
  const add = (rule, severity, index, value) =>
    findings.push({ file: relPath, line: at(index), rule, severity, value: mask(value) })

  if (!LOCKFILES.has(base)) {
    for (const { id, re } of [...AI_TEXT_RULES, ...aiNameRules(aiNames)]) {
      // AI references are not sensitive: show the line so it can be cleaned.
      for (const m of text.matchAll(re)) {
        findings.push({ file: relPath, line: at(m.index), rule: id, severity: 'clean', value: excerpt(text, m.index) })
      }
    }
  }

  for (const { id, re } of SECRET_RULES) {
    for (const m of text.matchAll(re)) add(id, isPublishedExample(m[0]) ? 'fixture' : 'block', m.index, m[0])
  }
  for (const m of text.matchAll(URL_CREDENTIALS_RE)) {
    add('url-credentials', isFixtureUrlCredential(m[3], m[4]) ? 'fixture' : 'block', m.index, m[3])
  }

  if (!LOCKFILES.has(base)) {
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
    for (const { re } of identityPatterns(identity)) {
      for (const m of text.matchAll(re)) add('identity', 'block', m.index, m[0])
    }
    for (const re of PHONE_RES) for (const m of text.matchAll(re)) add('phone', 'review', m.index, m[0])
    for (const m of base.endsWith('.svg') ? [] : text.matchAll(IPV4_RE)) {
      if (isPublicIp(m.slice(1, 5))) add('public-ip', 'review', m.index, m[0])
    }
    for (const m of text.matchAll(GENERIC_SECRET_RE)) {
      if (looksLikeRealSecret(m[2])) add('generic-secret', 'review', m.index, m[2])
    }
  }
  if (isEnvFile(base) && /^\s*[A-Za-z_][A-Za-z0-9_]*\s*=\s*\S+/m.test(text)) {
    add('env-file-with-values', 'review', 0, base)
  }
  return findings
}

/** Documents with personal data block the zip until replaced; the others get a human-style look. */
export function scanDocument(relPath, buf, identity) {
  if (isPlaceholder(relPath, buf)) return []
  const text = documentText(relPath, buf)
  const reasons = personalDataReasons(relPath, text, identity)
  if (reasons.length) return [{ file: relPath, line: 0, rule: 'document-with-pii', severity: 'block', value: reasons.join(', ') }]
  const note = text === null ? 'content not readable by the script' : 'no personal data detected by the script'
  return [{ file: relPath, line: 0, rule: 'document', severity: 'review', value: note }]
}

export function scanPath(relPath, identity) {
  const findings = []
  for (const { re } of identityPatterns(identity)) {
    if (re.test(relPath)) findings.push({ file: relPath, line: 0, rule: 'identity-in-path', severity: 'block', value: mask(relPath) })
  }
  return findings
}

/**
 * Every file ends up in exactly one bucket, so nothing is skipped silently:
 * text (pattern rules), document (judged as a whole), image (metadata),
 * other binary (byte-level search for known values), or too large (reported).
 * `originals` are the raw values an earlier redact replaced; any copy of one
 * that is still present, in any file type, blocks.
 */
export function scanTree(workDir, files, identity, aiNames = [], originals = []) {
  const findings = []
  const allValues = canaries(identity, originals)
  const originalValues = canaries({ names: [], emails: [], handles: [] }, originals)
  for (const rel of files) {
    const abs = path.join(workDir, ...rel.split('/'))
    findings.push(...scanPath(rel, identity))
    const size = fs.statSync(abs).size
    if (size > MAX_SCAN_BYTES) {
      findings.push({ file: rel, line: 0, rule: 'not-scanned', severity: 'review', value: `${Math.round(size / 1048576)} MB, over the scan limit` })
      continue
    }
    const buf = fs.readFileSync(abs)
    if (!isBinary(buf)) {
      const text = buf.toString('utf8')
      findings.push(...scanText(rel, text, identity, aiNames))
      for (const leak of findLeaks(rel, buf, originalValues)) {
        findings.push({ file: rel, line: 0, rule: 'redacted-value-left', severity: 'block', value: leak.value })
      }
      if (isDocument(rel)) {
        // Text data files (csv, tsv, vcf) were pattern-scanned above; names in rows need a look the rules cannot give.
        findings.push({ file: rel, line: 0, rule: 'document', severity: 'review', value: 'text data file: check rows for personal data' })
      }
      continue
    }
    const docFindings = isDocument(rel) ? scanDocument(rel, buf, identity) : []
    findings.push(...docFindings)
    const metadata = stripImageMetadata(buf)
    if (metadata?.removed.length) {
      findings.push({ file: rel, line: 0, rule: 'image-metadata', severity: 'block', value: metadata.removed.join(', ') })
    }
    if (!docFindings.some((f) => f.severity === 'block')) {
      for (const leak of findLeaks(rel, buf, allValues)) {
        findings.push({ file: rel, line: 0, rule: 'known-value-in-binary', severity: 'block', value: `${leak.value} in ${leak.where}` })
      }
    }
  }
  return findings
}
