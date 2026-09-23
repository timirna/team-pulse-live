/* Preserve painted texture and lead lines; recolor connected glass fragments only.
   Each window's fragments are ordered top to bottom into seven question groups. */
window.Glass=(()=>{
 const files=['window_left_1','window_left_2','window_right_3','window_right_2','window_right_1'];
 let config,items=[],latest;
 function components(image){
  const {width:w,height:h,data:d}=image,seen=new Uint8Array(w*h),out=[];
  function glass(i){const p=i*4,r=d[p],g=d[p+1],b=d[p+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);return d[p+3]>220&&hi>90&&(hi-lo)>35}
  for(let y=490;y<679;y++)for(let x=0;x<w;x++){
   const seed=y*w+x;if(seen[seed]||!glass(seed))continue;const queue=[seed],pixels=[];seen[seed]=1;let sy=0,sx=0;
   for(let at=0;at<queue.length;at++){const i=queue[at],yy=Math.floor(i/w),xx=i%w;pixels.push(i);sy+=yy;sx+=xx;
    for(const j of [i-1,i+1,i-w,i+w]){const jy=Math.floor(j/w);if(j<0||j>=w*h||jy<490||jy>=679||seen[j]||Math.abs(j%w-xx)>1||!glass(j))continue;seen[j]=1;queue.push(j)}
   }if(pixels.length>=35)out.push({pixels,y:sy/pixels.length,x:sx/pixels.length});
  }
  out.sort((a,b)=>a.y-b.y||a.x-b.x);out.forEach((c,i)=>c.group=Math.min(6,Math.floor(i*7/out.length)));return out;
 }
 function init(layers,cfg){config=cfg;items=files.map((name,i)=>{
  const source=layers[name],canvas=document.createElement('canvas');canvas.width=1726;canvas.height=911;canvas.className='glass-canvas';canvas.style.cssText=source.style.cssText;canvas.style.position='absolute';canvas.style.inset='0';canvas.style.width='100%';canvas.style.height='100%';canvas.setAttribute('aria-hidden','true');const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0);const original=ctx.getImageData(0,0,1726,911),fragments=components(original);source.replaceWith(canvas);layers[name]=canvas;return{canvas,ctx,original,fragments,team:cfg.teams[i].id};
 });if(latest)update(latest);else if(window.__TEAM_PULSE_PROCESSED__)update(window.__TEAM_PULSE_PROCESSED__);}
 function update(data){latest=data;if(!config)return;items.forEach(item=>{
  const output=new ImageData(new Uint8ClampedArray(item.original.data),1726,911),d=output.data;
  item.fragments.forEach(fragment=>{
   const q=config.scoredQuestionOrder[fragment.group],score=data.teamAverages[item.team]?.[q],hex=score==null?'#8d929a':ColorUtils.scoreToColor(score,config),rgb=hex.replace('#','').match(/../g).map(v=>parseInt(v,16));
   fragment.pixels.forEach(i=>{const p=i*4,lum=(d[p]*.2126+d[p+1]*.7152+d[p+2]*.0722)/255,shade=.48+.64*lum;for(let k=0;k<3;k++)d[p+k]=Math.min(255,rgb[k]*shade+Math.max(0,lum-.72)*110)});
  });item.ctx.putImageData(output,0,0);
 });}
 return{init,update};
})();