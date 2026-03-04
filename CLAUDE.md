# CLAUDE.md

This file provides guidance for AI assistants working in this repository.

## Repository Overview

This is a **learning and teaching monorepo** containing multiple independent projects across different tech stacks. Each sub-project is self-contained with its own dependencies, scripts, and configuration.

```
continuous-learning-and-teaching/
├── coopera/                          # Next.js 15 fullstack app (PostgreSQL, ongoing)
├── superdoc-nextjs-playground/       # Next.js 16 experiment with SuperDoc (finished)
├── python-selenium-linkedin-automation/  # Python 3.10+ CLI/automation project
├── .github/workflows/                # CI/CD for CoopEra (linting + tests)
├── .husky/                           # Git hooks (commit-msg)
├── commitlint.config.mjs             # Conventional commits config (max 200 chars)
├── package.json                      # Root — only husky + commitlint devDeps
└── README.md
```

---

## Git Conventions

All commits **must** follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

**Types:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `ci`, `perf`

**Scope examples:** `coopera`, `database.js`, `deps`, `linkedin`, `cli`

Max header length: 200 characters. The `commitlint` hook validates every commit.

Use `npm run commit` inside `coopera/` to get an interactive Commitizen prompt.

---

## Projects

### 1. CoopEra (`coopera/`)

**Purpose:** Collective purchasing platform — helps community leaders manage group buying.

**Stack:** Next.js 15.5.7, React 19, TypeScript, PostgreSQL 16, Docker, Jest

#### Setup

```bash
cd coopera
npm install
npm run services:up   # Start PostgreSQL via Docker
npm run dev           # Dev server at http://localhost:3000 (Turbopack)
```

#### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Docker services + Next.js dev (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm test` | Start Docker services + dev server + run Jest |
| `npm run test:watch` | Jest watch mode |
| `npm run lint:prettier:check` | Check Prettier formatting |
| `npm run lint:prettier:fix` | Auto-fix Prettier |
| `npm run lint:eslint:check` | ESLint (0 warnings allowed) |
| `npm run lint:eslint:fix` | Auto-fix ESLint |
| `npm run services:up` | `docker compose up -d` |
| `npm run services:down` | `docker compose down` |
| `npm run services:stop` | `docker compose stop` |
| `npm run commit` | Interactive Commitizen prompt |

#### Key Files

- `src/app/api/status/route.ts` — Health check endpoint (`GET /api/status`), returns DB version, pool stats, and uptime
- `infra/database.js` — PostgreSQL connection pool (max 10), SSL disabled in dev, enabled in prod
- `infra/docker-compose.yml` — PostgreSQL 16 service
- `.env.development` — Local DB connection string (postgres://postgres:postgres@localhost:5432/coopera)
- `src/tests/integration/api/status/get.test.js` — Integration test hitting live localhost:3000

#### Linting Rules

ESLint flat config (`eslint.config.mjs`): TypeScript-aware, Next.js best practices, Prettier integration, Jest plugin for test files. **Zero warnings allowed** in CI.

#### CI/CD (GitHub Actions)

Triggers on PRs touching `coopera/` or `.github/workflows/`:

- **coopera-linting.yml**: Runs Prettier check, ESLint check, and Commitlint
- **coopera-test.yml**: Runs Jest integration tests (requires Docker for PostgreSQL)

Node.js version in CI: LTS (hydrogen)

---

### 2. SuperDoc NextJS Playground (`superdoc-nextjs-playground/`)

**Status:** Finished — live at https://superdoc.thealmeida.online/

**Purpose:** Experiment integrating SuperDoc (open-source document editor) with Next.js to display a CV.

**Stack:** Next.js 16.1.1, SuperDoc (`@harbour-enterprises/superdoc ^1.0.4`), TailwindCSS 4, TypeScript

#### Setup

```bash
cd superdoc-nextjs-playground
npm install
npm run dev
```

#### Key Files

- `app/page.tsx` — Client component that dynamically loads `DocumentEditor`
- `components/DocumentEditor` — Wraps SuperDoc editor
- `app/api/documents/[id].js` — Dynamic API route for document retrieval

No dedicated test suite; minimal ESLint config (no Prettier, no Jest plugin).

---

### 3. Python Selenium LinkedIn Automation (`python-selenium-linkedin-automation/`)

**Purpose:** Educational Python project exploring CLI development, Selenium WebDriver automation, and project packaging.

**Stack:** Python 3.10+, Selenium 4.20+, Typer (with argparse fallback), pytest, Ruff, Black

#### Setup

```bash
cd python-selenium-linkedin-automation
make install    # Creates venv + installs dependencies
make dev        # Development mode
```

#### Makefile Targets

| Command | Description |
|---|---|
| `make install` | Create venv and install all deps |
| `make dev` | Install in development mode |
| `make test` | Run full pytest suite (verbose) |
| `make smoke` | Quick smoke test of CLI + config |
| `make lint` | Ruff linting |
| `make format` | Black formatting |
| `make run` | Show CLI help |
| `make clean` | Remove venv and caches |

#### Key Files

- `src/linkedin_automation/cli.py` — Entry point, Typer-based CLI (`info`, `hello` commands) with argparse fallback
- `src/linkedin_automation/config/settings.py` — `AppSettings` class: browser choice, headless mode, timeouts (env-configurable)
- `src/linkedin_automation/core/browser.py` — Selenium WebDriver factory with webdriver-manager auto-driver support
- `src/linkedin_automation/clients/linkedin.py` — LinkedIn client scaffold
- `tests/test_smoke.py` — Settings validation and env override tests

#### Code Style

- **Black**: line-length 100
- **Ruff**: line-length 100, configured in `pyproject.toml`
- **Pytest**: pythonpath set to `src/`

#### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `BROWSER` | `chrome` | Browser to use (`chrome`, `firefox`) |
| `HEADLESS` | `true` | Run headless |
| `TIMEOUT` | `30` | Element wait timeout (seconds) |

---

## Development Workflows

### Working on CoopEra

1. Ensure Docker is running before `npm run dev` or `npm test`
2. All linting and formatting must pass before merging (`npm run lint:prettier:check && npm run lint:eslint:check`)
3. Write integration tests for new API endpoints following the pattern in `src/tests/integration/`
4. Use conventional commits (enforced by Husky pre-commit hook)

### Working on the Python Project

1. Always use the Makefile — don't run pytest/ruff/black directly to ensure venv activation
2. Respect the `src/` layout; import paths start from `linkedin_automation.*`
3. Use `make smoke` for quick sanity checks, `make test` for full suite

### Adding a New Sub-Project

1. Create a directory at the repo root
2. Add a `README.md` documenting purpose, stack, and dev instructions
3. Update the root `README.md` project list
4. If it's a JS/TS project, follow the CoopEra ESLint + Prettier conventions
5. Add CI workflows in `.github/workflows/` following the naming pattern `<project>-linting.yml` / `<project>-test.yml`

---

## Important Notes

- **No shared source code** between sub-projects — each is fully independent
- **Root `package.json`** only manages Husky and CommitLint; never add app-level deps there
- **Python project uses `make`** — do not run scripts outside the Makefile unless you know the venv is active
- **CoopEra requires Docker** for both development and testing (PostgreSQL)
- The **SuperDoc playground is considered finished** — avoid modifying it unless there's a specific reason
