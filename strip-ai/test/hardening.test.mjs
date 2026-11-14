// Guards against two classes of bugs found in real exports:
// 1. Blind spots: PII the pipeline never looked at (a CV's content, image
//    metadata, a file packaged inside another, a value no pattern matches).
// 2. Self-inflicted findings: redaction output that the next scan flags.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { stripImageMetadata } from '../skills/export/scripts/lib/images.mjs'
import { canaries, findLeaks } from '../skills/export/scripts/lib/leaks.mjs'
import { createRedactor, redactTree } from '../skills/export/scripts/lib/redact.mjs'
import { SECRET_RULES, fakeCnpj, fakeCpf, isRealCnpj, isRealCpf } from '../skills/export/scripts/lib/rules.mjs'
import { scanText, scanTree } from '../skills/export/scripts/lib/scan.mjs'
import { buildZip } from '../skills/export/scripts/lib/zip.mjs'

const owner = { names: ['Maria Silva'], emails: ['maria.silva@gmail.com'], handles: ['msilva-dev'] }
const nobody = { names: [], emails: [], handles: [] }
const blocks = (findings) => findings.filter((f) => f.severity === 'block')

// Built at runtime so the repository never contains strings shaped like live credentials.
const chars = (n, alphabet = 'Ab3Cd5Ef7Gh9Jk2Lm4Np6Qr8St') => Array.from({ length: n }, (_, i) => alphabet[(i * 7) % alphabet.length]).join('')
const hex = (n) => chars(n, '0123456789abcdef')
const SECRET_SAMPLES = {
  'private-key': ['-----BEGIN', 'RSA PRIVATE KEY-----\n', chars(64), '\n-----END RSA PRIVATE KEY-----'].join(' ').replace('BEGIN RSA', 'BEGIN RSA'),
  'anthropic-key': 'sk-' + 'ant-' + chars(40),
  'openai-key': 'sk-' + 'proj-' + chars(40),
  'aws-key': 'AK' + 'IA' + chars(16, 'ABCDEFGHJKLMNPQRSTUVWXYZ234567'),
  'github-token': 'gh' + 'p_' + chars(36),
  'slack-token': 'xo' + 'xb-' + chars(24),
  'slack-webhook': 'https://hooks.slack.com/' + 'services/' + chars(9) + '/' + chars(24),
  'google-api-key': 'AI' + 'za' + chars(35),
  'stripe-key': 'sk' + '_live_' + chars(24),
  'stripe-webhook-secret': 'wh' + 'sec_' + chars(32),
  jwt: 'ey' + 'J' + chars(20) + '.ey' + 'J' + chars(20) + '.' + chars(20),
  'sentry-dsn': 'https://' + hex(32) + '@o123.ingest.sentry.io/' + '4501',
  'posthog-key': 'ph' + 'c_' + chars(40),
  'resend-key': 're' + '_' + chars(8) + '_' + chars(20),
  'npm-token': 'np' + 'm_' + chars(36),
  'sendgrid-key': 'S' + 'G.' + chars(22) + '.' + chars(43),
}

test('every secret rule has a sample, and every sample matches its rule', () => {
  assert.deepEqual(Object.keys(SECRET_SAMPLES).sort(), SECRET_RULES.map((r) => r.id).sort())
  for (const rule of SECRET_RULES) {
    const sample = SECRET_SAMPLES[rule.id].replace('-----BEGIN RSA', '-----BEGIN RSA')
    const ids = blocks(scanText('config.ts', `const v = "${sample}"`, nobody)).map((f) => f.rule)
    assert.ok(ids.includes(rule.id), `${rule.id} sample not detected: ${ids}`)
  }
})

test('nothing the redactor writes is flagged by the next scan', () => {
  const r = createRedactor(owner)
  const input = [
    ...Object.values(SECRET_SAMPLES).map((s) => `secret: "${s}"`),
    'email: joao.pereira@empresa.com.br',
    'cpf: 529.982.247-25, cnpj: 11.444.777/0001-61',
    'db: postgres://app:Zq8vL2pX9wR@db.prod.acme.io/main',
    'path: /home/msilva/projects and C:\\Users\\msilva\\code',
    'Copyright Maria Silva, MariaSilva, maria-silva, msilva-dev',
  ].join('\n')
  const once = r.redactText(input, 'fixtures.ts')
  assert.deepEqual(blocks(scanText('fixtures.ts', once, owner)), [])
  assert.equal(r.redactText(once, 'fixtures.ts'), once, 'redaction is idempotent')
})

test('fake CPF and CNPJ are distinct, never look real, and run out loudly instead of colliding', () => {
  const cpfs = new Set()
  for (let n = 1; n <= 9999; n++) {
    const cpf = fakeCpf(n)
    assert.equal(isRealCpf(cpf), false, cpf)
    cpfs.add(cpf)
  }
  assert.equal(cpfs.size, 9999)
  assert.equal(isRealCnpj(fakeCnpj(9999)), false)
  assert.throws(() => fakeCpf(10000), /only 9999 distinct fakes/)
  assert.throws(() => fakeCnpj(0), /only 9999 distinct fakes/)
})

