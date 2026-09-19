import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryEmailSender } from '../../src/transports/memory/memory-sender.js';

describe('MemoryEmailSender', () => {
  let sender: MemoryEmailSender;

  beforeEach(() => {
    sender = new MemoryEmailSender();
  });

  it('initializes with empty state', () => {
    expect(sender.name).toBe('memory');
    expect(sender.count()).toBe(0);
    expect(sender.getSentMails()).toEqual([]);
    expect(sender.getLastMail()).toBeUndefined();
  });

  it('records sent emails in order', async () => {
    const res1 = await sender.send({
      to: 'alice@example.com',
      subject: 'First Mail',
      html: '<p>First</p>',
      text: 'First',
    });

    expect(res1.success).toBe(true);
    expect(res1.messageId).toContain('mem-1-');
    expect(sender.count()).toBe(1);

    const res2 = await sender.send({
      to: 'bob@example.com',
      subject: 'Second Mail',
      html: '<p>Second</p>',
      text: 'Second',
    });

    expect(res2.success).toBe(true);
    expect(res2.messageId).toContain('mem-2-');
    expect(sender.count()).toBe(2);

    const last = sender.getLastMail();
    expect(last?.subject).toBe('Second Mail');
    expect(last?.to).toBe('bob@example.com');
  });

  it('clears recorded emails', async () => {
    await sender.send({
      to: 'test@example.com',
      subject: 'Test',
      html: 'Test',
    });
    expect(sender.count()).toBe(1);

    sender.clear();
    expect(sender.count()).toBe(0);
    expect(sender.getSentMails()).toEqual([]);
    expect(sender.getLastMail()).toBeUndefined();
  });
});
