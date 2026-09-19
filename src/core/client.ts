import type { IEmailSender } from '../transports/sender.interface.js';
import type { IEmailRenderer, RenderedEmail } from '../renderers/renderer.interface.js';
import { DefaultEmailRenderer, buildPlainText } from '../renderers/default/default-renderer.js';
import type { BaseEmailDto } from '../templates/dto/index.js';
import {
  normalizeRecipient,
  normalizeRecipients,
  type Recipient,
  type SendMailOptions,
  type SendResult,
} from './types.js';
import { ConfigurationError } from './errors.js';

export interface SendTemplateOptions {
  /**
   * One or more recipient email addresses.
   */
  to: Recipient | Recipient[];
  /**
   * Templated email DTO to render and send.
   */
  template: BaseEmailDto;
  /**
   * Optional recipient display name (used when `to` is a plain string).
   */
  toName?: string;
  /**
   * Optional sender display name override for this specific email.
   */
  fromName?: string;
  /**
   * Optional sender email address override.
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
  attachments?: SendMailOptions['attachments'];
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

export interface MailKitOptions {
  /**
   * The transport adapter used to dispatch emails (e.g. ZeptoMailSender, MemoryEmailSender).
   */
  transport: IEmailSender;
  /**
   * Custom renderer implementation. Defaults to DefaultEmailRenderer.
   */
  renderer?: IEmailRenderer;
  /**
   * Default sender address or Recipient.
   */
  defaultFrom?: Recipient;
  /**
   * Default brand or application name.
   */
  defaultBrandName?: string;
  /**
   * Optional asynchronous or synchronous resolver to dynamically resolve brand/tenant name.
   * Useful for multitenant applications.
   */
  brandNameResolver?: () => Promise<string> | string;
}

/**
 * Main email client and orchestration service for ts-mailkit.
 */
export class MailKit {
  private readonly transport: IEmailSender;
  private readonly renderer: IEmailRenderer;
  private readonly defaultFrom?: Recipient;
  private readonly defaultBrandName?: string;
  private readonly brandNameResolver?: () => Promise<string> | string;

  constructor(options: MailKitOptions) {
    if (!options.transport) {
      throw new ConfigurationError('MailKit: A transport adapter (IEmailSender) is required.');
    }
    this.transport = options.transport;
    this.renderer = options.renderer ?? new DefaultEmailRenderer();
    this.defaultFrom = options.defaultFrom;
    this.defaultBrandName = options.defaultBrandName;
    this.brandNameResolver = options.brandNameResolver;
  }

  /**
   * Returns the underlying transport instance.
   */
  getTransport(): IEmailSender {
    return this.transport;
  }

  /**
   * Renders an email DTO to HTML and plain text without dispatching.
   */
  async render(template: BaseEmailDto): Promise<RenderedEmail> {
    return await this.renderer.render(template);
  }

  /**
   * Returns the plain-text fallback for an email DTO without sending.
   */
  buildPlainTextMessage(template: BaseEmailDto): string {
    return template.noHtmlMessage ?? buildPlainText(template);
  }

  /**
   * Sends an email using a strongly-typed template DTO.
   * Supports both modern options object:
   *   `mailer.send({ to: 'user@example.com', template: myDto })`
   * and legacy positional arguments for seamless migration:
   *   `mailer.send('user@example.com', myDto, 'User Name')`
   */
  async send(options: SendTemplateOptions): Promise<SendResult>;
  async send(to: string, template: BaseEmailDto, toName?: string): Promise<SendResult>;
  async send(
    optionsOrTo: SendTemplateOptions | string,
    maybeTemplate?: BaseEmailDto,
    maybeToName?: string
  ): Promise<SendResult> {
    let opts: SendTemplateOptions;

    if (typeof optionsOrTo === 'string') {
      if (!maybeTemplate) {
        throw new ConfigurationError('MailKit.send: Missing required template DTO argument.');
      }
      opts = {
        to: optionsOrTo,
        template: maybeTemplate,
        toName: maybeToName,
      };
    } else {
      opts = optionsOrTo;
    }

    const template = opts.template;
    const recipientName = opts.toName ?? template.userName;

    // Resolve fromName: explicit option > template.fromName > brand resolver > defaultBrandName
    let resolvedFromName = opts.fromName ?? template.fromName;
    if (!resolvedFromName && this.brandNameResolver) {
      resolvedFromName = await this.brandNameResolver();
    }
    if (!resolvedFromName) {
      resolvedFromName = this.defaultBrandName;
    }

    // Render template DTO
    const rendered = await this.renderer.render(template);
    const plaintextBody = template.noHtmlMessage ?? rendered.text;

    // Format recipients
    let toRecipients: Recipient | Recipient[];
    if (typeof opts.to === 'string' && recipientName) {
      toRecipients = { address: opts.to, name: recipientName };
    } else {
      toRecipients = opts.to;
    }

    // Resolve From address
    let from = opts.from ?? this.defaultFrom;
    if (resolvedFromName && from) {
      const normalizedFrom = normalizeRecipient(from);
      from = { address: normalizedFrom.address, name: resolvedFromName };
    }

    return await this.sendRaw({
      to: toRecipients,
      from,
      subject: template.subject,
      html: rendered.html,
      text: plaintextBody,
      cc: opts.cc,
      bcc: opts.bcc,
      replyTo: opts.replyTo,
      attachments: opts.attachments,
      headers: opts.headers,
      tags: opts.tags,
      metadata: opts.metadata,
    });
  }

  /**
   * Dispatches a raw, pre-rendered email directly through the transport.
   */
  async sendRaw(options: SendMailOptions): Promise<SendResult> {
    const from = options.from ?? this.defaultFrom;
    return await this.transport.send({
      ...options,
      from,
    });
  }

  /**
   * Sends a raw plain-text email with basic HTML pre-formatting.
   * Useful for plain notifications, alerts, or simple text messages.
   */
  async sendSimpleMessage(
    to: string,
    subject: string,
    text: string,
    toName: string = ''
  ): Promise<SendResult> {
    const html = `<pre style="font-family:monospace;white-space:pre-wrap;">${text}</pre>`;
    return await this.sendRaw({
      to: { address: to, name: toName },
      subject,
      html,
      text,
    });
  }
}

/**
 * Drop-in alias for MailKit to maintain compatibility with existing EmailService code.
 */
export const EmailService = MailKit;
export type EmailService = MailKit;

/**
 * Convenience factory to create a MailKit client instance.
 */
export function createMailKit(options: MailKitOptions): MailKit {
  return new MailKit(options);
}
