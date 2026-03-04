# CoopEra

App created to help community leaders to manage collective purchasing allowing community members to buy items at lower cost in comparison with normal stores.

## Developers Info

This project was created using `create-next-app`, with the default setup for App Router, TypeScript, and ESLint.

Since this project lives inside the `continuous-learning-and-teaching` monorepo, all `.github` resources (CI/CD workflows and Dependabot configuration) are defined at the repository root (`../.github`).

### Important Scripts

Install dependencies:

```bash
npm i
# or
yarn install
```

Start Local Environment:

```bash
npm run dev
# or
yarn dev
```

Run Tests:

```bash
npm run test
npm run test:watch
# or
yarn test
yarn test:watch
```

Build:

```bash
npm run build
# or
yarn build
```

Lint:

```bash
npm run lint:prettier:check
npm run lint:prettier:fix
npm run lint:eslint:check
npm run lint:eslint:fix

# or
yarn lint:prettier:check
yarn lint:prettier:fix
yarn lint:eslint:check
yarn lint:eslint:fix
```

Commit (interactive Commitizen prompt):

```bash
npm run commit
# or
yarn commit
```

This uses [Commitizen](https://commitizen-tools.github.io/commitizen/) to guide you through writing a valid [Conventional Commit](https://www.conventionalcommits.org/) message. Commits are validated automatically by `commitlint` via a Husky git hook configured at the monorepo root — run `npm install` at the repo root once to activate it.

## CI/CD

Pull requests trigger automated GitHub Actions workflows:

| Workflow                    | What it checks                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------- |
| **CoopEra Linting**         | Prettier formatting, ESLint rules, and Conventional Commit message format (commitlint) |
| **CoopEra Automated Tests** | Jest integration tests                                                                 |

All workflows are defined in `../.github/workflows/`.
