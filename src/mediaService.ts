/**
 * Client-side media helpers.
 * Image compression is opt-in via the local Vibe.ly data-saver preference.
 * // TODO: connect backend — server-side upload validation and transcoding remain authoritative.
 */
export async function compressImageIfEnabled(file: File): Promise<File> {
  if (typeof window === 'undefined' || window.localStorage.getItem('vibely-data-saver') !== 'true') return file;
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.size < 350 * 1024) return file;
  if (typeof createImageBitmap !== 'function') return file;
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const maxEdge = 1920;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const outputType = file.type === 'image/png' ? 'image/webp' : (file.type === 'image/webp' ? 'image/webp' : 'image/jpeg');
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, outputType, 0.82));
    if (!blob || blob.size >= file.size) return file;
    const baseName = file.name.replace(/\.[^.]+$/, '');
    const extension = outputType === 'image/jpeg' ? 'jpg' : 'webp';
    return new File([blob], baseName + '.' + extension, { type: outputType, lastModified: file.lastModified });
  } catch {
    // If the browser cannot decode/encode this image, keep the original intact.
    return file;
  } finally {
    bitmap?.close();
  }
}
