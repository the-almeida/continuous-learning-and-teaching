// Replaces high-confidence PII and secrets with consistent placeholders: the
// same original always becomes the same placeholder, and a placeholder is
// never a value the project already has (a fixture user1@example.com or
// "Jane Doe"), so uniqueness constraints and tests comparing people hold.
import fs from 'node:fs'
import path from 'node:path'
import { native, readText } from './files.mjs'
import { documentText, isDocument, isPlaceholder, personalDataReasons, placeholderFor } from './documents.mjs'
import { stripImageMetadata } from './images.mjs'
import { createIdentityMatcher, identityRules, matchCase, placeholderCandidates } from './identity.mjs'
import {
  CNPJ_RE, CPF_RE, EMAIL_RE, GENERIC_USERS, HOME_PATH_RE, SECRET_RULES, URL_CREDENTIALS_RE, classifyEmail, fakeCnpj,
  fakeCpf, isFixtureUrlCredential, isPublishedExample, isRealCnpj, isRealCpf, isUrlCredentialContext, mask,
} from './rules.mjs'

// Categories whose raw originals are also replaced wherever they appear
// verbatim, even where no pattern matches (a URL password that a test also
// hardcodes). Identity and home paths have their own rules.
const LITERAL_CATEGORIES = new Set(['email', 'cpf', 'cnpj', 'url-credentials', ...SECRET_RULES.map((r) => r.id)])
const MIN_LITERAL_LENGTH = 6
const SUSPICIOUS_HITS = 200

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Values the project already contains, so placeholders can avoid them. One regex pass per file. */
export function corpusFacts(workDir, files) {
  const emails = new Set()
  const ids = new Set()
  const present = new Set()
  const candidates = new RegExp(placeholderCandidates().sort((a, b) => b.length - a.length).map(escapeRegExp).join('|'), 'gi')
  for (const rel of files) {
    const text = readText(native(workDir, rel))
    if (text === null) continue
    for (const m of text.matchAll(EMAIL_RE)) emails.add(m[0].toLowerCase())
    for (const m of text.matchAll(CPF_RE)) ids.add(m[0])
    for (const m of text.matchAll(CNPJ_RE)) ids.add(m[0])
    for (const m of text.matchAll(candidates)) present.add(m[0].toLowerCase())
  }
  return { emails, ids, present }
}

export function createRedactor(identity, facts = { emails: new Set(), ids: new Set(), present: new Set() }) {
  const rules = identityRules(identity, (p) => facts.present.has(p))
  const matcher = createIdentityMatcher(rules)
  const ledger = new Map() // `${category}\0${original}` -> { category, original (masked), placeholder, files, count }
  const raw = new Map() // same key -> { category, original, placeholder }, unmasked, never reported
  const identityHits = new Map()
  const usedEmails = new Set(facts.emails)
  const usedIds = new Set(facts.ids)
  const counters = { email: 0, cpf: 0, cnpj: 0 }
  const next = (kind, make, used) => {
    let value
    do value = make(++counters[kind])
    while (used.has(value))
    used.add(value)
    return value
  }

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

  function replaceIdentity(text, file, category) {
    return matcher.replace(text, (m, rule) => {
      identityHits.set(rule.literal, (identityHits.get(rule.literal) ?? 0) + 1)
      // Each occurrence keeps its own casing: "Maria Silva" -> "Jane Doe", "maria silva" -> "jane doe".
      const placeholder = matchCase(m, rule.placeholder)
      record(category, m, placeholder, file)
      return placeholder
    })
  }

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
      return record('email', m, known('email', m) ?? next('email', (n) => `user${n}@example.com`, usedEmails), file)
    })
    out = out.replace(CPF_RE, (m) => (isRealCpf(m) ? record('cpf', m, known('cpf', m) ?? next('cpf', fakeCpf, usedIds), file) : m))
    out = out.replace(CNPJ_RE, (m) => (isRealCnpj(m) ? record('cnpj', m, known('cnpj', m) ?? next('cnpj', fakeCnpj, usedIds), file) : m))
    out = out.replace(HOME_PATH_RE, (m, prefix, user) => (GENERIC_USERS.has(user.toLowerCase()) ? m : prefix + record('home-path', user, 'user', file)))
    return replaceIdentity(out, file, 'identity')
  }

  return {
    rules,
    matcher,
    redactText,
    redactName: (name, file) => replaceIdentity(name, file, 'identity-in-path'),
    /** The redacted spelling of a path, without recording anything. */
    cleanPath: (rel) => matcher.replace(rel, (m, rule) => matchCase(m, rule.placeholder)),
    summary: (cleanPath) => [...ledger.values()].map((e) => ({ ...e, files: [...new Set([...e.files].map(cleanPath))].sort() })),
    originals: () => [...raw.values()],
    recordLiteral: record,
    identityHits: () => [...identityHits].map(([literal, count]) => ({ literal, count })),
  }
}

