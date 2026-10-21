import { useCallback, useEffect, useRef, useState } from 'react';
import { Phone, Video, PhoneOff, Mic, MicOff, VideoOff, Check, X } from 'lucide-react';
import { supabase } from './supabase';

type Signal = { id:string; conversation_id:string; sender_id:string; recipient_id:string; signal_type:'offer'|'answer'|'ice'|'hangup'|'decline'; media_type:'audio'|'video'; payload:any };
type Props = { conversationId:string; currentUserId:string; remoteUserId:string; remoteName:string };

export default function CallPanel({conversationId,currentUserId,remoteUserId,remoteName}:Props) {
 const [incoming,setIncoming]=useState<Signal|null>(null);
 const [callType,setCallType]=useState<'audio'|'video'|null>(null);
 const [status,setStatus]=useState('');
 const [muted,setMuted]=useState(false);
 const [cameraOff,setCameraOff]=useState(false);
 const pc=useRef<RTCPeerConnection|null>(null);
 const local=useRef<MediaStream|null>(null);
 const remote=useRef<MediaStream|null>(null);
 const localVideo=useRef<HTMLVideoElement|null>(null);
 const remoteVideo=useRef<HTMLVideoElement|null>(null);
 const activeType=useRef<'audio'|'video'>('audio');

 const cleanup=useCallback(()=>{pc.current?.close();pc.current=null;local.current?.getTracks().forEach(t=>t.stop());local.current=null;remote.current?.getTracks().forEach(t=>t.stop());remote.current=null;if(localVideo.current)localVideo.current.srcObject=null;if(remoteVideo.current)remoteVideo.current.srcObject=null;setCallType(null);setIncoming(null);setStatus('');setMuted(false);setCameraOff(false)},[]);
 const sendSignal=useCallback(async(signal_type:Signal['signal_type'],media_type:'audio'|'video',payload:any=null)=>{const {error}=await supabase.from('call_signals').insert({conversation_id:conversationId,sender_id:currentUserId,recipient_id:remoteUserId,signal_type,media_type,payload});if(error)throw error},[conversationId,currentUserId,remoteUserId]);
 const makePeer=useCallback(async(type:'audio'|'video')=>{
   const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:type==='video'});
   local.current=stream;if(localVideo.current)localVideo.current.srcObject=stream;
   const connection=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});pc.current=connection;remote.current=new MediaStream();
   if(remoteVideo.current)remoteVideo.current.srcObject=remote.current;
   stream.getTracks().forEach(track=>connection.addTrack(track,stream));
   connection.ontrack=e=>{e.streams[0]?.getTracks().forEach(track=>{if(!remote.current?.getTracks().some(t=>t.id===track.id))remote.current?.addTrack(track)});if(remoteVideo.current&&remote.current)remoteVideo.current.srcObject=remote.current};
   connection.onicecandidate=e=>{if(e.candidate)void sendSignal('ice',type,e.candidate.toJSON()).catch(err=>setStatus(err.message||'Could not send call signal.'))};
   connection.onconnectionstatechange=()=>{if(connection.connectionState==='connected')setStatus('Connected');if(['failed','disconnected'].includes(connection.connectionState))setStatus('Connection interrupted. Check your network and try again.')};
   return connection;
 },[sendSignal]);

 useEffect(()=>{const channel=supabase.channel('call-signals-'+currentUserId+'-'+conversationId).on('postgres_changes',{event:'INSERT',schema:'public',table:'call_signals',filter:'recipient_id=eq.'+currentUserId},payload=>{
   const s=payload.new as Signal;if(s.conversation_id!==conversationId||s.sender_id!==remoteUserId)return;
   if(s.signal_type==='offer'){if(callType||incoming){void supabase.from('call_signals').insert({conversation_id:conversationId,sender_id:currentUserId,recipient_id:remoteUserId,signal_type:'decline',media_type:s.media_type,payload:{reason:'busy'}});return}setIncoming(s);setStatus('Incoming '+s.media_type+' call from '+remoteName)}
   else if(s.signal_type==='answer'&&pc.current){void pc.current.setRemoteDescription(new RTCSessionDescription(s.payload)).then(()=>setStatus('Connecting…')).catch(()=>setStatus('Could not connect the call.'))}
   else if(s.signal_type==='ice'&&pc.current&&s.payload){void pc.current.addIceCandidate(new RTCIceCandidate(s.payload)).catch(()=>{})}
   else if(s.signal_type==='hangup'||s.signal_type==='decline'){setStatus(s.signal_type==='decline'?'Call declined':'Call ended');cleanup()}
 }).subscribe();return()=>{void supabase.removeChannel(channel)}},[currentUserId,conversationId,remoteUserId,remoteName,callType,incoming,cleanup]);

 async function start(type:'audio'|'video'){try{setStatus('Requesting microphone/camera permission…');activeType.current=type;setCallType(type);const connection=await makePeer(type);const offer=await connection.createOffer();await connection.setLocalDescription(offer);await sendSignal('offer',type,offer);setStatus('Calling '+remoteName+'…')}catch(e){cleanup();setStatus(e instanceof Error?e.message:'Could not start the call. Allow microphone/camera access and try again.')}}
 async function accept(){if(!incoming)return;const offer=incoming;try{setStatus('Joining call…');activeType.current=offer.media_type;setCallType(offer.media_type);setIncoming(null);const connection=await makePeer(offer.media_type);await connection.setRemoteDescription(new RTCSessionDescription(offer.payload));const answer=await connection.createAnswer();await connection.setLocalDescription(answer);await supabase.from('call_signals').insert({conversation_id:conversationId,sender_id:currentUserId,recipient_id:remoteUserId,signal_type:'answer',media_type:offer.media_type,payload:answer});setStatus('Connecting…')}catch(e){cleanup();setStatus(e instanceof Error?e.message:'Could not accept the call. Check microphone/camera permissions.')}}
 async function endCall(){try{if(callType||incoming)await sendSignal(incoming?'decline':'hangup',callType||incoming!.media_type)}catch{}cleanup()}
 function toggleMute(){const next=!muted;local.current?.getAudioTracks().forEach(t=>t.enabled=!next);setMuted(next)}
 function toggleCamera(){const next=!cameraOff;local.current?.getVideoTracks().forEach(t=>t.enabled=!next);setCameraOff(next)}
 return <div className="vibely-call-tools" style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
   {!callType&&!incoming&&<><button type="button" title="Voice call" aria-label="Start voice call" onClick={()=>void start('audio')} className="call-icon-button"><Phone size={18}/></button><button type="button" title="Video call" aria-label="Start video call" onClick={()=>void start('video')} className="call-icon-button"><Video size={18}/></button></>}
   {incoming&&<div role="dialog" aria-label="Incoming call" style={{display:'flex',alignItems:'center',gap:6}}><span>{remoteName} is calling ({incoming.media_type})</span><button type="button" title="Accept call" onClick={()=>void accept()} className="call-icon-button"><Check size={18}/></button><button type="button" title="Decline call" onClick={()=>void endCall()} className="call-icon-button"><X size={18}/></button></div>}
   {(callType||incoming)&&<button type="button" title="End call" aria-label="End call" onClick={()=>void endCall()} className="call-icon-button call-end"><PhoneOff size={18}/></button>}
   {callType==='video'&&<div style={{position:'fixed',inset:'auto 12px 12px auto',zIndex:1000,width:'min(360px,calc(100vw - 24px))',background:'#101018',borderRadius:16,padding:10,color:'white',boxShadow:'0 12px 40px #0005'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><b>{status||'Video call'}</b><div style={{display:'flex',gap:6}}><button type="button" title={muted?'Unmute':'Mute'} onClick={toggleMute} className="call-icon-button">{muted?<MicOff size={16}/>:<Mic size={16}/>}</button><button type="button" title={cameraOff?'Turn camera on':'Turn camera off'} onClick={toggleCamera} className="call-icon-button">{cameraOff?<VideoOff size={16}/>:<Video size={16}/>}</button></div></div>
    <video ref={remoteVideo} autoPlay playsInline style={{width:'100%',aspectRatio:'4/3',background:'#272733',borderRadius:10,objectFit:'cover'}}/><video ref={localVideo} autoPlay muted playsInline style={{position:'absolute',right:18,bottom:18,width:90,aspectRatio:'3/4',background:'#444',borderRadius:8,objectFit:'cover'}}/>
   </div>}
   {callType==='audio'&&<span role="status" style={{fontSize:12}}>{status}</span>}
   {!callType&&!incoming&&status&&<span role="status" style={{fontSize:12}}>{status}</span>}
 </div>
}
