// Redaction and scanning, including the two classes of bugs found in real
// exports: blind spots (PII never looked at) and self-inflicted findings
// (redaction output that the next scan flags).
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { scanContext } from '../skills/export/scripts/lib/context.mjs'
import { buildDocx, buildPdf, buildXlsx, documentText, isPlaceholder, placeholderFor } from '../skills/export/scripts/lib/documents.mjs'
import { stripImageMetadata } from '../skills/export/scripts/lib/images.mjs'
import { findLeaks, findTokens } from '../skills/export/scripts/lib/leaks.mjs'
import { createRedactor, redactTree } from '../skills/export/scripts/lib/redact.mjs'
import { SECRET_RULES } from '../skills/export/scripts/lib/rules.mjs'
import { scanText, scanTree } from '../skills/export/scripts/lib/scan.mjs'
import { buildZip } from '../skills/export/scripts/lib/zip.mjs'
import { SECRET_SAMPLES, nobody, owner, read, tempDir, write } from './helpers.mjs'

const blocks = (findings) => findings.filter((f) => f.severity === 'block')
const ctxFor = (identity, extra) => scanContext(identity, extra)

function workDir(t, files) {
  const dir = tempDir(t)
  for (const [rel, data] of Object.entries(files)) write(dir, rel, data)
  return { dir, files: Object.keys(files) }
}

test('every secret rule has a sample, and every sample is caught by its rule', () => {
  assert.deepEqual(Object.keys(SECRET_SAMPLES).sort(), SECRET_RULES.map((r) => r.id).sort())
  for (const rule of SECRET_RULES) {
    const ids = blocks(scanText('config.ts', `const v = "${SECRET_SAMPLES[rule.id]}"`, ctxFor(nobody()))).map((f) => f.rule)
    assert.ok(ids.includes(rule.id), `${rule.id} sample not detected: ${ids}`)
  }
})

test('nothing the redactor writes is flagged by the next scan, and redacting twice changes nothing', () => {
  const r = createRedactor(owner())
  const input = [
    ...Object.values(SECRET_SAMPLES).map((s) => `secret: "${s}"`),
    'email: joao.pereira@empresa.com.br',
    'cpf: 529.982.247-25, cnpj: 11.444.777/0001-61',
    'db: postgres://app:Zq8vL2pX9wR@db.prod.acme.io/main',
    'path: /home/msilva/projects and C:\\Users\\msilva\\code',
    'Copyright María Silva, MariaSilva, maria-silva, the-msilva',
  ].join('\n')
  const once = r.redactText(input, 'fixtures.ts')
  assert.deepEqual(blocks(scanText('fixtures.ts', once, ctxFor(owner()))), [])
  assert.equal(r.redactText(once, 'fixtures.ts'), once)
})

test('placeholders never collide with values the project already has', (t) => {
  const { dir, files } = workDir(t, {
    'seed.yml': 'admin: user1@example.com\nfixture: Jane Doe\nowner: Maria Silva <joao.pereira@empresa.com.br>\n',
  })
  redactTree(dir, files, owner())
  assert.equal(read(dir, 'seed.yml'), 'admin: user1@example.com\nfixture: Jane Doe\nowner: Jane Roe <user2@example.com>\n')
})

test('each occurrence keeps its own casing', () => {
  const r = createRedactor(owner())
  assert.equal(r.redactText('maria silva wrote this. By Maria Silva. MARIA SILVA', 'a.md'), 'jane doe wrote this. By Jane Doe. JANE DOE')
})

test('a file is never renamed over an existing one', (t) => {
  const { dir, files } = workDir(t, { 'cvJaneDoe.txt': 'fixture persona\n', 'cvMariaSilva.txt': 'real cv\n' })
  const result = redactTree(dir, files, owner())
  assert.equal(read(dir, 'cvJaneDoe.txt'), 'fixture persona\n')
  assert.equal(read(dir, 'cvMariaSilva.txt'), 'real cv\n')
  assert.equal(result.renameConflicts.length, 1)
  assert.deepEqual(result.renamed, [])
  assert.ok(!result.redactions.some((r) => r.category === 'identity-in-path'), 'a rename that did not happen is not reported')
})

