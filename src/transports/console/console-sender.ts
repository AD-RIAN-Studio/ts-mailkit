import {
  normalizeRecipients,
  type Recipient,
  type SendMailOptions,
  type SendResult,
} from "../../core/types.js";
import type {
  BulkKnownTemplateSendOptions,
  BulkSendOptions,
  KnownTemplateSendOptions,
} from "../../core/bulk-types.js";
import type { IEmailSender } from "../sender.interface.js";

export interface ConsoleEmailSenderOptions {
  /**
   * Log level or custom log printer. Defaults to `console.log`.
   */
  logger?: (message: string) => void;
  /**
   * Whether to include the full HTML body in console output.
   * Defaults to false (prints plain text or a summary).
   */
  includeHtml?: boolean;
}

interface DispatchLog {
  kind: string;
  to: Recipient | Recipient[];
  from?: Recipient;
  subject?: string;
  templateId?: string;
  text?: string;
  html?: string;
}

/**
 * Console logger transport that prints dispatched emails to stdout/stderr.
 * Ideal for development and debugging.
 */
export class ConsoleEmailSender implements IEmailSender {
  readonly name = "console";

  private readonly log: (message: string) => void;
  private readonly includeHtml: boolean;
  private nextId = 1;

  constructor(options: ConsoleEmailSenderOptions = {}) {
    this.log = options.logger ?? console.log;
    this.includeHtml = options.includeHtml ?? false;
  }

  async send(options: SendMailOptions): Promise<SendResult> {
    return this.logDispatch({
      kind: "EMAIL",
      to: options.to,
      from: options.from,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
  }

  async sendBulk(options: BulkSendOptions): Promise<SendResult> {
    return this.logDispatch({
      kind: "BULK EMAIL",
      to: options.to,
      from: options.from,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
  }

  async sendKnownTemplate(options: KnownTemplateSendOptions): Promise<SendResult> {
    return this.logDispatch({
      kind: "TEMPLATE EMAIL",
      to: options.to,
      from: options.from,
      templateId: options.templateId,
    });
  }

  async sendBulkKnownTemplate(options: BulkKnownTemplateSendOptions): Promise<SendResult> {
    return this.logDispatch({
      kind: "BULK TEMPLATE EMAIL",
      to: options.to,
      from: options.from,
      templateId: options.templateId,
    });
  }

  private logDispatch(entry: DispatchLog): SendResult {
    const to = normalizeRecipients(entry.to)
      .map((r) => (r.name ? `${r.name} <${r.address}>` : r.address))
      .join(", ");
    const from = entry.from ? JSON.stringify(entry.from) : "(default)";
    const messageId = `console-${this.nextId++}-${Date.now()}`;

    const separator = "─".repeat(60);
    const lines = [
      `\n┌${separator}┐`,
      `│ [ts-mailkit:console] DISPATCHED ${entry.kind} (${messageId})`,
      `├${separator}┤`,
      `│ From:    ${from}`,
      `│ To:      ${to}`,
    ];

    if (entry.subject !== undefined) {
      lines.push(`│ Subject: ${entry.subject}`);
    }
    if (entry.templateId !== undefined) {
      lines.push(`│ Template: ${entry.templateId}`);
    }
    lines.push(`├${separator}┤`);

    if (entry.text) {
      lines.push("│ Text Body:");
      for (const line of entry.text.split("\n")) {
        lines.push(`│   ${line}`);
      }
    }

    if (this.includeHtml && entry.html) {
      lines.push("│ HTML Body:");
      for (const line of entry.html.split("\n")) {
        lines.push(`│   ${line}`);
      }
    }

    lines.push(`└${separator}┘\n`);

    this.log(lines.join("\n"));

    const rawResponse = { logged: true };
    return {
      success: true,
      messageId,
      rawResponse,
      response: rawResponse,
    };
  }
}
