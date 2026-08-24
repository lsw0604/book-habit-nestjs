# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

`book-habit-nest` is a [NestJS](https://docs.nestjs.com) (TypeScript) backend for a book-reading-habit app, scaffolded via `@nestjs/cli`, using [Prisma](https://www.prisma.io) ORM against MySQL. It aggregates book metadata from external providers (Kakao, Aladin) and lets users track their own reading (`MyBook`), reading sessions (`ReadingLog`), one-line reviews with likes/comments (`MyBookReview`/`ReviewLike`/`ReviewComment`), tags, and reading goals.

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
- **Prisma error helper** (`src/common/prisma-error.util.ts`): `PrismaErrorUtil.isUniqueConstraintViolation(error, field)` / `isRecordNotFound(error)` centralize P2002/P2025 detection so services can translate them into `ConflictException`/`NotFoundException` without duplicating the `error.meta?.target` string/array-checking logic.

### Auth

`src/auth` implements local (email/password) and Kakao OAuth login, issuing a JWT **access token + refresh token pair as httpOnly cookies** — not a Bearer/Authorization-header scheme, even though `main.ts`'s Swagger `DocumentBuilder` still calls `.addBearerAuth()` (vestigial; ignore it — cookies are the only thing `AccessTokenStrategy` reads).

- `POST /auth/signup|login|kakao/callback` set `access_token` (path `/`) and `refresh_token` (path `/api/auth` only, via `REFRESH_TOKEN_COOKIE_PATH` in [auth.constants.ts](src/auth/auth.constants.ts)) cookies; `POST /auth/refresh` reissues `access_token` from the refresh cookie.
- Two guards in `src/auth/guards`: `AccessTokenGuard` (401 if no/invalid `access_token` cookie — the default for any endpoint requiring a logged-in user) and `OptionalAccessTokenGuard` (never rejects; populates `@CurrentUser()` with `JwtPayload | undefined` when the cookie is missing/invalid). Apply guards **per-method**, not per-controller, when a resource mixes strict writes with anonymous-friendly reads (see `MyBookReviewController`/`ReviewCommentController`) — controller-level and method-level `@UseGuards()` both run (cumulative, not override), so a controller-wide `AccessTokenGuard` would still 401 an anonymous request even if that one method also has `OptionalAccessTokenGuard`.
- `@CurrentUser()` (`src/auth/decorators`) reads `request.user`; its return type reflects which guard is in play (`JwtPayload` under `AccessTokenGuard`, `JwtPayload | undefined` under `OptionalAccessTokenGuard`).

### Ownership validation pattern

Every resource is scoped to its owner, but *how* differs based on whether the Prisma model has a direct `userId` column:

- **Direct `userId` column** (`MyBook`, `ReviewLike`, `ReviewComment`): one atomic query — Prisma's `update()`/`delete()` accept extra scalar filters alongside the unique `where` field, so `prisma.myBook.update({ where: { id, userId }, ... })` checks existence + ownership in a single round trip (see `MyBookService`).
- **No `userId` column, only reachable via a relation** (`ReadingLog`, `MyBookReview`, `MyBookTag`, and anything hanging off `MyBookReview`): Prisma's `update()`/`delete()` cannot filter through a relation in their unique `where`, only `findFirst`/`findMany` can. So these services do a 2-step **assert-then-mutate**: `findFirst({ where: { id, myBook: { userId } } })` to assert ownership (throwing `NotFoundException` if it misses), then a plain `update({ where: { id } })`/`delete({ where: { id } })` (see `ReadingLogService`, `MyBookReviewService.assertReviewOwnership`, `MyBookTagService`).
- Read access for a resource that can be **public or private** (`MyBookReview`, and anything scoped to a `MyBookReview`) uses an `OR: [{ isPublic: true }, { myBook: { userId } }]` filter (`MyBookReviewService.accessibleOr`). When `userId` is `undefined` (anonymous, via `OptionalAccessTokenGuard`), the owner branch must be **omitted from the array**, not passed as `{ myBook: { userId: undefined } }` — Prisma silently drops `undefined`-valued filter keys, which would turn "owned by me" into "matches any row."

### Domain modules

- **`my-book`**: a user's copy of a book (`MyBook` — status/rating/`currentPage`, unique per `[userId, bookId]`). `MyBookService.buildStatusTransition` encodes the status state machine (`WANT_TO_READ` → `CURRENTLY_READING` → `READ`, with `startedAt`/`finishedAt`/`readCount` side effects); exports `MyBookService` for cross-module use.
- **`reading-log`**: individual reading sessions under a `MyBook`. Creating/updating/removing a `ReadingLog` re-syncs the parent `MyBook` inside the same Prisma transaction via two `MyBookService` methods: `syncProgressFromLatestReadingLog` (recomputes `currentPage`/`lastReadAt` from the *actual* latest log, not the triggering DTO, so edits/deletes of non-latest logs don't corrupt progress) and `startReadingIfWantToRead` (one-directional `WANT_TO_READ` → `CURRENTLY_READING` promotion on first log, create-only).
- **`my-book-review`**: one public/private one-line review per `MyBook` (unique `myBookId`). Beyond CRUD, exposes personalized list endpoints — `findAll` (everything the caller wrote, `isPublic` irrelevant), `findLiked`/`findCommented` (reviews the caller liked/commented on, filtered through `accessibleOr` so a review that went private afterward silently drops out of these lists). Exports `MyBookReviewService` (`assertAccessible`) for `review-like`/`review-comment` to reuse.
- **`review-like`** / **`review-comment`**: interactions on a `MyBookReview`. Both import `MyBookReviewModule` and call `assertAccessible` before writing, so liking/commenting is only possible while the target review is currently public (or owned by the actor) — flipping a review to private blocks *new* interactions immediately but doesn't retroactively delete existing `ReviewLike`/`ReviewComment` rows.
- **`public-review`**: the cross-user public feed (`GET /public-review`, `OptionalAccessTokenGuard` — anonymous browsing is the point of "public"). Filters by `isbn`, not the internal `Book.id` — no endpoint ever exposes `Book.id` to a client, since book detail pages are keyed by ISBN. Computes `isLiked` per item via a single query (nested `reviewLike: { where: { userId }, take: 1 }` select, not a second round trip); for anonymous requests, `userId` is coerced to the sentinel `0` (never a real autoincrement id) rather than `undefined`, for the same Prisma-drops-`undefined` reason noted above.
- **`tag`** / **`my-book-tag`**: `Tag` is a shared, deduplicated vocabulary (unique `value`) with no owner and no direct create/delete endpoint — it's only ever created via `TagService.findOrCreate` (an `upsert` + P2002-catch-and-refetch, mirroring `BooksService.findOrCreate`'s race handling), invoked from `MyBookTagService.create` when a user attaches a not-yet-existing tag value. `GET /tag?query=` powers client-side autocomplete and matches against both the literal `value` and a `chosung` column (Korean initial-consonant string, e.g. "자기계발" → "ㅈㄱㄱㅂ", extracted via `es-hangul`'s `getChoseong`) with an `OR` filter — `chosung` is an internal search-only column and must always be excluded from responses via an explicit `select` (see `MyBookTagSelect` in `my-book-tag.constants.ts`), never left to leak through a bare `findMany`/`include`. `MyBookTag` (the per-`MyBook` attachment, unique `[myBookId, tagId]`) deliberately does **not** cascade-delete its `Tag` when the last reference is removed — `MyBookTag.tag` has `onDelete: Cascade`, so an inline "delete if orphaned" check in the same request would race against a concurrent attach on another request and could cascade-delete that other request's brand-new row; orphaned `Tag` cleanup, if ever needed, belongs in a separate batch job instead.
- **Books module** (`src/books`): `BooksController` exposes book search/detail; `BooksService` does local `Book` lookup/creation against Prisma. External metadata comes from two provider services under `src/books/providers/{kakao,aladin}`, each following the same shape — inject `HttpService` (`@nestjs/axios`) + `ConfigService`, call the external API with `firstValueFrom`, `catchError` into a `BadGatewayException`, and map the raw response into a local DTO via a static `.from(...)`. Provider exports are re-exported through `src/books/providers/index.ts`. These providers need `KAKAO_REST_API` and `ALADIN_TTB_KEY` env vars (see [.env.example](.env.example)).

Unit tests live alongside source as `*.spec.ts` (jest rootDir is `src`). E2E tests live under [test/](test/) as `*.e2e-spec.ts`, run through a separate Jest config ([test/jest-e2e.json](test/jest-e2e.json)) with its own rootDir/moduleNameMapper. As of now no `*.spec.ts`/`*.e2e-spec.ts` files exist beyond the Nest CLI boilerplate (`app.controller.spec.ts`, `app.e2e-spec.ts`) — there is no real test coverage for any domain module yet.

ESLint config is flat-config style ([eslint.config.mjs](eslint.config.mjs)) using `typescript-eslint` + `eslint-plugin-prettier`; Prettier config is in [.prettierrc](.prettierrc) (single quotes, trailing commas).
