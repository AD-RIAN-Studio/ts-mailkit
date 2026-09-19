import type { SendMailOptions, SendResult } from '../core/types.js';

/**
 * Contract that every concrete email sender/transport must satisfy.
 * Implement this interface to create custom transports (e.g. SMTP, Resend, SendGrid, Postmark).
 */
export interface IEmailSender {
  /**
   * Unique identifier for the transport (e.g., 'zeptomail', 'memory', 'console', 'smtp').
   */
  readonly name: string;

  /**
   * Dispatches an email using the transport adapter.
   *
   * @param options Structured email options including recipients, subject, HTML, text, attachments, etc.
   * @returns A SendResult indicating success and optional provider messageId or response data.
   * @throws TransportError if the transport fails to send the email.
   */
  send(options: SendMailOptions): Promise<SendResult>;
}
