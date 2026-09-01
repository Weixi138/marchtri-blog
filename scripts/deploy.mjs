#!/usr/bin/env node
/**
 * Cloudflare Workers 一键部署（docs/05 · B1 收束后的唯一路线）。
 * 用法：node scripts/deploy.mjs   （首次会触发 wrangler login 浏览器授权）
 * 前置：pnpm build 已产出 dist/；wrangler.jsonc 配置 assets + main。
 * 注意：部署目标项目名在 wrangler.jsonc 里定义（当前为 marchtri-blog），
 * 此处不做硬编码或环境变量覆盖，改名请以 wrangler.jsonc 为准。
 */
import { spawnSync } from "node:child_process";

console.log("▶ 构建产物部署到 Cloudflare Worker「marchtri-blog」…");
const result = spawnSync("npx", ["wrangler", "deploy"], {
	stdio: "inherit",
	shell: true,
});

process.exit(result.status ?? 1);
