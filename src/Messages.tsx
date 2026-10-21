import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { MessageCircle, Search, Send, ArrowLeft, Plus, Users, LoaderCircle, Check, CheckCheck } from 'lucide-react';
import { supabase } from './supabase';
import CallPanel from './CallPanel';

type Profile={id:string;username:string|null;display_name:string|null;avatar_url:string|null;bio?:string|null};
type Member={user_id:string};
type ConversationRow={id:string;is_group:boolean;title:string|null;created_by:string;created_at:string;conversation_members:Member[]};
type Conversation=ConversationRow&{otherProfile?:Profile};
type Message={id:string;conversation_id:string;sender_id:string;body:string;created_at:string;delivered_at:string|null;read_at:string|null};
const initials=(s?:string|null)=>(s?.trim()[0]||'V').toUpperCase();
const time=(s:string)=>new Date(s).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
export default function Messages({currentUserId}:{currentUserId:string}){
 const [conversations,setConversations]=useState<Conversation[]>([]),[profiles,setProfiles]=useState<Profile[]>([]),[active,setActive]=useState<string|null>(null),[messages,setMessages]=useState<Message[]>([]),[draft,setDraft]=useState(''),[search,setSearch]=useState(''),[loading,setLoading]=useState(true),[sending,setSending]=useState(false),[starting,setStarting]=useState(false),[error,setError]=useState('');
 const activeConversation=conversations.find(c=>c.id===active)||null;
 const loadInbox=useCallback(async()=>{setLoading(true);setError('');const {data,error}=await supabase.from('conversations').select('id,is_group,title,created_by,created_at,conversation_members(user_id)').order('created_at',{ascending:false}).limit(100);if(error){setError(error.message);setLoading(false);return}const rows=(data||[]) as ConversationRow[];const otherIds=[...new Set(rows.flatMap(c=>c.conversation_members.map(m=>m.user_id).filter(id=>id!==currentUserId)))];let people:Profile[]=[];if(otherIds.length){const p=await supabase.from('profiles').select('id,username,display_name,avatar_url,bio').in('id',otherIds);if(p.error)setError(p.error.message);else people=(p.data||[]) as Profile[]}setProfiles(people);setConversations(rows.map(c=>({...c,otherProfile:people.find(p=>c.conversation_members.some(m=>m.user_id===p.id&&p.id!==currentUserId))})));setLoading(false)},[currentUserId]);
 useEffect(()=>{void loadInbox()},[loadInbox]);
 // Track delivery for incoming messages even when another conversation is open.
 useEffect(()=>{
   if(!conversations.length)return;
   const conversationIds=new Set(conversations.map(c=>c.id));
   const channel=supabase.channel('vibely-delivery-'+currentUserId)
     .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},payload=>{
       const m=payload.new as Message;
       if(m.sender_id===currentUserId||!conversationIds.has(m.conversation_id))return;
       if(active===m.conversation_id&&document.visibilityState==='visible'){
         void supabase.rpc('mark_messages_read',{p_conversation_id:m.conversation_id});
       }else{
         void supabase.rpc('mark_messages_delivered',{p_conversation_id:m.conversation_id});
       }
     }).subscribe();
   return()=>{void supabase.removeChannel(channel)};
 },[conversations,currentUserId,active]);
 useEffect(()=>{const term=search.trim().replace(/[,%()]/g,'');if(!term)return;const timer=window.setTimeout(async()=>{const {data,error}=await supabase.from('profiles').select('id,username,display_name,avatar_url,bio').neq('id',currentUserId).or('username.ilike.%'+term+'%,display_name.ilike.%'+term+'%').limit(20);if(error)setError(error.message);else setProfiles((data||[]) as Profile[])},250);return()=>window.clearTimeout(timer)},[search,currentUserId]);
 const loadMessages=useCallback(async(id:string)=>{const {data,error}=await supabase.from('messages').select('id,conversation_id,sender_id,body,created_at,delivered_at,read_at').eq('conversation_id',id).order('created_at',{ascending:false}).limit(100);if(error){setError(error.message);return}setMessages(((data||[]) as Message[]).reverse());const receipt=await supabase.rpc('mark_messages_read',{p_conversation_id:id});if(receipt.error)setError(receipt.error.message)},[]);
 useEffect(()=>{if(!active){setMessages([]);return}void loadMessages(active);const channel=supabase.channel('vibely-messages-'+active)
 .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'conversation_id=eq.'+active},payload=>{
   const m=payload.new as Message;
   setMessages(old=>old.some(x=>x.id===m.id)?old:[...old,m]);
   if(m.sender_id!==currentUserId){
     if(document.visibilityState==='visible') void supabase.rpc('mark_messages_read',{p_conversation_id:active});
     else void supabase.rpc('mark_messages_delivered',{p_conversation_id:active});
   }
 })
 .on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages',filter:'conversation_id=eq.'+active},payload=>{
   const updated=payload.new as Message;
   setMessages(old=>old.map(m=>m.id===updated.id?{...m,...updated}:m));
 })
 .subscribe();
 void supabase.rpc('mark_messages_read',{p_conversation_id:active});
 return()=>{void supabase.removeChannel(channel)}},[active,currentUserId,loadMessages]);
 const startConversation=useCallback(async(p:Profile)=>{const existing=conversations.find(c=>!c.is_group&&c.otherProfile?.id===p.id);if(existing){setActive(existing.id);setSearch('');return}setStarting(true);setError('');const created=await supabase.from('conversations').insert({created_by:currentUserId,is_group:false,title:null}).select('id,is_group,title,created_by,created_at').single();if(created.error){setError(created.error.message);setStarting(false);return}const members=await supabase.from('conversation_members').insert([{conversation_id:created.data.id,user_id:currentUserId},{conversation_id:created.data.id,user_id:p.id}]);if(members.error){setError(members.error.message);setStarting(false);return}await loadInbox();setActive(created.data.id);setSearch('');setStarting(false)},[conversations,currentUserId,loadInbox]);
 async function send(e:FormEvent){e.preventDefault();const body=draft.trim();if(!active||!body||sending)return;setSending(true);setError('');const {data,error}=await supabase.from('messages').insert({conversation_id:active,sender_id:currentUserId,body}).select('id,conversation_id,sender_id,body,created_at,delivered_at,read_at').single();setSending(false);if(error){setError(error.message);return}setDraft('');setMessages(old=>old.some(m=>m.id===data.id)?old:[...old,data as Message])}
 const filtered=useMemo(()=>profiles.filter(p=>(p.display_name||p.username||'').toLowerCase().includes(search.toLowerCase())),[profiles,search]);
 const activeTitle=activeConversation?.is_group?activeConversation.title||'Group conversation':activeConversation?.otherProfile?.display_name||activeConversation?.otherProfile?.username||'Conversation';
 return <section className="messaging"><div className={'inbox '+(active?'inbox-hidden':'')}><div className="inboxhead"><div><span className="eyebrow">STAY CLOSE</span><h2>Your messages</h2><p>Little check-ins can mean a lot.</p></div><span className="inboxicon"><MessageCircle/></span></div><label className="message-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a person or conversation"/></label>{search.trim()&&<div className="newchatlist"><small>START A CONVERSATION</small>{filtered.slice(0,8).map(p=><button key={p.id} onClick={()=>void startConversation(p)} disabled={starting}><span className="message-avatar">{initials(p.display_name||p.username)}</span><span><b>{p.display_name||p.username||'Vibely member'}</b><small>@{p.username||'member'}</small></span><Plus size={17}/></button>)}{filtered.length===0&&<p>No matching people yet.</p>}</div>}{error&&<p className="message-error">{error}</p>}{loading?<div className="message-empty"><LoaderCircle className="spin"/> Loading conversations…</div>:conversations.length===0&&!search.trim()?<div className="message-empty"><span className="message-empty-icon"><MessageCircle/></span><b>Your next good conversation starts here.</b><p>Search for someone above to send your first message.</p></div>:<div className="conversation-list">{conversations.map(c=><button key={c.id} className={'conversation-row '+(active===c.id?'selected':'')} onClick={()=>setActive(c.id)}><span className="message-avatar">{c.is_group?<Users/>:initials(c.otherProfile?.display_name||c.otherProfile?.username)}</span><span className="conversation-copy"><b>{c.is_group?c.title||'Group conversation':c.otherProfile?.display_name||c.otherProfile?.username||'Vibely member'}</b><small>{c.is_group?'Group chat':'@'+(c.otherProfile?.username||'member')}</small></span><span className="conversation-date">{new Date(c.created_at).toLocaleDateString([], {month:'short',day:'numeric'})}</span></button>)}</div>}</div><div className={'chatpanel '+(!active?'chat-empty':'')}>{!active?<div className="chat-welcome"><span className="message-empty-icon"><MessageCircle/></span><h3>A little hello goes a long way.</h3><p>Choose a conversation or search for someone new.</p></div>:<><header className="chatheader"><button className="chatback" onClick={()=>setActive(null)}><ArrowLeft/></button><span className="message-avatar">{initials(activeConversation?.otherProfile?.display_name||activeConversation?.otherProfile?.username)}</span><div><b>{activeTitle}</b><small>@{activeConversation?.otherProfile?.username||'vibe.ly member'}</small></div>{activeConversation?.otherProfile&&<CallPanel conversationId={activeConversation.id} currentUserId={currentUserId} remoteUserId={activeConversation.otherProfile.id} remoteName={activeTitle}/>}</header><div className="message-history">{messages.length===0?<div className="message-empty"><p>Say hello and start something good. ✨</p></div>:messages.map(m=><div className={'bubble-row '+(m.sender_id===currentUserId?'mine':'theirs')} key={m.id}><div className="bubble">{m.body}<small className="message-meta">{time(m.created_at)}{m.sender_id===currentUserId&&<span className={'message-receipt '+(m.read_at?'is-read':'')} aria-label={m.read_at?'Read':m.delivered_at?'Delivered':'Sent'} title={m.read_at?'Read':m.delivered_at?'Delivered':'Sent'}>{m.read_at?<CheckCheck size={15}/>:m.delivered_at?<CheckCheck size={15}/>:<Check size={15}/>}</span>}</small></div></div>)}</div><form className="message-compose" onSubmit={send}><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Write a message…" maxLength={4000}/><button className="primary" disabled={!draft.trim()||sending}>{sending?<LoaderCircle className="spin"/>:<Send size={17}/>}</button></form></>}</div></section>
}
