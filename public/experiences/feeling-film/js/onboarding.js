(function(){
 const view=document.getElementById('view');let scheduled=false;
 function update(){
  scheduled=false;
  const form=view.querySelector('#quick-form');
  if(form&&!form.querySelector('[data-use-example]')){
   const button=document.createElement('button');button.type='button';button.className='btn btn-amber';button.dataset.useExample='';button.textContent='使用示例体验';
   button.onclick=()=>{const chip=form.querySelector('[data-fill]');if(chip){chip.click();form.requestSubmit();}};form.append(button);
  }
  const studio=view.querySelector('.studio-page');
  if(studio&&!studio.querySelector('.onboarding-help')){
   const guide=document.createElement('details');guide.className='onboarding-help';guide.innerHTML='<summary>第一次剪片：查看四步指南</summary><p>说一句 → 挑画面 → 答两问 → 收下片。无需API，本地规则整理情绪，片子在本机生成。</p><p>推荐画面可以直接用；上传、模板与配乐调整均为可选。完成后先播放，满意再保存影片或海报。</p><button type="button" class="btn btn-ghost">收起引导</button>';
   try{guide.open=sessionStorage.getItem('film:guide')!=='closed';}catch{guide.open=true;}
   guide.querySelector('button').onclick=()=>{guide.open=false;guide.querySelector('summary').focus();try{sessionStorage.setItem('film:guide','closed');}catch{}};
   studio.querySelector('#stepper-slot').after(guide);
  }
  const panel=view.querySelector('.studio-main .panel'),next=panel?.querySelector('.studio-foot .btn-amber');
  if(panel&&next&&!panel.querySelector('.onboarding-jump')){
   const button=document.createElement('button');button.type='button';button.className='btn btn-ghost btn-sm onboarding-jump';button.textContent='前往本步下一步按钮 ↓';
   button.onclick=()=>{next.scrollIntoView({block:'center',behavior:'auto'});if(!next.disabled)next.focus();};
   panel.querySelector('.panel-note').after(button);
  }
 }
 const observer=new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update);}});observer.observe(view,{childList:true,subtree:true});update();
 addEventListener('pagehide',()=>observer.disconnect(),{once:true});addEventListener('pageshow',e=>{if(e.persisted){observer.observe(view,{childList:true,subtree:true});update();}});
})();
