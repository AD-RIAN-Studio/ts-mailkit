import type { SendMailOptions, SendResult } from "../core/types.js";
import type {
  BulkKnownTemplateSendOptions,
  BulkSendOptions,
  KnownTemplateSendOptions,
} from "../core/bulk-types.js";

/**
 * Contract that every concrete email sender/transport must satisfy.
 * Implement this interface to create custom transports (e.g. SMTP, Resend, SendGrid, Postmark).
 *
 * Bulk/template capabilities are optional. Transports that do not implement
 * them will cause `MailKit` to throw a `ConfigurationError` when those
 * methods are used.
 */
export interface IEmailSender {
  /**
   * Unique identifier for the transport (e.g., 'cpaas', 'memory', 'console', 'smtp').
   */
  readonly name: string;

  /**
   * Dispatches an email using the transport adapter.
   *
   * @param options Structured email options including recipients, subject, HTML, text, attachments, etc.
   * @returns A SendResult indicating success and optional provider messageId or raw response data.
   * @throws TransportError if the transport fails to send the email.
   */
  send(options: SendMailOptions): Promise<SendResult>;

  /**
   * Dispatches a batch of a single raw email content to many recipients.
   * The provider delivers an individual copy to each recipient.
   *
   * @param options Structured bulk email options.
   * @returns A SendResult indicating success and optional raw response data.
   * @throws TransportError if the transport fails to send the batch.
   */
  sendBulk?(options: BulkSendOptions): Promise<SendResult>;

  /**
   * Dispatches a single email using a provider-side template.
   *
   * @param options Template identifier, recipient, and optional merge data.
   * @returns A SendResult indicating success and optional raw response data.
   * @throws TransportError if the transport fails to send the email.
   */
  sendKnownTemplate?(options: KnownTemplateSendOptions): Promise<SendResult>;

  /**
   * Dispatches a batch of emails using a provider-side template, with
   * optional per-recipient merge data.
   *
   * @param options Template identifier, recipients, and optional merge data.
   * @returns A SendResult indicating success and optional raw response data.
   * @throws TransportError if the transport fails to send the batch.
   */
  sendBulkKnownTemplate?(options: BulkKnownTemplateSendOptions): Promise<SendResult>;
}
