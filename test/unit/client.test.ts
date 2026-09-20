import { describe, it, expect, vi } from 'vitest';
import { MailKit, createMailKit, EmailService } from '../../src/core/client.js';
import { MemoryEmailSender } from '../../src/transports/memory/memory-sender.js';
import { EmailTemplateFactory } from '../../src/templates/factory.js';
import { ConfigurationError } from '../../src/core/errors.js';

describe('MailKit / EmailService Client', () => {
  it('requires a transport adapter', () => {
    expect(() => new MailKit({} as any)).toThrow(ConfigurationError);
  });

  it('sends email using typed template DTO (options style)', async () => {
    const memoryTransport = new MemoryEmailSender();
    const mailer = createMailKit({
      transport: memoryTransport,
      defaultFrom: { address: 'no-reply@myapp.test', name: 'My App' },
    });

    const dto = EmailTemplateFactory.createEmailVerification(
      'Jordan',
      'https://myapp.test/verify?token=abc',
      '123789',
      'My App'
    );

    const result = await mailer.send({
      to: 'jordan@example.com',
      template: dto,
    });

    expect(result.success).toBe(true);
    expect(memoryTransport.count()).toBe(1);

    const sent = memoryTransport.getLastMail();
    expect(sent).toBeDefined();
    expect(sent?.subject).toBe('Verify Your Email Address');
    expect(sent?.html).toContain('123789');
    expect(sent?.text).toContain('Your verification code is: 123789');
    expect(sent?.to).toEqual({ address: 'jordan@example.com', name: 'Jordan' });
  });

  it('supports legacy positional arguments signature', async () => {
    const memoryTransport = new MemoryEmailSender();
    const emailService = new EmailService({
      transport: memoryTransport,
      defaultFrom: 'service@company.test',
    });

    const dto = EmailTemplateFactory.createPasswordReset(
      'Taylor',
      'https://company.test/reset',
      '554433'
    );

    await emailService.send('taylor@example.com', dto, 'Taylor Swift');

    expect(memoryTransport.count()).toBe(1);
    const sent = memoryTransport.getLastMail();
    expect(sent?.subject).toBe('Password Reset Request');
    expect(sent?.to).toEqual({ address: 'taylor@example.com', name: 'Taylor Swift' });
  });

  it('supports dynamic brandNameResolver', async () => {
    const memoryTransport = new MemoryEmailSender();
    const resolver = vi.fn().mockResolvedValue('Tenant School #42');

    const mailer = new MailKit({
      transport: memoryTransport,
      defaultFrom: 'noreply@multitenant.test',
      brandNameResolver: resolver,
    });

    // Template without explicit fromName
    const dto = {
      subject: 'Dynamic Tenant Subject',
      header: 'Notice',
      body: 'Hello',
    };

    await mailer.send({
      to: 'student@example.com',
      template: dto,
    });

    expect(resolver).toHaveBeenCalled();
    const sent = memoryTransport.getLastMail();
    expect(sent?.from).toEqual({
      address: 'noreply@multitenant.test',
      name: 'Tenant School #42',
    });
  });

  it('supports sendRaw with explicit text and auto-derived plaintext fallback', async () => {
    const memoryTransport = new MemoryEmailSender();
    const mailer = new MailKit({ transport: memoryTransport });

    // 1. sendRaw with explicit text
    await mailer.sendRaw({
      to: 'raw@example.com',
      subject: 'Raw Email',
      html: '<b>Raw HTML</b>',
      text: 'Explicit Text',
    });

    expect(memoryTransport.count()).toBe(1);
    expect(memoryTransport.getLastMail()?.subject).toBe('Raw Email');
    expect(memoryTransport.getLastMail()?.text).toBe('Explicit Text');

    // 2. sendRaw with html only (auto-derives text fallback)
    await mailer.sendRaw({
      to: 'auto@example.com',
      subject: 'Auto Text',
      html: '<h1>Title</h1><p>Paragraph text.</p>',
    });

    expect(memoryTransport.count()).toBe(2);
    const last = memoryTransport.getLastMail();
    expect(last?.subject).toBe('Auto Text');
    expect(last?.html).toBe('<h1>Title</h1><p>Paragraph text.</p>');
    expect(last?.text).toBe('Title\n\nParagraph text.');

    // 3. sendSimpleMessage
    await mailer.sendSimpleMessage('simple@example.com', 'Simple Alert', 'This is a simple text alert.');
    expect(memoryTransport.count()).toBe(3);
    const simple = memoryTransport.getLastMail();
    expect(simple?.subject).toBe('Simple Alert');
    expect(simple?.html).toContain('<pre style="font-family:monospace;white-space:pre-wrap;">This is a simple text alert.</pre>');
    expect(simple?.text).toBe('This is a simple text alert.');
  });

  it('renders without sending', async () => {
    const memoryTransport = new MemoryEmailSender();
    const mailer = new MailKit({ transport: memoryTransport });

    const dto = EmailTemplateFactory.createSimpleMessage('Header', 'Subject', 'Message Body');
    const rendered = await mailer.render(dto);

    expect(rendered.html).toContain('Message Body');
    expect(rendered.text).toContain('Message Body');
    expect(memoryTransport.count()).toBe(0);
  });
});
