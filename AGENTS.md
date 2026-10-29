# AGENTS.md

## Project Overview

`ts-mailkit` is a modular, zero-runtime-dependency TypeScript library for email composition and dispatch via strictly typed Data Transfer Objects (DTOs) and pluggable `IEmailSender` transports.

- **Target runtimes**: Universal (Node.js 18+, Cloudflare Workers `workerd`, Bun, Deno, Next.js Edge).
- **Distribution format**: Dual ESM (`dist/index.js`) and CommonJS (`dist/index.cjs`) with declaration maps (`dist/index.d.ts`).
- **Main entrypoint**: `src/index.ts`.
- **Branching Strategy**: Dedicated branches per major version (e.g. `v0` for 0.x maintenance), with `main` tracking the active latest major release (v3.x).
- **Changelog Convention**: Major changelogs are tracked in `changelogs/` per major version (`changelogs/v0.md`, `changelogs/v1.md`, `changelogs/v2.md`, `changelogs/v3.md`).

---

## Essential Commands

Always use `pnpm`:

- **Format & Lint Check**: `pnpm run check` (`vp check`) or `pnpm run check:fix`
- **Lint**: `pnpm run lint` (`vp lint`)
- **Format**: `pnpm run format` (`vp fmt`)
- **Typecheck**: `pnpm run typecheck` (`tsc --noEmit`)
- **Unit & Contract Tests (all)**: `pnpm test:unit` (`vp test run test/unit`)
- **Unit Test (single file)**: `pnpm run test:unit test/unit/client.test.ts`
- **Watch Tests**: `pnpm run test:watch` (`vp test test/unit`)
- **Build**: `pnpm run build` (`vp pack && tsc --emitDeclarationOnly`)
- **Prepublish Check**: `pnpm run prepublishOnly`

### Verification Sequence

When verifying code changes, execute in this order:

```bash
pnpm run check && pnpm run typecheck && pnpm test:unit && pnpm run build
```

---

## Architectural Boundaries

- `src/core/`: Domain models and option types (`types.ts`), error hierarchy (`errors.ts`), and client facade (`client.ts`). Shared option bases (`MailAddressOptions`, `MailMetadataOptions`, `TrackingOptions`) and bulk/template option types live in `types.ts`.
- `src/transports/`: Pluggable senders implementing `IEmailSender`.
  - `src/transports/cpaas/`: Zoho CPaaS (formerly ZeptoMail) HTTP adapter (`CpaasHttpSender`, uses global `fetch`).
  - `src/transports/memory/`: In-memory transport for unit/integration tests.
  - `src/transports/console/`: Terminal logger transport for dev mode.
- `src/templates/`: Strongly typed email DTO schemas (`dto/`) and `EmailTemplateFactory` (`factory.ts`).
- `src/renderers/`: Pluggable `IEmailRenderer` interface and responsive `DefaultEmailRenderer`.

---

## Toolchain & Tree-Shaking Quirks

- **Build Pipeline**: `tsdown.config.ts` has `dts: false` (explicit — tsdown auto-enables DTS when `package.json` has a `types` field). Declarations and declaration maps are emitted strictly via `tsc --emitDeclarationOnly`. Never remove `tsc` from the `build` script.
- **`sideEffects: false`**: Configured in `package.json`. Avoid adding top-level eager instantiation, module-scope network calls, or side-effectful top-level statements.
- **Lazy Singletons**: `EmailTemplateFactory.defaultInstance` must remain a lazy getter (`get defaultInstance()`). Eager `new EmailTemplateFactory()` calls at module scope break bundler dead-code elimination.
- **Zero Runtime Dependencies**: Core transports must rely on the standard web `fetch` API. Do not introduce runtime HTTP clients (`axios`, `node-fetch`, or vendor SDKs).

---

## Code Conventions

- **API Structure**:
  - `mailer.sendMail({ to, template, ... })` is the canonical single-email template dispatch method.
  - `mailer.sendBulkMail({ to, template, ... })` dispatches one rendered DTO to many recipients via the provider's batch endpoint.
  - `mailer.sendKnownTemplate({ templateId, to, ... })` dispatches a single provider-side template.
  - `mailer.sendBulkKnownTemplate({ templateId, to, ... })` dispatches a provider-side template batch with per-recipient `mergeInfo`.
  - `mailer.sendRaw({ to, subject, html, text? })` auto-derives plain-text via `htmlToPlainText` if `text` is omitted.
  - `MailKit` is the canonical client class (created via `createMailKit(...)`).
  - `EmailTemplateDto` is the canonical DTO base interface.
  - `CpaasHttpSender` is the canonical Zoho CPaaS HTTP adapter (takes `CpaasHttpConfig`).
  - Transports implement `IEmailSender.send(options: SendMailOptions)`; bulk/template capabilities are optional (`sendBulk`, `sendKnownTemplate`, `sendBulkKnownTemplate`).
  - `SendResult.rawResponse` carries the raw provider response.
  - `buildHTMLTemplate(dto, options?)` and `buildPlainTextTemplate(dto)` produce upload-ready provider templates.
  - `parseEmailAddress(input: string): EmailAddress` is a tree-shakeable opt-in helper for RFC 5322 parsing.
- **Reference Data**: `source-data/` is gitignored historical reference data; never import from or write to `source-data/`.
- **Commits**: Follow Conventional Commits (`feat: ...`, `fix: ...`, `chore: ...`, `refactor: ...`, `test: ...`).
- **Single Source of Truth (no aliasing / no re-exports / no spaghetti)**:
  - Define each type/interface exactly once in its canonical module (e.g. parameter objects live in `src/templates/dto/index.ts`).
  - Consumers import the canonical type directly — never create `export type X = Y` aliases to match method names.
  - Never re-export imported types from intermediate modules (`factory.ts` must not `export type { ... }` what `dto/index.ts` already exports; `src/index.ts` barrel re-exports are the only exception).
  - Method signatures reference canonical names verbatim (e.g. `createNewsLetter(params: NewsletterParams)`, not `NewsLetterParams`).
