import type {
  EmailTemplateDto,
  EmailVerificationParams,
  MagicLinkParams,
  NewsletterParams,
  PasswordResetParams,
  SimpleMessageParams,
  TwoFactorParams,
} from "./dto/index.js";
import { htmlToPlainText } from "../renderers/utils/html-to-plaintext.js";

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
  "If you did not request this, please ignore this email or contact support if you have concerns.";

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
    this.defaultBrandName = config.brandName || "Application";
    this.defaultSecurityMessage = config.securityMessage || DEFAULT_SECURITY_MESSAGE;
    this.defaultLogoUrl = config.logoUrl;
    if (typeof config.footer === "function") {
      this.footerResolver = config.footer;
    } else if (typeof config.footer === "string") {
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

  private arrangePlainTextWithExtras(base: string, extraMessage?: string, footer?: string): string {
    const parts = [base];
    if (extraMessage) {
      parts.push(htmlToPlainText(extraMessage));
    }
    if (footer) {
      parts.push(htmlToPlainText(footer));
    }
    return parts.join("\n\n");
  }

  /**
   * Welcome / email-verification email sent after registration.
   */
  createEmailVerification(params: EmailVerificationParams): EmailTemplateDto {
    const { username, verificationUrl, otp, brandName, logoUrl, extraMessage, footer } = params;
    const brand = this.resolveBrand(brandName);
    const body = `Hi ${username},<br/>Thank you for signing up. Use the code below or click the button to verify your email address.`;
    const resolvedExtraMessage = extraMessage ?? this.defaultSecurityMessage;
    const resolvedFooter = footer ?? this.buildFooter(brand);
    const plainTextBody =
      htmlToPlainText(body) +
      `\n\nYour verification code is: ${otp}\n\nAlternatively, verify here:\n${verificationUrl}`;
    return {
      subject: "Verify Your Email Address",
      header: `Welcome to ${brand}!`,
      body,
      logoUrl: logoUrl ?? this.defaultLogoUrl,
      otpCode: otp,
      actionUrl: verificationUrl,
      actionText: "Verify Email",
      extraMessage: resolvedExtraMessage,
      footer: resolvedFooter,
      userName: username,
      fromName: brand,
      noHtmlMessage: this.arrangePlainTextWithExtras(
        plainTextBody,
        resolvedExtraMessage,
        resolvedFooter,
      ),
    };
  }

  /**
   * Password-reset email with an optional OTP code and action link.
   */
  createPasswordReset(params: PasswordResetParams): EmailTemplateDto {
    const { username, resetUrl, otp = "", brandName, logoUrl, extraMessage, footer } = params;
    const brand = this.resolveBrand(brandName);
    const body = `Hi ${username},<br/>We received a request to reset your password. Use the OTP code below or click the button to proceed.`;
    const plainTextOtp = otp ? `\n\nYour OTP code is: ${otp}` : "";
    const resolvedExtraMessage = extraMessage ?? this.defaultSecurityMessage;
    const resolvedFooter = footer ?? this.buildFooter(brand);
    const plainTextBody =
      htmlToPlainText(body) +
      plainTextOtp +
      `\n\nAlternatively, you can use the following link to reset your password:\n${resetUrl}`;
    return {
      subject: "Password Reset Request",
      header: "Reset Your Password",
      body,
      logoUrl: logoUrl ?? this.defaultLogoUrl,
      otpCode: otp || undefined,
      actionUrl: resetUrl,
      actionText: "Reset Password",
      extraMessage: resolvedExtraMessage,
      footer: resolvedFooter,
      userName: username,
      fromName: brand,
      noHtmlMessage: this.arrangePlainTextWithExtras(
        plainTextBody,
        resolvedExtraMessage,
        resolvedFooter,
      ),
    };
  }

  /**
   * Generic plain message email (no action button, no OTP).
   */
  createSimpleMessage(params: SimpleMessageParams): EmailTemplateDto {
    const { subject, header, body, brandName, logoUrl, extraMessage, footer } = params;
    const brand = this.resolveBrand(brandName);
    const resolvedFooter = footer ?? this.buildFooter(brand);
    return {
      subject,
      header,
      body,
      logoUrl: logoUrl ?? this.defaultLogoUrl,
      extraMessage,
      footer: resolvedFooter,
      fromName: brand,
      noHtmlMessage: this.arrangePlainTextWithExtras(
        htmlToPlainText(body),
        extraMessage,
        resolvedFooter,
      ),
    };
  }

  /**
   * Newsletter / announcement email with an optional hero image and CTA button.
   */
  createNewsLetter(params: NewsletterParams): EmailTemplateDto {
    const {
      subject,
      header,
      body,
      imageUrl,
      actionUrl,
      actionText,
      brandName,
      logoUrl,
      extraMessage,
      footer,
    } = params;
    const brand = this.resolveBrand(brandName);
    const resolvedFooter = footer ?? this.buildFooter(brand);
    let plainTextBody = htmlToPlainText(body);
    if (actionUrl) {
      plainTextBody += `\n\n${actionText || "Learn more"}: ${actionUrl}`;
    }
    return {
      subject,
      header,
      body,
      logoUrl: logoUrl ?? this.defaultLogoUrl,
      imageUrl,
      actionUrl,
      actionText,
      extraMessage,
      footer: resolvedFooter,
      fromName: brand,
      noHtmlMessage: this.arrangePlainTextWithExtras(plainTextBody, extraMessage, resolvedFooter),
    };
  }

  /**
   * Two-factor authentication email with OTP code and optional magic link.
   */
  create2FAEmail(params: TwoFactorParams): EmailTemplateDto {
    const { username, otp, magicLink = "", brandName, logoUrl, extraMessage, footer } = params;
    const brand = this.resolveBrand(brandName);
    const body = `Hi ${username},<br/>Use the code below or click the button to complete your login.`;
    const plainLink = magicLink ? `\n\nAlternatively, verify here:\n${magicLink}` : "";
    const resolvedExtraMessage = extraMessage ?? this.defaultSecurityMessage;
    const resolvedFooter = footer ?? this.buildFooter(brand);
    const plainTextBody =
      htmlToPlainText(body) + `\n\nYour verification code is: ${otp}` + plainLink;
    return {
      subject: "Your Login Verification Code",
      header: "Two-Factor Authentication",
      body,
      logoUrl: logoUrl ?? this.defaultLogoUrl,
      otpCode: otp,
      actionUrl: magicLink || undefined,
      actionText: magicLink ? "Verify Login" : undefined,
      extraMessage: resolvedExtraMessage,
      footer: resolvedFooter,
      userName: username,
      fromName: brand,
      noHtmlMessage: this.arrangePlainTextWithExtras(
        plainTextBody,
        resolvedExtraMessage,
        resolvedFooter,
      ),
    };
  }

  /**
   * Magic link sign-in email (no OTP, button only).
   */
  createMagicLinkEmail(params: MagicLinkParams): EmailTemplateDto {
    const { username, magicLink, brandName, logoUrl, extraMessage, footer } = params;
    const brand = this.resolveBrand(brandName);
    const body = `Hi ${username},<br/>Click the button below to sign in. No password needed.`;
    const resolvedExtraMessage = extraMessage ?? this.defaultSecurityMessage;
    const resolvedFooter = footer ?? this.buildFooter(brand);
    const plainTextBody = htmlToPlainText(body) + `\n\nSign in here:\n${magicLink}`;
    return {
      subject: "Your Magic Link",
      header: `Sign In to ${brand}`,
      body,
      logoUrl: logoUrl ?? this.defaultLogoUrl,
      actionUrl: magicLink,
      actionText: "Sign In",
      extraMessage: resolvedExtraMessage,
      footer: resolvedFooter,
      userName: username,
      fromName: brand,
      noHtmlMessage: this.arrangePlainTextWithExtras(
        plainTextBody,
        resolvedExtraMessage,
        resolvedFooter,
      ),
    };
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

  static createPasswordReset(params: PasswordResetParams): EmailTemplateDto {
    return this.defaultInstance.createPasswordReset(params);
  }

  static createSimpleMessage(params: SimpleMessageParams): EmailTemplateDto {
    return this.defaultInstance.createSimpleMessage(params);
  }

  static createNewsLetter(params: NewsletterParams): EmailTemplateDto {
    return this.defaultInstance.createNewsLetter(params);
  }

  static create2FAEmail(params: TwoFactorParams): EmailTemplateDto {
    return this.defaultInstance.create2FAEmail(params);
  }

  static createMagicLinkEmail(params: MagicLinkParams): EmailTemplateDto {
    return this.defaultInstance.createMagicLinkEmail(params);
  }
}
