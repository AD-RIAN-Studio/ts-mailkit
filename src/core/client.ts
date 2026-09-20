import type { IEmailSender } from '../transports/sender.interface.js';
import type { IEmailRenderer, RenderedEmail } from '../renderers/renderer.interface.js';
import { DefaultEmailRenderer } from '../renderers/default/default-renderer.js';
import { htmlToPlainText } from '../renderers/utils/html-to-plaintext.js';
import type { EmailTemplateDto } from '../templates/dto/index.js';
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
  template: EmailTemplateDto;
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
  async render(template: EmailTemplateDto): Promise<RenderedEmail> {
    return await this.renderer.render(template);
  }

  /**
   * Sends an email using a strongly-typed template DTO.
   *
   * Example:
   * ```ts
   * await mailer.send({
   *   to: 'user@example.com',
   *   template: myDto,
   * });
   * ```
   */
  async send(options: SendTemplateOptions): Promise<SendResult> {
    const template = options.template;
    const recipientName = options.toName ?? template.userName;

    // Resolve fromName: explicit option > template.fromName > brand resolver > defaultBrandName
    let resolvedFromName = options.fromName ?? template.fromName;
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
    if (typeof options.to === 'string' && recipientName) {
      toRecipients = { address: options.to, name: recipientName };
    } else {
      toRecipients = options.to;
    }

    // Resolve From address
    let from = options.from ?? this.defaultFrom;
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
      cc: options.cc,
      bcc: options.bcc,
      replyTo: options.replyTo,
      attachments: options.attachments,
      headers: options.headers,
      tags: options.tags,
      metadata: options.metadata,
    });
  }

  /**
   * Dispatches a raw, pre-rendered email directly through the transport.
   * If `options.text` is omitted, plain text is automatically derived from `options.html`.
   */
  async sendRaw(options: SendMailOptions): Promise<SendResult> {
    const from = options.from ?? this.defaultFrom;
    const text = options.text ?? (options.html ? htmlToPlainText(options.html) : undefined);
    return await this.transport.send({
      ...options,
      from,
      text,
    });
  }
}

/**
 * Convenience factory to create a MailKit client instance.
 */
export function createMailKit(options: MailKitOptions): MailKit {
  return new MailKit(options);
}