function workDirWith(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'strip-ai-hardening-'))
  for (const [rel, data] of Object.entries(files)) {
    const abs = path.join(dir, ...rel.split('/'))
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, data)
  }
  return dir
}

test('a redacted value is replaced everywhere it appears verbatim, even where no rule matches', () => {
  const password = 'Zq8vL2pX9wR'
  const dir = workDirWith({
    '.env.example': `DATABASE_URL=postgres://app:${password}@db.prod.acme.io/main\n`,
    'src/db.test.ts': `expect(parsePassword(url)).toBe('${password}')\n`,
  })
  const files = ['.env.example', 'src/db.test.ts']
  const result = redactTree(dir, files, nobody)
  assert.equal(fs.readFileSync(path.join(dir, 'src', 'db.test.ts'), 'utf8'), "expect(parsePassword(url)).toBe('REDACTED')\n")
  assert.deepEqual(result.changedFiles, files)
  assert.deepEqual(blocks(scanTree(dir, files, nobody, [], result.rawOriginals)), [])
  fs.rmSync(dir, { recursive: true })
})

test('a value left behind after redaction blocks the next scan', () => {
  const dir = workDirWith({ 'notes.md': 'old password: Zq8vL2pX9wR\n' })
  const findings = blocks(scanTree(dir, ['notes.md'], nobody, [], ['Zq8vL2pX9wR']))
  assert.deepEqual(findings.map((f) => f.rule), ['redacted-value-left'])
  fs.rmSync(dir, { recursive: true })
})

test('identity inside a packaged or UTF-16 binary is found', () => {
  // Long and repetitive, so the entry is deflated and the name is not visible in the outer bytes.
  const manifest = Buffer.from('Manifest-Version: 1.0\n'.repeat(50) + 'Built-By: Maria Silva\n')
  const jar = buildZip([{ name: 'META-INF/MANIFEST.MF', data: manifest }])
  assert.equal(jar.includes(Buffer.from('Maria')), false, 'precondition: name only visible after inflating')
  const utf16 = Buffer.concat([Buffer.from([0, 1, 2, 0]), Buffer.from('Author: Maria Silva', 'utf16le')])
  const dir = workDirWith({ 'lib/app.jar': jar, 'assets/data.bin': utf16, 'assets/clean.bin': Buffer.from([0, 1, 2, 3]) })
  const findings = blocks(scanTree(dir, ['lib/app.jar', 'assets/data.bin', 'assets/clean.bin'], owner))
  assert.deepEqual(findings.map((f) => [f.file, f.rule]), [
    ['lib/app.jar', 'known-value-in-binary'],
    ['assets/data.bin', 'known-value-in-binary'],
  ])
  assert.match(findings[0].value, /app\.jar!META-INF\/MANIFEST\.MF/)
  fs.rmSync(dir, { recursive: true })
})

test('the leak check ignores values too short to be meaningful', () => {
  assert.deepEqual(canaries({ names: [], emails: [], handles: ['abcd'] }, ['1234']), [])
  assert.deepEqual(findLeaks('a.bin', Buffer.from('abcd'), canaries({ names: [], emails: [], handles: ['abcd'] })), [])
})

function segment(marker, payload) {
  const len = Buffer.alloc(2)
  len.writeUInt16BE(payload.length + 2)
  return Buffer.concat([Buffer.from([0xff, marker]), len, payload])
}

function jpegWithMetadata() {
  const scan = Buffer.from([0xff, 0xda, 0x00, 0x08, 1, 2, 3, 4, 5, 6, 0xaa, 0xbb, 0xff, 0xd9])
  return {
    scan,
    file: Buffer.concat([
      Buffer.from([0xff, 0xd8]),
      segment(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'latin1')),
      segment(0xe1, Buffer.from('Exif\0\0Artist=Maria Silva GPS=-23.5,-46.6', 'latin1')),
      segment(0xe2, Buffer.from('ICC_PROFILE\0', 'latin1')),
      segment(0xfe, Buffer.from('taken by Maria Silva', 'latin1')),
      segment(0xdb, Buffer.alloc(65, 1)),
      scan,
    ]),
  }
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  return Buffer.concat([len, Buffer.from(type, 'latin1'), data, Buffer.alloc(4)])
}

test('JPEG metadata is stripped and the image data is kept byte for byte', () => {
  const { file, scan } = jpegWithMetadata()
  const { data, removed } = stripImageMetadata(file)
  assert.deepEqual(removed, ['EXIF/XMP', 'COM'])
  assert.ok(data.subarray(data.length - scan.length).equals(scan))
  assert.ok(data.includes(Buffer.from('JFIF')) && data.includes(Buffer.from('ICC_PROFILE')))
  assert.equal(data.includes(Buffer.from('Maria')), false)
})

