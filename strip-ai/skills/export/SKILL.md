---
name: export
description: Export a codebase as a zip with every AI-assistant trace removed and PII/secrets redacted, tests re-run and fixed, plus a report. Use only when the user runs /strip-ai:export.
argument-hint: "[project-path]"
disable-model-invocation: true
---

# Strip AI and PII, then zip

Produce `<parent-of-project>/<name>-clean.zip` and `<name>-clean.report.md`. The zip has no AI tooling, no AI references, and no PII or secrets, and the project's checks still pass as they did before.

Work autonomously. Do not ask for confirmation between steps: the user chose automatic cleaning. Stop and ask only if the project cannot be found or a step fails in a way you cannot fix.

**Never modify the original project.** Every edit happens in the work dir that `prepare` creates.

The helper script (Node 18+, no dependencies) does the deterministic parts:

```
node "${CLAUDE_SKILL_DIR}/scripts/strip-ai.mjs" <command> ...
```

Below, `SA` stands for that command prefix, and `$WR` for the `workRoot` printed by `prepare`.

## 1. Prepare

Project = `$ARGUMENTS` if given, otherwise the current working directory (its git top level if inside a repo).

```
SA prepare "<project>"
```

This copies tracked plus untracked, non-ignored files into a temp work dir (so `.git`, `node_modules`, build output and ignored `.env` files are not copied) and records who owns the repo (commit authors, git config, remote owner, OS user) for redaction. Note `workRoot` and `workDir`.

## 2. Baseline checks (before changing anything)

Find the project's validation commands: `package.json` scripts (`typecheck`, `lint`, `test`, `test:unit`, `test:int`...), `Makefile`, `pyproject.toml` / `pytest`, `go test ./...`, `cargo test`, CI workflow steps. In a monorepo, cover each package that has them.

In the work dir:
1. `SA env-in $WR` copies the source's git-ignored `.env*` files in. Tests often need them. They stay ignored, so they never reach the zip.
2. Install dependencies with the lockfile's package manager in frozen mode (`pnpm install --frozen-lockfile`, `npm ci`, `yarn install --immutable`, `pip install -r ...`, etc.).
3. Run each command and record the result: pass or fail, and the failing test names.

Run unit tests, typecheck and lint at minimum. Run integration tests when their services are already available. Skip e2e/browser suites unless they are quick. Record anything skipped and why. Pre-existing failures are fine: this is the baseline you compare against later.

## 3. Remove AI tooling files

```
SA strip $WR
```

This deletes AI-only files and folders (`.claude/`, `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.cursor/`, `.cursorrules`, `.windsurfrules`, `.github/copilot-instructions.md`, `.github/prompts/`, `.aider*`, `.mcp.json`, `llms.txt`, and similar). It prints `aiCommandNames`, the names of the removed commands, skills and agents. The scan then looks for `/name` and `@name` references to them.

## 4. Clean AI references

```
SA scan $WR
```

Every `clean` finding shows the line. Fix each one in the work dir with these rules, without asking:

- **Prose about AI tooling** (assistants, coding agents, slash commands, prompts, AI-driven workflows, "engineered for agentic coding"): delete the sentence, bullet, table row or section. Keep what remains coherent: renumber lists, fix grammar, and drop headings that end up empty.
- **References to removed files** (links to `CLAUDE.md`, "see `.claude/...`"): remove the reference.
- **Docs whose main purpose is AI workflow** (a skill guide, an "AI conventions" doc, an ADR about coding agents): delete the file and every link to it. If only one section of a doc is AI-related, delete only that section.
- **Attribution** (`Co-Authored-By: Claude`, "Generated with ..."), wherever it appears: delete it.
- **Code and config**: remove branches, env checks (`CLAUDE_CODE_*`, `CURSOR_*`), hook logic, scripts, CI jobs and steps that exist only for AI tools. Keep the rest of the file working. A script used only by AI tooling (for example a cloud-session bootstrap launched by a removed hook) gets deleted.
- **Names with AI terms** (project or package named `*-agentic-*`, `ai-starter`): rename by dropping the term (`acme-agentic-base` becomes `acme-base`). Apply the rename everywhere the name appears (package manifests, config ids, page titles, README) and use the new name for the zip.
- **Comments pointing to deleted docs**: drop the pointer and keep the comment's useful part.
- **Leave alone**: false positives (CSS `cursor`, DB cursors, `AI` inside unrelated identifiers, third-party license text) and **AI product features**. If the product itself calls an AI API (SDK dependency, model calls, prompts used at runtime), that is application code, not assistant tooling. Keep it and list it under "Kept: AI product integrations" in the report.

