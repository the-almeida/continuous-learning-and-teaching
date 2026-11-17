// Which languages a project is made of, so the user can say which ones the
// export may contain (not every language is valid training data for every
// model). Detection uses file names, extensions and shebangs; types follow
// GitHub Linguist: programming, markup, data, prose, plus binary assets.
import fs from 'node:fs'
import path from 'node:path'
import { isBinary, native } from './files.mjs'
import { LOCKFILES } from './rules.mjs'

const P = 'programming'
const M = 'markup'
const D = 'data'
const T = 'prose'
const B = 'binary'

const BY_EXTENSION = {
  js: ['JavaScript', P], mjs: ['JavaScript', P], cjs: ['JavaScript', P], jsx: ['JavaScript', P],
  ts: ['TypeScript', P], mts: ['TypeScript', P], cts: ['TypeScript', P], tsx: ['TypeScript', P],
  py: ['Python', P], pyi: ['Python', P], pyw: ['Python', P], ipynb: ['Jupyter Notebook', M],
  rb: ['Ruby', P], erb: ['HTML+ERB', M], php: ['PHP', P], java: ['Java', P], kt: ['Kotlin', P], kts: ['Kotlin', P],
  scala: ['Scala', P], groovy: ['Groovy', P], gradle: ['Groovy', P], go: ['Go', P], rs: ['Rust', P],
  c: ['C', P], h: ['C', P], cc: ['C++', P], cpp: ['C++', P], cxx: ['C++', P], hpp: ['C++', P], hh: ['C++', P],
  cs: ['C#', P], csx: ['C#', P], fs: ['F#', P], fsx: ['F#', P], vb: ['Visual Basic .NET', P], swift: ['Swift', P],
  m: ['Objective-C', P], mm: ['Objective-C++', P], dart: ['Dart', P], lua: ['Lua', P], pl: ['Perl', P], pm: ['Perl', P],
  r: ['R', P], jl: ['Julia', P], ex: ['Elixir', P], exs: ['Elixir', P], erl: ['Erlang', P], hs: ['Haskell', P],
  clj: ['Clojure', P], cljs: ['Clojure', P], elm: ['Elm', P], ml: ['OCaml', P], zig: ['Zig', P], nim: ['Nim', P],
  sol: ['Solidity', P], sql: ['SQL', D], graphql: ['GraphQL', D], gql: ['GraphQL', D], prisma: ['Prisma', D],
  sh: ['Shell', P], bash: ['Shell', P], zsh: ['Shell', P], fish: ['fish', P], ps1: ['PowerShell', P],
  psm1: ['PowerShell', P], psd1: ['PowerShell', P], bat: ['Batchfile', P], cmd: ['Batchfile', P],
  vbs: ['VBScript', P], ahk: ['AutoHotkey', P], ahk2: ['AutoHotkey', P], au3: ['AutoIt', P],
  applescript: ['AppleScript', P], vim: ['Vim Script', P], el: ['Emacs Lisp', P], asm: ['Assembly', P], s: ['Assembly', P],
  html: ['HTML', M], htm: ['HTML', M], xhtml: ['HTML', M], vue: ['Vue', M], svelte: ['Svelte', M], astro: ['Astro', M],
  css: ['CSS', M], scss: ['SCSS', M], sass: ['Sass', M], less: ['Less', M], styl: ['Stylus', M],
  md: ['Markdown', T], mdx: ['MDX', M], markdown: ['Markdown', T], rst: ['reStructuredText', T], adoc: ['AsciiDoc', T],
  tex: ['TeX', M], txt: ['Text', T], org: ['Org', T],
  json: ['JSON', D], jsonc: ['JSON with Comments', D], json5: ['JSON5', D], yaml: ['YAML', D], yml: ['YAML', D],
  toml: ['TOML', D], xml: ['XML', D], csv: ['CSV', D], tsv: ['TSV', D], ini: ['INI', D], cfg: ['INI', D],
  conf: ['Config', D], properties: ['Java Properties', D], env: ['Dotenv', D], lock: ['Lockfile', D],
  proto: ['Protocol Buffer', D], tf: ['HCL', P], hcl: ['HCL', P], nix: ['Nix', P], dockerfile: ['Dockerfile', P],
  svg: ['SVG', D], ics: ['iCalendar', D],
  png: ['Images', B], jpg: ['Images', B], jpeg: ['Images', B], gif: ['Images', B], webp: ['Images', B], ico: ['Images', B],
  bmp: ['Images', B], tif: ['Images', B], tiff: ['Images', B], avif: ['Images', B], heic: ['Images', B],
  woff: ['Fonts', B], woff2: ['Fonts', B], ttf: ['Fonts', B], otf: ['Fonts', B], eot: ['Fonts', B],
  mp3: ['Audio and video', B], wav: ['Audio and video', B], ogg: ['Audio and video', B], mp4: ['Audio and video', B],
  webm: ['Audio and video', B], mov: ['Audio and video', B],
  zip: ['Archives', B], gz: ['Archives', B], tgz: ['Archives', B], tar: ['Archives', B], '7z': ['Archives', B], rar: ['Archives', B],
  pdf: ['Documents', B], docx: ['Documents', B], doc: ['Documents', B], xlsx: ['Documents', B], xls: ['Documents', B],
  pptx: ['Documents', B], odt: ['Documents', B],
  exe: ['Executables and libraries', B], dll: ['Executables and libraries', B], so: ['Executables and libraries', B],
  dylib: ['Executables and libraries', B], jar: ['Executables and libraries', B], wasm: ['Executables and libraries', B],
}

