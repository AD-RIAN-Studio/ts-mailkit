# Bulk Messaging API Support (Refined v2)

**Root:** `ts-mailkit`
**Plan file:** `.agents/agent-plans/bulk-messaging-api.md`
**Status:** Refined — ready for approval (no open questions remain)

---

## Summary (TL;DR)

Expand the existing `MailKit` send pattern (feature addition, not a new transport architecture) with four canonical methods, backed by the four Zoho CPaaS endpoints. **No loops in our own implementations** — bulk methods hit the batch endpoints directly. Third parties can implement `IEmailSender` differently.

| `MailKit` method        | Content source                                         | Endpoint (default `cpaas.zoho.com`) |
| ----------------------- | ------------------------------------------------------ | ----------------------------------- |
| `sendMail`              | In-built `EmailTemplateDto` (renamed from `send`)      | `POST /v1.1/email`                  |
| `sendKnownTemplate`     | Provider-side `templateId`                             | `POST /v1.1/email/template`         |
| `sendBulkMail`          | In-built `EmailTemplateDto`                            | `POST /v1.1/email/batch`            |
| `sendBulkKnownTemplate` | Provider-side `templateId` + per-recipient `mergeInfo` | `POST /v1.1/email/template/batch`   |
| `sendRaw` (kept)        | Raw HTML/text                                          | `POST /v1.1/email`                  |

Plus:

- **Unified `SendResult`** with `rawResponse` (raw provider response).
- **Exported Zoho response types** so users can type-check `rawResponse`.
- **Rename ZeptoMail → Cpaas** with deprecated aliases for backward compatibility.
- **`buildHTMLTemplate` / `buildPlainTextTemplate`** utilities from the canonical `EmailTemplateDto`.

---

## Confirmed Decisions (from user feedback)

| #   | Decision                                                                                                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Follow and expand the established pattern; no new transport architecture.                                                                                  |
| D2  | Use **"bulk"** naming.                                                                                                                                     |
| D3  | **Rename + expand ZeptoMail → Cpaas.** Keep old names as deprecated aliases.                                                                               |
| D4  | Reuse the canonical `EmailTemplateDto`.                                                                                                                    |
| D5  | `templateId` is a plain string. Alias support via `CpaasHttpConfig.preferTemplateAlias?: boolean` (sends `template_alias` instead of `template_key`).      |
| D6  | Unified `SendResult` with `rawResponse` (raw provider response).                                                                                           |
| D7  | Zero runtime deps; global `fetch`.                                                                                                                         |
| D8  | **No loops** in built-in transports — use batch endpoints.                                                                                                 |
| D9  | Errors surface via **throw** (`TransportError`, carrying the raw response) or a failed `SendResult`; `SendResult.rawResponse` holds the provider response. |
| D10 | **Export Zoho API response types** for user import/type-checking.                                                                                          |
| D11 | **Keep old/renamed fields as deprecated aliases** so users can migrate.                                                                                    |
| D12 | All endpoints default to **`cpaas.zoho.com`**.                                                                                                             |
| D13 | `sendMail` **replaces** `send` (`send` kept as deprecated alias).                                                                                          |
| D14 | Rename `SendResult.response` → `SendResult.rawResponse` (`response` kept as deprecated alias).                                                             |

---

## Proposed API Design

### Unified response (`src/core/types.ts`)

```ts
export interface SendResult {
  success: boolean;
  messageId?: string;
  /** Raw provider response (e.g. Zoho CPaaS JSON body). */
  rawResponse?: unknown;
  /** @deprecated Use `rawResponse`. */
  response?: unknown;
}
```

Every built-in transport sets both `rawResponse` and `response` (same value) for backward compatibility.

### Zoho response types (`src/transports/cpaas/types.ts`)

Exported so users can import and inspect `rawResponse`:

```ts
/** One entry in a Zoho CPaaS success `data` array. */
export interface CpaasResponseItem {
  code?: string; // e.g. "EM_104"
  message?: string; // e.g. "OK"
  message_id?: string; // single-send endpoint
}

/** Zoho CPaaS success body (HTTP 200). */
export interface CpaasSuccessResponse {
  data?: CpaasResponseItem[];
  message?: string; // e.g. "OK"
  request_id?: string; // e.g. "req-xxxx"
}

/** Zoho CPaaS error `data` (HTTP 400). */
export interface CpaasErrorData {
  error_code?: string; // e.g. "TM_3004"
  message?: string; // e.g. "Invalid request"
}

/** Zoho CPaaS error body (HTTP 400). */
export interface CpaasErrorResponse {
  data?: CpaasErrorData;
  message?: string; // e.g. "error"
}
```

### Transport interface (`src/transports/sender.interface.ts`)

```ts
export interface IEmailSender {
  readonly name: string;

  /** Single raw email (existing). */
  send(options: SendMailOptions): Promise<SendResult>;

  /** Batch raw email (batch endpoint). Optional; MailKit throws if missing. */
  sendBulk?(options: BulkSendOptions): Promise<SendResult>;

  /** Single provider-side template. Optional; MailKit throws if missing. */
  sendKnownTemplate?(options: KnownTemplateSendOptions): Promise<SendResult>;

  /** Batch provider-side template + mergeInfo. Optional; MailKit throws if missing. */
  sendBulkKnownTemplate?(options: BulkKnownTemplateSendOptions): Promise<SendResult>;
}
```

Optional methods keep existing custom transports compiling. `MailKit` throws `ConfigurationError` when a needed capability is absent — **no loop fallback**.

### New option types (`src/core/bulk-types.ts`)

```ts
import type { EmailAttachment, Recipient, SendMailOptions } from "./types.js";
import type { EmailTemplateDto } from "../templates/dto/index.js";

/** A recipient with optional provider merge variables. */
export interface BulkRecipient {
  address: string;
  name?: string;
  /** Provider-side merge variables (Zoho `merge_info`). */
  mergeInfo?: Record<string, string>;
}

/** Transport-level batch raw email (one content, many recipients). */
export interface BulkSendOptions extends SendMailOptions {
  trackClicks?: boolean;
  trackOpens?: boolean;
  bounceAddress?: string;
  clientReference?: string;
}

/** Single provider-side template send. */
export interface KnownTemplateSendOptions {
  templateId: string;
  to: Recipient;
  from?: Recipient;
  mergeInfo?: Record<string, string>;
  cc?: Recipient | Recipient[];
  bcc?: Recipient | Recipient[];
  replyTo?: Recipient | Recipient[];
  attachments?: EmailAttachment[];
  trackClicks?: boolean;
  trackOpens?: boolean;
  bounceAddress?: string;
  clientReference?: string;
}

/** Batch provider-side template send. */
export interface BulkKnownTemplateSendOptions {
  templateId: string;
  to: BulkRecipient[];
  from?: Recipient;
  cc?: Recipient | Recipient[];
  bcc?: Recipient | Recipient[];
  replyTo?: Recipient | Recipient[];
  attachments?: EmailAttachment[];
  trackClicks?: boolean;
  trackOpens?: boolean;
  bounceAddress?: string;
  clientReference?: string;
}

/** Client-level bulk manual-template send (canonical DTO). */
export interface SendBulkMailOptions {
  template: EmailTemplateDto;
  to: Recipient | Recipient[];
  from?: Recipient;
  cc?: Recipient | Recipient[];
  bcc?: Recipient | Recipient[];
  replyTo?: Recipient | Recipient[];
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  tags?: string[];
  metadata?: Record<string, string>;
  trackClicks?: boolean;
  trackOpens?: boolean;
}
```

### `MailKit` methods (`src/core/client.ts`)

