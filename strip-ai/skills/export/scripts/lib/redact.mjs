// Replaces high-confidence PII and secrets with consistent placeholders:
// the same original value always becomes the same placeholder, so data that
// tests compare across files keeps lining up.
import fs from 'node:fs'
import path from 'node:path'
import {
  CNPJ_RE, CPF_RE, EMAIL_RE, GENERIC_USERS, HOME_PATH_RE, SECRET_RULES, URL_CREDENTIALS_RE,
  classifyEmail, isUrlCredentialContext, fakeCnpj, fakeCpf, isFixtureUrlCredential, isPublishedExample, isRealCnpj,
  isRealCpf, mask,
} from './rules.mjs'
import { identityPatterns } from './identity.mjs'
import { readText } from './scan.mjs'
import { documentText, isDocument, isPlaceholder, personalDataReasons, placeholderFor } from './documents.mjs'
import { stripImageMetadata } from './images.mjs'

export function createRedactor(identity) {
  const ledger = new Map() // `${category}\0${original}` -> { category, placeholder, files:Set, count }
  const raw = new Map() // same key -> { category, original, placeholder }, unmasked, never reported
  const counters = { email: 0, cpf: 0, cnpj: 0 }
  const identityRules = identityPatterns(identity)

  const record = (category, original, placeholder, file) => {
    const key = `${category}\0${original.toLowerCase()}`
    let entry = ledger.get(key)
    if (!entry) {
      entry = { category, original: mask(original), placeholder, files: new Set(), count: 0 }
      ledger.set(key, entry)
      raw.set(key, { category, original, placeholder })
    }
    entry.files.add(file)
    entry.count++
    return entry.placeholder
  }
  const known = (category, original) => ledger.get(`${category}\0${original.toLowerCase()}`)?.placeholder

  function redactText(text, file) {
    let out = text
    for (const rule of SECRET_RULES) {
      out = out.replace(rule.re, (m) => (isPublishedExample(m) ? m : record(rule.id, m, rule.fake(m), file)))
    }
    out = out.replace(URL_CREDENTIALS_RE, (m, scheme, user, pass, host) =>
      isFixtureUrlCredential(pass, host) ? m : `${scheme}${user}:${record('url-credentials', pass, 'REDACTED', file)}@${host}`,
    )
    out = out.replace(EMAIL_RE, (m, offset, whole) => {
      if (isUrlCredentialContext(whole, offset) || classifyEmail(m) !== 'real') return m
      return record('email', m, known('email', m) ?? `user${++counters.email}@example.com`, file)
    })
    out = out.replace(CPF_RE, (m) => (isRealCpf(m) ? record('cpf', m, known('cpf', m) ?? fakeCpf(++counters.cpf), file) : m))
    out = out.replace(CNPJ_RE, (m) => (isRealCnpj(m) ? record('cnpj', m, known('cnpj', m) ?? fakeCnpj(++counters.cnpj), file) : m))
    out = out.replace(HOME_PATH_RE, (m, prefix, user) =>
      GENERIC_USERS.has(user.toLowerCase()) ? m : prefix + record('home-path', user, 'user', file),
    )
    for (const rule of identityRules) {
      out = out.replace(rule.re, (m) => record('identity', m, rule.replace(m), file))
    }
    return out
  }

  function redactName(name, file) {
    let out = name
    for (const rule of identityRules) out = out.replace(rule.re, (m) => record('identity-in-path', m, rule.replace(m), file))
    return out
  }

  /** The redacted spelling of a path, without recording anything. */
  function cleanPath(rel) {
    let out = rel
    for (const rule of identityRules) out = out.replace(rule.re, (m) => rule.replace(m))
    return out
  }

  // File lists are recorded under each file's original path, which can itself carry the identity.
  function summary() {
    return [...ledger.values()].map((e) => ({ ...e, files: [...new Set([...e.files].map(cleanPath))].sort() }))
  }

  function originals() {
    return [...raw.values()]
  }

  return { redactText, redactName, cleanPath, summary, originals, recordLiteral: record }
}

