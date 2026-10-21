import { supabase } from '../supabase';
import { toServiceError } from './request';

export type UploadProgress = (percent: number) => void;
export async function uploadUserMedia(input: { userId: string; file: File; bucket: string; folder?: string; contentType?: string; onProgress?: UploadProgress }) {
  if (!input.file.size) throw new Error('That file is empty. Choose another file.');
  if (input.file.size > 200 * 1024 * 1024) throw new Error('Files must be 200 MB or smaller.');
  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
  const path = [input.userId, input.folder?.replace(/^\/+|\/+$/g, ''), crypto.randomUUID() + '-' + safeName].filter(Boolean).join('/');
  // Supabase JS does not expose byte-by-byte progress for standard upload; report stages honestly.
  input.onProgress?.(5);
  const { data, error } = await supabase.storage.from(input.bucket).upload(path, input.file, { upsert: false, contentType: input.contentType || (input.file.type !== 'application/octet-stream' ? input.file.type : undefined) });
  if (error) throw toServiceError(error);
  if (!data) throw new Error('Upload finished without a storage result. Please try again.');
  input.onProgress?.(100);
  return { ...data, bucket: input.bucket, publicUrl: supabase.storage.from(input.bucket).getPublicUrl(data.path).data.publicUrl };
}
export async function createSignedMediaUrl(bucket: string, path: string, expiresInSeconds = 3600) {
  const ttl = Math.min(86400, Math.max(60, expiresInSeconds));
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ttl);
  if (error) throw toServiceError(error);
  if (!data?.signedUrl) throw new Error('Could not create a secure media link.');
  return data.signedUrl;
}

export async function registerUploadedPostMedia(userId: string, postId: string, uploads: { path: string; file: File; contentType: string; title?: string; description?: string }[]) {
  if (!uploads.length) return [];
  const { data: assets, error: assetError } = await supabase.from('media_assets').insert(uploads.map(item => ({ owner_id: userId, bucket_id: 'vibely-posts', object_path: item.path, mime_type: item.contentType, size_bytes: item.file.size, original_filename: item.file.name, status: 'uploaded' }))).select('id,object_path,mime_type,size_bytes');
  if (assetError) throw toServiceError(assetError);
  if (!assets?.length) throw new Error('Uploaded media could not be registered. Please retry.');
  const { error: linkError } = await supabase.from('post_media').insert(assets.map((asset, index) => ({ post_id: postId, media_asset_id: asset.id, position: index })));
  if (linkError) throw toServiceError(linkError);
  const video = assets.find(asset => uploads.some(item => item.path === asset.object_path && item.contentType.startsWith('video/')));
  if (video) {
    const source = uploads.find(item => item.path === video.object_path);
    const { error: metadataError } = await supabase.from('video_metadata').insert({ media_asset_id: video.id, title: source?.title?.trim() || source?.file.name || 'Untitled video', description: source?.description?.trim() || null, playback_status: 'uploaded' });
    if (metadataError) throw toServiceError(metadataError);
    const { error: moderationError } = await supabase.from('media_moderation_status').insert({ media_asset_id: video.id, status: 'pending' });
    if (moderationError) throw toServiceError(moderationError);
  }
  return assets;
}

export async function cleanupFailedPostUpload(userId: string, paths: string[]) {
  if (!paths.length) return;
  await supabase.from('media_assets').delete().eq('owner_id', userId).in('object_path', paths);
  await supabase.storage.from('vibely-posts').remove(paths);
}
