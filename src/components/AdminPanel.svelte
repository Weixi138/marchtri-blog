<script lang="ts">
import MarkdownIt from "markdown-it";
import { onMount } from "svelte";

/** 博客后台（B4）：登录 → 文章列表 → 编辑/新建（textarea + 分栏预览） */

// 仅保留 $props() 调用，供 Astro 的 client:only 属性通过类型检查
let _props = $props();

type View = "checking" | "login" | "list" | "edit";
type PostRow = { name: string; path: string; sha: string; size: number };

const md = new MarkdownIt({ html: false, linkify: true });
const NAME_RE = /^[a-z0-9][a-z0-9-]*\.md$/;
const NEW_TEMPLATE = `---
title: ""
published: ${new Date().toISOString().slice(0, 10)}
description: ""
image: ""
tags: []
category: ""
lang: zh_CN
draft: false
---

正文从这里开始。
`;

let view = $state<View>("checking");
let password = $state("");
let busy = $state(false);
let error = $state("");
let notice = $state("");
let posts = $state<PostRow[]>([]);

// 编辑态
let editingName = $state("");
let editingSha = $state("");
let isNew = $state(false);
let draft = $state("");
let previewHtml = $derived(md.render(draft));

async function api<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`/api/admin/${path}`, {
		...init,
		headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
	});
	const data = (await res.json().catch(() => ({}))) as T & { error?: string };
	if (!res.ok) throw new Error(`${data.error ?? "请求失败"} [${res.status}]`);
	return data;
}

async function checkSession(): Promise<void> {
	try {
		await api("session");
		view = "list";
		void loadList().catch(showErr);
	} catch {
		view = "login";
	}
}

function showErr(err: unknown): void {
	error = err instanceof Error ? err.message : "请求失败";
}

async function loadList(): Promise<void> {
	const data = await api<{ posts: PostRow[] }>("posts");
	posts = data.posts;
}

async function login(e: SubmitEvent): Promise<void> {
	e.preventDefault();
	busy = true;
	error = "";
	try {
		await api("login", { method: "POST", body: JSON.stringify({ password }) });
		password = "";
		error = "";
		view = "list";
		void loadList().catch(showErr);
	} catch (err) {
		error = err instanceof Error ? err.message : "登录失败";
	} finally {
		busy = false;
	}
}

async function logout(): Promise<void> {
	await api("logout", { method: "POST" }).catch(() => {});
	view = "login";
}

function openNew(): void {
	isNew = true;
	editingName = "";
	editingSha = "";
	draft = NEW_TEMPLATE;
	error = "";
	notice = "";
	view = "edit";
}

async function openEdit(p: PostRow): Promise<void> {
	busy = true;
	error = "";
	notice = "";
	try {
		const data = await api<{ content: string; sha: string }>(
			`posts/${encodeURIComponent(p.name)}`,
		);
		isNew = false;
		editingName = p.name;
		editingSha = data.sha;
		draft = data.content;
		view = "edit";
	} catch (err) {
		error = err instanceof Error ? err.message : "读取文章失败";
	} finally {
		busy = false;
	}
}

async function save(): Promise<void> {
	if (!NAME_RE.test(editingName)) {
		error = "文件名不合法：仅限小写字母、数字、连字符，以 .md 结尾";
		return;
	}
	busy = true;
	error = "";
	try {
		await api(`posts/${encodeURIComponent(editingName)}`, {
			method: "PUT",
			body: JSON.stringify(
				isNew ? { content: draft } : { content: draft, sha: editingSha },
			),
		});
		notice = "已提交到 GitHub，等待自动构建生效（约 1–2 分钟）";
		isNew = false;
		const data = await api<{ sha: string }>(
			`posts/${encodeURIComponent(editingName)}`,
		);
		editingSha = data.sha;
	} catch (err) {
		const msg = err instanceof Error ? err.message : "保存失败";
		error = msg.includes("[409]")
			? "文件已存在或已被改动：新建冲突请从列表编辑，更新冲突请返回列表重新打开"
			: msg;
	} finally {
		busy = false;
	}
}

async function remove(p: PostRow): Promise<void> {
	if (!confirm(`确定删除《${p.name}》？该操作会直接提交到仓库。`)) return;
	busy = true;
	error = "";
	try {
		await api(`posts/${encodeURIComponent(p.name)}`, {
			method: "DELETE",
			body: JSON.stringify({ sha: p.sha }),
		});
		await loadList();
		notice = "已删除，等待构建生效";
	} catch (err) {
		error = err instanceof Error ? err.message : "删除失败";
	} finally {
		busy = false;
	}
}

