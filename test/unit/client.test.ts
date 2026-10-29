import { describe, it, expect, vi } from "vite-plus/test";
import { MailKit, createMailKit } from "../../src/core/client.js";
import { MemoryEmailSender } from "../../src/transports/memory/memory-sender.js";
import { EmailTemplateFactory } from "../../src/templates/factory.js";
import { ConfigurationError } from "../../src/core/errors.js";

describe("MailKit Client", () => {
  it("requires a transport adapter", () => {
    expect(() => new MailKit({} as any)).toThrow(ConfigurationError);
  });

  it("sends email using typed template DTO (options style)", async () => {
    const memoryTransport = new MemoryEmailSender();
    const mailer = createMailKit({
      transport: memoryTransport,
      defaultFrom: { address: "no-reply@myapp.test", name: "My App" },
    });

    const dto = EmailTemplateFactory.createEmailVerification({
      username: "Jordan",
      verificationUrl: "https://myapp.test/verify?token=abc",
      otp: "123789",
      brandName: "My App",
    });

    const result = await mailer.send({
      to: "jordan@example.com",
      template: dto,
    });

    expect(result.success).toBe(true);
    expect(memoryTransport.count()).toBe(1);

    const sent = memoryTransport.getLastMail();
    expect(sent).toBeDefined();
    expect(sent?.subject).toBe("Verify Your Email Address");
    expect(sent?.html).toContain("123789");
    expect(sent?.text).toContain("Your verification code is: 123789");
    expect(sent?.to).toEqual({ address: "jordan@example.com", name: "Jordan" });
  });

  it("supports dynamic brandNameResolver", async () => {
    const memoryTransport = new MemoryEmailSender();
    const resolver = vi.fn().mockResolvedValue("Tenant School #42");

    const mailer = new MailKit({
      transport: memoryTransport,
      defaultFrom: "noreply@multitenant.test",
      brandNameResolver: resolver,
    });

    // Template without explicit fromName
    const dto = {
      subject: "Dynamic Tenant Subject",
      header: "Notice",
      body: "Hello",
    };

    await mailer.send({
      to: "student@example.com",
      template: dto,
    });

    expect(resolver).toHaveBeenCalled();
    const sent = memoryTransport.getLastMail();
    expect(sent?.from).toEqual({
      address: "noreply@multitenant.test",
      name: "Tenant School #42",
    });
  });

  it("supports sendRaw with explicit text and auto-derived plaintext fallback", async () => {
    const memoryTransport = new MemoryEmailSender();
    const mailer = new MailKit({ transport: memoryTransport });

    // 1. sendRaw with explicit text
    await mailer.sendRaw({
      to: "raw@example.com",
      subject: "Raw Email",
      html: "<b>Raw HTML</b>",
      text: "Explicit Text",
    });

    expect(memoryTransport.count()).toBe(1);
    expect(memoryTransport.getLastMail()?.subject).toBe("Raw Email");
    expect(memoryTransport.getLastMail()?.text).toBe("Explicit Text");

    // 2. sendRaw with html only (auto-derives text fallback)
    await mailer.sendRaw({
      to: "auto@example.com",
      subject: "Auto Text",
      html: "<h1>Title</h1><p>Paragraph text.</p>",
    });

    expect(memoryTransport.count()).toBe(2);
    const last = memoryTransport.getLastMail();
    expect(last?.subject).toBe("Auto Text");
    expect(last?.html).toBe("<h1>Title</h1><p>Paragraph text.</p>");
    expect(last?.text).toBe("Title\n\nParagraph text.");
  });

  it("renders without sending", async () => {
    const memoryTransport = new MemoryEmailSender();
    const mailer = new MailKit({ transport: memoryTransport });

    const dto = EmailTemplateFactory.createSimpleMessage({
      subject: "Header",
      header: "Subject",
      body: "Message Body",
    });
    const rendered = await mailer.render(dto);

    expect(rendered.html).toContain("Message Body");
    expect(rendered.text).toContain("Message Body");
    expect(memoryTransport.count()).toBe(0);
  });

  it("sendMail sends and send is a deprecated alias", async () => {
    const memoryTransport = new MemoryEmailSender();
    const mailer = createMailKit({
      transport: memoryTransport,
      defaultFrom: "no-reply@myapp.test",
    });
    const dto = EmailTemplateFactory.createSimpleMessage({
      subject: "Subject",
      header: "Header",
      body: "Body",
    });

    await mailer.sendMail({ to: "a@example.com", template: dto });
    expect(memoryTransport.count()).toBe(1);

    await mailer.send({ to: "b@example.com", template: dto });
    expect(memoryTransport.count()).toBe(2);
  });

  it("sendBulkMail delegates to transport.sendBulk", async () => {
    const memoryTransport = new MemoryEmailSender();
    const mailer = createMailKit({
      transport: memoryTransport,
      defaultFrom: "no-reply@myapp.test",
    });
    const dto = EmailTemplateFactory.createSimpleMessage({
      subject: "Bulk Subject",
      header: "Header",
      body: "Bulk Body",
    });

    const result = await mailer.sendBulkMail({
      to: ["a@example.com", "b@example.com"],
      template: dto,
      trackClicks: true,
    });

    expect(result.success).toBe(true);
    expect(memoryTransport.count()).toBe(0);

    const bulk = memoryTransport.getSentBulkMails();
    expect(bulk).toHaveLength(1);
    expect(bulk[0].to).toEqual(["a@example.com", "b@example.com"]);
    expect(bulk[0].subject).toBe("Bulk Subject");
    expect(bulk[0].trackClicks).toBe(true);
  });

  it("sendKnownTemplate delegates to transport.sendKnownTemplate", async () => {
    const memoryTransport = new MemoryEmailSender();
    const mailer = createMailKit({
      transport: memoryTransport,
      defaultFrom: "no-reply@myapp.test",
    });

    const result = await mailer.sendKnownTemplate({
      templateId: "welcome",
      to: "a@example.com",
      mergeInfo: { user_name: "A" },
    });

    expect(result.success).toBe(true);
    const templates = memoryTransport.getSentTemplateMails();
    expect(templates).toHaveLength(1);
    expect(templates[0].templateId).toBe("welcome");
    expect(templates[0].from).toBe("no-reply@myapp.test");
  });

  it("sendBulkKnownTemplate delegates to transport.sendBulkKnownTemplate", async () => {
    const memoryTransport = new MemoryEmailSender();
    const mailer = createMailKit({
      transport: memoryTransport,
      defaultFrom: "no-reply@myapp.test",
    });

    const result = await mailer.sendBulkKnownTemplate({
      templateId: "welcome",
      to: [{ address: "a@example.com", mergeInfo: { user_name: "A" } }],
    });

    expect(result.success).toBe(true);
    const bulkTemplates = memoryTransport.getSentBulkTemplateMails();
    expect(bulkTemplates).toHaveLength(1);
    expect(bulkTemplates[0].templateId).toBe("welcome");
  });

  it("throws ConfigurationError when the transport lacks bulk capabilities", async () => {
    const minimalTransport = {
      name: "minimal",
      async send() {
        return { success: true };
      },
    };
    const mailer = createMailKit({ transport: minimalTransport });
    const dto = EmailTemplateFactory.createSimpleMessage({
      subject: "Subject",
      header: "Header",
      body: "Body",
    });

    await expect(mailer.sendBulkMail({ to: "a@example.com", template: dto })).rejects.toThrow(
      ConfigurationError,
    );
    await expect(
      mailer.sendKnownTemplate({ templateId: "t", to: "a@example.com" }),
    ).rejects.toThrow(ConfigurationError);
    await expect(
      mailer.sendBulkKnownTemplate({
        templateId: "t",
        to: [{ address: "a@example.com" }],
      }),
    ).rejects.toThrow(ConfigurationError);
  });
});
