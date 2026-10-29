import type { Recipient } from "../../core/types.js";

export interface CpaasHttpConfig {
  /**
   * Zoho CPaaS API host domain.
   * Examples: 'cpaas.zoho.com', 'cpaas.zoho.eu', 'cpaas.zoho.in'
   * @default 'cpaas.zoho.com'
   */
  apiHost?: string;

  /**
   * Zoho CPaaS API Key.
   */
  apiToken: string;

  /**
   * Default verified sender email address or Recipient object.
   */
  from: Recipient;

  /**
   * When `true`, template-based sends use `template_alias` instead of
   * `template_key`. The `templateId` you pass is then treated as an alias.
   * @default false
   */
  preferTemplateAlias?: boolean;

  /**
   * Optional custom fetch implementation (useful for mocking, testing, or proxies).
   * Defaults to global `fetch`.
   */
  fetch?: typeof fetch;
}

export interface CpaasAddressObject {
  address: string;
  name?: string;
}

export interface CpaasRecipientWrapper {
  email_address: CpaasAddressObject;
}

export interface CpaasBatchTemplateRecipient {
  email_address: CpaasAddressObject;
  merge_info?: Record<string, string>;
}

export interface CpaasAttachmentPayload {
  name?: string;
  /** Base64-encoded file content. Mutually exclusive with `file_cache_key`. */
  content?: string;
  /** Key of a file previously uploaded via the file-upload API. */
  file_cache_key?: string;
  mime_type?: string;
  cid?: string;
}

export interface CpaasSendPayload {
  from: CpaasAddressObject;
  to: CpaasRecipientWrapper[];
  subject: string;
  htmlbody: string;
  textbody?: string;
  cc?: CpaasRecipientWrapper[];
  bcc?: CpaasRecipientWrapper[];
  reply_to?: CpaasAddressObject[];
  attachments?: CpaasAttachmentPayload[];
}

export interface CpaasBatchSendPayload extends CpaasSendPayload {
  track_clicks?: boolean;
  track_opens?: boolean;
  bounce_address?: string;
  client_reference?: string;
}

export interface CpaasTemplateSendPayload {
  template_key?: string;
  template_alias?: string;
  from: CpaasAddressObject;
  to: CpaasRecipientWrapper[];
  merge_info?: Record<string, string>;
  cc?: CpaasRecipientWrapper[];
  bcc?: CpaasRecipientWrapper[];
  reply_to?: CpaasAddressObject[];
  attachments?: CpaasAttachmentPayload[];
  track_clicks?: boolean;
  track_opens?: boolean;
  bounce_address?: string;
  client_reference?: string;
}

export interface CpaasBatchTemplateSendPayload {
  template_key?: string;
  template_alias?: string;
  from: CpaasAddressObject;
  to: CpaasBatchTemplateRecipient[];
  cc?: CpaasRecipientWrapper[];
  bcc?: CpaasRecipientWrapper[];
  reply_to?: CpaasAddressObject[];
  attachments?: CpaasAttachmentPayload[];
  track_clicks?: boolean;
  track_opens?: boolean;
  bounce_address?: string;
  client_reference?: string;
}

/**
 * One entry in a Zoho CPaaS success `data` array.
 */
export interface CpaasResponseItem {
  /** Response code, e.g. "EM_104". */
  code?: string;
  /** Human-readable message, e.g. "OK". */
  message?: string;
  /** Message ID returned by the single-send endpoint. */
  message_id?: string;
}

/**
 * Zoho CPaaS success response body (HTTP 200).
 */
export interface CpaasSuccessResponse {
  data?: CpaasResponseItem[];
  /** e.g. "OK". */
  message?: string;
  /** e.g. "req-xxxx". */
  request_id?: string;
}

/**
 * Zoho CPaaS error `data` (HTTP 400).
 */
export interface CpaasErrorData {
  /** e.g. "TM_3004". */
  error_code?: string;
  /** e.g. "Invalid request". */
  message?: string;
}

/**
 * Zoho CPaaS error response body (HTTP 400).
 */
export interface CpaasErrorResponse {
  data?: CpaasErrorData;
  /** e.g. "error". */
  message?: string;
}
