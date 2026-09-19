import type { EmailTemplateDto } from '../templates/dto/index.js';

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
