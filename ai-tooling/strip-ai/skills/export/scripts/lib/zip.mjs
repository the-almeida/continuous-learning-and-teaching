// Minimal ZIP writer (deflate, UTF-8 names, Unix permissions). No
// dependencies, so the same code runs on Windows, macOS and Linux, where a
// `zip` binary is not guaranteed to exist.
import fs from 'node:fs'
import zlib from 'node:zlib'

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// Every entry gets the same timestamp (2000-01-01 00:00), so the same files
// always give the same bytes and the same SHA-256, and the zip says nothing
// about when or in which time zone it was made.
const FIXED_TIME = 0
const FIXED_DATE = ((2000 - 1980) << 9) | (1 << 5) | 1

/** Rejects names that extract outside the target folder or break on Windows. */
export function validateEntryName(name) {
  const bad =
    !name ||
    name.startsWith('/') ||
    name.includes('\\') ||
    name.includes('\0') ||
    /^[A-Za-z]:/.test(name) ||
    name.split('/').some((seg) => seg === '' || seg === '.' || seg === '..')
  if (bad) throw new Error(`unsafe zip entry name: ${JSON.stringify(name)}`)
}

/**
 * entries: [{ name: 'root/dir/file.txt', data: Buffer, mode: 0o644, symlink?: true }]
 * A symlink entry's data is the link target.
 */
export function writeZip(outFile, entries) {
  fs.writeFileSync(outFile, buildZip(entries))
}

export function buildZip(entries) {
  if (entries.length >= 0xffff) throw new Error(`Too many files for a non-ZIP64 archive: ${entries.length}`)
  const chunks = []
  const central = []
  let offset = 0
  for (const entry of entries) {
    validateEntryName(entry.name)
    const name = Buffer.from(entry.name, 'utf8')
    const crc = crc32(entry.data)
    const deflated = zlib.deflateRawSync(entry.data, { level: 9 })
    const useDeflate = deflated.length < entry.data.length
    const body = useDeflate ? deflated : entry.data
    if (body.length >= 0xffffffff || offset >= 0xffffffff) throw new Error('Archive too large for a non-ZIP64 archive')
    const time = FIXED_TIME
    const date = FIXED_DATE
    const method = useDeflate ? 8 : 0

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6) // UTF-8 names
    local.writeUInt16LE(method, 8)
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(date, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(body.length, 18)
    local.writeUInt32LE(entry.data.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    chunks.push(local, name, body)

    const cdh = Buffer.alloc(46)
    cdh.writeUInt32LE(0x02014b50, 0)
    cdh.writeUInt16LE((3 << 8) | 20, 4) // made by Unix, so permissions are honored
    cdh.writeUInt16LE(20, 6)
    cdh.writeUInt16LE(0x0800, 8)
    cdh.writeUInt16LE(method, 10)
    cdh.writeUInt16LE(time, 12)
    cdh.writeUInt16LE(date, 14)
    cdh.writeUInt32LE(crc, 16)
    cdh.writeUInt32LE(body.length, 20)
    cdh.writeUInt32LE(entry.data.length, 24)
    cdh.writeUInt16LE(name.length, 28)
    const type = entry.symlink ? 0o120000 : 0o100000
    cdh.writeUInt32LE(((type | (entry.symlink ? 0o777 : (entry.mode ?? 0o644))) << 16) >>> 0, 38)
    cdh.writeUInt32LE(offset, 42)
    central.push(cdh, name)

    offset += local.length + name.length + body.length
  }
  const centralSize = central.reduce((n, b) => n + b.length, 0)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralSize, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...chunks, ...central, end])
}

/** Reads entry names, modes and contents from a path or a Buffer. Handles archives made by Office and other tools (sizes come from the central directory). */
export function readZip(fileOrBuffer) {
  const buf = Buffer.isBuffer(fileOrBuffer) ? fileOrBuffer : fs.readFileSync(fileOrBuffer)
  if (buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])) === -1) throw new Error('Not a zip archive')
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  const count = buf.readUInt16LE(eocd + 10)
  let ptr = buf.readUInt32LE(eocd + 16)
  const entries = []
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(ptr + 10)
    const crc = buf.readUInt32LE(ptr + 16)
    const size = buf.readUInt32LE(ptr + 20)
    const nameLen = buf.readUInt16LE(ptr + 28)
    const extraLen = buf.readUInt16LE(ptr + 30)
    const commentLen = buf.readUInt16LE(ptr + 32)
    const attrs = buf.readUInt32LE(ptr + 38) >>> 16
    const mode = attrs & 0o777
    const symlink = (attrs & 0o170000) === 0o120000
    const localOffset = buf.readUInt32LE(ptr + 42)
    const name = buf.subarray(ptr + 46, ptr + 46 + nameLen).toString('utf8')
    const localNameLen = buf.readUInt16LE(localOffset + 26)
    const localExtraLen = buf.readUInt16LE(localOffset + 28)
    const start = localOffset + 30 + localNameLen + localExtraLen
    const raw = buf.subarray(start, start + size)
    const data = method === 8 ? zlib.inflateRawSync(raw) : raw
    if (crc32(data) !== crc) throw new Error(`CRC mismatch for ${name}`)
    entries.push({ name, mode, symlink, data })
    ptr += 46 + nameLen + extraLen + commentLen
  }
  return entries
}
