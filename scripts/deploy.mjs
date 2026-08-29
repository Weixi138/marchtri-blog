#!/usr/bin/env node
/**
 * Cloudflare Pages 一键部署（docs/05 路线 A）。
 * 用法：node scripts/deploy.mjs   （首次会触发 wrangler login 浏览器授权）
 * 项目名可用环境变量 CF_PROJECT 覆盖，默认 sakura-mist。
 */
import { spawnSync } from "node:child_process";

const project = process.env.CF_PROJECT || "sakura-mist";

console.log(`▶ 部署 dist/ 到 Cloudflare Pages 项目「${project}」…`);
const result = spawnSync(
	"npx",
	["wrangler", "pages", "deploy", "dist", `--project-name=${project}`],
	{ stdio: "inherit", shell: true },
);

process.exit(result.status ?? 1);
