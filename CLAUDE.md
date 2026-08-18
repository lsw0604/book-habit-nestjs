# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

`book-habit-nest` is a [NestJS](https://docs.nestjs.com) (TypeScript) backend, scaffolded via `@nestjs/cli`. It is currently a fresh scaffold — the base `AppModule` / `AppController` / `AppService` are the only application code, with no domain modules yet.

## Commands

```bash
# install dependencies
npm install

# run
npm run start          # single run
npm run start:dev      # watch mode (use this during development)
npm run start:prod     # run compiled dist/main.js

# build
npm run build           # nest build -> dist/

# lint / format
npm run lint             # eslint --fix over src, apps, libs, test
npm run format           # prettier --write over src and test

# tests
npm run test              # unit tests (jest, rootDir: src, pattern *.spec.ts)
npm run test:watch
npm run test:cov          # coverage report -> coverage/
npm run test:debug        # jest --inspect-brk, runInBand
npm run test:e2e          # e2e tests via test/jest-e2e.json (rootDir: test, pattern *.e2e-spec.ts)

# run a single test file
npx jest path/to/file.spec.ts
npx jest -t "test name pattern"
```

## Architecture

- Standard NestJS module/controller/service pattern. Entry point is [src/main.ts](src/main.ts), which bootstraps `AppModule` on `PORT` env var (default 3000).
- [src/app.module.ts](src/app.module.ts) is the root module; new feature modules should be registered here (or nested under feature modules as the app grows).
- Unit tests live alongside source as `*.spec.ts` (jest rootDir is `src`). E2E tests live under [test/](test/) as `*.e2e-spec.ts`, run through a separate Jest config ([test/jest-e2e.json](test/jest-e2e.json)) with its own rootDir/moduleNameMapper.
- Path aliases: `tsconfig.json` has `baseUrl: "./"` — prefer relative imports until a `paths` mapping is added.
- ESLint config is flat-config style ([eslint.config.mjs](eslint.config.mjs)) using `typescript-eslint` + `eslint-plugin-prettier`; Prettier config is in [.prettierrc](.prettierrc) (single quotes, trailing commas).
