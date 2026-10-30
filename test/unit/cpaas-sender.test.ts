import { describe, it, expect, vi } from "vite-plus/test";
import { CpaasHttpSender } from "../../src/transports/cpaas/cpaas-sender.js";
import { ConfigurationError, TransportError } from "../../src/core/errors.js";

function mockResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("CpaasHttpSender", () => {
  it("validates required configuration", () => {
    expect(() => new CpaasHttpSender({} as any)).toThrow(ConfigurationError);
    expect(
      () =>
        new CpaasHttpSender({
          apiToken: "",
          from: "noreply@domain.com",
        }),
    ).toThrow(ConfigurationError);
    expect(
      () =>
        new CpaasHttpSender({
          apiToken: "token123",
          from: "",
        }),
    ).toThrow(ConfigurationError);
  });

  it("normalizes authorization header and default host", async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = null;

    const mockFetch = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      capturedUrl = url;
      capturedHeaders = init.headers as Record<string, string>;
      capturedBody = JSON.parse(init.body as string);
      return mockResponse({ data: [{ message_id: "msg-123" }] });
    });

    const sender = new CpaasHttpSender({
      apiToken: "test_token",
      from: { address: "verified@domain.com", name: "My Brand" },
      fetch: mockFetch,
    });

    const res = await sender.send({
      to: "recipient@example.com",
      subject: "Hello World",
      html: "<h1>Hi</h1>",
      text: "Hi",
    });

    expect(res.success).toBe(true);
    expect(res.messageId).toBe("msg-123");
    expect(res.rawResponse).toEqual({ data: [{ message_id: "msg-123" }] });
    expect(capturedUrl).toBe("https://cpaas.zoho.com/v1.1/email");
    expect(capturedHeaders["Authorization"]).toBe("Zoho-enczapikey test_token");
    expect(capturedHeaders["Content-Type"]).toBe("application/json");
    expect(capturedBody.from).toEqual({
      address: "verified@domain.com",
      name: "My Brand",
    });
    expect(capturedBody.to).toEqual([
      { email_address: { address: "recipient@example.com", name: "" } },
    ]);
    expect(capturedBody.subject).toBe("Hello World");
    expect(capturedBody.htmlbody).toBe("<h1>Hi</h1>");
    expect(capturedBody.textbody).toBe("Hi");
  });

  it("handles custom host, token with prefix, and multiple recipients", async () => {
    let capturedBody: any = null;

    const mockFetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      capturedBody = JSON.parse(init.body as string);
      return mockResponse({ data: [{ message_id: "eu-msg-999" }] });
    });

    const sender = new CpaasHttpSender({
      apiHost: "cpaas.zoho.eu",
      apiToken: "Zoho-enczapikey eu_custom_token",
      from: "system@eu.domain.com",
      fetch: mockFetch,
    });

    await sender.send({
      to: [{ address: "to1@example.com", name: "To One" }, "to2@example.com"],
      cc: "cc1@example.com",
      bcc: [{ email: "bcc1@example.com", name: "Bcc One" }],
      replyTo: "support@domain.com",
      subject: "Multi-recipient",
      html: "<p>Content</p>",
      attachments: [
        {
          filename: "invoice.pdf",
          content: "JVBERi0xLjQK...",
          mimeType: "application/pdf",
        },
      ],
    });

    expect(capturedBody.to).toEqual([
      { email_address: { address: "to1@example.com", name: "To One" } },
      { email_address: { address: "to2@example.com", name: "" } },
    ]);
    expect(capturedBody.cc).toEqual([{ email_address: { address: "cc1@example.com", name: "" } }]);
    expect(capturedBody.bcc).toEqual([
      { email_address: { address: "bcc1@example.com", name: "Bcc One" } },
    ]);
    expect(capturedBody.reply_to).toEqual([{ address: "support@domain.com", name: undefined }]);
    expect(capturedBody.attachments).toEqual([
      {
        name: "invoice.pdf",
        content: "JVBERi0xLjQK...",
        mime_type: "application/pdf",
        cid: undefined,
      },
    ]);
  });

  it("sends bulk email via the batch endpoint", async () => {
    let capturedUrl = "";
    let capturedBody: any = null;

    const mockFetch = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init.body as string);
      return mockResponse({
        data: [{ code: "EM_104", message: "OK" }],
        message: "OK",
        request_id: "req-1",
      });
    });

    const sender = new CpaasHttpSender({
      apiToken: "token",
      from: "from@domain.com",
      fetch: mockFetch,
    });

    const res = await sender.sendBulk({
      to: ["a@example.com", { address: "b@example.com", name: "B" }],
      subject: "Bulk",
      html: "<p>Bulk</p>",
      text: "Bulk",
      trackClicks: true,
      trackOpens: true,
      clientReference: "batch-1",
    });

    expect(res.success).toBe(true);
    expect(res.rawResponse).toEqual({
      data: [{ code: "EM_104", message: "OK" }],
      message: "OK",
      request_id: "req-1",
    });
    expect(capturedUrl).toBe("https://cpaas.zoho.com/v1.1/email/batch");
    expect(capturedBody.to).toEqual([
      { email_address: { address: "a@example.com", name: "" } },
      { email_address: { address: "b@example.com", name: "B" } },
    ]);
    expect(capturedBody.track_clicks).toBe(true);
    expect(capturedBody.track_opens).toBe(true);
    expect(capturedBody.client_reference).toBe("batch-1");
  });

  it("sends a single known template", async () => {
    let capturedUrl = "";
    let capturedBody: any = null;

    const mockFetch = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init.body as string);
      return mockResponse({ data: [{ code: "EM_104", message: "OK" }], message: "OK" });
    });

    const sender = new CpaasHttpSender({
      apiToken: "token",
      from: "from@domain.com",
      fetch: mockFetch,
    });

    await sender.sendKnownTemplate({
      templateId: "1234567890",
      to: "user@example.com",
      mergeInfo: { user_name: "Rudra" },
    });

    expect(capturedUrl).toBe("https://cpaas.zoho.com/v1.1/email/template");
    expect(capturedBody.template_key).toBe("1234567890");
    expect(capturedBody.template_alias).toBeUndefined();
    expect(capturedBody.merge_info).toEqual({ user_name: "Rudra" });
    expect(capturedBody.to).toEqual([{ email_address: { address: "user@example.com", name: "" } }]);
  });

  it("uses template_alias when preferTemplateAlias is enabled", async () => {
    let capturedBody: any = null;

    const mockFetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      capturedBody = JSON.parse(init.body as string);
      return mockResponse({ data: [{ code: "EM_104", message: "OK" }] });
    });

    const sender = new CpaasHttpSender({
      apiToken: "token",
      from: "from@domain.com",
      preferTemplateAlias: true,
      fetch: mockFetch,
    });

    await sender.sendKnownTemplate({
      templateId: "account-confirmation",
      to: "user@example.com",
    });

    expect(capturedBody.template_alias).toBe("account-confirmation");
    expect(capturedBody.template_key).toBeUndefined();
  });

  it("sends a bulk known template with per-recipient merge info", async () => {
    let capturedUrl = "";
    let capturedBody: any = null;

    const mockFetch = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init.body as string);
      return mockResponse({ data: [{ code: "EM_104", message: "OK" }] });
    });

    const sender = new CpaasHttpSender({
      apiToken: "token",
      from: "from@domain.com",
      fetch: mockFetch,
    });

    await sender.sendBulkKnownTemplate({
      templateId: "welcome",
      to: [
        { address: "a@example.com", name: "A", mergeInfo: { user_name: "A" } },
        { address: "b@example.com", mergeInfo: { user_name: "B" } },
      ],
    });

    expect(capturedUrl).toBe("https://cpaas.zoho.com/v1.1/email/template/batch");
    expect(capturedBody.template_key).toBe("welcome");
    expect(capturedBody.to).toEqual([
      { email_address: { address: "a@example.com", name: "A" }, merge_info: { user_name: "A" } },
      { email_address: { address: "b@example.com", name: "" }, merge_info: { user_name: "B" } },
    ]);
  });

  it("throws TransportError on HTTP error status with raw response", async () => {
    const errorBody = {
      data: { error_code: "TM_3004", message: "Invalid request" },
      message: "error",
    };
    const mockFetch = vi.fn().mockResolvedValue(mockResponse(errorBody, false, 400));

    const sender = new CpaasHttpSender({
      apiToken: "bad_token",
      from: "system@domain.com",
      fetch: mockFetch,
    });

    try {
      await sender.send({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      });
      expect.fail("Expected TransportError to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TransportError);
      const transportErr = err as TransportError;
      expect(transportErr.statusCode).toBe(400);
      expect(transportErr.rawResponse).toEqual(errorBody);
    }
  });

  it("rejects more than 500 recipients across to, cc, and bcc before making a request", async () => {
    const mockFetch = vi.fn();
    const sender = new CpaasHttpSender({
      apiToken: "token",
      from: "from@domain.com",
      fetch: mockFetch,
    });

    const makeRecipients = (count: number, prefix: string) =>
      Array.from({ length: count }, (_, i) => `${prefix}${i}@example.com`);

    try {
      await sender.send({
        to: makeRecipients(400, "to"),
        cc: makeRecipients(60, "cc"),
        bcc: makeRecipients(41, "bcc"),
        subject: "Too many",
        html: "<p>Too many</p>",
      });
      expect.fail("Expected TransportError to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TransportError);
      expect((err as TransportError).message).toContain("500");
    }

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("allows exactly 500 recipients", async () => {
    const mockFetch = vi.fn().mockResolvedValue(mockResponse({ data: [{ message_id: "ok-500" }] }));
    const sender = new CpaasHttpSender({
      apiToken: "token",
      from: "from@domain.com",
      fetch: mockFetch,
    });

    const recipients = Array.from({ length: 500 }, (_, i) => `user${i}@example.com`);

    const res = await sender.send({
      to: recipients,
      subject: "Exactly 500",
      html: "<p>Exactly 500</p>",
    });

    expect(res.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("enforces the recipient limit on bulk and template sends", async () => {
    const mockFetch = vi.fn();
    const sender = new CpaasHttpSender({
      apiToken: "token",
      from: "from@domain.com",
      fetch: mockFetch,
    });

    const tooMany = Array.from({ length: 501 }, (_, i) => `user${i}@example.com`);

    await expect(sender.sendBulk({ to: tooMany, subject: "S", html: "<p>S</p>" })).rejects.toThrow(
      TransportError,
    );

    await expect(
      sender.sendKnownTemplate({
        templateId: "t",
        to: "user@example.com",
        cc: tooMany,
      }),
    ).rejects.toThrow(TransportError);

    await expect(
      sender.sendBulkKnownTemplate({
        templateId: "t",
        to: tooMany.map((address) => ({ address })),
      }),
    ).rejects.toThrow(TransportError);

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
