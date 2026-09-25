(function(){
  function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn);else fn()}
  ready(function(){
    var scene=document.querySelector('.scene');if(!scene)return;
    var wrap=document.getElementById('sparks');
    if(!wrap){wrap=document.createElement('div');wrap.id='sparks';scene.appendChild(wrap)}
    wrap.style.cssText='position:absolute;inset:0;z-index:80;pointer-events:none;mix-blend-mode:screen';
    var canvas=wrap.querySelector('canvas');
    if(!canvas){canvas=document.createElement('canvas');wrap.appendChild(canvas)}
    canvas.style.cssText='width:100%;height:100%;display:block';
    var ctx=canvas.getContext('2d'),bits=[],raf=0;
    function size(){var r=scene.getBoundingClientRect(),d=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.max(2,r.width*d|0);canvas.height=Math.max(2,r.height*d|0)}
    function burst(xp,yp,n){
      size();
      var w=canvas.width,h=canvas.height,cx=w*xp/100,cy=h*yp/100;
      for(var i=0;i<n;i++){
        var a=Math.random()*Math.PI*2,s=(0.01+Math.random()*0.03)*Math.min(w,h);
        bits.push({x:cx,y:cy,vx:Math.cos(a)*s,vy:Math.sin(a)*s-s*0.2,life:1,decay:0.008+Math.random()*0.01,r:3+Math.random()*7});
      }
      if(!raf)tick();
    }
    function tick(){
      raf=0;ctx.clearRect(0,0,canvas.width,canvas.height);
      bits=bits.filter(function(p){return p.life>0});
      bits.forEach(function(p){
        p.x+=p.vx;p.y+=p.vy;p.vy+=0.05;p.vx*=0.985;p.life-=p.decay;
        ctx.globalAlpha=Math.max(0,p.life);
        var g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*5);
        g.addColorStop(0,'#fffbe8');g.addColorStop(0.3,'#ffd24a');g.addColorStop(1,'rgba(255,140,0,0)');
        ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,p.r*5,0,Math.PI*2);ctx.fill();
      });
      ctx.globalAlpha=1;
      if(bits.length)raf=requestAnimationFrame(tick);
    }
    function sequence(){
      size();
      [[2500,67,58,36],[3200,73,58,36],[4000,29,58,36],[4800,36,58,36],[5500,61,58,28],[8000,50,66,80],[9000,50.3,37,110]].forEach(function(c){
        setTimeout(function(){burst(c[1],c[2],c[3])},c[0]);
      });
    }
    window.addEventListener('resize',size);
    ['play','replay'].forEach(function(id){
      var btn=document.getElementById(id);if(!btn)return;
      btn.addEventListener('click',sequence);
    });
  });
})();
