// Replaces high-confidence PII and secrets with consistent placeholders:
// the same original value always becomes the same placeholder, so data that
// tests compare across files keeps lining up.
import fs from 'node:fs'
import path from 'node:path'
import {
  CNPJ_RE, CPF_RE, EMAIL_RE, GENERIC_USERS, HOME_PATH_RE, SECRET_RULES, URL_CREDENTIALS_RE,
  classifyEmail, isUrlCredentialContext, fakeCnpj, fakeCpf, isFixtureUrlCredential, isPublishedExample, isValidCnpj,
  isValidCpf, mask,
} from './rules.mjs'
import { identityPatterns } from './identity.mjs'
import { readText } from './scan.mjs'

export function createRedactor(identity) {
  const ledger = new Map() // `${category}\0${original}` -> { category, placeholder, files:Set, count }
  const counters = { email: 0, cpf: 0, cnpj: 0 }
  const identityRules = identityPatterns(identity)

  const record = (category, original, placeholder, file) => {
    const key = `${category}\0${original.toLowerCase()}`
    let entry = ledger.get(key)
    if (!entry) {
      entry = { category, original: mask(original), placeholder, files: new Set(), count: 0 }
      ledger.set(key, entry)
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
    out = out.replace(CPF_RE, (m) => (isValidCpf(m) ? record('cpf', m, known('cpf', m) ?? fakeCpf(++counters.cpf), file) : m))
    out = out.replace(CNPJ_RE, (m) => (isValidCnpj(m) ? record('cnpj', m, known('cnpj', m) ?? fakeCnpj(++counters.cnpj), file) : m))
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

  function summary() {
    return [...ledger.values()].map((e) => ({ ...e, files: [...e.files].sort() }))
  }

  return { redactText, redactName, summary }
}

/** Redacts every text file in place and renames files whose names carry the owner's identity. */
export function redactTree(workDir, files, identity) {
  const redactor = createRedactor(identity)
  const changedFiles = []
  const renamed = []
  for (const rel of files) {
    const abs = path.join(workDir, ...rel.split('/'))
    const text = readText(abs)
    if (text !== null) {
      const next = redactor.redactText(text, rel)
      if (next !== text) {
        fs.writeFileSync(abs, next)
        changedFiles.push(rel)
      }
    }
    const parts = rel.split('/')
    const newParts = parts.map((p) => redactor.redactName(p, rel))
    const newRel = newParts.join('/')
    if (newRel !== rel) {
      const dest = path.join(workDir, ...newParts)
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.renameSync(abs, dest)
      renamed.push({ from: mask(rel), to: newRel })
    }
  }
  return { changedFiles, renamed, redactions: redactor.summary() }
}
