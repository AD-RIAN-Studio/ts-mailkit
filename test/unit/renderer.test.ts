import { describe, it, expect } from 'vitest';
import {
  DefaultEmailRenderer,
  buildHtml,
  buildPlainText,
} from '../../src/renderers/default/default-renderer.js';
import { htmlToPlainText, decodeHtmlEntities } from '../../src/renderers/utils/html-to-plaintext.js';
import type { EmailTemplateDto, BaseEmailDto } from '../../src/templates/dto/index.js';

describe('Renderers & Utilities', () => {
  describe('htmlToPlainText', () => {
    it('strips basic HTML tags and converts breaks to newlines', () => {
      const html = 'Hello <b>world</b>!<br/>This is a <p>new paragraph</p>';
      const text = htmlToPlainText(html);
      expect(text).toContain('Hello world!');
      expect(text).toContain('This is a');
      expect(text).toContain('new paragraph');
    });

    it('decodes HTML entities properly', () => {
      expect(decodeHtmlEntities('&copy; 2026 Acme &amp; Co &lt;test&gt; &#39;quotes&#39;')).toBe(
        '© 2026 Acme & Co <test> \'quotes\''
      );
    });
  });

  describe('buildHtml and DefaultEmailRenderer', () => {
    const sampleDto: EmailTemplateDto = {
      subject: 'Welcome to Acme',
      header: 'Welcome!',
      body: 'Thank you for joining Acme.',
      otpCode: '123456',
      actionText: 'Get Started',
      actionUrl: 'https://acme.test/start',
      imageUrl: 'https://acme.test/hero.png',
      extraMessage: 'Need help? Contact support.',
      footer: '© 2026 Acme. All rights reserved.',
    };

    it('builds valid HTML containing all elements', () => {
      const html = buildHtml(sampleDto, { primaryColor: '#2563eb' });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<title>Welcome to Acme</title>');
      expect(html).toContain('>Welcome!</h2>');
      expect(html).toContain('Thank you for joining Acme.');
      expect(html).toContain('123456');
      expect(html).toContain('https://acme.test/start');
      expect(html).toContain('Get Started');
      expect(html).toContain('#2563eb');
      expect(html).toContain('https://acme.test/hero.png');
      expect(html).toContain('Need help? Contact support.');
      expect(html).toContain('© 2026 Acme. All rights reserved.');
    });

    it('DefaultEmailRenderer returns both html and text', () => {
      const renderer = new DefaultEmailRenderer();
      const rendered = renderer.render(sampleDto);

      expect(rendered.html).toContain('>Welcome!</h2>');
      expect(rendered.text).toContain('Verification Code: 123456');
      expect(rendered.text).toContain('Get Started: https://acme.test/start');
    });

    it('buildPlainText honors noHtmlMessage override if present', () => {
      const dtoWithExplicitText: EmailTemplateDto = {
        subject: 'Override',
        body: '<p>HTML body</p>',
        noHtmlMessage: 'Custom fallback text',
      };

      expect(buildPlainText(dtoWithExplicitText)).toBe('Custom fallback text');
    });

    it('remains type-compatible with deprecated BaseEmailDto alias', () => {
      const legacyDto: BaseEmailDto = {
        subject: 'Legacy',
        body: 'Testing legacy alias compatibility',
      };
      const text = buildPlainText(legacyDto);
      expect(text).toContain('Testing legacy alias compatibility');
    });
  });
});
