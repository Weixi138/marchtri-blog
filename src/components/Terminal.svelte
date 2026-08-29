<script lang="ts">
	/**
	 * 伪终端彩蛋（docs/03 P1-1）：按 ` 唤起。
	 * help / ls / read / theme / cd / clear / exit / whoami / neofetch
	 */
	import { onMount } from "svelte";
	import { LIGHT_MODE, DARK_MODE, AUTO_MODE } from "../constants/constants";

	interface PostItem {
		title: string;
		url: string;
		published: string;
	}

	let { posts = [] as PostItem[] }: { posts?: PostItem[] } = $props();

	let open = $state(false);
	let input = $state("");
	let history: string[] = $state([]);
	let historyIdx = -1;

	const COMMANDS = [
		"help",
		"ls",
		"read",
		"theme",
		"cd",
		"clear",
		"exit",
		"whoami",
		"neofetch",
	];

	function print(line = ""): void {
		history = [...history, line];
	}

	function navigate(url: string): void {
		open = false;
		if (window.swup?.navigate) window.swup.navigate(url);
		else location.href = url;
	}

	function setTheme(mode: string): void {
		localStorage.theme = mode;
		const root = document.documentElement;
		root.classList.toggle("dark", mode === DARK_MODE);
		if (mode === AUTO_MODE) {
			root.classList.toggle(
				"dark",
				window.matchMedia("(prefers-color-scheme: dark)").matches,
			);
		}
	}

	function run(raw: string): void {
		const cmdline = raw.trim();
		print(`<span class="cmd">❯ ${escapeHtml(cmdline)}</span>`);
		if (!cmdline) return;
		const [cmd, ...args] = cmdline.split(/\s+/);
		const arg = args.join(" ");

		switch (cmd) {
			case "help":
				print("可用命令：");
				print("  ls                  列出全部文章");
				print("  read <序号|关键词>   打开一篇文章");
				print("  theme light|dark|auto  切换主题");
				print("  cd about|archive|dashboard        前往页面");
				print("  whoami | neofetch | date");
				print("  clear | exit");
				break;
			case "ls":
				print(`共 ${posts.length} 篇文章：`);
				posts.forEach((p, i) =>
					print(
						`  ${String(i + 1).padStart(2, " ")}  [${p.published}] ${p.title}`,
					),
				);
				break;
			case "read": {
				if (!arg) {
					print("用法：read <序号|标题关键词>");
					break;
				}
				const idx = Number(arg);
				const hit = Number.isInteger(idx) && idx >= 1 && idx <= posts.length
					? posts[idx - 1]
					: posts.find((p) => p.title.toLowerCase().includes(arg.toLowerCase()));
				if (hit) {
					print(`打开《${hit.title}》…`);
					setTimeout(() => navigate(hit.url), 350);
				} else {
					print(`找不到「${arg}」对应的文章`);
				}
				break;
			}
			case "theme":
				if (["light", "dark", "auto"].includes(arg)) {
					setTheme(
						arg === "light"
							? LIGHT_MODE
							: arg === "dark"
								? DARK_MODE
								: AUTO_MODE,
					);
					print(`主题已切换为 ${arg}`);
				} else {
					print("用法：theme light|dark|auto");
				}
				break;
			case "cd": {
				const map: Record<string, string> = {
					about: "/about/",
					archive: "/archive/",
					dashboard: "/dashboard/",
					"~": "/",
					"/": "/",
				};
				if (map[arg]) {
					print(`cd ${arg} …`);
					setTimeout(() => navigate(map[arg]), 300);
				} else {
					print(`cd: 无处可去：${arg || "(空)"} 试试 about / archive / dashboard`);
				}
				break;
			}
			case "clear":
				history = [];
				break;
			case "exit":
				open = false;
				break;
			case "whoami":
				print("一位在玻璃花房里写代码的旅人");
				break;
			case "date":
				print(new Date().toString());
				break;
			case "neofetch":
				print("        ,          OS:     SakuraMist Blog");
				print("     .  |  .       Shell:  fx-terminal 0.1");
				print("      \\ | /        Theme:  Glass x Kawaii");
				print("   ---- + ----     Author: MarchTri");
				print("      / | \\        Uptime: 常开");
				print("     '  |  `");
				print(`        '          Posts:  ${posts.length}`);
				break;
			default:
				print(`fx: 未找到命令「${cmd}」，输入 help 看看有什么能用的～`);
		}
	}

	function escapeHtml(s: string): string {
		return s
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;");
	}

	function onKeydown(e: KeyboardEvent): void {
		if (e.key === "`") {
			const target = e.target instanceof Element ? e.target : null;
			if (
				target &&
				target.closest("input, textarea, select, [contenteditable]")
			)
				return;
			e.preventDefault();
			open = !open;
			if (open) setTimeout(() => inputEl?.focus(), 30);
			return;
		}
		if (!open) return;
		if (e.key === "Escape") open = false;
	}

	let inputEl: HTMLInputElement | undefined = $state();

	function onInputKeydown(e: KeyboardEvent): void {
		if (e.key === "Enter") {
			run(input);
			input = "";
			historyIdx = -1;
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			if (historyIdx === -1) historyIdx = history.length; // 历史含命令回显，取上一条命令
			// 历史里 ❯ 开头的是命令行
			const cmds = history
				.filter((h) => h.includes('class="cmd"'))
				.map((h) => h.replace(/^.*❯&nbsp;/, "").replace(/<\/span>$/, ""));
			if (cmds.length) {
				historyIdx = Math.max(0, historyIdx - 1);
				input = stripTags(cmds[historyIdx] ?? "");
			}
		} else if (e.key === "Tab") {
			e.preventDefault();
			const hit = COMMANDS.find((c) => c.startsWith(input.trim()));
			if (hit) input = hit + " ";
		}
	}

	function stripTags(s: string): string {
		return s.replaceAll(/<[^>]*>/g, "").replace(/^❯\s*/, "");
	}

	onMount(() => {
		print("欢迎来到 樱雾小筑 伪终端，输入 help 查看命令。");
	});
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
	<div
		class="fixed z-[100] inset-x-4 bottom-6 mx-auto max-w-2xl glass-panel overflow-hidden"
		role="dialog"
		aria-label="伪终端"
	>
		<div
			class="flex items-center gap-2 px-4 h-10 border-b border-[var(--stroke-glass)] text-sm text-75"
		>
			<span class="flex gap-1.5">
				<i class="w-3 h-3 rounded-full bg-[#ff5f57] inline-block"></i>
				<i class="w-3 h-3 rounded-full bg-[#febc2e] inline-block"></i>
				<i class="w-3 h-3 rounded-full bg-[#28c840] inline-block"></i>
			</span>
			<span class="ml-2">sakura@marchtri ~ zsh</span>
			<span class="ml-auto text-xs text-50">按 ` 或 Esc 关闭</span>
		</div>
		<div
			class="px-4 py-3 h-64 overflow-y-auto text-[13px] leading-relaxed font-mono"
		>
			{#each history as line, i (i)}
				<p class="whitespace-pre-wrap break-all">{@html line}</p>
			{/each}
			<form
				class="flex items-center gap-2 mt-1"
				onsubmit={(e) => {
					e.preventDefault();
					run(input);
					input = "";
					historyIdx = -1;
				}}
			>
				<span class="text-[var(--sakura)] font-bold">❯</span>
				<!-- svelte-ignore a11y_autofocus -->
				<input
					bind:this={inputEl}
					bind:value={input}
					autofocus
					spellcheck="false"
					class="flex-1 bg-transparent outline-none font-mono text-[13px] text-90"
					onkeydown={onInputKeydown}
				/>
			</form>
		</div>
	</div>
{/if}

<style>
	.cmd {
		color: var(--sakura);
	}
	.font-mono,
	p {
		font-family:
			"JetBrains Mono",
			ui-monospace,
			SFMono-Regular,
			Menlo,
			Consolas,
			monospace;
	}
</style>
