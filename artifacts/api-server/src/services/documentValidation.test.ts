import test from "node:test";
import assert from "node:assert/strict";
import { validateDocument } from "./documentValidation.ts";

test("accepts supported documents under 10 MB", () => {
  assert.doesNotThrow(() => validateDocument({ filename: "resume.pdf", mimeType: "application/pdf", base64: "dGVzdA==" }));
});

test("rejects unsupported document types", () => {
  assert.throws(() => validateDocument({ filename: "resume.exe", mimeType: "application/octet-stream", base64: "dGVzdA==" }), /Unsupported document type/);
});

test("rejects documents larger than 10 MB", () => {
  assert.throws(() => validateDocument({ filename: "resume.txt", mimeType: "text/plain", base64: "a".repeat(14_000_002) }), /10 MB/);
});
