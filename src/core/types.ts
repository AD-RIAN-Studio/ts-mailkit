import type { EmailTemplateDto } from "../templates/dto/index.js";

/**
 * Standard email address representation with optional display name.
 */
export interface EmailAddress {
  address: string;
  name?: string;
}

/**
 * A recipient with optional provider-side merge variables.
 */
export interface BulkRecipient extends EmailAddress {
  /**
   * Provider-side merge variables (e.g. Zoho CPaaS `merge_info`).
   */
  mergeInfo?: Record<string, string>;
}

/**
 * Flexible recipient representation allowing string ('user@example.com'),
 * EmailAddress ({ address: 'user@example.com', name: 'User' }),
 * or legacy/standard object ({ email: 'user@example.com', name: 'User' }).
 */
export type Recipient = string | EmailAddress | { email: string; name?: string };

/**
 * Parses an RFC 5322 formatted address string into an EmailAddress.
 * Supports formats such as:
 * - "user@example.com" -> { address: "user@example.com" }
 * - "Sender Name <sender@example.com>" -> { name: "Sender Name", address: "sender@example.com" }
 * - "\"Sender Name\" <sender@example.com>" -> { name: "Sender Name", address: "sender@example.com" }
 */
export function parseEmailAddress(input: string): EmailAddress {
  if (!input || typeof input !== "string") {
    return { address: "" };
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
  if (typeof recipient === "string") {
    return { address: recipient.trim() };
  }
  if ("email" in recipient) {
    return {
      address: (recipient.email ?? "").trim(),
      name: recipient.name?.trim(),
    };
  }
  return {
    address: (recipient.address ?? "").trim(),
    name: recipient.name?.trim(),
  };
}

/**
 * Normalizes a single or array of Recipients into an array of EmailAddress.
 */
export function normalizeRecipients(recipients?: Recipient | Recipient[]): EmailAddress[] {
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
 * Common sender and recipient addressing options.
 */
export interface MailAddressOptions {
  /**
   * Optional sender address override.
   */
  from?: Recipient;
  /**
   * Optional CC recipients.
   */
  cc?: Recipient | Recipient[];
  /**
   * Optional BCC recipients.
   */
  bcc?: Recipient | Recipient[];
  /**
   * Optional Reply-To recipients.
   */
  replyTo?: Recipient | Recipient[];
  /**
   * Optional file attachments.
   */
  attachments?: EmailAttachment[];
}

/**
 * Common custom header, tag, and metadata options.
 */
export interface MailMetadataOptions {
  /**
   * Optional custom headers.
   */
  headers?: Record<string, string>;
  /**
   * Optional tags for tracking.
   */
  tags?: string[];
  /**
   * Optional metadata.
   */
  metadata?: Record<string, string>;
}

/**
 * Common provider tracking and reference options.
 */
export interface TrackingOptions {
  /**
   * Enable or disable click tracking.
   */
  trackClicks?: boolean;
  /**
   * Enable or disable open tracking.
   */
  trackOpens?: boolean;
  /**
   * Verified bounce (Return-Path) address.
   */
  bounceAddress?: string;
  /**
   * Custom reference string to identify the email in your system.
   */
  clientReference?: string;
}

/**
 * Options for sending an email through a transport adapter.
 */
export interface SendMailOptions extends MailAddressOptions, MailMetadataOptions {
  to: Recipient | Recipient[];
  subject: string;
  html: string;
  text?: string;
}

/**
 * Transport-level batch of a single raw email content to many recipients.
 *
 * The provider delivers an individual copy to each recipient, so recipients
 * are not exposed to one another.
 */
export type BulkSendOptions = SendMailOptions & TrackingOptions;

/**
 * Options for sending a single email using a provider-side template.
 */
export interface KnownTemplateSendOptions extends MailAddressOptions, TrackingOptions {
  /**
   * Provider-side template identifier (e.g. Zoho `template_key`).
   */
  templateId: string;
  /**
   * Recipient email address.
   */
  to: Recipient;
  /**
   * Template variable substitutions.
   */
  mergeInfo?: Record<string, string>;
}

/**
 * Options for sending a batch of emails using a provider-side template.
 *
 * Each recipient may carry its own `mergeInfo` so the provider can
 * personalize the template per recipient.
 */
export interface BulkKnownTemplateSendOptions extends MailAddressOptions, TrackingOptions {
  /**
   * Provider-side template identifier (e.g. Zoho `template_key`).
   */
  templateId: string;
  /**
   * Recipients, each with optional per-recipient merge variables.
   */
  to: BulkRecipient[];
}

/**
 * Client-level options for sending a bulk email using the in-built template DTO.
 */
export interface SendBulkMailOptions
  extends MailAddressOptions, MailMetadataOptions, TrackingOptions {
  /**
   * Templated email DTO to render and send to every recipient.
   */
  template: EmailTemplateDto;
  /**
   * One or more recipient email addresses.
   */
  to: Recipient | Recipient[];
}

/**
 * Result returned by an IEmailSender upon dispatch.
 */
export interface SendResult {
  success: boolean;
  messageId?: string;
  /** Raw provider response (e.g. Zoho CPaaS JSON body). */
  rawResponse?: unknown;
}
