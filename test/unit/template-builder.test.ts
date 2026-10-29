import { describe, it, expect } from "vite-plus/test";
import { buildHTMLTemplate, buildPlainTextTemplate } from "../../src/templates/template-builder.js";
import { EmailTemplateFactory } from "../../src/templates/factory.js";

describe("template-builder", () => {
  const dto = EmailTemplateFactory.createSimpleMessage({
    subject: "Welcome",
    header: "Hello",
    body: "This is a message.",
  });

  it("builds an upload-ready HTML template", () => {
    const html = buildHTMLTemplate(dto);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("This is a message.");
    expect(html).toContain("Hello");
  });

  it("builds an upload-ready plain-text template", () => {
    const text = buildPlainTextTemplate(dto);
    expect(text).toContain("This is a message.");
  });

  it("passes styling options through to the HTML builder", () => {
    const html = buildHTMLTemplate(dto, { maxWidth: "720px" });
    expect(html).toContain("max-width:720px");
  });

  it("uses the primary color for action buttons", () => {
    const actionDto = {
      ...dto,
      actionUrl: "https://example.com",
      actionText: "Go",
    };
    const html = buildHTMLTemplate(actionDto, { primaryColor: "#123456" });
    expect(html).toContain("#123456");
  });
});
