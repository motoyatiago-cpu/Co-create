# Co-create V1.2｜星河动效与无限成员轨道

日期：2026-11-08。基线：`51a71c1853c7c98ec20deb9bc12c41a5664949b0`。开发分支：`feature/celia-home-team`。

本轮保留V1.1的主标题、字体、配色、水彩星云、31位已获准公开的成员资料，以及产品和故事的全部实现。只扩展首页、团队区、成员墙及必要依赖、测试、文档。

## 已实现

### 无限星河与认识伙伴

- 桌面（1024px起）31位成员同时存在于DOM中，沿真实的横向∞轨迹移动，120秒循环一次。使用弧长采样让两个环的连接自然，姓名始终水平，关键词取自原始资料；没有关键词时显示“点击认识”。
- GSAP只更新缓存坐标和`translate3d`，不通过React状态逐帧重绘。交叉处采用圆形间距约束；偶数人数留一个空拍。45人时缩小星球并扩大轨道高度，保持点击区域分离。
- 鼠标移入轨道即停留，方便选择；选中后在原相位暂停，当前星球放大1.3倍并显示已有tone对应的光圈。桌面名片位于选中星球的另一侧，减弱遮罩以保留选择反馈。
- 搜索、精确自填关键词筛选、一键清除、完整名片和“认识下一位”继续保留。筛选后只渲染结果，通过0.6秒重排衔接；单人稳定居中，空结果保留空状态。
- 手机和平板（小于1024px）每批8位，31人共4批，45人共6批。上一批、下一批始终明确。搜索和关键词筛选覆盖全部资料；名片连续浏览跨批次，关闭后返回最初点击的批次并恢复焦点。
- 保留原生dialog焦点限制、Escape关闭、Tab访问和可见焦点。Tab进入轨道时停留，避免键盘用户追逐目标。

暂停状态分别管理：用户手动暂停、选中阅读、鼠标停留、键盘焦点、系统减少动画、页面隐藏、轨道离屏。关闭名片只解除选中暂停，不清除用户手动暂停；光标仍在轨道内或键盘仍在浏览时继续停留。

轨道只剩不足15%有效可见面积时暂停，判断时扣除固定导航遮挡。返回后从原相位继续。组件卸载会销毁自己的时间线、重排Tween、观察器和事件。

### 文字纵深

- 首页主标题总位移24px、副标题18px、简介12px；团队标题16px。使用ScrollTrigger随自然滚动轻微错时，不修改正文透明度，不劫持滚轮、不锁页面。
- `useGSAP`作用域与`revertOnUpdate`管理生命周期。尺寸变化刷新触发区，卸载取消刷新帧及观察器。
- “暂停环境动效”同时暂停星尘并复位文字视差；与成员轨道的手动暂停分开控制。系统减少动画时自动静态显示完整文字和成员视图。

### 背景星尘

- 采用React Bits官方Particles的TypeScript＋CSS源码，仅引入这一组件；当前源码直接使用WebGL2，不依赖OGL或Three.js。
- 首页和团队区域各配置60颗细小粒子，只有进入视口的背景绘制。使用米、紫、青、粉低强度星尘，无连线、点击爆发和强景深。鼠标事件绑定window，检查所在背景边界；背景及所有子元素`pointer-events:none`，不阻挡上层控件。
- 触屏使用20颗静态星点。减少动画、2核及以下、报告内存不超过2GB、节省流量、无WebGL2、上下文丢失时静态降级；持续18帧超过45ms也放弃动态背景。设备提示只是保守线索，并非硬件性能评级。
- 暂停、离屏和页面隐藏时停止绘制。卸载删除程序、着色器、缓冲区和VAO，移除监听、观察器、画布并释放上下文。
- 对官方源码增加了每次effect创建独立canvas的适配，避免React StrictMode清理时主动丢失的上下文在第二次挂载被复用。

## 研究、版本和许可证

读取了三个仓库的实际源码和许可证，没有安装全局技能，也没有引入新的全站框架。

