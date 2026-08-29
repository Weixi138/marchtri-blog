# AGENTS.md — 项目协作指南

面向在本仓库工作的 AI 代理（ZCode / Claude Code / Codex 等）与开发者。改动任何代码前，请先读完本文件与 `docs/` 下的相关文档。

## 项目是什么

一个「特效炫酷、主题独特」的个人博客：**毛玻璃优雅 × 日系可爱**融合风（樱花粉/淡紫/暖橙），背景随**访客当地天气与昼夜**动态变化，配有命令面板、伪终端彩蛋、音乐播放器、追番书影页、写作热力图等特色功能。站点默认名「樱雾小筑 · SakuraMist」（占位名，可在配置中改），中文为主要界面语言。

## 技术栈

- **Astro 5**（静态输出）+ **Tailwind CSS** + **Svelte**（交互组件）+ **TypeScript**
- 内容引擎基于开源主题 [Fuwari](https://github.com/saicaca/fuwari)（MIT，须保留署名），**视觉层为全站自研**，勿沿用其默认配色
- 部署：Cloudflare Pages（纯静态，无服务端）

## 常用命令

```bash
pnpm install        # 安装依赖
pnpm dev            # 本地开发 http://localhost:4321
pnpm build          # 产物构建到 dist/（交付前必须零报错）
pnpm preview        # 预览构建产物
pnpm astro check    # 类型与 .astro 语法检查
wrangler pages deploy dist   # 部署（首次需 wrangler login）
```

## 目录结构（关键）

```
docs/                  # 设计/需求/部署文档；改代码前先读 01（视觉）与 03（功能）
src/config.ts          # 站点信息 + 功能总开关（唯一配置入口）
src/content/posts/     # 博客文章（Markdown）
src/content/spec/      # 关于页等单页内容
src/components/        # Astro 组件（结构层）
src/components/widget/ # 侧栏/挂件类组件
src/effects/           # ★ 自研特效层：Canvas 管理器与全部特效模块
src/styles/            # ★ tokens.css（设计 token 唯一来源）+ 基础样式
src/pages/             # 路由：/ /about /archive /bangumi /dashboard /404
src/data/              # 构建期数据缓存（如 bangumi-cache.json）
public/music/          # 音乐播放器音频文件
public/images/         # 文章与本站图片
scripts/               # 构建期脚本（数据抓取/热力图统计）
```

> 注：`src/effects/`、`/bangumi`、`/dashboard` 为本项目自研新增；其余沿 Fuwari 原始结构。以实际仓库为准。

## 设计 Token 约定（强制）

- 所有颜色、圆角、模糊、阴影**必须**引用 `src/styles/tokens.css` 的 CSS 变量，禁止在组件里硬编码色值。
- 深浅主题沿用 Fuwari 机制：`<html>` 上的 `dark` 类，tokens.css 中维护 `:root` / `:root.dark` 两套取值。
- 核心变量速查：`--primary`（樱花粉）、`--accent`（淡紫）、`--warm`（暖橙）、`--bg-base`、`--bg-glass`（毛玻璃底色）、`--text-main`、`--text-sub`、`--radius-card`、`--blur-glass`。完整表见 `docs/01`。

## 特效层（src/effects/）

- **FXManager 是全站唯一动画入口**：单 `requestAnimationFrame` 循环调度所有 canvas 层，元素滚出视口 / 页面切后台自动暂停，`prefers-reduced-motion` 时输出静态首帧。
- 新增特效必须实现 Layer 接口注册进 manager，**禁止**私自 `setInterval` / 独立 `requestAnimationFrame`。
- 现有模块：`dynamic-bg`（天气×昼夜背景）、`sakura`（樱花飘落）、`click-burst`（点击粒子）、`audio-reactive`（音乐律动）。
- 移动端 / 低内存设备降级矩阵见 `docs/02`。

## 功能开关（src/config.ts）

```ts
features: {
  commandPalette, terminal, weatherBg, musicPlayer,
  bangumi, dashboard, comments, sakura, clickBurst, typewriter, ...
}
```

每个布尔开关的默认值、含义与验收标准见 `docs/03-功能需求清单.md`。新增功能必须同步：开关 + docs/03 条目。

## 红线（违反即返工）

1. 任何改动后 `pnpm build` 必须零报错，并跑 `pnpm astro check`。
2. 禁止引入大型运行时依赖（three.js、gsap 全家桶等）——特效一律轻量自写，确需引库先说明理由。
3. 禁止破坏 `prefers-reduced-motion` 与移动端降级路径。
4. 文章 frontmatter 必须符合 `docs/04` 规范。
5. 保留 Fuwari 的 MIT 版权声明（LICENSE / README 署名）。
6. 只用无需鉴权的公开 API（Open-Meteo、Bangumi）；任何私密 key 不得入库。
7. UI 文案默认中文；代码注释克制，只写必要的「为什么」。

## 内容写作

文章放 `src/content/posts/*.md`，frontmatter 规范见 `docs/04`。仓库自带示例文章，正式使用时可修改或删除。
