import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  AI_TEXT_RULES, SECRET_ASSIGNMENT_RE, aiPathTerm, aiPathToRemove, classifyEmail, fakeCnpj, fakeCpf, isEnvFile,
  isRealCard, isRealCnpj, isRealCpf, isRealIban, isRealSsn, isValidCnpj, isValidCpf, mask,
} from '../skills/export/scripts/lib/rules.mjs'

const aiHits = (text) => AI_TEXT_RULES.flatMap(({ id, re }) => [...text.matchAll(re)].map((m) => [id, m[0]]))

test('AI tooling paths are removed at the shallowest AI-only folder', () => {
  assert.equal(aiPathToRemove('.claude/commands/tdd.md'), '.claude')
  assert.equal(aiPathToRemove('apps/web/.cursor/rules/x.mdc'), 'apps/web/.cursor')
  assert.equal(aiPathToRemove('CLAUDE.md'), 'CLAUDE.md')
  assert.equal(aiPathToRemove('packages/api/AGENTS.md'), 'packages/api/AGENTS.md')
  assert.equal(aiPathToRemove('.github/copilot-instructions.md'), '.github/copilot-instructions.md')
  assert.equal(aiPathToRemove('.github/prompts/review.prompt.md'), '.github/prompts')
  assert.equal(aiPathToRemove('.aider.conf.yml'), '.aider.conf.yml')
  for (const p of ['README.md', 'src/agents/list.ts', '.github/workflows/ci.yml', 'docs/claude-shannon.md', '.vscode/settings.json']) {
    assert.equal(aiPathToRemove(p), null, p)
  }
})

test('AI terms in file and folder names are found, ordinary names are not', () => {
  assert.equal(aiPathTerm('prompts/system.txt'), 'prompts')
  assert.equal(aiPathTerm('docs/ai-rules.md'), 'ai')
  assert.equal(aiPathTerm('notes/claude_session.md'), 'claude')
  for (const p of ['src/media/player.ts', 'src/main.ts', 'email/aim.ts', 'paint/brush.ts']) assert.equal(aiPathTerm(p), null, p)
})

test('AI references are found in English, Portuguese and Spanish', () => {
  const ids = (t) => aiHits(t).map(([id]) => id)
  assert.ok(ids('Este projeto foi feito com IA.').includes('ai-phrase'))
  assert.ok(ids('Um agente de inteligência artificial revisa o código.').includes('ai-phrase'))
  assert.ok(ids('Hecho con inteligencia artificial').includes('ai-phrase'))
  assert.ok(ids('This file is ai-generated.').includes('ai-lower'))
  assert.ok(ids('Gerado com Claude').includes('ai-attribution'))
  assert.ok(ids('Co-Authored-By: Copilot <x@y.z>').includes('ai-attribution'))
  assert.ok(ids('Built for coding agents').includes('ai-agent'))
})

test('CSS cursors, database cursors and words containing AI letters are not AI references', () => {
  assert.deepEqual(aiHits('.btn { cursor: pointer }\nconst cursor = db.cursor()\nMariana tem uma ideia. Email: aim@x.io'), [])
  assert.deepEqual(aiHits('ehTexto := A_Cursor = "IBeam"\nset_Cursor(Mouse_Cursor)'), [], "AutoHotkey's A_Cursor is the mouse cursor")
  assert.deepEqual(aiHits('"Cursor.exe", the Cursor IDE, (Cursor)').map(([id]) => id), ['ai-cursor', 'ai-cursor', 'ai-cursor'])
})

test('emails are classified as fixture, service or real', () => {
  assert.equal(classifyEmail('alice@example.com'), 'fixture')
  assert.equal(classifyEmail('bob@qa.test'), 'fixture')
  assert.equal(classifyEmail('public@example.ingest.sentry.io'), 'fixture')
  assert.equal(classifyEmail('git@github.com'), 'service')
  assert.equal(classifyEmail('icon@2x.png'), 'not-email')
  assert.equal(classifyEmail('maria.silva@gmail.com'), 'real')
})

test('generated CPF and CNPJ are valid, distinct from real ones, and never look real', () => {
  for (let n = 1; n < 200; n++) {
    assert.ok(isValidCpf(fakeCpf(n)) && !isRealCpf(fakeCpf(n)), fakeCpf(n))
    assert.ok(isValidCnpj(fakeCnpj(n)) && !isRealCnpj(fakeCnpj(n)), fakeCnpj(n))
  }
  assert.ok(isRealCpf('529.982.247-25'))
  assert.equal(isValidCpf('111.111.111-11'), false)
  assert.throws(() => fakeCpf(10000), /only 9999 distinct fakes/)
})

test('unquoted secrets in YAML, env and shell files are found, references to variables are not', () => {
  const text = 'db:\n  password: Zq8vL2pX9wRt\nexport API_TOKEN=ab12CD34ef56\nDB_PASSWORD=${DB_PASS}\nclient_secret: <your-secret>\n'
  const found = [...text.matchAll(SECRET_ASSIGNMENT_RE)].map((m) => m[1])
  assert.deepEqual(found, ['password', 'API_TOKEN'])
})

test('card numbers pass Luhn and a card range, published test cards and timestamps do not count', () => {
  assert.equal(isRealCard('4242 4242 4242 4242'), false)
  assert.equal(isRealCard('4111111111111111'), false)
  assert.equal(isRealCard('4539 1488 0343 6467'), true)
  assert.equal(isRealCard('4539 1488 0343 6468'), false)
  assert.equal(isRealCard('1700000000000'), false)
})

test('IBAN and SSN checks skip published examples', () => {
  assert.equal(isRealIban('DE89 3704 0044 0532 0130 00'), false)
  assert.equal(isRealIban('BR1800360305000010009795493C1'), true)
  assert.equal(isRealIban('BR1800360305000010009795493C2'), false)
  assert.equal(isRealSsn('123-45-6789'), false)
  assert.equal(isRealSsn('536-90-4399'), true)
})

test('env templates are not env files with values', () => {
  assert.ok(isEnvFile('.env') && isEnvFile('.env.local') && isEnvFile('.env.development'))
  assert.equal(isEnvFile('.env.example'), false)
  assert.equal(isEnvFile('.envrc'), false)
})

test('masking keeps only the edges and caps the stars so length is hidden', () => {
  assert.equal(mask('maria.silva@gmail.com'), 'm********a@g***l.com')
  assert.equal(mask('abc'), '***')
})
