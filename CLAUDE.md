# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

NestJS (TypeScript) + Prisma + MySQL backend for a book-reading-habit app. Book metadata comes from Kakao (search + lookup), supplemented by 국립중앙도서관. Users track their copies (`MyBook`), reading sessions (`ReadingLog`), a private book-level note per book (`BookNote`), tags, and reading goals. The product is **personal-first**: there are no public reviews, feeds, likes or comments (they were removed on 2026-10-22).

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

- **Bootstrap** ([src/main.ts](src/main.ts)): global `api` prefix, `helmet()`, the request-logging middleware, `cookie-parser`, and a global `ValidationPipe` (`whitelist`, `transform`, `forbidNonWhitelisted`). Swagger is served at `/api`; its `DocumentBuilder` config lives in [src/swagger.ts](src/swagger.ts), not inline in `main.ts`, so a script that only dumps the spec can import the same config (two builders would silently drift on `servers`/`securitySchemes`). `PORT` defaults to 3000. `app.enableShutdownHooks()` is what makes `PrismaService.onModuleDestroy` (`$disconnect`) run on SIGTERM/SIGINT.
- **Root module** ([src/app.module.ts](src/app.module.ts)): register new feature modules here.
  - `ConfigModule` validates env with Joi ([src/config/env-validation.schema.ts](src/config/env-validation.schema.ts)) and fails fast at boot. Required: `DATABASE_URL`, `JWT_*_SECRET`/`JWT_*_EXPIRES_IN`, `CORS_ORIGINS`, `KAKAO_CLIENT_ID`/`KAKAO_CALLBACK_URL`. `KAKAO_REST_API`/`NL_CERT_KEY`/`YES24_API_KEY` stay optional, because the code reads them with `configService.get`, not `getOrThrow`.
  - App-wide providers are registered through `APP_INTERCEPTOR`/`APP_FILTER`/`APP_GUARD`. The guard is `ThrottlerGuard`, a 100 req/min default; `AUTH_THROTTLE` tightens it for auth (see Auth).
- **Database**: [prisma/schema.prisma](prisma/schema.prisma), against the `docker-compose.yml` MySQL.
  - `PrismaService` logs SQL (`query`) outside production, so N+1s show up at runtime.
  - `PrismaModule` is `@Global()`, so services can inject `PrismaService` without importing it.
  - Prisma is **pinned exactly** to `6.12.0` (no caret). 6.13+ pulls a vulnerable `deepmerge-ts` via `@prisma/config`, so bump it deliberately.
  - Core domain: `Book` (keyed by unique `isbn`), `User`, `MyBook` (unique `[userId, bookId]`), `ReadingLog`, `Quote` (on `MyBook`, optionally linked to a `ReadingLog`), `Tag`/`MyBookTag`, `ReadingGoal`, `BookNote` + `BookNoteSection`.
  - Several `userId` FKs deliberately skip `onDelete: Cascade`, because MySQL rejects "multiple cascade paths" where a cascade already arrives via `MyBook`. Read the schema comments before adding cascades.
