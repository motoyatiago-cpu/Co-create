# 成员资料、头像与图库补丁交付

> 后续更新：用户已批准整合上线全部本地已实现功能与图片；本报告保留阶段记录，当前状态见 [本轮整合报告](RELEASE_ALL_LOCAL_20261109.md) 和 [正式部署记录](CLOUDFLARE_DEPLOYMENT.md)。

> 本文记录最初分阶段补丁。后续已按用户要求合入AI、调整展示顺序，并从新提供的原Excel补齐联系方式；当前结果见 [合并验收报告](MERGED_MEMBERS_AI_20261109.md)。

隔离分支：`feature/celia-members-gallery-review`。基线：正式分支 `feature/celia-home-team` 的 `aa4aace`。本轮不合并 main，不运行 Cloudflare Production 发布，不恢复已归档 V1.2。正式分支及《回音结》AI 文学回声的独立分支保持原状。

## 已实现的边界

- 保留章节式星云首页、CSS3D 成员墙、32人顺序、所有原姓名/介绍/关键词、两产品、四幕故事、三个独立体验与五位联系对象。删除首页“工作室名称与口号暂定”。
- 核对脱敏 manifest 的32份昵称；#05/#06/#16/#29/#31原昵称为空，继续为空。成员墙的小字关键词与昵称分字段，不再使用“第1组”作为假昵称。#27仅使用“拼音”，详情不重复显示同名昵称。
- 按用户本轮明确确认：#10于幸繁、#30张金诚、#32张延博为男性，其余29人为女性。保留10个合适头像，重分配1个已有空出女性头像，生成21个补缺/修正头像。均为512×512透明RGBA PNG，统一3D Q版胸像；只是虚构卡通形象，未用私人照片推断外貌。文件按成员ID命名，原素材可从基线提交恢复。
- 头像在卡片接近视口时请求，搜索/滚动后段成员也正常加载；IntersectionObserver卸载清理，旧浏览器可直接加载降级。首页不预取32张头像。
- 人物详情下方增加图库：精确ID映射、前后切换、手机水平滑动、原比例大图、键盘左右切换。只挂载当前图片，先加载首图，其余切换时懒加载。无图成员隐藏图库；大图第一次Escape收起，第二次关闭名片，焦点恢复到触发卡片。保留原有头像和文字。
- 既有共创故事下方增设可折叠“幕后共创记录”：手绘四格时间线与A组产品概念卡。标注“圆桌会构想，非全部已实装功能”；不替换原四幕与独立故事。

## 图片权限与尚未完成事项

候选包明确标记 `LOCAL_REVIEW_ONLY / NOT_PUBLICATION_APPROVED`，本轮没有新增图片公开授权。因此55张个人候选图和2张拟用故事图**只在本机审核预览出现**；正常生产构建的已批准图库为空，不包含这些图片，也不显示空的幕后素材区。

原始154MB Excel未在提供路径找到。本轮昵称与图像绑定依据候选包脱敏manifest；没有声称重新核对Excel的E列、原图锚点或P/Q列。关键词与介绍是保留正式版原值，已与基线逐字段比较。

公开前仍需人工逐图审核并确认授权范围，尤其是照片中其他人物、文字或作品的公开权。原二维码/文字截图 `image4.jpeg`、`image38.jpeg`、`image44.jpeg` 不提供；原始讨论截图不在审核服务白名单，不进入构建。低优先级流程图本轮未接入。

32人台账见 [MEMBER_MEDIA_LEDGER.md](MEMBER_MEDIA_LEDGER.md)，机器可读核对见 [member-media-audit.json](member-media-audit.json)。具体候选文件和待授权记录仅保存在仓库外的本地审核证据目录。

## 文件位置

