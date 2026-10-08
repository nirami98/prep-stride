export type DocumentUpload = { filename: string; mimeType: string; base64: string };

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
]);

export function validateDocument(file?: DocumentUpload) {
  if (!file) return;
  if (!allowedMimeTypes.has(file.mimeType)) throw new Error(`Unsupported document type: ${file.mimeType}`);
  const estimatedBytes = Math.floor((file.base64.length * 3) / 4);
  if (estimatedBytes > 10 * 1024 * 1024) throw new Error("Documents must be 10 MB or smaller");
}