- **Response envelope** (`src/common/response`): `ResponseDtoInterceptor` wraps every response as `{ success, statusCode, message, data }`, and `ResponseExceptionFilter` normalizes every exception to the same shape. Set the message with `@ResponseMessage('...')`. The envelope's `statusCode` is read off `res.statusCode`, so it always equals the HTTP status.
  - **Swagger decorators for the envelope** — never `@ApiOkResponse`/`@ApiResponse` with a bare DTO, which documents the *unwrapped* body:
    - `@ApiResponseDto(Dto, { isArray?, description?, status? })` — 200 with `data`.
    - `@ApiCreatedResponseDto(Dto)` — for a `POST` **without** `@HttpCode`. Nest answers 201 there, so documenting 200 is a lie; this was wrong on all 10 create endpoints once.
    - `@ApiVoidResponseDto(description?)` — handler returns nothing (every `DELETE`, `logout`, `refresh`). The envelope still goes out, just with no `data` key; omitting the decorator documents an empty body instead.
    - `@ApiErrorResponse(status, description)` / `@ApiUnauthorizedResponse()` — every error shares one schema (`ResponseDto`), so these declare only *which* statuses are reachable. Describe the cause; "404" alone doesn't say whether the parent or the resource was missing.
  - **`nullable: true` needs an explicit `type`.** `@ApiProperty({ nullable: true })` on a `string | null` field reflects `design:type` as `Object` and emits `{ type: "object" }`, which makes generated clients unusable. Always pass `type: String`/`type: Number`/`type: Date` (see [book-image.api-property.ts](src/books/dto/book-image.api-property.ts)). This was wrong on 18 response fields once.
  - A response field that is always present but can be `null` uses `@ApiProperty` + `nullable`, not `@ApiPropertyOptional` — the key is not optional, its value is.
- **Shared helpers** (`src/common`):
  - `PaginationUtil` (`getSkipTake`/`getPaginationMeta`): Prisma `skip`/`take` plus `PaginationMeta`.
  - `PrismaErrorUtil` (`isUniqueConstraintViolation`/`isRecordNotFound`): detects P2002/P2025, so services can map them to 409/404.
  - `normalizeIsbn13`: the ISBN rule for all user input.
  - `formatDateOnly`: a `@db.Date` value (UTC midnight) → `'YYYY-MM-DD'`. Calendar dates such as `pubDate` go out in that form, never as a `Date`. A serialized `Date` is `...T00:00:00.000Z`, which a client in a timezone behind UTC reads as the previous day.
- **Request logging** (`src/common/logging/logging.middleware.ts`): Express middleware, deliberately **not** an interceptor. Interceptors run only after guards, so they'd miss 401s and 429s.
  - It assigns `request.id` (typed in [src/types/express.d.ts](src/types/express.d.ts)) and returns it as `X-Request-Id`.
  - `ResponseExceptionFilter` logs the same id with 5xx stack traces, so a user report can be matched to both log lines.
- **Page bounds** (`src/common/book-page.util.ts`):
  - `assertWithinTotalPage(page, totalPage, message)` is the only place the "page can't exceed total" check lives; don't re-inline it.
  - Always pass it `resolveTotalPage(myBook)` (`myBook.totalPage ?? myBook.book.totalPage`), never `book.totalPage` directly. Otherwise the user's own page count (see `my-book`) is ignored. That's why `MyBookService.assertOwnership` and `ReadingLogService.getTotalPage` select both fields.
  - "Unknown" is `null` only, and providers must write `null`, never `0`. The util still skips `0` defensively, since a stray `0` would block every page update.
- **Health** (`GET /health`): a terminus Prisma ping. It has no guard, because it's for infra probes.

### Auth

`src/auth`: local (email/password) and Kakao OAuth login. It issues a JWT **access + refresh token pair as httpOnly cookies**. There is no Bearer scheme — `AccessTokenStrategy` reads only the cookie. Swagger declares two `apiKey`-in-cookie schemes named after the cookies themselves; pass `addCookieAuth`'s third argument (`securityName`), or both register as `cookie` and the second overwrites the first. Mark guarded endpoints with `@ApiAccessCookieAuth()` / `@ApiRefreshCookieAuth()` (`src/auth/decorators`) or Swagger shows them as public. Do **not** mark `OptionalAccessTokenGuard` endpoints — declaring security there would claim the cookie is required.

