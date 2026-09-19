import type { SendMailOptions, SendResult } from '../../core/types.js';
import type { IEmailSender } from '../sender.interface.js';

/**
 * In-memory email sender for automated testing, local development, and CI environments.
 * Captures all dispatched emails and provides inspection methods.
 */
export class MemoryEmailSender implements IEmailSender {
  readonly name = 'memory';

  private sentMails: SendMailOptions[] = [];
  private nextId = 1;

  async send(options: SendMailOptions): Promise<SendResult> {
    this.sentMails.push({ ...options });
    const messageId = `mem-${this.nextId++}-${Date.now()}`;
    return {
      success: true,
      messageId,
      response: { id: messageId },
    };
  }

  /**
   * Returns a copy of all emails sent through this transport instance.
   */
  getSentMails(): SendMailOptions[] {
    return [...this.sentMails];
  }

  /**
   * Returns the most recent email sent, or undefined if no emails have been sent.
   */
  getLastMail(): SendMailOptions | undefined {
    return this.sentMails.length > 0
      ? { ...this.sentMails[this.sentMails.length - 1] }
      : undefined;
  }

  /**
   * Clears all recorded sent emails.
   */
  clear(): void {
    this.sentMails = [];
  }

  /**
   * Returns the total count of sent emails.
   */
  count(): number {
    return this.sentMails.length;
  }
}
