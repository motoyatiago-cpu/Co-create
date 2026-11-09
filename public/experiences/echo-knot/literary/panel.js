import { LiteraryController } from './controller.js';
import './onboarding.js';
import { validatePack } from './sessions.js';

// The baseline router redirects encoded Chinese deep links to home on refresh.
// Restore only this integration's route through the app's existing PUBLIC API.
let initialRoute = '';
try { initialRoute = decodeURIComponent(location.hash.slice(1)); } catch { /* Invalid URL. */ }
window.addEventListener('load', () => {
  if (/^\/共鸣(?:\?|$)/.test(initialRoute)) window.HuiYinJie?.前往(initialRoute);
}, { once: true });

const CONFIG_KEY = 'echo-knot:literary:config:v1';
// Deliberately memory-only. Refresh discards the key; navigation within this page does not.
const config = { endpoint: '', model: '', key: '' };
try {
  const saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
  config.endpoint = typeof saved.endpoint === 'string' ? saved.endpoint : '';
  config.model = typeof saved.model === 'string' ? saved.model : '';
} catch { /* Storage may be disabled. */ }
let packPromise;
function loadPack() {
  return packPromise ??= fetch(new URL('./personas.json', import.meta.url))
    .then(response => { if (!response.ok) throw new Error(); return response.json(); })
    .then(validatePack);
}
function sessionStore() {
  try { return sessionStorage; } catch {
    return { getItem: () => null, setItem: () => { throw new Error('Storage unavailable'); } };
  }
}