| 来源 | 本次检查的版本/提交 | 采用方式 |
| --- | --- | --- |
| [GSAP Skills](https://github.com/greensock/gsap-skills/tree/aed9cfd3277740755f6bfc1155c7aa645403b760) | `aed9cfd3277740755f6bfc1155c7aa645403b760`，MIT | 参考React清理、ScrollTrigger、时间线和性能指导 |
| [React Bits](https://github.com/DavidHDev/react-bits/tree/4dc7b5b7772e1217c8fb8d2a7aa074302180e5b4) | `4dc7b5b7772e1217c8fb8d2a7aa074302180e5b4` | 按官方支持的手动源码方式复制`src/ts-default/Backgrounds/Particles/`，保留并附带完整许可 |
| [Taste Skill](https://github.com/Leonxlnx/taste-skill/tree/f6b76575f949707b4e3c37cd86cb44b0b98643e8) | 2.5.1 / `f6b76575f949707b4e3c37cd86cb44b0b98643e8`，MIT | 仅用于层级、留白、动效克制审查，保留原布局与视觉语言 |

新增运行依赖仅`gsap@3.15.1`、`@gsap/react@2.1.2`，锁文件记录确切版本。此前没有另一套运行时动画框架；未安装Tailwind、Next.js、Framer Motion或物理库。

GSAP技能仓库的MIT许可不等于GSAP运行库许可：GSAP运行库使用[Standard No Charge许可](https://gsap.com/community/standard-license/)。React Bits为MIT附加Commons Clause，完整原文放在`src/components/particles/ReactBits.LICENSE.md`，未将其标为无附加条件的MIT。

React Bits[安装页](https://reactbits.dev/get-started/installation)允许CLI或手动复制；本次仅复制[Particles TS-CSS](https://reactbits.dev/backgrounds/particles)。核对对应registry项目的dependencies为空，与组件源码一致。没有照搬整套UI或增加多余依赖。

## 修改文件

| 文件 | 用途 |
| --- | --- |
| `src/components/Hero.tsx`、`TeamSection.tsx` | 接入分层视差、背景和环境暂停按钮 |
| `src/components/MemberWall.tsx` | 原有发现逻辑接入轨道；选中、连续浏览、跨批焦点恢复 |
| `src/components/MemberCard.tsx` | 保留名片内容，增加轨道名片样式标记及左右定位 |
| `src/components/orbit/MemberOrbit.tsx` | 时间线、暂停状态、分批、响应式测量、按钮 |
| `src/components/orbit/orbitGeometry.ts` | 弧长路径、等距采样、圆形防碰撞和路径绘制 |
| `src/components/orbit/orbit.css` | 轨道、星球、选中光圈、名片和手机批次样式 |
| `src/components/motion/gsap.ts` | 统一注册GSAP、React hook和ScrollTrigger |
| `src/components/motion/preferences.ts` | 系统减少动画、共享环境暂停状态 |
| `src/components/motion/useParallax.ts` | 可回收的滚动视差 |
| `src/components/particles/Particles.tsx`、`Particles.css`、`ReactBits.LICENSE.md` | 官方粒子源码、生命周期适配和许可 |
| `src/components/particles/StarDust.tsx`、`stardust.css` | 克制配置、静态降级和环境暂停控件 |
| `tests/orbit.spec.ts`、`orbitHelpers.ts` | 轨道运动、状态、触屏、资源、性能验收 |
| `tests/site.spec.ts`、`members.spec.ts` | 将既有验收更新为真实轨道及分批标准 |
| `tests/fixtures/capacity.tsx` | 45人容量及React Profiler计数 |
| `tests/fixtures/lifecycle.html`、`lifecycle.tsx` | StrictMode重复挂卸载资源检查，不进入生产构建 |
| `package.json`、`package-lock.json`、`README.md`、本文 | 必要依赖、启动与交接记录 |

未改动`src/data/members.ts`、`src/types/member.ts`、`src/data/memberDiscovery.ts`。未补写真实人物的关键词、经历、能力或联系方式；昵称限制照旧。未改动`src/features/`、`src/integration/`、`public/experiences/`、全局样式和原插画。

## 启动与复现

Node.js 22.12+；本次Node v24.16.0，Vite 8.3.6、React 19.3.1、TypeScript 7.0.2、Playwright 1.65.0（沿用原项目）。

```powershell
npm ci
npm run dev -- --port 4175
# 另一个终端
npm run build
$env:PLAYWRIGHT_CHANNEL='msedge'
npm run test:e2e
# 验证打包产物，可另用本机端口：
npm run preview -- --port 4176
```

若使用Playwright自带Chromium，安装对应浏览器后取消`PLAYWRIGHT_CHANNEL`即可。两个端口均仅绑定127.0.0.1，不是正式部署。

## 验收记录

生产构建通过：48个模块，JS 388.85kB（gzip 134.76kB），CSS 27.07kB（gzip 6.63kB）。没有构建错误。

自动化覆盖：首页及五区导航、所有31位真实成员可打开、匿名昵称、缺省字段、真实关键词筛选、连续浏览、单人/空结果、45人容量、320/390/768/1024/1440px和375px补充检查、圆形点击间距、手动/阅读/键盘/鼠标/离屏/隐藏状态、静态降级、WebGL鼠标响应及透传点击、资源清理，以及三个独立体验的实际新标签打开。

轨道全循环几何检查：31人、45人和手机8人共六种几何配置，各采样7200帧（120秒×60Hz）；圆形点击区域不重叠，循环接点误差小于0.01px，相邻帧位移小于4px。浏览器运动采样及逐人打开与此互为补充，不以旧网格矩形位置作验收。

最终结果：**40项全部通过**（桌面20项＋触屏模拟20项，约1.2分钟），`git diff --check`通过。新增真实鼠标移入后点击及移动中触屏圆心点按用例，避免自动化等待元素静止掩盖触屏操作。

生产预览（`npm run preview`）另做桌面/手机两轮冒烟：31人/8人首批、暂停、下一位、关闭、搜索清除、三个体验新标签加载全部通过，页面脚本错误0。此检查针对`dist`产物，不依赖Vite开发模块。

| 实测场景 | 桌面 | iPhone 13触屏模拟 |
| --- | --- | --- |
| 生产整页360帧平均采样频率 | 144.09fps | 144.22fps |
| 生产整页P95帧间隔 | 7.20ms | 7.10ms |
| 生产冒烟结束JS堆 | 6.28MB | 7.33MB |
| 容量夹具100帧React提交次数 | 0 | 0 |
| 容量夹具100帧圆形点击区最大重叠 | 0px | 0px |
| 第1至第5轮卸载后堆增量（强制GC） | 737,180bytes | 720,324bytes |
| 最后卸载残留的本站动画/观察器/WebGL资源 | 0 / 0 / 0 | 0 / 0 / 0 |

上述帧率来自本机高刷新率Edge，含采样开销，不代表真实手机刷新率。容量夹具桌面同时显示45位，手机当批8位；全体45位另经分批、逐人搜索打开和全循环数学测试。生产页面桌面采样时：首页背景离屏停绘、团队背景WebGL绘制、成员轨道运行；触屏背景静态。堆增量包含开发模块缓存，未宣称字节级零增长。原始日志及JSON在本机交付目录保存。

## 人工验收与边界

- 请在自己的常用浏览器和真实手机上确认运动舒适度、昵称小字号及名片阅读体验。自动化使用Edge Chromium及iPhone 13触屏模拟，未覆盖真实iOS Safari、低端安卓和所有显卡。
- 性能数据是本机短时采样，不能等同于每台设备的帧率；设备慢时优先降级背景，成员仍可搜索、分批和静态浏览。有限次卸载资源归零不等于对所有运行时长作无泄漏保证。
- 页面隐藏通过显式触发visibilitychange分支测试，离屏通过实际滚动测试；未依赖测试宿主后台标签节流行为。
- 工作室名称、口号和正式联系渠道的既有待确认状态保留。产品标题“篇/片”、故事事实文案等不属于本轮改动。
- 本轮不需要再次确认成员公开授权；已经按用户确认的脱敏范围沿用资料。成员若后续撤回，可继续在独立数据文件维护。
- 本轮只提交目标开发分支，保持历史；不合并main、不强推、不正式部署。伙伴模块无需迁移接口或重做接入。

### 提交前远端状态

再次fetch时，`origin/feature/celia-home-team`仍为`51a71c1`，`origin/main`仍为`978f5e6`。于幸繁的`feature/yu-products-story-contact`新增了`3dcf367`（chapter deck、nebula hero、3D member gallery），涉及51个文件，包括首页、成员墙、资料结构、头像、全站层和伙伴模块，和本轮有重叠区域。

该新提交未合并到用户指定的V1.1基线，也未覆盖或改写。本轮独立提交∞星河版本供验收。之后整合前，需要团队明确∞成员轨道与另一个3D成员方案的取舍，以及新增全站层、资料和头像的接入范围；不能将两条分支当作完全无冲突的模块直接拼接。这是后续集成事项，不影响本分支40项验收结果。

本轮提交主题：`feat: add accessible infinity member orbit and ambient motion`。实际提交SHA和远端结果随交付消息及本机`git-delivery.txt`提供。

本机截图和原始测试/性能JSON统一交付至同级工作区的`outputs/v1.2/`。截图包括首页、桌面完整星河、桌面选中名片、390px与320px星河和手机名片。
