import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildMessages } from '../../public/experiences/echo-knot/literary/sessions.js';
import { LiteraryController } from '../../public/experiences/echo-knot/literary/controller.js';
const pack = JSON.parse(readFileSync(new URL('../../public/experiences/echo-knot/literary/personas.json', import.meta.url)));
const hashes = JSON.parse(readFileSync(new URL('../fixtures/literary-character-hashes.json', import.meta.url)));
const sha = value => createHash('sha256').update(value).digest('hex');

test('ten characters retain every reference field and all personality content after their opening identity clause', () => {
  assert.equal(pack.personas.length, 10);
  for (const { prompt, ...persona } of pack.personas) {
    const expected = hashes.find(item => item.id === persona.id);
    assert.equal(sha(JSON.stringify(persona)), expected.referenceHash);
    assert.ok(prompt.startsWith(`你是${persona.name}。`));
    let traits = prompt.slice(prompt.indexOf('。') + 1);
    if (persona.id === 'li_qingzhao') traits = traits.replace('你博学', '她博学');
    assert.equal(sha(traits), expected.promptTraitsHash);
  }
});

test('ordinary dialogue enters first person; identity disclosure is conditional, not a fixed opener or footer', () => {
  for (const persona of pack.personas) {
    const system = buildMessages(pack, persona.id, [{ role: 'user', content: '你好' }])[0].content;
    assert.ok(system.startsWith('你正在参与一场文学角色对话。'));
    assert.ok(system.includes('只有当用户明确询问角色是否真实存在、是否为历史人物本人时'));
    assert.ok(system.includes('默认直接进入角色'));
    assert.ok(system.includes('简单问候可以只回一两句'));
    assert.ok(system.includes('不必每条回复都以问题结尾'));
    assert.ok(system.includes('仅在话题适用时参考，不是每轮必须执行的流程'));
    assert.ok(system.includes('不推测对方藏着心事'));
    assert.ok(!system.includes('每次通常 60—140'));
    assert.ok(!system.includes('这是浏览器预设的文学演绎，不是历史本人'));
    assert.ok(!system.includes('当前角色仅由服务端提供'));
  }
});

test('four roles send all five specified cases and five ordinary followups with unchanged API/history semantics', async () => {
  let calls = 0;
  for (const [uiId, id, name] of [['libai', 'li_bai', '李白'], ['liqingzhao', 'li_qingzhao', '李清照'], ['luxun', 'lu_xun', '鲁迅'], ['sushi', 'su_shi', '苏轼']]) {
    const persona = pack.personas.find(item => item.id === id);
    const controller = new LiteraryController({ pack, storage: { getItem: () => null, setItem: () => {} }, complete: async (config, messages) => {
      assert.deepEqual(config, { marker: 'adapter-config-unchanged' });
      assert.ok(messages[0].content.includes(persona.prompt));
      assert.ok(messages[0].content.includes(pack.shared_system_prompt));
      assert.equal(messages.at(-1).role, 'user');
      assert.deepEqual(messages.slice(1), controller.messages.map(({ role, content }) => ({ role, content })));
      calls++;
      return { text: `请求传递测试占位${calls}，不代表模型效果`, model: 'mock', usage: { input: 1, output: 1 } };
    } });
    controller.select(uiId);
    for (const input of ['你好', '心情不好', '今天遇到一件特别开心的事', '你觉得自己是个什么样的人？', `你真的是历史上的${name}吗？`, '我今天散步时看见一只猫。', '它蹲在书店门前，像个掌柜。', '我买了一本旧书，封面已经卷边了。', '你更喜欢热闹的长街，还是安静的小巷？', '那就坐一会儿，不急着赶路。']) {
      assert.equal(await controller.send(input, { marker: 'adapter-config-unchanged' }), true);
    }
    assert.equal(controller.messages.length, 20);
  }
  assert.equal(calls, 40);
});

test('prompt fix does not strip or rewrite existing replies, quotations, or user messages', () => {
  const history = [{ role: 'user', content: '旧会话' }, { role: 'assistant', content: '我是依据作品生成的文学回声。' }, { role: 'user', content: '现在想闲谈' }];
  assert.deepEqual(buildMessages(pack, 'li_bai', history).slice(1), history);
});
