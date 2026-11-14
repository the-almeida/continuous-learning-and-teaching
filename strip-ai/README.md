# strip-ai

A Claude Code plugin that exports a codebase as a clean zip: no AI-assistant traces, no PII, no secrets. The tests still pass.

```
/strip-ai:export [project-path]
```

Without a path it exports the current project. The output lands next to the project folder:

- `<name>-clean.zip`: the code, under a `<name>/` root folder, without `.git` and with `.gitignore` respected.
- `<name>-clean.report.md`: what was removed, what was redacted (masked), the test results before and after, and which tests were coupled to PII.

The original project is never modified. Everything happens in a temp copy.

## What it does

1. **Copies** the tracked and untracked, non-ignored files to a temp work dir. `node_modules`, build output and ignored `.env` files stay out.
2. **Runs the project's checks** (typecheck, lint, tests) to get a baseline.
3. **Deletes AI tooling**: `.claude/`, `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.cursor/`, `.cursorrules`, `.windsurfrules`, `.github/copilot-instructions.md`, `.github/prompts/`, `.aider*`, `.mcp.json`, `llms.txt` and others.
4. **Cleans AI references** in docs, code, scripts and CI: sentences about coding agents, links to removed files, `/command` and `@agent` mentions of the removed commands, `Co-Authored-By` lines, env checks like `CLAUDE_CODE_*`, and project names like `*-agentic-*`. Product code that calls an AI API is kept and listed in the report.
5. **Redacts PII and secrets** with consistent placeholders:
   - Emails become `user1@example.com`.
   - The owner's name in every spelling becomes `Jane Doe` / `JaneDoe` / `jane-doe`, filenames included.
   - Home paths become `/home/user`.
   - CPF and CNPJ get fakes with valid check digits.
   - API keys, tokens, private keys and remote DB passwords become `REDACTED`.
   - Documents with personal data (a CV, a customer spreadsheet) keep their name and type, but their content is replaced by a placeholder. Code that loads them still works. Placeholders can be generated for `.docx`, `.xlsx`, `.pdf` and `.rtf`. Other formats are flagged so Claude writes a neutral file of the same type.
   - EXIF, XMP and text metadata (author, GPS) are stripped from JPEG and PNG.
   - Any value redacted somewhere is also replaced wherever it appears verbatim.
6. **Re-runs the checks.** Any new failure is fixed in the test data, never by skipping a test, and recorded in the report's "Tests coupled to PII" table.
7. **Zips**, then proves the result. The script refuses to zip while AI files, env files with values, high-confidence PII, or any known sensitive value remains. That last check searches the raw bytes of every file, including inside docx/jar, gzip and PDF streams, and in UTF-16.
8. **Audits the zip** independently. Each piece of the owner's identity (first name, surname, handle parts, domain labels) is searched on its own, to catch spellings the redaction rules did not know.

The deterministic steps live in `skills/export/scripts/strip-ai.mjs`: plain Node, no dependencies, the same on Windows, macOS and Linux. Claude does the judgment steps (4, the review half of 5, 6 and the audit decisions in 8).

## Install

Requirements: Claude Code 2.1.275+, Node 18+, git.

Run this once per machine:

```bash
claude plugin install strip-ai --marketplace the-almeida/continuous-learning-and-teaching
```

Or, from inside a session:

```
/plugin install strip-ai --marketplace the-almeida/continuous-learning-and-teaching
```

What counts as a machine:
- **Windows:** PowerShell, the desktop app's Code tab and VS Code all read `%USERPROFILE%\.claude`, so one install covers them.
- **Ubuntu / WSL:** it has its own `~/.claude`, so install once more there.
- **Cloud sessions (claude.ai/code):** they don't read your user plugins. Running the export there would need the plugin declared in each repo's `.claude/settings.json`, which is the kind of file this tool removes.

## Update

```bash
claude plugin marketplace update the-almeida
```

```bash
claude plugin update strip-ai@the-almeida
```

## Develop

```bash
node --test strip-ai/test/*.test.mjs
```

```bash
claude plugin validate .
```

To use the script without Claude, run the deterministic steps by hand:

```bash
node strip-ai/skills/export/scripts/strip-ai.mjs prepare ../some-project
```

It prints a `workRoot`. Then run `strip`, `scan`, `redact`, `zip`, `audit` and `cleanup` with that `workRoot`.

## Limits

- Names are found from git metadata (commit authors, `git config`, remote owner), the OS user and `package.json`. Other people's names in comments or seeds rely on Claude's review in step 5, not on a pattern.
- Every file is checked: text by patterns, documents as a whole, JPEG/PNG for metadata, and every other binary by a byte-level search for known values. Only files over 50 MB are skipped, and they are reported as `not-scanned`.
- The byte-level search finds known values only, not unknown PII inside a binary. A compiled asset with a stranger's name in it gets through unless Claude's review catches it.
- PDF text extraction is best effort: fonts with custom encodings can hide text from the script, so documents with no detected data are still flagged for Claude to review.
- Image metadata is stripped from JPEG and PNG only. WebP, HEIC, TIFF and GIF metadata is searched for known values but not stripped.
- Archives are plain ZIP (no ZIP64): up to 65,534 files and 4 GB.
