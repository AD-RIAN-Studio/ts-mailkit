import type { Recipient } from '../../core/types.js';

export interface ZeptoMailHttpConfig {
  /**
   * Zoho ZeptoMail API host domain.
   * Examples: 'api.zeptomail.com', 'api.zeptomail.eu', 'api.zeptomail.in'
   * @default 'api.zeptomail.com'
   */
  apiHost?: string;

  /**
   * ZeptoMail Send Mail API Token.
   */
  apiToken: string;

  /**
   * Default verified sender email address or Recipient object.
   */
  from: Recipient;

  /**
   * Optional custom fetch implementation (useful for mocking, testing, or proxies).
   * Defaults to global `fetch`.
   */
  fetch?: typeof fetch;
}

/**
 * Configuration options for ZeptoMailHttpSender.
 * @deprecated Use `ZeptoMailHttpConfig` instead. This alias will be removed in v1.0.0.
 */
export type ZeptoMailConfig = ZeptoMailHttpConfig;

export interface ZeptoMailAddressObject {
  address: string;
  name?: string;
}

export interface ZeptoMailRecipientWrapper {
  email_address: ZeptoMailAddressObject;
}

export interface ZeptoMailAttachmentPayload {
  name: string;
  content: string; // base64 encoded
  mime_type?: string;
  cid?: string;
}

export interface ZeptoMailSendPayload {
  from: ZeptoMailAddressObject;
  to: ZeptoMailRecipientWrapper[];
  subject: string;
  htmlbody: string;
  textbody?: string;
  cc?: ZeptoMailRecipientWrapper[];
  bcc?: ZeptoMailRecipientWrapper[];
  reply_to?: ZeptoMailAddressObject[];
  attachments?: ZeptoMailAttachmentPayload[];
}
