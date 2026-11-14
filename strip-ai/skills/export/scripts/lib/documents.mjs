// Binary documents (a CV, a spreadsheet of customers) are not covered by the
// text redaction, so they are judged as a whole: if one carries personal data
// its content is replaced by a placeholder of the same type. The file keeps
// its role (code that loads it still gets a valid .docx) without the data.
import zlib from 'node:zlib'
import {
  CARD_RE, CNPJ_RE, CPF_RE, DOCUMENT_EXTENSIONS, EMAIL_RE, PHONE_RES, classifyEmail, isRealCard, isRealCnpj, isRealCpf,
} from './rules.mjs'
import { buildZip, readZip } from './zip.mjs'

export const PLACEHOLDER_TEXT = ['Placeholder document', 'The original file was replaced because it contained personal data.']

export function extensionOf(relPath) {
  const base = relPath.slice(relPath.lastIndexOf('/') + 1)
  const dot = base.lastIndexOf('.')
  return dot <= 0 ? '' : base.slice(dot + 1).toLowerCase()
}

export function isDocument(relPath) {
  return DOCUMENT_EXTENSIONS.has(extensionOf(relPath))
}

const XML_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

function xmlToText(xml) {
  return xml
    .replace(/<\/(w:p|a:p|text:p|text:h|row|si)>/g, '\n')
    .replace(/<(w:tab|w:br|text:tab|text:line-break)\b[^>]*\/>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, e) => XML_ENTITIES[e])
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
}

// Parts of an Office/OpenDocument package that carry text a person wrote.
const PACKAGE_TEXT_PARTS = /^(word\/(document|header\d*|footer\d*|footnotes|endnotes|comments)\.xml|xl\/(sharedStrings|worksheets\/sheet\d+)\.xml|ppt\/(slides\/slide\d+|notesSlides\/notesSlide\d+)\.xml|docProps\/(core|app)\.xml|content\.xml|meta\.xml)$/

function pdfToText(buf) {
  const raw = buf.toString('latin1')
  const parts = [raw]
  for (const m of raw.matchAll(/stream\r?\n/g)) {
    const start = m.index + m[0].length
    const end = raw.indexOf('endstream', start)
    if (end === -1) continue
    try {
      parts.push(zlib.inflateSync(buf.subarray(start, end)).toString('latin1'))
    } catch {
      // Not a Flate stream (images, fonts): nothing to read.
    }
  }
  const text = []
  for (const part of parts) {
    for (const s of part.matchAll(/\(((?:\\.|[^\\)])*)\)/g)) text.push(s[1].replace(/\\(.)/g, '$1'))
  }
  return text.join(' ')
}

/** Best-effort plain text of a document, or null when its format cannot be read. */
export function documentText(relPath, buf) {
  const ext = extensionOf(relPath)
  if (['docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp'].includes(ext)) {
    try {
      return readZip(buf)
        .filter((e) => PACKAGE_TEXT_PARTS.test(e.name))
        .map((e) => xmlToText(e.data.toString('utf8')))
        .join('\n')
    } catch {
      return null
    }
  }
  if (ext === 'pdf') return pdfToText(buf)
  if (['csv', 'tsv', 'rtf', 'vcf', 'eml'].includes(ext)) return buf.toString('utf8')
  return null
}

/**
 * Reasons a document counts as personal: a known identity in its name or
 * text, or real contact, ID or card data in its text. `matcher` comes from
 * createIdentityMatcher.
 */
export function personalDataReasons(relPath, text, matcher) {
  const reasons = new Set()
  if (matcher.test(relPath)) reasons.add('owner identity in file name')
  if (text && matcher.test(text)) reasons.add('owner identity in content')
  if (text) {
    if ([...text.matchAll(CARD_RE)].some((m) => isRealCard(m[0]))) reasons.add('card number in content')
    if ([...text.matchAll(EMAIL_RE)].some((m) => classifyEmail(m[0]) === 'real')) reasons.add('real email in content')
    if ([...text.matchAll(CPF_RE)].some((m) => isRealCpf(m[0]))) reasons.add('CPF in content')
    if ([...text.matchAll(CNPJ_RE)].some((m) => isRealCnpj(m[0]))) reasons.add('CNPJ in content')
    if (PHONE_RES.some((re) => new RegExp(re.source, re.flags).test(text))) reasons.add('phone number in content')
  }
  return [...reasons]
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
const PKG_RELS = (target, type) =>
  `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/></Relationships>`

function ooxml(files) {
  const mtime = new Date(2000, 0, 1)
  return buildZip(Object.entries(files).map(([name, xml]) => ({ name, data: Buffer.from(xml, 'utf8'), mtime })))
}

export function buildDocx(paragraphs) {
  const body = paragraphs.map((p) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(p)}</w:t></w:r></w:p>`).join('')
  return ooxml({
    '[Content_Types].xml': `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    '_rels/.rels': PKG_RELS('word/document.xml', 'officeDocument'),
    'word/document.xml': `${XML_HEAD}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr/></w:body></w:document>`,
  })
}

export function buildXlsx(rows) {
  const cells = rows
    .map((row, r) => `<row r="${r + 1}">${row.map((v, c) => `<c r="${String.fromCharCode(65 + c)}${r + 1}" t="inlineStr"><is><t>${escapeXml(v)}</t></is></c>`).join('')}</row>`)
    .join('')
  return ooxml({
    '[Content_Types].xml': `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    '_rels/.rels': PKG_RELS('xl/workbook.xml', 'officeDocument'),
    'xl/workbook.xml': `${XML_HEAD}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': PKG_RELS('worksheets/sheet1.xml', 'worksheet'),
    'xl/worksheets/sheet1.xml': `${XML_HEAD}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${cells}</sheetData></worksheet>`,
  })
}

export function buildPdf(lines) {
  const esc = (s) => s.replace(/[\\()]/g, '\\$&').replace(/[^\x20-\x7e]/g, '-')
  const content = `BT /F1 14 Tf 72 720 Td 18 TL ${lines.map((l) => `(${esc(l)}) '`).join(' ')} ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let out = '%PDF-1.4\n'
  const offsets = []
  objects.forEach((body, i) => {
    offsets.push(out.length)
    out += `${i + 1} 0 obj\n${body}\nendobj\n`
  })
  const xref = out.length
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  out += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(out, 'latin1')
}

function buildRtf(lines) {
  return Buffer.from(`{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Helvetica;}}\\f0 ${lines.map((l) => l.replace(/[\\{}]/g, '\\$&').replace(/[^\x20-\x7e]/g, '-')).join('\\par ')}\\par}\n`, 'latin1')
}

const BUILDERS = {
  docx: () => buildDocx(PLACEHOLDER_TEXT),
  xlsx: () => buildXlsx(PLACEHOLDER_TEXT.map((line) => [line])),
  pdf: () => buildPdf(PLACEHOLDER_TEXT),
  rtf: () => buildRtf(PLACEHOLDER_TEXT),
}

/** A placeholder of the same type, or null when the format has no builder. */
export function placeholderFor(relPath) {
  return BUILDERS[extensionOf(relPath)]?.() ?? null
}

export const PLACEHOLDER_FORMATS = Object.keys(BUILDERS)

/** True for files this module produced, so later scans do not flag them again. */
export function isPlaceholder(relPath, buf) {
  const text = documentText(relPath, buf)
  return text !== null && text.includes(PLACEHOLDER_TEXT[1])
}
