# continuous-learning-and-teaching

Aggregator repository started in 2025. Here I add all the code written while studying or teaching programming.

## Projects

| Project | Description | Status |
|---|---|---|
| [coopera](./coopera) | Collective purchasing platform — helps community leaders manage group buys so members can buy at lower cost | Ongoing |
| [python-selenium-linkedin-automation](./python-selenium-linkedin-automation) | CLI scaffold + Selenium browser factory for automating LinkedIn connection workflows | Ongoing |
| [superdoc-nextjs-playground](./superdoc-nextjs-playground) | Exploring SuperDoc (open source document editor) integration with Next.js — [live demo](https://superdoc.thealmeida.online/) | Finished |

## Commit Standards

All commits in this repository follow the [Conventional Commits](https://www.conventionalcommits.org/) specification, enforced automatically via [`commitlint`](https://commitlint.js.org/) and [`husky`](https://typicode.github.io/husky/).

### Setup

Install the monorepo root dependencies once to activate the git hook:

```bash
npm install
```

From that point on, every `git commit` is validated automatically before it is accepted.

### Format

```
type(scope): short description
```

**Examples:**

```
feat(coopera): add checkout page
fix(coopera): resolve cart item quantity bug
docs: update root README with commit standards
chore: bump husky to v9
test(python-selenium-linkedin-automation): add smoke tests for browser factory
```

**Common types:** `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`, `style`, `perf`

The `scope` is optional but recommended — use the project folder name when the change is scoped to a single sub-project.

### Interactive commits (coopera)

Inside the `coopera` project you can use [Commitizen](https://commitizen-tools.github.io/commitizen/) for a guided, interactive commit prompt:

```bash
cd coopera
npm run commit
```

This walks you through selecting the type, scope, and description, ensuring the message is always valid.
