---
title: Markdown 写作要素速览
published: 2026-08-29
description: 这篇文章是站点的「排版基准页」，集中演示各类 Markdown 与扩展语法在本站的渲染效果，写作时可随时对照。
tags: [写作, 教程]
category: 写作
---

写文章之前，先看看这套模板能把文字渲染成什么样子。本文就是基准页，需要时回来对照。

## 文本要素

普通正文，**粗体**、*斜体*、~~删除线~~、`行内代码`，以及 [一个链接](https://astro.build)。

> 引用块：生活明朗，万物可爱。

:::note
这是 note 类提示块（GitHub Admonition 语法 `> [!NOTE]` 也支持）。
:::

:::tip
这是 tip 类提示块，适合放小技巧。
:::

## 列表与任务

1. 有序列表项
2. 另一项
   - 嵌套无序项
   - 再嵌套

- [x] 已经完成的事
- [ ] 还没做的事

## 代码块

```ts
// 代码高亮 + 行号 + 折叠 + 语言徽章
const sakura = (n: number): string => "petal".repeat(n);
console.log(sakura(3)); // petalpetalpetal
```

## 表格

| 功能 | 状态 |
| --- | --- |
| 天气背景 | 已支持 |
| 命令面板 | 已支持 |

## 数学公式

质能方程 $E = mc^2$，以及块级公式：

$$
\int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}
$$

## 图片

放一张本站素材（封面同理，写在 frontmatter 的 `image` 字段）：

![樱花](/favicon/favicon.svg)

## frontmatter 备忘

```yaml
---
title: 标题（必填）
published: 2026-08-29        # 参与热力图统计
description: 摘要 50–120 字   # 列表页与搜索的门面
tags: [标签1, 标签2]
category: 技术
music:                       # 可选：文末播放卡
  file: /music/xxx.mp3
  title: 曲目名
---
```

完整规范见 `docs/04-内容写作指南.md`。