function readBinary(abs) {
  const st = fs.lstatSync(abs)
  if (!st.isFile()) return null
  const buf = fs.readFileSync(abs)
  return buf.subarray(0, 8192).includes(0) ? buf : null
}

/**
 * Redacts every exported file in place:
 * 1. binary documents with personal data get a same-type placeholder;
 * 2. JPEG/PNG metadata is stripped;
 * 3. text is redacted by pattern, and files are renamed (never over an existing file);
 * 4. a second pass replaces verbatim copies of every redacted original.
 * `rawOriginals` holds unmasked values; callers keep it out of reports.
 */
export function redactTree(workDir, files, identity, { isSymlink = () => false } = {}) {
  const redactor = createRedactor(identity, corpusFacts(workDir, files))
  const changedFiles = new Set()
  const renamed = []
  const renamedRaw = []
  const renameConflicts = []
  const replacedDocuments = []
  const documentsNeedingAction = []
  const strippedMetadata = []
  const finalFiles = []
  const existing = new Set(files.map((f) => f.toLowerCase()))

  for (const rel of files) {
    const abs = native(workDir, rel)
    const symlink = isSymlink(rel)
    let replacedReasons = null
    const binary = symlink ? null : readBinary(abs)
    if (binary && isDocument(rel)) {
      const reasons = isPlaceholder(rel, binary) ? [] : personalDataReasons(rel, documentText(rel, binary), redactor.matcher)
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
    const text = symlink ? null : readText(abs)
    if (text !== null) {
      const next = redactor.redactText(text, rel)
      if (next !== text) {
        fs.writeFileSync(abs, next)
        changedFiles.add(rel)
      }
    }
    let finalRel = rel
    const newRel = redactor.cleanPath(rel)
    if (newRel !== rel) {
      // Case-insensitive, because Windows and macOS file systems are.
      if (existing.has(newRel.toLowerCase()) || fs.existsSync(native(workDir, newRel))) {
        renameConflicts.push({ file: redactor.cleanPath(rel), target: newRel, masked: mask(rel) })
      } else {
        const dest = native(workDir, newRel)
        fs.mkdirSync(path.dirname(dest), { recursive: true })
        fs.renameSync(abs, dest)
        rel.split('/').forEach((p) => redactor.redactName(p, rel)) // recorded only once the rename happened
        existing.add(newRel.toLowerCase())
        renamed.push({ from: mask(rel), to: newRel })
        renamedRaw.push({ from: rel, to: newRel })
        if (changedFiles.delete(rel)) changedFiles.add(newRel)
        for (const s of strippedMetadata) if (s.file === rel) s.file = newRel
        finalRel = newRel
      }
    }
    if (replacedReasons) replacedDocuments.push({ file: finalRel, reasons: replacedReasons })
    finalFiles.push(finalRel)
  }

  const literals = redactor
    .originals()
    .filter((o) => LITERAL_CATEGORIES.has(o.category) && o.original.length >= MIN_LITERAL_LENGTH)
    .sort((a, b) => b.original.length - a.original.length)
  if (literals.length) {
    const re = new RegExp(literals.map((o) => escapeRegExp(o.original)).join('|'), 'gi')
    const byValue = new Map(literals.map((o) => [o.original.toLowerCase(), o]))
    for (const rel of finalFiles) {
      if (isSymlink(rel)) continue
      const abs = native(workDir, rel)
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
  const hits = redactor.identityHits()
  return {
    changedFiles: [...changedFiles].sort(),
    renamed,
    renameConflicts,
    replacedDocuments,
    documentsNeedingAction,
    strippedMetadata,
    redactions: redactor.summary(redactor.cleanPath),
    identityHits: hits.map((h) => ({ literal: mask(h.literal), count: h.count })),
    suspiciousIdentities: hits.filter((h) => h.count > SUSPICIOUS_HITS).map((h) => ({ literal: mask(h.literal), count: h.count })),
    // Raw (unmasked) data below is for the temp work root only, never for output.
    renamedRaw,
    rules: redactor.rules,
    // Only values replaced as literals: a home-path user name or a name token
    // searched as a bare substring would also hit unrelated words.
    rawOriginals: redactor.originals().filter((o) => LITERAL_CATEGORIES.has(o.category)).map((o) => o.original),
  }
}
