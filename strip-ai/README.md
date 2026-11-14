# strip-ai

A Claude Code plugin that exports a codebase as a clean zip: no AI-assistant traces, no PII, no secrets, the project's checks still passing, and the zip verified by an independent extractor.

```
/strip-ai:export [project-path]
```

Without a path it exports the current project. The output lands next to the project folder:

- `<name>-clean.zip`: the code under a `<name>/` root folder, without `.git`. The `.gitignore` is respected, and files the project tracks are kept even when they match it.
- `<name>-clean.report.md`: what was removed and redacted (values masked), the checks before and after, every decision with its reason, and what was not exported or not verified.

The original project is never modified. Everything happens in a private copy.

## Plugin or skill?

A **plugin** is the package you install. It can bundle commands, skills, agents and hooks. A **skill** is one capability inside it: instructions plus the files they use. This plugin (`strip-ai`) ships one skill (`export`), so you run it as `/strip-ai:export`. Installing the plugin is what makes the skill available on every machine.

## Why it can be trusted

Every step that can be checked is checked by a script, not left to the model's diligence:

- **Every change is a diff.** The private copy is a git repo with a baseline commit, so the export can tell exactly what changed. It refuses the zip when a test file was deleted, a skip/only marker was added, or assertions went down.
- **Nothing is skipped silently.** Every file lands in one bucket:
  - **Text** is checked with patterns.
  - **Documents** are judged as a whole, and a CV becomes a same-type placeholder.
  - **JPEG and PNG** have their metadata stripped.
  - **Every other binary** goes through a byte-level search that unpacks docx, jar, gzip and PDF streams and reads UTF-16.
  - **Files over 50 MB** are reported as not scanned.
- **No blanket override.** Each finding needs a fix or an explicit decision (`allow <id> --reason`). Vague reasons are refused, some findings can never be allowed, and every decision goes into the report.
- **Checks are records, not recollections.** The script runs the project's checks before and after cleaning and stores each exit code with a fingerprint of the files it ran against. It refuses the zip if a final check is missing, ran on different files, or regressed without a reason.
- **The zip is verified by different code.** After writing the zip, the script extracts it with Python's zipfile, Info-ZIP unzip, bsdtar or PowerShell's Expand-Archive. It compares every file byte for byte and scans the extracted files again. On any problem the zip is deleted.
- **The report is checked too.** `finalize` refuses a report that still has TODO sections, that does not match the zip's SHA-256, or that leaks a name, an email or a secret.
- **Reproducible.** The same files always give the same bytes, with fixed timestamps and a stable order. The report records the zip's SHA-256.

## What it removes and redacts

- **AI tooling**: `.claude/`, `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.cursor/`, `.cursorrules`, `.windsurfrules`, `.github/copilot-instructions.md`, `.github/prompts/`, `.aider*`, `.mcp.json`, `llms.txt` and more.
- **AI references**, cleaned by Claude: prose about assistants and coding agents (English, Portuguese and Spanish: "feito com IA", "inteligência artificial"), mentions of the removed commands and agents, attribution lines, AI terms in file names, env checks and CI steps for AI tools. Product code that calls an AI API is kept and recorded as a decision.
- **People**:
  - **Where the names come from**: commit authors and co-authors, git config, the remote owner, the OS user, `package.json` and CODEOWNERS. Claude adds more from an inventory of domains, social profiles and author lines.
  - **How they are matched**: in every spelling (`Maria Silva`, `MariaSilva`, `maria-silva`, `maria.silva`), with or without accents, inside file names too.
  - **What is skipped**: system accounts (GitHub web merges) and common words are never treated as people.
- **Placeholders that do not collide**: an email becomes `userN@example.com`, a name `Jane Doe`, a handle `example-user`, a personal domain `personal-site.example`. A placeholder the project already uses (a fixture `user1@example.com`) is skipped, so uniqueness and comparisons in tests hold. The same original always gets the same placeholder.
- **Other PII and secrets**:
  - **Replaced automatically**:
    - CPF and CNPJ, with fakes that keep valid check digits;
    - home paths;
    - private keys and known token formats (AWS, GitHub, Slack, Stripe, OpenAI, Anthropic, JWT, Sentry, PostHog, Resend, npm, SendGrid);
    - passwords in remote URLs.
  - **Flagged for review**: unquoted secrets in YAML or env files, card numbers (Luhn check, published test cards excepted), IBAN, SSN, phone numbers and public IPs.
- **Export hygiene**:
  - **Symlinks** pointing outside the project are not followed, so no outside file ever ends up in the zip.
  - **Line endings** that a Windows checkout turned into CRLF are restored to LF.
  - **Files never committed** in the original project, and files created during the export, each need a decision.

## Install

Requirements: Claude Code 2.1.275+, Node 18+ and git. For the independent zip check you also need Python, unzip or bsdtar; PowerShell covers it on Windows. Without any of these, the check falls back to the built-in reader and says so.

Run this once per machine:

```bash
claude plugin install strip-ai --marketplace the-almeida/continuous-learning-and-teaching
```

Or, from inside a session:

```
/plugin install strip-ai --marketplace the-almeida/continuous-learning-and-teaching
```

What counts as a machine:
- **Windows**: PowerShell, the desktop app's Code tab and VS Code all read `%USERPROFILE%\.claude`, so one install covers them.
- **Ubuntu / WSL**: it has its own `~/.claude`, so install once more there.
- **Cloud sessions**: they do not read user plugins.

## Update

```bash
claude plugin marketplace update the-almeida
```

```bash
claude plugin update strip-ai@the-almeida
```

## Develop

```bash
node --test "strip-ai/test/*.test.mjs"
```

```bash
claude plugin validate .
```

The script also runs without Claude. `status` always names the next step:

```bash
node strip-ai/skills/export/scripts/strip-ai.mjs prepare ../some-project
```

## Limits

- **Unknown people inside binaries**: the byte-level search finds known values only. A stranger's name inside a compiled asset gets through unless Claude's review catches it.
- **PDF text extraction** is best effort, so documents with no detected data still get a review finding.
- **Image metadata** is stripped from JPEG and PNG only. WebP, HEIC, TIFF and GIF are searched for known values, and they need a decision.
- **Shallow clones** only show recent commit authors. `prepare` warns about it.
- **Archive size**: plain ZIP (no ZIP64), so up to 65,534 files and 4 GB.
