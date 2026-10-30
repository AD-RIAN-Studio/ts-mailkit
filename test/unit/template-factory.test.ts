import { describe, it, expect } from "vite-plus/test";
import { EmailTemplateFactory } from "../../src/templates/factory.js";

describe("EmailTemplateFactory", () => {
  describe("Static Factory Methods", () => {
    it("creates email verification template", () => {
      const dto = EmailTemplateFactory.createEmailVerification({
        username: "Alex",
        verificationUrl: "https://app.test/verify?token=123",
        otp: "456789",
        brandName: "Acme Corp",
      });

      expect(dto.subject).toBe("Verify Your Email Address");
      expect(dto.header).toBe("Welcome to Acme Corp!");
      expect(dto.otpCode).toBe("456789");
      expect(dto.actionUrl).toBe("https://app.test/verify?token=123");
      expect(dto.actionText).toBe("Verify Email");
      expect(dto.userName).toBe("Alex");
      expect(dto.fromName).toBe("Acme Corp");
      expect(dto.footer).toContain("Acme Corp. All rights reserved.");
      expect(dto.noHtmlMessage).toContain("Your verification code is: 456789");
      expect(dto.noHtmlMessage).toContain("https://app.test/verify?token=123");
    });

    it("creates password reset template", () => {
      const dto = EmailTemplateFactory.createPasswordReset({
        username: "Sam",
        resetUrl: "https://app.test/reset?token=abc",
        otp: "998877",
        brandName: "FinTech Inc",
      });

      expect(dto.subject).toBe("Password Reset Request");
      expect(dto.header).toBe("Reset Your Password");
      expect(dto.otpCode).toBe("998877");
      expect(dto.actionUrl).toBe("https://app.test/reset?token=abc");
      expect(dto.actionText).toBe("Reset Password");
      expect(dto.fromName).toBe("FinTech Inc");
      expect(dto.noHtmlMessage).toContain("Your OTP code is: 998877");
    });

    it("creates simple message template", () => {
      const dto = EmailTemplateFactory.createSimpleMessage({
        subject: "System Notice",
        header: "Maintenance Alert",
        body: "We will be undergoing scheduled maintenance.",
        brandName: "Platform Team",
      });

      expect(dto.subject).toBe("System Notice");
      expect(dto.header).toBe("Maintenance Alert");
      expect(dto.body).toBe("We will be undergoing scheduled maintenance.");
      expect(dto.fromName).toBe("Platform Team");
      expect(dto.noHtmlMessage).toContain("We will be undergoing scheduled maintenance.");
      expect(dto.noHtmlMessage).toContain("Platform Team. All rights reserved.");
    });

    it("creates newsletter template with optional CTA and image", () => {
      const dto = EmailTemplateFactory.createNewsLetter({
        subject: "Monthly Update",
        header: "August Newsletter",
        body: "Here is what happened this month.",
        imageUrl: "https://img.test/hero.png",
        actionUrl: "https://blog.test/august",
        actionText: "Read More",
        brandName: "NewsHub",
      });

      expect(dto.subject).toBe("Monthly Update");
      expect(dto.imageUrl).toBe("https://img.test/hero.png");
      expect(dto.actionUrl).toBe("https://blog.test/august");
      expect(dto.actionText).toBe("Read More");
      expect(dto.noHtmlMessage).toContain("Read More: https://blog.test/august");
    });

    it("creates 2FA and magic link templates", () => {
      const twoFa = EmailTemplateFactory.create2FAEmail({
        username: "Dana",
        otp: "112233",
        magicLink: "https://app.test/auth/2fa",
        brandName: "AuthService",
      });
      expect(twoFa.otpCode).toBe("112233");
      expect(twoFa.actionUrl).toBe("https://app.test/auth/2fa");

      const magic = EmailTemplateFactory.createMagicLinkEmail({
        username: "Dana",
        magicLink: "https://app.test/magic?token=xyz",
        brandName: "AuthService",
      });
      expect(magic.subject).toBe("Your Magic Link");
      expect(magic.actionUrl).toBe("https://app.test/magic?token=xyz");
      expect(magic.actionText).toBe("Sign In");
    });
  });

  describe("Configured Factory Instance", () => {
    it("respects custom branding configuration", () => {
      const factory = new EmailTemplateFactory({
        brandName: "Custom Brand",
        securityMessage: "Custom security notice.",
        footer: (brand) => `Custom Footer for ${brand}`,
        logoUrl: "https://brand.test/logo.png",
      });

      const dto = factory.createEmailVerification({
        username: "User1",
        verificationUrl: "https://verify.url",
        otp: "1234",
      });
      expect(dto.header).toBe("Welcome to Custom Brand!");
      expect(dto.fromName).toBe("Custom Brand");
      expect(dto.logoUrl).toBe("https://brand.test/logo.png");
      expect(dto.extraMessage).toBe("Custom security notice.");
      expect(dto.footer).toBe("Custom Footer for Custom Brand");
    });

    it("allows overriding logoUrl in createNewsLetter", () => {
      const factory = new EmailTemplateFactory({
        brandName: "Custom Brand",
        logoUrl: "https://brand.test/default-logo.png",
      });

      const dto = factory.createNewsLetter({
        subject: "Newsletter",
        header: "Head",
        body: "Body",
        logoUrl: "https://brand.test/custom-newsletter-logo.png",
      });

      expect(dto.logoUrl).toBe("https://brand.test/custom-newsletter-logo.png");
    });

    it("honors per-call logoUrl, extraMessage, and footer overrides", () => {
      const factory = new EmailTemplateFactory({
        brandName: "Default Brand",
        logoUrl: "https://brand.test/default.png",
        securityMessage: "Default security.",
        footer: "Default footer.",
      });

      const dto = factory.createEmailVerification({
        username: "User",
        verificationUrl: "https://verify.url",
        otp: "1234",
        logoUrl: "https://brand.test/custom.png",
        extraMessage: "Custom security note.",
        footer: "Custom footer.",
      });

      expect(dto.logoUrl).toBe("https://brand.test/custom.png");
      expect(dto.extraMessage).toBe("Custom security note.");
      expect(dto.footer).toBe("Custom footer.");
      expect(dto.noHtmlMessage).toContain("Custom security note.");
      expect(dto.noHtmlMessage).toContain("Custom footer.");
    });

    it("honors extraMessage and footer on simple and newsletter messages", () => {
      const factory = new EmailTemplateFactory({ brandName: "Brand" });

      const simple = factory.createSimpleMessage({
        subject: "S",
        header: "H",
        body: "B",
        extraMessage: "Extra note",
        footer: "Simple footer",
      });
      expect(simple.extraMessage).toBe("Extra note");
      expect(simple.footer).toBe("Simple footer");
      expect(simple.noHtmlMessage).toContain("Extra note");
      expect(simple.noHtmlMessage).toContain("Simple footer");

      const news = factory.createNewsLetter({
        subject: "S",
        header: "H",
        body: "B",
        extraMessage: "News extra",
        footer: "News footer",
      });
      expect(news.extraMessage).toBe("News extra");
      expect(news.footer).toBe("News footer");
      expect(news.noHtmlMessage).toContain("News extra");
      expect(news.noHtmlMessage).toContain("News footer");
    });

    it("falls back to branding defaults when per-call overrides are omitted", () => {
      const factory = new EmailTemplateFactory({
        brandName: "Brand",
        logoUrl: "https://brand.test/logo.png",
        securityMessage: "Default security.",
        footer: "Default footer.",
      });

      const dto = factory.createPasswordReset({
        username: "User",
        resetUrl: "https://reset.url",
      });

      expect(dto.logoUrl).toBe("https://brand.test/logo.png");
      expect(dto.extraMessage).toBe("Default security.");
      expect(dto.footer).toBe("Default footer.");
    });
  });
});
