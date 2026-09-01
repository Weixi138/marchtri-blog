# MarchTri · 个人博客

毛玻璃优雅 × 日系可爱融合风的个人博客，站长 MarchTri。

## 特性

- **开屏加载动画**：强制 3 秒的樱花绽放开屏，品牌记忆点
- **天气 × 昼夜动态背景**：背景随访客当地天气与时间实时变化（雨/雪/雾/星空/黄昏光晕）
- **命令面板 + 伪终端彩蛋**：`Ctrl+K` 搜索与快捷操作；按 `` ` `` 呼出终端，`ls`/`read` 直接翻文章
- **网易云歌单播放器**：右下角玻璃电台，内嵌网易云官方外链播放器；本地备用音景支持音频律动
- **写作热力图 + 数据看板**：GitHub 式贡献图、字数统计、年度报告
- 樱花飘落、点击绽放粒子、鼠标跟随光晕、点击涟漪、阅读进度条、打字机、滚动入场编排、深浅双主题
- giscus 评论、RSS、Sitemap、Pagefind 全文搜索
- 全站图标一律 SVG，界面零 emoji

## 快速开始

```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # 产物 dist/
```

## 配置与写作

- 站点信息、社交链接、网易云歌单 ID、**全部功能开关**：`src/config.ts`
- 文章：`src/content/posts/`，frontmatter 规范见 `docs/04-内容写作指南.md`
- 设计与架构文档：`docs/`（01 视觉规范 / 02 架构与性能预算 / 03 功能清单 / 05 部署指南）
- AI 协作约定：`AGENTS.md`

## 部署（Cloudflare Workers）

```bash
pnpm deploy                   # node scripts/deploy.mjs，wrangler 直部，首次需 wrangler login
```

或推 GitHub 后在 Cloudflare 控制台连接仓库自动构建（构建命令 `pnpm build`，输出 `dist`）。详见 `docs/05-部署指南.md`。

## 致谢与协议

- 博客引擎基于 [Fuwari](https://github.com/saicaca/fuwari)（MIT，详见 [LICENSE](./LICENSE) 与 [FUWARI-README.md](./FUWARI-README.md)），视觉层与特色功能为本站自研
- 字体：[霞鹜文楷 Screen](https://github.com/lxgw/LxgwWeb)（SIL OFL）
- 站点内容默认采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