test('PNG text chunks are stripped and image chunks are kept', () => {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const idat = pngChunk('IDAT', Buffer.from([1, 2, 3]))
  const png = Buffer.concat([sig, pngChunk('IHDR', Buffer.alloc(13)), pngChunk('tEXt', Buffer.from('Author\0Maria Silva')), idat, pngChunk('IEND', Buffer.alloc(0))])
  const { data, removed } = stripImageMetadata(png)
  assert.deepEqual(removed, ['tEXt'])
  assert.ok(data.includes(idat))
  assert.equal(data.includes(Buffer.from('Maria')), false)
})

test('redact strips image metadata, and the scan blocks images that still carry it', () => {
  const dir = workDirWith({ 'public/photo.jpg': jpegWithMetadata().file })
  assert.deepEqual(blocks(scanTree(dir, ['public/photo.jpg'], nobody)).map((f) => f.rule), ['image-metadata'])
  const result = redactTree(dir, ['public/photo.jpg'], nobody)
  assert.deepEqual(result.strippedMetadata, [{ file: 'public/photo.jpg', removed: ['EXIF/XMP', 'COM'] }])
  assert.deepEqual(blocks(scanTree(dir, ['public/photo.jpg'], owner)), [])
  fs.rmSync(dir, { recursive: true })
})

test('malformed images are left unchanged rather than corrupted', () => {
  const broken = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff])
  assert.deepEqual(stripImageMetadata(broken), { data: broken, removed: [] })
  assert.equal(stripImageMetadata(Buffer.from('GIF89a')), null)
})

test('nothing redact returns for reports carries a raw value, file paths included', () => {
  const dir = workDirWith({
    'public/cvMariaSilva.txt': 'Maria Silva\nmaria.silva@gmail.com\n',
    'docs/home.md': 'see /home/msilva-dev/notes\n',
  })
  const { rawOriginals, ...report } = redactTree(dir, ['public/cvMariaSilva.txt', 'docs/home.md'], owner)
  const serialized = JSON.stringify(report).toLowerCase()
  for (const raw of ['maria silva', 'mariasilva', 'maria.silva@gmail.com', 'msilva-dev']) {
    assert.equal(serialized.includes(raw), false, `report leaks ${raw}`)
  }
  assert.ok(rawOriginals.includes('maria.silva@gmail.com'), 'raw values are still handed to the leak check')
  fs.rmSync(dir, { recursive: true })
})

test('home-path user names are not used as substring canaries', () => {
  const dir = workDirWith({ 'a.md': 'path /home/maria/x\n', 'b.md': 'Mariana and Maria are test personas\n' })
  const { rawOriginals } = redactTree(dir, ['a.md', 'b.md'], nobody)
  assert.deepEqual(rawOriginals, [])
  assert.deepEqual(blocks(scanTree(dir, ['a.md', 'b.md'], nobody, [], rawOriginals)), [])
  fs.rmSync(dir, { recursive: true })
})

test('handle variants and personal mail domains are redacted, public providers are not', async () => {
  const { personalDomains } = await import('../skills/export/scripts/lib/identity.mjs')
  assert.deepEqual(personalDomains(['me@maria-silva.dev', 'x@gmail.com', 'y@uol.com.br']), ['maria-silva.dev'])
  const identity = { names: [], emails: [], handles: ['the-msilva'], domains: ['maria-silva.dev'] }
  const r = createRedactor(identity)
  const out = r.redactText('demo: https://superdoc.themsilva.online\nblog: https://maria-silva.dev/posts\nmail: https://gmail.com\n', 'README.md')
  assert.equal(out, 'demo: https://superdoc.exampleuser.online\nblog: https://example.com/posts\nmail: https://gmail.com\n')
  assert.deepEqual(blocks(scanText('README.md', out, identity)), [])
})

test('the audit finds pieces of the identity that no redaction pattern spells out', async () => {
  const { identityTokens } = await import('../skills/export/scripts/lib/leaks.mjs')
  const identity = { names: ['Maria Silva'], emails: ['maria.silva@gmail.com'], handles: ['the-msilva'], domains: [] }
  assert.deepEqual(identityTokens(identity).sort(), ['maria', 'msilva', 'silva', 'themsilva'])
  const content = Buffer.from('Photos: https://silva-photography.studio\nBuilt for the dev team\n')
  const hits = findLeaks('README.md', content, identityTokens(identity)).map((h) => h.value)
  assert.deepEqual(hits, ['s***a'])
  assert.deepEqual(blocks(scanText('README.md', content.toString(), identity)), [], 'precondition: the pattern scan misses it')
})
