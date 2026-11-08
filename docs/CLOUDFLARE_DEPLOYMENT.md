# Cloudflare正式部署

2026-11-08，用户明确要求“上线到cloudflare”后完成发布。

- 正式地址：https://beichen-group1-co-create.pages.dev/
- 独立项目：`beichen-group1-co-create`；账号下其他项目未修改。
- 环境：**Production**；生产分支：`feature/celia-home-team`。
- 当前发布的应用提交：`e72d1c1b719095bfac67085ea4ed10707f8d6808`（用户提供的Yu源码包优先版）。
- 当前部署ID：`03fa90df-5140-43e3-b7c1-f66a7f56df04`。
- 当前版本地址：https://03fa90df.beichen-group1-co-create.pages.dev/
- 发布方式：[Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)，本机生产构建后用官方Wrangler 4.158.0上传。没有连接Git自动部署，也没有合并main。
- 构建目录43个文件；只上传`dist`，未上传内部交接包、开发测试夹具、凭据或原始名册。第一次上线为`5549a86`/`b4e391dd-229a-47f3-935f-53e5f6599027`，本轮修正已覆盖正式域名，旧部署保留用于回退。

## 后续更新

在此仓库目录使用PowerShell：

```powershell
npx --yes wrangler@4.158.0 whoami
npm ci
npm run build
$deployCommit = git rev-parse HEAD
npx --yes wrangler@4.158.0 pages deploy dist --project-name beichen-group1-co-create --branch feature/celia-home-team --commit-hash $deployCommit
npx --yes wrangler@4.158.0 pages deployment list --project-name beichen-group1-co-create --environment production
```

项目已创建，后续只需部署。此版本CLI首次创建时曾默认转交Workers，缺少Worker入口而失败，没有部署内容；随后按CLI提供的Pages兼容参数创建成功。已有项目后续命令直接使用Pages，不需要再次创建项目或使用兼容`--force`参数。

部署依赖本机已有Cloudflare登录；OAuth令牌不进入仓库。此项目不是Git自动部署，单独推送GitHub不会自动更新公网内容。

## 实际线上验证

- 正式域名HTTP 200，Cloudflare部署列表确认Production及提交`e72d1c1`。
- 浏览器验证桌面和iPhone触屏模拟，检查320、390、768、1024、1440px布局。
- 当前线上JS与本机构建SHA-256一致：`8e80594835d64ae5bb717b7b25b4ebdc57ef92893988dc0c20a0b720a8a60fe4`。
- 首页进入、32人原版立体名片墙、胡洁及拼音搜索、名片关闭、焦点恢复通过；本版默认界面按源码包，不再混入V1.2增强。
- 回音结、把感受剪成片、四格故事均实际新标签打开；用户已明确确认4位联系人及邮箱公开，4张联系卡片和mailto链接已恢复。
- 两个线上浏览器会话的脚本错误0，HTTP失败资源0。当前发布前的本地16项检查见源码包导入说明；历史46项属于旧增强版。
- 当前原始线上检查JSON和截图保存于本机工作区`outputs/yu-source/online/`；首次上线记录在`outputs/cloudflare/`。本轮没有对所有真实手机、地区网络或Safari作保证。

历史V1.1/V1.2及合并说明中的“未发布”描述对应各自交付时点；当前状态以本部署记录为准。
