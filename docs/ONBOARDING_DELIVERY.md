# 双产品新手体验优化 V0.1 · 隔离交付

> 后续更新：用户已批准整合上线全部本地已实现功能与图片；本报告保留阶段记录，当前状态见 [本轮整合报告](RELEASE_ALL_LOCAL_20261109.md) 和 [正式部署记录](CLOUDFLARE_DEPLOYMENT.md)。

分支feature/celia-product-onboarding，基线199cb04。正式站、发布分支和未发布封面/联系人分支均不改动。本文为自动化与截图验收，不代表5名真人可用性测试通过。

## 三阶段交付

1. 实现前只读路径、前后流程及逐页清单：ONBOARDING_PATH_AUDIT.md。剪片首页原三步与真实四步不符，完成页播放原本已居首位，均如实记录。
2. 回音结三个目的入口、可关闭/重新查看的模式/API说明、解结结果下一步；剪片示例直达、真实四步、可选上传与次要配置折叠、下一步定位、播放优先和次要导出折叠。所有旧功能保留。
3. USABILITY_TEST_PLAN.md提供5名首次用户的任务和待填表。没有实际受试数据，不计算真人任务完成率或编造主观反馈。正式路演前需人工决定是否采用，不自动发布。

## 文件边界及回滚

- echo-knot/literary/panel.js仅增加一条onboarding.js import；onboarding.js/css为独立UI增强。只读公开DOM，通过HuiYinJie.前往导航；没有Vue私有状态接管。编译HTML字节、人物Prompt、sessions、controller、chat-completion、preferences完全未变；原5处桥接验证仍通过。
- feeling-film/js/app.js只修改renderHome四步文案、上传/模板/设置details包装、完成页次要按钮包装。js/onboarding.js提供示例入口、可关闭四步说明和定位下一步按钮。css/onboarding.css提供相同画风及普通文档流的手机操作区，不使用固定遮挡输入的浮层。原Store、Feelings、Scenes、Film、Music、素材/配乐上传处理、两道问题校验及导出实现不变。
- film/index.html仅添加两条CSS/JS引用。film-onboarding-patch.json记录基线及app前后哈希、修改范围和回滚方式。
- 可按本分支提交整体revert；也可恢复上述有限入口文件到199cb04，移除独立辅助文件。没有数据迁移，不会清空用户草稿、片库或回音簿。

## 本机生产构建预览

回音结：http://127.0.0.1:4203/experiences/echo-knot/index.html

剪片：http://127.0.0.1:4203/experiences/feeling-film/index.html

开发预览4202；生产构建预览4203。Key仅在对应页面内存，旧源Key不迁移。无API可直接选本地回声，本轮没有使用真实付费Key。候选成员图库仍限本机开发审核模式，不进入生产构建。

重启预览：npm run build；npm run preview -- --port 4203 --strictPort。

完整回归使用npm run test:patch，需MEMBER_REVIEW_DIR指向仓库外候选素材目录、PLAYWRIGHT_CHANNEL=msedge。覆盖五种指定宽度、桌面/手机、示例四步生成/播放/导出入口、复制回复与保存回音簿、本地对话、模式说明、关闭重开、AI错误回退/人物隔离/刷新/密钥、主站成员/联系人、45容量、原故事和配乐电平。

截图：evidence/onboarding/desktop、mobile中的echo-320等为五种宽度共鸣页，film-320等为完成页；desktop/mobile-echo-home、echo-result、film-home、film-materials为真实页面补充截图。较长页面请打开原图审阅，不能仅依据缩略图判断字小。

## 已知限制

最终记录：生产构建、原5处精确桥接校验、13项AI单元测试及54项浏览器回归全部通过。最终串行测试日志位于evidence/onboarding/validation.log。一次中间测试因两个进程共享临时输出目录造成trace归档失败，已结束旧进程后完整重跑；最终结论仅依据最后一次54项全通过记录。复制验证使用测试页内的剪贴板写入替身，不覆盖用户系统剪贴板；保存验证调用原UI后核对公开读取回音簿接口。没有修改产品的剪贴板或保存实现。

没有真实5名受试者、实体手机或Safari测试。自动化可以验证路径和状态，不证明用户第一次就能理解。收起指南的偏好只存本机sessionStorage；禁用存储时仍可临时收起。原路由对中文hash的边界通过公开路由API处理新增入口，未重构整套路由。除共鸣已有兼容外，原应用其他外部中文深链刷新行为没有扩大修复。
