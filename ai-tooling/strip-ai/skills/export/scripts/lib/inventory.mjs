// Candidate identifiers the git metadata does not know about: personal
// domains, social profiles, author and copyright lines, emails. Claude
// reviews this list before redaction and adds what identifies a real person
// with `identity add`. Raw values: printed to the local session only, never
// written into the report.
import { native, readText } from './files.mjs'
import { EMAIL_RE, classifyEmail } from './rules.mjs'

// Hosts that identify a product or a platform, not a person.
const WELL_KNOWN = [
  'github.com', 'githubusercontent.com', 'github.io', 'gitlab.com', 'bitbucket.org', 'npmjs.com', 'npmjs.org',
  'yarnpkg.com', 'pnpm.io', 'nodejs.org', 'deno.land', 'jsr.io', 'unpkg.com', 'jsdelivr.net', 'cdnjs.cloudflare.com',
  'google.com', 'googleapis.com', 'gstatic.com', 'googleusercontent.com', 'youtube.com', 'youtu.be', 'microsoft.com',
  'azure.com', 'windows.net', 'office.com', 'live.com', 'apple.com', 'icloud.com', 'amazon.com', 'amazonaws.com',
  'aws.amazon.com', 'cloudflare.com', 'vercel.com', 'vercel.app', 'netlify.com', 'netlify.app', 'heroku.com',
  'supabase.co', 'supabase.com', 'firebase.google.com', 'firebaseio.com', 'sentry.io', 'posthog.com', 'stripe.com',
  'paypal.com', 'twilio.com', 'sendgrid.com', 'resend.com', 'upstash.com', 'mongodb.com', 'postgresql.org',
  'mysql.com', 'redis.io', 'docker.com', 'docker.io', 'kubernetes.io', 'python.org', 'pypi.org', 'readthedocs.io',
  'rust-lang.org', 'crates.io', 'golang.org', 'go.dev', 'java.com', 'oracle.com', 'mozilla.org', 'w3.org',
  'whatwg.org', 'schema.org', 'json-schema.org', 'ietf.org', 'wikipedia.org', 'stackoverflow.com', 'reddit.com',
  'twitter.com', 'x.com', 'linkedin.com', 'facebook.com', 'instagram.com', 'medium.com', 'dev.to', 'discord.com',
  'discord.gg', 'slack.com', 'notion.so', 'figma.com', 'typescriptlang.org', 'react.dev', 'reactjs.org',
  'nextjs.org', 'vuejs.org', 'angular.io', 'svelte.dev', 'vitejs.dev', 'vitest.dev', 'jestjs.io', 'playwright.dev',
  'tailwindcss.com', 'ui.shadcn.com', 'radix-ui.com', 'eslint.org', 'prettier.io', 'babeljs.io', 'webpack.js.org',
  'drizzle.team', 'prisma.io', 'zod.dev', 'example.com', 'example.org', 'example.net', 'localhost', 'shields.io',
  'img.shields.io', 'badge.fury.io', 'codecov.io', 'circleci.com', 'travis-ci.org', 'travis-ci.com', 'renovatebot.com',
  'opensource.org', 'creativecommons.org', 'gnu.org', 'apache.org', 'semver.org', 'keepachangelog.com',
  'conventionalcommits.org', 'claude.ai', 'claude.com', 'anthropic.com', 'openai.com', 'help.github.com', 'docs.github.com',
]

function isWellKnown(host) {
  return WELL_KNOWN.some((d) => host === d || host.endsWith(`.${d}`)) || /^(\d+\.){3}\d+$/.test(host)
}

const PROFILE_RES = [
  /(?:^|\.)github\.com\/(?!orgs\/|sponsors\/|features|pricing|about|apps\/|marketplace|topics|login)([A-Za-z0-9-]{2,39})/i,
  /(?:^|\.)gitlab\.com\/([A-Za-z0-9_.-]{2,})/i,
  /(?:^|\.)linkedin\.com\/in\/([A-Za-z0-9_%-]{2,})/i,
  /(?:^|\.)(?:twitter|x)\.com\/(?!intent|share|home|i\/)([A-Za-z0-9_]{2,15})/i,
  /(?:^|\.)instagram\.com\/([A-Za-z0-9_.]{2,30})/i,
  /(?:^|\.)facebook\.com\/(?!sharer|share|dialog|tr\b)([A-Za-z0-9.]{2,})/i,
  /(?:^|\.)medium\.com\/@([A-Za-z0-9_.-]{2,})/i,
  /(?:^|\.)dev\.to\/([A-Za-z0-9_]{2,})/i,
  /(?:^|\.)youtube\.com\/(?:@|c\/|user\/)([A-Za-z0-9_.-]{2,})/i,
  /(?:^|\.)(?:t\.me|wa\.me|linktr\.ee|about\.me|ko-fi\.com|buymeacoffee\.com|patreon\.com|behance\.net|dribbble\.com)\/([A-Za-z0-9_.+-]{2,})/i,
]

const AUTHOR_RES = [
  /copyright\s*(?:\(c\)|©)?\s*(?:\d{4}(?:\s*[-–]\s*\d{4})?,?\s*)?([^\n]{2,80})/gi,
  /@author\s+([^\n*]{2,80})/g,
  /"author"\s*:\s*"([^"]{2,80})"/g,
  /^\s*authors?\s*=\s*\[([^\]]{2,200})\]/gim,
  /^\s*(?:author|autor|maintainer|mantenedor|created by|criado por)s?\s*[:=]\s*([^\n]{2,80})/gim,
]
const PEOPLE_FILES = /(^|\/)(AUTHORS|CONTRIBUTORS|MAINTAINERS|CODEOWNERS|FUNDING\.ya?ml|\.mailmap|CITATION\.cff|humans\.txt)$/i

function bump(map, key, file) {
  const entry = map.get(key) ?? { value: key, count: 0, first: file }
  entry.count++
  map.set(key, entry)
}

export function buildInventory(workDir, files) {
  const emails = new Map()
  const domains = new Map()
  const profiles = new Map()
  const authors = new Map()
  for (const rel of files) {
    const text = readText(native(workDir, rel))
    if (text === null) continue
    for (const m of text.matchAll(EMAIL_RE)) if (classifyEmail(m[0]) === 'real') bump(emails, m[0].toLowerCase(), rel)
    for (const m of text.matchAll(/https?:\/\/([A-Za-z0-9.-]+\.[A-Za-z]{2,})(?::\d+)?(\/[^\s"'<>)\]`]*)?/g)) {
      const host = m[1].toLowerCase().replace(/^www\./, '')
      const url = host + (m[2] ?? '')
      for (const re of PROFILE_RES) {
        const p = re.exec(url)
        if (p) bump(profiles, `${host}/${p[1]}`, rel)
      }
      if (!isWellKnown(host)) bump(domains, host, rel)
    }
    for (const re of AUTHOR_RES) for (const m of text.matchAll(re)) bump(authors, m[1].trim(), rel)
    if (PEOPLE_FILES.test(rel)) {
      for (const line of text.split('\n').slice(0, 50)) if (line.trim() && !line.trim().startsWith('#')) bump(authors, line.trim().slice(0, 120), rel)
    }
  }
  const top = (map) => [...map.values()].sort((a, b) => b.count - a.count).slice(0, 100)
  return { emails: top(emails), domains: top(domains), profiles: top(profiles), authorLines: top(authors) }
}
