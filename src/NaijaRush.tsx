'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ArrowLeft, ArrowRight, Gauge, MapPin, Trophy, Zap, RotateCcw, Gamepad2, Volume2, VolumeX } from 'lucide-react';

type Mode = 'hub' | 'map' | 'race' | 'results';
type Quality = 'Auto' | 'Ultra' | 'High' | 'Medium' | 'Low' | 'Data-saver';
const states = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'
];
const tracks = [
  { name:'Lagos Island Sprint', place:'Lagos', type:'NIGHT SPRINT', time:'Night · Light rain', color:'#a78bfa', unlocked:true, laps:2 },
  { name:'Abuja Capital Circuit', place:'FCT', type:'CAPITAL CIRCUIT', time:'Day · Clear', color:'#38bdf8', unlocked:false, laps:3 },
  { name:'Jos Plateau Climb', place:'Plateau', type:'HILL CLIMB', time:'Dusk · Mist', color:'#34d399', unlocked:false, laps:2 },
  { name:'Kano Old City Dash', place:'Kano', type:'CITY DASH', time:'Dusk · Harmattan', color:'#fbbf24', unlocked:false, laps:2 },
  { name:'Niger Delta Run', place:'Rivers', type:'WATERFRONT RUN', time:'Evening · Rain', color:'#fb7185', unlocked:false, laps:3 },
  { name:'Calabar Carnival Cup', place:'Cross River', type:'FESTIVAL CUP', time:'Night · Clear', color:'#f472b6', unlocked:false, laps:3 },
  { name:'Onitsha Niger Bridge Crossing', place:'Anambra', type:'RIVER CROSSING', time:'Dusk · Clear', color:'#60a5fa', unlocked:false, laps:2 },
  { name:'Abeokuta Olumo Rock Rally', place:'Ogun', type:'DIRT RALLY', time:'Day · Dust', color:'#fb923c', unlocked:false, laps:2 }
];
const colors = ['#9b7bff','#40d8c0','#f8b84e','#ff6b9b'];
function makeCar(color: string, player = false) {
  const car = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, .34, 2.05), new THREE.MeshStandardMaterial({ color, metalness:.45, roughness:.28 }));
  body.position.y=.42; car.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(.78,.36,.92),new THREE.MeshStandardMaterial({color:player?'#d9ccff':'#1e293b',metalness:.2,roughness:.18}));
  cabin.position.set(0,.75,-.13); car.add(cabin);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(.82,.09,.25),new THREE.MeshStandardMaterial({color:'#f8fafc',emissive:'#e0e7ff',emissiveIntensity:player?.8:.15}));
  nose.position.set(0,.47,-1.04);car.add(nose);
  for(const x of [-.62,.62]) for(const z of [-.65,.65]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.13,12),new THREE.MeshStandardMaterial({color:'#111827',roughness:.95}));
    wheel.rotation.z=Math.PI/2;wheel.position.set(x,.22,z);car.add(wheel);
  }
  return car;
}
function buildTrack(scene: THREE.Scene) {
  const road = new THREE.Mesh(new THREE.RingGeometry(9.1,13.4,96),new THREE.MeshStandardMaterial({color:'#25263b',roughness:.82,metalness:.12,side:THREE.DoubleSide}));
  road.rotation.x=-Math.PI/2;road.position.y=.04;scene.add(road);
  const inner = new THREE.Mesh(new THREE.RingGeometry(8.95,9.12,96),new THREE.MeshBasicMaterial({color:'#9b7bff'}));
  inner.rotation.x=-Math.PI/2;inner.position.y=.06;scene.add(inner);
  const outer = new THREE.Mesh(new THREE.RingGeometry(13.38,13.55,96),new THREE.MeshBasicMaterial({color:'#f8d477'}));
  outer.rotation.x=-Math.PI/2;outer.position.y=.06;scene.add(outer);
  const dashGeo=new THREE.BoxGeometry(.09,.025,.8);
  const dashMat=new THREE.MeshBasicMaterial({color:'#d5d3e8'});
  for(let i=0;i<48;i++){const a=i/48*Math.PI*2;const d=new THREE.Mesh(dashGeo,dashMat);d.position.set(Math.cos(a)*11.25,.075,Math.sin(a)*11.25);d.rotation.y=-a;scene.add(d)}
  const grass=new THREE.Mesh(new THREE.CircleGeometry(35,96),new THREE.MeshStandardMaterial({color:'#10192b',roughness:1}));
  grass.rotation.x=-Math.PI/2;grass.position.y=-.08;scene.add(grass);
  const water=new THREE.Mesh(new THREE.PlaneGeometry(90,90),new THREE.MeshStandardMaterial({color:'#0b1428',roughness:.28,metalness:.2}));
  water.rotation.x=-Math.PI/2;water.position.y=-.12;scene.add(water);
  for(let i=0;i<70;i++){
    const a=i*2.399, r=15+(i%7)*1.45;
    const h=1.2+(i%5)*.55;
    const tree=new THREE.Mesh(new THREE.ConeGeometry(.35,h,5),new THREE.MeshStandardMaterial({color:i%3===0?'#2b4561':'#1c574c',roughness:1}));
    tree.position.set(Math.cos(a)*r,h/2-.02,Math.sin(a)*r);scene.add(tree);
  }
  const start=new THREE.Mesh(new THREE.BoxGeometry(2.2,.08,.3),new THREE.MeshBasicMaterial({color:'#f8fafc'}));
  start.position.set(0,.1,-11.25);scene.add(start);
  const lights=[];
  for(let i=0;i<16;i++){
    const a=i/16*Math.PI*2, r=16.5;
    const pole=new THREE.Group();
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.045,.06,2.6,6),new THREE.MeshStandardMaterial({color:'#475569'}));stem.position.y=1.3;pole.add(stem);
    const lamp=new THREE.Mesh(new THREE.SphereGeometry(.15,8,8),new THREE.MeshBasicMaterial({color:i%2?'#a78bfa':'#38bdf8'}));lamp.position.y=2.65;pole.add(lamp);
    pole.position.set(Math.cos(a)*r,0,Math.sin(a)*r);scene.add(pole);
    if(i%4===0)lights.push(new THREE.PointLight(i%2?0x8b5cf6:0x38bdf8,14,11)); if(lights.length) {lights[lights.length-1].position.set(Math.cos(a)*r,2.4,Math.sin(a)*r);scene.add(lights[lights.length-1]);}
  }
}
function makeNigeriaShape() {
  // Stylized generalized national outline, projected for a playable overview; state divisions are represented by labelled selectable markers.
  const coords:[number,number][]=[[-2.7,1.6],[-1.9,2.2],[-.7,2.6],[.7,2.45],[1.7,2.05],[2.65,1.2],[2.8,.15],[2.25,-.6],[1.8,-1.55],[1.2,-2.05],[.6,-2.35],[-.2,-2.15],[-.85,-1.85],[-1.3,-1.15],[-2,-.65],[-2.5,.2],[-2.75,1.05]];
  const shape=new THREE.Shape();coords.forEach(([x,y],i)=>i===0?shape.moveTo(x,y):shape.lineTo(x,y));shape.closePath();
  return shape;
}
function addMapStateMarkers(scene: THREE.Scene, onSelect: (state:string)=>void) {
  const positions:[number,number][]=[
    [-1.9,1.45],[-.35,1.75],[1.65,-1.5],[.3,-.95],[-.15,1.45],[1.15,-1.8],[-.1,-.2],[1.8,1.15],[2,-.9],[.55,-1.3],[.2,-.65],[.8,-.5],[-.9,-.45],[-.25,-.55],[-.05,.2],[.5,.9],[-.4,-.85],[-.45,1.35],[-.85,.95],[-.1,1.15],[-.75,1.5],[-1.8,.5],[-.45,-.05],[-1.45,-.2],[1.25,-1.5],[-.05,.45],[-1.15,.4],[-1.5,-.7],[-1.2,-1.1],[-.65,-.8],[-.95,-.5],[.4,.35],[.8,-1.55],[-2,1.05],[.15,-1.05],[1.05,.9],[-1.5,.9]
  ];
  const group=new THREE.Group();group.name='state-markers';
  states.forEach((name,i)=>{
    const [x,z]=positions[i];const unlocked=name==='Lagos'||name==='FCT';
    const marker=new THREE.Mesh(new THREE.CylinderGeometry(.105,.15,.16,12),new THREE.MeshStandardMaterial({color:unlocked?'#b8a3ff':'#45516d',emissive:unlocked?'#7049ff':'#111827',emissiveIntensity:unlocked?.8:.1,metalness:.35,roughness:.35}));
    marker.position.set(x, .25, z);marker.userData.state=name;group.add(marker);
    const halo=new THREE.Mesh(new THREE.TorusGeometry(.19,.025,5,20),new THREE.MeshBasicMaterial({color:unlocked?'#c4b5fd':'#718096'}));halo.rotation.x=Math.PI/2;halo.position.set(x,.36,z);halo.userData.state=name;group.add(halo);
  });
  scene.add(group);return group;
}

