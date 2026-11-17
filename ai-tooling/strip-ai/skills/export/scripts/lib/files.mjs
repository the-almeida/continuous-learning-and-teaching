// Small file helpers shared by every step.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export const MAX_SCAN_BYTES = 50 * 1024 * 1024

export function native(base, rel) {
  return path.join(base, ...rel.split('/'))
}

export function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex')
}

export function isBinary(buf) {
  return buf.subarray(0, 8192).includes(0)
}

/** Text content, or null for symlinks, binary files and files too large to scan. */
export function readText(absPath) {
  const stat = fs.lstatSync(absPath)
  if (!stat.isFile() || stat.size > MAX_SCAN_BYTES) return null
  const buf = fs.readFileSync(absPath)
  return isBinary(buf) ? null : buf.toString('utf8')
}

/** True when `target` is `root` or inside it. */
export function isInside(root, target) {
  const rel = path.relative(root, target)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

/** Converts CRLF to LF. Used for files that git stores with LF but a Windows checkout turned into CRLF. */
export function crlfToLf(buf) {
  const out = Buffer.alloc(buf.length)
  let j = 0
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0x0d && buf[i + 1] === 0x0a) continue
    out[j++] = buf[i]
  }
  return out.subarray(0, j)
}

export function readJson(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback
}

export function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n')
}

/** Minimal glob: `**` spans folders, `*` and `?` stay inside one. */
export function globToRegExp(glob) {
  let re = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === '*' && glob[i + 1] === '*') {
      re += '.*'
      i++
      if (glob[i + 1] === '/') i++
    } else if (c === '*') re += '[^/]*'
    else if (c === '?') re += '[^/]'
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${re}$`)
}
