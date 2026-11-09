import { chatCompletion } from './chat-completion.js';
import { UI_PERSONAS, readSessions, writeSessions, buildMessages } from './sessions.js';

// Independent state machine: no access to the embedded Vue app's private state.
export class LiteraryController {
  constructor({ pack, storage, complete = chatCompletion, onChange = () => {} }) {
    this.pack = pack; this.storage = storage; this.complete = complete; this.onChange = onChange;
    this.sessions = readSessions(storage); this.personaId = ''; this.busy = false;
    this.notice = ''; this.request = null; this.generation = 0;
  }
  get persona() { return this.pack.personas.find(item => item.id === this.personaId); }
  get messages() { return this.sessions[this.personaId] || []; }
  persist() {
    if (!writeSessions(this.storage, this.sessions)) this.notice = '浏览器无法保存会话；当前页面仍可使用，刷新可能丢失。';
  }
  select(uiId) {
    const id = UI_PERSONAS[uiId];
    if (!id || id === this.personaId) return;
    this.cancel(); this.personaId = id;
    this.notice = '只向当前人物发送此人的最近对话；不会共享其他人物的会话。';
    this.onChange();
  }
  cancel() {
    const pending = this.busy;
    this.generation += 1; this.request?.abort(); this.request = null; this.busy = false;
    if (pending) this.notice = '已停止等待；服务商可能仍在处理或计费，没有自动重试。';
  }
  async send(input, config) {
    const text = input.trim();
    if (!text || text.length > 300 || this.busy || !this.persona) return false;
    const id = this.personaId, generation = ++this.generation;
    this.sessions[id] ??= [];
    this.sessions[id].push({ role: 'user', content: text, at: Date.now() });
    this.sessions[id] = this.sessions[id].slice(-40);
    this.busy = true; this.notice = '正在等待 AI 文学回声……'; this.request = new AbortController();
    this.persist(); this.onChange();
    try {
      const result = await this.complete(config, buildMessages(this.pack, id, this.sessions[id]), { signal: this.request.signal });
      if (generation !== this.generation || id !== this.personaId) return false;
      this.sessions[id].push({ role: 'assistant', content: result.text, at: Date.now() });
      this.sessions[id] = this.sessions[id].slice(-40);
      const { input, output } = result.usage;
      this.notice = `AI 生成 · ${result.model} · ${input === null ? '用量未报告' : `输入 ${input} / 输出 ${output ?? '未知'} tokens`}。` +
        (result.truncated ? '回复达到长度上限，可能尚未说完。' : '费用以服务商账单为准。');
      this.persist(); return true;
    } catch (error) {
      if (generation !== this.generation) return false;
      this.notice = error.message + ' 本地回声始终可用。';
      return false;
    } finally {
      if (generation === this.generation) {
        this.busy = false; this.request = null; this.onChange();
      }
    }
  }
  clearCurrent() {
    this.cancel(); delete this.sessions[this.personaId]; this.persist();
    this.notice = '此人物的 AI 对话已清空；其他人物与原回音簿保持不变。'; this.onChange();
  }
  clearAll() {
    this.cancel(); this.sessions = {}; this.persist();
    this.notice = '所有人物的 AI 短期会话已清空；原回音簿保持不变。'; this.onChange();
  }
  exportCurrent() {
    return JSON.stringify({ product: '回音结·AI文学回声', persona: this.persona?.name, messages: this.messages }, null, 2);
  }
}
