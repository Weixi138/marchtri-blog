#!/usr/bin/env node
/**
 * 生成博客后台凭据（docs/05）：随机管理密码 + SESSION_SECRET。
 * 用法：node scripts/gen-password.mjs            （随机生成）
 *       node scripts/gen-password.mjs <指定密码>
 * 然后配置：
 *   wrangler secret put ADMIN_PASSWORD    （把输出的密码原文喂给它）
 *   wrangler secret put SESSION_SECRET
 * （本地开发写入 .dev.vars，该文件已被 .gitignore 屏蔽）
 *
 * 注：不用哈希——Workers 免费版 10ms CPU 限制会击杀 PBKDF2 高迭代派生，
 * 密码本身以 secret 形式加密存于 Cloudflare，登录走恒定时间比较。
 */
import { randomBytes } from "node:crypto";

const password =
	process.argv[2] ??
	randomBytes(12).toString("base64url"); // ~14 位强随机
const sessionSecret = randomBytes(32).toString("base64");

console.log(`管理密码：${password}`);
console.log(`ADMIN_PASSWORD=${password}`);
console.log(`SESSION_SECRET=${sessionSecret}`);