| 文件 | 作用 |
| --- | --- |
| `src/data/members.ts`、`src/types/member.ts` | 正式成员、昵称与头像映射、确认性别 |
| `public/team/avatars/member-01.png` 至 `member-32.png`、`manifest.json` | 独立透明PNG、来源与SHA256映射 |
| `src/components/Hero.tsx`、`src/data/copy.ts` | 删除暂定文案 |
| `src/components/MemberGallery.tsx`、`src/styles/team.css` | 昵称/关键词语义和头像按需加载；保留CSS3D |
| `src/components/MemberCard.tsx` | 详情内嵌图库、大图关闭层级与键盘焦点 |
| `src/components/MemberPhotos.tsx`、`member-photos.css` | 多图、触屏、懒加载、原比例查看 |
| `src/data/memberGalleries.ts` | 正式已授权素材清单，目前为空 |
| `src/hooks/useMemberMedia.ts` | 正式素材与仅开发审核数据的读取，Abort清理 |
| `src/features/story/StoryMaterials.tsx`、`Story.tsx`、`story.css` | 本轮获准范围内的小型幕后材料接入点 |
| `vite.review.config.mjs` | 仓库外候选素材、本机白名单服务，禁止生产构建 |
| `tests/member-patch.spec.ts`、`member-review.spec.ts`、`fixtures/gallery-counts.json` | 新增昵称/头像/权限/图库回归 |
| `playwright.patch.config.ts`、`package.json` | 正式构建与审核服务器联合测试命令 |
| `evidence/member-patch/` | 构建哈希、测试日志、生产音频/布局证据；不含候选照片 |

没有修改 `src/features/products/`、联系人模块、`public/experiences/`，没有改动API/Prompt/Token统计/会话记忆。故事只增加上述可折叠接入组件。

## 本机预览与重现

已启动：

- `http://127.0.0.1:4194/#team`：含候选图库与幕后材料的本机审核版；搜索成员后点击卡片查看。
- `http://127.0.0.1:4195/`：普通生产构建预览，含32卡通头像，不含未授权个人图或故事候选素材。

这两个地址只在本机可用，不是互联网部署。重启命令在本工作树目录执行：

```powershell
npm ci --ignore-scripts
npm run build
npm run preview -- --port 4195 --strictPort
```

另一终端运行审核预览，目录必须指向仓库外已解压的候选包：

```powershell
$env:MEMBER_REVIEW_DIR='C:/Users/86182/Documents/Codex/2026-11-08/1-ai-1-ai-1-2026/work/review-assets-20261109'
npm run dev:review -- --port 4194 --strictPort
```

审核服务仅监听127.0.0.1，不提供原manifest与任意文件下载，逐张验证成员候选图片SHA256，并拒绝跨站请求；禁止经此配置构建。公开素材须人工确认后仅复制批准的WebP到独立公开目录，再登记 `memberGalleries.ts` 的ID/src/ALT/尺寸。不要复制整个候选目录；#27的所有字段、路径与ALT继续只使用公开别名或编号。

完整验收（无需任何API Key）：

```powershell
$env:MEMBER_REVIEW_DIR='C:/Users/86182/Documents/Codex/2026-11-08/1-ai-1-ai-1-2026/work/review-assets-20261109'
$env:PLAYWRIGHT_CHANNEL='msedge'
npm run test:patch
```

## 实际验证结果

- 生产构建通过。既有Three大包警告仍存在，未新增运行库。
- 最终完整浏览器回归34项通过：桌面/触屏手机的五区导航、32人逐一打开与图片绑定、头像性别/尺寸、搜索、关闭焦点、45人容量、暂停/减少动画、图库多图/触摸/键盘/Escape、生产包权限隔离、产品与原故事体验。
- 320/375/390/768/1024/1440px检查无横向溢出；图库大图在原比例内显示。五章节正式站与补丁版的桌面/手机对比共20张，加图库/幕后审核4张；候选素材截图保留仓库外，不提交GitHub。
- 正式网站《把感受剪成片》另做在线真实部署复验，非仅检查Git：手动播放有音频，静音后数字信号归零，再次开启恢复；初始没有自动播放。手机模拟播放RMS约−18.81dBFS，峰值0.301，无数字削波。
- 从正式站实际导出的WebM约26.8MB、35.34秒，解码为双声道音频，RMS0.089、峰值0.367；录制流含音视频各一轨。现有产品是程序生成配乐，不是未接音源的空播放器。
- 该产品七个子页×六种宽度共42例均满足 `scrollWidth <= innerWidth + 1`，未发现标题裁切；本轮未复现偏右问题，因此没有改动电影产品布局或声音。
- 上述移动验收为Chromium触屏/视口模拟，不等同于实体iPhone/Android扬声器听感。物理手机手动播放、系统静音/音量及本地导出播放仍需人工复验；不宣称已通过实机听音。

## 交付与发布

本补丁只提交隔离分支供人工验收。正式合并及Production部署必须另获用户明确批准；个人图和故事图的公开许可必须在进入公开素材目录之前确认。两个AI接入分支、正式分支及冻结的AI World工程未改动。
