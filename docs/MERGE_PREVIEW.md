# 双分支合并预览｜32位伙伴

2026-11-08，按用户“合并然后给我预览网站”及“32人保留”的要求，在`feature/celia-home-team`合并`origin/feature/yu-products-story-contact`的`3dcf367`。合并前本分支为`ba4d38d`，保留两边提交历史。

## 合并取舍

- 使用伙伴的章节式五区导航、ChapterDeck、ChapterField、NebulaScene和产品/故事更新。三款独立体验内容与伙伴分支一致。
- 首页继续保留原主标题、入口提示、GSAP轻视差、可暂停星尘。动态星云在离开首页时销毁；环境暂停与减少动画能关闭新增场景，触屏使用静态插画。
- 团队区默认展示V1.2的∞星河，新增“立体名片”切换，复用伙伴的CSS3DRenderer成员墙。两种视图共用搜索、真实关键词、手动暂停、完整名片和“认识下一位”。切换不会重新编写人物标签。
- 原31份成员原文、稳定ID和匿名昵称逐项比对一致。按用户后续确认增加伙伴分支的胡洁/Jessica，合计32人；使用对方提供的介绍“保持好奇心。”与关键词INFJ，未另写经历或技能。
- 23张统一卡通形象独立映射于`src/data/memberPortraits.ts`，不是本人照片。缺少形象的成员继续显示姓名首字，32位均能打开名片。
- 没有把另一分支改写的31人介绍、关键词和昵称覆盖到已确认原文中。新增四个邮箱未获得本轮公开确认，联系页继续显示“待团队确认”，没有新增邮件链接。
- 章节切换和浏览器前进后退会关闭正在阅读的名片并解除滚动锁，避免隐藏章节残留dialog。

32人轨道使用80px/76px星球，保留120秒循环；新增窄版几何采样后，相邻帧最大位移约2.44px（60Hz），圆形点击区域不重叠。31人及45人容量规则仍保留，手机继续每批8人。

## 文件与启动

- 章节路由：`src/App.tsx`、`Navigation.tsx`、`ChapterDeck.tsx`、`src/styles/chapter.css`。
- 新星云：`src/components/NebulaScene.tsx`、`ChapterField.tsx`；复用原水彩插画作为静态回退。
- 立体名片：`src/components/MemberGallery.tsx`、`src/styles/gallery.css`。
- 共用状态和名片：`src/components/MemberWall.tsx`、`MemberCard.tsx`；∞轨道在`src/components/orbit/`。
- 人物原文：`src/data/members.ts`；卡通映射：`src/data/memberPortraits.ts`。
- 新依赖：沿用伙伴的`three@0.187.0`及`@types/three`，保留本分支GSAP依赖；锁文件重新生成，没有额外重建工程。

```powershell
npm ci
npm run dev -- --port 4175
# http://127.0.0.1:4175/
npm run build
$env:PLAYWRIGHT_CHANNEL='msedge'
npm run test:e2e
```

## 实际检查

- 生产构建通过（58个模块）。包含Three的主JS约957.65kB，gzip 278.82kB；Vite提示超过500kB，当前为本机验收版本，后续可独立做按需分包。
- **46项浏览器测试全部通过**：桌面23项＋iPhone触屏模拟23项，约1.7分钟。
- 两种视图全部32人逐个搜索、打开、读取原文；新增成员可查看，连续浏览可首尾循环，关闭恢复焦点。
- 320、390、768、1024、1440px，45人容量、31/32/45人完整轨迹采样、减少动画、鼠标、真实触屏点按、暂停状态和资源清理通过。
- 章节深链接、刷新、前进后退、五区导航、产品及故事三个独立体验通过。
- 本机浏览器已打开合并预览，截图与本轮测试日志保存于工作区`outputs/merged-preview/`。

本次只合入开发分支，不合并main、不发布正式网站。真实手机硬件与Safari仍需人工体验；历史V1.2报告描述的是合并前基线，请以本说明理解当前集成状态。
