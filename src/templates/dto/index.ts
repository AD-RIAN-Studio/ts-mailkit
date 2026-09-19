/**
 * Base Data Transfer Object for templated emails.
 * Compatible with the legacy EmailTemplateDto while allowing typed extensions.
 */
export interface BaseEmailDto {
  /** Email subject line */
  subject: string;
  /** Primary headline/header in the email content */
  header?: string;
  /** Optional hero image URL displayed at the top */
  imageUrl?: string;
  /** Main message content (supports HTML/paragraphs) */
  body?: string;
  /** Verification or one-time password code (formatted prominently) */
  otpCode?: string;
  /** Primary Call-to-Action button URL */
  actionUrl?: string;
  /** Primary Call-to-Action button text */
  actionText?: string;
  /** Optional disclaimer, security advisory, or secondary note */
  extraMessage?: string;
  /** Footer content (copyright notice, unsubscribe, etc.) */
  footer?: string;
  /** Name of the recipient for personalization */
  userName?: string;
  /** Sender display name override (e.g. brand, school, or team name) */
  fromName?: string;
  /** Pre-built plain-text fallback. If omitted, generated automatically from HTML/fields */
  noHtmlMessage?: string;
  /** Arbitrary metadata or tracking attributes */
  metadata?: Record<string, unknown>;
}

/**
 * Legacy alias for BaseEmailDto to ensure 100% drop-in compatibility.
 */
export type EmailTemplateDto = BaseEmailDto;

/**
 * Parameters for creating an email verification message.
 */
export interface EmailVerificationParams {
  username: string;
  verificationUrl: string;
  otp: string;
  brandName?: string;
  extraMessage?: string;
}

/**
 * Parameters for creating a password reset message.
 */
export interface PasswordResetParams {
  username: string;
  resetUrl: string;
  otp?: string;
  brandName?: string;
  extraMessage?: string;
}

/**
 * Parameters for creating a 2FA code message.
 */
export interface TwoFactorParams {
  username: string;
  otp: string;
  magicLink?: string;
  brandName?: string;
  extraMessage?: string;
}

/**
 * Parameters for creating a magic link sign-in message.
 */
export interface MagicLinkParams {
  username: string;
  magicLink: string;
  brandName?: string;
  extraMessage?: string;
}

/**
 * Parameters for creating a newsletter or announcement message.
 */
export interface NewsletterParams {
  subject: string;
  header: string;
  body: string;
  imageUrl?: string;
  actionUrl?: string;
  actionText?: string;
  brandName?: string;
  footer?: string;
}

/**
 * Parameters for creating a simple notification message.
 */
export interface SimpleMessageParams {
  subject: string;
  header: string;
  body: string;
  brandName?: string;
  footer?: string;
}
