# ts-mailkit

Strictly typed, modular, and composable email composition and dispatch library for TypeScript and modern edge runtimes.

Works seamlessly in **Node.js**, **Cloudflare Workers** (`workerd`), **Bun**, **Deno**, **Next.js**, and **Vercel Edge Functions**.

---

## Key Features

- **Type-Safe DTOs**: Strongly-typed Data Transfer Objects for transactional emails (verification, password reset, 2FA, magic links, newsletters).
- **Pluggable Transports (`IEmailSender`)**: Decoupled transport adapter interface with built-in senders:
  - `ZeptoMailSender` (Zoho Mail transactional API via native `fetch`).
  - `MemoryEmailSender` (In-memory mock transport for unit and integration testing).
  - `ConsoleEmailSender` (Formatted terminal logger for local development).
- **Zero Runtime Dependencies**: Core uses standard web APIs (global `fetch`), ensuring zero heavy dependencies and complete edge compatibility.
- **Separation of Concerns**: Strict decoupling between:
  1. DTO schema and validation.
  2. Template building and responsive HTML rendering.
  3. Dispatch via the chosen transport adapter.
- **Multitenant & Dynamic Branding**: Configure global branding, top-center logos, or pass a dynamic brand name resolver for multi-tenant applications.
- **Top-Center Brand Logo**: Display your brand or company logo top-center with automatic HTTP(S) URL validation.
- **Auto Plain-Text Fallbacks**: When sending custom or raw HTML, accessible plain-text equivalents are cleanly generated automatically if not explicitly provided.
- **RFC 5322 Address Parser**: Optional utility to safely parse `"Display Name <email@example.com>"` strings into structured address objects.
- **Template Preview**: Inspect [`demo-newsletter.html`](demo-newsletter.html) directly in the root folder to view the responsive default email template before installing.
- **Dual ESM & CommonJS**: Full support for `import` and `require` with first-class TypeScript declaration maps.

---

## Installation

Install using your preferred package manager:

```bash
# pnpm
pnpm add ts-mailkit

# npm
npm install ts-mailkit

# yarn
yarn add ts-mailkit

# bun
bun add ts-mailkit
```

---

## Quick Start

### 1. Initialize Transport & Client

```ts
import { createMailKit, ZeptoMailSender, EmailTemplateFactory } from 'ts-mailkit';

// Configure the Zoho ZeptoMail HTTP transport
const transport = new ZeptoMailSender({
  apiToken: process.env.ZEPTO_MAIL_TOKEN!,
  apiHost: 'api.zeptomail.com', // or 'api.zeptomail.eu', 'api.zeptomail.in'
  from: { address: 'noreply@yourdomain.com', name: 'Acme App' },
});

// Initialize the MailKit client
const mailer = createMailKit({
  transport,
  defaultBrandName: 'Acme App',
});
```

### 2. Compose and Send Using Typed DTOs

```ts
// 1. Create a strongly typed email verification DTO
const verificationEmail = EmailTemplateFactory.createEmailVerification(
  'Alex',
  'https://app.example.com/verify?token=xyz123',
  '482910'
);

// 2. Dispatch via MailKit
await mailer.send({
  to: 'alex@example.com',
  template: verificationEmail,
});
```

---

## Common Use Cases

### 1. Built-in Transactional Templates

`EmailTemplateFactory` provides type-safe constructors for standard transactional patterns:

```ts
import { EmailTemplateFactory } from 'ts-mailkit';

// Email Verification with OTP
const verifyDto = EmailTemplateFactory.createEmailVerification(
  'Jordan',
  'https://app.com/verify?token=abc',
  '123456'
);

// Password Reset
const resetDto = EmailTemplateFactory.createPasswordReset(
  'Jordan',
  'https://app.com/reset?token=abc',
  '654321'
);

// Two-Factor Authentication (2FA)
const twoFactorDto = EmailTemplateFactory.create2FAEmail(
  'Jordan',
  '987654',
  'https://app.com/2fa/magic?token=abc'
);

// Magic Link Sign-in
const magicLinkDto = EmailTemplateFactory.createMagicLinkEmail(
  'Jordan',
  'https://app.com/auth/magic?token=abc'
);

// Newsletter / Announcement
const newsDto = EmailTemplateFactory.createNewsLetter(
  'Product Update - Fall 2026',
  'Introducing New Features',
  'Here is what our team shipped this month.',
  'https://cdn.example.com/hero.png',
  'https://app.com/blog/update',
  'Read Release Notes'
);
```

