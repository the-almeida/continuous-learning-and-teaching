import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import {
  PLACEHOLDER_TEXT, buildDocx, buildPdf, buildXlsx, documentText, isPlaceholder, personalDataReasons, placeholderFor,
} from '../skills/export/scripts/lib/documents.mjs'
import { redactTree } from '../skills/export/scripts/lib/redact.mjs'
import { scanTree } from '../skills/export/scripts/lib/scan.mjs'

const owner = { names: ['Maria Silva'], emails: ['maria.silva@gmail.com'], handles: [] }
const nobody = { names: [], emails: [], handles: [] }

function workDirWith(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'strip-ai-doc-test-'))
  for (const [rel, data] of Object.entries(files)) {
    const abs = path.join(dir, ...rel.split('/'))
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, data)
  }
  return dir
}

test('text is read from docx, xlsx and pdf', () => {
  assert.match(documentText('a.docx', buildDocx(['Hello', 'World'])), /Hello\nWorld/)
  assert.match(documentText('a.xlsx', buildXlsx([['Name', 'Email'], ['Ana', 'ana@corp.io']])), /ana@corp\.io/)
  assert.match(documentText('a.pdf', buildPdf(['Invoice 42'])), /Invoice 42/)
  assert.equal(documentText('a.docx', Buffer.from('not a zip')), null)
})

test('a document is personal when the owner, a real email, a CPF or a phone shows up', () => {
  assert.deepEqual(personalDataReasons('public/cvMariaSilva.docx', 'Senior engineer', owner), ['owner identity in file name'])
  assert.deepEqual(personalDataReasons('cv.docx', 'Maria Silva, engineer', owner), ['owner identity in content'])
  assert.deepEqual(personalDataReasons('list.xlsx', 'joao@empresa.com.br', nobody), ['real email in content'])
  assert.deepEqual(personalDataReasons('form.pdf', 'CPF 529.982.247-25', nobody), ['CPF in content'])
  assert.deepEqual(personalDataReasons('cv.pdf', 'Tel: (11) 98765-4321', nobody), ['phone number in content'])
  assert.deepEqual(personalDataReasons('spec.pdf', 'Build a marketplace. Contact: hiring@example.com', nobody), [])
})

test('placeholders keep the file type and are recognized as placeholders', () => {
  for (const ext of ['docx', 'xlsx', 'pdf', 'rtf']) {
    const data = placeholderFor(`x.${ext}`)
    assert.ok(isPlaceholder(`x.${ext}`, data), ext)
    assert.ok(documentText(`x.${ext}`, data).includes(PLACEHOLDER_TEXT[0]), ext)
  }
  assert.equal(placeholderFor('x.pptx'), null)
  assert.equal(placeholderFor('x.png'), null)
})

test('redact replaces a CV with a placeholder, renames it, and updates the code that loads it', () => {
  const cv = buildDocx(['Maria Silva', 'maria.silva@gmail.com', 'Experience: 10 years'])
  const dir = workDirWith({
    'public/cvMariaSilva.docx': cv,
    'public/spec.pdf': buildPdf(['Requirements for the challenge']),
    'app/page.tsx': '<Editor document="/cvMariaSilva.docx" />\n',
  })
  const result = redactTree(dir, ['public/cvMariaSilva.docx', 'public/spec.pdf', 'app/page.tsx'], owner)

  assert.deepEqual(result.replacedDocuments, [
    { file: 'public/cvJaneDoe.docx', reasons: ['owner identity in content', 'owner identity in file name', 'real email in content'] },
  ])
  const replaced = fs.readFileSync(path.join(dir, 'public', 'cvJaneDoe.docx'))
  assert.ok(isPlaceholder('cvJaneDoe.docx', replaced))
  assert.doesNotMatch(documentText('cvJaneDoe.docx', replaced), /Maria|Experience/)
  assert.equal(fs.existsSync(path.join(dir, 'public', 'cvMariaSilva.docx')), false)
  assert.equal(fs.readFileSync(path.join(dir, 'app', 'page.tsx'), 'utf8'), '<Editor document="/cvJaneDoe.docx" />\n')
  assert.ok(fs.readFileSync(path.join(dir, 'public', 'spec.pdf')).toString('latin1').includes('Requirements'), 'spec kept')

  const findings = scanTree(dir, ['public/cvJaneDoe.docx', 'public/spec.pdf', 'app/page.tsx'], owner)
  assert.deepEqual(findings.filter((f) => f.severity === 'block'), [])
  fs.rmSync(dir, { recursive: true })
})

test('a personal document without a placeholder builder is reported and still blocks', () => {
  const pptx = buildDocx(['Maria Silva']) // any zip package; .pptx has no builder
  const dir = workDirWith({ 'deck.pptx': pptx })
  const result = redactTree(dir, ['deck.pptx'], owner)
  assert.deepEqual(result.documentsNeedingAction, [{ file: 'deck.pptx', reasons: ['owner identity in content'] }])
  assert.equal(scanTree(dir, ['deck.pptx'], owner)[0].rule, 'document-with-pii')
  fs.rmSync(dir, { recursive: true })
})

test('redacting twice changes nothing and leaves no blocking finding', () => {
  const dir = workDirWith({ 'src/user.test.ts': 'expect(cpf).toBe("529.982.247-25")\nowner: maria.silva@gmail.com\n' })
  redactTree(dir, ['src/user.test.ts'], owner)
  const once = fs.readFileSync(path.join(dir, 'src', 'user.test.ts'), 'utf8')
  const second = redactTree(dir, ['src/user.test.ts'], owner)
  assert.deepEqual(second.changedFiles, [])
  assert.equal(fs.readFileSync(path.join(dir, 'src', 'user.test.ts'), 'utf8'), once)
  assert.deepEqual(scanTree(dir, ['src/user.test.ts'], owner).filter((f) => f.severity === 'block'), [])
  fs.rmSync(dir, { recursive: true })
})
