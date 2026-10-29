import type { EmailAttachment, Recipient, SendMailOptions } from "./types.js";
import type { EmailTemplateDto } from "../templates/dto/index.js";

/**
 * A recipient with optional provider-side merge variables.
 */
export interface BulkRecipient {
  address: string;
  name?: string;
  /**
   * Provider-side merge variables (e.g. Zoho CPaaS `merge_info`).
   */
  mergeInfo?: Record<string, string>;
}

/**
 * Transport-level batch of a single raw email content to many recipients.
 *
 * The provider delivers an individual copy to each recipient, so recipients
 * are not exposed to one another.
 */
export interface BulkSendOptions extends SendMailOptions {
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
 * Options for sending a single email using a provider-side template.
 */
export interface KnownTemplateSendOptions {
  /**
   * Provider-side template identifier (e.g. Zoho `template_key`).
   */
  templateId: string;
  /**
   * Recipient email address.
   */
  to: Recipient;
  /**
   * Optional sender address override.
   */
  from?: Recipient;
  /**
   * Template variable substitutions.
   */
  mergeInfo?: Record<string, string>;
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
 * Options for sending a batch of emails using a provider-side template.
 *
 * Each recipient may carry its own `mergeInfo` so the provider can
 * personalize the template per recipient.
 */
export interface BulkKnownTemplateSendOptions {
  /**
   * Provider-side template identifier (e.g. Zoho `template_key`).
   */
  templateId: string;
  /**
   * Recipients, each with optional per-recipient merge variables.
   */
  to: BulkRecipient[];
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
 * Client-level options for sending a bulk email using the in-built template DTO.
 */
export interface SendBulkMailOptions {
  /**
   * Templated email DTO to render and send to every recipient.
   */
  template: EmailTemplateDto;
  /**
   * One or more recipient email addresses.
   */
  to: Recipient | Recipient[];
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
  /**
   * Enable or disable click tracking.
   */
  trackClicks?: boolean;
  /**
   * Enable or disable open tracking.
   */
  trackOpens?: boolean;
}
