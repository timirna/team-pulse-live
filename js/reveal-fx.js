(function(){
  if(!document.getElementById('reveal-fx-css')){
    var s=document.createElement('style');s.id='reveal-fx-css';
    s.textContent=
      '#fx-flash{position:absolute;inset:0;z-index:90;pointer-events:none;opacity:0;'+
      'background:radial-gradient(circle at 50% 37%,rgba(255,255,230,.75) 0%,rgba(255,220,140,.28) 32%,transparent 68%)}'+
      '#fx-flash.on{animation:fxFlash .5s ease-out}'+
      '@keyframes fxFlash{0%{opacity:0}20%{opacity:.8}100%{opacity:0}}'+
      '#fx-bits{position:absolute;inset:0;z-index:85;pointer-events:none;overflow:hidden}'+
      '.fx-bit{position:absolute;width:8px;height:8px;margin:-4px;border-radius:50%;background:#FFD98A;'+
      'box-shadow:0 0 8px 2px rgba(255,235,176,.95),0 0 16px rgba(255,184,57,.5);opacity:0;'+
      'animation:fxBit var(--dur,1400ms) ease-out forwards}'+
      '@keyframes fxBit{0%{opacity:0;transform:translate(0,0) scale(.3)}12%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1)}}';
    document.head.appendChild(s);
  }
  function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn);else fn()}
  ready(function(){
    var scene=document.querySelector('.scene');if(!scene)return;
    var flash=document.getElementById('fx-flash')||document.createElement('div');flash.id='fx-flash';
    var bits=document.getElementById('fx-bits')||document.createElement('div');bits.id='fx-bits';
    if(!flash.parentNode)scene.appendChild(flash);
    if(!bits.parentNode)scene.appendChild(bits);
    var oldRays=document.getElementById('fx-rays');if(oldRays)oldRays.remove();
    var oldWash=document.getElementById('fx-wash');if(oldWash)oldWash.remove();
    var timers=[];
    function clear(){timers.forEach(clearTimeout);timers=[];bits.innerHTML='';flash.classList.remove('on')}
    function particles(xp,yp,n){
      for(var i=0;i<n;i++){
        var p=document.createElement('div');p.className='fx-bit';
        p.style.left=xp+'%';p.style.top=yp+'%';
        var a=(i/n)*Math.PI*2+(Math.random()-.5)*.55;
        var d=70+Math.random()*200;
        p.style.setProperty('--dx',(Math.cos(a)*d).toFixed(1)+'px');
        p.style.setProperty('--dy',(Math.sin(a)*d*.6-40).toFixed(1)+'px');
        p.style.setProperty('--dur',(1200+Math.random()*400).toFixed(0)+'ms');
        bits.appendChild(p);
      }
    }
    function sequence(){
      clear();
      timers.push(setTimeout(function(){
        flash.classList.add('on');
        particles(50.3,36.5,22);
        particles(50,66.4,28);
      },10000));
      timers.push(setTimeout(function(){flash.classList.remove('on')},10600));
      timers.push(setTimeout(function(){bits.innerHTML=''},12000));
    }
    ['play','replay'].forEach(function(id){
      var btn=document.getElementById(id);if(btn)btn.addEventListener('click',sequence);
    });
    var reset=document.getElementById('reset');if(reset)reset.addEventListener('click',clear);
  });
})();
