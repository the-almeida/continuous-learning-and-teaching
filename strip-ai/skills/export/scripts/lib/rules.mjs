// Detection rules: AI tooling paths, AI references in text, PII and secrets.
// Pure functions only, so they can be unit tested without touching disk.

// Directories that only exist to configure AI assistants. Matched by name at any depth.
const AI_DIRS = new Set([
  '.claude', '.claude-plugin', '.cursor', '.windsurf', '.codeium', '.continue',
  '.cline', '.clinerules', '.roo', '.kiro', '.amazonq', '.junie', '.codex',
  '.gemini', '.openhands', '.augment', '.tabnine', '.qodo', '.specstory',
  '.agents', '.copilot', '.opencode', '.crush', '.trae', '.goose', '.bolt',
])

// Files that only exist to instruct or configure AI assistants. Matched by
// lowercase basename at any depth.
const AI_FILES = new Set([
  'claude.md', 'claude.local.md', 'agents.md', 'agent.md', 'gemini.md',
  '.cursorrules', '.cursorignore', '.cursorindexingignore', '.windsurfrules',
  '.clinerules', '.clineignore', '.roomodes', '.rooignore', '.rules',
  '.continuerc.json', '.continueignore', '.mcp.json', '.codeiumignore',
  '.geminiignore', '.copilotignore', 'copilot-instructions.md', 'llms.txt',
  'llms-full.txt', 'opencode.json', 'opencode.jsonc', '.goosehints',
  'crush.json', '.crush.json',
])

// Paths that are AI-specific only in a given location.
const AI_SUBPATHS = [
  '.github/instructions', '.github/prompts', '.github/chatmodes',
  '.github/agents', '.vscode/mcp.json', '.idea/mcp.json',
]

/**
 * Returns the path that should be deleted (the file itself or its AI-only
 * ancestor directory) or null when the path is not AI tooling.
 */
export function aiPathToRemove(relPath) {
  const parts = relPath.split('/')
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i].toLowerCase()
    const isLast = i === parts.length - 1
    if (!isLast && (AI_DIRS.has(seg) || seg.startsWith('.aider'))) {
      return parts.slice(0, i + 1).join('/')
    }
    if (isLast && (AI_FILES.has(seg) || seg.startsWith('.aider'))) return relPath
  }
  const lower = '/' + relPath.toLowerCase()
  for (const sub of AI_SUBPATHS) {
    const idx = lower.indexOf('/' + sub)
    if (idx === -1) continue
    const end = idx + sub.length + 1
    if (end === lower.length || lower[end] === '/') return relPath.slice(0, end - 1)
  }
  return null
}

const B = '(?<![A-Za-z0-9])'
const E = '(?![A-Za-z0-9])'

// AI references inside text. These are cleaned by judgment, never blocking.
export const AI_TEXT_RULES = [
  { id: 'ai-claude', re: new RegExp(`${B}claude${E}`, 'gi') },
  { id: 'ai-anthropic', re: /anthropic/gi },
  { id: 'ai-openai', re: /openai/gi },
  { id: 'ai-gpt', re: new RegExp(`${B}(chat-?gpt|gpt-?(3(\\.5)?|4(\\.1|o)?|5))${E}`, 'gi') },
  { id: 'ai-copilot', re: /copilot/gi },
  { id: 'ai-cursor', re: new RegExp(`${B}Cursor${E}|(?<![A-Za-z0-9_)\\]])\\.cursor(?:\\/|rules)`, 'g') },
  { id: 'ai-gemini', re: new RegExp(`${B}gemini${E}`, 'gi') },
  { id: 'ai-llm', re: new RegExp(`${B}llms?${E}`, 'gi') },
  { id: 'ai-agentic', re: /agentic/gi },
  { id: 'ai-agent', re: new RegExp(`${B}(coding|ai|llm|autonomous|sub)[ -]?agents?${E}`, 'gi') },
  { id: 'ai-acronym', re: new RegExp(`${B}AI${E}`, 'g') },
  {
    id: 'ai-tool',
    re: new RegExp(`${B}(aider|windsurf|codeium|tabnine|cline|roo-?code|kiro|opencode|codex|lovable|bolt\\.new|v0\\.dev)${E}`, 'gi'),
  },
  { id: 'ai-mcp', re: new RegExp(`${B}MCP${E}|[Mm]odel [Cc]ontext [Pp]rotocol`, 'g') },
  {
    id: 'ai-attribution',
    re: /(co-authored-by|generated (with|by)|written (with|by)|assisted by)[^\n]{0,60}?(claude|copilot|gpt|cursor|gemini|\bai\b|llm|codex)/gi,
  },
]

