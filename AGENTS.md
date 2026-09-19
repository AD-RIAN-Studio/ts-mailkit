# AGENTS.md

## Project Overview
`ts-mailkit` is a modular, zero-runtime-dependency TypeScript library for email composition and dispatch via strictly typed Data Transfer Objects (DTOs) and pluggable `IEmailSender` transports.

- **Target runtimes**: Universal (Node.js 18+, Cloudflare Workers `workerd`, Bun, Deno, Next.js Edge).
- **Distribution format**: Dual ESM (`dist/index.js`) and CommonJS (`dist/index.cjs`) with declaration maps (`dist/index.d.ts`).
- **Main entrypoint**: `src/index.ts`.

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
  - `src/transports/zeptomail/`: Zoho ZeptoMail HTTP adapter (uses global `fetch`).
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

## Code & Migration Conventions

- **Deprecated Migration Bridges (Scheduled for removal in v1.0.0)**:
  - Positional overload `mailer.send(to, template, toName)` is deprecated in favor of `mailer.send({ to, template, ... })`.
  - `sendEmail(...)` on `ZeptoMailSender` is deprecated in favor of `send(options: SendMailOptions)`.
  - `sendSimpleMessage(...)` and `buildPlainTextMessage(...)` on `MailKit` are deprecated in favor of `sendRaw(...)` and `render(...)`.
  - `EmailService` alias is deprecated in favor of `MailKit`.
  - `BaseEmailDto` type alias is deprecated in favor of `EmailTemplateDto`.
- **Reference Data**: `source-data/` is gitignored historical reference data; never import from or write to `source-data/`.
- **Commits**: Follow Conventional Commits (`feat: ...`, `fix: ...`, `chore: ...`, `refactor: ...`, `test: ...`).
