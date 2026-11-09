# Cloudflare正式部署

2026-11-09，按用户“整合本地的所有修改上线并上传github”及“图片要上线啊，本地所有修改都上线”的明确要求，已部署本次整合版本。

- 正式地址：https://beichen-group1-co-create.pages.dev/
- 项目：beichen-group1-co-create；环境 **Production**；生产分支 feature/celia-home-team。
- 当前应用提交：**28d515c58631bee97eac77b2c5e72194e9ccfbed**。
- 当前部署ID：**1bfaa31e-7efa-4761-8701-1249edfaf990**。
- 当前版本地址：https://1bfaa31e.beichen-group1-co-create.pages.dev/
- 通过官方Wrangler 4.158.0 Direct Upload上传已验收的dist；共124个文件，71个新上传、53个复用。没有连接Git自动部署；推送GitHub本身不会触发线上变化。
- feature/celia-home-team已推送，保留原历史及两条功能分支的合并；未改写或合并main。部署后仅补充文档及截图的提交不改变已发布应用。

## 已发布内容

- 4张正式IP响应式封面：结灵与梦境胶片精灵，各桌面/手机WebP，通过picture按屏宽切换。
- 55张成员图库，覆盖29位成员；3位无获选照片时隐藏图库。成员按ID绑定，原32张Q版头像及昵称、首四位排序、匿名限制均保留。
- 2张共创图：手绘四格时间线、A组概念卡，在原四幕故事中折叠展示并按需加载。
- 第6位联系人刘艺莹（六一）及邮箱；Excel已有全部已填写联系方式保留，空项不编造。
- 回音结目的入口、模式/API说明、结果下一步，以及剪片四步示例与引导；原十人AI文学回声、人物Prompt、会话隔离、密钥仅页面内存与本地回退保持。

完整清单见 [整合报告](RELEASE_ALL_LOCAL_20261109.md)、[图片授权清单及哈希](APPROVED_MEDIA_RELEASE.json)。本次只上传dist，没有上传工作簿、原始ZIP、内部manifest、密钥、二维码或未用于页面的原始讨论截图。

## 实际验证

- 生产构建通过，13项单元测试及62项浏览器测试全部通过。含32位逐卡检查、45人容量、图集切换/懒加载/触屏滑动、产品入口、音频电平与导出、AI错误回退及记忆/密钥处理、新手四步流程。
- 覆盖320/375/390/768/1024/1440px、420/421px图片断点及桌面短屏，无横向溢出。测试为Edge桌面与触屏模拟，不宣称实体手机或Safari已验证。
- 正式域名HTTP200；Cloudflare列表确认为Production及应用提交28d515c。
- **公网124个文件的SHA256全部与通过测试的本地dist一致**，包括4张封面、55张图库、2张共创图。不是只完成本机预览。
- 公网桌面/手机分别实测：6位联系人、32位成员、前四位冯丽娜/臧文琪/于幸繁/陈佳、余海燕9图切换、拼音匿名图库、四幕故事及2图展开、AI/本地模式切换、剪片示例入口。两个浏览器会话脚本错误0。
- 没有调用真实付费API，没有迁移用户页面中的Key。5名真人首次体验测试仍待人工执行，未编造受试结果。

证据位于 evidence/release-all/：validation.log、build-hashes.json、contact-verification.json、online-verification.json、desktop/mobile-products.png及desktop/mobile-gallery.png。

## 后续更新与回退

```powershell
npm ci
npm run build
$deployCommit = git rev-parse HEAD
npx --yes wrangler@4.158.0 pages deploy dist --project-name beichen-group1-co-create --branch feature/celia-home-team --commit-hash $deployCommit
npx --yes wrangler@4.158.0 pages deployment list --project-name beichen-group1-co-create --environment production
```

OAuth凭据不入库。其他Cloudflare项目未修改。上一个生产部署232e04cd-f5b9-4188-b194-3e899f4e19aa / ef84b0f保留，可在确有需要时回退；更早d9674e4f-5449-4d46-9852-0404494620bf / aa4aace亦保留历史。

旧报告中的“仅本机/未发布/待确认”对应先前阶段，当前公开范围和线上状态以本文及本轮授权清单为准。
