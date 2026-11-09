# AI文学回声 · 人物沉浸感修复

基线 `818fd28`；隔离工作树 `outputs/Co-create-echo-immersion`，分支 `feature/echo-knot-persona-immersion`。本报告描述本轮增量；上一轮接入报告及模拟接口截图对应上一版本。

## 定位结果

| 上游位置 | 原有问题 | 本轮修改 |
| --- | --- | --- |
| `personas.json / shared_system_prompt` | 以“回声引擎”定义说话者，强调生成身份；普通回复默认60–140字，容易把问候写成长篇接待。 | 替换为用户提供的文学角色对话规则：第一人称、自然长度、不主动解释身份、真实身份仅在明确询问时说明。 |
| `personas.json / personas[*].prompt` | 十人开头均以“某人作品/生平形成的回声”自我定义。 | 只把首句改为“你是某某。”，不改其性格、价值观、经历约束和表达倾向；李清照随后“她博学”改为“你博学”。 |
| `sessions.js / buildMessages()` | 末尾再次强调“不是历史本人”；“回应方法”容易被理解为每轮必执行的咨询流程。 | 移除重复身份尾注；回应方法标为话题适用时的可选参考；说明问候/喜悦不必转为排解烦恼，不推测未表达的心事，不强制共情→分析→建议→追问。 |

角色卡的关键词、grounding、tension、thinking、voice、response_method、avoid、sample、sources、姓名与ID均保留。样例没有加入API few-shot历史，也没有复制用户的“合格示例”成为固定回复。保留作品出处准确性要求，真实性问答有明确条件。

## messages与功能边界

`buildMessages()`只改变首条system的内容与组装标签；历史窗口的角色、内容、顺序、长度和存储机制未改。旧回复即使含身份说明，也原样保留，未做输出过滤或字符串删句。

API Adapter、Token统计、控制器、会话隔离、存储、请求取消、错误处理、本地回退、HTML桥接、样式、页面结构均未修改。没有修改其他小组模块，没有发布Cloudflare。

本地模式检查发现：原单文件中的`tC`有一条“孤独”关键词回复含“虽然我只是一个回声”，并有通用安慰句；这不是AI Prompt产生的。它和页面固定的本地模式说明均保留。本轮只修AI Prompt，未声称本地规则引擎获得了同样的角色表达改进。

## 自动化验收

- 生产构建通过；原Three主包体积警告保留。
- Node单元测试13项通过。新增逐人物哈希校验，保护除身份首句以外的角色资料；核对四人指定五题+五轮闲谈共40个请求的Prompt和历史传递，使用明确的测试占位回复，**不作为模型内容质量证据**。
- Playwright 30项通过（28项生产构建、2项原TSX容量夹具）。原十人人物选择、API请求、Token、A/B历史、刷新/取消/清空/导出、本地回退及全站回归均通过。
- 日志：`evidence/echo-immersion/validation.log`。原接入测试会重生成上轮模拟截图，本轮不将这些变化当作人物效果对照。

## 真实模型验收方式

修复前在旧预览沿用已配置的`deepseek-flash`，实际发送4次“你好”，记录见`evidence/echo-immersion/before.json`。李白/李清照已有问候历史，未删除用户会话；因此只作可见行为对照，不声称是严格相同上下文的A/B实验。李清照原有首答明确出现“从……整理出来的回声，并非她本人”，本轮追加问候仍偏向“找出心事”的接待话术。

修复版使用独立4190预览和新会话，避免让旧身份声明污染新测试。用户在该页面填写个人Key；旧页面的Key仅在内存，未提取、复制或写入测试文件。首次鉴权被拒绝，停止后续调用，用户重填后才显式重测。李白保留了该次失败留下的一条未获回复的“你好”，其余三人从空会话开始。

已逐一实测李白、李清照、鲁迅、苏轼：你好、心情不好、今天遇到一件特别开心的事、你觉得自己是个什么样的人、直接询问历史本人，以及连续5轮普通闲谈，共40条成功回复。

- 36条非真实性询问中，未出现主动声明模拟身份的文字。
- 4条真实性回答都澄清非历史本人；李白/李清照用“文字对话”，鲁迅/苏轼明确说“AI文学对话”，保留原文供人工判断准确性。
- 4人各有10条成功回复，以问号收尾分别为3、2、3、2条；不强制每轮追问。
- 人格自述能分别体现自尊与济世愿望、才学与挑剔、犀利与自省、温厚与日常生活感。连续闲谈能接上猫、书店、旧书、街巷，真实性解释后能继续进入角色。
- 仍有场景重复：四人问候都出现坐下/待客，李清照和苏轼出现茶。没有把这种共同场景描述成“模板感完全消除”。本轮只是一组样本，不保证所有后续生成。
- 修复版40条成功调用实际报告输入43,198、输出5,668 tokens；未查询账单，不推断扣费。旧版4条采样用量另列before.json。

[四人完整对话、问候前后对照与人工阅读结论](../evidence/echo-immersion/dialogue-comparison.md)。原始响应在`after.json`，统计在`metrics.json`，实际页面截图为`real-model-preview.jpg`；模型原文未删句或改写。采样的elapsedMs含浏览器轮询/人工检查时间，不能当模型延迟基准。

## 修改文件

业务改动仅两份：`public/experiences/echo-knot/literary/personas.json`、`public/experiences/echo-knot/literary/sessions.js`中的Prompt组装。

验证与报告：更新`tests/unit/literary.test.mjs`，新增`tests/unit/persona-prompt.test.mjs`、`tests/fixtures/literary-character-hashes.json`、本说明，以及`evidence/echo-immersion/`里的真实对话、统计、日志与截图。

## 本机复现

```powershell
npm ci --ignore-scripts
$env:PLAYWRIGHT_CHANNEL='msedge'
npm run test:echo
npm run preview -- --port 4190 --strictPort
```

打开 `http://127.0.0.1:4190/experiences/echo-knot/index.html#/共鸣`。选择AI文学回声，在原有设置中填入自己的服务商。代码/构建更新后需刷新才能重新加载人设；刷新会清掉内存Key，但保留已有短期会话。比较新旧Prompt时建议使用新的测试标签页，而不删除用户原有会话。
