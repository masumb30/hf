import { randomUUID } from 'crypto';
import { mkdir, writeFile, readFile } from 'fs/promises';
import path from 'path';

const STORAGE_ROOT = path.join(process.cwd(), 'storage', 'attachments');

export async function uploadObject(file: File | Blob, originalName: string) {
  const ext = path.extname(originalName);
  const storageKey = `${randomUUID()}${ext}`;
  await mkdir(STORAGE_ROOT, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(STORAGE_ROOT, storageKey), buffer);
  return { storageKey, fileSize: buffer.length };
}

export async function readObject(storageKey: string) {
  return readFile(path.join(STORAGE_ROOT, storageKey));
}

export function isPreviewable(mimeType: string) {
  return mimeType.startsWith('image/') || mimeType === 'application/pdf';
}
