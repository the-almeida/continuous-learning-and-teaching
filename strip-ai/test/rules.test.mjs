import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  aiPathToRemove, classifyEmail, fakeCnpj, fakeCpf, isEnvFile, isValidCnpj, isValidCpf, mask,
} from '../skills/export/scripts/lib/rules.mjs'
import { scanText } from '../skills/export/scripts/lib/scan.mjs'
import { createRedactor, } from '../skills/export/scripts/lib/redact.mjs'

const noIdentity = { names: [], emails: [], handles: [] }

test('AI tooling paths are removed at the shallowest AI-only folder', () => {
  assert.equal(aiPathToRemove('.claude/commands/tdd.md'), '.claude')
  assert.equal(aiPathToRemove('apps/web/.cursor/rules/x.mdc'), 'apps/web/.cursor')
  assert.equal(aiPathToRemove('CLAUDE.md'), 'CLAUDE.md')
  assert.equal(aiPathToRemove('packages/api/AGENTS.md'), 'packages/api/AGENTS.md')
  assert.equal(aiPathToRemove('.github/copilot-instructions.md'), '.github/copilot-instructions.md')
  assert.equal(aiPathToRemove('.github/prompts/review.prompt.md'), '.github/prompts')
  assert.equal(aiPathToRemove('.aider.conf.yml'), '.aider.conf.yml')
})

test('ordinary project files are kept', () => {
  for (const p of ['README.md', 'src/agents/list.ts', '.github/workflows/ci.yml', 'docs/claude-shannon.md', '.vscode/settings.json']) {
    assert.equal(aiPathToRemove(p), null, p)
  }
})

test('emails are classified as fixture, service or real', () => {
  assert.equal(classifyEmail('alice@example.com'), 'fixture')
  assert.equal(classifyEmail('bob@qa.test'), 'fixture')
  assert.equal(classifyEmail('public@example.ingest.sentry.io'), 'fixture')
  assert.equal(classifyEmail('git@github.com'), 'service')
  assert.equal(classifyEmail('icon@2x.png'), 'not-email')
  assert.equal(classifyEmail('maria.silva@gmail.com'), 'real')
})

test('generated CPF and CNPJ placeholders pass check-digit validation', () => {
  for (let n = 1; n < 50; n++) {
    assert.ok(isValidCpf(fakeCpf(n)), fakeCpf(n))
    assert.ok(isValidCnpj(fakeCnpj(n)), fakeCnpj(n))
  }
  assert.equal(isValidCpf('111.111.111-11'), false)
  assert.equal(isValidCpf('123.456.789-00'), false)
})

test('env templates are not treated as env files with values', () => {
  assert.ok(isEnvFile('.env'))
  assert.ok(isEnvFile('.env.local'))
  assert.equal(isEnvFile('.env.example'), false)
  assert.equal(isEnvFile('.envrc'), false)
})

test('masking keeps only the edges of a value and caps the stars so length is hidden', () => {
  assert.equal(mask('maria.silva@gmail.com'), 'm********a@g***l.com')
  assert.equal(mask('abc'), '***')
})

test('scan blocks real secrets and leaves published examples alone', () => {
  const text = 'const a = "AKIAIOSFODNN7EXAMPLE"\nconst b = "AKIAZ7Q2LMN4PQR8STUV"\n'
  const findings = scanText('src/aws.ts', text, noIdentity).filter((f) => f.rule === 'aws-key')
  assert.deepEqual(findings.map((f) => [f.line, f.severity]), [[1, 'fixture'], [2, 'block']])
})

test('scan finds AI references in prose but not CSS cursors or DB cursors', () => {
  const text = 'Built with Claude Code.\n.btn { cursor: pointer }\nconst cursor = db.cursor()\n'
  const rules = scanText('README.md', text, noIdentity).filter((f) => f.severity === 'clean').map((f) => [f.rule, f.line])
  assert.deepEqual(rules, [['ai-claude', 1]])
})

test('scan finds the project-specific AI command names it is given', () => {
  const text = 'Run `/wc-tdd` then ask @wc-test-auditor.\n// @wc-test-auditor-allow: x\nsee src/wc-tdd.ts\n'
  const lines = scanText('docs/x.md', text, noIdentity, ['wc-tdd', 'wc-test-auditor'])
    .filter((f) => f.rule === 'ai-command')
    .map((f) => f.line)
  assert.deepEqual(lines, [1, 1, 2])
})

test('redaction is consistent: the same value always gets the same placeholder', () => {
  const r = createRedactor(noIdentity)
  const a = r.redactText('owner: maria.silva@gmail.com', 'a.ts')
  const b = r.redactText('expect(owner).toBe("Maria.Silva@gmail.com")', 'a.test.ts')
  assert.equal(a, 'owner: user1@example.com')
  assert.equal(b, 'expect(owner).toBe("user1@example.com")')
})

test('redaction replaces the owner identity in every spelling, keeping case style', () => {
  const identity = { names: ['Maria Silva'], emails: [], handles: ['msilva-dev'] }
  const r = createRedactor(identity)
  const out = r.redactText('Copyright Maria Silva\ncvMariaSilva.pdf\nmaria-silva\ngithub.com/msilva-dev/repo', 'LICENSE')
  assert.equal(out, 'Copyright Jane Doe\ncvJaneDoe.pdf\njane-doe\ngithub.com/example-user/repo')
  assert.equal(r.redactName('cvMariaSilva.pdf', 'x'), 'cvJaneDoe.pdf')
})

test('redaction keeps local fixture credentials and replaces remote ones', () => {
  const r = createRedactor(noIdentity)
  const out = r.redactText(
    'a=postgres://postgres:postgres@127.0.0.1:5432/db\nb=postgres://app:Zq8vL2pX9w@db.prod.acme.io/db',
    '.env.example',
  )
  assert.equal(out, 'a=postgres://postgres:postgres@127.0.0.1:5432/db\nb=postgres://app:REDACTED@db.prod.acme.io/db')
})

test('redacted values with valid check digits stay valid', () => {
  const r = createRedactor(noIdentity)
  const out = r.redactText('cpf: "529.982.247-25"', 'x.ts')
  const value = out.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/)[0]
  assert.notEqual(value, '529.982.247-25')
  assert.ok(isValidCpf(value))
})