```ts
// Rename of send(); `send` kept as deprecated alias.
sendMail(options: SendTemplateOptions): Promise<SendResult>

// Single provider-side template.
sendKnownTemplate(options: KnownTemplateSendOptions): Promise<SendResult>

// Bulk manual template: render once → transport.sendBulk (batch endpoint, no loop).
sendBulkMail(options: SendBulkMailOptions): Promise<SendResult>

// Bulk provider-side template.
sendBulkKnownTemplate(options: BulkKnownTemplateSendOptions): Promise<SendResult>

// Kept unchanged.
sendRaw(options: SendMailOptions): Promise<SendResult>
```

Behavior:

- `sendBulkMail` renders the DTO **once**, then calls `transport.sendBulk`. The Zoho batch endpoint delivers individually per recipient (privacy fixed). Per-recipient personalization requires `sendBulkKnownTemplate`.
- `sendBulkMail` throws `ConfigurationError` if the transport lacks `sendBulk` (no loop fallback).
- `sendKnownTemplate` / `sendBulkKnownTemplate` throw `ConfigurationError` if unsupported.

### Cpaas transport (`src/transports/cpaas/`)

Rename and expand:

- `zeptomail/` → `cpaas/`
- `ZeptoMailHttpSender` → `CpaasHttpSender`
- `ZeptoMailHttpConfig` → `CpaasHttpConfig` (add `preferTemplateAlias?: boolean`)
- `ZeptoMailSendPayload` → `CpaasSendPayload`
- New payload types: `CpaasBatchSendPayload`, `CpaasTemplateSendPayload`, `CpaasBatchTemplateSendPayload`
- `apiHost` default changes to `cpaas.zoho.com`

Endpoints (all `https://{apiHost}/…`, default `cpaas.zoho.com`):

| Method                  | Path                         | Body shape                                                                                                                                                         |
| ----------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `send`                  | `/v1.1/email`                | `{ from, to[], subject, htmlbody, textbody?, cc?, bcc?, reply_to?, attachments? }`                                                                                 |
| `sendBulk`              | `/v1.1/email/batch`          | `{ from, to[], subject, htmlbody, textbody?, cc?, bcc?, reply_to?, attachments?, track_clicks?, track_opens?, bounce_address?, client_reference? }`                |
| `sendKnownTemplate`     | `/v1.1/email/template`       | `{ template_key \| template_alias, from, to[], merge_info?, cc?, bcc?, reply_to?, attachments?, track_clicks?, track_opens?, bounce_address?, client_reference? }` |
| `sendBulkKnownTemplate` | `/v1.1/email/template/batch` | `{ template_key \| template_alias, from, to[{ email_address, merge_info }], cc?, bcc?, reply_to?, attachments?, track_clicks?, track_opens? }`                     |

`template_key` vs `template_alias`:

- Default: `template_key = templateId`
- When `CpaasHttpConfig.preferTemplateAlias === true`: `template_alias = templateId`

Response mapping:

- Success → `{ success: true, messageId: data[0]?.message_id, rawResponse: body, response: body }`
- Error (non-ok) → throw `TransportError` with `responseBody` and `rawResponse` (parsed error) in details.

### Template build utilities (`src/templates/template-builder.ts`)

```ts
export interface TemplateBuildOptions {
  primaryColor?: string;
  fontFamily?: string;
  maxWidth?: string;
  logoUrl?: string;
}

/** Upload-ready HTML from the canonical EmailTemplateDto. */
export function buildHTMLTemplate(dto: EmailTemplateDto, options?: TemplateBuildOptions): string;

/** Upload-ready plain text from the canonical EmailTemplateDto. */
export function buildPlainTextTemplate(
  dto: EmailTemplateDto,
  options?: TemplateBuildOptions,
): string;
```

Reuses `buildHtml` / `buildPlainText` from `src/renderers/default/default-renderer.ts`.

### Backward-compatibility aliases