const FILE_EXTENSION_TLDS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif', 'ico', 'css', 'js', 'ts',
  'tsx', 'jsx', 'mjs', 'cjs', 'json', 'md', 'map', 'woff', 'woff2', 'ttf', 'eot',
  'mp4', 'webm', 'html', 'txt', 'yml', 'yaml', 'toml', 'lock', 'sh', 'py',
])

// Domains that are reserved or conventionally used as fixtures.
const FIXTURE_EMAIL_DOMAINS = new Set([
  'example.com', 'example.org', 'example.net', 'test.com', 'email.com',
  'domain.com', 'foo.com', 'bar.com', 'acme.com', 'localhost', 'mail.com',
])
const FIXTURE_EMAIL_SUFFIXES = ['.example', '.test', '.invalid', '.localhost', '.local']
const SERVICE_EMAILS = new Set(['git@github.com', 'git@gitlab.com', 'git@bitbucket.org', 'noreply@github.com'])

export const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g

/** True when the match is the `password@host` part of scheme://user:password@host, not an email. */
export function isUrlCredentialContext(text, index) {
  return /:\/\/[^\s/@'"]*:$/.test(text.slice(Math.max(0, index - 200), index))
}

/** 'fixture' | 'service' | 'real' | 'not-email' */
export function classifyEmail(email) {
  const lower = email.toLowerCase()
  const domain = lower.slice(lower.lastIndexOf('@') + 1)
  const tld = domain.slice(domain.lastIndexOf('.') + 1)
  if (FILE_EXTENSION_TLDS.has(tld)) return 'not-email'
  if (SERVICE_EMAILS.has(lower)) return 'service'
  if (FIXTURE_EMAIL_DOMAINS.has(domain)) return 'fixture'
  if (domain.split('.').includes('example')) return 'fixture'
  if ([...FIXTURE_EMAIL_DOMAINS].some((d) => domain.endsWith('.' + d))) return 'fixture'
  if (FIXTURE_EMAIL_SUFFIXES.some((s) => domain.endsWith(s))) return 'fixture'
  return 'real'
}

export const CPF_RE = /(?<!\d)\d{3}\.\d{3}\.\d{3}-\d{2}(?!\d)/g
export const CNPJ_RE = /(?<!\d)\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}(?!\d)/g

function digits(s) {
  return s.replace(/\D/g, '').split('').map(Number)
}

export function isValidCpf(value) {
  const d = digits(value)
  if (d.length !== 11 || d.every((x) => x === d[0])) return false
  for (const len of [9, 10]) {
    let sum = 0
    for (let i = 0; i < len; i++) sum += d[i] * (len + 1 - i)
    const check = ((sum * 10) % 11) % 10
    if (check !== d[len]) return false
  }
  return true
}

export function isValidCnpj(value) {
  const d = digits(value)
  if (d.length !== 14 || d.every((x) => x === d[0])) return false
  const weights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  for (const len of [12, 13]) {
    let sum = 0
    for (let i = 0; i < len; i++) sum += d[i] * weights[weights.length - len + i]
    const rest = sum % 11
    const check = rest < 2 ? 0 : 11 - rest
    if (check !== d[len]) return false
  }
  return true
}

const FAKE_CPF_PREFIX = '12345'
const FAKE_CNPJ_PREFIX = '1122'

/**
 * True for a valid CPF/CNPJ that is not a generated fake. Fakes keep valid
 * check digits so validators in tests still pass, so they need their own
 * marker (a fixed prefix), or a second scan would flag them as real.
 */
export function isRealCpf(value) {
  return isValidCpf(value) && !value.replace(/\D/g, '').startsWith(FAKE_CPF_PREFIX)
}

export function isRealCnpj(value) {
  return isValidCnpj(value) && !value.replace(/\D/g, '').startsWith(FAKE_CNPJ_PREFIX)
}

/** Builds a valid, formatted fake CPF from a counter so validation tests keep passing. */
const MAX_FAKES = 9999

function checkFakeCounter(n, kind) {
  if (!Number.isInteger(n) || n < 1 || n > MAX_FAKES) {
    // Wrapping around would map two different real values to one fake.
    throw new Error(`Cannot generate fake ${kind} #${n}: only ${MAX_FAKES} distinct fakes exist`)
  }
}