test('a redacted value is replaced everywhere it appears verbatim, and a copy left behind blocks', (t) => {
  const password = 'Zq8vL2pX9wR'
  const { dir, files } = workDir(t, {
    '.env.example': `DATABASE_URL=postgres://app:${password}@db.prod.acme.io/main\n`,
    'src/db.test.ts': `expect(parsePassword(url)).toBe('${password}')\n`,
  })
  const result = redactTree(dir, files, nobody())
  assert.equal(read(dir, 'src/db.test.ts'), "expect(parsePassword(url)).toBe('REDACTED')\n")
  assert.deepEqual(blocks(scanTree(dir, files, ctxFor(nobody(), { originals: result.rawOriginals }))), [])
  write(dir, 'notes.md', `old password: ${password}\n`)
  const left = blocks(scanTree(dir, ['notes.md'], ctxFor(nobody(), { originals: result.rawOriginals })))
  assert.deepEqual(left.map((f) => f.rule), ['redacted-value-left'])
})

test('nothing redact returns for reports carries a raw value, file paths included', (t) => {
  const { dir, files } = workDir(t, { 'public/cvMariaSilva.txt': 'Maria Silva\nmaria.silva@gmail.com\n', 'docs/home.md': 'see /home/msilva/notes\n' })
  const { rawOriginals, renamedRaw, rules, ...report } = redactTree(dir, files, owner())
  const serialized = JSON.stringify(report).toLowerCase()
  for (const raw of ['maria silva', 'mariasilva', 'maria.silva@gmail.com', 'msilva']) assert.equal(serialized.includes(raw), false, raw)
  assert.ok(rawOriginals.includes('maria.silva@gmail.com'))
})

test('identity inside a packaged or UTF-16 binary is found', (t) => {
  const manifest = Buffer.from('Manifest-Version: 1.0\n'.repeat(50) + 'Built-By: Maria Silva\n')
  const jar = buildZip([{ name: 'META-INF/MANIFEST.MF', data: manifest, mode: 0o644 }])
  assert.equal(jar.includes(Buffer.from('Maria')), false, 'precondition: visible only after inflating')
  const utf16 = Buffer.concat([Buffer.from([0, 1, 2, 0]), Buffer.from('Author: Maria Silva', 'utf16le')])
  const { dir, files } = workDir(t, { 'lib/app.jar': jar, 'assets/data.bin': utf16, 'assets/clean.bin': Buffer.from([0, 1, 2, 3]) })
  const found = blocks(scanTree(dir, files, ctxFor(owner()))).map((f) => [f.file, f.rule])
  assert.deepEqual(found.sort(), [['assets/data.bin', 'known-value-in-binary'], ['lib/app.jar', 'known-value-in-binary']])
})

test('short values count as whole words only, so chance hits inside hashes do not block', () => {
  const blob = Buffer.from('integrity sha512-AbCdmariaXyZ0123456789abcdefghijklmnopqrstuvwxyzABCDEFG==\nby maria\n')
  assert.deepEqual(findLeaks('yarn.lock', Buffer.from('sha512-AbCdmariaXyZ0123'), ['maria']), [])
  assert.equal(findLeaks('yarn.lock', blob, ['maria']).length, 1)
  assert.deepEqual(findTokens('yarn.lock', Buffer.from('sha512-AbCdmariaXyZ0123456789abcdefghijklmnopqrstuvwxyzABCDEFG=='), ['maria']), [])
})

test('the audit finds pieces of the identity that no redaction pattern spells out', () => {
  const ctx = ctxFor(owner())
  const text = 'Photos: https://silva-photography.studio\nBuilt for the dev team\n'
  assert.deepEqual(blocks(scanText('README.md', text, ctx)), [], 'precondition: the pattern scan misses it')
  assert.deepEqual(findTokens('README.md', Buffer.from(text), ctx.tokens), [{ token: 'silva', count: 1 }])
})

test('a CV is replaced by a valid placeholder of the same type, renamed, and the code loading it is updated', (t) => {
  const { dir, files } = workDir(t, {
    'public/cvMariaSilva.docx': buildDocx(['Maria Silva', 'maria.silva@gmail.com', 'Experience: 10 years']),
    'public/spec.pdf': buildPdf(['Requirements for the challenge']),
    'app/page.tsx': '<Editor document="/cvMariaSilva.docx" />\n',
  })
  const result = redactTree(dir, files, owner())
  assert.deepEqual(result.replacedDocuments.map((d) => d.file), ['public/cvJaneDoe.docx'])
  const replaced = fs.readFileSync(path.join(dir, 'public', 'cvJaneDoe.docx'))
  assert.ok(isPlaceholder('cvJaneDoe.docx', replaced))
  assert.doesNotMatch(documentText('cvJaneDoe.docx', replaced), /Maria|Experience/)
  assert.equal(read(dir, 'app/page.tsx'), '<Editor document="/cvJaneDoe.docx" />\n')
  assert.match(documentText('spec.pdf', fs.readFileSync(path.join(dir, 'public', 'spec.pdf'))), /Requirements/)
})