### 2. Custom Branding & Multi-tenancy

You can instantiate `EmailTemplateFactory` with brand-level defaults:

```ts
const tenantFactory = new EmailTemplateFactory({
  brandName: 'St. Patrick High School',
  logoUrl: 'https://school.edu/assets/logo.png',
  securityMessage: 'If you did not make this request, contact our school IT administration immediately.',
  footer: (brand) => `© ${new Date().getFullYear()} ${brand}. Authorized educational portal.`,
});

const studentEmail = tenantFactory.createEmailVerification(
  'Student',
  'https://school.edu/verify',
  '554433'
);
```

Or pass a dynamic tenant resolver to `MailKit`:

```ts
const mailer = createMailKit({
  transport,
  defaultFrom: 'notifications@portal.edu',
  brandNameResolver: async () => {
    // Dynamically retrieve active tenant brand from request context or DB
    return 'Springfield Academy';
  },
});
```

### 3. Testing with `MemoryEmailSender`

Easily write unit and integration tests without hitting third-party APIs or mocking network sockets:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createMailKit, MemoryEmailSender, EmailTemplateFactory } from 'ts-mailkit';

describe('User Registration Email', () => {
  let memoryTransport: MemoryEmailSender;
  let mailer: ReturnType<typeof createMailKit>;

  beforeEach(() => {
    memoryTransport = new MemoryEmailSender();
    mailer = createMailKit({ transport: memoryTransport });
  });

  it('sends verification code to the registered user', async () => {
    const dto = EmailTemplateFactory.createEmailVerification(
      'Sam',
      'https://app.com/verify?token=123',
      '889900'
    );

    await mailer.send({ to: 'sam@example.com', template: dto });

    expect(memoryTransport.count()).toBe(1);
    const sent = memoryTransport.getLastMail();
    expect(sent?.subject).toBe('Verify Your Email Address');
    expect(sent?.html).toContain('889900');
    expect(sent?.text).toContain('Your verification code is: 889900');
  });
});
```

### 4. Sending Raw Emails (No Template DTO)

For custom HTML or plain-text messages. When `text` is omitted, an accessible plain-text fallback is automatically extracted from the `html`:

```ts
await mailer.sendRaw({
  to: [{ address: 'support@example.com', name: 'Support Team' }],
  subject: 'Urgent System Alert',
  html: '<h1>System Alert</h1><p>Database failover completed successfully.</p>',
  // text is optional — auto-converted from html if omitted
  attachments: [
    {
      filename: 'report.txt',
      content: 'Database log summary...',
      mimeType: 'text/plain',
    },
  ],
});
```

### 5. Parsing RFC 5322 Email Addresses

If your application receives combined address strings like `"Jane Doe <jane@example.com>"`, use the standalone, tree-shakeable `parseEmailAddress` helper:

```ts
import { parseEmailAddress } from 'ts-mailkit';

const recipient = parseEmailAddress('Jane Doe <jane@example.com>');
// => { address: 'jane@example.com', name: 'Jane Doe' }

const simple = parseEmailAddress('jane@example.com');
// => { address: 'jane@example.com' }
```

### 6. Pluggable Transports (`IEmailSender`)

You can implement custom transports (e.g. SMTP, Resend, SendGrid, Postmark) by satisfying the `IEmailSender` interface:

```ts
import type { IEmailSender, SendMailOptions, SendResult } from 'ts-mailkit';

export class CustomSmtpSender implements IEmailSender {
  readonly name = 'smtp';

  async send(options: SendMailOptions): Promise<SendResult> {
    // Custom dispatch logic using your preferred protocol or client
    return {
      success: true,
      messageId: 'custom-id-123',
    };
  }
}
```

---

## Template Preview

You can inspect what the default responsive email template looks like without writing code or installing the library:

- 📄 **[demo-newsletter.html](demo-newsletter.html)** &mdash; Standalone, fully pre-rendered HTML newsletter showcasing top-center brand logo, hero banner, typography, call-to-action button, and footer. Generated automatically during the test suite.

---

## Development & Testing

```bash
# Install dependencies
pnpm install

# Run unit tests
pnpm test:unit

# Type check
pnpm run typecheck

# Build dual ESM/CJS bundles + .d.ts types
pnpm run build

# Prepublish verification
pnpm run prepublishOnly
```

---

## License

[MIT](LICENSE)
