import type { EmailTemplateDto } from "../templates/dto/index.js";

/**
 * Common styling options shared by renderers and template builders.
 */
export interface RendererOptions {
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

  /**
   * Default logo URL displayed at the top-center of the email if not provided in the DTO.
   * Must be a valid http(s) URL.
   */
  logoUrl?: string;
}

/**
 * Output of an email rendering process.
 */
export interface RenderedEmail {
  html: string;
  text: string;
}

/**
 * Contract for email rendering engines (default HTML template, React Email, MJML, Handlebars, etc.).
 */
export interface IEmailRenderer<TDto extends EmailTemplateDto = EmailTemplateDto> {
  /**
   * Renders an email DTO into an HTML string and plain-text fallback string.
   */
  render(dto: TDto): Promise<RenderedEmail> | RenderedEmail;
}
