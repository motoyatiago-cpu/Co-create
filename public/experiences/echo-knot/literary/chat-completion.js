// Browser BYOK adapter. No provider SDK, key persistence, retries or server proxy.
export class CompletionError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export function completionUrl(input) {
  let url;
  try { url = new URL(String(input).trim()); } catch {
    throw new CompletionError('config', '请填写完整的 HTTPS Base URL。');
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      !host.includes('.') || host.endsWith('.local') || host.endsWith('.localhost') ||
      host.includes(':') || /^\d+(\.\d+){3}$/.test(host)) {
    throw new CompletionError('config', '接入仅支持不含账号、查询参数的公网 HTTPS 地址。');
  }
  const path = url.pathname.replace(/\/+$/, '');
  url.pathname = /\/chat\/completions$/i.test(path) ? path :
    /\/v\d+$/i.test(path) ? `${path}/chat/completions` : `${path}/v1/chat/completions`;
  return url.href;
}

async function readBounded(response) {
  const limit = 512 * 1024;
  if (Number(response.headers.get('content-length')) > limit) {
    await response.body?.cancel();
    throw new CompletionError('response', '服务商返回的数据过大，已停止读取。');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new CompletionError('empty', '服务商没有返回正文。');
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new CompletionError('response', '服务商返回的数据过大，已停止读取。');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch {
    throw new CompletionError('response', '服务商返回的不是有效 JSON。');
  }
}

export async function chatCompletion(config, messages, {
  signal, timeoutMs = 30000, fetchImpl = fetch, maxTokens = 900,
} = {}) {
  const url = completionUrl(config.endpoint);
  if (!config.model?.trim() || !config.key?.trim()) {
    throw new CompletionError('config', '请先填写 Model ID 和你自己的 API Key，或返回本地回声。');
  }
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) cancel(); else signal?.addEventListener('abort', cancel, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: 'POST', redirect: 'error', credentials: 'omit', referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.key.trim()}` },
      body: JSON.stringify({ model: config.model.trim(), messages, stream: false, max_tokens: maxTokens }),
      signal: controller.signal,
    });
    if (!response.ok) {
      await response.body?.cancel();
      const message = response.status === 429 ? '服务商限流或额度不足（429），请稍后手动再试。' :
        response.status === 401 || response.status === 403 ? '服务商拒绝了密钥或访问权限，请检查设置。' :
        `服务商调用失败（${response.status}），可以返回本地回声。`;
      throw new CompletionError('http', message);
    }
    const payload = await readBounded(response);
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new CompletionError('empty', '服务商返回空文本，没有生成 AI 回应。');
    }
    const usage = payload.usage || {};
    const token = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
    return {
      text: content.trim().split(config.key.trim()).join('[密钥已隐藏]'),
      model: config.model.trim(),
      usage: { input: token(usage.prompt_tokens), output: token(usage.completion_tokens) },
      truncated: payload.choices[0].finish_reason === 'length',
    };
  } catch (error) {
    if (timedOut) throw new CompletionError('timeout', '等待超时。服务商可能已处理并计费；不会自动重试。');
    if (controller.signal.aborted) throw new CompletionError('cancelled', '本次等待已取消。服务商可能仍在处理，不会自动重试。');
    if (error instanceof CompletionError) throw error;
    // Never echo upstream bodies, URLs, request headers or raw exceptions containing a key.
    throw new CompletionError('network', '无法连接（可能是网络或浏览器跨域限制）。请求可能已到达服务商，可返回本地回声。');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}