export function fakeCpf(n) {
  checkFakeCounter(n, 'CPF')
  const base = (FAKE_CPF_PREFIX + String(n).padStart(4, '0')).split('').map(Number)
  for (const len of [9, 10]) {
    let sum = 0
    for (let i = 0; i < len; i++) sum += base[i] * (len + 1 - i)
    base.push(((sum * 10) % 11) % 10)
  }
  const s = base.join('')
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`
}

export function fakeCnpj(n) {
  checkFakeCounter(n, 'CNPJ')
  const base = (FAKE_CNPJ_PREFIX + String(n).padStart(4, '0') + '0001').split('').map(Number)
  const weights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  for (const len of [12, 13]) {
    let sum = 0
    for (let i = 0; i < len; i++) sum += base[i] * weights[weights.length - len + i]
    const rest = sum % 11
    base.push(rest < 2 ? 0 : 11 - rest)
  }
  const s = base.join('')
  return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`
}

// High-confidence secret formats. `fake` builds the placeholder from the match.
export const SECRET_RULES = [
  {
    id: 'private-key',
    re: /-----BEGIN ([A-Z]+ )*PRIVATE KEY-----[\s\S]*?-----END ([A-Z]+ )*PRIVATE KEY-----/g,
    fake: () => '-----BEGIN PRIVATE KEY-----\nREDACTED\n-----END PRIVATE KEY-----',
  },
  { id: 'anthropic-key', re: /sk-ant-[A-Za-z0-9_-]{20,}/g, fake: () => 'sk-ant-REDACTED' },
  { id: 'openai-key', re: /(?<![A-Za-z0-9])sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}/g, fake: () => 'sk-REDACTED' },
  { id: 'aws-key', re: /(?<![A-Z0-9])(?:AKIA|ASIA)[0-9A-Z]{16}(?![A-Z0-9])/g, fake: (m) => m.slice(0, 4) + 'REDACTEDREDACTED' },
  { id: 'github-token', re: /(?<![A-Za-z0-9])(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})/g, fake: (m) => m.split('_')[0] + '_REDACTED' },
  { id: 'slack-token', re: /xox[baprs]-[A-Za-z0-9-]{10,}/g, fake: (m) => m.slice(0, 5) + 'REDACTED' },
  { id: 'slack-webhook', re: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/]+/g, fake: () => 'https://hooks.slack.com/services/REDACTED' },
  { id: 'google-api-key', re: /AIza[0-9A-Za-z_-]{35}/g, fake: () => 'AIzaREDACTED' },
  { id: 'stripe-key', re: /(?<![A-Za-z0-9])(?:sk|rk|pk)_(?:live|test)_[0-9A-Za-z]{16,}/g, fake: (m) => m.split('_').slice(0, 2).join('_') + '_REDACTED' },
  { id: 'stripe-webhook-secret', re: /whsec_[A-Za-z0-9]{20,}/g, fake: () => 'whsec_REDACTED' },
  { id: 'jwt', re: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, fake: () => 'eyJhbGciOiJub25lIn0.eyJyZWRhY3RlZCI6dHJ1ZX0.REDACTED' },
  { id: 'sentry-dsn', re: /https:\/\/[0-9a-f]{32}@[A-Za-z0-9.-]*sentry\.io\/\d+/g, fake: () => 'https://public@example.ingest.sentry.io/0' },
  { id: 'posthog-key', re: /phc_[A-Za-z0-9]{30,}/g, fake: () => 'phc_REDACTED' },
  { id: 'resend-key', re: /(?<![A-Za-z0-9])re_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/g, fake: () => 're_REDACTED' },
  { id: 'npm-token', re: /npm_[A-Za-z0-9]{36}/g, fake: () => 'npm_REDACTED' },
  { id: 'sendgrid-key', re: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g, fake: () => 'SG.REDACTED' },
]

/** Example values published by vendors; keeping them leaks nothing. */
export function isPublishedExample(value) {
  return /EXAMPLE|REDACTED|xxxxxxxx|0{16,}/i.test(value)
}

