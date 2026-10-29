import type { IEmailSender } from "../transports/sender.interface.js";
import type { IEmailRenderer, RenderedEmail } from "../renderers/renderer.interface.js";
import { DefaultEmailRenderer } from "../renderers/default/default-renderer.js";
import { htmlToPlainText } from "../renderers/utils/html-to-plaintext.js";
import type { EmailTemplateDto } from "../templates/dto/index.js";
import {
  normalizeRecipient,
  type Recipient,
  type SendMailOptions,
  type SendResult,
} from "./types.js";
import type {
  BulkKnownTemplateSendOptions,
  KnownTemplateSendOptions,
  SendBulkMailOptions,
} from "./bulk-types.js";
import { ConfigurationError } from "./errors.js";

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
  attachments?: SendMailOptions["attachments"];
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
   * The transport adapter used to dispatch emails (e.g. ZeptoMailHttpSender, MemoryEmailSender).
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
      throw new ConfigurationError("MailKit: A transport adapter (IEmailSender) is required.");
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
   * await mailer.sendMail({
   *   to: 'user@example.com',
   *   template: myDto,
   * });
   * ```
   */
  async sendMail(options: SendTemplateOptions): Promise<SendResult> {
    const template = options.template;
    const recipientName = options.toName ?? template.userName;
    const resolvedFromName = await this.resolveFromName(template, options.fromName);

    // Render template DTO
    const rendered = await this.renderer.render(template);
    const plaintextBody = template.noHtmlMessage ?? rendered.text;

    // Format recipients
    let toRecipients: Recipient | Recipient[];
    if (typeof options.to === "string" && recipientName) {
      toRecipients = { address: options.to, name: recipientName };
    } else {
      toRecipients = options.to;
    }

    // Resolve From address
    const from = this.applyFromName(options.from ?? this.defaultFrom, resolvedFromName);

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
   * @deprecated Use {@link sendMail} instead.
   */
  async send(options: SendTemplateOptions): Promise<SendResult> {
    return await this.sendMail(options);
  }

  /**
   * Sends a bulk email using a strongly-typed template DTO.
   *
   * The transport delivers an individual copy to each recipient, so
   * recipients are not exposed to one another. Per-recipient personalization
   * is available via {@link sendBulkKnownTemplate}.
   *
   * Example:
   * ```ts
   * await mailer.sendBulkMail({
   *   to: ['a@example.com', 'b@example.com'],
   *   template: myDto,
   * });
   * ```
   */
  async sendBulkMail(options: SendBulkMailOptions): Promise<SendResult> {
    const transport = this.transport;
    if (typeof transport.sendBulk !== "function") {
      throw new ConfigurationError(
        "MailKit: The configured transport does not support bulk sending (sendBulk).",
      );
    }

    const template = options.template;
    const resolvedFromName = await this.resolveFromName(template);

    const rendered = await this.renderer.render(template);
    const plaintextBody = template.noHtmlMessage ?? rendered.text;
    const from = this.applyFromName(options.from ?? this.defaultFrom, resolvedFromName);

    return await transport.sendBulk({
      to: options.to,
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
      trackClicks: options.trackClicks,
      trackOpens: options.trackOpens,
    });
  }

  /**
   * Sends a single email using a provider-side template.
   */
  async sendKnownTemplate(options: KnownTemplateSendOptions): Promise<SendResult> {
    const transport = this.transport;
    if (typeof transport.sendKnownTemplate !== "function") {
      throw new ConfigurationError(
        "MailKit: The configured transport does not support template sending (sendKnownTemplate).",
      );
    }

    return await transport.sendKnownTemplate({
      ...options,
      from: options.from ?? this.defaultFrom,
    });
  }

  /**
   * Sends a bulk email using a provider-side template with optional
   * per-recipient merge data.
   */
  async sendBulkKnownTemplate(options: BulkKnownTemplateSendOptions): Promise<SendResult> {
    const transport = this.transport;
    if (typeof transport.sendBulkKnownTemplate !== "function") {
      throw new ConfigurationError(
        "MailKit: The configured transport does not support bulk template sending (sendBulkKnownTemplate).",
      );
    }

    return await transport.sendBulkKnownTemplate({
      ...options,
      from: options.from ?? this.defaultFrom,
    });
  }

  private async resolveFromName(
    template: EmailTemplateDto,
    explicitFromName?: string,
  ): Promise<string | undefined> {
    let resolved = explicitFromName ?? template.fromName;
    if (!resolved && this.brandNameResolver) {
      resolved = await this.brandNameResolver();
    }
    if (!resolved) {
      resolved = this.defaultBrandName;
    }
    return resolved;
  }

  private applyFromName(
    from: Recipient | undefined,
    fromName: string | undefined,
  ): Recipient | undefined {
    if (fromName && from) {
      const normalizedFrom = normalizeRecipient(from);
      return { address: normalizedFrom.address, name: fromName };
    }
    return from;
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
