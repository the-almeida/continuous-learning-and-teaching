// Last line of defense: look for every known sensitive value (the owner's
// identity and every original that redaction replaced) in the raw bytes of
// every exported file, including inside zip packages (docx, xlsx, jar),
// gzip streams and compressed PDF streams, in UTF-8 and UTF-16. Pattern
// rules decide what to redact; this check proves nothing known survived,
// whatever the file type.
import zlib from 'node:zlib'
import { identityPatterns } from './identity.mjs'
import { mask } from './rules.mjs'
import { readZip } from './zip.mjs'

const MIN_CANARY_LENGTH = 5
const MAX_DEPTH = 3

/** The values to look for, lowercased and deduplicated. */
export function canaries(identity, originals = []) {
  const values = new Set()
  for (const p of identityPatterns(identity)) values.add(p.literal.toLowerCase())
  for (const e of identity.emails) values.add(e.toLowerCase())
  for (const o of originals) values.add(o.toLowerCase())
  return [...values].filter((v) => v.length >= MIN_CANARY_LENGTH)
}

function inflatePdfStreams(buf) {
  const out = []
  const raw = buf.toString('latin1')
  for (const m of raw.matchAll(/stream\r?\n/g)) {
    const start = m.index + m[0].length
    const end = raw.indexOf('endstream', start)
    if (end === -1) continue
    try {
      out.push(zlib.inflateSync(buf.subarray(start, end)))
    } catch {
      // Not Flate-encoded.
    }
  }
  return out
}

/** The file plus every layer that can be unpacked from it: zip entries, gzip content, PDF streams. */
export function layers(name, buf, depth = 0) {
  const result = [{ name, buf }]
  if (depth >= MAX_DEPTH) return result
  try {
    if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
      for (const e of readZip(buf)) result.push(...layers(`${name}!${e.name}`, e.data, depth + 1))
    } else if (buf[0] === 0x1f && buf[1] === 0x8b) {
      result.push(...layers(`${name}!gunzip`, zlib.gunzipSync(buf), depth + 1))
    } else if (buf.subarray(0, 5).toString('latin1') === '%PDF-') {
      inflatePdfStreams(buf).forEach((b, i) => result.push({ name: `${name}!stream${i}`, buf: b }))
    }
  } catch {
    // Corrupt or unsupported container: the outer bytes are still checked.
  }
  return result
}

// Words too common to say anything about who the owner is.
const COMMON_TOKENS = new Set(['the', 'dev', 'code', 'user', 'admin', 'info', 'contact', 'hello', 'mail', 'team', 'www'])

/**
 * Independent of the redaction patterns: each piece of the identity on its
 * own (first name, surname, handle parts, domain labels, email local parts).
 * Redaction matches whole spellings; this finds the variants it did not
 * know about, like a surname inside a domain.
 */
export function identityTokens(identity) {
  const tokens = new Set()
  const addParts = (s) => {
    for (const t of s.toLowerCase().split(/[^a-z0-9\u00c0-\u024f]+/)) if (t.length >= 4 && !COMMON_TOKENS.has(t)) tokens.add(t)
  }
  identity.names.forEach(addParts)
  identity.handles.forEach((h) => {
    addParts(h)
    const joined = h.toLowerCase().replace(/[-_.]/g, '')
    if (joined.length >= 4) tokens.add(joined)
  })
  identity.emails.forEach((e) => addParts(e.slice(0, e.lastIndexOf('@'))))
  ;(identity.domains ?? []).forEach((d) => addParts(d.slice(0, d.lastIndexOf('.'))))
  return [...tokens]
}

/** Leaks of known values in one file, as masked findings. */
export function findLeaks(relPath, buf, values) {
  if (!values.length) return []
  const found = new Map()
  for (const layer of layers(relPath, buf)) {
    const views = [layer.buf.toString('utf8').toLowerCase(), layer.buf.toString('utf16le').toLowerCase()]
    for (const value of values) {
      if (found.has(value)) continue
      if (views.some((v) => v.includes(value))) found.set(value, layer.name)
    }
  }
  return [...found].map(([value, where]) => ({ file: relPath, where, value: mask(value) }))
}