Re-run `SA scan $WR` until every remaining `clean` finding is one you deliberately kept.

## 5. Redact PII and secrets

```
SA redact $WR
```

This replaces high-confidence items with consistent placeholders. The same original value always becomes the same placeholder:
- Real emails become `userN@example.com`. Fixture domains such as `example.com` and `.test` are kept.
- Owner names in every spelling (`Maria Silva`, `MariaSilva`, `maria-silva`) become `Jane Doe` / `JaneDoe` / `jane-doe`. Handles become `example-user`, and their joined form (`the-msilva` → `themsilva`, as in a personal domain) becomes `exampleuser`. Domains of the owner's own mailboxes (not gmail and other providers) become `example.com`. Files are renamed too (`cvMariaSilva.pdf` becomes `cvJaneDoe.pdf`).
- Home paths (`/home/maria`, `C:\Users\maria`) become `/home/user` and `C:\Users\user`.
- CPF and CNPJ are replaced with fakes that still have valid check digits.
- **Documents with personal data** (the owner's name in the file name or content, or a real email, CPF, CNPJ or phone in the content) get their **content replaced by a placeholder of the same type** (`.docx`, `.xlsx`, `.pdf`, `.rtf`). The file stays where it is, under its redacted name, so code that loads it still works. `redact` lists them under `replacedDocuments`.
- Known secret formats (private keys, AWS, GitHub, Slack, Stripe, OpenAI/Anthropic, JWT, Sentry DSN, PostHog, Resend, npm, SendGrid) and remote URL passwords become `...REDACTED`.
- **Verbatim copies**: after the pattern pass, every replaced email, ID, secret and password is also replaced wherever it appears as plain text, even where no pattern matches (a URL password that a test also hardcodes).
- **Image metadata** (EXIF, XMP, IPTC, comments, PNG text chunks: author, camera owner, GPS) is stripped from every JPEG and PNG. Pixels are untouched. EXIF orientation goes with it, so note photos that may now display rotated. `redact` lists them under `strippedImageMetadata`.

`redact` rescans its own output and prints `remainingBlocking`. Anything listed there is something it could not fix by itself. Handle it below before moving on.

Then run `SA scan $WR` and handle every `block` and `review` finding by hand, using the same placeholder style:
- **`redacted-value-left`**: a value already redacted elsewhere is still present in a form the literal pass missed (split across lines, escaped, base64). Replace it with the placeholder `redactions.json` assigned to it.
- **`known-value-in-binary`**: the owner's identity or a redacted value inside a binary or packaged file (a `.jar` manifest, a compiled asset, a UTF-16 resource, a gzip). The `where` part names the inner file. Rebuild the binary from cleaned source if the project can. Otherwise replace the file with a neutral one of the same type, or delete it if nothing uses it.
- **`image-metadata`**: an image whose format the script cannot strip (it only strips JPEG and PNG). Re-encode it without metadata, or replace it.
- **`not-scanned`** (files over 50 MB): open them and decide by hand. Say so in the report under "Not verified".
- **`env-file-with-values`**: blank real secret values. Keep obviously local defaults (`localhost`, `postgres:postgres`). Templates (`.env.example`) are fine.
- **`document-with-pii`** and **`documentsNeedingAction`**: a personal document in a format with no builder (`.pptx`, `.odt`, `.xls`, `.db`...). Write a neutral file of the same type with the same role, for example an empty deck or a database with the schema and fake rows. Delete the document (and its references) only if nothing in the project uses it.
- **`document`** (pdf, docx, xlsx, csv, db... where the script found no personal data, or could not read the content): open it (`.docx`/`.xlsx`/`.pptx` are zip archives you can unzip and read). If it still holds personal data the patterns missed (a CV of someone else, a customer list, real records), replace its content with `SA placeholder $WR <file>` (docx, xlsx, pdf, rtf) or a neutral file of the same type. Never delete a file that code loads. Specs or docs with no personal data stay as they are.
- **Other people's names** in code comments, docs, seeds and fixtures (real customers, colleagues, the author outside git metadata) become placeholders (`Person One`, `Customer A`). Public figures, companies, library authors and third-party license notices stay.
- **`phone`, `public-ip`, `generic-secret`**: redact if real. Leave fixtures (`555` numbers, documentation IP ranges, test passwords).
- **Author metadata** (`package.json` author, `pyproject` authors, `LICENSE` holder, `CODEOWNERS`, `FUNDING.yml`, `.mailmap`): use the placeholders already assigned in `$WR/redactions.json`.

## 6. Re-run checks and fix what the cleaning broke

Run the same commands as the baseline, in the work dir. Compare each failure with the baseline:
- **Failure in the baseline too**: pre-existing. Do not fix it, but report it.
- **New failure**: it was caused by steps 3-5. Find the coupling, for example: a test asserting a literal that was redacted in one file and not the other; a snapshot with the old name; a fixture file that was renamed; an email/domain validator rejecting `example.com`; a test reading a deleted AI file; a renamed package import. Fix the test data or the code so the test passes **for the same reason it passed before**. Use the placeholder consistently, update the snapshot, or fix the path. Never delete, skip or weaken a test, and never restore the redacted value.

Repeat until the only failures left are the baseline ones. If a new failure survives two serious fix attempts, stop trying, keep it in the zip, and flag it at the top of the report.

Record every test that depended on PII (see the report template): it is a test-quality signal the user wants.

## 7. Zip

Rescan first (`SA scan $WR`). No `block` findings may remain. Then:

```
SA zip $WR --name <clean-project-name>
```

The zip contains exactly the files the project's `.gitignore` allows, under a `<name>/` root folder, with executable bits kept. It refuses to run while AI tooling files, env files or `block` findings remain:
- For an env file you reviewed and blanked: add `--allow-env <path>`.
- For a `block` finding you verified is a false positive: use `--force` and list each one in the report.

Before writing, `zip` runs a byte-level check of every entry (inside nested zips, gzip and PDF streams, in UTF-8 and UTF-16) for the owner's identity and every redacted original. It refuses if any survives. `--force` also skips this check and lists what it skipped under `forcedPastLeaks`, which the report must show.

## 7b. Independent audit

The pattern rules and the zip check work from the same list of spellings, so they share blind spots. The audit searches for each **piece** of the identity on its own (first name, surname, handle parts, the joined handle, domain labels, email local parts):

```
SA audit $WR <zip path>
```

For every hit, open the file in the work dir and decide:
- **A leak**: for example the surname inside a personal domain or bucket name, or a first name in a greeting. Fix it in the work dir with a placeholder consistent with the others, then go back to step 7 (rescan, zip, audit).
- **Unrelated**: a common word or someone else with the same surname. Leave it and list it under "Kept on purpose" with a masked value.

Repeat until every hit is decided.

## 8. Report

Write the report next to the zip, at the `report` path printed by `zip`. It must not contain any raw PII or secret. Use the masked values from the scan and from `$WR/redactions.json`.

```markdown
# <name>: clean export report

Zip: `<zip path>` (<N> files). Source: `<project path>`. Date: <date>.

> ⚠️ Only if needed: new test failures left unfixed, or findings forced past.

## Checks
| Command | Baseline | Final | Notes |

## Removed AI tooling
Files and folders deleted, and docs deleted because they were AI workflow.

## Cleaned AI references
One line per file: what was removed or rewritten. Renames (old → new name).

## Redactions
| Category | Masked original | Placeholder | Occurrences | Files |
Files renamed. Documents replaced by placeholders (file and reason). Files deleted for personal data.

## Tests coupled to PII
| Test (file › name) | Depended on | How it broke | Fix |
One row per test that broke because of redaction or cleaning. If none: "None."

## Kept on purpose
AI product integrations, false positives left in place, findings and leaks forced past with --force (with reason), audit hits judged unrelated.

## Image metadata stripped
Files, and what was removed. Note photos that may now display rotated.

## Not verified
Suites skipped and why (services unavailable, e2e too slow). Files over the scan limit and how they were checked.
```

## 9. Clean up

```
SA cleanup $WR
```

Then reply with the zip path and the report path. Add a 3-5 line summary: files removed, references cleaned, redactions by category, tests fixed, and anything flagged.
