# Cloudflare正式部署

2026-11-08，用户明确要求“上线到cloudflare”后完成发布。

- 正式地址：https://beichen-group1-co-create.pages.dev/
- 独立项目：`beichen-group1-co-create`；账号下其他项目未修改。
- 环境：**Production**；生产分支：`feature/celia-home-team`。
- 发布的应用提交：`5549a86c11ceecd3b20ade54eddc85cc8e5776fa`。
- 部署ID：`b4e391dd-229a-47f3-935f-53e5f6599027`。
- 本次版本地址：https://b4e391dd.beichen-group1-co-create.pages.dev/
- 发布方式：[Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)，本机生产构建后用官方Wrangler 4.158.0上传。没有连接Git自动部署，也没有合并main。
- 上传43个构建文件，共8,426,061bytes。只上传`dist`，未上传内部交接包、开发测试夹具、凭据或原始名册。

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

- 正式域名HTTP 200，Cloudflare部署列表确认Production及提交`5549a86`。
- 浏览器验证桌面和iPhone触屏模拟，检查320、390、768、1024、1440px布局。
- 线上JS与本机构建SHA-256一致：`ed89032faae1e5d4d2035bcd5cb7fbf8f44935e9b96615e2f59247f66686596d`。
- 首页进入、32人数量、新增成员搜索、名片关闭、下一位首尾循环、焦点恢复、两种成员视图、真实关键词筛选通过。
- 回音结、把感受剪成片、四格故事均实际新标签打开；联系页仍为待确认状态，没有新增邮件或电话链接。
- 两个线上浏览器会话的脚本错误0，HTTP失败资源0。发布前的本地46项自动化测试记录见合并说明。
- 原始线上检查JSON和截图保存于本机工作区`outputs/cloudflare/`。本轮没有对所有真实手机、地区网络或Safari作保证。

历史V1.1/V1.2及合并说明中的“未发布”描述对应各自交付时点；当前状态以本部署记录为准。
