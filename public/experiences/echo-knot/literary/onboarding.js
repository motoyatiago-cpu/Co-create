// UI only: no prompts, API calls, keys, memory or Vue private state.
const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./onboarding.css',import.meta.url);document.head.append(css);
function guide(id,title,html){
 const el=document.createElement('details');el.className='onboarding-guide';el.dataset.guide=id;
 try{el.open=sessionStorage.getItem('echo:guide:'+id)!=='closed';}catch{el.open=true;}
 el.innerHTML='<summary>'+title+'</summary><div>'+html+'</div>';
 const close=document.createElement('button');close.type='button';close.className='btn btn--quiet';close.textContent='收起引导';close.onclick=()=>{el.open=false;el.querySelector('summary').focus();try{sessionStorage.setItem('echo:guide:'+id,'closed');}catch{}};el.lastElementChild.append(close);return el;
}
let queued=false;
function enhance(){
 queued=false;const main=document.querySelector('main');if(!main)return;
 if(!main.querySelector('.scene-row'))main.querySelector('[data-purpose]')?.remove();
 if(main.querySelector('.scene-row')&&!main.querySelector('[data-purpose]')){
  const s=document.createElement('section');s.className='onboarding-guide';s.dataset.purpose='true';s.setAttribute('aria-label','按你的目的开始');s.innerHTML='<h2>今晚，你想先做什么？</h2><div class="purpose-links"><a class="btn btn--primary" href="#/解结">读懂一句话</a><a class="btn" href="#/照见">了解自己的反应</a><a class="btn" href="#/共鸣">找个人聊聊</a></div><p>本地回声无需API；解读与自我探索仅供参考。</p>';main.prepend(s);
 }
 const chat=main.querySelector('echo-literary-chat');
 if(chat&&!main.querySelector('[data-guide="modes"]'))chat.before(guide('modes','初次共鸣：两种回声怎么选？','<p><b>本地回声</b>：本机文字规则回应，不调用云端模型，无需Key，可直接开始。</p><p><b>AI文学回声</b>：使用你配置的服务商生成对话，需要自己的Key，可能计费；不是历史人物本人。</p><ol><li>先选人物；没有API就保持本地回声，在下方输入。</li><li>有API时切换AI文学回声，展开AI接入设置。</li><li>依次填写服务商Base URL、Model ID和API Key，再发送一句话。Key仅在页面内存，刷新需重填。</li><li>失败时查看提示，随时切回本地，不自动替换服务商。</li></ol>'));
 const actions=main.querySelector('.result-actions');
 if(actions&&!main.querySelector('[data-guide="result"]'))actions.before(guide('result','看懂以后，可以怎样继续？','<p>读完三种回复后，使用回复旁的“抄下来”按钮复制合适的表达；想以后回看，使用下方收进回音簿按钮。解读仅供参考，回复前可以自己改写。</p><div class="purpose-links"><a class="btn" href="#/照见">了解自己的反应</a><a class="btn" href="#/共鸣">找个人聊聊</a><a class="btn" href="#/回音簿">查看已保存结果</a></div>'));
}
const observer=new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(enhance);}});
const app=document.getElementById('app');observer.observe(app,{childList:true,subtree:true});enhance();
app.addEventListener('click',event=>{const link=event.target.closest('.onboarding-guide a[href^="#/"]');if(link&&window.HuiYinJie){event.preventDefault();window.HuiYinJie.前往(decodeURIComponent(link.hash.slice(1)));}});
addEventListener('pagehide',()=>observer.disconnect(),{once:true});
addEventListener('pageshow',e=>{if(e.persisted){observer.observe(app,{childList:true,subtree:true});enhance();}});