export default function NaijaRush({ onExit }: { onExit:()=>void }) {
  const mount=useRef<HTMLDivElement>(null),mapMount=useRef<HTMLDivElement>(null);
  const [mode,setMode]=useState<Mode>('hub'),[trackIndex,setTrackIndex]=useState(0),[selectedState,setSelectedState]=useState('Lagos'),[quality,setQuality]=useState<Quality>('Auto'),[sound,setSound]=useState(true),[speed,setSpeed]=useState(0),[lap,setLap]=useState(1),[position,setPosition]=useState(1),[raceSeconds,setRaceSeconds]=useState(0),[countdown,setCountdown]=useState(3),[finished,setFinished]=useState(false),[fps,setFps]=useState(0),[rendererLabel,setRendererLabel]=useState('Preparing graphics…'),[mapSelected,setMapSelected]=useState('Lagos'),[raceMessage,setRaceMessage]=useState('GET READY'),[steer,setSteer]=useState(0),[boost,setBoost]=useState(false),[drift,setDrift]=useState(false),[autoAccel,setAutoAccel]=useState(true),[gameError,setGameError]=useState('');
  const keys=useRef({left:false,right:false,gas:false,brake:false,boost:false,drift:false});
  const raceData=useRef({speed:0,angle:0,progress:0,lap:1,seconds:0,last:0,frames:0,fpsTime:0,finished:false,steer:0,boost:false,drift:false,auto:true});
  const selectedTrack=tracks[trackIndex];
  const enterRace=useCallback(()=>{setMode('race');setFinished(false);setSpeed(0);setLap(1);setPosition(1);setRaceSeconds(0);setCountdown(3);setRaceMessage('GET READY');raceData.current={speed:0,angle:0,progress:0,lap:1,seconds:0,last:0,frames:0,fpsTime:0,finished:false,steer:0,boost:false,drift:false,auto:true};keys.current={left:false,right:false,gas:false,brake:false,boost:false,drift:false}},[]);
  useEffect(()=>{
    if(mode!=='race'||!mount.current)return;
    let cancelled=false,renderer:any,scene:THREE.Scene,camera:THREE.PerspectiveCamera,raf=0,car:THREE.Group,opponents:THREE.Group[]=[],resize=()=>{};
    const container=mount.current;
    const init=async()=>{
      try {
        const sceneLocal=new THREE.Scene();sceneLocal.background=new THREE.Color('#080d1a');sceneLocal.fog=new THREE.Fog('#080d1a',28,58);scene=sceneLocal;
        camera=new THREE.PerspectiveCamera(58,container.clientWidth/Math.max(container.clientHeight,1),.1,150);camera.position.set(0,7,14);
        const ambient=new THREE.HemisphereLight(0xb8c5ff,0x101827,2.1);scene.add(ambient);
        const key=new THREE.DirectionalLight(0xffffff,2.4);key.position.set(-6,12,4);scene.add(key);
        buildTrack(scene);
        car=makeCar('#9b7bff',true);car.position.set(0,0,-11.25);scene.add(car);
        for(let i=0;i<3;i++){const opponent=makeCar(colors[i+1]);scene.add(opponent);opponents.push(opponent)}
        try {
          const webgpu=await import('three/webgpu');
          const candidate=new webgpu.WebGPURenderer({antialias:quality==='Low'||quality==='Data-saver'?false:true, powerPreference:'high-performance'});
          await candidate.init();
          if(cancelled){candidate.dispose();return;}
          renderer=candidate;setRendererLabel('WebGPU / WebGL 2 adaptive renderer');
        } catch {
          if(cancelled)return;
          renderer=new THREE.WebGLRenderer({antialias:quality!=='Low'&&quality!=='Data-saver',powerPreference:'high-performance',alpha:false});
          setRendererLabel('WebGL 2 compatibility renderer');
        }
        if(cancelled){renderer?.dispose();return}
        renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,quality==='Ultra'?1.75:quality==='High'?1.5:1.15));
        renderer.setSize(container.clientWidth,container.clientHeight);container.replaceChildren(renderer.domElement);
        resize=()=>{if(!container.clientWidth||!container.clientHeight)return;camera.aspect=container.clientWidth/container.clientHeight;camera.updateProjectionMatrix();renderer.setSize(container.clientWidth,container.clientHeight);};
        window.addEventListener('resize',resize);
        const clock=new THREE.Clock();let lastFps=performance.now(),frames=0;
        renderer.setAnimationLoop(()=>{
          if(cancelled||document.hidden)return;
          const dt=Math.min(clock.getDelta(),.05),d=raceData.current;
          if(countdown>0){/* UI countdown handles the start gate */}
          if(!d.finished){
            const input=keys.current;const steering=(input.left?-1:0)+(input.right?1:0)+d.steer;
            const accel=input.gas||d.auto?10:0,brake=input.brake?15:0;
            d.speed=Math.max(0,Math.min(quality==='Low'||quality==='Data-saver'?34:48,d.speed+(accel-brake-d.speed*.65+(input.boost||d.boost?13:0))*dt));
            d.angle+=steering*dt*(.8+d.speed/30)*(input.drift||d.drift?1.45:1);
            if(input.drift||d.drift)d.speed=Math.max(0,d.speed-2.5*dt);
            d.progress+=d.speed*dt*.018;
            d.seconds+=dt;
            d.lap=Math.floor(d.progress/(Math.PI*2))+1;
            if(d.lap>selectedTrack.laps){d.finished=true;setFinished(true);setRaceMessage('FINISH!');}
            car.position.set(Math.sin(d.progress)*11.25,0,Math.cos(d.progress)*11.25);
            car.rotation.y=-d.progress+Math.PI+d.angle*.12;
            const target=new THREE.Vector3(car.position.x+Math.sin(d.progress)*4,3.6,car.position.z+Math.cos(d.progress)*5+4);
            camera.position.lerp(target,.055);camera.lookAt(car.position.x,0,car.position.z);
            opponents.forEach((opp,i)=>{const progress=d.progress*(.86+i*.09)+i*1.4;opp.position.set(Math.sin(progress)*11.25,0,Math.cos(progress)*11.25);opp.rotation.y=-progress+Math.PI;});
            setSpeed(Math.round(d.speed*5.2));setLap(Math.min(d.lap,selectedTrack.laps));setRaceSeconds(Math.floor(d.seconds));setPosition(1+opponents.filter((_,i)=>d.progress*(.86+i*.09)+i*1.4>d.progress).length);
          }
          renderer.render(scene,camera);
          frames++;if(performance.now()-lastFps>1000){setFps(Math.round(frames*1000/(performance.now()-lastFps)));frames=0;lastFps=performance.now();}
        });
        setGameError('');
      } catch(err){setGameError(err instanceof Error?err.message:'3D graphics could not start on this device. Try Low quality or update Chrome.');setRendererLabel('Graphics unavailable');}
    };
    void init();
    return()=>{cancelled=true;window.removeEventListener('resize',resize);if(renderer){renderer.setAnimationLoop(null);renderer.dispose()}if(scene){scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const m=o.material;if(Array.isArray(m))m.forEach(x=>x.dispose());else m.dispose()}})}if(raf)cancelAnimationFrame(raf);container.replaceChildren()};
  },[mode,quality,selectedTrack.laps,countdown]);
  useEffect(()=>{
    if(mode!=='map'||!mapMount.current)return;
    let cancelled=false,renderer:THREE.WebGLRenderer|undefined,scene:THREE.Scene|undefined,raf=0;
    const el=mapMount.current;
    const init=async()=>{
      try{
        scene=new THREE.Scene();scene.background=new THREE.Color('#0a1020');
        const camera=new THREE.PerspectiveCamera(38,el.clientWidth/Math.max(1,el.clientHeight),.1,100);camera.position.set(0,7,10);camera.lookAt(0,0,0);
        scene.add(new THREE.HemisphereLight(0xc4b5fd,0x111827,2));
        const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(-5,9,7);scene.add(light);
        const shape=makeNigeriaShape();
        const geometry=new THREE.ExtrudeGeometry(shape,{depth:.42,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.07,bevelThickness:.06,curveSegments:3});
        geometry.rotateX(-Math.PI/2);
        const land=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:'#30245b',metalness:.28,roughness:.48,emissive:'#24134f',emissiveIntensity:.5}));land.position.y=.05;scene.add(land);
        const outline=new THREE.LineSegments(new THREE.EdgesGeometry(geometry,25),new THREE.LineBasicMaterial({color:'#b6a0ff'}));outline.position.y=.08;scene.add(outline);
        const markers=addMapStateMarkers(scene,()=>{});
        // Rivers are stylized lines to establish the map's geography.
        const riverMat=new THREE.LineBasicMaterial({color:'#38bdf8',transparent:true,opacity:.9});
        for(const points of [[[-.8,-.25, .6],[-.3,-.3,.15],[.1,-.28,-.15],[.45,-.25,-.65]], [[-.8,-.25,.6],[-.5,-.28,.2],[-.2,-.28,-.1],[.1,-.28,-.15]]] as number[][][]){
          const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(p[0],p[1],p[2]))),riverMat);scene.add(line);
        }
        const water=new THREE.Mesh(new THREE.PlaneGeometry(18,18),new THREE.MeshStandardMaterial({color:'#0c1b36',roughness:.25,metalness:.2}));water.rotation.x=-Math.PI/2;water.position.y=-.6;scene.add(water);
        if(cancelled)return;
        renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.4));renderer.setSize(el.clientWidth,el.clientHeight);el.replaceChildren(renderer.domElement);
        const resize=()=>{if(!renderer||!el.clientWidth||!el.clientHeight)return;camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight)};
        window.addEventListener('resize',resize);
        const animate=()=>{if(cancelled)return;raf=requestAnimationFrame(animate);if(document.hidden)return;markers.rotation.y+=.0007;renderer?.render(scene!,camera)};
        animate();
        return()=>window.removeEventListener('resize',resize);
      }catch(err){setGameError(err instanceof Error?err.message:'Map graphics could not load.');}
    };
    let cleanup:undefined|(()=>void);void init().then(c=>cleanup=c);
    return()=>{cancelled=true;cleanup?.();cancelAnimationFrame(raf);renderer?.dispose();el.replaceChildren()};
  },[mode]);
  useEffect(()=>{
    if(mode!=='race'||finished)return;
    const id=window.setInterval(()=>setCountdown(c=>{if(c<=1){setRaceMessage('GO!');return 0}setRaceMessage(String(c-1));return c-1}),900);
    return()=>window.clearInterval(id);
  },[mode,finished]);
  useEffect(()=>{
    if(mode!=='race')return;
    const down=(e:KeyboardEvent)=>{const k=e.key.toLowerCase();if(['arrowleft','arrowright','arrowup','arrowdown',' ','shift','a','d','w','s'].includes(k))e.preventDefault();if(k==='arrowleft'||k==='a')keys.current.left=true;if(k==='arrowright'||k==='d')keys.current.right=true;if(k==='arrowup'||k==='w')keys.current.gas=true;if(k==='arrowdown'||k==='s')keys.current.brake=true;if(k===' ')keys.current.boost=true;if(k==='shift')keys.current.drift=true;};
    const up=(e:KeyboardEvent)=>{const k=e.key.toLowerCase();if(k==='arrowleft'||k==='a')keys.current.left=false;if(k==='arrowright'||k==='d')keys.current.right=false;if(k==='arrowup'||k==='w')keys.current.gas=false;if(k==='arrowdown'||k==='s')keys.current.brake=false;if(k===' ')keys.current.boost=false;if(k==='shift')keys.current.drift=false;};
    window.addEventListener('keydown',down,{passive:false});window.addEventListener('keyup',up);
    return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up)};
  },[mode]);
  const hold=(key:'left'|'right'|'gas'|'brake'|'boost'|'drift',v:boolean)=>{keys.current[key]=v};
  const startRace=()=>{enterRace();};
  const openMap=()=>setMode('map');
  const chooseState=(name:string)=>{setSelectedState(name);setMapSelected(name);const idx=tracks.findIndex(t=>t.place===name);if(idx>=0)setTrackIndex(idx);};
  return <div className="naija-rush">
    <header className="rush-header"><button className="rush-back" onClick={mode==='hub'?onExit:()=>setMode('hub')} aria-label="Back"><ArrowLeft size={19}/></button><div className="rush-logo"><span>NR</span><div><b>NAIJA RUSH</b><small>VIBE.LY ORIGINAL</small></div></div><div className="rush-head-meta"><span className="rush-pill"><Zap size={13}/> ARCADE RACING</span><button onClick={()=>setSound(!sound)} aria-label={sound?'Mute game':'Enable game sound'}>{sound?<Volume2 size={17}/>:<VolumeX size={17}/>}</button></div></header>
    {mode==='hub'&&<div className="rush-hub">
      <section className="rush-hero"><div className="rush-hero-copy"><span className="rush-kicker">YOUR NEXT OBSESSION STARTS HERE</span><h1>Own the road.<br/><em>Rep your state.</em></h1><p>Neon nights. Naija roads. Your name on the leaderboard.</p><div className="rush-hero-actions"><button className="rush-primary" onClick={startRace}><Gamepad2 size={17}/> Race now <span>→</span></button><button className="rush-secondary" onClick={openMap}><MapPin size={16}/> Explore Nigeria</button></div><div className="rush-hero-stats"><div><b>01</b><small>PLAYABLE TRACK</small></div><div><b>03</b><small>AI RIVALS</small></div><div><b>37</b><small>STATE DESTINATIONS</small></div></div></div><div className="rush-hero-art"><div className="rush-orbit orbit-a"/><div className="rush-orbit orbit-b"/><div className="rush-car-art"><span className="car-glow"/><div className="car-roof"/><div className="car-window"/><div className="car-body"/><div className="car-light"/><div className="car-wheel wheel-a"/><div className="car-wheel wheel-b"/></div><span className="rush-art-label">LAGOS · 01</span><span className="rush-art-speed">NITRO <b>ON</b></span></div></section>
      <section className="rush-section-head"><div><span className="rush-kicker">PICK YOUR PLAYGROUND</span><h2>Featured circuits</h2></div><button onClick={openMap}>View Nigeria map →</button></section>
      <section className="rush-track-grid">{tracks.slice(0,4).map((t,i)=><button key={t.name} className={'rush-track-card '+(!t.unlocked?'locked':'')} onClick={()=>{setTrackIndex(i);setSelectedState(t.place);if(t.unlocked)startRace();else openMap()}}><div className="rush-track-art" style={{'--track-color':t.color} as React.CSSProperties}><span>{String(i+1).padStart(2,'0')}</span><div className="rush-mini-track"/><i>{t.unlocked?'RACE AVAILABLE':'COMING SOON'}</i></div><div className="rush-track-info"><b>{t.name}</b><small><MapPin size={12}/>{t.place} · {t.time}</small></div></button>)}</section>
      <section className="rush-bottom-grid"><article className="rush-panel"><span className="rush-kicker">YOUR GARAGE</span><h3>Midnight Runner</h3><p>Your starter ride. Built for tight corners and neon-lit sprints.</p><div className="rush-car-stat"><span>TOP SPEED</span><i><b style={{width:'74%'}}/></i><strong>74</strong></div><div className="rush-car-stat"><span>HANDLING</span><i><b style={{width:'82%'}}/></i><strong>82</strong></div><div className="rush-car-stat"><span>NITRO</span><i><b style={{width:'68%'}}/></i><strong>68</strong></div><button className="rush-secondary" onClick={startRace}>Take it for a spin →</button></article><article className="rush-panel rush-leaderboard"><span className="rush-kicker">RACE PREVIEW</span><h3>First to the finish.</h3><p>Beat three AI drivers around the Lagos night circuit. Master the corners, save nitro for the straight.</p><div className="rush-driver"><span>01</span><div><b>You</b><small>Midnight Runner</small></div><strong>YOU</strong></div><div className="rush-driver"><span>02</span><div><b>Turbo Tobi</b><small>Street sprinter</small></div><strong>AI</strong></div><div className="rush-driver"><span>03</span><div><b>Amaka Drift</b><small>Drift specialist</small></div><strong>AI</strong></div><div className="rush-driver"><span>04</span><div><b>Kano Comet</b><small>Patient tactician</small></div><strong>AI</strong></div></article></section>
      <p className="rush-footnote">Early access build · Solo racing is playable now. Online racing and rewards are not enabled yet.</p>
    </div>}
    {mode==='map'&&<div className="rush-map-page"><div className="rush-page-heading"><div><span className="rush-kicker">LEVEL SELECT</span><h1>Choose your <em>state.</em></h1><p>Explore Nigeria and pick your next racing destination.</p></div><div className="rush-progress"><b>2 / 37</b><small>DESTINATIONS OPEN</small><div><i/></div></div></div><div className="rush-map-layout"><div className="rush-map-scene"><div ref={mapMount} className="rush-map-canvas"/><div className="rush-map-label map-label-north">NORTH</div><div className="rush-map-label map-label-coast">GULF OF GUINEA</div><div className="rush-map-attribution">Generalized Nigeria overview · Natural Earth source planned for boundary-accurate release</div></div><aside className="rush-state-panel"><span className="rush-kicker">SELECTED DESTINATION</span><h2>{mapSelected}</h2><p>{tracks.find(t=>t.place===mapSelected)?.name||'Discover a future Naija Rush circuit in this destination.'}</p><div className="rush-state-meta"><span><MapPin size={14}/> Nigeria</span><span><Trophy size={14}/> State Cup · coming soon</span></div><div className="rush-state-list">{states.map((name,i)=><button key={name} className={mapSelected===name?'selected':''} onClick={()=>chooseState(name)}><span>{String(i+1).padStart(2,'0')}</span>{name}{(name==='Lagos'||name==='FCT')?<i>OPEN</i>:<small>LOCKED</small>}</button>)}</div><button className="rush-primary rush-full" onClick={()=>{const i=tracks.findIndex(t=>t.place===mapSelected);if(i>=0&&tracks[i].unlocked){setTrackIndex(i);startRace()}else setGameError('This destination is planned for a future update. Lagos Island Sprint is playable now.')}}>Race this destination →</button></aside></div></div>}
    {mode==='race'&&<div className="rush-race-page"><div className="rush-race-toolbar"><div><span className="rush-kicker">LIVE RACE · {selectedTrack.type}</span><b>{selectedTrack.name}</b><small>{rendererLabel}</small></div><label>Graphics<select value={quality} onChange={e=>setQuality(e.target.value as Quality)}>{(['Auto','Ultra','High','Medium','Low','Data-saver'] as Quality[]).map(q=><option key={q}>{q}</option>)}</select></label></div><div className="rush-race-stage"><div ref={mount} className="rush-race-canvas"/><div className="rush-hud rush-hud-top"><div className="rush-hud-box"><small>LAP</small><b>{Math.min(lap,selectedTrack.laps)}<i>/{selectedTrack.laps}</i></b></div><div className="rush-hud-box"><small>POSITION</small><b>{position}<i>/4</i></b></div><div className="rush-hud-box"><small>TIME</small><b>{Math.floor(raceSeconds/60).toString().padStart(2,'0')}:{(raceSeconds%60).toString().padStart(2,'0')}</b></div></div><div className="rush-race-center">{countdown>0&&!finished&&<div className="rush-countdown">{countdown}</div>}{finished&&<div className="rush-finish-banner"><Trophy size={28}/><b>FINISH!</b><span>Race complete</span><button className="rush-primary" onClick={()=>setMode('results')}>See results →</button></div>}{gameError&&<div className="rush-game-error">{gameError}<button onClick={()=>setGameError('')}>Dismiss</button></div>}</div><div className="rush-speed"><Gauge size={16}/><b>{speed}</b><small>KM/H</small></div><div className="rush-controls"><div className="rush-steering"><button aria-label="Steer left" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);hold('left',true)}} onPointerUp={()=>hold('left',false)} onPointerCancel={()=>hold('left',false)}><ArrowLeft/></button><button aria-label="Steer right" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);hold('right',true)}} onPointerUp={()=>hold('right',false)} onPointerCancel={()=>hold('right',false)}><ArrowRight/></button></div><div className="rush-action-controls"><button className="rush-drift" onPointerDown={()=>hold('drift',true)} onPointerUp={()=>hold('drift',false)} onPointerCancel={()=>hold('drift',false)}>DRIFT</button><button className="rush-nitro" onPointerDown={()=>hold('boost',true)} onPointerUp={()=>hold('boost',false)} onPointerCancel={()=>hold('boost',false)}><Zap size={16}/> NITRO</button><button className="rush-gas" onPointerDown={()=>hold('gas',true)} onPointerUp={()=>hold('gas',false)} onPointerCancel={()=>hold('gas',false)}>GO</button></div></div><div className="rush-race-bottom"><label><input type="checkbox" checked={autoAccel} onChange={e=>{setAutoAccel(e.target.checked);raceData.current.auto=e.target.checked}}/> Auto-accelerate</label><span>{fps||'--'} FPS · {quality==='Auto'?'AUTO QUALITY':quality.toUpperCase()}</span><button onClick={()=>setMode('hub')}><RotateCcw size={14}/> Exit race</button></div></div><p className="rush-race-help">Keyboard: WASD / arrows to steer and brake · Space: nitro · Shift: drift</p></div>}
    {mode==='results'&&<div className="rush-results"><div className="rush-results-trophy">🏆</div><span className="rush-kicker">LAGOS ISLAND SPRINT</span><h1>Race <em>complete.</em></h1><p>Your first run is in the books. Keep practicing to master the corners.</p><div className="rush-result-stats"><div><small>FINISH POSITION</small><b>#{position}</b></div><div><small>RACE TIME</small><b>{Math.floor(raceSeconds/60).toString().padStart(2,'0')}:{(raceSeconds%60).toString().padStart(2,'0')}</b></div><div><small>BEST LAP</small><b>Practice</b></div></div><div className="rush-results-actions"><button className="rush-primary" onClick={startRace}><RotateCcw size={16}/> Race again</button><button className="rush-secondary" onClick={openMap}><MapPin size={16}/> Choose a state</button><button className="rush-secondary" onClick={onExit}>Back to Vibe.ly</button></div><p className="rush-footnote">Results are local demo data in this phase. Server-verified records and Vibe Coins will arrive in later phases.</p></div>}
  </div>;
}
