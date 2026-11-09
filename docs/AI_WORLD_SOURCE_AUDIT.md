# AI Native World 源码只读审查 · 2026-11-09

用户要求先检查真实源码，再在第1组网站隔离接入。交接说明中的历史结论只作待核实的线索；以下路径和调用关系均由本机代码核对。

## 基线与边界

- 源码根目录：`C:/minimax code/AI world`。
- 实际 package 版本 `0.4.10`；当前提交 `0f05efb`（启动期 database table is locked 修复），晚于初始多人现场提交 `3f89e30`。
- Expo / React Native / TypeScript / SQLite。只读查看源码、清单、Git状态；没有启动App或网关，没有执行迁移、打开数据库或读取 `.env.local` / SecureStore / 付费凭据。
- Git实际检查时工作区干净。没有修改冻结工程，也没有把其业务源码或数据库移植进网站。

## 真实调用关系与位置

以下路径相对于上述本机根目录，行号为本次检查版本。

| 文件与行号 | 核实的行为 |
| --- | --- |
| `src/core/ai/adapter.ts:125` | `NarrativeAdapter` 契约，`generate(request)` 返回独立结果。 |
| `src/features/storage/ServicesProvider.tsx:105–118,152–155` | 构造 `ExpoSecretStore` → `ByokService` → `RuntimeNarrativeAdapter`；同一运行时适配器注入单人ChatService和StageChatService。 |
| `src/features/ai/runtimeNarrativeAdapter.ts:72,89,198,285` | 选择 Mock / direct / gateway；真实模式校验配置、预算并记用量；direct分支读取个人密钥并创建DirectNarrativeAdapter。没有自动切换收费服务商或自动重试。 |
| `src/features/ai/byokService.ts:98,179` | Profile元数据写Repository；`setSecret()` 单独交给SecretStore；Key不随Profile元数据落SQLite。 |
| `src/features/storage/expoSecretStore.ts:45,67,80–85` | 惰性加载Expo SecureStore；set调用采用 `WHEN_UNLOCKED_THIS_DEVICE_ONLY`；平台不可用时拒绝安全存储，不退回普通数据库。 |
| `src/core/ai/directAdapter.ts:95–143,268–343` | 校验地址/模型/Key，拼装消息，POST OpenAI兼容协议；解析文本、实际usage、HTTP错误并脱敏。 |
| `src/core/ai/messageComposition.ts:28` | 网关与直连共用消息拼装；不是把整个世界数据库直接作为模型上下文。 |
| `src/core/ai/endpointSafety.ts:214` | Direct的URL helper在已验证Base URL后直接追加 `/chat/completions`；与网站原先自动补 `/v1` 的规则有区别，不能混淆。 |
| `gateway/profiles.ts:39,176–194` | 服务器Profile存密钥环境变量引用；不是把付费Key下发给App。 |
| `gateway/providerProtocol.ts:64–97` / `gateway/upstream.ts:95,177` | 网关分发OpenAI兼容/Anthropic协议，调用上游前有地址安全检查；密钥只用于请求头。快捷直连仅OpenAI兼容协议。 |
| `gateway/server.ts:504,579` | 付费请求先持久化预留，完成后结算；预算台账不可用则拒绝，不能用浏览器内的一个计数器替代。 |
| `src/features/memory/memoryService.ts:80–95` | 按saveId+characterId取该角色的knowledge，再按factId关联同存档facts。缺失fact保留null视图，后续过滤；不是取整个事件payload。 |
| `src/features/chat/promptFacts.ts:16–35` | 仅把已授权且非null的facts映射进Prompt；Chat与Stage共用。 |
| `src/features/chat/chatService.ts:138,418,440,500` | 单人会话作用域实际为 `main:<characterId>`；其消息audienceIds为null。`dm:`在路由判断中被识别，不能因此声称完整私信产品已实现。 |
| `src/features/stage/stageChatService.ts:154–171` | 场次会话使用 `stage:<session.id>` 并挂stageSessionId，按saveId作用域复用。 |
| 同文件 `:223–275,295` | 每位角色独立组Prompt：仅该角色授权事实；公开历史必须 `Array.isArray(audienceIds) && includes(characterId)`。null历史不当作公开历史。 |
| 同文件 `:375–397,421,455,487` | 消息写入时冻结真实在场名单为audience；逐角色请求ID、独立模型调用；完成回复也带快照。 |
| `src/core/engine/actions.ts:448–474,809–822` | 只有明确的witnessIds才做逐事实目击授权；校验角色确实位于该地点且进入时间不晚于事件时间。在场不自动升级全部知识。 |

## 与历史说明的差异及可移植原则

历史说明的大方向属实，但它不是当前源码逐行证明。尤其注意：

1. 适配器的“唯一注入点”指应用层注入的运行时适配器；底层仍有Direct/Gateway/Mock三个实现。
2. Direct里 `postDirect()` 的超时在fetch返回响应头后就清除，读取正文发生在后续函数；不能将它描述为已覆盖整个响应体的硬超时。本轮网站的新Adapter把超时覆盖至正文读取完毕，并测试了正文停滞。
3. Direct请求的redirect实际为 `follow`；网站新Adapter采用 `error`，不照搬该设置。
4. iPhone上的直连成功不证明浏览器CORS可用。网站测试拦截接口只能验证协议和交互，不能冒充真实服务商连通。
5. SecureStore不能搬到普通网页。网站仅借鉴“配置/凭据分离、角色隔离、独立请求与取消、显式失败”这些原则。
6. 本轮只做每位文学人物独立的短期消息窗口；不引入世界引擎、事实库、目击授权数据库或永久记忆。

## 官方协议交叉核对

本轮核对了[DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/)及[多轮会话说明](https://api-docs.deepseek.com/guides/multi_round_chat/)：`messages`携带用户/助手历史，API本身不代存前轮上下文；自由文本与JSON格式任务应分别构造协议。实际模型ID保持用户输入，不硬编码旧型号，也未调用付费模型。
