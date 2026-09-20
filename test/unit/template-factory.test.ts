import { describe, it, expect } from 'vitest';
import { EmailTemplateFactory } from '../../src/templates/factory.js';

describe('EmailTemplateFactory', () => {
  describe('Static Factory Methods', () => {
    it('creates email verification template', () => {
      const dto = EmailTemplateFactory.createEmailVerification(
        'Alex',
        'https://app.test/verify?token=123',
        '456789',
        'Acme Corp'
      );

      expect(dto.subject).toBe('Verify Your Email Address');
      expect(dto.header).toBe('Welcome to Acme Corp!');
      expect(dto.otpCode).toBe('456789');
      expect(dto.actionUrl).toBe('https://app.test/verify?token=123');
      expect(dto.actionText).toBe('Verify Email');
      expect(dto.userName).toBe('Alex');
      expect(dto.fromName).toBe('Acme Corp');
      expect(dto.footer).toContain('Acme Corp. All rights reserved.');
      expect(dto.noHtmlMessage).toContain('Your verification code is: 456789');
      expect(dto.noHtmlMessage).toContain('https://app.test/verify?token=123');
    });

    it('creates password reset template', () => {
      const dto = EmailTemplateFactory.createPasswordReset(
        'Sam',
        'https://app.test/reset?token=abc',
        '998877',
        'FinTech Inc'
      );

      expect(dto.subject).toBe('Password Reset Request');
      expect(dto.header).toBe('Reset Your Password');
      expect(dto.otpCode).toBe('998877');
      expect(dto.actionUrl).toBe('https://app.test/reset?token=abc');
      expect(dto.actionText).toBe('Reset Password');
      expect(dto.fromName).toBe('FinTech Inc');
      expect(dto.noHtmlMessage).toContain('Your OTP code is: 998877');
    });

    it('creates simple message template', () => {
      const dto = EmailTemplateFactory.createSimpleMessage(
        'System Notice',
        'Maintenance Alert',
        'We will be undergoing scheduled maintenance.',
        'Platform Team'
      );

      expect(dto.subject).toBe('System Notice');
      expect(dto.header).toBe('Maintenance Alert');
      expect(dto.body).toBe('We will be undergoing scheduled maintenance.');
      expect(dto.fromName).toBe('Platform Team');
      expect(dto.noHtmlMessage).toBe('We will be undergoing scheduled maintenance.');
    });

    it('creates newsletter template with optional CTA and image', () => {
      const dto = EmailTemplateFactory.createNewsLetter(
        'Monthly Update',
        'August Newsletter',
        'Here is what happened this month.',
        'https://img.test/hero.png',
        'https://blog.test/august',
        'Read More',
        'NewsHub'
      );

      expect(dto.subject).toBe('Monthly Update');
      expect(dto.imageUrl).toBe('https://img.test/hero.png');
      expect(dto.actionUrl).toBe('https://blog.test/august');
      expect(dto.actionText).toBe('Read More');
      expect(dto.noHtmlMessage).toContain('Read More: https://blog.test/august');
    });

    it('creates 2FA and magic link templates', () => {
      const twoFa = EmailTemplateFactory.create2FAEmail('Dana', '112233', 'https://app.test/auth/2fa', 'AuthService');
      expect(twoFa.otpCode).toBe('112233');
      expect(twoFa.actionUrl).toBe('https://app.test/auth/2fa');

      const magic = EmailTemplateFactory.createMagicLinkEmail('Dana', 'https://app.test/magic?token=xyz', 'AuthService');
      expect(magic.subject).toBe('Your Magic Link');
      expect(magic.actionUrl).toBe('https://app.test/magic?token=xyz');
      expect(magic.actionText).toBe('Sign In');
    });
  });

  describe('Configured Factory Instance', () => {
    it('respects custom branding configuration', () => {
      const factory = new EmailTemplateFactory({
        brandName: 'Custom Brand',
        securityMessage: 'Custom security notice.',
        footer: (brand) => `Custom Footer for ${brand}`,
        logoUrl: 'https://brand.test/logo.png',
      });

      const dto = factory.createEmailVerification('User1', 'https://verify.url', '1234');
      expect(dto.header).toBe('Welcome to Custom Brand!');
      expect(dto.fromName).toBe('Custom Brand');
      expect(dto.logoUrl).toBe('https://brand.test/logo.png');
      expect(dto.extraMessage).toBe('Custom security notice.');
      expect(dto.footer).toBe('Custom Footer for Custom Brand');
    });

    it('allows overriding logoUrl in createNewsLetter', () => {
      const factory = new EmailTemplateFactory({
        brandName: 'Custom Brand',
        logoUrl: 'https://brand.test/default-logo.png',
      });

      const dto = factory.createNewsLetter(
        'Newsletter',
        'Head',
        'Body',
        undefined,
        undefined,
        undefined,
        undefined,
        'https://brand.test/custom-newsletter-logo.png'
      );

      expect(dto.logoUrl).toBe('https://brand.test/custom-newsletter-logo.png');
    });
  });
});
