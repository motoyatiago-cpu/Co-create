# Cloudflare正式部署

2026-11-09，用户明确批准将合并版本发布到Cloudflare正式站并推送GitHub；本次已完成。

- 正式地址：https://beichen-group1-co-create.pages.dev/
- 独立项目：`beichen-group1-co-create`；账号下其他项目未修改。
- 环境：**Production**；生产分支：`feature/celia-home-team`。
- 当前发布的应用提交：`ef84b0f`（AI文学回声、成员头像、四位优先排序及Excel联系方式合并版）。
- 当前部署ID：`232e04cd-f5b9-4188-b194-3e899f4e19aa`。
- 当前版本地址：https://232e04cd.beichen-group1-co-create.pages.dev/
- 发布方式：[Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)，本机生产构建后用官方Wrangler 4.158.0上传。没有连接Git自动部署，也没有合并main。
- 构建目录59个文件；只上传`dist`，未上传内部交接包、开发测试夹具、凭据或原始Excel。55张个人候选图片和幕后候选素材未获公开许可，继续保留本机审核模式，不进入正式构建。用户本轮明确要求公开补齐的28人联系记录已按ID导入，4人空项保持空白；此前公开邮箱保留。
- GitHub `feature/celia-home-team` 已从 `aa4aace` 安全快进至合并提交，保留AI和成员分支历史；未修改main。上一Production部署为 `d9674e4f-5449-4d46-9852-0404494620bf` / `aa4aace`，仍保留用于必要时回退。第一次上线为 `5549a86` / `b4e391dd-229a-47f3-935f-53e5f6599027`。

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

- 正式域名HTTP 200，Cloudflare部署列表确认Production及应用提交 `ef84b0f`。
- 线上59个文件全部逐一验证SHA256，与通过13项AI单元测试、48项浏览器测试的本地构建一致。详见 `evidence/production-merged/online-verification.json`。
- 实测桌面和iPhone触屏模拟；320/375/390/768/1024/1440px无横向溢出。首页、五区导航、32人CSS3D成员墙、首四位冯丽娜/臧文琪/于幸繁/陈佳、32头像、搜索、名片关闭与焦点恢复正常。
- 线上抽查Excel微信、Q5联系ID、邮箱及空白字段；本地完整回归已逐一核对32人。#27仅显示“拼音”；匿名姓名扫描记录见成员合并验收报告。联系章节保持原五人和原顺序。
- 从线上产品入口实际打开回音结，共鸣页显示十人人物和“本地回声 / AI文学回声”，两模式可切换；另检查电影产品与原四幕故事可访问。用户Key不复制到正式域名，首次使用需自行在页面设置填写；本轮未调用真实付费API。
- 两个线上浏览器会话脚本错误0、HTTP失败资源0。主站水彩星云、章节布局和CSS3D保持现行版本，未恢复V1.2无限星河。
- 本次线上截图保存在本机 `outputs/member-review-evidence/production-merged/`；没有宣称实体iPhone/Android、Safari或所有地区网络均已验证。

历史V1.1/V1.2及合并说明中的“未发布”描述对应各自交付时点；当前状态以本部署记录为准。