- `POST /auth/signup|login|kakao/callback` set `access_token` (path `/`) and `refresh_token`. The refresh cookie's path is `/api/auth` only (`REFRESH_TOKEN_COOKIE_PATH` in [auth.constants.ts](src/auth/auth.constants.ts)). `POST /auth/refresh` reissues the access token.
- Guards (`src/auth/guards`):
  - `AccessTokenGuard` returns 401 without a valid cookie; it's the default for logged-in endpoints.
  - `OptionalAccessTokenGuard` never rejects. `@CurrentUser()` becomes `JwtPayload | undefined`. No controller uses it since `public-review` was removed; it stays for the next anonymous-read endpoint.
  - When a controller mixes guarded and public endpoints, apply the guard **and** `@ApiAccessCookieAuth()` **per method** (see `BookNoteController`, whose `GET templates` is public). Controller-level and method-level `@UseGuards()` are cumulative, so a controller-wide `AccessTokenGuard` would still 401 anonymous callers, and a controller-wide cookie decorator would document the public route as protected.
- `signup`/`login`/`kakao/callback` share `AUTH_THROTTLE` (5 req/min) against brute force and spam signups.

### Ownership validation pattern

Every resource is scoped to its owner. *How* depends on whether the model has a direct `userId` column:

- **Direct `userId`** (`MyBook`, `ReadingGoal`): one atomic query, `update/delete({ where: { id, userId } })`. Prisma accepts extra scalar filters beside the unique key.
  - `MyBookService.assertOwnership(userId, myBookId)` is the single source of truth for `MyBook` ownership. `ReadingLogService`, `MyBookTagService` and `BookNoteService` call it instead of re-implementing `findFirst({ id, userId })`.
- **Ownership only through a relation** (`ReadingLog`, `MyBookTag`, `BookNote`/`BookNoteSection`): `update()`/`delete()` can't filter through a relation, so these services **assert, then mutate**. First `findFirst({ where: { id, myBook: { userId } } })`, throwing 404 on a miss, then a plain `update/delete({ where: { id } })`. A `deleteMany` with the relation filter that 404s on `count === 0` is the one-query alternative (`BookNoteService.remove`).
- **Never filter with a possibly-`undefined` `userId`.** Prisma silently drops `undefined` filter keys, so `{ myBook: { userId: undefined } }` matches every row. Guarded endpoints always have a `userId`; any future anonymous read must omit the owner branch, not pass `undefined`.
- **No `User` relation reaches a response without an explicit `select`.** `User` holds `password`/`email`/`birthday`/`gender`, so a bare `include: { user: true }` leaks the password hash.

### Domain modules

