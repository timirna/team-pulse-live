/* TEAM PANES
 * Paints each question window as five stained-glass rows, one per team (top to bottom in
 * config team order), and the door transom as five fan segments (left to right).
 * - Rows are split by heavy dark leads; the photo's diamond and centre leads split each row
 *   into pieces. No colour blending between teams.
 * - Each row uses its team's score colour (ColorUtils.scoreToColor) in 3 subtle shades of that
 *   one hue, with a per-piece gradient, the photo's fine glass texture, a bevel highlight on the
 *   upper-left edges, a soft sheen, a gentle inner glow and a faint halo over the frame.
 * Geometry is computed once from the lit photo (prepare); colours are applied per data change
 * (paint). Both return tiles {t:canvas,x,y,w,h} in artwork px (1792x1008) that survey.js draws.
 */
window.TeamPanes = (() => {
 'use strict';
 const S = 4, M = 12;                       // supersampling per artwork px, halo margin (artwork px)
 const Y0 = 601, Y1 = 790;                  // measured glass top / bottom of the tall windows
 // measured glass in the 1792x1008 lit photo: [left edge x, right edge x, centre lead x]; keys = WIN index
 const TALL = {0:[225,289,257],1:[390,452,420],2:[550,614,580],4:[1181,1245,1213],5:[1341,1404,1372],6:[1504,1568,1536]};
 const TR = {cx:896.5, cy:631, rx:49, ry:36.5}; // door transom (half ellipse)
 // diamond leads measured from the photo, glass-local artwork px [x1,y1,x2,y2] (x from left edge, y from Y0)
 const SEGS = {
  0:[[32,160,1,129],[32,48,1,17],[32,47,1,78],[32,164,1,195],[32,160,63,129],[32,48,63,17],[32,94,63,125],[32,48,63,79]],
  1:[[30,160,1,131],[30,50,1,21],[30,95,1,124],[30,50,1,79],[30,51,61,20],[30,161,61,130],[30,93,61,124],[30,49,61,80]],
  2:[[30,159,1,130],[30,47,1,18],[30,49,1,78],[30,96,1,125],[30,49,63,16],[30,161,63,128],[30,214,63,181],[30,47,63,80],[30,94,63,127]],
  4:[[32,48,1,17],[32,159,1,128],[32,49,1,80],[32,94,1,125],[32,48,63,17],[32,160,63,129],[32,48,63,79],[32,93,63,124]],
  5:[[31,49,1,19],[31,160,1,130],[31,49,1,79],[31,93,1,123],[31,48,62,17],[31,159,62,128],[31,94,62,125],[31,48,62,79]],
  6:[[32,49,1,18],[32,161,1,130],[32,48,1,79],[32,94,1,125],[32,47,63,16],[32,159,63,128],[32,93,63,124],[32,49,63,80]]
 };
 const LW = 1.5; // canvas strokes read ~1.5 subpx thinner than the preview's cv2 anti-aliased lines
 const LEAD = [.05,.04,.035], BEV = [.6*.75,.56*.75,.48*.75], RIM = [.28*.25,.22*.25,.14*.25];
 const tick = () => new Promise(r => setTimeout(r, 0));

 // ---------- small image helpers (single-channel Float32 fields) ----------
 function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
 function boxes(sigma){const n=3,wi=Math.sqrt(12*sigma*sigma/n+1);let wl=Math.floor(wi);if(wl%2===0)wl--;const m=Math.round((12*sigma*sigma-n*wl*wl-4*n*wl-3*n)/(-4*wl-4));return[0,1,2].map(i=>i<m?wl:wl+2)}
 function boxH(s,d,w,h,r){const k=1/(2*r+1);for(let y=0;y<h;y++){const o=y*w;let v=0;for(let j=-r;j<=r;j++)v+=s[o+Math.min(w-1,Math.max(0,j))];d[o]=v*k;for(let x=1;x<w;x++){v+=s[o+Math.min(w-1,x+r)]-s[o+Math.max(0,x-r-1)];d[o+x]=v*k}}}
 function boxV(s,d,w,h,r){const k=1/(2*r+1);for(let x=0;x<w;x++){let v=0;for(let j=-r;j<=r;j++)v+=s[x+Math.min(h-1,Math.max(0,j))*w];d[x]=v*k;for(let y=1;y<h;y++){v+=s[x+Math.min(h-1,y+r)*w]-s[x+Math.max(0,y-r-1)*w];d[x+y*w]=v*k}}}
 function blur(src,w,h,sigma){const a=Float32Array.from(src),b=new Float32Array(src.length);for(const bw of boxes(sigma)){const r=(bw-1)>>1;if(r<1)continue;boxH(a,b,w,h,r);boxV(b,a,w,h,r)}return a}
 // distance (px) to the nearest pixel with a different label (lab<0 = outside), 3x3 chamfer like cv2 DIST_L2/3
 function chamfer(lab,w,h){const A=.955,B=1.3693,d=new Float32Array(w*h);for(let i=0;i<w*h;i++)d[i]=lab[i]<0?0:1e9;
  const st=(i,j,c)=>{const v=(lab[j]===lab[i]?d[j]:0)+c;if(v<d[i])d[i]=v};
  for(let y=1;y<h;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(lab[i]<0)continue;st(i,i-1,A);st(i,i-w,A);st(i,i-w-1,B);st(i,i-w+1,B)}
  for(let y=h-2;y>=0;y--)for(let x=w-2;x>=1;x--){const i=y*w+x;if(lab[i]<0)continue;st(i,i+1,A);st(i,i+w,A);st(i,i+w+1,B);st(i,i+w-1,B)}
  return d}
 function lineMask(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.strokeStyle='#fff';x.lineCap='round';draw(x);
  const d=x.getImageData(0,0,w,h).data,o=new Float32Array(w*h);for(let i=0;i<w*h;i++)o[i]=d[i*4+3]/255;return o}
 function bres(m,w,h,x0,y0,x1,y1){x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);const dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;let e=dx+dy;
  for(;;){if(x0>=0&&y0>=0&&x0<w&&y0<h)m[y0*w+x0]=1;if(x0===x1&&y0===y1)break;const e2=2*e;if(e2>=dy){e+=dy;x0+=sx}if(e2<=dx){e+=dx;y0+=sy}}}
 // connected pieces (4-connectivity) of free pixels
 function components(free,w,h){const lab=new Int32Array(w*h).fill(-1),st=new Int32Array(w*h);let n=0;
  for(let s=0;s<w*h;s++){if(!free[s]||lab[s]>=0)continue;let sp=0;st[sp++]=s;lab[s]=n;
   while(sp){const i=st[--sp],x=i%w;if(x>0&&free[i-1]&&lab[i-1]<0){lab[i-1]=n;st[sp++]=i-1}if(x<w-1&&free[i+1]&&lab[i+1]<0){lab[i+1]=n;st[sp++]=i+1}
    if(i>=w&&free[i-w]&&lab[i-w]<0){lab[i-w]=n;st[sp++]=i-w}if(i+w<w*h&&free[i+w]&&lab[i+w]<0){lab[i+w]=n;st[sp++]=i+w}}n++}
  return{lab,n}}
 // give unlabelled glass pixels (cut lines) the label of the nearest piece (BFS)
 function fillNearest(lab,glass,w,h){let q=[];for(let i=0;i<w*h;i++)if(lab[i]>=0)q.push(i);
  while(q.length){const nq=[];for(const i of q){const x=i%w;for(const j of [x>0?i-1:-1,x<w-1?i+1:-1,i-w,i+w]){if(j<0||j>=w*h||!glass[j]||lab[j]>=0)continue;lab[j]=lab[i];nq.push(j)}}q=nq}}
 // merge small slivers into a neighbour of the same team (group), smallest first
 function mergeSmall(lab,w,h,group,minSize,rad,stopAtFirstBig){let n=0;for(const v of lab)if(v>=n)n=v+1;
  const pix=Array.from({length:n},()=>[]);for(let i=0;i<w*h;i++)if(lab[i]>=0)pix[lab[i]].push(i);
  const order=[...Array(n).keys()].sort((a,b)=>pix[a].length-pix[b].length);
  for(const t of order){const P=pix[t].filter(i=>lab[i]===t);if(!P.length)continue;if(pix[t].length>=minSize){if(stopAtFirstBig)break;continue}
   const gc=[0,0,0,0,0];for(const i of P)gc[group[i]]++;const g=gc.indexOf(Math.max(...gc)),cnt=new Map();
   for(const i of P){const x=i%w,y=(i-x)/w;for(let dy=-rad;dy<=rad;dy++)for(let dx=-rad;dx<=rad;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;const j=yy*w+xx,l=lab[j];if(l<0||l===t||group[j]!==g)continue;cnt.set(l,(cnt.get(l)||0)+1)}}
   if(!cnt.size)continue;let best=-1,bc=-1;cnt.forEach((c,l)=>{if(c>bc){bc=c;best=l}});for(const i of P)lab[i]=best;pix[best].push(...P);pix[t]=[]}}
 function compact(lab,group){const map=new Map();for(let i=0;i<lab.length;i++){const l=lab[i];if(l<0)continue;if(!map.has(l))map.set(l,map.size);lab[i]=map.get(l)}
  const np=map.size,votes=Array.from({length:np},()=>[0,0,0,0,0]);for(let i=0;i<lab.length;i++)if(lab[i]>=0)votes[lab[i]][group[i]]++;
  return{np,team:votes.map(v=>v.indexOf(Math.max(...v)))}}

 // ---------- colour ----------
 function rgb2hls(r,g,b){const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;if(mx===mn)return[0,l,0];const d=mx-mn,s=l<=.5?d/(mx+mn):d/(2-mx-mn),rc=(mx-r)/d,gc=(mx-g)/d,bc=(mx-b)/d;let h=r===mx?bc-gc:g===mx?2+rc-bc:4+gc-rc;h=((h/6)%1+1)%1;return[h,l,s]}
 function hls2rgb(h,l,s){if(s===0)return[l,l,l];const m2=l<=.5?l*(1+s):l+s-l*s,m1=2*l-m2,v=t=>{t=((t%1)+1)%1;return t<1/6?m1+(m2-m1)*t*6:t<.5?m2:t<2/3?m1+(m2-m1)*(2/3-t)*6:m1};return[v(h+1/3),v(h),v(h-1/3)]}
 // three subtle shades of ONE hue (hue locked; only lightness/saturation move)
 function shades(hex){const m=String(hex||'#8d929a').replace('#','').match(/../g).map(v=>parseInt(v,16)/255),[h,l,s]=rgb2hls(m[0],m[1],m[2]);
  const mk=(L,Sx)=>hls2rgb(h,Math.min(.92,Math.max(.08,L)),Math.min(1,Math.max(0,Sx)));return[mk(l*.82,s),mk(l*.97,s*.98),mk(l*1.09+.02,s*.93)]}

 // ---------- per-window static fields (geometry, light, texture) ----------
 function photoLum(img,X0,Yt,W,H){const w=W*S,h=H*S,c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});
  x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(img,X0,Yt,W,H,0,0,w,h);const d=x.getImageData(0,0,w,h).data,L=new Float32Array(w*h);
  for(let i=0;i<w*h;i++)L[i]=(d[i*4]*.2126+d[i*4+1]*.7152+d[i*4+2]*.0722)/255;return L}
 function closeGrey(L,w,h,r){ // grey closing (dilate then erode) with a square window: removes the photo's own dark leads from the texture
  const f=(src,op)=>{const a=new Float32Array(src.length),b=new Float32Array(src.length);
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=src[y*w+x];for(let k=Math.max(0,x-r);k<=Math.min(w-1,x+r);k++)v=op(v,src[y*w+k]);a[y*w+x]=v}
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=a[y*w+x];for(let k=Math.max(0,y-r);k<=Math.min(h-1,y+r);k++)v=op(v,a[k*w+x]);b[y*w+x]=v}return b};
  return f(f(L,Math.max),Math.min)}
 function finish(g){ // g: {lab,np,team,glass,thin,heavy,X0,Yt,W,H,seed,texlo,Lp}
  const w=g.W*S,h=g.H*S,n=w*h,{lab,glass,np}=g,R=rng(g.seed);let Lp=g.Lp;
  if(g.texlo>-1)Lp=closeGrey(Lp,w,h,2*S);
  // neighbours (incl. corner contact) so touching pieces of the same team get different shades
  const adj=Array.from({length:np},()=>new Set()),link=(a,b)=>{if(b>=0&&a!==b){adj[a].add(b);adj[b].add(a)}};
  for(let y=0;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x,l=lab[i];if(l<0)continue;link(l,lab[i+1]);link(l,lab[i+w]);link(l,lab[i+w+1]);link(l,lab[i+w-1])}
  const sy=new Float64Array(np),sx=new Float64Array(np),cn=new Float64Array(np),x0=new Int32Array(np).fill(1e9),x1=new Int32Array(np).fill(-1),y0=new Int32Array(np).fill(1e9),y1=new Int32Array(np).fill(-1);
  for(let i=0;i<n;i++){const l=lab[i];if(l<0)continue;const x=i%w,y=(i-x)/w;sy[l]+=y;sx[l]+=x;cn[l]++;if(x<x0[l])x0[l]=x;if(x>x1[l])x1[l]=x;if(y<y0[l])y0[l]=y;if(y>y1[l])y1[l]=y}
  const sidx=new Int8Array(np).fill(-1),order=[...Array(np).keys()].sort((a,b)=>sy[a]/cn[a]-sy[b]/cn[b]);
  for(const i of order){const used=new Set();adj[i].forEach(j=>{if(sidx[j]>=0&&g.team[j]===g.team[i])used.add(sidx[j])});let cand=[1,0,2].filter(s=>!used.has(s));if(!cand.length)cand=[0,1,2];
   sidx[i]=cand.length>1&&R()<.35?cand[Math.floor(R()*cand.length)]:cand[0]}
  // painted glass mottling, per-piece gradient
  const Lb=blur(Lp,w,h,S*.8);let mu=0,m2=0,ng=0;for(let i=0;i<n;i++)if(glass[i]){mu+=Lb[i];m2+=Lb[i]*Lb[i];ng++}mu/=ng;const sd=Math.sqrt(Math.max(0,m2/ng-mu*mu))+1e-4;
  const pc=[],ps=[],pr=[];for(let l=0;l<np;l++){const a=R()*Math.PI*2;pc.push(Math.cos(a));ps.push(Math.sin(a));pr.push(R()*.08-.04)}
  // bevel: distance to the piece edge, lit on edges facing the upper-left light
  const dist=chamfer(lab,w,h),bd=blur(dist,w,h,S*.4),lx=-.6,ly=-.8;
  const hp=blur(Lp,w,h,S*2),sp=[];for(let i=0;i<n;i++)if(glass[i])sp.push(Lp[i]);sp.sort((a,b)=>a-b);const p97=sp[Math.floor(.97*(sp.length-1))];
  const spec=new Float32Array(n);for(let i=0;i<n;i++)spec[i]=glass[i]?Math.max(0,Lp[i]-p97):0;const specB=blur(spec,w,h,S*.6);
  const A=new Float32Array(n),Bh=new Float32Array(n),Bw=new Float32Array(n);
  const c1=w*.8*.30+h*.35*.22,c2=w*.8*.62+h*.35*.70;
  for(let i=0;i<n;i++){const l=lab[i];if(!glass[i]||l<0)continue;const x=i%w,y=(i-x)/w;
   const size=Math.max(y1[l]-y0[l],x1[l]-x0[l])+1,gg=((y-sy[l]/cn[l])*ps[l]+(x-sx[l]/cn[l])*pc[l])/size,z=(Lb[i]-mu)/sd;
   const k=1+.32*gg+.07*z+pr[l],tex=Math.min(1,Math.max(g.texlo,Lp[i]-hp[i]));
   const gx=(bd[i+1]-bd[i-1])/2,gy=(bd[i+w]-bd[i-w])/2,face=-(gx*lx+gy*ly),bev=Math.exp(-dist[i]/(S*.9))*Math.max(-1,Math.min(1,face*1.6));
   A[i]=k*(1+1.5*tex)*(1-.45*Math.max(0,-bev));Bh[i]=Math.max(0,bev);
   const u=x*.8+y*.35;Bw[i]=Math.exp(-(((u-c1)/(S*5))**2))*.10+Math.exp(-(((u-c2)/(S*3))**2))*.06+specB[i]*1.2}
  // leads (thin photo leads + heavy team leads), warm rim on their top edge, darkening toward the frame, halo coverage
  const la=new Float32Array(n),rim=new Float32Array(n);for(let i=0;i<n;i++)la[i]=Math.max(g.thin[i],g.heavy[i]);
  for(let i=2*w;i<n;i++)rim[i]=Math.max(0,Math.min(1,la[i]-la[i-(S>>1)*w]));
  const gl=new Int32Array(n);const gm=new Float32Array(n);for(let i=0;i<n;i++){gl[i]=glass[i]?0:-1;gm[i]=glass[i]?1:0}
  const dfr=chamfer(gl,w,h),dark=new Float32Array(n);for(let i=0;i<n;i++)dark[i]=.8+.2*Math.min(1,Math.max(0,dfr[i]/S/5));
  const ha=blur(gm,w,h,S*4);
  return{w,h,X0:g.X0,Yt:g.Yt,W:g.W,H:g.H,lab,glass,team:g.team,sidx,A,Bh,Bw,la,rim,dark,ha,transom:!!g.transom}
 }
 function geomTall(wi,img){
  const[xl,xr,xm]=TALL[wi],X0=xl-M,Yt=Y0-M,W=xr-xl+2*M,H=Y1-Y0+2*M,w=W*S,h=H*S,n=w*h,gw=xr-xl,gh=Y1-Y0,hb=gh/5;
  const P=v=>(v+M)*S;
  const glass=new Uint8Array(n),gx0=Math.ceil(P(.5)),gx1=Math.floor(P(gw-.5)),gy0=Math.ceil(P(0)),gy1=Math.floor(P(gh));
  for(let y=gy0;y<=gy1;y++)for(let x=gx0;x<=gx1;x++)glass[y*w+x]=1;
  const cut=new Uint8Array(n),segs=SEGS[wi];
  for(const[a,b,c,d]of segs)bres(cut,w,h,P(a),P(b),P(c),P(d));
  bres(cut,w,h,P(xm-xl),P(0),P(xm-xl),P(gh));for(let k=1;k<5;k++)bres(cut,w,h,P(0),P(k*hb),P(gw),P(k*hb));
  const L=(x,a,b,c,d,lw)=>{x.lineWidth=lw;x.beginPath();x.moveTo(P(a)+.5,P(b)+.5);x.lineTo(P(c)+.5,P(d)+.5);x.stroke()};
  const thin=lineMask(w,h,x=>{for(const[a,b,c,d]of segs)L(x,a,b,c,d,Math.round(.8*S)+LW);L(x,xm-xl,0,xm-xl,gh,Math.round(1*S)+LW)});
  const heavy=lineMask(w,h,x=>{for(let k=1;k<5;k++)L(x,0,k*hb,gw,k*hb,Math.round(2.6*S)+LW);x.lineCap='butt';for(const v of[.5,gw-.5])L(x,v,0,v,gh,Math.round(1.6*S)+LW);L(x,0,.3,gw,.3,Math.round(1.6*S)+LW);L(x,0,gh-.3,gw,gh-.3,Math.round(1.6*S)+LW)});
  const free=new Uint8Array(n);for(let i=0;i<n;i++)free[i]=glass[i]&&!cut[i]?1:0;
  const{lab}=components(free,w,h);for(let i=0;i<n;i++)if(!glass[i])lab[i]=-1;fillNearest(lab,glass,w,h);
  const row=new Uint8Array(n);for(let y=0;y<h;y++){const r=Math.min(4,Math.max(0,Math.floor((y/S-M)/hb)));row.fill(r,y*w,(y+1)*w)}
  mergeSmall(lab,w,h,row,S*S*14,2,false);const{np,team}=compact(lab,row);
  return finish({lab,np,team,glass,thin:blur(thin,w,h,S*.2).map(v=>v*.8),heavy:blur(heavy,w,h,S*.2).map(v=>v*.97),X0,Yt,W,H,seed:31+wi,texlo:-1,Lp:photoLum(img,X0,Yt,W,H)})
 }
 function geomTransom(img){
  const{cx,cy,rx,ry}=TR,X0=Math.floor(cx-rx)-M,Yt=Math.floor(cy-ry)-M,W=Math.floor(2*rx)+2*M+2,H=Math.floor(ry)+2*M+2,w=W*S,h=H*S,n=w*h;
  const glass=new Uint8Array(n),sector=new Uint8Array(n),rr=new Float32Array(n);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x,ax=x/S+X0,ay=y/S+Yt,ex=(ax-cx)/rx,ey=(ay-cy)/ry;rr[i]=Math.sqrt(ex*ex+ey*ey);glass[i]=ex*ex+ey*ey<=1&&ay<=cy-.4?1:0;
   const ang=Math.atan2(-ey,ex)*180/Math.PI;sector[i]=Math.min(4,Math.max(0,Math.floor((180-ang)/36)))}
  const Cx=(cx-X0)*S,Cy=(cy-Yt)*S;
  const heavy=lineMask(w,h,x=>{x.lineWidth=Math.round(1.8*S)+LW;for(let k=1;k<5;k++){const a=(180-36*k)*Math.PI/180;x.beginPath();x.moveTo(Cx+.5,Cy+.5);x.lineTo(Cx+Math.cos(a)*rx*1.1*S+.5,Cy-Math.sin(a)*ry*1.1*S+.5);x.stroke()}
   x.lineWidth=Math.round(1.6*S)+LW;x.beginPath();x.ellipse(Math.floor(Cx)+.5,Math.floor(Cy)+.5,Math.floor(rx*S),Math.floor(ry*S),0,Math.PI,2*Math.PI);x.stroke();x.lineCap='butt';x.beginPath();x.moveTo(0,Math.floor(Cy)+.5);x.lineTo(w,Math.floor(Cy)+.5);x.stroke()});
  const thin=lineMask(w,h,x=>{x.lineWidth=S+1;for(const f of[.36,.70]){x.beginPath();x.ellipse(Math.floor(Cx)+.5,Math.floor(Cy)+.5,Math.floor(rx*f*S),Math.floor(ry*f*S),0,Math.PI,2*Math.PI);x.stroke()}});
  for(let i=0;i<n;i++)thin[i]=thin[i]>0?1:0;
  const free=new Uint8Array(n);
  for(let i=0;i<n;i++){const x=i%w,r=rr[i];let f=glass[i]&&!((r>.355&&r<.365)||(r>.695&&r<.705))&&heavy[i]*255<60;
   if(f&&((x>0&&sector[i-1]!==sector[i])||(i>=w&&sector[i-w]!==sector[i])))f=false;free[i]=f?1:0}
  const{lab}=components(free,w,h);for(let i=0;i<n;i++)if(!glass[i])lab[i]=-1;
  mergeSmall(lab,w,h,sector,S*S*16,3,true);fillNearest(lab,glass,w,h);const{np,team}=compact(lab,sector);
  return finish({lab,np,team,glass,thin:blur(thin,w,h,S*.2).map(v=>v*.8),heavy:blur(heavy,w,h,S*.2).map(v=>v*.97),X0,Yt,W,H,seed:77,texlo:-.012,Lp:photoLum(img,X0,Yt,W,H),transom:true})
 }

 // ---------- colour a prepared window ----------
 function colorize(st,hexes){
  const{w,h,lab,glass,team,sidx,A,Bh,Bw,la,rim,dark,ha}=st,n=w*h,shd=hexes.map(shades);
  const ch=[0,1,2].map(()=>new Float32Array(n)),br=[0,1,2].map(()=>new Float32Array(n));
  for(let i=0;i<n;i++){if(!glass[i])continue;const l=lab[i],b=shd[team[l]][sidx[l]];for(let k=0;k<3;k++){const v=b[k]*A[i]+Bh[i]*BEV[k]+Bw[i];ch[k][i]=v;br[k][i]=Math.min(1,Math.max(0,v-.6))}}
  const out=new ImageData(w,h),d=out.data;const halo=[];
  for(let k=0;k<3;k++){const bl=blur(br[k],w,h,S*2),c=ch[k],g=br[k];
   for(let i=0;i<n;i++){let v=c[i]+bl[i]*.5;v=v*(1-la[i])+LEAD[k]*la[i]+rim[i]*RIM[k];v=Math.min(1,Math.max(0,v*dark[i]));c[i]=v;g[i]=glass[i]?v:0}
   halo.push(blur(g,w,h,S*4))}
  for(let i=0;i<n;i++){const p=i*4;if(glass[i]){for(let k=0;k<3;k++)d[p+k]=ch[k][i]*255;d[p+3]=255}
   else{const a=Math.max(ha[i],1e-3);for(let k=0;k<3;k++)d[p+k]=Math.min(1,Math.max(0,halo[k][i]/a*1.1+.06))*255;d[p+3]=Math.min(.42,Math.max(0,ha[i]*.55))*255}}
  const t=document.createElement('canvas');t.width=w;t.height=h;t.getContext('2d').putImageData(out,0,0);
  return{t,x:st.X0,y:st.Yt,w:st.W,h:st.H,transom:st.transom,alpha:true}
 }

 let statics=null,preparing=null;
 // build the static fields once from the loaded lit photo (yields between windows to keep the page responsive)
 function prepare(img){if(statics)return Promise.resolve(statics);if(preparing)return preparing;
  preparing=(async()=>{const out=[];for(let wi=0;wi<7;wi++){await tick();out.push(wi===3?geomTransom(img):geomTall(wi,img))}statics=out;return out})();
  preparing.catch(()=>{preparing=null});return preparing}
 // hexByWindow: 7 arrays (WIN order) of 5 team hex colours (config team order). Resolves to 7 tiles.
 async function paint(img,hexByWindow){const st=await prepare(img),tiles=[];for(let wi=0;wi<7;wi++){await tick();tiles.push(colorize(st[wi],hexByWindow[wi]))}return tiles}
 return{prepare,paint,shades};
})();