```ts
// src/index.ts (or a dedicated legacy module)
/** @deprecated Use `CpaasHttpSender`. */
export { CpaasHttpSender as ZeptoMailHttpSender } from "./transports/cpaas/cpaas-sender.js";
/** @deprecated Use `CpaasHttpConfig`. */
export type { CpaasHttpConfig as ZeptoMailHttpConfig } from "./transports/cpaas/types.js";
/** @deprecated Use `CpaasSendPayload`. */
export type { CpaasSendPayload as ZeptoMailSendPayload } from "./transports/cpaas/types.js";
/** @deprecated Use `CpaasAttachmentPayload`. */
export type { CpaasAttachmentPayload as ZeptoMailAttachmentPayload } from "./transports/cpaas/types.js";
```

- `MailKit.send` → deprecated alias calling `sendMail`.
- `SendResult.response` → deprecated alias mirroring `rawResponse`.
- Keep `src/transports/zeptomail/zeptomail-sender.ts` as a thin re-export shim for deep-path importers (not exported from the barrel).

---

## Steps

### Phase 1 — Core types & interface

1. **1.1** Extend `SendResult` with `rawResponse` (+ deprecated `response`) in `src/core/types.ts`. _(no deps)_
2. **1.2** Create `src/core/bulk-types.ts` with `BulkRecipient`, `BulkSendOptions`, `KnownTemplateSendOptions`, `BulkKnownTemplateSendOptions`, `SendBulkMailOptions`. _(depends 1.1)_
3. **1.3** Extend `IEmailSender` with optional `sendBulk`, `sendKnownTemplate`, `sendBulkKnownTemplate` in `src/transports/sender.interface.ts`. _(depends 1.2)_

### Phase 2 — Cpaas transport rename & expansion

4. **2.1** Rename `src/transports/zeptomail/` → `src/transports/cpaas/`; rename `ZeptoMail*` → `Cpaas*`; default host `cpaas.zoho.com`; add shim at old path. _(depends 1.3)_
5. **2.2** Add `preferTemplateAlias`, `CpaasBatchSendPayload`, `CpaasTemplateSendPayload`, `CpaasBatchTemplateSendPayload`, and Zoho response types. _(depends 2.1)_
6. **2.3** Implement `sendBulk`, `sendKnownTemplate`, `sendBulkKnownTemplate` (batch endpoints, no loops), populate `rawResponse`/`response`. _(depends 2.2)_

### Phase 3 — MailKit integration

7. **3.1** Rename `send` → `sendMail`; keep `send` as deprecated alias. _(depends 1.2)_
8. **3.2** Implement `sendBulkMail` (render once → `transport.sendBulk`; `ConfigurationError` if unsupported). _(depends 3.1, 2.3)_
9. **3.3** Implement `sendKnownTemplate` and `sendBulkKnownTemplate` (capability check → `ConfigurationError`). _(depends 3.1, 2.3)_

### Phase 4 — Build utilities

10. **4.1** Create `src/templates/template-builder.ts` (`buildHTMLTemplate`, `buildPlainTextTemplate`, `TemplateBuildOptions`). _(no deps)_

### Phase 5 — Other transports

11. **5.1** `MemoryEmailSender`: populate `rawResponse`; implement `sendBulk`, `sendKnownTemplate`, `sendBulkKnownTemplate` (record, no loops). _(depends 1.3)_
12. **5.2** `ConsoleEmailSender`: populate `rawResponse`; implement the three methods (log, no loops). _(depends 1.3)_

### Phase 6 — Exports & tests

13. **6.1** Update `src/index.ts` barrel: bulk-types, cpaas (new names), template-builder, deprecated aliases. _(depends 1.2–4.1)_
14. **6.2** Rename `test/unit/zeptomail-sender.test.ts` → `cpaas-sender.test.ts`; add tests for `sendBulk`, `sendKnownTemplate`, `sendBulkKnownTemplate`, `rawResponse`, error bodies, and `preferTemplateAlias`. _(depends 2.3)_
15. **6.3** Add `test/unit/template-builder.test.ts`. _(depends 4.1)_
16. **6.4** Add `sendMail`/`sendBulkMail`/`sendKnownTemplate`/`sendBulkKnownTemplate` tests to `test/unit/client.test.ts` (incl. deprecated `send` alias). _(depends 3.3)_
17. **6.5** Add `test/unit/bulk-types.test.ts` (type/shape sanity). _(depends 1.2)_

