# 双产品IP封面正式集成 · 隔离验收

分支：`feature/celia-product-ip-integration`，基于当前发布分支 `199cb04`。本轮仅接入获准的四张响应式资产，未重新生图、未修改IP、未发布Cloudflare Production，也未合并正式分支。

## 改动

- `public/products/ip/`：a-desktop/a-mobile/b-desktop/b-mobile四张WebP，来源为已通过的响应式PNG。桌面1590×600，手机1152×700；尺寸、源文件SHA256、输出SHA256与体积详见 `product-ip-assets.json`。
- `src/features/products/Products.tsx`：只替换ProductVisual；`picture`在420px及以下加载手机图，否则加载桌面图。产品数据、文案、链接、按钮结构完全保留。
- `src/features/products/products.css`：仅追加IP图片选择器，绝对定位铺满原封面区，cover等比渲染、居中；不使用contain或拉伸。现有卡片布局、900/520px断点、160/175/196px高度规则保持原状。
- `tests/product-ip.spec.ts`：补充按需请求、分端来源、图片解码与实际像素尺寸、铺满、短屏规则及截图断言。没有删除原回归用例。

WebP采用quality90/method6压缩，没有改变构图或尺寸。四张从3,647,150字节缩至245,398字节，约减少93.3%；每次仅加载对应端两张：桌面106,774字节，手机138,624字节。图片使用lazy和async解码，不预加载隐藏章节封面；真实浏览器确认首页零封面请求，进入展厅后仅请求当前端两图。卡片固定封面高度避免加载时布局跳动。

放映机沿用已通过的完整构图，本轮未额外放大，避免损失双卷轴/镜头/底座的安全边距。两者轮廓可辨，细丝和胶片帧在手机端作为材质细节。

## 构建与验收

生产构建、13项AI单元测试、50项浏览器回归通过。包括原有32成员及联系人、45容量、图库权限、产品入口、十人人设、AI/本地切换、A/B会话隔离、密钥不落盘、故事、音频。AI接口使用模拟响应，没有消费用户真实Key。

封面在320/375/390/768/1024/1440px完整页面截图，额外检查420/421切换点和1440×800短屏；桌面与触屏浏览器两轮。无横向溢出，来源切换正确，图片已解码并铺满原容器。人工检查桌面与手机截图，关键丝线、卷轴、镜头、底座完整，未出现旧预览的内嵌矩形。没有声称已经测试所有实体手机或所有浏览器。

截图在 `evidence/product-ip/desktop/`、`evidence/product-ip/mobile/`：`page-320.png`等为完整真实页面，`A-390.png`/`B-390.png`为手机卡片，`A-1440.png`/`B-1440.png`为桌面卡片；`short-desktop.png`对应160px封面。测试日志为 `evidence/product-ip/validation.log`。

## 本机验收

已启动生产构建预览：`http://127.0.0.1:4200/#products`。回音结入口从本预览打开，包含AI文学回声；真实调用需要用户自己在该源页面设置Key，旧页面Key不会复制。

重新运行：

```powershell
npm run build
npm run preview -- --port 4200 --strictPort
```

完整回归（候选素材只提供给本机测试服务器，不进入构建）：

```powershell
$env:MEMBER_REVIEW_DIR='C:/Users/86182/Documents/Codex/2026-11-08/1-ai-1-ai-1-2026/work/review-assets-20261109'
$env:PLAYWRIGHT_CHANNEL='msedge'
npm run test:patch
```

本轮没有修改成员资料、联系人、产品独立体验、AI Prompt/API/记忆、原四幕故事或生产部署配置。审批前只保留此隔离构建和开发分支。
