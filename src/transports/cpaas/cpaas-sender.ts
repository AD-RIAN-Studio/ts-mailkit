import { ConfigurationError, TransportError } from "../../core/errors.js";
import {
  normalizeRecipient,
  normalizeRecipients,
  type EmailAttachment,
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
import type {
  CpaasAddressObject,
  CpaasAttachmentPayload,
  CpaasBatchSendPayload,
  CpaasBatchTemplateSendPayload,
  CpaasHttpConfig,
  CpaasRecipientWrapper,
  CpaasSendPayload,
  CpaasTemplateSendPayload,
} from "./types.js";

/** Fields shared by every CPaaS request payload. */
interface CommonPayloadFields {
  cc?: CpaasRecipientWrapper[];
  bcc?: CpaasRecipientWrapper[];
  reply_to?: CpaasAddressObject[];
  attachments?: CpaasAttachmentPayload[];
  track_clicks?: boolean;
  track_opens?: boolean;
  bounce_address?: string;
  client_reference?: string;
}

/** Options accepted by {@link CpaasHttpSender.applyCommon}. */
interface CommonOptions {
  cc?: Recipient | Recipient[];
  bcc?: Recipient | Recipient[];
  replyTo?: Recipient | Recipient[];
  attachments?: EmailAttachment[];
  trackClicks?: boolean;
  trackOpens?: boolean;
  bounceAddress?: string;
  clientReference?: string;
}

/**
 * Zoho CPaaS (formerly ZeptoMail) transactional email HTTP transport adapter.
 *
 * Uses the standard global `fetch` API for zero-dependency, universal edge
 * compatibility (Node.js, Bun, Deno, Cloudflare Workers).
 *
 * Supports:
 * - `send` — single raw email (`POST /v1.1/email`)
 * - `sendBulk` — batch raw email (`POST /v1.1/email/batch`)
 * - `sendKnownTemplate` — single template email (`POST /v1.1/email/template`)
 * - `sendBulkKnownTemplate` — batch template email (`POST /v1.1/email/template/batch`)
 */
export class CpaasHttpSender implements IEmailSender {
  readonly name = "cpaas";

  private readonly apiBase: string;
  private readonly authHeader: string;
  private readonly defaultFrom: { address: string; name?: string };
  private readonly preferTemplateAlias: boolean;
  private readonly fetchImpl: typeof fetch;

  constructor(config: CpaasHttpConfig) {
    if (!config.apiToken || typeof config.apiToken !== "string") {
      throw new ConfigurationError("CpaasHttpSender: Missing or invalid apiToken.");
    }
    if (!config.from) {
      throw new ConfigurationError("CpaasHttpSender: Missing required default from address.");
    }

    const host = (config.apiHost || "cpaas.zoho.com")
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "");
    this.apiBase = `https://${host}/v1.1`;

    // Normalize auth token header. If the caller already included "Zoho-", use as is.
    const token = config.apiToken.trim();
    this.authHeader = token.startsWith("Zoho-") ? token : `Zoho-enczapikey ${token}`;

    this.defaultFrom = normalizeRecipient(config.from);
    if (!this.defaultFrom.address) {
      throw new ConfigurationError("CpaasHttpSender: Configured from address must not be empty.");
    }

    this.preferTemplateAlias = config.preferTemplateAlias ?? false;

    const fetchImpl = config.fetch ?? globalThis.fetch;
    if (typeof fetchImpl !== "function") {
      throw new ConfigurationError(
        "CpaasHttpSender: No global fetch implementation found. Pass a custom fetch to CpaasHttpConfig if running on Node < 18.",
      );
    }
    // Bind: detached fetch throws "Illegal invocation" on strict-this runtimes (undici/workerd).
    this.fetchImpl = fetchImpl.bind(globalThis);
  }

  /**
   * Dispatches a single raw email using Zoho CPaaS API.
   */
  async send(options: SendMailOptions): Promise<SendResult> {
    const payload = this.buildSendPayload(options);
    return await this.post(`${this.apiBase}/email`, payload);
  }

  /**
   * Dispatches a batch of a single raw email content to many recipients.
   * The provider delivers an individual copy to each recipient.
   */
  async sendBulk(options: BulkSendOptions): Promise<SendResult> {
    const payload: CpaasBatchSendPayload = this.buildSendPayload(options);
    return await this.post(`${this.apiBase}/email/batch`, payload);
  }

  /**
   * Dispatches a single email using a provider-side template.
   */
  async sendKnownTemplate(options: KnownTemplateSendOptions): Promise<SendResult> {
    const payload = this.buildTemplatePayload(options);
    return await this.post(`${this.apiBase}/email/template`, payload);
  }

  /**
   * Dispatches a batch of emails using a provider-side template, with
   * optional per-recipient merge data.
   */
  async sendBulkKnownTemplate(options: BulkKnownTemplateSendOptions): Promise<SendResult> {
    const payload = this.buildBatchTemplatePayload(options);
    return await this.post(`${this.apiBase}/email/template/batch`, payload);
  }

  // ─── Payload builders ──────────────────────────────────────────────────────

  private buildSendPayload(options: SendMailOptions): CpaasSendPayload {
    const toRecipients = normalizeRecipients(options.to);
    if (toRecipients.length === 0) {
      throw new TransportError("CpaasHttpSender: At least one recipient (to) must be specified.", {
        transportName: this.name,
      });
    }

    const resolvedFrom = options.from ? normalizeRecipient(options.from) : this.defaultFrom;

    const payload: CpaasSendPayload = {
      from: {
        address: resolvedFrom.address,
        name: resolvedFrom.name,
      },
      to: toRecipients.map((r) => ({
        email_address: { address: r.address, name: r.name || "" },
      })),
      subject: options.subject,
      htmlbody: options.html,
      textbody: options.text,
    };

    this.applyCommon(payload, options);
    return payload;
  }

  private buildTemplatePayload(options: KnownTemplateSendOptions): CpaasTemplateSendPayload {
    const toRecipients = normalizeRecipients(options.to);
    if (toRecipients.length === 0) {
      throw new TransportError("CpaasHttpSender: At least one recipient (to) must be specified.", {
        transportName: this.name,
      });
    }

    const resolvedFrom = options.from ? normalizeRecipient(options.from) : this.defaultFrom;

    const payload: CpaasTemplateSendPayload = {
      ...this.templateRef(options.templateId),
      from: {
        address: resolvedFrom.address,
        name: resolvedFrom.name,
      },
      to: toRecipients.map((r) => ({
        email_address: { address: r.address, name: r.name || "" },
      })),
    };

    if (options.mergeInfo) {
      payload.merge_info = options.mergeInfo;
    }

    this.applyCommon(payload, options);
    return payload;
  }

  private buildBatchTemplatePayload(
    options: BulkKnownTemplateSendOptions,
  ): CpaasBatchTemplateSendPayload {
    if (!options.to || options.to.length === 0) {
      throw new TransportError("CpaasHttpSender: At least one recipient (to) must be specified.", {
        transportName: this.name,
      });
    }

    const resolvedFrom = options.from ? normalizeRecipient(options.from) : this.defaultFrom;

    const payload: CpaasBatchTemplateSendPayload = {
      ...this.templateRef(options.templateId),
      from: {
        address: resolvedFrom.address,
        name: resolvedFrom.name,
      },
      to: options.to.map((r) => ({
        email_address: { address: r.address, name: r.name || "" },
        ...(r.mergeInfo ? { merge_info: r.mergeInfo } : {}),
      })),
    };

    this.applyCommon(payload, options);
    return payload;
  }

  private templateRef(templateId: string): { template_key?: string; template_alias?: string } {
    return this.preferTemplateAlias ? { template_alias: templateId } : { template_key: templateId };
  }

  private applyCommon(payload: CommonPayloadFields, options: CommonOptions): void {
    if (options.cc) {
      const ccList = normalizeRecipients(options.cc);
      if (ccList.length > 0) {
        payload.cc = ccList.map((r) => ({
          email_address: { address: r.address, name: r.name || "" },
        }));
      }
    }

    if (options.bcc) {
      const bccList = normalizeRecipients(options.bcc);
      if (bccList.length > 0) {
        payload.bcc = bccList.map((r) => ({
          email_address: { address: r.address, name: r.name || "" },
        }));
      }
    }

    if (options.replyTo) {
      const replyToList = normalizeRecipients(options.replyTo);
      if (replyToList.length > 0) {
        payload.reply_to = replyToList.map((r) => ({
          address: r.address,
          name: r.name,
        }));
      }
    }

    if (options.attachments && options.attachments.length > 0) {
      payload.attachments = options.attachments.map((att) => this.toAttachmentPayload(att));
    }

    if (options.trackClicks !== undefined) payload.track_clicks = options.trackClicks;
    if (options.trackOpens !== undefined) payload.track_opens = options.trackOpens;
    if (options.bounceAddress !== undefined) payload.bounce_address = options.bounceAddress;
    if (options.clientReference !== undefined) payload.client_reference = options.clientReference;
  }

  private toAttachmentPayload(att: EmailAttachment): CpaasAttachmentPayload {
    let contentBase64: string;
    if (typeof att.content === "string") {
      contentBase64 = att.content;
    } else if (typeof Buffer !== "undefined") {
      contentBase64 = Buffer.from(att.content).toString("base64");
    } else {
      // Browser / Edge fallback for Uint8Array
      let binary = "";
      const bytes = new Uint8Array(att.content);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      contentBase64 = btoa(binary);
    }

    return {
      name: att.filename,
      content: contentBase64,
      mime_type: att.mimeType || att.contentType || "application/octet-stream",
      cid: att.cid,
    };
  }

  // ─── HTTP ──────────────────────────────────────────────────────────────────

  private async post(url: string, payload: unknown): Promise<SendResult> {
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: this.authHeader,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      throw new TransportError(
        `CpaasHttpSender: Network request failed: ${err instanceof Error ? err.message : String(err)}`,
        {
          transportName: this.name,
          cause: err,
        },
      );
    }

    const responseText = await response.text();
    let responseData: any;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      const errorMessage =
        responseData?.data?.message ||
        responseData?.error?.message ||
        responseData?.message ||
        `HTTP ${response.status}: ${responseText || response.statusText}`;

      throw new TransportError(`CpaasHttpSender: Failed to send email - ${errorMessage}`, {
        transportName: this.name,
        statusCode: response.status,
        responseBody: responseText,
        rawResponse: responseData,
      });
    }

    // Single-send responses carry `message_id`; batch/template responses carry
    // `code`/`message` entries.
    const messageId = responseData?.data?.[0]?.message_id;

    return {
      success: true,
      messageId,
      rawResponse: responseData,
      response: responseData,
    };
  }
}
