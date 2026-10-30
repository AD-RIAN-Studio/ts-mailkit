import type { EmailTemplateDto } from "./dto/index.js";
import { buildHtml, buildPlainText } from "../renderers/default/default-renderer.js";
import type { RendererOptions } from "../renderers/renderer.interface.js";

/**
 * Styling options for building upload-ready templates.
 */
export interface TemplateBuildOptions extends RendererOptions {}

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
  return buildHtml(dto, options);
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
