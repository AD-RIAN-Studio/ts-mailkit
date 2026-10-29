import type { EmailTemplateDto } from "./dto/index.js";
import {
  buildHtml,
  buildPlainText,
  type DefaultRendererOptions,
} from "../renderers/default/default-renderer.js";

/**
 * Styling options for building upload-ready templates.
 */
export interface TemplateBuildOptions {
  /**
   * Primary brand color for buttons and accents.
   * @default '#4f46e5'
   */
  primaryColor?: string;

  /**
   * Font stack used in the HTML wrapper.
   */
  fontFamily?: string;

  /**
   * Container maximum width.
   * @default '600px'
   */
  maxWidth?: string;

  /**
   * Default logo URL displayed at the top-center of the template.
   */
  logoUrl?: string;
}

/**
 * Builds an upload-ready HTML template from the canonical {@link EmailTemplateDto}.
 *
 * The output can be uploaded to a messaging platform (Zoho CPaaS, SendGrid, etc.)
 * as a provider-side template.
 */
export function buildHTMLTemplate(
  dto: EmailTemplateDto,
  options: TemplateBuildOptions = {},
): string {
  return buildHtml(dto, options as DefaultRendererOptions);
}

/**
 * Builds an upload-ready plain-text template from the canonical {@link EmailTemplateDto}.
 */
export function buildPlainTextTemplate(
  dto: EmailTemplateDto,
  _options?: TemplateBuildOptions,
): string {
  return buildPlainText(dto);
}
