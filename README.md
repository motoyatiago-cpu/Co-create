# Co-create
此仓库用于对小组交互性网站的创作。

在线网站：[北辰青年第1组工作室](https://beichen-group1-co-create.pages.dev/)。[Cloudflare部署与更新说明](docs/CLOUDFLARE_DEPLOYMENT.md)。

## 本地开发

本分支使用 Vite + React + TypeScript + 原生 CSS。需要 Node.js 22.12+（本次验证使用 Node 24）。

```bash
npm ci
npm run dev
```

生产构建：`npm run build`；本地检查构建：`npm run preview`。

当前应用以用户提供的 `Co-create-yu.zip` 为优先版本：原作者的章节导航、动态星云首页、32人立体名片墙、两款产品、四幕故事及4位联系卡片。**请复用此工程，不要另起一套。**

原V1.2的∞轨道等增强代码与测试已保存在 `legacy/v1.2/` 及Git备份分支，未混入当前默认界面。请先对照原版效果验收，再决定后续接入范围。

- [开发交接与模块接入](docs/HANDOFF.md)
- [源码包优先导入与验证说明](docs/YU_SOURCE_IMPORT.md)
- [双分支合并与32人预览说明](docs/MERGE_PREVIEW.md)
- [V1.2：无限星河、研究来源与验收报告](docs/V1_2_REPORT.md)
- [V1.1：正式成员与探索体验交接](docs/V1_1_HANDOFF.md)
- [验收与视觉比对记录](docs/VERIFICATION.md)
- [插画来源与生成提示词](docs/ASSETS.md)

工作室名称、口号暂定；32份成员资料按本次源码包导入，匿名昵称保留。冯丽娜、陈佳、臧文琪、于幸繁4位联系人的公开范围已经用户明确确认，联系卡片按原版恢复。本分支不直接合并main。