test('placeholders exist for docx, xlsx, pdf and rtf, and are recognized as placeholders', () => {
  for (const ext of ['docx', 'xlsx', 'pdf', 'rtf']) assert.ok(isPlaceholder(`x.${ext}`, placeholderFor(`x.${ext}`)), ext)
  assert.equal(placeholderFor('x.pptx'), null)
  assert.match(documentText('a.xlsx', buildXlsx([['Name'], ['ana@corp.io']])), /ana@corp\.io/)
})

test('a personal document without a placeholder builder is reported and keeps blocking', (t) => {
  const { dir, files } = workDir(t, { 'deck.pptx': buildDocx(['Maria Silva']) })
  const result = redactTree(dir, files, owner())
  assert.deepEqual(result.documentsNeedingAction.map((d) => d.file), ['deck.pptx'])
  assert.equal(blocks(scanTree(dir, files, ctxFor(owner())))[0].rule, 'document-with-pii')
})

function segment(marker, payload) {
  const len = Buffer.alloc(2)
  len.writeUInt16BE(payload.length + 2)
  return Buffer.concat([Buffer.from([0xff, marker]), len, payload])
}

function jpegWithMetadata() {
  const scan = Buffer.from([0xff, 0xda, 0x00, 0x08, 1, 2, 3, 4, 5, 6, 0xaa, 0xbb, 0xff, 0xd9])
  const file = Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    segment(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'latin1')),
    segment(0xe1, Buffer.from('Exif\0\0Artist=Maria Silva GPS=-23.5,-46.6', 'latin1')),
    segment(0xe2, Buffer.from('ICC_PROFILE\0', 'latin1')),
    segment(0xfe, Buffer.from('taken by Maria Silva', 'latin1')),
    segment(0xdb, Buffer.alloc(65, 1)),
    scan,
  ])
  return { file, scan }
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  return Buffer.concat([len, Buffer.from(type, 'latin1'), data, Buffer.alloc(4)])
}

test('JPEG and PNG metadata is stripped and the image data is kept byte for byte', () => {
  const { file, scan } = jpegWithMetadata()
  const jpeg = stripImageMetadata(file)
  assert.deepEqual(jpeg.removed, ['EXIF/XMP', 'COM'])
  assert.ok(jpeg.data.subarray(jpeg.data.length - scan.length).equals(scan))
  assert.ok(jpeg.data.includes(Buffer.from('ICC_PROFILE')) && !jpeg.data.includes(Buffer.from('Maria')))
  const idat = pngChunk('IDAT', Buffer.from([1, 2, 3]))
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const png = stripImageMetadata(Buffer.concat([sig, pngChunk('IHDR', Buffer.alloc(13)), pngChunk('tEXt', Buffer.from('Author\0Maria Silva')), idat, pngChunk('IEND', Buffer.alloc(0))]))
  assert.deepEqual(png.removed, ['tEXt'])
  assert.ok(png.data.includes(idat) && !png.data.includes(Buffer.from('Maria')))
  const broken = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff])
  assert.deepEqual(stripImageMetadata(broken), { data: broken, removed: [] })
})

test('redact strips image metadata; formats it cannot strip need a decision', (t) => {
  const { dir, files } = workDir(t, { 'public/photo.jpg': jpegWithMetadata().file, 'public/photo.webp': Buffer.from('RIFF\0\0\0\0WEBPVP8 ') })
  assert.deepEqual(blocks(scanTree(dir, ['public/photo.jpg'], ctxFor(nobody()))).map((f) => f.rule), ['image-metadata'])
  const result = redactTree(dir, files, nobody())
  assert.deepEqual(result.strippedMetadata, [{ file: 'public/photo.jpg', removed: ['EXIF/XMP', 'COM'] }])
  const after = scanTree(dir, files, ctxFor(owner()))
  assert.deepEqual(blocks(after), [])
  assert.deepEqual(after.filter((f) => f.rule === 'image-metadata-unchecked').map((f) => f.file), ['public/photo.webp'])
})

test('identities replaced hundreds of times are reported as suspicious', (t) => {
  const { dir, files } = workDir(t, { 'a.md': 'silvano '.repeat(3) + 'msilva '.repeat(250) })
  const result = redactTree(dir, files, { ...nobody(), handles: ['msilva'] })
  assert.equal(result.suspiciousIdentities.length, 1)
})
