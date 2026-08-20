// 本文件由 main.js 拆分而来（第 1 批）：零耦合 IIFE 外提。
// 每个 IIFE 原样包进 export function init*()，由 main.js 在原位置调用，执行时序不变。
/* 首页：粒子 + 鼠标跟随 + 卡片视差 + body.home 自动切换 */
export function initHomeFx(){
(function(){
  const ROOT=document.documentElement;
  const isMobile=window.matchMedia('(hover:none)').matches;

  // ---- body.home 状态管理（page1 显示时启用首页特效）----
  function applyHomeState(){
    const p1=document.getElementById('page1');
    const p2=document.getElementById('page2');
    const onHome=p1&&!p1.classList.contains('hidden')&&(!p2||p2.classList.contains('hidden')||!p2.classList.contains('active'));
    document.body.classList.toggle('home',onHome);
  }
  // 初始
  document.addEventListener('DOMContentLoaded',applyHomeState);
  // 监听 page1/page2 class 改动
  const obs=new MutationObserver(()=>applyHomeState());
  window.addEventListener('load',()=>{
    const p1=document.getElementById('page1'),p2=document.getElementById('page2');
    if(p1)obs.observe(p1,{attributes:true,attributeFilter:['class']});
    if(p2)obs.observe(p2,{attributes:true,attributeFilter:['class']});
    applyHomeState();
  });

  // ---- 鼠标跟随光球（含 lerp 拖尾）----
  if(!isMobile){
    const dot=document.getElementById('tjCursorDot');
    const ring=document.getElementById('tjCursorRing');
    if(dot&&ring){
      let mx=window.innerWidth/2,my=window.innerHeight/2;
      let dx=mx,dy=my,rx=mx,ry=my;
      let pressed=false;
      window.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;dot.classList.remove('hide');ring.classList.remove('hide');},{passive:true});
      window.addEventListener('mouseleave',()=>{dot.classList.add('hide');ring.classList.add('hide');});
      window.addEventListener('mousedown',()=>{pressed=true;ring.classList.add('active');});
      window.addEventListener('mouseup',()=>{pressed=false;ring.classList.remove('active');});
      // hover 检测：交互元素
      document.addEventListener('mouseover',e=>{
        const t=e.target;
        if(t&&t.closest&&t.closest('button,a,input,select,textarea,.chip,.cta,.tab-item,.r-card,.pf-card,.ai-chip,.ai-cat,.ai-route-btn,.tl-card,.lym-item,[onclick],[data-q]')){
          dot.classList.add('hover');ring.classList.add('hover');
        }
      });
      document.addEventListener('mouseout',e=>{
        const t=e.target;
        if(t&&t.closest&&t.closest('button,a,input,select,textarea,.chip,.cta,.tab-item,.r-card,.pf-card,.ai-chip,.ai-cat,.ai-route-btn,.tl-card,.lym-item,[onclick],[data-q]')){
          dot.classList.remove('hover');ring.classList.remove('hover');
        }
      });
      function tick(){
        dx+=(mx-dx)*0.4;dy+=(my-dy)*0.4;
        rx+=(mx-rx)*0.18;ry+=(my-ry)*0.18;
        dot.style.transform='translate3d('+dx+'px,'+dy+'px,0) translate(-50%,-50%)';
        ring.style.transform='translate3d('+rx+'px,'+ry+'px,0) translate(-50%,-50%)';
        requestAnimationFrame(tick);
      }
      tick();
    }
  }

  // ---- 粒子系统 ----
  const cv=document.getElementById('tjParticles');
  if(cv){
    const ctx=cv.getContext('2d');
    let W=0,H=0,DPR=Math.min(window.devicePixelRatio||1,2);
    let parts=[];
    let mouseX=-9999,mouseY=-9999;
    function resize(){
      W=window.innerWidth;H=window.innerHeight;
      cv.width=W*DPR;cv.height=H*DPR;
      cv.style.width=W+'px';cv.style.height=H+'px';
      ctx.setTransform(DPR,0,0,DPR,0,0);
      const target=Math.min(130,Math.max(55,Math.floor(W*H/13000)));
      parts=[];
      for(let i=0;i<target;i++){
        const br=Math.random()<0.12;
        parts.push({
          x:Math.random()*W,
          y:Math.random()*H,
          vx:(Math.random()-0.5)*0.18,
          vy:(Math.random()-0.5)*0.18,
          r:br?(Math.random()*1.4+1.0):(Math.random()*1.0+0.3),
          a:br?(Math.random()*0.3+0.55):(Math.random()*0.5+0.2),
          twinkle:Math.random()*Math.PI*2,
          bright:br,
          spike:br?(Math.random()*3.5+2.5):0,
          tspd:0.02+Math.random()*0.05
        });
      }
    }
    window.addEventListener('mousemove',e=>{mouseX=e.clientX;mouseY=e.clientY;},{passive:true});
    window.addEventListener('mouseleave',()=>{mouseX=-9999;mouseY=-9999;});

    let running=true;
    document.addEventListener('visibilitychange',()=>{running=!document.hidden;if(running)tick();});

    let shoots=[];
    function spawnShoot(){
      if(shoots.length>=2)return;
      shoots.push({
        x:Math.random()*W*0.6,
        y:Math.random()*H*0.4,
        vx:3+Math.random()*4,
        vy:1+Math.random()*2,
        life:1,
        tail:70+Math.random()*50
      });
    }

    function tick(){
      if(!running)return;
      // 首页与测试结果页均绘制；报告页以纯星点呈现，减少连线干扰阅读。
      const isHome=document.body.classList.contains('home');
      const isReport=document.body.classList.contains('report-active');
      if(!isHome&&!isReport){
        ctx.clearRect(0,0,W,H);
        requestAnimationFrame(tick);return;
      }
      ctx.clearRect(0,0,W,H);
      // 取当前主题色
      const styles=getComputedStyle(document.documentElement);
      const h=styles.getPropertyValue('--accent-h').trim()||'38';
      const sat=styles.getPropertyValue('--accent-s').trim()||'55%';

      // 首页保留星点连线；测试结果页仅保留星点，视觉更像安静的星空。
      if(isHome)for(let i=0;i<parts.length;i++){
        const p=parts[i];
        for(let j=i+1;j<parts.length;j++){
          const q=parts[j];
          const dx=p.x-q.x,dy=p.y-q.y;
          const d2=dx*dx+dy*dy;
          if(d2<11000){
            const alpha=(1-d2/11000)*0.18;
            ctx.strokeStyle='hsla('+h+','+sat+',65%,'+alpha+')';
            ctx.lineWidth=0.5;
            ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
          }
        }
      }
      // 画粒子 + 鼠标交互
      for(const p of parts){
        p.x+=p.vx;p.y+=p.vy;
        p.twinkle+=p.tspd||0.04;
        if(p.x<0)p.x=W;else if(p.x>W)p.x=0;
        if(p.y<0)p.y=H;else if(p.y>H)p.y=0;
        // 鼠标排斥（轻微）
        const dx=p.x-mouseX,dy=p.y-mouseY;
        const d2=dx*dx+dy*dy;
        if(d2<14400){
          const f=(1-d2/14400)*0.6;
          p.x+=dx*f*0.04;p.y+=dy*f*0.04;
        }
        const tw=0.7+Math.sin(p.twinkle)*0.3;
        // 亮星光晕 + 十字芒
        if(isHome&&p.bright){
          const glowR=p.r*5*tw;
          const g2=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,glowR);
          g2.addColorStop(0,'hsla('+h+','+sat+',85%,'+(0.22*tw)+')');
          g2.addColorStop(0.5,'hsla('+h+','+sat+',80%,'+(0.06*tw)+')');
          g2.addColorStop(1,'hsla('+h+','+sat+',80%,0)');
          ctx.fillStyle=g2;
          ctx.beginPath();ctx.arc(p.x,p.y,glowR,0,Math.PI*2);ctx.fill();
          var sl=p.spike*tw;
          ctx.strokeStyle='hsla('+h+','+sat+',90%,'+(0.32*tw)+')';
          ctx.lineWidth=0.6;
          ctx.beginPath();
          ctx.moveTo(p.x-sl,p.y);ctx.lineTo(p.x+sl,p.y);
          ctx.moveTo(p.x,p.y-sl);ctx.lineTo(p.x,p.y+sl);
          ctx.stroke();
        }
        ctx.fillStyle='hsla('+h+','+sat+',75%,'+(p.a*tw)+')';
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
      }
      // 流星
      if(isHome){
        if(Math.random()<0.004)spawnShoot();
        for(let i=shoots.length-1;i>=0;i--){
          const s=shoots[i];
          s.x+=s.vx;s.y+=s.vy;s.life-=0.012;
          if(s.life<=0||s.x>W+50||s.y>H+50){shoots.splice(i,1);continue;}
          const tx=s.x-s.vx*s.tail/8, ty=s.y-s.vy*s.tail/8;
          const g3=ctx.createLinearGradient(s.x,s.y,tx,ty);
          g3.addColorStop(0,'hsla('+h+','+sat+',90%,'+(s.life*0.9)+')');
          g3.addColorStop(1,'hsla('+h+','+sat+',90%,0)');
          ctx.strokeStyle=g3;
          ctx.lineWidth=1.5;
          ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(tx,ty);ctx.stroke();
          ctx.fillStyle='hsla('+h+','+sat+',95%,'+s.life+')';
          ctx.beginPath();ctx.arc(s.x,s.y,1.5,0,Math.PI*2);ctx.fill();
        }
      }
      requestAnimationFrame(tick);
    }
    resize();
    window.addEventListener('resize',resize);
    tick();
  }

  // ---- 表单卡片视差倾斜 ----
  function bindTilt(el){
    if(!el||isMobile)return;
    let raf=null;
    el.addEventListener('mousemove',e=>{
      const r=el.getBoundingClientRect();
      const x=e.clientX-r.left,y=e.clientY-r.top;
      const px=x/r.width,py=y/r.height;
      // 光点位置（CSS 变量驱动 ::before 径向光）
      el.style.setProperty('--mx',(px*100).toFixed(1)+'%');
      el.style.setProperty('--my',(py*100).toFixed(1)+'%');
      if(raf)cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{
        const rx=(0.5-py)*4,ry=(px-0.5)*4;
        el.style.transform='perspective(900px) rotateX('+rx.toFixed(2)+'deg) rotateY('+ry.toFixed(2)+'deg)';
      });
    });
    el.addEventListener('mouseleave',()=>{
      el.style.transform='perspective(900px) rotateX(0) rotateY(0)';
      el.style.setProperty('--mx','50%');el.style.setProperty('--my','50%');
    });
  }
  // —— 全局：绑定到 .home-card 与所有 page2 内的 .glass 卡片 ——
  function bindAllTilt(){
    document.querySelectorAll('.home-card:not([data-tilted])').forEach(el=>{bindTilt(el);el.setAttribute('data-tilted','1');});
    document.querySelectorAll('#page2 .glass:not([data-tilted])').forEach(el=>{bindTilt(el);el.setAttribute('data-tilted','1');});
  }
  window.addEventListener('load',bindAllTilt);
  // 推算完成后 page2 内容会被重渲染，提供一个全局钩子
  window._rebindTilt=bindAllTilt;

  // ---- CTA 按钮涟漪 ----
  document.addEventListener('click',e=>{
    const btn=e.target&&e.target.closest&&e.target.closest('.cta');
    if(!btn||btn.disabled)return;
    const r=btn.getBoundingClientRect();
    const x=e.clientX-r.left,y=e.clientY-r.top;
    const size=Math.max(r.width,r.height);
    const rip=document.createElement('span');
    rip.className='cta-ripple';
    rip.style.width=rip.style.height=size+'px';
    rip.style.left=(x-size/2)+'px';rip.style.top=(y-size/2)+'px';
    btn.appendChild(rip);
    setTimeout(()=>rip.remove(),700);
  });
})();
}