function backToList(): void {
	view = "list";
	error = "";
	notice = "";
	void loadList().catch(() => {});
}

onMount(checkSession);
</script>

<div class="glass-panel rounded-[var(--radius-card)] p-6 md:p-8 my-4">
	{#if view === "checking"}
		<div class="text-50 py-8 text-center">正在检查登录状态…</div>
	{:else if view === "login"}
		<h2 class="text-xl font-bold mb-4">博客后台登录</h2>
		<form onsubmit={login} class="flex flex-col gap-3 max-w-sm">
			<input
				type="password"
				bind:value={password}
				placeholder="管理密码"
				autocomplete="current-password"
				class="rounded-[var(--radius-btn)] bg-[var(--card-bg)] px-4 py-2.5 outline-none focus-ring"
			/>
			<button
				type="submit"
				disabled={busy || !password}
				class="btn-primary-grad rounded-[var(--radius-btn)] px-4 py-2.5 font-medium disabled:opacity-50"
			>
				登录
			</button>
		</form>
	{:else if view === "list"}
		<div class="flex items-center justify-between mb-4 flex-wrap gap-2">
			<h2 class="text-xl font-bold">文章管理（{posts.length} 篇）</h2>
			<div class="flex gap-2">
				<button class="btn-primary-grad rounded-[var(--radius-btn)] px-4 py-2 text-sm font-medium" onclick={openNew}>
					写新文章
				</button>
				<button class="btn-regular rounded-[var(--radius-btn)] px-4 py-2 text-sm" onclick={logout}>
					退出登录
				</button>
			</div>
		</div>
		<div class="flex flex-col gap-2">
			{#each posts as p (p.name)}
				<div class="flex items-center gap-3 rounded-[var(--radius-btn)] bg-[var(--card-bg)] px-4 py-2.5">
					<div class="flex-1 min-w-0">
						<div class="truncate font-medium">{p.name}</div>
						<div class="text-xs text-50">{(p.size / 1024).toFixed(1)} KB</div>
					</div>
					<button class="btn-regular rounded-[var(--radius-btn)] px-3 py-1.5 text-sm focus-ring" onclick={() => openEdit(p)}>
						编辑
					</button>
					<button class="btn-regular rounded-[var(--radius-btn)] px-3 py-1.5 text-sm text-[var(--term-red)] focus-ring" onclick={() => remove(p)}>
						删除
					</button>
				</div>
			{/each}
		</div>
	{:else if view === "edit"}
		<div class="flex items-center justify-between mb-3 flex-wrap gap-2">
			<div class="flex items-center gap-2 min-w-0">
				<button class="btn-regular rounded-[var(--radius-btn)] px-3 py-1.5 text-sm focus-ring" onclick={backToList}>
					返回列表
				</button>
				<input
					type="text"
					bind:value={editingName}
					disabled={!isNew}
					placeholder="文件名，如 my-new-post.md"
					class="min-w-0 flex-1 rounded-[var(--radius-btn)] bg-[var(--card-bg)] px-3 py-1.5 text-sm outline-none focus-ring disabled:opacity-60"
				/>
			</div>
			<button
				class="btn-primary-grad rounded-[var(--radius-btn)] px-5 py-2 text-sm font-medium disabled:opacity-50"
				onclick={save}
				disabled={busy}
			>
				{busy ? "提交中…" : "保存到 GitHub"}
			</button>
		</div>
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
			<textarea
				bind:value={draft}
				spellcheck="false"
				class="w-full min-h-[60vh] rounded-[var(--radius-btn)] bg-[var(--card-bg)] p-4 font-mono text-sm leading-6 outline-none resize-y focus-ring"
				placeholder="Markdown 正文（含 frontmatter）"
			></textarea>
			<!-- 预览为服务端同源生成，markdown-it 已禁 html -->
			<div class="custom-md w-full min-h-[60vh] rounded-[var(--radius-btn)] border border-[var(--stroke-glass)] p-4 overflow-auto text-sm"
				aria-label="预览">
				{@html previewHtml}
			</div>
		</div>
	{/if}

	{#if error}
		<div class="mt-3 rounded-[var(--radius-btn)] px-4 py-2 text-sm text-[var(--term-red)]"
			style="background: color-mix(in srgb, var(--term-red) 10%, transparent);" role="alert">
			{error}
		</div>
	{/if}
	{#if notice}
		<div class="mt-3 rounded-[var(--radius-btn)] px-4 py-2 text-sm text-[var(--season-tint)]"
			style="background: color-mix(in srgb, var(--season-tint) 10%, transparent);" role="status">
			{notice}
		</div>
	{/if}
</div>
