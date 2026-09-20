# AGENTS.md

## Project Overview
`ts-mailkit` is a modular, zero-runtime-dependency TypeScript library for email composition and dispatch via strictly typed Data Transfer Objects (DTOs) and pluggable `IEmailSender` transports.

- **Target runtimes**: Universal (Node.js 18+, Cloudflare Workers `workerd`, Bun, Deno, Next.js Edge).
- **Distribution format**: Dual ESM (`dist/index.js`) and CommonJS (`dist/index.cjs`) with declaration maps (`dist/index.d.ts`).
- **Main entrypoint**: `src/index.ts`.
- **Branching Strategy**: Dedicated branches per major version (e.g. `v0` for 0.x maintenance), with `main` tracking the active latest major release (v1.x).
- **Changelog Convention**: Major changelogs are tracked in `changelogs/` per major version (`changelogs/v0.md`, `changelogs/v1.md`, `changelogs/v2.md`).

---

## Essential Commands

Always use `pnpm` (`pnpm@11.22.0` enforced in `packageManager`):

- **Typecheck**: `pnpm run typecheck` (`tsc --noEmit`)
- **Unit Tests (all)**: `pnpm test:unit`
- **Unit Test (single file)**: `pnpm vitest run test/unit/client.test.ts`
- **Unit Test (name pattern)**: `pnpm vitest run test/unit/client.test.ts -t "legacy positional"`
- **Watch Tests**: `pnpm run test:watch`
- **Build**: `pnpm run build` (`tsup && tsc --emitDeclarationOnly`)
- **Prepublish Check**: `pnpm run prepublishOnly`

### Verification Sequence
When verifying code changes, execute in this order:
```bash
pnpm run typecheck && pnpm test:unit && pnpm run build
```

---

## Architectural Boundaries

- `src/core/`: Domain models (`types.ts`), error hierarchy (`errors.ts`), and client facade (`client.ts`).
- `src/transports/`: Pluggable senders implementing `IEmailSender`.
  - `src/transports/zeptomail/`: Zoho ZeptoMail HTTP adapter (`ZeptoMailHttpSender`, uses global `fetch`).
  - `src/transports/memory/`: In-memory transport for unit/integration tests.
  - `src/transports/console/`: Terminal logger transport for dev mode.
- `src/templates/`: Strongly typed email DTO schemas (`dto/`) and `EmailTemplateFactory` (`factory.ts`).
- `src/renderers/`: Pluggable `IEmailRenderer` interface and responsive `DefaultEmailRenderer`.

---

## Toolchain & Tree-Shaking Quirks

- **Build Pipeline**: `tsup.config.ts` has `dts: false`. Declarations and declaration maps are emitted strictly via `tsc --emitDeclarationOnly`. Never remove `tsc` from the `build` script.
- **`sideEffects: false`**: Configured in `package.json`. Avoid adding top-level eager instantiation, module-scope network calls, or side-effectful top-level statements.
- **Lazy Singletons**: `EmailTemplateFactory.defaultInstance` must remain a lazy getter (`get defaultInstance()`). Eager `new EmailTemplateFactory()` calls at module scope break bundler dead-code elimination.
- **Zero Runtime Dependencies**: Core transports must rely on the standard web `fetch` API. Do not introduce runtime HTTP clients (`axios`, `node-fetch`, or vendor SDKs).

---

## Code Conventions

- **API Structure**:
  - `mailer.send({ to, template, ... })` is the single canonical template dispatch method.
  - `mailer.sendRaw({ to, subject, html, text? })` auto-derives plain-text via `htmlToPlainText` if `text` is omitted.
  - `MailKit` is the canonical client class (created via `createMailKit(...)`).
  - `EmailTemplateDto` is the canonical DTO base interface.
  - `ZeptoMailHttpSender` is the canonical Zoho ZeptoMail HTTP adapter (takes `ZeptoMailHttpConfig`).
  - Transports strictly implement `IEmailSender.send(options: SendMailOptions)`.
  - `parseEmailAddress(input: string): EmailAddress` is a tree-shakeable opt-in helper for RFC 5322 parsing.
- **Reference Data**: `source-data/` is gitignored historical reference data; never import from or write to `source-data/`.
- **Commits**: Follow Conventional Commits (`feat: ...`, `fix: ...`, `chore: ...`, `refactor: ...`, `test: ...`).
- **Single Source of Truth (no aliasing / no re-exports / no spaghetti)**:
  - Define each type/interface exactly once in its canonical module (e.g. parameter objects live in `src/templates/dto/index.ts`).
  - Consumers import the canonical type directly — never create `export type X = Y` aliases to match method names.
  - Never re-export imported types from intermediate modules (`factory.ts` must not `export type { ... }` what `dto/index.ts` already exports; `src/index.ts` barrel re-exports are the only exception).
  - Method signatures reference canonical names verbatim (e.g. `createNewsLetter(params: NewsletterParams)`, not `NewsLetterParams`).
