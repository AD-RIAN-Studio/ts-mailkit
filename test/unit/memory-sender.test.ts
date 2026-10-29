import { describe, it, expect, beforeEach } from "vite-plus/test";
import { MemoryEmailSender } from "../../src/transports/memory/memory-sender.js";

describe("MemoryEmailSender", () => {
  let sender: MemoryEmailSender;

  beforeEach(() => {
    sender = new MemoryEmailSender();
  });

  it("initializes with empty state", () => {
    expect(sender.name).toBe("memory");
    expect(sender.count()).toBe(0);
    expect(sender.getSentMails()).toEqual([]);
    expect(sender.getLastMail()).toBeUndefined();
  });

  it("records sent emails in order", async () => {
    const res1 = await sender.send({
      to: "alice@example.com",
      subject: "First Mail",
      html: "<p>First</p>",
      text: "First",
    });

    expect(res1.success).toBe(true);
    expect(res1.messageId).toContain("mem-1-");
    expect(sender.count()).toBe(1);

    const res2 = await sender.send({
      to: "bob@example.com",
      subject: "Second Mail",
      html: "<p>Second</p>",
      text: "Second",
    });

    expect(res2.success).toBe(true);
    expect(res2.messageId).toContain("mem-2-");
    expect(sender.count()).toBe(2);

    const last = sender.getLastMail();
    expect(last?.subject).toBe("Second Mail");
    expect(last?.to).toBe("bob@example.com");
  });

  it("clears recorded emails", async () => {
    await sender.send({
      to: "test@example.com",
      subject: "Test",
      html: "Test",
    });
    expect(sender.count()).toBe(1);

    sender.clear();
    expect(sender.count()).toBe(0);
    expect(sender.getSentMails()).toEqual([]);
    expect(sender.getLastMail()).toBeUndefined();
  });

  it("returns rawResponse on send", async () => {
    const res = await sender.send({
      to: "a@example.com",
      subject: "S",
      html: "<p>S</p>",
    });
    expect(res.rawResponse).toEqual({ id: res.messageId });
    expect(res.response).toEqual(res.rawResponse);
  });

  it("records bulk and template sends", async () => {
    await sender.sendBulk({ to: ["a@example.com"], subject: "S", html: "<p>S</p>" });
    await sender.sendKnownTemplate({ templateId: "t", to: "a@example.com" });
    await sender.sendBulkKnownTemplate({
      templateId: "t",
      to: [{ address: "a@example.com" }],
    });

    expect(sender.getSentBulkMails()).toHaveLength(1);
    expect(sender.getSentTemplateMails()).toHaveLength(1);
    expect(sender.getSentBulkTemplateMails()).toHaveLength(1);

    sender.clear();
    expect(sender.getSentBulkMails()).toHaveLength(0);
    expect(sender.getSentTemplateMails()).toHaveLength(0);
    expect(sender.getSentBulkTemplateMails()).toHaveLength(0);
  });
});
