---
title: 建站记：从零到一座玻璃花房
published: 2026-08-29
description: 记录樱雾小筑的搭建过程——选型、特效引擎设计、性能预算，以及部署到 Cloudflare Pages 的踩坑笔记。
tags: [建站, Astro, 前端]
category: 技术
---

这篇文章记录樱雾小筑是怎么搭起来的，给想自己动手的同学一份参考。

## 1. 选型：为什么不从零写

需求很明确：**特效炫酷、主题独特、还要能安静写文章**。

| 候选 | 结论 |
| --- | --- |
| Hexo + 各种炫酷主题 | 特效多，但技术栈偏老，定制上限低 |
| Next.js 全定制 | 最自由，但博客基础设施全要自己造 |
| **Astro + Fuwari 引擎** | ✅ 内容引擎现成，视觉层完全重写 |

最终方案：用 [Fuwari](https://github.com/saicaca/fuwari) 的内容引擎（文章、分类、标签、RSS、Pagefind 搜索），**视觉层 100% 自研**——这样既有"独特"的上限，又不重复造轮子。

## 2. 特效引擎：一个 Manager 管所有动画

最容易翻车的做法是每个特效各开一个 `requestAnimationFrame`——樱花一个循环、粒子一个循环、背景一个循环，手机上直接掉帧。

樱雾小筑的做法是一个统一的 `FXManager`（`src/effects/manager.ts`）：

```ts
interface FXLayer {
	name: string;
	visible?: boolean; // 命令面板开关特效就是改它
	tick(dt: number, t: number, ctx: CanvasRenderingContext2D, w: number, h: number): void;
	staticFrame?(ctx: CanvasRenderingContext2D, w: number, h: number): void;
}
```

- 单一 rAF 循环，所有层按顺序 `tick`，`dt` 驱动
- 页面切后台自动暂停（`visibilitychange`）
- `prefers-reduced-motion` 用户只画一帧静态画面
- 移动端：DPR 上限 1.5、粒子密度减半

天空层负责昼夜渐变 + 星星 + 雨雪雾，天气数据来自 Open-Meteo（免 key），缓存 30 分钟，失败就静默降级成纯时间模式。

## 3. 性能预算

给自己立的规矩（写在 `docs/02`）：

- 首页首屏 JS ≤ 100KB（gzip）
- Canvas 单帧主线程占用 ≤ 4ms
- 文楷字体按 unicode-range 分包 + `font-display: swap`
- 命令面板 / 终端 / 播放器全部惰性加载

## 4. 部署：Cloudflare Pages

纯静态产物，`pnpm build` 出 `dist/`，然后：

```bash
npx wrangler pages deploy dist --project-name=sakura-mist
```

或者推 GitHub 让 Cloudflare 自动构建。缓存策略用 `public/_headers` 控制：带 hash 的资源 `immutable`，HTML 不缓存。

## 5. 一点感想

「特效炫酷」和「耐看」并不冲突——关键是**克制**：樱花永远做点缀，玻璃永远做底色。动效要全部可以关掉，这才是一个对访客友好的花房。

有什么想折腾的点，欢迎在评论里聊（配置好 giscus 之后的话 😉）。
