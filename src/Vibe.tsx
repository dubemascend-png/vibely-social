'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, Clock3, Compass, Film, Flame, Gamepad2, GraduationCap, Heart, ListVideo, MoreVertical, Music2, Play, Plus, Search, Share2, ThumbsDown, Video, X, Users, Settings2, Clapperboard, MessageCircle } from 'lucide-react';
import VideoWatch from './video/VideoWatch';
import ShortsFeed from './video/ShortsFeed';
import VideoLibrary from './video/VideoLibrary';
import CreatorStudio from './video/CreatorStudio';
import ChannelHub from './video/ChannelHub';
import VideoWellbeing from './video/VideoWellbeing';

type VideoProfile = { id: string; username?: string | null; display_name?: string | null; avatar_url?: string | null; is_verified?: boolean };
type VideoPost = { id: string; author_id: string; caption: string | null; media_url: string | null; media_type: string | null; created_at: string; profiles?: VideoProfile; likes?: { user_id: string }[]; comments?: { id: string; body: string; author_id: string }[] };

const categories = [
  { name: 'All', icon: Compass }, { name: 'Music', icon: Music2 }, { name: 'Gaming', icon: Gamepad2 },
  { name: 'Learning', icon: GraduationCap }, { name: 'Comedy', icon: Flame }, { name: 'Shorts', icon: Film },
];
const ago = (date: string) => { const n = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 60000)); return n < 60 ? n + ' min ago' : n < 1440 ? Math.floor(n / 60) + ' hr ago' : Math.floor(n / 1440) + ' days ago'; };
const durationLabel = (seconds: number) => Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');

