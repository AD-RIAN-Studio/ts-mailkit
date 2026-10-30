/**
 * Data Transfer Object for templated emails.
 */
export interface EmailTemplateDto {
  /** Email subject line */
  subject: string;
  /** Optional logo URL displayed top-center in the email. Must be a valid http(s) URL. */
  logoUrl?: string;
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

interface OptionalExtraFields {
  brandName?: string;
  extraMessage?: string;
  logoUrl?: string;
  footer?: string;
}

/**
 * Parameters for creating an email verification message.
 */
export interface EmailVerificationParams extends OptionalExtraFields {
  username: string;
  verificationUrl: string;
  otp: string;
}

/**
 * Parameters for creating a password reset message.
 */
export interface PasswordResetParams extends OptionalExtraFields {
  username: string;
  resetUrl: string;
  otp?: string;
}

/**
 * Parameters for creating a 2FA code message.
 */
export interface TwoFactorParams extends OptionalExtraFields {
  username: string;
  otp: string;
  magicLink?: string;
}

/**
 * Parameters for creating a magic link sign-in message.
 */
export interface MagicLinkParams extends OptionalExtraFields {
  username: string;
  magicLink: string;
}

/**
 * Parameters for creating a newsletter or announcement message.
 */
export interface NewsletterParams extends OptionalExtraFields {
  subject: string;
  header: string;
  body: string;
  imageUrl?: string;
  actionUrl?: string;
  actionText?: string;
}

/**
 * Parameters for creating a simple notification message.
 */
export interface SimpleMessageParams extends OptionalExtraFields {
  subject: string;
  header: string;
  body: string;
}
