import { normalizeRecipients, type SendMailOptions, type SendResult } from '../../core/types.js';
import type { IEmailSender } from '../sender.interface.js';

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

/**
 * Console logger transport that prints dispatched emails to stdout/stderr.
 * Ideal for development and debugging.
 */
export class ConsoleEmailSender implements IEmailSender {
  readonly name = 'console';

  private readonly log: (message: string) => void;
  private readonly includeHtml: boolean;
  private nextId = 1;

  constructor(options: ConsoleEmailSenderOptions = {}) {
    this.log = options.logger ?? console.log;
    this.includeHtml = options.includeHtml ?? false;
  }

  async send(options: SendMailOptions): Promise<SendResult> {
    const to = normalizeRecipients(options.to).map((r) => r.name ? `${r.name} <${r.address}>` : r.address).join(', ');
    const from = options.from ? JSON.stringify(options.from) : '(default)';
    const messageId = `console-${this.nextId++}-${Date.now()}`;

    const separator = '─'.repeat(60);
    const lines = [
      `\n┌${separator}┐`,
      `│ [ts-mailkit:console] DISPATCHED EMAIL (${messageId})`,
      `├${separator}┤`,
      `│ From:    ${from}`,
      `│ To:      ${to}`,
      `│ Subject: ${options.subject}`,
      `├${separator}┤`,
    ];

    if (options.text) {
      lines.push('│ Text Body:');
      for (const line of options.text.split('\n')) {
        lines.push(`│   ${line}`);
      }
    }

    if (this.includeHtml && options.html) {
      lines.push('│ HTML Body:');
      for (const line of options.html.split('\n')) {
        lines.push(`│   ${line}`);
      }
    }

    lines.push(`└${separator}┘\n`);

    this.log(lines.join('\n'));

    return {
      success: true,
      messageId,
      response: { logged: true },
    };
  }
}
