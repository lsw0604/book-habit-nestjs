# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

`book-habit-nest` is a [NestJS](https://docs.nestjs.com) (TypeScript) backend for a book-reading-habit app, scaffolded via `@nestjs/cli`, using [Prisma](https://www.prisma.io) ORM against MySQL. It aggregates book metadata from external providers (Kakao, Aladin) and will let users track their own reading (`MyBook`), reading sessions (`ReadingLog`), quotes, reviews, tags, and reading goals.

## Commands

```bash
# install dependencies (also runs `prisma generate` via postinstall)
npm install

# local MySQL (docker-compose maps host port 3306 -> container 3306)
docker compose up -d mysql

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

# prisma
npm run prisma:generate   # regenerate client after schema.prisma changes
npm run prisma:migrate    # create + apply a dev migration (prompts for a name)
npm run prisma:studio     # open Prisma Studio GUI
```

## Architecture

- Standard NestJS module/controller/service pattern. Entry point is [src/main.ts](src/main.ts), which bootstraps `AppModule`, sets a global `api` prefix (root `GET /` is excluded from the prefix), wires `cookie-parser`, a global `ValidationPipe` (`whitelist`, `transform`, `forbidNonWhitelisted`), and Swagger at `/api` (see `setUpMiddleware`/`setUpSwagger` in [src/main.ts](src/main.ts)). Listens on `PORT` env var (default 3000).
- [src/app.module.ts](src/app.module.ts) is the root module; new feature modules are registered here. It also registers two app-wide providers via `APP_INTERCEPTOR`/`APP_FILTER` (see "Standard response envelope" below).
- **Database**: [prisma/schema.prisma](prisma/schema.prisma) defines the MySQL schema; `DATABASE_URL` (see [.env.example](.env.example)) points at the `docker-compose.yml` MySQL service. [src/prisma/prisma.service.ts](src/prisma/prisma.service.ts) extends `PrismaClient` with Nest lifecycle hooks (`$connect`/`$disconnect`), and [src/prisma/prisma.module.ts](src/prisma/prisma.module.ts) is `@Global()` so any module can inject `PrismaService` without re-importing it. Prisma is pinned to an exact version (`prisma`/`@prisma/client` both `6.12.0`, not `^6.12.0`) because newer 6.13+ releases pull a vulnerable `deepmerge-ts` via `@prisma/config` — bump deliberately, not via a caret range.
  - Core domain: `Book` (canonical book record, keyed by unique `isbn`) — `User` — `MyBook` (a user's copy of a book: status/rating/progress, unique per `[userId, bookId]`) — `ReadingLog` (individual reading sessions under a `MyBook`, with `Quote`s) — `MyBookReview` (one public/private one-line review per `MyBook`) with `ReviewLike`/`ReviewComment` — `Tag`/`MyBookTag` — `ReadingGoal` (yearly or monthly target by `ReadingGoalMetric`). Several FKs deliberately skip `onDelete: Cascade` on `userId` to avoid MySQL "multiple cascade paths" errors where a cascade already reaches the same table via `MyBook` — see the comments in [prisma/schema.prisma](prisma/schema.prisma) before adding new cascades.
- **Standard response envelope** (`src/common/response`): every controller response is wrapped by `ResponseDtoInterceptor` (an `APP_INTERCEPTOR`) into `{ success, statusCode, message, data }` via `ResponseDto`, and every uncaught exception is normalized to the same shape by `ResponseExceptionFilter` (an `APP_FILTER`), keyed off `HttpException`. Use `@ResponseMessage('...')` to customize the success message. Because the wrapping happens in an interceptor, `@ApiOkResponse({ type: Dto })` alone would document the *unwrapped* body — use `@ApiResponseDto(Dto, { isArray? })` from the same folder instead, which wraps the schema in `ResponseDto` for Swagger.
- **Pagination** (`src/common/pagination`): `PaginationUtil.getSkipTake` / `getPaginationMeta` are the shared helpers for Prisma `skip`/`take` and building a `PaginationMeta` (page/total/hasNext/hasPrev); see usage in `KakaoBookSearchService`.
- **Books module** (`src/books`): `BooksController` exposes book search/detail; `BooksService` does local `Book` lookup/creation against Prisma. External metadata comes from two provider services under `src/books/providers/{kakao,aladin}`, each following the same shape — inject `HttpService` (`@nestjs/axios`) + `ConfigService`, call the external API with `firstValueFrom`, `catchError` into a `BadGatewayException`, and map the raw response into a local DTO via a static `.from(...)`. Provider exports are re-exported through `src/books/providers/index.ts`. These providers need `KAKAO_REST_API` and `ALADIN_TTB_KEY` env vars (not yet listed in [.env.example](.env.example) — add them there if you add more provider config).
- Unit tests live alongside source as `*.spec.ts` (jest rootDir is `src`). E2E tests live under [test/](test/) as `*.e2e-spec.ts`, run through a separate Jest config ([test/jest-e2e.json](test/jest-e2e.json)) with its own rootDir/moduleNameMapper.
- ESLint config is flat-config style ([eslint.config.mjs](eslint.config.mjs)) using `typescript-eslint` + `eslint-plugin-prettier`; Prettier config is in [.prettierrc](.prettierrc) (single quotes, trailing commas).