- **`user`**: "my account" only. There is no `POST /user` (that's `POST /auth/signup`, which also issues the session cookies) and no list endpoint — nothing in the product shows other people's email/birthday/gender, and a guard alone wouldn't fix that. `GET`/`PATCH`/`DELETE /user/:id` sit behind `AccessTokenGuard` and `assertSelf` (403 on someone else's id). The identity check lives in the controller, not the service: `User`'s owner is itself, so there's no relation to filter on and `UserService` keeps its single-`id` signature.
- **`my-book`**: a user's copy of a book (status, rating, `currentPage`; unique `[userId, bookId]`). It exports `MyBookService`.
  - `buildStatusTransition` is the status state machine: `WANT_TO_READ` → `CURRENTLY_READING` → `READ`, with `startedAt`/`finishedAt`/`readCount` side effects.
  - `MyBook.totalPage` is a **user-entered page count**, and `null` means "use `Book.totalPage`". It exists because old books often have no page count anywhere, and e-books and other editions paginate differently under one ISBN. Set it with `PATCH /my-book/:id { totalPage }`; `null` clears it. Responses carry both it and `book.totalPage`, and the client's progress denominator is `totalPage ?? book.totalPage`.
  - `assertPageConsistency` compares the post-update `currentPage` with the post-update effective total. When `totalPage` changes (including when it's cleared), it also rejects a total below the highest existing `ReadingLog.endPage`, which would make those logs un-editable.
- **`reading-log`**: reading sessions under a `MyBook`. Create, update and remove re-sync the parent `MyBook` in the same transaction.
  - `syncProgressFromLatestReadingLog` recomputes from the *actual* latest log, not the triggering DTO, so editing an older log can't corrupt progress. `startReadingIfWantToRead` promotes `WANT_TO_READ` on the first log (create only).
  - `ReadingLogService` is **not exported**. Deleting a log does not delete its quotes; their `readingLogId` becomes `null` (see `quote`).
  - **`date` is a calendar date, not an instant.** It's the day the user assigns the session to, so it's never derived from `startTime`. It arrives as `'YYYY-MM-DD'` and becomes **UTC midnight** (`toRecordDate`). A local-midnight datetime would shift a day under `@db.Date` in KST. The parse must round-trip (`'2025-02-30'` otherwise rolls to March 2). Future dates are rejected, because `date` is the first `orderBy` key for "latest", and a log dated 2099 would freeze `currentPage` forever.
  - `readingMinutes` is always derived from `startTime`/`endTime` (recomputed on update), never accepted from the client.
  - Feelings go in free-text `memo`. The `readingMood` enum was removed: nothing aggregated it, and it only added input friction. Build the aggregating screen *before* reintroducing any structured field here.
  - `findAll` **always** scopes by `myBook: { userId }`. `myBookId` is an optional narrowing filter (omit it for the cross-book timeline). `from`/`to` (`parseDateOnly`) may be in the future, unlike recording. Items carry `book` (title/thumbnail).
- **`quote`**: a quote belongs to a `MyBook` (`myBookId`, required, cascade). Which reading session it came from is an **optional** link (`readingLogId`, `onDelete: SetNull`). It used to hang only off `ReadingLog` with a cascade, so deleting a mistyped log silently deleted its quotes, and saving one sentence meant first creating a log, which moves `currentPage`. The client picks the link from the book's existing logs (a select with "no link"), so a quote never creates a log.
  - Ownership is relation-only through `MyBook`: `create`/`findAll` call `MyBookService.assertOwnership`, single-quote reads and mutations filter `myBook: { userId }` (assert, then mutate).
  - A given `readingLogId` must belong to the **same** `myBookId` (`assertReadingLogInMyBook`, 404 otherwise). The book's ownership is already checked, so `{ id, myBookId }` is enough. `PATCH { readingLogId: null }` unlinks; `myBookId` is immutable.
  - `page` goes through `assertWithinTotalPage(page, resolveTotalPage(myBook))`.
  - `GET /quote?myBookId=` (required) lists the book's quotes ordered `page, id`; `readingLogId` narrows it. Items carry `readingLogDate` (`formatDateOnly` of the linked log's `date`, or `null`) so the client can show "read on 10/3" without a second request.
  - `MyBook` deletion reaches `Quote` by two paths (direct cascade, and `ReadingLog` → SET NULL). With one path being SET NULL, MySQL accepts it: deleting a `MyBook` whose quote is linked to a log was run against the real DB, and the unlink-on-log-delete path is covered by [test/quote.e2e-spec.ts](test/quote.e2e-spec.ts). This says nothing about two *cascade* paths (the `userId` note above).
- **`public-tag`**: `GET /public-tag?isbn=&limit=` (no guard; `limit` 1–50, default 20). It's the one cross-user aggregate left, kept as an **input aid**: when a user tags a book, the client suggests the tags others put on that book (and should fall back to the user's own frequent tags, since most books have none yet). It is **not** shown as a public tag cloud on the book page; that use was dropped with the personal-first direction.
  - It returns `[{ tagId, value, count }]` ordered `count DESC, tagId ASC`, where `count` = `MyBook`s carrying the tag.
  - An unshelved book returns `[]`, not a 404.
  - `isbn` is normalized with `normalizeIsbn13`. An invalid value transforms to `false`, not `null`, because `@IsOptional` treats `null` as absent and would silently return the global aggregate instead of a 400.
  - **Privacy:** only tags used by ≥ `PUBLIC_TAG_MIN_DISTINCT_USERS` (2) **distinct users** appear. `Tag.value` is free text, so ranking by `count` alone would publish one person's private tag.
  - That filter isn't expressible in `groupBy`, so this is the one `$queryRaw` (`Prisma.sql`, so specs can assert SQL and values). `COUNT(*)` returns `BigInt`; convert it to `number` before responding.
