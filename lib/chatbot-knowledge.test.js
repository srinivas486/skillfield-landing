import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { matchIntent } from "./chatbot-knowledge.js";

describe("matchIntent", () => {
  it("returns non-empty text for greeting keywords", () => {
    const result = matchIntent("hi there");
    assert.ok(typeof result.response === "string" && result.response.length > 0);
  });

  it("returns non-empty text for 'hello'", () => {
    const result = matchIntent("hello");
    assert.ok(result.response.length > 0);
  });

  it("returns response mentioning security for 'security'", () => {
    const result = matchIntent("Tell me about your security services");
    assert.ok(
      result.response.toLowerCase().includes("security") ||
      result.response.toLowerCase().includes("cyber"),
      `Expected security-related response, got: ${result.response}`
    );
  });

  it("returns response for 'cyber security'", () => {
    const result = matchIntent("cyber security");
    assert.ok(result.response.length > 0);
  });

  it("returns a mailto link for contact intent", () => {
    const result = matchIntent("how do I contact you?");
    assert.ok(result.action, "Expected an action object");
    assert.ok(
      result.action.href.startsWith("mailto:") || result.action.href.startsWith("/#contact"),
      `Expected mailto: or /#contact href, got: ${result.action.href}`
    );
  });

  it("returns email-related action for 'email' keyword", () => {
    const result = matchIntent("email");
    assert.ok(result.action, "Expected an action");
  });

  it("returns non-empty text for 'services'", () => {
    const result = matchIntent("What services do you offer?");
    assert.ok(result.response.length > 0);
  });

  it("returns non-empty text for AI intent", () => {
    const result = matchIntent("Tell me about AI");
    assert.ok(result.response.length > 0);
  });

  it("returns non-empty text for pricing", () => {
    const result = matchIntent("how much does it cost?");
    assert.ok(result.response.length > 0);
  });

  it("returns fallback for unknown input", () => {
    const result = matchIntent("xyzzy frobnicator 12345");
    assert.ok(result.response.length > 0, "Fallback should return non-empty text");
    assert.ok(
      result.response.toLowerCase().includes("skillfield") ||
      result.response.toLowerCase().includes("info@") ||
      result.response.toLowerCase().includes("not sure"),
      `Expected fallback message, got: ${result.response}`
    );
  });

  it("returns fallback for empty string", () => {
    const result = matchIntent("");
    assert.ok(result.response.length > 0);
  });

  it("returns fallback for null", () => {
    const result = matchIntent(null);
    assert.ok(result.response.length > 0);
  });
});
