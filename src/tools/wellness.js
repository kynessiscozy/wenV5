function openFocusTool(){
  const el=document.getElementById('toolResult');if(!el)return;
  el.innerHTML='<div class="tool-panel"><div class="tool-panel-title">今日三件事</div><div class="focus-checks"><label><input type="checkbox"> 完成最重要的一件推进事项</label><label><input type="checkbox"> 主动沟通或回复一位关键联系人</label><label><input type="checkbox"> 留出 20 分钟整理与复盘</label></div><div class="tool-panel-note">不追求做很多，只完成这三件中的一件，就已经在向前。</div></div>';
}
function openBreathTool(){
  const el=document.getElementById('toolResult');if(!el)return;
  el.innerHTML='<div class="tool-panel breath-panel"><div class="tool-panel-title">一分钟暂停</div><div class="breath-circle" id="breathCircle">准备</div><div class="tool-panel-note" id="breathText">跟随圆环：吸气 4 秒，停留 2 秒，呼气 6 秒。</div><button class="tool-back" onclick="startBreathTool()">开始 1 分钟</button></div>';
}
function startBreathTool(){
  const circle=document.getElementById('breathCircle'),text=document.getElementById('breathText');if(!circle||!text)return;
  let left=60;circle.classList.add('run');
  const tick=()=>{const phase=(60-left)%12;if(phase<4){circle.textContent='吸气';text.textContent='慢慢吸气 4 秒';}else if(phase<6){circle.textContent='停留';text.textContent='轻轻停留 2 秒';}else{circle.textContent='呼气';text.textContent='缓慢呼气 6 秒';}if(left--<0){clearInterval(timer);circle.classList.remove('run');circle.textContent='完成';text.textContent='现在再回来看你的选择：先做最小的一步。';}};tick();const timer=setInterval(tick,1000);
}

export { openFocusTool, openBreathTool, startBreathTool };