// Categories whose raw originals are also replaced wherever they appear
// verbatim, even where no pattern matches (a password from a URL that is
// also hardcoded in a test). Identity and home paths have their own rules.
const LITERAL_CATEGORIES = new Set(['email', 'cpf', 'cnpj', 'url-credentials', ...SECRET_RULES.map((r) => r.id)])
const MIN_LITERAL_LENGTH = 6

function readBinary(abs) {
  const buf = fs.readFileSync(abs)
  return buf.subarray(0, 8192).includes(0) ? buf : null
}

/**
 * Redacts every file in place, then proves the result:
 * 1. binary documents with personal data get a same-type placeholder;
 * 2. JPEG/PNG metadata is stripped;
 * 3. text is redacted by pattern, and files are renamed;
 * 4. a second pass replaces verbatim copies of every redacted original.
 * `rawOriginals` holds unmasked values; callers keep it out of reports.
 */
export function redactTree(workDir, files, identity) {
  const redactor = createRedactor(identity)
  const changedFiles = new Set()
  const renamed = []
  const replacedDocuments = []
  const documentsNeedingAction = []
  const strippedMetadata = []
  const finalFiles = []

  for (const rel of files) {
    const abs = path.join(workDir, ...rel.split('/'))
    let replacedReasons = null
    const binary = readBinary(abs)
    if (binary && isDocument(rel)) {
      const reasons = isPlaceholder(rel, binary) ? [] : personalDataReasons(rel, documentText(rel, binary), identity)
      if (reasons.length) {
        const placeholder = placeholderFor(rel)
        if (placeholder) {
          fs.writeFileSync(abs, placeholder)
          replacedReasons = reasons
        } else documentsNeedingAction.push({ file: rel, reasons })
      }
    }
    if (binary) {
      const stripped = stripImageMetadata(binary)
      if (stripped?.removed.length) {
        fs.writeFileSync(abs, stripped.data)
        strippedMetadata.push({ file: rel, removed: stripped.removed })
      }
    }
    const text = readText(abs)
    if (text !== null) {
      const next = redactor.redactText(text, rel)
      if (next !== text) {
        fs.writeFileSync(abs, next)
        changedFiles.add(rel)
      }
    }
    const newRel = rel.split('/').map((p) => redactor.redactName(p, rel)).join('/')
    if (newRel !== rel) {
      const dest = path.join(workDir, ...newRel.split('/'))
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.renameSync(abs, dest)
      renamed.push({ from: mask(rel), to: newRel })
      if (changedFiles.delete(rel)) changedFiles.add(newRel)
      for (const s of strippedMetadata) if (s.file === rel) s.file = newRel
    }
    if (replacedReasons) replacedDocuments.push({ file: newRel, reasons: replacedReasons })
    finalFiles.push(newRel)
  }

  const literals = redactor
    .originals()
    .filter((o) => LITERAL_CATEGORIES.has(o.category) && o.original.length >= MIN_LITERAL_LENGTH)
    .sort((a, b) => b.original.length - a.original.length)
  if (literals.length) {
    const re = new RegExp(literals.map((o) => o.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi')
    const byValue = new Map(literals.map((o) => [o.original.toLowerCase(), o]))
    for (const rel of finalFiles) {
      const abs = path.join(workDir, ...rel.split('/'))
      const text = readText(abs)
      if (text === null) continue
      const next = text.replace(re, (m) => {
        const o = byValue.get(m.toLowerCase())
        return redactor.recordLiteral(o.category, m, o.placeholder, rel)
      })
      if (next !== text) {
        fs.writeFileSync(abs, next)
        changedFiles.add(rel)
      }
    }
  }

  for (const d of documentsNeedingAction) d.file = redactor.cleanPath(d.file)
  return {
    changedFiles: [...changedFiles].sort(),
    renamed,
    replacedDocuments,
    documentsNeedingAction,
    strippedMetadata,
    redactions: redactor.summary(),
    // Only values replaced as literals: a home-path user name or a name token
    // searched as a bare substring would also hit unrelated words.
    rawOriginals: redactor.originals().filter((o) => LITERAL_CATEGORIES.has(o.category)).map((o) => o.original),
  }
}
