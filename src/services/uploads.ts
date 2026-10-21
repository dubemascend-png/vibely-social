import { supabase } from '../supabase';
import { throwIfError } from './request';

export type UploadProgress = (percent: number) => void;
export async function uploadUserMedia(input: { userId: string; file: File; bucket: string; folder?: string; onProgress?: UploadProgress }) {
  if (!input.file.size) throw new Error('That file is empty. Choose another file.');
  if (input.file.size > 200 * 1024 * 1024) throw new Error('Files must be 200 MB or smaller.');
  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
  const path = [input.userId, input.folder?.replace(/^\/+|\/+$/g, ''), crypto.randomUUID() + '-' + safeName].filter(Boolean).join('/');
  // Supabase JS does not expose byte-by-byte progress for standard upload; report stages honestly.
  input.onProgress?.(5);
  const { data, error } = await supabase.storage.from(input.bucket).upload(path, input.file, { upsert: false, contentType: input.file.type || undefined });
  throwIfError(error);
  input.onProgress?.(100);
  return { ...data, bucket: input.bucket };
}
export async function createSignedMediaUrl(bucket: string, path: string, expiresInSeconds = 3600) {
  const ttl = Math.min(86400, Math.max(60, expiresInSeconds));
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ttl);
  throwIfError(error);
  return data.signedUrl;
}