/** Vibe video home. Real video posts are supplied by the existing Supabase-backed feed. */
export default function Vibe({ posts, onCreate, currentUserId, onLike, onComment, onPlay, onComplete, onProfileVisit }: { posts: VideoPost[]; onCreate: () => void; currentUserId: string; onLike: (postId: string) => void; onComment: (postId: string, body: string) => void; onPlay: (postId: string) => void; onComplete: (postId: string) => void; onProfileVisit: (profileId: string) => void }) {
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [watchLater, setWatchLater] = useState<string[]>([]);
  const [hiddenVideos, setHiddenVideos] = useState<string[]>([]);
  const [hiddenChannels, setHiddenChannels] = useState<string[]>([]);
  const [savedNotice, setSavedNotice] = useState(''), [selectedVideo, setSelectedVideo] = useState<VideoPost | null>(null);
  const [sort, setSort] = useState<'recommended' | 'newest'>('recommended');
  const [shortsMode, setShortsMode] = useState(false);
  const [view, setView] = useState<'home'|'shorts'|'library'|'studio'|'channels'|'settings'>('home');
  useEffect(() => { try { setWatchLater(JSON.parse(localStorage.getItem('vibe-video-watch-later') || '[]')); } catch {} }, []);
  const toggleWatchLater = (id: string) => { const next = watchLater.includes(id) ? watchLater.filter(v => v !== id) : [...watchLater, id]; setWatchLater(next); try { localStorage.setItem('vibe-video-watch-later', JSON.stringify(next)); } catch {} };

  const videoPosts = useMemo(() => posts.filter(p => p.media_type === 'video' && !!p.media_url && !hiddenVideos.includes(p.id) && !hiddenChannels.includes(p.author_id)), [posts, hiddenVideos, hiddenChannels]);
  const filtered = useMemo(() => {
    let list = videoPosts.filter(p => !search.trim() || (p.caption || '').toLowerCase().includes(search.toLowerCase()) || (p.profiles?.display_name || p.profiles?.username || '').toLowerCase().includes(search.toLowerCase()));
    if (category === 'Shorts') list = list.filter(p => /#shorts|#vibeshort/i.test(p.caption || ''));
    if (sort === 'newest') return [...list].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    return [...list].sort((a, b) => { const scoreA = (a.likes?.length || 0) * 2 + (a.comments?.length || 0); const scoreB = (b.likes?.length || 0) * 2 + (b.comments?.length || 0); return scoreB - scoreA; });
  }, [videoPosts, search, category, sort]);

  const shareVideo = async (post: VideoPost) => {
    const url = window.location.origin + window.location.pathname + '?vibe=' + encodeURIComponent(post.id);
    try { if (navigator.share) await navigator.share({ title: post.caption || 'Watch on Vibe', url }); else { await navigator.clipboard.writeText(url); setSavedNotice('Video link copied.'); } } catch { /* Share sheet dismissed. */ }
  };

  return <section className="vibe-video-home" aria-label="Vibe video home">
    <div className="vibe-video-heading">
      <div><span className="vibe-eyebrow">WATCH SOMETHING GOOD</span><h1>Vibe <span>Video</span></h1><p>Discover videos from your people and beyond.</p></div>
      <button className="vibe-upload-button" onClick={onCreate}><Plus size={18}/> Upload video</button>
    </div>
    <nav className="vibe-platform-nav" aria-label="Video platform sections">
      <button className={view==='home'?'active':''} onClick={()=>setView('home')}><Compass size={16}/> Explore</button>
      <button className={view==='shorts'?'active':''} onClick={()=>setView('shorts')}><Film size={16}/> Shorts</button>
      <button className={view==='channels'?'active':''} onClick={()=>setView('channels')}><Users size={16}/> Channels</button>
      <button className={view==='library'?'active':''} onClick={()=>setView('library')}><Clock3 size={16}/> Library</button>
      <button className={view==='studio'?'active':''} onClick={()=>setView('studio')}><Clapperboard size={16}/> Studio</button>
      <button className={view==='settings'?'active':''} onClick={()=>setView('settings')}><Settings2 size={16}/> Settings</button>
    </nav>
    {view==='shorts' ? <ShortsFeed posts={videoPosts} onClose={()=>setView('home')} onWatch={p=>{setView('home');setSelectedVideo(p)}} onLike={onLike} onComment={onComment}/> : view==='library' ? <VideoLibrary posts={posts.filter(p=>p.media_type==='video'&&!!p.media_url)} onWatch={setSelectedVideo}/> : view==='studio' ? <CreatorStudio posts={posts.filter(p=>p.media_type==='video'&&!!p.media_url)} onCreate={onCreate} currentUserId={currentUserId}/> : view==='channels' ? <ChannelHub posts={posts.filter(p=>p.media_type==='video'&&!!p.media_url)} onWatch={setSelectedVideo}/> : view==='settings' ? <VideoWellbeing/> : <>
    <div className="vibe-video-tools">
      <label className="vibe-video-search"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search videos and creators…" aria-label="Search videos"/>{search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={16}/></button>}</label>
      <button className={'vibe-sort-button ' + (sort === 'newest' ? 'selected' : '')} onClick={() => setSort(v => v === 'newest' ? 'recommended' : 'newest')}><Clock3 size={15}/>{sort === 'newest' ? 'Newest first' : 'Recommended'}<ChevronDown size={14}/></button>
    </div>
    <div className="vibe-category-row" role="tablist" aria-label="Video categories">
      {categories.map(({ name, icon: Icon }) => <button key={name} role="tab" aria-selected={category === name} className={category === name ? 'active' : ''} onClick={() => { setCategory(name); setShortsMode(name === 'Shorts'); }}><Icon size={15}/>{name}</button>)}
    </div>
    {savedNotice && <div className="vibe-inline-notice" role="status">{savedNotice}<button onClick={() => setSavedNotice('')} aria-label="Dismiss"><X size={14}/></button></div>}
    {filtered.length === 0 ? <div className="vibe-empty-state"><div className="vibe-empty-icon"><Video size={27}/></div><h2>{search ? 'No videos found' : hiddenVideos.length || hiddenChannels.length ? 'Your feed is refreshed' : 'Your next favorite video is waiting'}</h2><p>{search ? 'Try another title or creator name.' : 'When you or your community publish videos, they’ll appear here. You can start by sharing your first video.'}</p><button onClick={onCreate}><Plus size={17}/> Upload your first video</button><small>Existing video posts are loaded from your Vibe.ly feed. No sample videos are presented as real uploads.</small></div> :
      <div className={shortsMode ? 'vibe-video-grid shorts-preview-grid' : 'vibe-video-grid'}>
        {filtered.map(post => {
          const creator = post.profiles?.display_name || post.profiles?.username || 'Vibe creator';
          const isSaved = watchLater.includes(post.id);
          return <article className="vibe-video-card" key={post.id}>
            <button className="vibe-thumbnail" onClick={() => { setSelectedVideo(post); }} aria-label={'Watch ' + (post.caption || 'video')}>
              <video src={post.media_url || undefined} preload="metadata" muted playsInline tabIndex={-1} onLoadedMetadata={e => { const d=e.currentTarget.duration; const badge=e.currentTarget.parentElement?.querySelector('.vibe-duration'); if(badge && Number.isFinite(d)) badge.textContent=durationLabel(d); }} />
              <span className="vibe-duration">Video</span><span className="vibe-play-overlay"><Play size={23} fill="currentColor"/></span>
              {isSaved && <span className="vibe-saved-flag"><Clock3 size={12}/> Saved</span>}
            </button>
            <div className="vibe-card-details">
              <span className="vibe-creator-avatar">{post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} alt="" loading="lazy"/> : creator.slice(0,1).toUpperCase()}</span>
              <div className="vibe-card-copy"><button className="vibe-card-title" onClick={() => { setSelectedVideo(post); }}>{post.caption?.trim() || 'A video from ' + creator}</button><div className="vibe-card-channel">{creator}{post.profiles?.is_verified && <CheckCircle2 size={13} fill="#ff3b5c" color="#ff3b5c" aria-label="Verified creator"/>}</div><div className="vibe-card-meta">{(post.likes?.length || 0).toLocaleString()} likes <span>·</span> {ago(post.created_at)}</div><div className="vibe-card-actions"><button onClick={()=>onLike(post.id)} aria-label="Like video"><Heart size={14}/> Like</button><button onClick={()=>setSelectedVideo(post)} aria-label="View comments"><MessageCircle size={14}/> {post.comments?.length||0}</button><button onClick={()=>onProfileVisit(post.author_id)} aria-label="Visit creator profile">Profile</button></div></div>
              <div className="vibe-card-menu-wrap"><button className="vibe-card-menu-button" aria-label={'More options for ' + (post.caption || 'video')} aria-expanded={activeMenu === post.id} onClick={() => setActiveMenu(activeMenu === post.id ? null : post.id)}><MoreVertical size={19}/></button>
                {activeMenu === post.id && <div className="vibe-card-menu" role="menu">
                  <button role="menuitem" onClick={() => { toggleWatchLater(post.id); setSavedNotice(isSaved ? 'Removed from Watch Later.' : 'Added to Watch Later.'); setActiveMenu(null); }}><Clock3 size={15}/>{isSaved ? 'Remove from Watch Later' : 'Save to Watch Later'}</button>
                  <button role="menuitem" onClick={() => { void shareVideo(post); setActiveMenu(null); }}><Share2 size={15}/>Share video</button>
                  <button role="menuitem" onClick={() => { setHiddenVideos(v => [...v, post.id]); setActiveMenu(null); setSavedNotice('Video hidden from this feed (this session).'); }}><ThumbsDown size={15}/>Not interested</button>
                  <button role="menuitem" onClick={() => { setHiddenChannels(v => [...v, post.author_id]); setActiveMenu(null); setSavedNotice('Creator hidden from this feed (this session).'); }}><X size={15}/>Don’t recommend channel</button>
                  <button role="menuitem" onClick={() => { setActiveMenu(null); setSavedNotice('Playlist saving is a UI placeholder. // TODO: connect backend.'); }}><ListVideo size={15}/>Add to playlist <small>TODO</small></button>
                </div>}
              </div>
            </div>
          </article>;
        })}
      </div>}
    <div className="vibe-video-footer-note"><span><Heart size={14}/> Made for your interests</span><span>Recommendations are a starter ranking based on available likes and comments. // TODO: connect backend for watch-time and satisfaction signals.</span></div>
    </>}
    {selectedVideo && <VideoWatch video={selectedVideo} posts={posts.filter(p=>p.media_type==='video'&&!!p.media_url)} onClose={()=>setSelectedVideo(null)} onSelect={setSelectedVideo} onLike={onLike} onComment={onComment} onPlay={onPlay} onComplete={onComplete} onProfileVisit={onProfileVisit}/>}
  </section>;
}
