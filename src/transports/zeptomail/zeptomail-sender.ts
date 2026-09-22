import { ConfigurationError, TransportError } from '../../core/errors.js';
import {
  normalizeRecipient,
  normalizeRecipients,
  type SendMailOptions,
  type SendResult,
} from '../../core/types.js';
import type { IEmailSender } from '../sender.interface.js';
import type {
  ZeptoMailHttpConfig,
  ZeptoMailConfig,
  ZeptoMailSendPayload,
  ZeptoMailAttachmentPayload,
} from './types.js';

/**
 * ZeptoMail (Zoho Mail transactional email HTTP API) transport adapter.
 *
 * Designed for zero dependencies and universal edge compatibility (Node.js, Bun, Deno, Cloudflare Workers)
 * by utilizing the standard global `fetch` API.
 */
export class ZeptoMailHttpSender implements IEmailSender {
  readonly name = 'zeptomail';

  private readonly apiUrl: string;
  private readonly authHeader: string;
  private readonly defaultFrom: { address: string; name?: string };
  private readonly fetchImpl: typeof fetch;

  constructor(config: ZeptoMailHttpConfig) {
    if (!config.apiToken || typeof config.apiToken !== 'string') {
      throw new ConfigurationError('ZeptoMailHttpSender: Missing or invalid apiToken.');
    }
    if (!config.from) {
      throw new ConfigurationError('ZeptoMailHttpSender: Missing required default from address.');
    }

    const host = (config.apiHost || 'api.zeptomail.com').replace(/^https?:\/\//, '').replace(/\/+$/, '');
    this.apiUrl = `https://${host}/v1.1/email`;

    // Normalize auth token header. In ZeptoMail, if the user already included "Zoho-enczapikey ", use as is; otherwise format standard header.
    const token = config.apiToken.trim();
    this.authHeader = token.startsWith('Zoho-') ? token : `Zoho-enczapikey ${token}`;

    this.defaultFrom = normalizeRecipient(config.from);
    if (!this.defaultFrom.address) {
      throw new ConfigurationError('ZeptoMailHttpSender: Configured from address must not be empty.');
    }

    const fetchImpl = config.fetch ?? globalThis.fetch;
    if (typeof fetchImpl !== 'function') {
      throw new ConfigurationError(
        'ZeptoMailHttpSender: No global fetch implementation found. Pass a custom fetch to ZeptoMailHttpConfig if running on Node < 18.'
      );
    }
    // Bind: detached fetch throws "Illegal invocation" on strict-this runtimes (undici/workerd).
    this.fetchImpl = fetchImpl.bind(globalThis);
  }

  /**
   * Dispatches an email using Zoho ZeptoMail API v1.1.
   */
  async send(options: SendMailOptions): Promise<SendResult> {
    const toRecipients = normalizeRecipients(options.to);
    if (toRecipients.length === 0) {
      throw new TransportError('ZeptoMailHttpSender: At least one recipient (to) must be specified.', {
        transportName: this.name,
      });
    }

    const resolvedFrom = options.from ? normalizeRecipient(options.from) : this.defaultFrom;

    const payload: ZeptoMailSendPayload = {
      from: {
        address: resolvedFrom.address,
        name: resolvedFrom.name,
      },
      to: toRecipients.map((r) => ({
        email_address: {
          address: r.address,
          name: r.name || '',
        },
      })),
      subject: options.subject,
      htmlbody: options.html,
      textbody: options.text,
    };

    if (options.cc) {
      const ccList = normalizeRecipients(options.cc);
      if (ccList.length > 0) {
        payload.cc = ccList.map((r) => ({
          email_address: { address: r.address, name: r.name || '' },
        }));
      }
    }

    if (options.bcc) {
      const bccList = normalizeRecipients(options.bcc);
      if (bccList.length > 0) {
        payload.bcc = bccList.map((r) => ({
          email_address: { address: r.address, name: r.name || '' },
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
      payload.attachments = options.attachments.map((att): ZeptoMailAttachmentPayload => {
        let contentBase64: string;
        if (typeof att.content === 'string') {
          contentBase64 = att.content;
        } else {
          // Buffer or Uint8Array
          if (typeof Buffer !== 'undefined') {
            contentBase64 = Buffer.from(att.content).toString('base64');
          } else {
            // Browser / Edge fallback for Uint8Array
            let binary = '';
            const bytes = new Uint8Array(att.content);
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            contentBase64 = btoa(binary);
          }
        }

        return {
          name: att.filename,
          content: contentBase64,
          mime_type: att.mimeType || att.contentType || 'application/octet-stream',
          cid: att.cid,
        };
      });
    }

    let response: Response;
    try {
      response = await this.fetchImpl(this.apiUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: this.authHeader,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      throw new TransportError(`ZeptoMailHttpSender: Network request failed: ${err instanceof Error ? err.message : String(err)}`, {
        transportName: this.name,
        cause: err,
      });
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
        responseData?.error?.message ||
        responseData?.message ||
        `HTTP ${response.status}: ${responseText || response.statusText}`;

      throw new TransportError(`ZeptoMailHttpSender: Failed to send email - ${errorMessage}`, {
        transportName: this.name,
        statusCode: response.status,
        responseBody: responseText,
      });
    }

    // Extract message ID from standard ZeptoMail v1.1 response structure:
    // { data: [ { message_id: "..." } ] }
    const messageId = responseData?.data?.[0]?.message_id;

    return {
      success: true,
      messageId,
      response: responseData,
    };
  }

  /**
   * Backward-compatible helper method matching legacy signature:
   * `sendEmail(to, htmlBody, subject, toName?, plaintextBody?, fromName?)`
   * @deprecated Use `send({ to, subject, html, text, ... })` instead. This method will be removed in v1.0.0.
   */
  async sendEmail(
    to: string,
    htmlBody: string,
    subject: string,
    toName: string = '',
    plaintextBody?: string,
    fromName?: string
  ): Promise<void> {
    await this.send({
      to: { address: to, name: toName },
      from: fromName ? { address: this.defaultFrom.address, name: fromName } : this.defaultFrom,
      subject,
      html: htmlBody,
      text: plaintextBody,
    });
  }
}

/**
 * Backward-compatibility alias for `ZeptoMailHttpSender`.
 * @deprecated Use `ZeptoMailHttpSender` instead. This alias will be removed in v1.0.0.
 */
export const ZeptoMailSender = ZeptoMailHttpSender;
export type ZeptoMailSender = ZeptoMailHttpSender;