### Phase 7 — Changelog & verification

18. **7.1** Update `changelogs/v2.md` (`feat:` bulk API, `refactor:` ZeptoMail→Cpaas rename, deprecations). _(depends all)_
19. **7.2** Run `pnpm run check && pnpm run typecheck && pnpm test:unit && pnpm run build`. _(depends all)_

---

## Relevant Files

| File                                           | Action                                                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/core/types.ts`                            | Edit — `SendResult.rawResponse` + deprecated `response`                                       |
| `src/core/bulk-types.ts`                       | Create — bulk/template option types                                                           |
| `src/transports/sender.interface.ts`           | Edit — optional bulk/template methods                                                         |
| `src/transports/cpaas/types.ts`                | Create (from zeptomail) — config, payloads, Zoho response types                               |
| `src/transports/cpaas/cpaas-sender.ts`         | Create (from zeptomail) — `CpaasHttpSender` + 4 endpoints                                     |
| `src/transports/zeptomail/zeptomail-sender.ts` | Keep as deprecated shim                                                                       |
| `src/core/client.ts`                           | Edit — `sendMail`, `sendBulkMail`, `sendKnownTemplate`, `sendBulkKnownTemplate`, `send` alias |
| `src/templates/template-builder.ts`            | Create — build utilities                                                                      |
| `src/transports/memory/memory-sender.ts`       | Edit — `rawResponse` + new methods                                                            |
| `src/transports/console/console-sender.ts`     | Edit — `rawResponse` + new methods                                                            |
| `src/index.ts`                                 | Edit — exports + deprecated aliases                                                           |
| `changelogs/v2.md`                             | Edit — changelog                                                                              |
| `test/unit/cpaas-sender.test.ts`               | Create (rename from zeptomail test)                                                           |
| `test/unit/template-builder.test.ts`           | Create                                                                                        |
| `test/unit/bulk-types.test.ts`                 | Create                                                                                        |
| `test/unit/client.test.ts`                     | Edit — new method tests                                                                       |

**Reference (read-only):**

- `src/transports/zeptomail/zeptomail-sender.ts` — fetch/error pattern
- `src/renderers/default/default-renderer.ts` — `buildHtml` / `buildPlainText`
- `src/templates/dto/index.ts` — `EmailTemplateDto`

---

## Verification

```bash
pnpm run check
pnpm run typecheck
pnpm test:unit
pnpm run build
```

Behavior checks:

- `sendBulkMail` calls `POST /v1.1/email/batch` (not a loop); delivers individually per recipient.
- `sendBulkKnownTemplate` maps `to[].mergeInfo` → `merge_info` on `POST /v1.1/email/template/batch`.
- `sendKnownTemplate` maps `mergeInfo` → top-level `merge_info` on `POST /v1.1/email/template`.
- `preferTemplateAlias: true` sends `template_alias` instead of `template_key`.
- All endpoints default to `cpaas.zoho.com`.
- `SendResult.rawResponse` is populated; `response` mirrors it (deprecated).
- `TransportError` on non-ok responses carries the raw error body.
- Deprecated aliases (`ZeptoMailHttpSender`, `ZeptoMailHttpConfig`, `send`, `response`) still resolve.

---

## Non-Goals

- SMS/WhatsApp support (library is email-focused).
- Provider template CRUD (create/update/delete on Zoho/SendGrid).
- SendGrid-specific transport (build utilities produce generic upload-ready content).
- Removing `send`, `sendRaw`, `response`, or ZeptoMail names (kept as deprecated aliases).
- Loop-based bulk fallback (bulk requires a transport that implements the batch methods).
