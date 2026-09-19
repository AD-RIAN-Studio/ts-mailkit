import type { EmailTemplateDto } from '../../templates/dto/index.js';
import type { IEmailRenderer, RenderedEmail } from '../renderer.interface.js';
import { htmlToPlainText } from '../utils/html-to-plaintext.js';

export interface DefaultRendererOptions {
  /**
   * Primary brand color for buttons and accents.
   * @default '#4f46e5'
   */
  primaryColor?: string;

  /**
   * Font stack used in the HTML wrapper.
   * @default "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
   */
  fontFamily?: string;

  /**
   * Container maximum width.
   * @default '600px'
   */
  maxWidth?: string;
}

/**
 * Builds a plain-text fallback string from an email DTO.
 */
export function buildPlainText(dto: EmailTemplateDto): string {
  if (dto.noHtmlMessage) {
    return dto.noHtmlMessage;
  }

  const divider = '──────────────────────────────';
  const parts: string[] = [];

  if (dto.header) {
    parts.push(dto.header, divider);
  }

  if (dto.body) {
    parts.push(htmlToPlainText(dto.body));
  }

  if (dto.otpCode) {
    parts.push(`Verification Code: ${dto.otpCode}`);
  }

  if (dto.actionText && dto.actionUrl) {
    parts.push(`${dto.actionText}: ${dto.actionUrl}`);
  }

  if (dto.extraMessage) {
    parts.push(htmlToPlainText(dto.extraMessage));
  }

  if (dto.footer) {
    parts.push(`${divider}\n${htmlToPlainText(dto.footer)}`);
  }

  return parts.join('\n\n');
}

/**
 * Builds a responsive, styled HTML email document from an email DTO.
 */
export function buildHtml(dto: EmailTemplateDto, options: DefaultRendererOptions = {}): string {
  const primaryColor = options.primaryColor || '#4f46e5';
  const fontFamily =
    options.fontFamily ||
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const maxWidth = options.maxWidth || '600px';

  const parts: string[] = [
    `<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head>`,
    `<meta charset="UTF-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1.0">`,
    `<title>${dto.subject}</title>`,
    `</head>`,
    `<body style="margin:0;padding:24px 16px;background-color:#f9fafb;font-family:${fontFamily};color:#1f2937;line-height:1.6;">`,
    `<div style="max-width:${maxWidth};margin:0 auto;background-color:#ffffff;padding:32px 28px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);border:1px solid #f3f4f6;">`,
  ];

  if (dto.imageUrl) {
    parts.push(
      `<div style="margin-bottom:24px;text-align:center;">`,
      `  <img src="${dto.imageUrl}" alt="Header" style="max-width:100%;height:auto;border-radius:6px;" />`,
      `</div>`
    );
  }

  if (dto.header) {
    parts.push(
      `<h2 style="margin:0 0 16px;font-size:1.5rem;font-weight:700;color:#111827;letter-spacing:-0.025em;">${dto.header}</h2>`
    );
  }

  if (dto.body) {
    parts.push(`<div style="margin:0 0 20px;font-size:1rem;color:#374151;">${dto.body}</div>`);
  }

  if (dto.otpCode) {
    parts.push(
      `<div style="margin:24px 0;padding:20px;background-color:#f3f4f6;border-radius:8px;text-align:center;">`,
      `  <span style="font-size:2rem;letter-spacing:0.5rem;font-weight:700;color:#111827;font-family:monospace;">${dto.otpCode}</span>`,
      `</div>`
    );
  }

  if (dto.actionUrl && dto.actionText) {
    parts.push(
      `<div style="margin:24px 0;text-align:center;">`,
      `  <a href="${dto.actionUrl}" style="display:inline-block;padding:12px 28px;background-color:${primaryColor};color:#ffffff;border-radius:6px;text-decoration:none;font-weight:600;font-size:1rem;text-align:center;box-sizing:border-box;">${dto.actionText}</a>`,
      `</div>`
    );
  }

  if (dto.extraMessage) {
    parts.push(
      `<div style="margin:20px 0 0;font-size:0.875rem;color:#6b7280;line-height:1.5;">${dto.extraMessage}</div>`
    );
  }

  if (dto.footer) {
    parts.push(
      `<div style="margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:0.75rem;color:#9ca3af;text-align:center;">${dto.footer}</div>`
    );
  }

  parts.push(`</div>`, `</body>`, `</html>`);
  return parts.join('\n');
}

/**
 * Default HTML and plain-text email renderer for ts-mailkit.
 */
export class DefaultEmailRenderer implements IEmailRenderer {
  private readonly options: DefaultRendererOptions;

  constructor(options: DefaultRendererOptions = {}) {
    this.options = options;
  }

  render(dto: EmailTemplateDto): RenderedEmail {
    return {
      html: buildHtml(dto, this.options),
      text: buildPlainText(dto),
    };
  }
}
