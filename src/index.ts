// ─── Core Types, Envelopes & Errors ──────────────────────────────────────────
export * from "./core/types.js";
export * from "./core/errors.js";
export * from "./core/client.js";

// ─── Transport Interface & Implementations ────────────────────────────────────
export * from "./transports/sender.interface.js";
export * from "./transports/cpaas/cpaas-sender.js";
export * from "./transports/cpaas/types.js";
export * from "./transports/memory/memory-sender.js";
export * from "./transports/console/console-sender.js";

// ─── Template DTOs & Factory ──────────────────────────────────────────────────
export * from "./templates/dto/index.js";
export * from "./templates/factory.js";
export * from "./templates/template-builder.js";

// ─── Renderers & Utilities ────────────────────────────────────────────────────
export * from "./renderers/renderer.interface.js";
export * from "./renderers/default/default-renderer.js";
export * from "./renderers/utils/html-to-plaintext.js";
