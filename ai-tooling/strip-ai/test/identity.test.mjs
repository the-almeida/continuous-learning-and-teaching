import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  collectIdentities, createIdentityMatcher, identityRules, identityTokens, matchCase, personalDomains,
} from '../skills/export/scripts/lib/identity.mjs'
import { commitAll, git, initRepo, owner, tempDir, write } from './helpers.mjs'

const replaceWith = (matcher, text) => matcher.replace(text, (m, rule) => matchCase(m, rule.placeholder))

test('people come from authors, co-authors, package.json, CODEOWNERS and the remote, never from system accounts or bots', (t) => {
  const dir = tempDir(t)
  initRepo(dir)
  write(dir, 'package.json', JSON.stringify({ author: 'Ana Lima <ana@lima.dev>' }))
  write(dir, 'CODEOWNERS', '* @carla-dev @acme/platform\n')
  commitAll(dir, 'init\n\nCo-authored-by: João Pereira <joao@empresa.com.br>\nCo-authored-by: Claude <noreply@anthropic.com>')
  git(dir, '-c', 'user.name=GitHub', '-c', 'user.email=noreply@github.com', 'commit', '-q', '--allow-empty', '-m', 'Merge pull request #1')
  git(dir, '-c', 'user.name=Your Name', '-c', 'user.email=you@example.com', 'commit', '-q', '--allow-empty', '-m', 'wip')
  git(dir, 'remote', 'add', 'origin', 'git@github.com:the-msilva/site.git')

  const id = collectIdentities(dir)
  assert.deepEqual([...id.names].sort(), ['Ana Lima', 'João Pereira', 'Maria Silva'])
  assert.ok(id.handles.includes('the-msilva') && id.handles.includes('carla-dev'))
  assert.ok(!id.handles.some((h) => h.includes('acme')))
  assert.ok(id.emails.includes('ana@lima.dev') && !id.emails.includes('noreply@anthropic.com') && !id.emails.includes('noreply@github.com'))
  assert.deepEqual([...id.domains].sort(), ['empresa.com.br', 'lima.dev'])
  assert.ok(id.dropped.some((d) => d.value === 'GitHub') && id.dropped.some((d) => d.value === 'Your Name'))
})

test('personal domains skip mailbox providers', () => {
  assert.deepEqual(personalDomains(['me@maria-silva.dev', 'x@gmail.com', 'y@uol.com.br', 'z@users.noreply.github.com']), ['maria-silva.dev'])
})

test('a name is matched in every spelling, with or without accents, keeping each occurrence casing', () => {
  const m = createIdentityMatcher(identityRules({ ...owner(), handles: [] }))
  assert.equal(
    replaceWith(m, 'María Silva, maria silva, MARIA SILVA, maria-silva-portfolio, cvMariaSilva.pdf, maria_silva, maria.silva, María Silva'),
    'Jane Doe, jane doe, JANE DOE, jane-doe-portfolio, cvJaneDoe.pdf, jane_doe, jane.doe, Jane Doe',
  )
})

test('a name is not matched inside other words', () => {
  const m = createIdentityMatcher(identityRules({ ...owner(), handles: [] }))
  assert.equal(replaceWith(m, 'Mariana Silvano and Silva Street'), 'Mariana Silvano and Silva Street')
})

test('long names also match by first and last token, handles also match joined', () => {
  const m = createIdentityMatcher(identityRules({ ...owner(), names: ['Maria A. B. Silva'] }))
  assert.equal(replaceWith(m, 'Maria Silva / github.com/the-msilva / superdoc.themsilva.online'), 'Jane Doe / github.com/example-user / superdoc.exampleuser.online')
})

test('placeholders skip values the project already uses and never contain a piece of the identity', () => {
  const used = new Set(['jane doe', 'example-user'])
  const rules = identityRules({ ...owner(), domains: ['maria-silva.dev'] }, (p) => used.has(p))
  const ph = (literal) => rules.find((r) => r.literal === literal).placeholder
  assert.equal(ph('Maria Silva'), 'Jane Roe')
  assert.equal(ph('the-msilva'), 'example-user-2')
  assert.equal(ph('maria-silva.dev'), 'personal-site.example')
  const janeOwner = identityRules({ ...owner(), names: ['Jane Doe'], handles: [] })
  assert.notEqual(janeOwner.find((r) => r.literal === 'Jane Doe').placeholder.toLowerCase(), 'jane doe')
})

test('two people never share a placeholder', () => {
  const rules = identityRules({ ...owner(), names: ['Maria Silva', 'Ana Lima'], handles: [] })
  const a = rules.find((r) => r.literal === 'Maria Silva').placeholder
  const b = rules.find((r) => r.literal === 'Ana Lima').placeholder
  assert.notEqual(a, b)
})

test('identity tokens are every piece longer than three letters, accents folded, common words left out', () => {
  assert.deepEqual(identityTokens({ ...owner(), names: ['María da Silva'], handles: ['the-msilva', 'code'] }), ['maria', 'maría', 'msilva', 'silva', 'themsilva'])
})
