export type VideoCreator = { id: string; username?: string | null; display_name?: string | null; avatar_url?: string | null; is_verified?: boolean };
export type VibeVideoPost = { id: string; author_id: string; caption: string | null; media_url: string | null; media_type: string | null; created_at: string; profiles?: VideoCreator; likes?: { user_id: string }[]; comments?: { id: string; body: string; author_id: string; profiles?: VideoCreator }[] };
export type VideoSection = 'home' | 'shorts' | 'library' | 'studio';