const BY_NAME = {
  dockerfile: ['Dockerfile', P], containerfile: ['Dockerfile', P], makefile: ['Makefile', P], gnumakefile: ['Makefile', P],
  'cmakelists.txt': ['CMake', P], gemfile: ['Ruby', P], rakefile: ['Ruby', P], podfile: ['Ruby', P], jenkinsfile: ['Groovy', P],
  procfile: ['Procfile', D], vagrantfile: ['Ruby', P], justfile: ['Just', P],
  '.gitignore': ['Ignore List', D], '.dockerignore': ['Ignore List', D], '.npmignore': ['Ignore List', D],
  '.prettierignore': ['Ignore List', D], '.eslintignore': ['Ignore List', D], '.gitattributes': ['Git Attributes', D],
  '.editorconfig': ['EditorConfig', D], '.npmrc': ['INI', D], '.nvmrc': ['Text', T], '.env': ['Dotenv', D],
  '.prettierrc': ['JSON', D], '.eslintrc': ['JSON', D], '.babelrc': ['JSON', D], '.swcrc': ['JSON', D], '.stylelintrc': ['JSON', D],
  '.bashrc': ['Shell', P], '.zshrc': ['Shell', P], '.profile': ['Shell', P],
  license: ['Text', T], licence: ['Text', T], copying: ['Text', T], notice: ['Text', T], authors: ['Text', T],
  readme: ['Text', T], changelog: ['Text', T], codeowners: ['CODEOWNERS', D],
}

const SHEBANGS = [
  [/\b(?:ba|z|k|da)?sh\b/, 'Shell'], [/\bpython[0-9.]*\b/, 'Python'], [/\bnode\b|\bbun\b/, 'JavaScript'],
  [/\bdeno\b|\bts-node\b|\btsx\b/, 'TypeScript'], [/\bruby\b/, 'Ruby'], [/\bperl\b/, 'Perl'], [/\bphp\b/, 'PHP'],
  [/\bpwsh\b/, 'PowerShell'], [/\blua\b/, 'Lua'],
]

/** { language, type } for one file. */
export function detectLanguage(relPath, head = Buffer.alloc(0)) {
  const base = path.posix.basename(relPath).toLowerCase()
  if (LOCKFILES.has(base)) return { language: 'Lockfile', type: D }
  if (BY_NAME[base]) return { language: BY_NAME[base][0], type: BY_NAME[base][1] }
  if (/(^|\/)\.husky\/[^/.]+$/.test(relPath)) return { language: 'Shell', type: P }
  if (/^\.env(\..+)?$/.test(base)) return { language: 'Dotenv', type: D }
  if (/^dockerfile[.-]/.test(base)) return { language: 'Dockerfile', type: P }
  const dot = base.lastIndexOf('.')
  const ext = dot > 0 ? base.slice(dot + 1) : dot === 0 ? base.slice(1) : ''
  if (BY_EXTENSION[ext]) return { language: BY_EXTENSION[ext][0], type: BY_EXTENSION[ext][1] }
  const first = head.subarray(0, 200).toString('utf8').split('\n')[0]
  if (first.startsWith('#!')) {
    for (const [re, language] of SHEBANGS) if (re.test(first)) return { language, type: P }
  }
  if (isBinary(head)) return { language: 'Other binary', type: B }
  return { language: ext ? `Unknown (.${ext})` : 'Unknown (no extension)', type: 'unknown' }
}

/** Languages in the given files: [{ language, type, files, lines, bytes, examples }], biggest first. */
export function languageBreakdown(workDir, files) {
  const by = new Map()
  for (const rel of files) {
    const abs = native(workDir, rel)
    let buf
    try {
      const st = fs.lstatSync(abs)
      buf = st.isFile() ? fs.readFileSync(abs) : Buffer.alloc(0)
    } catch {
      continue
    }
    const { language, type } = detectLanguage(rel, buf)
    const entry = by.get(language) ?? { language, type, files: 0, lines: 0, bytes: 0, examples: [], paths: [] }
    entry.files++
    entry.bytes += buf.length
    if (type !== B) entry.lines += buf.length ? buf.toString('utf8').split('\n').length - (buf[buf.length - 1] === 0x0a ? 1 : 0) : 0
    if (entry.examples.length < 3) entry.examples.push(rel)
    entry.paths.push(rel)
    by.set(language, entry)
  }
  return [...by.values()].sort((a, b) => b.bytes - a.bytes)
}
