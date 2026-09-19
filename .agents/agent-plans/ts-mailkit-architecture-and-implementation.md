# Plan: `ts-mailkit` Architecture & Library Foundation

## Summary
`ts-mailkit` is a modular, zero-runtime-dependency (core), TypeScript-first email library designed to abstract email composition, templating, and dispatch via strictly typed Data Transfer Objects (DTOs) and pluggable transport adapters (`IEmailSender`).

This plan aligns the repository tooling with [`ad-rian-studio-ai`](/home/adrian/CodeSpace/Projects/NodeJs/ad-rian-studio-ai):
- `pnpm@11.22.0` with `pnpm-workspace.yaml`
- `tsup` dual ESM/CJS build with `tsc --emitDeclarationOnly`
- Strict `tsconfig.json` with NodeNext resolution and ES2022 target
- `vitest` unit test suite under `test/unit/`
- Zero external runtime dependencies for core + ZeptoMail HTTP adapter (using standard `fetch`).

---

## Scope
- **In-Scope**:
  - Scaffolding matching `ad-rian-studio-ai` (`package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `.gitignore`).
  - Core domain models: `EmailEnvelope`, `Recipient`, `SendMailOptions`, `SendResult`, and error hierarchy.
  - Pluggable transport architecture (`IEmailSender` interface):
    - `ZeptoMailSender` (Zoho Mail transactional API via native `fetch`).
    - `MemoryEmailSender` (in-memory transport for testing and local development).
    - `ConsoleEmailSender` (logging transport for debugging).
  - Decoupled DTO & Template system:
    - Strongly-typed DTOs for standard transactional use cases (Email Verification, Password Reset, Magic Link, 2FA, Newsletter, Simple Notification).
    - Configurable `EmailTemplateFactory` supporting customizable branding (app name, logo, colors, support links, footer).
    - Responsive HTML and Plaintext email renderer (`DefaultEmailRenderer`) with HTML-to-plaintext conversion.
    - Pluggable renderer contract (`IEmailRenderer`).
  - Orchestration service (`MailKit` / `createMailKit` / `EmailService` alias).
  - Comprehensive unit test suite in `test/unit/`.
  - Comprehensive `README.md`.
- **Out-of-Scope**:
  - Full React/JSX component rendering in core (core remains zero-dependency).
  - Traditional SMTP / Nodemailer adapter (can be added as a separate plugin/transport).

---

## Implementation Steps

### Phase 1: Tooling, Scaffolding & Configuration
1. Initialize Package Manifest & Configuration
   - *Details*: Create `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `.gitignore` matching `ad-rian-studio-ai`.
   - *Dependencies*: None
2. Install Dependencies via `pnpm install`
   - *Dependencies*: Step 1

### Phase 2: Core Types, Contracts & Transport Interface
3. Define Core Messaging Types & Errors
   - *Details*: `src/core/types.ts`, `src/core/errors.ts`.
   - *Dependencies*: Step 2
4. Define Transport Contract & Implement Built-in Transports
   - *Details*: `IEmailSender`, `ZeptoMailSender` (native `fetch`, Zoho HTTP API), `MemoryEmailSender`, `ConsoleEmailSender`.
   - *Dependencies*: Step 3

### Phase 3: DTOs, Templates & Renderers
5. Implement Strongly-Typed DTOs
   - *Details*: `src/templates/dto/` (Verification, Reset, 2FA, MagicLink, Newsletter, SimpleMessage, BaseEmailDto).
   - *Dependencies*: Step 3
6. Implement Email Renderer & Plaintext Helpers
   - *Details*: `IEmailRenderer`, `DefaultEmailRenderer`, `htmlToPlainText`.
   - *Dependencies*: Step 5
7. Implement Configurable Template Factory
   - *Details*: `EmailTemplateFactory` with branding context support.
   - *Dependencies*: Steps 5, 6

### Phase 4: Main Service Facade & Entrypoint
8. Implement Service Orchestration Client
   - *Details*: `MailKit` (`createMailKit`, `EmailService` alias) with high-level `send` (DTO-driven) and `sendRaw`.
   - *Dependencies*: Steps 4, 6, 7
9. Module Entrypoint & Public Exports
   - *Details*: `src/index.ts` exporting public API.
   - *Dependencies*: Step 8
10. Documentation
    - *Details*: Write `README.md` with usage examples matching `ad-rian-studio-ai` format.
    - *Dependencies*: Step 9

### Phase 5: Testing & Verification
11. Unit Test Suite in `test/unit/`
    - *Details*: Tests for `ZeptoMailSender`, `MemoryEmailSender`, `EmailTemplateFactory`, `DefaultEmailRenderer`, `MailKit`.
    - *Dependencies*: Steps 8, 9
12. Build & Typecheck Verification
    - *Details*: Run `pnpm run typecheck`, `pnpm run test:unit`, and `pnpm run build`.
    - *Dependencies*: Step 11

---

## Verification Plan
1. **Automated Tests**:
   - `pnpm test:unit`: Vitest test suite.
   - `pnpm run typecheck`: TypeScript compilation check (`tsc --noEmit`).
   - `pnpm run build`: `tsup && tsc --emitDeclarationOnly`.
2. **Manual Verification**:
   - Verify `dist/` contains valid `.js`, `.cjs`, `.d.ts`, and `.d.ts.map` bundles.
