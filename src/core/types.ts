/**
 * Standard email address representation with optional display name.
 */
export interface EmailAddress {
  address: string;
  name?: string;
}

/**
 * Flexible recipient representation allowing string ('user@example.com'),
 * EmailAddress ({ address: 'user@example.com', name: 'User' }),
 * or legacy/standard object ({ email: 'user@example.com', name: 'User' }).
 */
export type Recipient =
  | string
  | EmailAddress
  | { email: string; name?: string };

/**
 * Parses an RFC 5322 formatted address string into an EmailAddress.
 * Supports formats such as:
 * - "user@example.com" -> { address: "user@example.com" }
 * - "Sender Name <sender@example.com>" -> { name: "Sender Name", address: "sender@example.com" }
 * - "\"Sender Name\" <sender@example.com>" -> { name: "Sender Name", address: "sender@example.com" }
 */
export function parseEmailAddress(input: string): EmailAddress {
  if (!input || typeof input !== 'string') {
    return { address: '' };
  }
  const trimmed = input.trim();
  const match = trimmed.match(/^(?:["']?([^"']+)["']?\s+)?<?([^\s<>@]+@[^\s<>@]+)>?$/);
  if (!match) {
    return { address: trimmed };
  }
  return {
    address: match[2].trim(),
    name: match[1]?.trim() || undefined,
  };
}

/**
 * Normalizes a Recipient value into a standardized EmailAddress.
 */
export function normalizeRecipient(recipient: Recipient): EmailAddress {
  if (typeof recipient === 'string') {
    return { address: recipient.trim() };
  }
  if ('email' in recipient) {
    return {
      address: (recipient.email ?? '').trim(),
      name: recipient.name?.trim(),
    };
  }
  return {
    address: (recipient.address ?? '').trim(),
    name: recipient.name?.trim(),
  };
}

/**
 * Normalizes a single or array of Recipients into an array of EmailAddress.
 */
export function normalizeRecipients(
  recipients?: Recipient | Recipient[]
): EmailAddress[] {
  if (!recipients) return [];
  const list = Array.isArray(recipients) ? recipients : [recipients];
  return list.map(normalizeRecipient).filter((r) => r.address.length > 0);
}

/**
 * Email attachment representation.
 */
export interface EmailAttachment {
  filename: string;
  /**
   * Content can be base64-encoded string, plain text, or binary Buffer/Uint8Array.
   */
  content: string | Uint8Array;
  mimeType?: string;
  contentType?: string;
  cid?: string;
}

/**
 * Options for sending an email through a transport adapter.
 */
export interface SendMailOptions {
  to: Recipient | Recipient[];
  from?: Recipient;
  subject: string;
  html: string;
  text?: string;
  cc?: Recipient | Recipient[];
  bcc?: Recipient | Recipient[];
  replyTo?: Recipient | Recipient[];
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  tags?: string[];
  metadata?: Record<string, string>;
}

/**
 * Result returned by an IEmailSender upon dispatch.
 */
export interface SendResult {
  success: boolean;
  messageId?: string;
  response?: unknown;
}
