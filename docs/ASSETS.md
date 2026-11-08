# 插画来源与生成提示词

使用内置 `image_gen` 工具生成，随后仅缩放并转为 WebP；没有使用 CLI 模型/API 回退。没有真实人物照片，没有把附件中的整张UI效果图放进网页。

| 交付路径 | 用途 | 体积 |
| --- | --- | --- |
| `public/art/nebula.webp` | 首页独立水彩星云环 | 78,694 bytes，1100px方图 |
| `public/art/moon.webp` | 成员泡泡水彩纹理 | 20,886 bytes，440px方图 |
| `public/favicon.svg` | 手工代码实现的简单1字轨道图标 | 向量 |

首页和成员区概念仅是本机设计参考，保存在交付目录的 `design/` 中；网页上的文字、按钮、泡泡和名片全部使用真实HTML/React实现。原始组员资料、提案PPT和会议截图未复制到公开仓库。

## 星云环最终提示词

参考目标为本次新生成的首页概念，非原始组员资料：

> Extract/recreate ONLY the right-hand hand-painted watercolor nebula portal illustration from this reference concept as a standalone square website art asset. No UI, NO text, NO letters, NO labels. Match the beautiful airy swirling elliptical blush pink and lavender watercolor ring, with dark hollow center, a few small painted moons and ringed planet, very sparse stars. Flat solid #131A3A navy background at all image edges to blend perfectly with CSS page. Fine pigment paper texture only within painted ring, softer natural edges. Fill 88 percent width, center entire ring in square, no cutoff, no rectangular frame, no glow wash. Preserve the original dusty watercolor visual style and ring shape. This is an illustration asset for the website, not a screenshot.

## 水彩圆片最终提示词

> Standalone reusable circular watercolor moon texture asset for a Chinese youth studio member bubble UI, NOT UI screenshot, NO TEXT, NO LETTERS, NO PEOPLE, NO PORTRAITS. Square 1024x1024. A single full round hand-painted watercolor moon disk centered and occupying 90% canvas, slight thin cream irregular edge, very soft textured watercolor dusty lavender with blush pink and pale cyan pigment pools, dark lower-right areas, a few tiny cream four-point stars painted on the disk. Dark enough for white/cream HTML text over the center: center low-contrast medium-dark lavender, no bright star in center. Deep midnight navy #131A3A background outside the circle. Beautiful paper pigment detail, airy magical analog watercolor, not 3D shiny orb, no metallic gradients or neon. This texture will be clipped to circle as small clickable avatar bubble background. Consistent with a watercolor navy nebula website.