- **`tag`** / **`my-book-tag`**: `Tag` is a shared, deduplicated vocabulary (unique `value`) with no owner or create/delete endpoint.
  - It's created only via `TagService.findOrCreate`, which does an upsert and, on P2002, catches and refetches, like `BooksService.findOrCreate`.
  - `GET /tag?query=` autocompletes on `value` OR `chosung`, the Korean initial consonants from `es-hangul`'s `getChoseong`. `chosung` is internal: always exclude it with an explicit `select` (`MyBookTagSelect`).
  - Removing the last `MyBookTag` does **not** delete its `Tag`. An inline "delete if orphaned" check races a concurrent attach and could cascade-delete that request's new row. Orphan cleanup belongs in a batch job.
- **`reading-goal`**: a yearly (`month: null`) or monthly target per `ReadingGoalMetric`, unique `[userId, year, month, metric]`.
  - It has a direct `userId`, so updates and deletes are one-step.
  - `year`/`month`/`metric` are immutable identity (not in `UpdateReadingGoalDto`). Changing them means delete + recreate.
- **`book-note`**: a private, book-level note per `MyBook` (unique `myBookId`), written against a reading-method template (`BookNoteTemplate`: 한 문장 정리, 본깨적, KWL, 3-2-1, 자유). It exists because a 150-char one-liner and a 500-char session memo leave nowhere to reflect on a whole book, and a blank page is why people never start. It's **private only**: no `isPublic`, no feed, no likes (the app is personal-first).
  - `BOOK_NOTE_TEMPLATES` (`book-note.templates.ts`) is the single source for section keys, labels, prompts and `maxLength`. It `satisfies Record<BookNoteTemplate, …>`, so a new enum value without a definition fails `tsc`. `GET /book-note/templates` serves it, and the client must not hardcode the copy. **Never rename or remove a section `key`** that has saved rows; responses drop keys the template doesn't define.
  - Sections are **rows** (`BookNoteSection`, unique `[bookNoteId, key]`), not JSON, so per-section `updatedAt` survives (KWL's before/after timing) and a future "all my 적용할 것" view is a plain query. An empty section has **no row**; `toBookNoteSections` expands every template section in order, with `''`/`null` for missing ones, so responses always carry the full template.
  - Routes are keyed by `myBookId` (`/book-note/by-my-book/:myBookId`; the note is the only child of its `MyBook`). `GET` returns `null` for "not written" and "not mine" alike. `PUT` upserts in one `$transaction`: it updates only the sections sent (partial save), deletes rows for whitespace-only sections, and wipes all rows when the template changes. Validation (`partitionBookNoteSections`) runs before the transaction, so a 400 never touches the DB.
  - Ownership is relation-only (`MyBook`): reads and deletes filter `myBook: { userId }`, and `PUT` calls `MyBookService.assertOwnership` first. There is no `userId` FK, for the usual multiple-cascade-path reason.
- **Books module** (`src/books`): `BooksController` serves search (`GET /books`, Kakao) and detail (`GET /books/detail/:isbn`); `BooksService` owns `Book` rows.
  - Providers live under `src/books/providers/{kakao,nl,yes24}` and share one shape: inject `HttpService` + `ConfigService`, call the API through `firstValueFrom`, turn failures into `BadGatewayException` in `catchError` (not found → `NotFoundException`), and map the response with a static `.from(...)`. They are re-exported via `providers/index.ts`.
  - Each implements `BookMetadataProvider` (`providers/book-metadata-provider.ts`) and returns a `BookMetadataPatch`: only the `Book` fields that source actually supplies. A field the source doesn't provide has **no key**; `null` means "this source has no value." Never pad a patch with `null`s to look like a full `Book`.
  - Env: `KAKAO_REST_API`, `NL_CERT_KEY`, `YES24_API_KEY`. All are optional at boot, but a missing supplement key fails silently (warning only): without `NL_CERT_KEY` `subTitle` disappears, without `YES24_API_KEY` `url` does, and without both `totalPage` does too.
  - **Search results vs `Book`.** Search returns a throwaway candidate list. `Book` is the canonical record, keyed by ISBN-13, and is created **only when shelving** (`MyBookService.create` → `BooksService.findOrCreate`). Only the normalized `isbn` crosses from one to the other, and the server re-fetches the metadata. So the two may differ in detail, never in *which book*. That is why ISBN handling lives on the server.
    - Search items carry flat `isbn: string | null` (ISBN-13) + `identifierType: 'ISBN' | 'ISSN' | 'UNKNOWN'`, both from `parseKakaoIdentifier`; its doc comment lists Kakao's real `isbn` formats. It checks the 13-digit token first and never falls back to the 10-digit token when the 13-digit one is an ISSN. In `"1228402000 9771228402006"` the 10-digit part passes the ISBN-10 checksum, and isbn3 would map it to an unrelated book. `normalizeIsbn13` (common) stays strict, because it validates user input.
    - ISSN/UNKNOWN items are marked, not filtered out, so page sizes match `meta`. `pubDate` is sent as `'YYYY-MM-DD'`, never as Kakao's KST-midnight `datetime`, and `BookDetailResDto` and the `my-book` detail use the same form (`formatDateOnly`), so one book's date looks the same on every screen.
    - Search items carry only what the result card renders, plus `isbn`. Kakao's `contents` and `status` are dropped, and a spec pins the key list.
    - Pagination: compute `meta` from `min(pageable_count, KAKAO_MAX_PAGE * size)` and let `is_end` override it; never use `total_count`. `pageable_count` caps at 1000, and beyond the last page Kakao silently repeats that page, so a `total_count`-based `hasNextPage` loops infinite scroll over duplicates.
  - **`GET /books/detail/:isbn` reads the DB and never writes it.** It returns the `Book` row if the book is shelved, so the detail page matches the shelf; otherwise it does an external lookup that is **not saved**. A GET must be side-effect-free, and a `Book` row should mean "someone shelved this."
    - `:isbn` goes through `BookIsbnParamDto`, the same `normalizeIsbn13` rule as `CreateMyBookDto`/`MyBookIsbnParamDto`.
    - The response is `BookDetailResDto`, an explicit field list that never includes `id`/`createdAt`/`updatedAt`.
    - It is deliberately separate from `BookLookupResDto`, the internal create-input type, which must match `Book` field for field. An extra field fails at runtime in Prisma, not at compile time. Only the merge result has that shape; provider patches don't.
  - **External lookup = `BookLookupService`**, called only from the private `BooksService.lookup()`, the one place to change when swapping providers.
    - **Which source fills which field lives in one table**: `BOOK_MERGE_POLICY` in [book-merge-policy.ts](src/books/book-merge-policy.ts), a per-field source priority list. `mergeBookMetadata` takes the first source with a value (a missing key, `null`, `''` and `[]` all count as no value), so a field Kakao leaves empty can be filled from NL. The title always comes from Kakao when Kakao found the book, so *which book* never mixes. The table `satisfies Record<keyof BookMetadataPatch, …>`, so adding a `Book` field without a policy entry fails `tsc`. Change sources here, not in `BookLookupService`, which only calls providers and handles failures.
    - `BOOK_BASE_SOURCES` (`kakao`, then `nl`) lists the sources that can create a row. Kakao comes first because search is Kakao too, so anything searchable is shelvable, and Kakao has the best cover and author data.
    - NL (`NlBookSearchService`) effectively fills only `subTitle` and a fallback `totalPage`, plus whatever Kakao left empty.
    - YES24 (`Yes24BookSearchService`) fills only `totalPage` (ahead of NL, whose `PAGE` is blank even for well-known books and `'0'` for e-books) and `url`. The policy enforces this even if the YES24 patch carried more. That's deliberate: the YES24 terms (제6조) allow only temporary caching and forbid building a separate DB, while `Book` is permanent. So a book found only on YES24 is still a 404, never a YES24-built row. Don't widen what YES24 contributes without rereading the terms.
    - **`Book.url` holds only the YES24 product link, and it's an attribution obligation.** The terms require any screen showing YES24 data to credit YES24 and link to its product page, so both `BookDetailResDto` and the `my-book` detail carry it and the client must render it. Providers return `url: null` (Kakao's own `url` is a Daum search page and is dropped), and `BookLookupService` sets it from YES24 only. Never fall back to another link, or the client can't tell whether to show the YES24 credit.
    - **There is no book description.** This is a reading-log app, so no screen needs a publisher blurb, and the YES24 link covers "tell me more." Measured on 32 books, NL had one ~12% of the time, Kakao's is a truncated ~250-char preview, and YES24's blurb would be copyrighted text stored permanently against its terms. Build the screen first before reintroducing it (same rule as `readingMood`). Search items don't carry it either.
    - All three are called in parallel, and NL/YES24 failures are ignored. A Kakao 404 falls back to NL alone (no cover).
    - **A Kakao 5xx is rethrown, not replaced by NL.** `Book` is never updated after creation (`findOrCreate`'s `update: {}`), so an NL-only row would stay coverless forever.
    - Provider quirks (Kakao cover-URL extraction; NL error, date and title formats; YES24's 404-with-`GOODS_002` for "not found") are documented in `kakao-lookup-res.dto.ts`, `nl-book-search.service.ts`, `nl-lookup-res.dto.ts` and `yes24-book-search.service.ts`, and pinned by specs built from real responses. Read those before changing them.
    - Shared parsing lives in `providers/book-metadata.util.ts`; don't re-inline it per provider. `splitAuthorsByRole` applies a `;`-group's role word to every name in the group, so `'A, B 옮김'` is two translators. The file also has `splitTitle` and `parseUtcDate`.
  - Cover fields: `thumbnail` is at most 120×174, for small UIs; `coverImage` is the original, and its size varies per book. Their Swagger text lives in `dto/book-image.api-property.ts`.

### Testing

- Unit tests are `src/**/*.spec.ts`. Every domain service has one; `PrismaService` is the only exception.
- E2E tests are `test/*.e2e-spec.ts` ([test/jest-e2e.json](test/jest-e2e.json)). They boot the real `AppModule` with `main.ts`'s pipe, cookie and prefix setup against the local MySQL, so migrations must be current.
- Controllers, guards, pipes and interceptors have **no unit tests by design**; they belong in e2e. [test/auth.e2e-spec.ts](test/auth.e2e-spec.ts) exercises the auth guards over real cookies.
- Shared test helpers live in `src/common/testing/test-helpers.ts` (`createPrismaError`, `firstCallArg`, `callWhere`, `callData`, `fakeAxiosResponse`). They are test-only: not exported from `src/common/index.ts` and excluded from the build. Import them instead of redefining them.
- **Mocked Prisma does not evaluate `where`.** A test that asserts only `data` still passes after the `userId`/relation filter is deleted. Whenever a query carries an authorization condition, assert it with `callWhere(...)`.
- Test private logic through its public method (e.g. `buildStatusTransition` via `update`).
- Mocked Prisma says nothing about real queries, constraints or `$transaction` rollback. Anything that depends on those belongs in e2e.

ESLint is flat config ([eslint.config.mjs](eslint.config.mjs)) with `typescript-eslint` + `eslint-plugin-prettier`. Prettier ([.prettierrc](.prettierrc)): single quotes, trailing commas.
