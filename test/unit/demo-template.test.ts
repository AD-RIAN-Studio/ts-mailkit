import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EmailTemplateFactory } from '../../src/templates/factory.js';
import { DefaultEmailRenderer } from '../../src/renderers/default/default-renderer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Demo Newsletter HTML Output', () => {
  it('outputs a complete dummy/demo newsletter HTML template into the root folder', () => {
    const factory = new EmailTemplateFactory({
      brandName: 'AD-RIAN Studio',
      logoUrl: 'https://raw.githubusercontent.com/AD-RIAN-Studio/ts-mailkit/main/assets/logo.png',
      footer: (brand) =>
        `&copy; ${new Date().getFullYear()} ${brand}. All rights reserved.<br/>You received this email because you subscribed to updates. <a href="https://example.com/unsubscribe" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>`,
    });

    const bodyContent = [
      '<p>Hello developers and builders,</p>',
      '<p>We are thrilled to share our latest release and architectural updates for <strong>ts-mailkit</strong> &mdash; the zero-runtime-dependency TypeScript library for email composition and dispatch.</p>',
      '<h3 style="font-size:1.15rem;margin:20px 0 10px;color:#111827;">What is New in This Release:</h3>',
      '<ul style="padding-left:20px;margin:0 0 20px;">',
      '  <li><strong>Top-Center Brand Logo:</strong> First-class support for verified HTTP(S) brand logos positioned at the top-center of your email.</li>',
      '  <li><strong>Zero Runtime Dependencies:</strong> Core transports run on the standard Fetch API across Node.js, Cloudflare Workers, Bun, and Deno.</li>',
      '  <li><strong>Pluggable Transports:</strong> Drop-in adapters for Zoho ZeptoMail, In-Memory testing, and Dev Console logging.</li>',
      '  <li><strong>Strictly Typed DTOs:</strong> End-to-end type safety for transactional and marketing emails.</li>',
      '</ul>',
      '<p>Explore the repository, test the components, and build beautiful transactional emails effortlessly.</p>',
    ].join('');

    const newsletterDto = factory.createNewsLetter({
      subject: 'September 2026 Engineering & Product Update',
      header: 'Introducing ts-mailkit: Modular Emails for Modern Runtimes',
      body: bodyContent,
      imageUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&auto=format&fit=crop&q=80',
      actionUrl: 'https://github.com/AD-RIAN-Studio/ts-mailkit',
      actionText: 'Explore ts-mailkit on GitHub',
    });

    const renderer = new DefaultEmailRenderer({
      primaryColor: '#4f46e5',
    });

    const rendered = renderer.render(newsletterDto);

    // Save to the repository root folder for easy access on GitHub
    const rootPath = path.resolve(__dirname, '../../demo-newsletter.html');
    fs.writeFileSync(rootPath, rendered.html, 'utf-8');

    // Assertions
    expect(fs.existsSync(rootPath)).toBe(true);
    const fileStats = fs.statSync(rootPath);
    expect(fileStats.size).toBeGreaterThan(500);

    const fileContent = fs.readFileSync(rootPath, 'utf-8');
    expect(fileContent).toBe(rendered.html);

    // Verify key template components are present in the HTML output
    expect(fileContent).toContain('<!DOCTYPE html>');
    expect(fileContent).toContain('<title>September 2026 Engineering & Product Update</title>');
    expect(fileContent).toContain('https://raw.githubusercontent.com/AD-RIAN-Studio/ts-mailkit/main/assets/logo.png');
    expect(fileContent).toContain('https://images.unsplash.com/photo-1579546929518-9e396f3cc809');
    expect(fileContent).toContain('Introducing ts-mailkit: Modular Emails for Modern Runtimes');
    expect(fileContent).toContain('Top-Center Brand Logo');
    expect(fileContent).toContain('Explore ts-mailkit on GitHub');
    expect(fileContent).toContain('https://github.com/AD-RIAN-Studio/ts-mailkit');
    expect(fileContent).toContain('Unsubscribe');

    // Verify plain-text fallback was also generated
    expect(rendered.text).toContain('Explore ts-mailkit on GitHub: https://github.com/AD-RIAN-Studio/ts-mailkit');
  });
});
