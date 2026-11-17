// Image metadata (EXIF, XMP, IPTC, PNG text chunks) carries camera owner,
// author names, GPS coordinates and software paths. None of it is needed to
// display the image, so it is always stripped from JPEG and PNG.

const JPEG_KEEP = new Set([0xe0, 0xe2, 0xee]) // APP0 JFIF, APP2 ICC profile, APP14 Adobe color transform
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const PNG_DROP = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME'])

export function imageKind(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg'
  if (buf.length > 8 && buf.subarray(0, 8).equals(PNG_SIGNATURE)) return 'png'
  return null
}

function jpegName(marker) {
  if (marker === 0xfe) return 'COM'
  if (marker === 0xe1) return 'EXIF/XMP'
  if (marker === 0xed) return 'IPTC'
  return `APP${marker - 0xe0}`
}

/** Returns { data, removed } with metadata segments dropped. Malformed files are returned unchanged. */
function stripJpeg(buf) {
  const keep = [buf.subarray(0, 2)]
  const removed = []
  let i = 2
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff) return { data: buf, removed: [] }
    const marker = buf[i + 1]
    if (marker === 0xff) {
      i++ // fill byte
      continue
    }
    if (marker === 0xda) {
      keep.push(buf.subarray(i)) // start of scan: the rest is image data
      return { data: Buffer.concat(keep), removed }
    }
    const length = buf.readUInt16BE(i + 2)
    if (length < 2 || i + 2 + length > buf.length) return { data: buf, removed: [] }
    const isMetadata = marker === 0xfe || (marker >= 0xe0 && marker <= 0xef && !JPEG_KEEP.has(marker))
    if (isMetadata) removed.push(jpegName(marker))
    else keep.push(buf.subarray(i, i + 2 + length))
    i += 2 + length
  }
  return { data: buf, removed: [] }
}

function stripPng(buf) {
  const keep = [buf.subarray(0, 8)]
  const removed = []
  let i = 8
  while (i + 12 <= buf.length) {
    const length = buf.readUInt32BE(i)
    const type = buf.subarray(i + 4, i + 8).toString('latin1')
    const end = i + 12 + length
    if (end > buf.length) return { data: buf, removed: [] }
    if (PNG_DROP.has(type)) removed.push(type)
    else keep.push(buf.subarray(i, end))
    i = end
    if (type === 'IEND') break
  }
  return { data: Buffer.concat(keep), removed }
}

/** { data, removed: ['EXIF/XMP', ...] } for JPEG and PNG, null for other formats. */
export function stripImageMetadata(buf) {
  const kind = imageKind(buf)
  if (kind === 'jpeg') return stripJpeg(buf)
  if (kind === 'png') return stripPng(buf)
  return null
}
