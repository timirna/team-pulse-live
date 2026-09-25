'use strict';
(() => {
 const cfg=window.APP_CONFIG,$=id=>document.getElementById(id);
 let imported=false,sourceVersion=0;try{const saved=JSON.parse(localStorage.getItem('chapel-event')||'null');if(saved){cfg.dataSource.liveDataUrl=saved.source;cfg.qrCode.url=saved.form}}catch(e){console.warn('Event settings unavailable',e)}
 const parts=['house','window_left_1','window_left_2','window_right_3','window_right_2','window_right_1','roof_left_large','roof_left_small','roof_right_large','roof_right_small','rose','door','porch_left','porch_right','path_far_left','path_far_right','path_inner_left','path_inner_right','ivy'];
 let data=null,loading=false,frame=0,run=0,ready=false,reduced=new URLSearchParams(location.search).get('motion')==='reduced';
 const setStatus=text=>$('status').textContent=text;
 function controls(busy){$('play').disabled=busy||!ready||!data;$('replay').disabled=busy||!ready||!data}

 const layers={};
 const cues={path_far_left:[.6,1.3],path_far_right:[.9,1.3],path_inner_left:[1.4,1.3],path_inner_right:[1.7,1.3],window_left_1:[2.6,1.7],window_right_1:[3.2,1.7],window_left_2:[3.8,1.7],window_right_2:[4.4,1.7],window_right_3:[5,1.7],roof_left_small:[5.5,1.4],roof_right_small:[5.7,1.4],roof_left_large:[6,1.5],roof_right_large:[6.2,1.5],porch_left:[6.8,1.3],porch_right:[7,1.3],door:[7.5,2],house:[3,7],ivy:[4,6],rose:[9.5,2.6]};
 const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
 function light(name,v,pulse=0){const structural=name==='house'||name==='ivy';layers[name].style.filter='brightness('+v+')'+(!structural&&pulse>.001?' drop-shadow(0 0 '+(pulse*9).toFixed(2)+'px rgba(255,190,65,'+(pulse*.65).toFixed(3)+'))':'')}
 function brightness(value){for(const name of parts)light(name,value);$('art').style.filter='none'}
 function sceneAt(seconds){for(const name of parts){const [start,length]=cues[name],p=Math.max(0,Math.min(1,(seconds-start)/length)),rise=ease(p),pulse=Math.sin(Math.PI*p);light(name,.18+.82*rise+.15*pulse,pulse)}$('door').style.opacity=String(ease((seconds-8)/1.1));$('rose').style.opacity=String(ease((seconds-9)/1))}

 const scene=document.querySelector('.scene');
 const sparks=document.createElement('div');sparks.id='sparks';if(scene)scene.append(sparks);
 function burst(xPct,yPct,count){
  if(reduced)return;
  const flash=document.createElement('span');
  flash.className='spark flash';
  flash.style.left=xPct+'%';flash.style.top=yPct+'%';
  sparks.append(flash);
  for(let i=0;i<count;i++){
   const p=document.createElement('span');
   p.className='spark';
   const a=Math.random()*Math.PI*2,d=40+Math.random()*90;
   p.style.left=xPct+'%';p.style.top=yPct+'%';
   p.style.setProperty('--dx',(Math.cos(a)*d)+'px');
   p.style.setProperty('--dy',(Math.sin(a)*d)+'px');
   p.style.animationDelay=(Math.random()*80)+'ms';
   sparks.append(p);
  }
  setTimeout(()=>{[...sparks.querySelectorAll('.spark')].forEach(n=>{if(!n.isConnected)return;n.remove()})},1400);
 }
 function clearSparks(){sparks.replaceChildren()}

 const vid=document.createElement('video');
 vid.id='reveal-video';
 vid.src='assets/chapel-reveal.mp4';
 vid.playsInline=true;vid.muted=true;vid.preload='auto';vid.setAttribute('playsinline','');
 vid.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:contain;z-index:1;opacity:0;pointer-events:none;';
 if(scene) scene.append(vid);
 let hasVideo=false;
 vid.addEventListener('loadeddata',()=>{hasVideo=true;});

 for(const name of parts){const img=new Image();img.src='assets/layers/'+name+'_light.png';img.alt='';layers[name]=img;$('art').append(img)}
 brightness(.18);
 const centers=[475,619,1109,1199,1288];
 cfg.teams.forEach((team,i)=>{const label=document.createElement('span');label.className='team-label';label.style.left=(centers[i]/1726*100)+'%';label.textContent=team.shortName||team.name;$('labels').append(label)});
 function render(next){
  data=next;window.__TEAM_PULSE_PROCESSED__=next;if(window.Glass)Glass.update(next);
  const words=(next.q10Ranked||[]).filter(x=>x&&typeof x.word==='string').slice().sort((a,b)=>b.count-a.count||a.word.localeCompare(b.word));
  $('rose').textContent=words.length?words[0].word:'';
  $('percentage').textContent=next.q8Total?next.q8Percentage+'%':'—';
  $('door').lastElementChild.textContent=next.q8Total?'trust their team':'No responses yet';
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
  finally{loading=false;$('refresh').disabled=false;controls(document.body.classList.contains('animating'))}
 }
 function reset(){run++;cancelAnimationFrame(frame);brightness(.18);vid.pause();vid.currentTime=0;vid.style.opacity='0';$('art').style.opacity='1';$('door').style.opacity='0';$('rose').style.opacity='0';clearSparks();document.body.classList.remove('presenting','revealed','animating');controls(false);setStatus('Ready for the next reveal.');}
 function reveal(){
  if(!data||!ready)return;reset();if(window.AudioManager)AudioManager.startFromGesture();document.body.classList.add('presenting','animating');controls(true);setStatus('Revealing team confidence…');
  const token=++run,start=performance.now(),useVid=hasVideo||vid.readyState>=2;
  if(useVid){
   $('art').style.opacity='0';vid.style.opacity='1';vid.currentTime=0;vid.play().catch(()=>{});
  }
  const duration=reduced?1000:(useVid?12000:13500);
  let finaleSound=false,doorBurst=false,roseBurst=false;
  function tick(now){if(token!==run)return;const elapsed=now-start;
   if(!finaleSound&&elapsed>duration-2600){finaleSound=true;if(window.AudioManager)AudioManager.playFinalReveal()}
   if(!reduced&&!doorBurst&&elapsed>(useVid?8000:7500)){doorBurst=true;burst(50,66.4,34)}
   if(!reduced&&!roseBurst&&elapsed>(useVid?9000:9500)){roseBurst=true;burst(50.35,36.77,42)}
   const t=Math.min(1,elapsed/duration);
   if(reduced){brightness(.18+.82*ease(t));$('door').style.opacity=String(ease(t));$('rose').style.opacity=String(ease(t))}
   else if(!useVid)sceneAt(t*13.5);
   else{const sec=t*12;$('door').style.opacity=String(ease((sec-8)/1.1));$('rose').style.opacity=String(ease((sec-9)/1))}
   if(t<1)frame=requestAnimationFrame(tick);
   else{if(useVid){vid.pause();vid.currentTime=vid.duration||12}document.body.classList.remove('animating');document.body.classList.add('revealed');controls(false);setStatus('Live results · '+data.usedRows+' responses')}}
  frame=requestAnimationFrame(tick);
 }
 $('play').onclick=reveal;$('replay').onclick=reveal;$('reset').onclick=reset;$('refresh').onclick=refresh;
 function motionLabel(){$('access').setAttribute('aria-pressed',String(reduced));$('access').textContent=reduced?'Reduced motion on':'Reduce motion'}motionLabel();$('access').onclick=()=>{reduced=!reduced;motionLabel()};
 QrDisplay.render($('qr'),cfg);$('survey-link').href=cfg.qrCode.url;if(!cfg.qrCode.visible)$('qr').parentElement.hidden=true;
 Promise.all([...document.querySelectorAll('.scene img')].map(img=>img.decode())).then(()=>{ready=true;if(window.Glass)Glass.init(layers,cfg);controls(false)}).catch(error=>{console.error(error);setStatus('Artwork could not load. Please reload the page.')});
 if(window.AudioManager)AudioManager.init(cfg);
 $('sound').onclick=()=>{const muted=!AudioManager.isMuted();AudioManager.setMuted(muted);$('sound').textContent=muted?'Sound off':'Sound on';$('sound').setAttribute('aria-pressed',String(muted))};
 $('settings-open').onclick=()=>{$('source-url').value=cfg.dataSource.liveDataUrl;$('form-url').value=cfg.qrCode.url;$('settings').showModal()};
 $('save-settings').onclick=()=>{try{const source=new URL($('source-url').value),form=new URL($('form-url').value);if(source.protocol!=='https:'||form.protocol!=='https:')throw Error('Use HTTPS URLs.');localStorage.setItem('chapel-event',JSON.stringify({source:source.href,form:form.href}));sourceVersion++;cfg.dataSource.liveDataUrl=source.href;cfg.qrCode.url=form.href;imported=false;QrDisplay.render($('qr'),cfg);$('survey-link').href=form.href;$('setup-status').textContent='Connection saved for this browser.';refresh()}catch(e){$('setup-status').textContent=e.message}};
 $('default-settings').onclick=()=>{localStorage.removeItem('chapel-event');location.reload()};
 $('csv-file').onchange=async()=>{const file=$('csv-file').files[0];if(!file)return;try{const next=DataProcessing.process(DataSource.parseCsv(await file.text()),cfg);if(!next.usedRows||next.missingColumns.some(q=>cfg.scoredQuestionOrder.includes(q)||q==='q1_team'))throw Error('CSV headings or team names do not match this survey.');sourceVersion++;imported=true;render(next);controls(false);$('setup-status').textContent='Loaded '+next.usedRows+' responses. This file stays in this browser tab.';setStatus('Imported event · '+next.usedRows+' responses')}catch(e){$('setup-status').textContent=e.message}};
 refresh();const timer=setInterval(refresh,10000);window.addEventListener('beforeunload',()=>{clearInterval(timer);cancelAnimationFrame(frame)});
})();
