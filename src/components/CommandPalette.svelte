<script lang="ts">
	/**
	 * 命令面板（docs/03 P1-1）：Ctrl+K 唤起，毛玻璃弹层。
	 * 搜索文章 + 页面跳转 + 动作（主题/特效开关/复制 RSS）。
	 */
	import { onMount } from "svelte";
	import { LIGHT_MODE, DARK_MODE } from "../constants/constants";

	interface PostItem {
		title: string;
		url: string;
		description: string;
	}

	let { posts = [] as PostItem[] }: { posts?: PostItem[] } = $props();

	let open = $state(false);
	let query = $state("");
	let active = $state(0);

	const pages = [
		{ name: "首页", url: "/" },
		{ name: "归档", url: "/archive/" },
		{ name: "写作看板", url: "/dashboard/" },
		{ name: "照片墙", url: "/photos/" },
		{ name: "关于", url: "/about/" },
	];

	function navigate(url: string): void {
		open = false;
		if (window.swup?.navigate) window.swup.navigate(url);
		else location.href = url;
	}

	function toggleTheme(): void {
		const dark = document.documentElement.classList.contains("dark");
		const mode = dark ? LIGHT_MODE : DARK_MODE;
		localStorage.theme = mode;
		document.documentElement.classList.toggle("dark", !dark);
	}

	function copyRss(): void {
		const rssUrl = new URL(
			"rss.xml",
			location.origin + import.meta.env.BASE_URL,
		).toString();
		void navigator.clipboard?.writeText(rssUrl);
	}

	type Row =
		| { kind: "page"; name: string; url: string }
		| { kind: "post"; name: string; url: string; description: string }
		| { kind: "action"; name: string; hint: string; run: () => void };

	const actions: Row[] = [
		{
			kind: "action",
			name: "切换 深色 / 浅色 主题",
			hint: "theme",
			run: toggleTheme,
		},
		{
			kind: "action",
			name: "开 / 关 樱花飘落",
			hint: "sakura",
			run: () => {
				if (window.__fxSakura)
					window.__fxSakura.enabled = !window.__fxSakura.enabled;
			},
		},
		{
			kind: "action",
			name: "开 / 关 点击粒子",
			hint: "particles",
			run: () => {
				if (window.__fxBurst)
					window.__fxBurst.enabled = !window.__fxBurst.enabled;
			},
		},
		{
			kind: "action",
			name: "开 / 关 天气粒子",
			hint: "weather",
			run: () => window.__fxSetWeather?.(),
		},
		{
			kind: "action",
			name: "复制 RSS 订阅链接",
			hint: "rss",
			run: copyRss,
		},
	];

	const rows = $derived.by(() => {
		const q = query.trim().toLowerCase();
		let pageRows: Row[] = pages.map((p) => ({ kind: "page" as const, ...p }));
		let postRows: Row[] = posts.map((p) => ({
			kind: "post" as const,
			name: p.title,
			url: p.url,
			description: p.description,
		}));
		let actionRows: Row[] = actions;
		if (q) {
			pageRows = pageRows.filter((r) => r.name.toLowerCase().includes(q));
			postRows = postRows.filter(
				(r) =>
					r.name.toLowerCase().includes(q) ||
					r.description.toLowerCase().includes(q),
			);
			actionRows = actionRows.filter((r) =>
				r.name.toLowerCase().includes(q),
			);
		} else {
			postRows = postRows.slice(0, 5); // 空查询 → 最近文章
		}
		return [...pageRows, ...postRows, ...actionRows];
	});

	function runRow(row: Row | undefined): void {
		if (!row) return;
		if (row.kind === "action") {
			row.run();
			open = false;
		} else {
			navigate(row.url);
		}
	}

	function onKeydown(e: KeyboardEvent): void {
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
			e.preventDefault();
			open = !open;
			if (open) {
				query = "";
				active = 0;
			}
			return;
		}
		if (!open) return;
		if (e.key === "Escape") {
			open = false;
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			active = Math.min(active + 1, rows.length - 1);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			active = Math.max(active - 1, 0);
		} else if (e.key === "Enter") {
			e.preventDefault();
			runRow(rows[active]);
		}
	}

	onMount(() => {
		const handler = (): void => {
			open = true;
			query = "";
			active = 0;
		};
		window.addEventListener("fx:open-palette", handler);
		return () => window.removeEventListener("fx:open-palette", handler);
	});
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
	<!-- 点击遮罩关闭 -->
	<div
		class="fixed inset-0 z-[90] bg-black/30 backdrop-blur-[2px]"
		onclick={() => (open = false)}
		aria-hidden="true"
	></div>
	<div
		class="fixed z-[100] inset-x-4 top-[12vh] mx-auto max-w-xl glass-panel overflow-hidden"
		role="dialog"
		aria-label="命令面板"
	>
		<div
			class="flex items-center gap-2 px-4 h-14 border-b border-[var(--stroke-glass)]"
		>
			<span class="text-[var(--sakura)] text-lg">⌘</span>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				bind:value={query}
				autofocus
				placeholder="搜索文章、页面，或输入动作…"
				class="flex-1 bg-transparent outline-none text-[15px] text-90 placeholder:text-black/30 dark:placeholder:text-white/30"
				onkeydown={(e) => {
					if (
						e.key === "ArrowDown" ||
						e.key === "ArrowUp" ||
						e.key === "Enter"
					)
						e.preventDefault();
					if (e.key === "ArrowDown")
						active = Math.min(active + 1, rows.length - 1);
					if (e.key === "ArrowUp") active = Math.max(active - 1, 0);
					if (e.key === "Enter") runRow(rows[active]);
				}}
			/>
			<kbd
				class="text-[10px] px-1.5 py-0.5 rounded border border-[var(--stroke-glass)] text-50"
			>ESC</kbd
			>
		</div>
		<div class="max-h-[50vh] overflow-y-auto py-2">
			{#each rows as row, i (i)}
				<button
					class="w-full text-left px-4 py-2.5 flex items-center gap-3 transition
					{i === active ? 'bg-[var(--btn-regular-bg)]' : ''}"
					onmouseenter={() => (active = i)}
					onclick={() => runRow(row)}
				>
				{#if row.kind === "post"}
					<span class="post-dot" aria-hidden="true"></span>
					<span class="flex-1 truncate text-90">{row.name}</span>
					<span class="text-xs text-50 truncate max-w-[40%]"
						>{row.description}</span
					>
				{:else if row.kind === "page"}
					<span class="flex-1 truncate text-90">{row.name}</span>
				{:else}
					<span class="flex-1 truncate text-90">{row.name}</span>
					<span class="text-xs text-50">{row.hint}</span>
				{/if}
				</button>
			{:else}
				<div class="px-4 py-6 text-center text-50">
					没有找到「{query}」相关的内容
				</div>
			{/each}
		</div>
		<div
			class="px-4 h-9 flex items-center gap-3 text-[11px] text-50 border-t border-[var(--stroke-glass)]"
		>
			<span>↑↓ 选择</span><span>↵ 打开</span><span>esc 关闭</span>
		</div>
	</div>
{/if}

<style>
	button {
		cursor: pointer;
		background: none;
		border: none;
		font-family: inherit;
	}
	.post-dot {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		background: linear-gradient(135deg, var(--sakura), var(--murasaki));
		flex-shrink: 0;
	}
</style>
