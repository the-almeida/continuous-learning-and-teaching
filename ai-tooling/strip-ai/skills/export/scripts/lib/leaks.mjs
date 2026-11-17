// Byte-level searches that do not depend on the pattern rules: every known
// sensitive value (identity spellings, redacted originals) and every piece
// of the identity, looked up in the raw bytes of a file and in every layer
// that can be unpacked from it (zip packages like docx/xlsx/jar, gzip, PDF
// streams), in UTF-8 and UTF-16.
import zlib from 'node:zlib'
import { foldAccents } from './identity.mjs'
import { mask } from './rules.mjs'
import { readZip } from './zip.mjs'

const MIN_CANARY_LENGTH = 5
const SUBSTRING_MIN_LENGTH = 8
const MAX_DEPTH = 3

/** Values to look for, lowercased and deduplicated. */
export function canaries(...lists) {
  const values = new Set()
  for (const list of lists) for (const v of list) if (v && v.length >= MIN_CANARY_LENGTH) values.add(foldAccents(v).toLowerCase())
  return [...values]
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

/** The file plus every layer that can be unpacked from it. */
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

function views(buf) {
  return [buf.toString('utf8'), buf.toString('utf16le')].map((v) => foldAccents(v).toLowerCase())
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Short values only count as whole words: "maria" inside a base64 integrity
 * hash is chance, not a leak. Long values count anywhere.
 */
function matcherFor(value) {
  if (value.length >= SUBSTRING_MIN_LENGTH) return (view) => view.includes(value)
  const re = new RegExp(`(?<![a-z0-9])${escapeRegExp(value)}(?![a-z0-9])`)
  return (view) => re.test(view)
}

/** Known values present in a file, as masked findings with the layer they were found in. */
export function findLeaks(relPath, buf, values) {
  if (!values.length) return []
  const tests = values.map((v) => [v, matcherFor(v)])
  const found = new Map()
  for (const layer of layers(relPath, buf)) {
    const vs = views(layer.buf)
    for (const [value, test] of tests) {
      if (!found.has(value) && vs.some(test)) found.set(value, layer.name)
    }
  }
  return [...found].map(([value, where]) => ({ value, masked: mask(value), where }))
}

/** Text with long base64/hex runs (integrity hashes, data URIs, keys) blanked, so tokens are not found by chance inside them. */
export function stripBlobs(text) {
  return text.replace(/[A-Za-z0-9+/=_-]{40,}/g, ' ')
}

/** Identity pieces present in a file (substring, case-insensitive), with how many times. */
export function findTokens(relPath, buf, tokens) {
  if (!tokens.length) return []
  const counts = new Map()
  for (const layer of layers(relPath, buf)) {
    for (const view of views(layer.buf).map(stripBlobs)) {
      for (const t of tokens) {
        let i = view.indexOf(t)
        while (i !== -1) {
          counts.set(t, (counts.get(t) ?? 0) + 1)
          i = view.indexOf(t, i + t.length)
        }
      }
    }
  }
  return [...counts].map(([token, count]) => ({ token, count }))
}
