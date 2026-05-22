import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CAUSE_UPLOAD_DIR = path.join(__dirname, 'data', 'uploads');

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const MAX_BYTES = 5 * 1024 * 1024;

export function ensureUploadDir(): void {
  if (!fs.existsSync(CAUSE_UPLOAD_DIR)) {
    fs.mkdirSync(CAUSE_UPLOAD_DIR, { recursive: true });
  }
}

export function publicUploadPath(filename: string): string {
  return `/api/uploads/${filename}`;
}

export function saveCauseImageBuffer(buffer: Buffer, originalName: string): { ok: true; url: string } | { ok: false; error: string } {
  if (buffer.length > MAX_BYTES) {
    return { ok: false, error: 'Image must be 5 MB or smaller' };
  }
  const ext = path.extname(originalName).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return { ok: false, error: 'Image must be JPG, PNG, WebP, or GIF' };
  }
  ensureUploadDir();
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(CAUSE_UPLOAD_DIR, filename), buffer);
  return { ok: true, url: publicUploadPath(filename) };
}

/** Accept data URLs from the create-cause form when no separate upload step is used. */
export function saveCauseImageDataUrl(dataUrl: string): { ok: true; url: string } | { ok: false; error: string } {
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/i.exec(dataUrl.trim());
  if (!m) return { ok: false, error: 'Invalid image data URL' };
  const mime = m[1].toLowerCase();
  const ext =
    mime === 'image/jpeg' ? '.jpg' : mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : '.gif';
  let buffer: Buffer;
  try {
    buffer = Buffer.from(m[2], 'base64');
  } catch {
    return { ok: false, error: 'Invalid image encoding' };
  }
  return saveCauseImageBuffer(buffer, `upload${ext}`);
}