// scheme://user:password@host
export const URL_CREDENTIALS_RE = /([a-z][a-z0-9+.-]*:\/\/)([^:\s/@'"]+):([^@\s/'"]+)@([^\s/:'"?#]+)/gi
const PLACEHOLDER_PASSWORDS = /^(password|pass|passwd|postgres|secret|changeme|admin|root|test|example|redacted|\$\{.*\}|\$[A-Z_]+|<.*>|x+|\*+)$/i

export function isFixtureUrlCredential(password, host) {
  const h = host.toLowerCase()
  const localHost = ['localhost', '127.0.0.1', '0.0.0.0', 'host.docker.internal'].includes(h) || !h.includes('.')
  return localHost || PLACEHOLDER_PASSWORDS.test(password)
}

export const HOME_PATH_RE = /(\/home\/|\/Users\/|[A-Za-z]:(?:\\\\|\\|\/)Users(?:\\\\|\\|\/))([A-Za-z0-9._-]+)/g
export const GENERIC_USERS = new Set([
  'user', 'runner', 'root', 'node', 'ubuntu', 'vscode', 'codespace', 'admin',
  'administrator', 'public', 'default', 'shared', 'username', 'you', 'me',
  'name', 'ec2-user', 'pi', 'app', 'circleci', 'travis', 'jenkins', 'docker',
])

export const PHONE_RES = [
  /\(\d{2}\)\s?9?\d{4}-?\d{4}(?!\d)/g,
  /\+55\s?\(?\d{2}\)?\s?9?\d{4}-?\d{4}(?!\d)/g,
  /(?<![\d\w])\+\d{1,3}[\s.-]\(?\d{1,4}\)?[\s.-]\d{3,4}[\s.-]?\d{3,4}(?!\d)/g,
]

export const IPV4_RE = /(?<![\w.])(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?![\w.])/g
export function isPublicIp(parts) {
  const [a, b, c] = parts.map(Number)
  if (parts.some((p) => Number(p) > 255)) return false
  if (a === 10 || a === 127 || a === 0 || a >= 224) return false
  if (a === 172 && b >= 16 && b <= 31) return false
  if (a === 192 && b === 168) return false
  if (a === 169 && b === 254) return false
  if (a === 192 && b === 0 && c === 2) return false
  if (a === 198 && b === 51 && c === 100) return false
  if (a === 203 && b === 0 && c === 113) return false
  return true
}

export const GENERIC_SECRET_RE =
  /(api[_-]?key|secret|token|passw(?:or)?d|pwd|client[_-]?secret|access[_-]?key|private[_-]?key)["']?\s*[:=]\s*["']([^"'\s]{8,})["']/gi
const PLACEHOLDER_VALUE = /^(env\(|\$\{|\$[A-Z_]|process\.env|<|your|example|dummy|test|fake|placeholder|changeme|redacted|x{4,}|\*{4,})/i

export function looksLikeRealSecret(value) {
  if (PLACEHOLDER_VALUE.test(value)) return false
  const freq = {}
  for (const ch of value) freq[ch] = (freq[ch] ?? 0) + 1
  let entropy = 0
  for (const n of Object.values(freq)) {
    const p = n / value.length
    entropy -= p * Math.log2(p)
  }
  return entropy >= 3.5
}

export const DOCUMENT_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'odt', 'rtf', 'xls', 'xlsx', 'ods', 'csv', 'tsv',
  'ppt', 'pptx', 'odp', 'sqlite', 'sqlite3', 'db', 'mdb', 'eml', 'msg', 'vcf',
])

export const LOCKFILES = new Set([
  'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb', 'bun.lock',
  'poetry.lock', 'pdm.lock', 'uv.lock', 'cargo.lock', 'composer.lock',
  'gemfile.lock', 'go.sum', 'pipfile.lock', 'packages.lock.json',
])

/** True for .env files meant to hold real values (templates are excluded). */
export function isEnvFile(basename) {
  const b = basename.toLowerCase()
  if (!/^\.env(\..+)?$/.test(b)) return false
  return !/\.(example|sample|template|dist|defaults)$/.test(b)
}

/** Masks a sensitive value for reports: keeps first and last char and the TLD of emails. */
export function mask(value) {
  if (value.includes('@') && !value.includes(' ')) {
    const [local, domain] = [value.slice(0, value.lastIndexOf('@')), value.slice(value.lastIndexOf('@') + 1)]
    const tld = domain.slice(domain.lastIndexOf('.'))
    return `${maskPlain(local)}@${maskPlain(domain.slice(0, -tld.length))}${tld}`
  }
  return maskPlain(value)
}

function maskPlain(v) {
  if (v.length <= 4) return '*'.repeat(v.length)
  return v[0] + '*'.repeat(Math.min(v.length - 2, 8)) + v[v.length - 1]
}
