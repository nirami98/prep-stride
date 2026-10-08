import type { DocumentUpload } from "@workspace/api-client-react";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
]);

export async function toDocumentUpload(file?: File | null): Promise<DocumentUpload | undefined> {
  if (!file) return undefined;
  if (file.size > MAX_BYTES) throw new Error(`${file.name} is larger than 10 MB.`);
  if (!ALLOWED.has(file.type)) throw new Error(`${file.name} must be PDF, DOC, DOCX, TXT, or Markdown.`);
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
  return { filename: file.name, mimeType: file.type, base64: dataUrl.split(",")[1] ?? "" };
}