class EchoLiteraryChat extends HTMLElement {
  static observedAttributes = ['persona-id'];
  connectedCallback() {
    this.events?.abort(); this.events = new AbortController();
    this.innerHTML = `
      <div class="literary-modes" role="group" aria-label="回声模式">
        <button type="button" data-mode="local" aria-pressed="true">本地回声</button>
        <button type="button" data-mode="ai" aria-pressed="false">AI文学回声</button>
      </div>
      <section class="literary-panel" aria-label="AI文学回声对话" hidden>
        <p class="literary-kicker">文学角色演绎 · 非历史本人或原话</p>
        <h3 class="literary-heading"></h3>
        <p class="literary-privacy">仅暂存在本标签页，其他人物看不到此人的对话。每次发送会把当前人物最近约10轮对话交给你设置的服务商，可能计费。本机同源脚本可读取这些会话，请勿输入敏感资料。</p>
        <details class="literary-settings">
          <summary>AI接入设置（使用自己的Key）</summary>
          <p>仅用于此处的AI文学回声。解结的外部引擎仍在原「设置」页面配置。</p>
          <label>Base URL<input name="endpoint" type="url" autocomplete="off" spellcheck="false" placeholder="https://你的服务商/v1"></label>
          <label>Model ID<input name="model" autocomplete="off" spellcheck="false" placeholder="填写服务商提供的模型ID"></label>
          <label>API Key<input name="key" type="password" autocomplete="off" spellcheck="false" placeholder="仅当前页面内存保存，刷新后需重填"></label>
          <p>地址和模型留在本浏览器；Key不写入浏览器存储、会话或导出文件。只向你填写的服务商发送，不自动重试或换服务商。浏览器跨域许可由服务商决定。</p>
          <button type="button" data-action="forget-key">清除AI密钥</button>
        </details>
        <div class="literary-messages" role="log" aria-label="当前人物AI对话"></div>
        <p class="literary-notice" role="status" aria-live="polite"></p>
        <form class="literary-form">
          <label>写给这位文学回声<textarea name="message" rows="3" maxlength="300" placeholder="从一句真实的烦恼开始，最多300字。"></textarea></label>
          <div class="literary-send-row"><span>Enter发送 · Shift+Enter换行</span><button type="submit">发送AI回声</button></div>
        </form>
        <div class="literary-actions">
          <button type="button" data-action="cancel" hidden>停止等待</button>
          <button type="button" data-action="local">返回本地回声</button>
          <button type="button" data-action="export">导出此人AI对话</button>
          <button type="button" data-action="clear">清空此人AI对话</button>
          <button type="button" data-action="clear-all">清空全部AI对话</button>
        </div>
      </section>`;
    const signal = this.events.signal;
    this.mode = 'local';
    this.querySelectorAll('[data-mode]').forEach(button => {
      button.addEventListener('click', () => this.setMode(button.dataset.mode), { signal });
    });
    for (const name of ['endpoint', 'model', 'key']) {
      const input = this.querySelector(`[name="${name}"]`); input.value = config[name];
      input.addEventListener('input', () => {
        config[name] = input.value;
        try { localStorage.setItem(CONFIG_KEY, JSON.stringify({ endpoint: config.endpoint, model: config.model })); } catch { /* Optional. */ }
      }, { signal });
    }
    this.querySelector('form').addEventListener('submit', event => { event.preventDefault(); this.send(); }, { signal });
    this.querySelector('textarea').addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); this.send(); }
    }, { signal });
    this.querySelectorAll('[data-action]').forEach(button => {
      button.addEventListener('click', () => this.action(button.dataset.action), { signal });
    });
    this.setMode('local');
    loadPack().then(pack => {
      if (signal.aborted) return;
      this.controller = new LiteraryController({ pack, storage: sessionStore(), onChange: () => this.render() });
      this.controller.select(this.getAttribute('persona-id'));
    }).catch(() => {
      if (!signal.aborted) this.querySelector('.literary-notice').textContent = '人物配置加载失败，请返回本地回声或刷新页面。';
    });
    window.addEventListener('pagehide', () => this.controller?.cancel(), { signal });
  }
  attributeChangedCallback() {
    this.controller?.select(this.getAttribute('persona-id'));
    const draft = this.querySelector('textarea'); if (draft) draft.value = '';
  }
  disconnectedCallback() {
    this.controller?.cancel(); this.events?.abort();
    this.parentElement?.removeAttribute('data-literary-mode');
  }
  setMode(mode) {
    this.mode = mode;
    if (mode === 'local') this.controller?.cancel();
    this.parentElement?.setAttribute('data-literary-mode', mode);
    this.querySelector('.literary-panel').hidden = mode !== 'ai';
    this.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
    if (!config.key) this.querySelector('details').open = true;
    this.render();
  }
  async send() {
    const controller = this.controller, textarea = this.querySelector('textarea');
    if (!controller || controller.busy || !textarea.value.trim()) return;
    const input = textarea.value; textarea.value = '';
    // Capture settings at send time; editing or clearing controls cannot redirect an in-flight request.
    await controller.send(input, { ...config });
  }
  action(action) {
    if (action === 'local') { this.setMode('local'); return; }
    if (action === 'forget-key') {
      config.key = ''; this.querySelector('[name="key"]').value = '';
      this.controller?.cancel();
      if (this.controller) { this.controller.notice = 'AI密钥已从当前页面清除；已发出的请求无法撤回。'; this.render(); }
      return;
    }
    const controller = this.controller; if (!controller) return;
    if (action === 'cancel') { controller.cancel(); this.render(); }
    if (action === 'clear' && confirm('清空此人的AI对话？其他人物不受影响。')) controller.clearCurrent();
    if (action === 'clear-all' && confirm('清空全部人物的AI短期会话？原回音簿不受影响。')) controller.clearAll();
    if (action === 'export') {
      const url = URL.createObjectURL(new Blob([controller.exportCurrent()], { type: 'application/json;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = `回音结-${controller.personaId}.json`;
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
  render() {
    const controller = this.controller;
    this.querySelector('[type="submit"]').disabled = !controller || controller.busy;
    if (!controller) return;
    this.querySelector('.literary-heading').textContent = `和${controller.persona?.name || '这位伙伴'}的AI会话`;
    this.querySelector('.literary-notice').textContent = controller.notice;
    this.querySelector('[data-action="cancel"]').hidden = !controller.busy;
    this.querySelector('[type="submit"]').textContent = controller.busy ? '等待回声……' : '发送AI回声';
    const log = this.querySelector('.literary-messages');
    log.replaceChildren();
    if (!controller.messages.length) {
      const empty = document.createElement('p'); empty.className = 'literary-empty';
      empty.textContent = '这里从你的第一句话开始。页面上方的原作引句与这里的AI生成对话分别标示。'; log.append(empty);
    }
    for (const message of controller.messages) {
      const article = document.createElement('article'); article.className = `literary-message is-${message.role}`;
      const author = document.createElement('p'); author.className = 'literary-author';
      author.textContent = message.role === 'user' ? '你' : `${controller.persona.name} · AI生成`;
      const text = document.createElement('p'); text.className = 'literary-text'; text.textContent = message.content;
      article.append(author, text); log.append(article);
    }
    log.scrollTop = log.scrollHeight;
  }
}
customElements.define('echo-literary-chat', EchoLiteraryChat);
