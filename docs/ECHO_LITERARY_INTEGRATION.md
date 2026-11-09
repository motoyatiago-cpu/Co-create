# 回音结 · AI文学回声本地接入

## 版本边界

- 基于第1组站 `aa4aace`，隔离分支 `feature/echo-knot-literary-ai`。
- 独立工作树 `outputs/Co-create-echo-ai`；原 `outputs/Co-create` 仍在 `feature/celia-home-team`。
- 不合并主线，不推送生产分支，不运行Cloudflare部署。本轮未使用任何真实模型凭据、未产生模型API费用。
- 没有上游Vue工程。用户明确批准以现有单文件HTML为基线，采用独立模块+最小可回滚桥接。没有还原或重建整站。

## 功能与数据

在原十人人物的「共鸣」页面内增加本地/AI模式切换，原界面、人物、引句、本地引擎与回音簿保留。

AI面板通过标准Custom Element `echo-literary-chat` 的 `persona-id` 属性接收原页面当前选择；无Vue私有实例读取、无React或Vue新依赖、无DOM全局观察器。AI模式仅隐藏旁边的原聊天区，返回本地即可继续原功能。

- 十人设定原样来自用户JSON；UI旧ID映射到JSON稳定ID，未重复新增人物，未修改人设文本。原作引句保留在人物卡；新回应明确标为AI生成，不拼接sources链接或sample假装原文/历史消息。
- AI会话按JSON人物ID隔离。每人最多保留40条消息于当前标签页sessionStorage；请求只带当前人物最近20条、至多12,000字符，再加此人固定Prompt。没有后台永久记忆和跨人物上下文。
- 切人、清空、离开共鸣或停止等待均中止本地等待，丢弃迟到回复。服务商可能仍处理/计费，界面明确提示且不自动重试。
- 无配置、空响应、HTTP异常、超时、跨域失败都有显式说明与“返回本地回声”入口。失败不插入假的AI回应。
- 清空此人、清空全部与原回音簿互不混淆；导出只包含所选人物AI会话，不含Key。
- 新面板独立配置Base URL/Model ID/个人Key，与原「解结」外部引擎设置分开，避免接管原状态。只有点击发送才调用。
- 新面板Key仅页面内存。原设置也移除了Key持久化；首次载入清掉旧localStorage里遗留的Key。两处刷新均须重填。地址/模型可保留。
- 仅“共鸣”直达链接借助已有公开 `HuiYinJie.前往()` API在加载后恢复；未重写原路由器。原路由的其他中文深链接刷新行为不属本轮改动。

sessionStorage不是加密仓库，也不是严格的标签页安全边界（复制标签页时浏览器可能复制初始存储）；同源脚本可读。本轮未承诺服务商不留存或匿名化输入。界面发送前明确告知上下文去向与可能计费。

## 文件

| 文件 | 作用 |
| --- | --- |
| `public/experiences/echo-knot/literary/personas.json` | 用户提供的十人设定，未改内容。 |
| `literary/panel.js`、`literary/panel.css` | 可独立维护的同页面板、触屏/键盘操作及接入设置。 |
| `literary/controller.js` | 发送、取消、切换、清空、导出的状态机。 |
| `literary/sessions.js` | UI→人设ID映射，存储校验和限定上下文。 |
| `literary/chat-completion.js` | HTTPS OpenAI兼容Adapter；全文超时、响应体大小上限、错误分类与usage。 |
| `literary/preferences.js` | 原设置读写的密钥迁移及非持久化策略。 |
| `public/experiences/echo-knot/index.html` | 仅5个精确补丁，新增引用/挂载点、设置读写及两处真实提示。 |
| `scripts/echo-literary-bridge.mjs` | 精确锚点、基线SHA检查和反向回滚；拒绝静默覆盖较新的HTML。 |
| `tests/unit/literary.test.mjs` | 隔离、取消、上下文、错误、正文超时等单元测试。 |
| `tests/literary.spec.ts` | 桌面/触屏真实浏览器交互、旧协议与密钥回归。 |
| `playwright.echo.config.ts` | 在4186测试本工作树生产构建；仅原45人TSX容量夹具在4188开发服务验收，避免误测4175旧站。 |

