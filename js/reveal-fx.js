(function(){
  if(!document.getElementById('reveal-fx-css')){
    var s=document.createElement('style');s.id='reveal-fx-css';
    s.textContent='#fx-flash{position:absolute;inset:0;z-index:90;background:#fff;opacity:0;pointer-events:none}'+
      '#fx-flash.on{animation:fxFlash .42s ease-out}'+
      '@keyframes fxFlash{0%{opacity:0}18%{opacity:.72}100%{opacity:0}}'+
      '#fx-rays{position:absolute;left:50.3%;top:36.8%;width:70%;aspect-ratio:1;transform:translate(-50%,-50%) scale(.55);border-radius:50%;z-index:70;pointer-events:none;opacity:0;mix-blend-mode:screen;'+
      'background:repeating-conic-gradient(from -7deg,transparent 0 7deg,rgba(255,232,174,.12) 8deg,rgba(255,210,112,.46) 13deg,rgba(255,185,65,.16) 19deg,transparent 26deg 34deg);'+
      '-webkit-mask-image:radial-gradient(circle,#000 10%,#000 40%,transparent 75%);mask-image:radial-gradient(circle,#000 10%,#000 40%,transparent 75%);filter:blur(8px)}'+
      '#fx-rays.on{animation:fxRays 1.8s ease-out forwards}'+
      '@keyframes fxRays{0%{opacity:0;transform:translate(-50%,-50%) scale(.55)}22%{opacity:.95;transform:translate(-50%,-50%) scale(1.02)}100%{opacity:.08;transform:translate(-50%,-50%) scale(1.16)}}'+
      '#fx-bits{position:absolute;inset:0;z-index:85;pointer-events:none;overflow:hidden}'+
      '.fx-bit{position:absolute;width:8px;height:8px;margin:-4px;border-radius:50%;background:#FFD98A;box-shadow:0 0 7px 2px rgba(255,235,176,.92),0 0 15px rgba(255,184,57,.48);opacity:0;animation:fxBit var(--dur,1450ms) ease-out forwards}'+
      '@keyframes fxBit{0%{opacity:0;transform:translate(0,0) scale(.3)}12%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1)}}';
    document.head.appendChild(s);
  }
  function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn);else fn()}
  ready(function(){
    var scene=document.querySelector('.scene');if(!scene)return;
    var flash=document.createElement('div');flash.id='fx-flash';
    var rays=document.createElement('div');rays.id='fx-rays';
    var bits=document.createElement('div');bits.id='fx-bits';
    scene.appendChild(rays);scene.appendChild(bits);scene.appendChild(flash);
    var timers=[];
    function clear(){timers.forEach(clearTimeout);timers=[];bits.innerHTML='';flash.classList.remove('on');rays.classList.remove('on')}
    function particles(xp,yp,n){
      for(var i=0;i<n;i++){
        var p=document.createElement('div');p.className='fx-bit';
        p.style.left=xp+'%';p.style.top=yp+'%';
        var a=(i/n)*Math.PI*2+(Math.random()-.5)*.6;
        var d=70+Math.random()*210;
        p.style.setProperty('--dx',(Math.cos(a)*d).toFixed(1)+'px');
        p.style.setProperty('--dy',(Math.sin(a)*d*.55-45).toFixed(1)+'px');
        p.style.setProperty('--dur',(1200+Math.random()*400).toFixed(0)+'ms');
        bits.appendChild(p);
      }
    }
    function sequence(){
      clear();
      timers.push(setTimeout(function(){particles(50,66.4,38);flash.classList.add('on');rays.classList.add('on')},10500));
      timers.push(setTimeout(function(){flash.classList.remove('on')},11000));
      timers.push(setTimeout(function(){rays.classList.remove('on');bits.innerHTML=''},12500));
    }
    ['play','replay'].forEach(function(id){
      var btn=document.getElementById(id);if(btn)btn.addEventListener('click',sequence);
    });
    var reset=document.getElementById('reset');if(reset)reset.addEventListener('click',clear);
  });
})();
