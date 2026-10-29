import type { SendMailOptions, SendResult } from "../../core/types.js";
import type {
  BulkKnownTemplateSendOptions,
  BulkSendOptions,
  KnownTemplateSendOptions,
} from "../../core/types.js";
import type { IEmailSender } from "../sender.interface.js";

/**
 * In-memory email sender for automated testing, local development, and CI environments.
 * Captures all dispatched emails and provides inspection methods.
 */
export class MemoryEmailSender implements IEmailSender {
  readonly name = "memory";

  private sentMails: SendMailOptions[] = [];
  private sentBulkMails: BulkSendOptions[] = [];
  private sentTemplateMails: KnownTemplateSendOptions[] = [];
  private sentBulkTemplateMails: BulkKnownTemplateSendOptions[] = [];
  private nextId = 1;

  private result(prefix?: string): SendResult {
    const id = this.nextId++;
    const messageId = prefix ? `mem-${prefix}-${id}-${Date.now()}` : `mem-${id}-${Date.now()}`;
    const rawResponse = { id: messageId };
    return {
      success: true,
      messageId,
      rawResponse,
    };
  }

  async send(options: SendMailOptions): Promise<SendResult> {
    this.sentMails.push({ ...options });
    return this.result();
  }

  async sendBulk(options: BulkSendOptions): Promise<SendResult> {
    this.sentBulkMails.push({ ...options });
    return this.result("bulk");
  }

  async sendKnownTemplate(options: KnownTemplateSendOptions): Promise<SendResult> {
    this.sentTemplateMails.push({ ...options });
    return this.result("tpl");
  }

  async sendBulkKnownTemplate(options: BulkKnownTemplateSendOptions): Promise<SendResult> {
    this.sentBulkTemplateMails.push({ ...options });
    return this.result("bulk-tpl");
  }

  /**
   * Returns a copy of all single emails sent through this transport instance.
   */
  getSentMails(): SendMailOptions[] {
    return [...this.sentMails];
  }

  /**
   * Returns the most recent single email sent, or undefined if none have been sent.
   */
  getLastMail(): SendMailOptions | undefined {
    return this.sentMails.length > 0 ? { ...this.sentMails[this.sentMails.length - 1] } : undefined;
  }

  /**
   * Returns a copy of all bulk emails sent through this transport instance.
   */
  getSentBulkMails(): BulkSendOptions[] {
    return [...this.sentBulkMails];
  }

  /**
   * Returns a copy of all single template emails sent through this transport instance.
   */
  getSentTemplateMails(): KnownTemplateSendOptions[] {
    return [...this.sentTemplateMails];
  }

  /**
   * Returns a copy of all bulk template emails sent through this transport instance.
   */
  getSentBulkTemplateMails(): BulkKnownTemplateSendOptions[] {
    return [...this.sentBulkTemplateMails];
  }

  /**
   * Clears all recorded emails.
   */
  clear(): void {
    this.sentMails = [];
    this.sentBulkMails = [];
    this.sentTemplateMails = [];
    this.sentBulkTemplateMails = [];
  }

  /**
   * Returns the total count of single emails sent.
   */
  count(): number {
    return this.sentMails.length;
  }
}