`src/`全部主站模块、32位成员数据、联系人、另外两项独立体验、package-lock及运行库均保持原样。

## 本机预览与测试

在隔离工作树内：

```powershell
npm ci --ignore-scripts
npm run build
npm run preview -- --port 4187 --strictPort
```

打开 `http://127.0.0.1:4187/experiences/echo-knot/index.html#/共鸣`，或主站→产品展厅→回音结→共鸣。默认本地模式；选择“AI文学回声”后展开设置并填本人信任的服务商。Base URL可填根地址、版本路径或完整chat/completions路径；根地址采用原网站的 `/v1/chat/completions` 补全规则。只接受公网HTTPS域名，不支持本机HTTP模型或Anthropic Messages协议。

```powershell
$env:PLAYWRIGHT_CHANNEL='msedge'
npm run test:echo
```

测试使用假Key和拦截的模拟接口，无外网付费调用。截图中明确显示模拟测试文案。生产构建只复制public模块，不会由Vite替这些模块做类型检查；新增逻辑另由Node单元测试和浏览器运行验证。

## 最小回滚

只检查桥接：`node scripts/echo-literary-bridge.mjs`。

恢复原单文件：`node scripts/echo-literary-bridge.mjs --rollback`。它会反向移除5处补丁并验证还原的基线SHA；之后新增模块不被页面引用。重新接入使用 `--apply`。这会恢复旧版Key存储行为，属于整体回退，不建议作为隐私修复的日常开关。

整体撤回使用本隔离分支提交的 `git revert <提交>`；不要重置原开发分支或强制覆盖远端。获得Vue上游源码后，应在对应组件里实现相同的显式属性契约，再废弃这份构建产物补丁。

## 仍需人工验收

真实服务商尚未验证：十人同题的实际风格差异、三轮追问的模型内容质量、指定Model ID与浏览器CORS、实际usage和费用。网络拦截测试只证明请求包含正确设定与隔离历史，不证明模型会遵循设定。没有工作室共享付费Key、代理、服务器鉴权/频率/额度限制；不能据此开放无门槛的团队付费试用。任何Preview/Production部署另行确认，本轮不部署。

## 实际验收结果

- `npm run test:echo` 成功：桥接反向SHA校验、TypeScript主站构建、Vite生产打包、9项Node单元测试、30项桌面/手机Playwright测试全部通过。
- 其中28项浏览器检查针对生产构建；原45人容量夹具需要TSX源码转换，因此2项容量测试在同一隔离工作树的Vite开发端口运行，未删除或放宽断言。首次直接在生产服务测此夹具失败，定位为夹具不是生产入口后修正测试服务配置。
- 十人人设逐一映射；同人物3次追问请求包含已有历史；A/B不串上下文；刷新、清空此人/全部、导出、重复发送、取消/迟到响应、切人/卸载清理通过。
- 320/390/768/1024/1440px检查以目标CSS宽度为准，不以可能被手机缩放扩大的innerWidth掩盖溢出。桌面/触屏操作、键盘模式切换、原本地回声及原解结JSON调用通过。
- 原32位成员可搜索与开卡，5位联系人顺序、五区导航、两款产品及四幕故事入口、音效开关/恢复/音量测试均通过；其源文件与资料未修改。
- 用户人物JSON结构与内容对比完全一致。主站原工作树保持干净，冻结AI World工作区保持干净。
- 既有Three主包约809.6kB的构建体积警告仍存在；本轮没有新增依赖或扩大主包。单文件补丁是经授权的过渡接入方式，后续更新HTML必须先重新核对锚点与基线，不能盲目覆盖。

证据：`evidence/echo-literary/validation.log`、`result.json`、`desktop.png`、`mobile.png`。截图内的回答显式标记为模拟接口测试，不是模型效果验收。
