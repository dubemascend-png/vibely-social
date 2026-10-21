'use client';
import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, FileText, LoaderCircle, Pencil, Trash2 } from 'lucide-react';
import { deleteDraft, listOwnDrafts, scheduleDraft, type PostDraft } from './services/drafts';
import { friendlyError } from './services/request';

export default function DraftsPanel({ userId, onResume }: { userId: string; onResume: (draft: PostDraft) => void }) {
  const [items,setItems]=useState<PostDraft[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [busyId,setBusyId]=useState('');
  const [scheduleFor,setScheduleFor]=useState<Record<string,string>>({});
  const refresh=useCallback(async()=>{setLoading(true);setError('');try{setItems(await listOwnDrafts(userId))}catch(e){setError(friendlyError(e,'Could not load your drafts.'))}finally{setLoading(false)}},[userId]);
  useEffect(()=>{void refresh()},[refresh]);
  async function remove(item:PostDraft){setBusyId(item.id);setError('');try{await deleteDraft(item.id,userId);setItems(old=>old.filter(x=>x.id!==item.id))}catch(e){setError(friendlyError(e,'Could not delete this draft.'))}finally{setBusyId('')}}
  async function schedule(item:PostDraft){setBusyId(item.id);setError('');try{const updated=await scheduleDraft(item.id,userId,scheduleFor[item.id]||'');setItems(old=>old.map(x=>x.id===item.id?updated:x))}catch(e){setError(friendlyError(e,'Could not schedule this draft.'))}finally{setBusyId('')}}
  return <section className="drafts-panel"><div className="sectionhead"><div><h2>Your drafts ✦</h2><p>Saved to your account, so you can pick up on any device.</p></div><button type="button" onClick={()=>void refresh()}>Refresh</button></div>
    {error&&<div className="vibe-backend-error" role="alert"><span>{error}</span><button type="button" onClick={()=>void refresh()}>Retry</button></div>}
    {loading?<div className="drafts-empty"><LoaderCircle className="spin"/> Loading drafts…</div>:items.length===0?<div className="drafts-empty"><FileText size={22}/><b>No drafts yet</b><span>Save a post from the composer and it will appear here.</span></div>:<div className="drafts-list">{items.map(item=><article className="draft-row" key={item.id}><div className="draft-row-copy"><b>{item.title||item.caption.slice(0,64)||'Untitled '+item.kind}</b><small>{item.kind.replace('_',' ')} · {item.status==='scheduled'&&item.scheduled_at?'Scheduled for '+new Date(item.scheduled_at).toLocaleString():'Updated '+new Date(item.updated_at).toLocaleString()}</small><p>{item.caption||'No caption yet.'}</p></div><div className="draft-actions"><button type="button" disabled={busyId===item.id} onClick={()=>onResume(item)}><Pencil size={14}/> Resume</button>{item.status==='draft'&&<><label className="draft-schedule-field"><CalendarClock size={14}/><input aria-label="Schedule date and time" type="datetime-local" min={new Date(Date.now()+60000).toISOString().slice(0,16)} value={scheduleFor[item.id]||''} onChange={e=>setScheduleFor(old=>({...old,[item.id]:e.target.value}))}/></label><button type="button" disabled={busyId===item.id||!scheduleFor[item.id]} onClick={()=>void schedule(item)}><CalendarClock size={14}/> Schedule</button></>}<button type="button" disabled={busyId===item.id} onClick={()=>void remove(item)}><Trash2 size={14}/> Delete</button></div></article>)}</div>}
    <p className="drafts-note">Scheduled time is saved securely. Automatic publishing still requires a scheduled backend worker, so a scheduled item will not publish itself yet.</p>
  </section>;
}
