import type { EmailTemplateDto, EmailVerificationParams, MagicLinkParams, NewsletterParams, PasswordResetParams, SimpleMessageParams, TwoFactorParams,} from './dto/index.js';
import { htmlToPlainText } from '../renderers/utils/html-to-plaintext.js';

export interface BrandingConfig {
  /**
   * Default brand, application, or company name.
   * @default 'Application'
   */
  brandName?: string;

  /**
   * Optional custom security / disclaimer advisory message.
   */
  securityMessage?: string;

  /**
   * Optional custom footer generator or string.
   */
  footer?: string | ((brandName: string) => string);

  /**
   * Optional default logo URL to display top-center in templated emails.
   */
  logoUrl?: string;
}

const DEFAULT_SECURITY_MESSAGE =
  'If you did not request this, please ignore this email or contact support if you have concerns.';

function defaultFooter(brandName: string): string {
  return `&copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.`;
}

/**
 * Factory for creating pre-populated, type-safe email template DTOs.
 */
export class EmailTemplateFactory {
  private readonly defaultBrandName: string;
  private readonly defaultSecurityMessage: string;
  private readonly footerResolver: (brandName: string) => string;
  private readonly defaultLogoUrl?: string;

  constructor(config: BrandingConfig = {}) {
    this.defaultBrandName = config.brandName || 'Application';
    this.defaultSecurityMessage = config.securityMessage || DEFAULT_SECURITY_MESSAGE;
    this.defaultLogoUrl = config.logoUrl;
    if (typeof config.footer === 'function') {
      this.footerResolver = config.footer;
    } else if (typeof config.footer === 'string') {
      const fixedFooter = config.footer;
      this.footerResolver = () => fixedFooter;
    } else {
      this.footerResolver = defaultFooter;
    }
  }

  private resolveBrand(override?: string): string {
    return override || this.defaultBrandName;
  }

  private buildFooter(brandName: string): string {
    return this.footerResolver(brandName);
  }

  /**
   * Welcome / email-verification email sent after registration.
   */
  createEmailVerification(params: EmailVerificationParams): EmailTemplateDto {
    const { username, verificationUrl, otp, brandName } = params;
    const brand = this.resolveBrand(brandName);
    const body = `Hi ${username},<br/>Thank you for signing up. Use the code below or click the button to verify your email address.`;
    return {
      subject: 'Verify Your Email Address',
      header: `Welcome to ${brand}!`,
      body,
      logoUrl: this.defaultLogoUrl,
      otpCode: otp,
      actionUrl: verificationUrl,
      actionText: 'Verify Email',
      extraMessage: this.defaultSecurityMessage,
      footer: this.buildFooter(brand),
      userName: username,
      fromName: brand,
      noHtmlMessage:
        htmlToPlainText(body) +
        `\n\nYour verification code is: ${otp}\n\nAlternatively, verify here:\n${verificationUrl}`,
    };
  }

  /**
   * @deprecated Use `createEmailVerification({ username, verificationUrl, otp, brandName })` with the Parameter Object pattern instead.
   * Will be removed in the next major release.
   */
  createEmailVerification_Legacy(
    username: string,
    verificationUrl: string,
    otp: string,
    brandName?: string
  ): EmailTemplateDto {
    return this.createEmailVerification({ username, verificationUrl, otp, brandName });
  }

  /**
   * Password-reset email with an optional OTP code and action link.
   */
  createPasswordReset(params: PasswordResetParams): EmailTemplateDto {
    const { username, resetUrl, otp = '', brandName } = params;
    const brand = this.resolveBrand(brandName);
    const body = `Hi ${username},<br/>We received a request to reset your password. Use the OTP code below or click the button to proceed.`;
    const plainTextOtp = otp ? `\n\nYour OTP code is: ${otp}` : '';
    return {
      subject: 'Password Reset Request',
      header: 'Reset Your Password',
      body,
      logoUrl: this.defaultLogoUrl,
      otpCode: otp || undefined,
      actionUrl: resetUrl,
      actionText: 'Reset Password',
      extraMessage: this.defaultSecurityMessage,
      footer: this.buildFooter(brand),
      userName: username,
      fromName: brand,
      noHtmlMessage:
        htmlToPlainText(body) +
        plainTextOtp +
        `\n\nAlternatively, you can use the following link to reset your password:\n${resetUrl}`,
    };
  }

