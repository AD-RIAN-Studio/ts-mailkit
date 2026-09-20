import { describe, it, expect, vi } from 'vitest';
import { ZeptoMailHttpSender } from '../../src/transports/zeptomail/zeptomail-sender.js';
import { ConfigurationError, TransportError } from '../../src/core/errors.js';

describe('ZeptoMailHttpSender', () => {
  it('validates required configuration', () => {
    expect(() => new ZeptoMailHttpSender({} as any)).toThrow(ConfigurationError);
    expect(
      () =>
        new ZeptoMailHttpSender({
          apiToken: '',
          from: 'noreply@domain.com',
        })
    ).toThrow(ConfigurationError);
    expect(
      () =>
        new ZeptoMailHttpSender({
          apiToken: 'token123',
          from: '',
        })
    ).toThrow(ConfigurationError);
  });

  it('normalizes authorization header and default host', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = null;

    const mockFetch = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      capturedUrl = url;
      capturedHeaders = init.headers as Record<string, string>;
      capturedBody = JSON.parse(init.body as string);
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: [{ message_id: 'msg-123' }] }),
      } as Response;
    });

    const sender = new ZeptoMailHttpSender({
      apiToken: 'test_token',
      from: { address: 'verified@domain.com', name: 'My Brand' },
      fetch: mockFetch,
    });

    const res = await sender.send({
      to: 'recipient@example.com',
      subject: 'Hello World',
      html: '<h1>Hi</h1>',
      text: 'Hi',
    });

    expect(res.success).toBe(true);
    expect(res.messageId).toBe('msg-123');
    expect(capturedUrl).toBe('https://api.zeptomail.com/v1.1/email');
    expect(capturedHeaders['Authorization']).toBe('Zoho-enczapikey test_token');
    expect(capturedHeaders['Content-Type']).toBe('application/json');
    expect(capturedBody.from).toEqual({
      address: 'verified@domain.com',
      name: 'My Brand',
    });
    expect(capturedBody.to).toEqual([
      { email_address: { address: 'recipient@example.com', name: '' } },
    ]);
    expect(capturedBody.subject).toBe('Hello World');
    expect(capturedBody.htmlbody).toBe('<h1>Hi</h1>');
    expect(capturedBody.textbody).toBe('Hi');
  });

  it('handles custom host, token with prefix, and multiple recipients', async () => {
    let capturedBody: any = null;

    const mockFetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      capturedBody = JSON.parse(init.body as string);
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: [{ message_id: 'eu-msg-999' }] }),
      } as Response;
    });

    const sender = new ZeptoMailHttpSender({
      apiHost: 'api.zeptomail.eu',
      apiToken: 'Zoho-enczapikey eu_custom_token',
      from: 'system@eu.domain.com',
      fetch: mockFetch,
    });

    await sender.send({
      to: [
        { address: 'to1@example.com', name: 'To One' },
        'to2@example.com',
      ],
      cc: 'cc1@example.com',
      bcc: [{ email: 'bcc1@example.com', name: 'Bcc One' }],
      replyTo: 'support@domain.com',
      subject: 'Multi-recipient',
      html: '<p>Content</p>',
      attachments: [
        {
          filename: 'invoice.pdf',
          content: 'JVBERi0xLjQK...',
          mimeType: 'application/pdf',
        },
      ],
    });

    expect(capturedBody.to).toEqual([
      { email_address: { address: 'to1@example.com', name: 'To One' } },
      { email_address: { address: 'to2@example.com', name: '' } },
    ]);
    expect(capturedBody.cc).toEqual([
      { email_address: { address: 'cc1@example.com', name: '' } },
    ]);
    expect(capturedBody.bcc).toEqual([
      { email_address: { address: 'bcc1@example.com', name: 'Bcc One' } },
    ]);
    expect(capturedBody.reply_to).toEqual([
      { address: 'support@domain.com', name: undefined },
    ]);
    expect(capturedBody.attachments).toEqual([
      {
        name: 'invoice.pdf',
        content: 'JVBERi0xLjQK...',
        mime_type: 'application/pdf',
        cid: undefined,
      },
    ]);
  });

  it('throws TransportError on HTTP error status', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () =>
        JSON.stringify({
          error: { code: 'INVALID_TOKEN', message: 'Authentication token is invalid' },
        }),
    } as Response);

    const sender = new ZeptoMailHttpSender({
      apiToken: 'bad_token',
      from: 'system@domain.com',
      fetch: mockFetch,
    });

    await expect(
      sender.send({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      })
    ).rejects.toThrow(TransportError);
  });
});
