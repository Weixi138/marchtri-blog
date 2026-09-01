#!/usr/bin/env node
/**
 * 自动发布检查（B5 兜底路线）：拉取 origin，若 main 有新 commit 则重新构建并部署。
 * 用法：node scripts/auto-deploy-check.mjs
 * 触发：本地定时任务每 10 分钟跑一次；git push 或后台发文后，最迟 10 分钟上线。
 * 状态文件 .deployed-sha 记录最后一次部署的 commit（已 gitignore）。
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const run = (cmd, args) =>
	spawnSync(cmd, args, { encoding: "utf8", shell: true });

const fetch = run("git", ["fetch", "origin", "--quiet"]);
if (fetch.status !== 0) {
	console.error("git fetch 失败（网络问题？稍后重试）");
	process.exit(1);
}

const head = run("git", ["rev-parse", "origin/main"]);
if (head.status !== 0) {
	console.error("无法读取 origin/main");
	process.exit(1);
}
const remoteSha = head.stdout.trim();
const deployed = existsSync(".deployed-sha")
	? readFileSync(".deployed-sha", "utf8").trim()
	: "";

if (remoteSha === deployed) {
	console.log(`无新 commit（${remoteSha.slice(0, 7)} 已部署）`);
	process.exit(0);
}

console.log(`发现新 commit ${remoteSha.slice(0, 7)}（上次 ${deployed.slice(0, 7) || "无"}），开始构建…`);
// 仅在本地工作区干净时同步到 origin/main，避免覆盖未提交改动
const dirty = run("git", ["status", "--porcelain"]);
if (dirty.stdout.trim() !== "" ) {
	if (deployed === "") {
		console.log("工作区有未提交改动，按当前工作区内容构建部署（首次）");
	} else {
		console.error("工作区有未提交改动，跳过本次自动部署，请先提交或清理后手动 node scripts/deploy.mjs");
		process.exit(2);
	}
} else if (deployed !== "") {
	const pull = run("git", ["pull", "--ff-only", "origin", "main"]);
	if (pull.status !== 0) {
		console.error("git pull 失败：");
		console.error(pull.stderr);
		process.exit(1);
	}
}

const build = run("pnpm", ["build"]);
if (build.status !== 0) {
	console.error("构建失败，中止部署");
	process.exit(1);
}
const deploy = run("npx", ["wrangler", "deploy"]);
if (deploy.status !== 0) {
	console.error("wrangler deploy 失败");
	process.exit(1);
}

writeFileSync(".deployed-sha", remoteSha + "\n");
console.log(`已部署 ${remoteSha.slice(0, 7)} 到 https://blog.22331.top`);