  /**
   * @deprecated Use `createPasswordReset({ username, resetUrl, otp, brandName })` with the Parameter Object pattern instead.
   * Will be removed in the next major release.
   */
  createPasswordReset_Legacy(
    username: string,
    resetUrl: string,
    otp: string = '',
    brandName?: string
  ): EmailTemplateDto {
    return this.createPasswordReset({ username, resetUrl, otp, brandName });
  }

  /**
   * Generic plain message email (no action button, no OTP).
   */
  createSimpleMessage(params: SimpleMessageParams): EmailTemplateDto {
    const { subject, header, body, brandName } = params;
    const brand = this.resolveBrand(brandName);
    return {
      subject,
      header,
      body,
      logoUrl: this.defaultLogoUrl,
      footer: this.buildFooter(brand),
      fromName: brand,
      noHtmlMessage: htmlToPlainText(body),
    };
  }

  /**
   * @deprecated Use `createSimpleMessage({ subject, header, body, brandName })` with the Parameter Object pattern instead.
   * Will be removed in the next major release.
   */
  createSimpleMessage_Legacy(
    subject: string,
    header: string,
    body: string,
    brandName?: string
  ): EmailTemplateDto {
    return this.createSimpleMessage({ subject, header, body, brandName });
  }

  /**
   * Newsletter / announcement email with an optional hero image and CTA button.
   */
  createNewsLetter(params: NewsletterParams): EmailTemplateDto {
    const { subject, header, body, imageUrl, actionUrl, actionText, brandName, logoUrl } = params;
    const brand = this.resolveBrand(brandName);
    let noHtmlMessage = htmlToPlainText(body);
    if (actionUrl) {
      noHtmlMessage += `\n\n${actionText || 'Learn more'}: ${actionUrl}`;
    }
    return {
      subject,
      header,
      body,
      logoUrl: logoUrl || this.defaultLogoUrl,
      imageUrl,
      actionUrl,
      actionText,
      footer: this.buildFooter(brand),
      fromName: brand,
      noHtmlMessage,
    };
  }

  /**
   * @deprecated Use `createNewsLetter({ subject, header, body, imageUrl, actionUrl, actionText, brandName, logoUrl })` with the Parameter Object pattern instead.
   * Will be removed in the next major release.
   */
  createNewsLetter_Legacy(
    subject: string,
    header: string,
    body: string,
    imageUrl?: string,
    actionUrl?: string,
    actionText?: string,
    brandName?: string,
    logoUrl?: string
  ): EmailTemplateDto {
    return this.createNewsLetter({
      subject,
      header,
      body,
      imageUrl,
      actionUrl,
      actionText,
      brandName,
      logoUrl,
    });
  }

  /**
   * Two-factor authentication email with OTP code and optional magic link.
   */
  create2FAEmail(params: TwoFactorParams): EmailTemplateDto {
    const { username, otp, magicLink = '', brandName } = params;
    const brand = this.resolveBrand(brandName);
    const body = `Hi ${username},<br/>Use the code below or click the button to complete your login.`;
    const plainLink = magicLink ? `\n\nAlternatively, verify here:\n${magicLink}` : '';
    return {
      subject: 'Your Login Verification Code',
      header: 'Two-Factor Authentication',
      body,
      logoUrl: this.defaultLogoUrl,
      otpCode: otp,
      actionUrl: magicLink || undefined,
      actionText: magicLink ? 'Verify Login' : undefined,
      extraMessage: this.defaultSecurityMessage,
      footer: this.buildFooter(brand),
      userName: username,
      fromName: brand,
      noHtmlMessage: htmlToPlainText(body) + `\n\nYour verification code is: ${otp}` + plainLink,
    };
  }

  /**
   * @deprecated Use `create2FAEmail({ username, otp, magicLink, brandName })` with the Parameter Object pattern instead.
   * Will be removed in the next major release.
   */
  create2FAEmail_Legacy(
    username: string,
    otp: string,
    magicLink: string = '',
    brandName?: string
  ): EmailTemplateDto {
    return this.create2FAEmail({ username, otp, magicLink, brandName });
  }

  /**
   * Magic link sign-in email (no OTP, button only).
   */
  createMagicLinkEmail(params: MagicLinkParams): EmailTemplateDto {
    const { username, magicLink, brandName } = params;
    const brand = this.resolveBrand(brandName);
    const body = `Hi ${username},<br/>Click the button below to sign in. No password needed.`;
    return {
      subject: 'Your Magic Link',
      header: `Sign In to ${brand}`,
      body,
      logoUrl: this.defaultLogoUrl,
      actionUrl: magicLink,
      actionText: 'Sign In',
      extraMessage: this.defaultSecurityMessage,
      footer: this.buildFooter(brand),
      userName: username,
      fromName: brand,
      noHtmlMessage: htmlToPlainText(body) + `\n\nSign in here:\n${magicLink}`,
    };
  }

