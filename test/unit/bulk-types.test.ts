import { describe, it, expect } from "vite-plus/test";
import type {
  BulkRecipient,
  BulkSendOptions,
  KnownTemplateSendOptions,
  BulkKnownTemplateSendOptions,
  SendBulkMailOptions,
} from "../../src/core/bulk-types.js";

describe("bulk types", () => {
  it("accepts a bulk recipient with merge info", () => {
    const recipient: BulkRecipient = {
      address: "a@example.com",
      name: "A",
      mergeInfo: { user_name: "A" },
    };
    expect(recipient.mergeInfo).toEqual({ user_name: "A" });
  });

  it("accepts bulk send options", () => {
    const options: BulkSendOptions = {
      to: ["a@example.com"],
      subject: "Hi",
      html: "<p>Hi</p>",
      trackClicks: true,
    };
    expect(options.trackClicks).toBe(true);
  });

  it("accepts single and bulk template send options", () => {
    const single: KnownTemplateSendOptions = {
      templateId: "t",
      to: "a@example.com",
      mergeInfo: { x: "1" },
    };
    const bulk: BulkKnownTemplateSendOptions = {
      templateId: "t",
      to: [{ address: "a@example.com", mergeInfo: { x: "1" } }],
    };
    expect(single.templateId).toBe("t");
    expect(bulk.to[0].mergeInfo).toEqual({ x: "1" });
  });

  it("accepts client bulk mail options", () => {
    const options: SendBulkMailOptions = {
      template: { subject: "Hi" },
      to: ["a@example.com"],
    };
    expect(options.template.subject).toBe("Hi");
  });
});
