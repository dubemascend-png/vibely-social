import type { VibeVideoPost } from './videoTypes';

/** Starter ranking only. TODO: connect backend watch-time, satisfaction, safety and freshness signals. */
export function rankVideos(posts: VibeVideoPost[], mode: 'recommended' | 'newest' = 'recommended') {
  return [...posts].sort((a, b) => {
    if (mode === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    const score = (p: VibeVideoPost) => (p.likes?.length || 0) * 2 + (p.comments?.length || 0);
    return score(b) - score(a);
  });
}

/** UI-only creator assistance. Replace with a server-side AI provider when configured. */
export const videoAI = {
  suggestTitle: (caption: string) => caption.trim() ? caption.trim().slice(0, 72) : 'A new video from Vibe',
  suggestDescription: (caption: string) => caption.trim() ? 'Discover more from this creator on Vibe.ly. ' + caption.trim() : 'Add a clear description so viewers know what your video is about.',
  suggestTags: (caption: string) => [...new Set(caption.toLowerCase().match(/[a-z0-9]{4,}/g) || [])].slice(0, 5),
};
