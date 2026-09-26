'use strict';
(() => {
 const cfg=window.APP_CONFIG,$=id=>document.getElementById(id);
 let imported=false,sourceVersion=0;try{const saved=JSON.parse(localStorage.getItem('chapel-event')||'null');if(saved){cfg.dataSource.liveDataUrl=saved.source;cfg.qrCode.url=saved.form}}catch(e){console.warn('Event settings unavailable',e)}
 let data=null,loading=false,frame=0,run=0,reduced=new URLSearchParams(location.search).get('motion')==='reduced';
 const setStatus=text=>$('status').textContent=text;
 function controls(busy){$('play').disabled=!!busy;$('replay').disabled=!!busy}
 const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
 const scene=document.querySelector('.scene');

 // ---- artwork geometry (px in the 1792x1008 house image) ----
 const AW=1792,AH=1008,pct=(v,d)=>(v/d*100).toFixed(3)+'%';
 // six tall windows + door transom carry the seven scored questions, left to right
 const WIN=[{cx:258,q:0},{cx:419,q:1},{cx:582,q:2},{cx:896,q:3,transom:true},{cx:1214,q:4},{cx:1372,q:5},{cx:1529,q:6}];
 const GLASS={w:70,top:598,h:192},TRANSOM={w:100,top:592,h:40};
 const BAND_TOP=598,BAND_H=192/5;

 // ---- sparks ----
 const sparks=document.createElement('div');sparks.id='sparks';
 const canvas=document.createElement('canvas');sparks.append(canvas);scene.append(sparks);
 const ctx=canvas.getContext('2d');let bits=[];
 function sizeCanvas(){const r=scene.getBoundingClientRect(),d=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.max(2,Math.floor(r.width*d));canvas.height=Math.max(2,Math.floor(r.height*d))}
 function burst(xPct,yPct,count){
  if(reduced)return;sizeCanvas();
  const w=canvas.width,h=canvas.height,cx=w*xPct/100,cy=h*yPct/100;
  for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,spd=(0.012+Math.random()*0.028)*Math.min(w,h);bits.push({x:cx,y:cy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-spd*0.15,life:1,decay:0.012+Math.random()*0.01,r:2+Math.random()*5,gold:Math.random()})}
 }
 function drawBits(){
  if(!ctx)return;ctx.clearRect(0,0,canvas.width,canvas.height);bits=bits.filter(p=>p.life>0);
  bits.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.04;p.vx*=0.99;p.life-=p.decay;ctx.globalAlpha=Math.max(0,p.life);const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*4);g.addColorStop(0,'#fff8d2');g.addColorStop(0.35,p.gold>.4?'#ffd24a':'#ffe9a0');g.addColorStop(1,'rgba(255,160,40,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,p.r*4,0,Math.PI*2);ctx.fill()});
  ctx.globalAlpha=1;
 }
 function clearSparks(){bits=[];if(ctx)ctx.clearRect(0,0,canvas.width,canvas.height)}

 // ---- reveal video (carries the lighting, the rays and the sound) ----
 const vid=document.createElement('video');
 vid.id='reveal-video';vid.src='assets/chapel-reveal.mp4?v=house8';
 vid.playsInline=true;vid.muted=false;vid.preload='auto';vid.setAttribute('playsinline','');
 vid.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;opacity:0;pointer-events:none;';
 scene.append(vid);
 let hasVideo=false;
 vid.addEventListener('canplaythrough',()=>{hasVideo=true});vid.addEventListener('loadeddata',()=>{hasVideo=true});
 let soundOn=true,pctTarget=null;
 const countTo=p=>{if(pctTarget!=null)$('percentage').textContent=Math.round(pctTarget*ease(p))+'%'};

 // ---- labels on the house: question chips, team names, score legend ----
 function buildLabels(){
  const L=$('labels');L.replaceChildren();
  WIN.forEach(w=>{const q=cfg.scoredQuestionOrder[w.q],chip=document.createElement('span');chip.className='qchip';chip.style.left=pct(w.cx,AW);chip.style.top=pct(w.transom?566:566,AH);chip.textContent=cfg.columns[q].shortLabel||q;L.append(chip)});
  cfg.teams.forEach((team,i)=>{const t=document.createElement('span');t.className='tlabel';t.style.top=pct(BAND_TOP+(i+.5)*BAND_H,AH);t.textContent=team.shortName||team.name;L.append(t)});
  const lg=document.createElement('div');lg.id='legend';
  const names={1:'Low confidence',2:'',3:'',4:'',5:'High confidence'};
  for(let s=1;s<=5;s++){const d=document.createElement('div'),i=document.createElement('i');i.style.background=ColorUtils.scoreToColor(s,cfg);d.append(i,document.createTextNode(s+(names[s]?' – '+names[s]:'')));lg.append(d)}
  L.append(lg);
 }
 // ---- score colours: painted facets kept, hue from live scores, 5 team bands blended top to bottom ----
 const tcv=document.createElement('canvas');tcv.id='tintcv';tcv.setAttribute('aria-hidden','true');scene.append(tcv);
 // seconds in chapel-reveal.mp4 when each window lights: [start,duration] (window order = WIN order)
 const LIGHT=[[3.95,.9],[4.30,.9],[2.55,.9],[7.10,.8],[3.20,.8],[2.10,.9],[3.05,.8]];
 let tiles=[],litReady=false,tintFull=false;
 const hexRgb=h=>{const m=h.replace('#','').match(/../g).map(v=>parseInt(v,16));return m};
 function bandColor(cols,f){ // f 0..1 across the 5 bands, short soft blend at each boundary
  const pos=f*5,i=Math.min(4,Math.floor(pos)),frac=pos-i,soft=.3;let c=cols[i];
  if(frac<soft&&i>0){const t=.5+frac/(soft*2);c=cols[i-1].map((v,k)=>v+(cols[i][k]-v)*t)}
  else if(frac>1-soft&&i<4){const t=(frac-(1-soft))/(soft*2);c=cols[i].map((v,k)=>v+(cols[i+1][k]-v)*t)}
  return c;
 }
 function paintTiles(next){
  if(!litReady||!next)return;const lit=$('lit'),src=document.createElement('canvas');src.width=AW;src.height=AH;const sx=src.getContext('2d',{willReadFrequently:true});sx.drawImage(lit,0,0,AW,AH);
  tiles=WIN.map(w=>{
   const g=w.transom?TRANSOM:GLASS,x0=Math.round(w.cx-g.w/2),y0=g.top,tw=g.w,th=g.h,img=sx.getImageData(x0,y0,tw,th),d=img.data;
   const q=cfg.scoredQuestionOrder[w.q],cols=cfg.teams.map(t=>{const v=next.teamAverages[t.id]&&next.teamAverages[t.id][q];return hexRgb(v==null?'#8d929a':ColorUtils.scoreToColor(v,cfg))});
   let mean=0;for(let i=0;i<d.length;i+=4)mean+=(d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722)/255;mean/=d.length/4;
   for(let y=0;y<th;y++)for(let x=0;x<tw;x++){
    const p=(y*tw+x)*4,l=(d[p]*.2126+d[p+1]*.7152+d[p+2]*.0722)/255,f=w.transom?x/tw:y/th,c=bandColor(cols,Math.min(.999,f));
    const shade=Math.max(.35,Math.min(1.12,.86+(l-mean)*2.4)),hi=Math.max(0,l-.86)*140;
    for(let k=0;k<3;k++)d[p+k]=Math.min(255,c[k]*shade+hi);
   }
   const t=document.createElement('canvas');t.width=tw;t.height=th;t.getContext('2d').putImageData(img,0,0);
   return{t,x:x0,y:y0,w:tw,h:th,transom:!!w.transom};
  });
 }
 function drawTints(sec){
  const r=scene.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1),W=Math.max(2,Math.floor(r.width*dpr)),H=Math.max(2,Math.floor(r.height*dpr));
  if(tcv.width!==W||tcv.height!==H){tcv.width=W;tcv.height=H}
  const c=tcv.getContext('2d');c.clearRect(0,0,W,H);if(sec==null||!tiles.length)return;
  tiles.forEach((tile,i)=>{
   const a=sec>=99?1:ease((sec-LIGHT[i][0])/LIGHT[i][1]);if(a<=0)return;
   c.save();c.globalAlpha=a;const X=tile.x/AW*W,Y=tile.y/AH*H,TW=tile.w/AW*W,TH=tile.h/AH*H;
   if(tile.transom){c.beginPath();c.ellipse(X+TW/2,Y+TH,TW/2,TH,0,Math.PI,2*Math.PI);c.clip()}
   c.drawImage(tile.t,X,Y,TW,TH);c.restore();
  });
 }
 function fitRose(){const r=$('rose'),len=Math.max(1,(r.textContent||'').length),w=scene.getBoundingClientRect().width;r.style.fontSize=Math.max(.9,Math.min(2.6,6.0/(.56*len)))+'cqw';r.style.width='7.2%'}

 function render(next){
  data=next;window.__TEAM_PULSE_PROCESSED__=next;
  const words=(next.q10Ranked||[]).filter(x=>x&&typeof x.word==='string').slice().sort((a,b)=>b.count-a.count||a.word.localeCompare(b.word));
  $('rose').textContent=words.length?words[0].word:'';fitRose();
  pctTarget=next.q8Total?+next.q8Percentage:null;if(!document.body.classList.contains('animating'))$('percentage').textContent=pctTarget==null?'—':pctTarget+'%';
  $('door').lastElementChild.textContent=next.q8Total?'trust their team':'No responses yet';
  paintTiles(next);if(document.body.classList.contains('revealed'))drawTints(99);
  const table=$('scores');table.replaceChildren();const head=document.createElement('thead'),row=document.createElement('tr');
  for(const text of ['Team',...cfg.scoredQuestionOrder.map(q=>cfg.columns[q].shortLabel||q)]){const th=document.createElement('th');th.scope='col';th.textContent=text;row.append(th)}head.append(row);table.append(head);
  const body=document.createElement('tbody');
  for(const team of cfg.teams){const tr=document.createElement('tr'),th=document.createElement('th');th.scope='row';th.textContent=team.shortName||team.name;tr.append(th);for(const q of cfg.scoredQuestionOrder){const td=document.createElement('td'),span=document.createElement('span'),v=next.teamAverages[team.id][q];span.className='score';span.textContent=v==null?'—':v.toFixed(1);if(v!=null)span.style.setProperty('--score-color',ColorUtils.scoreToColor(v,cfg));td.append(span);tr.append(td)}body.append(tr)}table.append(body);
  window.dispatchEvent(new CustomEvent('team-pulse:data',{detail:next}));
 }
 async function refresh(){
  if(loading||imported)return;loading=true;const version=sourceVersion;$('refresh').disabled=true;
  try{const source=await DataSource.load();if(version!==sourceVersion||imported)return;if(source.source!=='live')throw Error('Live source is not configured');render(source.aggregated?DataProcessing.fromAggregated(source.aggregated,cfg):DataProcessing.process(source.rows,cfg));if(!document.body.classList.contains('animating'))setStatus('Live results updated · '+data.usedRows+' responses');}
  catch(error){console.error(error);setStatus(data?'Update unavailable. Showing the last confirmed results.':'Survey connection unavailable. Use Refresh results to retry.');}
  finally{loading=false;$('refresh').disabled=false;if(!document.body.classList.contains('animating'))controls(false)}
 }
 function hideResults(){if(pctTarget!=null)$('percentage').textContent='0%';$('door').style.opacity='0';$('rose').style.opacity='0';drawTints(null)}
 function reset(){run++;cancelAnimationFrame(frame);try{vid.pause();vid.currentTime=0}catch(e){}vid.style.opacity='0';$('lit').style.opacity='0';hideResults();clearSparks();document.body.classList.remove('presenting','revealed','animating');controls(false);setStatus('Ready for the next reveal.');}
 async function reveal(){
  if(!data){controls(true);setStatus('Loading live results…');const t0=Date.now();refresh();while(!data&&Date.now()-t0<30000)await new Promise(r=>setTimeout(r,250));controls(false)}
  document.body.classList.add('presenting','animating');controls(true);setStatus('Revealing team confidence…');
  vid.style.opacity='0';$('lit').style.opacity='0';hideResults();clearSparks();sizeCanvas();
  const token=++run,start=performance.now(),useVid=!reduced&&(hasVideo||vid.readyState>=2);
  vid.muted=!soundOn;
  if(useVid){vid.style.opacity='1';vid.currentTime=0;vid.play().catch(()=>{})}
  const duration=reduced?1000:(useVid?12000:6000);
  const pops=[{t:10000,x:50,y:33.3,n:24},{t:10000,x:50,y:70,n:28}];const fired=pops.map(()=>false);
  function tick(now){if(token!==run)return;
   const wall=now-start,vt=useVid&&vid.currentTime>0?vid.currentTime*1000:wall,elapsed=useVid?vt:wall;
   if(!reduced)pops.forEach((p,i)=>{if(!fired[i]&&elapsed>=p.t){fired[i]=true;burst(p.x,p.y,p.n)}});
   drawBits();drawTints(reduced||!useVid?99:elapsed/1000);
   if(reduced){const t=Math.min(1,wall/duration);countTo(t);$('lit').style.opacity=String(t);$('door').style.opacity=String(ease(t));$('rose').style.opacity=String(ease(t))}
   else if(!useVid){const s=elapsed/1000;countTo((s-3.6)/1.6);$('lit').style.opacity=String(ease((s-1)/3));$('door').style.opacity=String(ease((s-3.6)/1.1));$('rose').style.opacity=String(ease((s-4.6)/1))}
   else{const sec=elapsed/1000;countTo((sec-8.1)/1.7);$('door').style.opacity=String(ease((sec-8)/1.1));$('rose').style.opacity=String(ease((sec-9)/1))}
   const done=useVid?(vid.ended||elapsed>=duration+400):wall>=duration;
   if(!done)frame=requestAnimationFrame(tick);
   else{drawBits();if(useVid){try{vid.pause();vid.currentTime=Math.max(0,(vid.duration||12)-.05)}catch(e){}}$('door').style.opacity='1';$('rose').style.opacity='1';countTo(1);drawTints(99);document.body.classList.remove('animating');document.body.classList.add('revealed');controls(false);setStatus('Live results · '+(data&&data.usedRows||0)+' responses')}}
  frame=requestAnimationFrame(tick);
 }
 $('play').onclick=reveal;$('replay').onclick=reveal;$('reset').onclick=reset;$('refresh').onclick=refresh;
 function motionLabel(){$('access').setAttribute('aria-pressed',String(reduced));$('access').textContent=reduced?'Reduced motion on':'Reduce motion'}motionLabel();$('access').onclick=()=>{reduced=!reduced;motionLabel()};
 QrDisplay.render($('qr'),cfg);$('survey-link').href=cfg.qrCode.url;if(!cfg.qrCode.visible)$('qr').parentElement.hidden=true;
 $('sound').onclick=()=>{soundOn=!soundOn;vid.muted=!soundOn;$('sound').textContent=soundOn?'Sound on':'Sound off';$('sound').setAttribute('aria-pressed',String(!soundOn))};
 $('settings-open').onclick=()=>{$('source-url').value=cfg.dataSource.liveDataUrl;$('form-url').value=cfg.qrCode.url;$('settings').showModal()};
 $('save-settings').onclick=()=>{try{const source=new URL($('source-url').value),form=new URL($('form-url').value);if(source.protocol!=='https:'||form.protocol!=='https:')throw Error('Use HTTPS URLs.');localStorage.setItem('chapel-event',JSON.stringify({source:source.href,form:form.href}));sourceVersion++;cfg.dataSource.liveDataUrl=source.href;cfg.qrCode.url=form.href;imported=false;QrDisplay.render($('qr'),cfg);$('survey-link').href=form.href;$('setup-status').textContent='Connection saved for this browser.';refresh()}catch(e){$('setup-status').textContent=e.message}};
 $('default-settings').onclick=()=>{localStorage.removeItem('chapel-event');location.reload()};
 $('csv-file').onchange=async()=>{const file=$('csv-file').files[0];if(!file)return;try{const next=DataProcessing.process(DataSource.parseCsv(await file.text()),cfg);if(!next.usedRows||next.missingColumns.some(q=>cfg.scoredQuestionOrder.includes(q)||q==='q1_team'))throw Error('CSV headings or team names do not match this survey.');sourceVersion++;imported=true;render(next);controls(false);$('setup-status').textContent='Loaded '+next.usedRows+' responses. This file stays in this browser tab.';setStatus('Imported event · '+next.usedRows+' responses')}catch(e){$('setup-status').textContent=e.message}};
 buildLabels();$('lit').complete&&$('lit').naturalWidth?(litReady=true):$('lit').addEventListener('load',()=>{litReady=true;paintTiles(data);if(document.body.classList.contains('revealed'))drawTints(99)});

 refresh();window.addEventListener('resize',()=>{sizeCanvas();fitRose();if(document.body.classList.contains('revealed'))drawTints(99)});const timer=setInterval(refresh,10000);window.addEventListener('beforeunload',()=>{clearInterval(timer);cancelAnimationFrame(frame)});
})();
