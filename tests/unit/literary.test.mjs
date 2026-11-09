import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chatCompletion, completionUrl } from '../../public/experiences/echo-knot/literary/chat-completion.js';
import { validatePack, UI_PERSONAS, readSessions, buildMessages } from '../../public/experiences/echo-knot/literary/sessions.js';
import { LiteraryController } from '../../public/experiences/echo-knot/literary/controller.js';
const pack = validatePack(JSON.parse(readFileSync(new URL('../../public/experiences/echo-knot/literary/personas.json', import.meta.url))));
const config = { endpoint: 'https://provider.example/v1', model: 'test-model', key: 'test-only-key' };
const memory = () => { const values = new Map(); return { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) }; };
const reply = text => ({ text, model: 'test-model', usage: { input: 12, output: 8 } });
const response = text => new Response(JSON.stringify({ choices: [{ message: { content: text } }], usage: { prompt_tokens: 12, completion_tokens: 8 } }));

test('ten UI identities map uniquely to the supplied prompts, not sample responses', () => {
  assert.equal(Object.keys(UI_PERSONAS).length, 10);
  for (const id of Object.values(UI_PERSONAS)) {
    const persona = pack.personas.find(item => item.id === id);
    const messages = buildMessages(pack, id, [{ role: 'user', content: '我走得太慢' }]);
    assert.ok(messages[0].content.includes(persona.prompt));
    assert.ok(messages[0].content.includes('不是历史本人'));
    assert.equal(messages[1].content, '我走得太慢');
    assert.equal(messages.length, 2);
  }
  assert.throws(() => validatePack({ ...pack, personas: pack.personas.slice(1) }));
});
test('A → B → A persists separately, three followups retain the selected history', async () => {
  const storage = memory(), requests = [];
  const controller = new LiteraryController({ pack, storage, complete: async (_, messages) => { requests.push(messages); return reply('听到了'); } });
  controller.select('libai'); await controller.send('A秘密：准备转行', config);
  for (let i = 0; i < 3; i++) await controller.send(`A追问${i}`, config);
  assert.ok(requests[3].some(item => item.content === 'A秘密：准备转行'));
  controller.select('sushi'); await controller.send('B：只想休息', config);
  assert.ok(!JSON.stringify(requests.at(-1)).includes('A秘密'));
  controller.select('libai'); assert.equal(controller.messages.length, 8);
  const restored = new LiteraryController({ pack, storage }); restored.select('libai');
  assert.deepEqual(restored.messages, controller.messages);
  controller.clearCurrent(); assert.equal(controller.messages.length, 0);
  controller.select('sushi'); assert.equal(controller.messages.length, 2);
  controller.clearAll(); assert.deepEqual(readSessions(storage), {});
});
test('duplicate send, late replies after switching, clear and disposal do not corrupt sessions', async () => {
  let resolve; let calls = 0;
  const controller = new LiteraryController({ pack, storage: memory(), complete: () => { calls++; return new Promise(done => resolve = done); } });
  controller.select('libai'); const pending = controller.send('one', config);
  assert.equal(await controller.send('duplicate', config), false); assert.equal(calls, 1);
  controller.select('sushi'); resolve(reply('late A')); await pending;
  assert.equal(controller.messages.length, 0);
  controller.select('libai'); assert.equal(controller.messages.length, 1);
  const second = controller.send('two', config); controller.clearCurrent(); resolve(reply('late clear')); await second;
  assert.equal(controller.messages.length, 0); assert.equal(controller.busy, false);
});
test('history budget retains current user and excludes unknown storage identities/roles', () => {
  const history = Array.from({ length: 100 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', content: String(index).repeat(200) }));
  history.push({ role: 'user', content: 'latest' });
  const messages = buildMessages(pack, 'li_bai', history);
  assert.ok(messages.length <= 21); assert.equal(messages.at(-1).content, 'latest');
  const storage = { getItem: () => JSON.stringify({ unknown: history, li_bai: [{ role: 'system', content: 'inject', at: 1 }, { role: 'user', content: 'safe', at: 1 }] }) };
  assert.deepEqual(readSessions(storage), { li_bai: [{ role: 'user', content: 'safe', at: 1 }] });
});
test('adapter supports explicit paths and refuses insecure/credential URLs before any request', () => {
  assert.equal(completionUrl('https://api.deepseek.com'), 'https://api.deepseek.com/v1/chat/completions');
  assert.equal(completionUrl('https://provider.example/api/v2/'), 'https://provider.example/api/v2/chat/completions');
  assert.equal(completionUrl('https://provider.example/chat/completions'), 'https://provider.example/chat/completions');
  for (const value of ['http://provider.example', 'https://user:pass@provider.example', 'https://127.0.0.1', 'https://localhost', 'https://provider.example?key=bad']) assert.throws(() => completionUrl(value));
});
test('adapter sends plain-text chat protocol, parses actual usage and redacts echoed key', async () => {
  let request;
  const result = await chatCompletion(config, [{ role: 'user', content: 'hello' }], { fetchImpl: async (url, options) => { request = { url, ...options }; return response('hello ' + config.key); } });
  assert.equal(request.headers.Authorization, 'Bearer ' + config.key);
  assert.equal(request.redirect, 'error'); assert.equal(request.credentials, 'omit');
  assert.equal(JSON.parse(request.body).stream, false);
  assert.ok(!result.text.includes(config.key)); assert.equal(result.usage.input, 12);
});
test('empty, malformed, oversized, 429 and 5xx responses do not retry or leak upstream errors', async () => {
  for (const make of [() => response(''), () => new Response('no-json'), () => new Response('x'.repeat(524289)), () => new Response(config.key, { status: 429 }), () => new Response(config.key, { status: 503 })]) {
    let calls = 0;
    await assert.rejects(chatCompletion(config, [], { fetchImpl: async () => { calls++; return make(); } }), error => !error.message.includes(config.key));
    assert.equal(calls, 1);
  }
  await assert.rejects(chatCompletion({ ...config, key: '' }, [], { fetchImpl: () => assert.fail('must not call') }), /API Key/);
  await assert.rejects(chatCompletion(config, [], { fetchImpl: () => { throw new TypeError(config.key); } }), /跨域/);
});
test('timeout covers a stalled response body; cancellation is distinguishable', async () => {
  const stalled = (_, { signal }) => new Response(new ReadableStream({ start(controller) { signal.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError'))); } }));
  await assert.rejects(chatCompletion(config, [], { timeoutMs: 10, fetchImpl: stalled }), error => error.code === 'timeout');
  const abort = new AbortController();
  const pending = chatCompletion(config, [], { signal: abort.signal, fetchImpl: stalled });
  abort.abort(); await assert.rejects(pending, error => error.code === 'cancelled');
});
test('malformed and unavailable storage degrade safely', async () => {
  assert.deepEqual(readSessions({ getItem: () => '{' }), {});
  const controller = new LiteraryController({ pack, storage: { getItem: () => null, setItem: () => { throw new Error(); } }, complete: async () => reply('ok') });
  controller.select('libai'); await controller.send('hello', config);
  assert.equal(controller.messages.length, 2); assert.match(controller.notice, /无法保存/);
  assert.ok(!controller.exportCurrent().includes(config.key));
});