  /**
   * @deprecated Use `createMagicLinkEmail({ username, magicLink, brandName })` with the Parameter Object pattern instead.
   * Will be removed in the next major release.
   */
  createMagicLinkEmail_Legacy(
    username: string,
    magicLink: string,
    brandName?: string
  ): EmailTemplateDto {
    return this.createMagicLinkEmail({ username, magicLink, brandName });
  }

  // ─── Default Static Instance ──────────────────────────────────────────────
  private static _defaultInstance?: EmailTemplateFactory;

  private static get defaultInstance(): EmailTemplateFactory {
    if (!this._defaultInstance) {
      this._defaultInstance = new EmailTemplateFactory();
    }
    return this._defaultInstance;
  }

  static createEmailVerification(params: EmailVerificationParams): EmailTemplateDto {
    return this.defaultInstance.createEmailVerification(params);
  }

  /**
   * @deprecated Use `createEmailVerification(params: EmailVerificationParams)` instead.
   * Will be removed in the next major release.
   */
  static createEmailVerification_Legacy(
    username: string,
    verificationUrl: string,
    otp: string,
    brandName?: string
  ): EmailTemplateDto {
    return this.defaultInstance.createEmailVerification({ username, verificationUrl, otp, brandName });
  }

  static createPasswordReset(params: PasswordResetParams): EmailTemplateDto {
    return this.defaultInstance.createPasswordReset(params);
  }

  /**
   * @deprecated Use `createPasswordReset(params: PasswordResetParams)` instead.
   * Will be removed in the next major release.
   */
  static createPasswordReset_Legacy(
    username: string,
    resetUrl: string,
    otp?: string,
    brandName?: string
  ): EmailTemplateDto {
    return this.defaultInstance.createPasswordReset({ username, resetUrl, otp, brandName });
  }

  static createSimpleMessage(params: SimpleMessageParams): EmailTemplateDto {
    return this.defaultInstance.createSimpleMessage(params);
  }

  /**
   * @deprecated Use `createSimpleMessage(params: SimpleMessageParams)` instead.
   * Will be removed in the next major release.
   */
  static createSimpleMessage_Legacy(
    subject: string,
    header: string,
    body: string,
    brandName?: string
  ): EmailTemplateDto {
    return this.defaultInstance.createSimpleMessage({ subject, header, body, brandName });
  }

  static createNewsLetter(params: NewsletterParams): EmailTemplateDto {
    return this.defaultInstance.createNewsLetter(params);
  }

  /**
   * @deprecated Use `createNewsLetter(params: NewsletterParams)` instead.
   * Will be removed in the next major release.
   */
  static createNewsLetter_Legacy(
    subject: string,
    header: string,
    body: string,
    imageUrl?: string,
    actionUrl?: string,
    actionText?: string,
    brandName?: string,
    logoUrl?: string
  ): EmailTemplateDto {
    return this.defaultInstance.createNewsLetter({
      subject,
      header,
      body,
      imageUrl,
      actionUrl,
      actionText,
      brandName,
      logoUrl,
    });
  }

  static create2FAEmail(params: TwoFactorParams): EmailTemplateDto {
    return this.defaultInstance.create2FAEmail(params);
  }

  /**
   * @deprecated Use `create2FAEmail(params: TwoFactorParams)` instead.
   * Will be removed in the next major release.
   */
  static create2FAEmail_Legacy(
    username: string,
    otp: string,
    magicLink?: string,
    brandName?: string
  ): EmailTemplateDto {
    return this.defaultInstance.create2FAEmail({ username, otp, magicLink, brandName });
  }

  static createMagicLinkEmail(params: MagicLinkParams): EmailTemplateDto {
    return this.defaultInstance.createMagicLinkEmail(params);
  }

  /**
   * @deprecated Use `createMagicLinkEmail(params: MagicLinkParams)` instead.
   * Will be removed in the next major release.
   */
  static createMagicLinkEmail_Legacy(
    username: string,
    magicLink: string,
    brandName?: string
  ): EmailTemplateDto {
    return this.defaultInstance.createMagicLinkEmail({ username, magicLink, brandName });
  }
}
