(function(){
  if(!document.getElementById('reveal-fx-css')){
    var s=document.createElement('style');s.id='reveal-fx-css';
    s.textContent=
      '#fx-wash{position:absolute;inset:0;z-index:60;pointer-events:none;opacity:0;mix-blend-mode:screen;'+
      'background:radial-gradient(circle at 50% 38%,rgba(255,210,80,.55) 0%,rgba(255,160,40,.22) 28%,transparent 62%)}'+
      '#fx-wash.on{animation:fxWash 2.2s ease-out forwards}'+
      '@keyframes fxWash{0%{opacity:0}20%{opacity:1}100%{opacity:.35}}'+
      '#fx-flash{position:absolute;inset:0;z-index:90;background:radial-gradient(circle at 50% 38%,#fff 0%,rgba(255,240,200,.7) 35%,transparent 70%);opacity:0;pointer-events:none}'+
      '#fx-flash.on{animation:fxFlash .55s ease-out}'+
      '@keyframes fxFlash{0%{opacity:0}15%{opacity:.85}100%{opacity:0}}'+
      '#fx-rays{position:absolute;left:50.3%;top:36.5%;width:120%;aspect-ratio:1;transform:translate(-50%,-50%) scale(.4);border-radius:50%;z-index:65;pointer-events:none;opacity:0;mix-blend-mode:screen;'+
      'background:repeating-conic-gradient(from 0deg,#ffd56a 0 3deg,rgba(255,200,70,.15) 4deg,transparent 7deg 14deg,#fff3b0 15deg 17deg,transparent 20deg 28deg);'+
      '-webkit-mask-image:radial-gradient(circle,transparent 8%,#000 14%,#000 42%,transparent 72%);mask-image:radial-gradient(circle,transparent 8%,#000 14%,#000 42%,transparent 72%);filter:blur(2px)}'+
      '#fx-rays.on{animation:fxRays 2.4s ease-out forwards}'+
      '@keyframes fxRays{0%{opacity:0;transform:translate(-50%,-50%) scale(.35) rotate(-8deg)}18%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(0)}100%{opacity:.45;transform:translate(-50%,-50%) scale(1.15) rotate(6deg)}}'+
      '#fx-bits{position:absolute;inset:0;z-index:85;pointer-events:none;overflow:hidden}'+
      '.fx-bit{position:absolute;width:9px;height:9px;margin:-4px;border-radius:50%;background:#FFD98A;box-shadow:0 0 8px 3px rgba(255,235,176,.95),0 0 18px rgba(255,184,57,.55);opacity:0;animation:fxBit var(--dur,1600ms) ease-out forwards}'+
      '@keyframes fxBit{0%{opacity:0;transform:translate(0,0) scale(.3)}10%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1)}}';
    document.head.appendChild(s);
  }
  function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn);else fn()}
  ready(function(){
    var scene=document.querySelector('.scene');if(!scene)return;
    var wash=document.createElement('div');wash.id='fx-wash';
    var flash=document.createElement('div');flash.id='fx-flash';
    var rays=document.createElement('div');rays.id='fx-rays';
    var bits=document.createElement('div');bits.id='fx-bits';
    scene.appendChild(wash);scene.appendChild(rays);scene.appendChild(bits);scene.appendChild(flash);
    var timers=[];
    function clear(){timers.forEach(clearTimeout);timers=[];bits.innerHTML='';[wash,flash,rays].forEach(function(el){el.classList.remove('on')})}
    function particles(xp,yp,n){
      for(var i=0;i<n;i++){
        var p=document.createElement('div');p.className='fx-bit';
        p.style.left=xp+'%';p.style.top=yp+'%';
        var a=(i/n)*Math.PI*2+(Math.random()-.5)*.5;
        var d=80+Math.random()*240;
        p.style.setProperty('--dx',(Math.cos(a)*d).toFixed(1)+'px');
        p.style.setProperty('--dy',(Math.sin(a)*d*.7-30).toFixed(1)+'px');
        p.style.setProperty('--dur',(1300+Math.random()*500).toFixed(0)+'ms');
        bits.appendChild(p);
      }
    }
    function sequence(){
      clear();
      timers.push(setTimeout(function(){
        wash.classList.add('on');
        rays.classList.add('on');
        flash.classList.add('on');
        particles(50.3,36.5,28);
        particles(50,66.4,38);
      },10500));
      timers.push(setTimeout(function(){flash.classList.remove('on')},11100));
    }
    ['play','replay'].forEach(function(id){
      var btn=document.getElementById(id);if(btn)btn.addEventListener('click',sequence);
    });
    var reset=document.getElementById('reset');if(reset)reset.addEventListener('click',clear);
  });
})();
