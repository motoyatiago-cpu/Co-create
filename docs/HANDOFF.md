# 首页与团队模块开发交接

> 本文为初版交接记录。当前成员类型、资料授权、关键词探索和连续名片行为以 [V1.1交接](V1_1_HANDOFF.md) 为准。

交付日期：2026-11-08（北京时间）。作业截止：2026-11-09 12:00。

## 仓库与提交

- 仓库：<https://github.com/motoyatiago-cpu/Co-create>
- 开发账号：cclia26；分支：`feature/celia-home-team`。
- 开工和功能提交前均检查远端：`main`、`AI` 都只有 README，指向 `978f5e644cbb8185cf681541e81352639d780107`。
- 从 `origin/main` 新建个人分支，建立唯一工程。
- 功能提交：`d7f1bcd` — `feat: build nebula home and accessible team member wall`，已推送。
- 文档提交另行记录在分支日志中：`git log --oneline origin/main..HEAD`。
- 未修改原始 README 内容，只追加启动及交接入口；未改动其他开发者的文件。
- 未向 main/AI 提交、未强推、未合并、未发布网站。

## 技术与启动

Vite 8、React 19、TypeScript 7、原生 CSS；依赖精确解析见 `package-lock.json`。无路由库、UI组件库、物理库、3D引擎、模型 API 或后端。

要求 Node.js 22.12+。在仓库根目录：

```bash
npm ci
npm run dev
npm run build
npm run preview
```

按终端显示的本机 URL 打开。构建产物为 `dist/`，不入 Git。Vite 使用相对 base，方便后续团队选择托管子路径；本次未配置自动部署。

## 模块位置与分工

| 模块 | 文件 | 说明 |
| --- | --- | --- |
| 页面组合 | `src/App.tsx` | 首页→团队→三个接入区→页尾 |
| 顶部导航 | `src/components/Navigation.tsx` | 五区锚点、当前区域状态、手机常驻导航 |
| 首页 | `src/components/Hero.tsx` | 真实 DOM 文案、进入成员区、产品区入口 |
| 团队介绍 | `src/components/TeamSection.tsx` | 真实关键词和会议背景；资料提示自动跟随数据状态 |
| 成员墙 | `src/components/MemberWall.tsx` | 数据驱动，无固定人数上限；搜索和暂停漂浮 |
| 名片 | `src/components/MemberCard.tsx` | 原生 dialog、Escape、Tab循环、关闭后恢复焦点 |
| 成员类型 | `src/types/member.ts` | 三关键词、擅长、交流、可选头像/已确认角色 |
| 人物数据 | `src/data/members.ts` | 12份标注示例；不对应真实成员 |
| 文案配置 | `src/data/copy.ts` | 名称、口号、候选文案、团队简介、导航 |
| 于幸繁接入点 | `src/integration/ModuleSlots.tsx` | 产品、故事、联系的占位区 |
| 全局变量和基础样式 | `src/styles/global.css` | 颜色、字体、容器、公共控件、减少动画 |
| 首页/导航样式 | `src/styles/home.css` | 独立于产品、故事、联系 |
| 成员样式 | `src/styles/team.css` | 弹窗、泡泡、响应式网格 |
| 插画 | `public/art/nebula.webp`、`moon.webp` | 新生成的纯插画，非整张UI效果图 |
| 浏览器验收 | `tests/site.spec.ts` | 桌面及手机用例 |
| 45人压力资料 | `tests/fixtures/` | 只在开发测试使用；不进入生产构建 |

## 于幸繁如何接入

**请复用这个工程，不要另外初始化。** 如已有未提交工作，先保留现场再整合；不要直接切换覆盖。干净工作区可从共享基架创建自己的分支：

```bash
git fetch origin
git switch -c feature/yu-products-story-contact origin/feature/celia-home-team
npm ci
npm run dev
```

建议新增 `src/features/products/`、`src/features/story/`、`src/features/contact/`，内容和局部 CSS 由于幸繁负责。在 `src/integration/ModuleSlots.tsx` 导入三个模块并替换对应占位区即可，不需要改首页/成员墙。

推荐接入形状（组件名是接口示例，需由搭档实际实现）：

```tsx
import { Products } from '../features/products/Products';
import { Story } from '../features/story/Story';
import { Contact } from '../features/contact/Contact';

export function ModuleSlots() {
  return <>
    <section id="products" className="container section-pad" aria-labelledby="products-heading">
      <h2 id="products-heading">产品展厅</h2>
      <Products />
    </section>
    <section id="story" className="container section-pad" aria-labelledby="story-heading">
      <h2 id="story-heading">共创故事</h2>
      <Story />
    </section>
    <section id="contact" className="container section-pad" aria-labelledby="contact-heading">
      <h2 id="contact-heading">联系我们</h2>
      <Contact />
    </section>
  </>;
}
```

同一锚点只出现一次。若三个子组件自己输出 section 和 h2，就把上述外层包装移入子组件，保留 `products`、`story`、`contact` 及其对应 heading ID。每个模块用独立 CSS 前缀，复用全局颜色和容器，避免覆写通用 h1/button 或成员选择器。产品仍是虚构共创概念，不应承诺已实现商业服务。

## 替换成员数据

只需修改 `src/data/members.ts` 的数组；组件不按12人或45人写死。搜索覆盖姓名、关键词、擅长、交流与角色，长昵称在泡泡中最多两行，完整名称会出现在可访问标签和名片中。

每条记录需要：唯一 `id`、`name`、恰好三个 `keywords`、`strengths`、`learning`、`isExample` 和 `tone`（`lavender`/`pink`/`cyan`）。正式资料获确认后设 `isExample: false`。可选头像优先放 `public/avatars/`；缺图或加载失败自动显示昵称首字，不伪造照片。角色仅在确认后填写 `role: { label: '已确认角色名称', confirmed: true }`，不要把临时分工推断成长期职位。

当数组全为示例时显示“以下均为交互示例”；混合资料及全部替换后，提示会自动调整。当前未突出任何真实核心成员，因公开信息与角色尚未确认。

## 尚待组员补充

1. 工作室正式名称、最终首页文案/口号。
2. 完整成员名册及每位成员希望公开的资料；12份示例和45人测试均不代表真实人数。
3. 自愿公开的头像、图片授权、正式组织角色。
4. 于幸繁的三块内容与正式模块代码。
5. 经过确认的公开联系渠道；当前页面没有邮箱/电话/微信假链接。

原始会议资料、PPT、产品文档、截图及ZIP保留在本机工作目录，没有提交到公开仓库。附件仅作事实与风格参考，具体实施范围采用用户的直接任务说明。
