<script lang="ts">
/**
 * 音乐播放器（docs/03 P1-3）— 全自研玻璃 UI。
 * 音源：网易云外链直链（构建期解析）或本地曲库。
 * 本地曲目经 Web Audio AnalyserNode 驱动背景光晕律动；
 * 外链曲目因跨域限制跳过律动（避免 tainted media 被静音）。
 */
import { onDestroy, onMount } from "svelte";

interface Track {
	file: string;
	title: string;
	artist?: string;
}

let {
	playlist = [] as Track[],
	defaultVolume = 0.6,
}: { playlist?: Track[]; defaultVolume?: number } = $props();

let open = $state(false);
let index = $state(0);
let playing = $state(false);
let volume = $state(defaultVolume);
let progress = $state(0);
let currentTime = $state(0);
let duration = $state(0);

let audioEl: HTMLAudioElement | undefined = $state();
let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let sourceCreated = false;
let samplerRegistered = false;
const errored = new Set<number>();

const isLocal = $derived(
	Boolean(playlist[index]?.file) && playlist[index].file.startsWith("/"),
);

$effect(() => {
	const saved = Number(localStorage.getItem("fx-music-volume"));
	if (!Number.isNaN(saved) && saved > 0) volume = saved;
});

$effect(() => {
	localStorage.setItem("fx-music-volume", String(volume));
	localStorage.setItem("fx-music-last", String(index));
	if (audioEl) audioEl.volume = volume;
});

function ensureGraph(): void {
	if (!audioEl || sourceCreated || !isLocal) return;
	try {
		audioCtx = new AudioContext();
		const src = audioCtx.createMediaElementSource(audioEl);
		analyser = audioCtx.createAnalyser();
		analyser.fftSize = 256;
		src.connect(analyser);
		analyser.connect(audioCtx.destination);
		sourceCreated = true;
	} catch {
		analyser = null; // Web Audio 不可用：静默降级，播放不受影响
	}
}

/** 能量采样并入 FXManager 单循环（禁止组件自持 rAF） */
function sampleEnergy(): void {
	if (playing && analyser) {
		const data = new Uint8Array(analyser.frequencyBinCount);
		analyser.getByteFrequencyData(data);
		let sum = 0;
		const n = Math.floor(data.length / 4); // 低频段
		for (let i = 0; i < n; i++) sum += data[i];
		window.__fxManager?.setAudioEnergy(Math.min(1, sum / n / 180));
	} else {
		window.__fxManager?.setAudioEnergy(0);
	}
}

function registerSampler(): void {
	if (samplerRegistered || !window.__fxManager) return;
	window.__fxManager.addSampler(sampleEnergy);
	samplerRegistered = true;
}

function play(): void {
	if (!audioEl) return;
	registerSampler();
	ensureGraph();
	void audioCtx?.resume();
	void audioEl.play();
}

function toggle(): void {
	if (!audioEl) return;
	if (playing) audioEl.pause();
	else play();
}

function select(i: number): void {
	if (errored.size >= playlist.length) return; // 全部不可用
	index = (i + playlist.length) % playlist.length;
	playing = true;
	setTimeout(play, 30);
}

function next(): void {
	select(index + 1);
}
function prev(): void {
	select(index - 1);
}

function onPlay(): void {
	playing = true;
}
function onPause(): void {
	playing = false;
}
function onError(): void {
	// 单曲不可用（如 VIP 歌曲外链失效）：标记并自动跳下一首
	errored.add(index);
	if (playing) next();
}

function onTimeUpdate(): void {
	if (audioEl?.duration) {
		progress = audioEl.currentTime / audioEl.duration;
		currentTime = audioEl.currentTime;
		duration = audioEl.duration;
	}
}

onMount(() => {
	registerSampler();
});

onDestroy(() => {
	if (typeof window === "undefined") return; // SSR 时 onDestroy 会立即执行
	void audioCtx?.close();
});

const fmt = (t: number): string => {
	if (!Number.isFinite(t)) return "0:00";
	const m = Math.floor(t / 60);
	const s = Math.floor(t % 60);
	return `${m}:${String(s).padStart(2, "0")}`;
};
</script>

{#if playlist.length}
	<!-- 唱片胶囊：播放时旋转 -->
	<button
		class="fixed z-[80] right-4 bottom-4 w-12 h-12 rounded-full glass-panel flex items-center justify-center
		       transition hover:scale-105 active:scale-95"
		class:spinning={playing}
		aria-label="音乐播放器"
		onclick={() => (open = !open)}
	>
		<span
			class="w-8 h-8 rounded-full inline-block"
			style="background: conic-gradient(var(--sakura), var(--murasaki), var(--warm), var(--sakura));
			       mask: radial-gradient(circle, transparent 34%, black 36%);
			       -webkit-mask: radial-gradient(circle, transparent 34%, black 36%);"
		></span>
	</button>

	{#if open}
		<div
			class="fixed z-[80] right-4 bottom-20 w-72 max-w-[calc(100vw-2rem)] glass-panel overflow-hidden"
			role="dialog"
			aria-label="音乐电台"
		>
			<div class="flex items-center gap-1 px-4 h-11 border-b border-[var(--stroke-glass)]">
				<span class="text-sm font-bold text-75 flex-1">音乐电台</span>
				<span class="text-[10px] text-50">{index + 1} / {playlist.length}</span>
				<button class="text-50 hover:text-[var(--sakura)] text-lg leading-none" aria-label="关闭" onclick={() => (open = false)}>×</button>
			</div>

			<div class="px-4 py-4 flex flex-col items-center gap-2">
				<!-- 旋转唱片 -->
				<button
					class="w-20 h-20 rounded-full relative flex items-center justify-center
					       transition hover:scale-105"
					class:spinning={playing}
					style="background: conic-gradient(var(--sakura), var(--murasaki), var(--warm), var(--sakura));
					       box-shadow: 0 6px 24px color-mix(in srgb, var(--sakura) 40%, transparent);"
					aria-label={playing ? "暂停" : "播放"}
					onclick={toggle}
				>
					<span class="w-7 h-7 rounded-full glass-panel flex items-center justify-center">
						{#if playing}
							<svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 text-[var(--sakura)]"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
						{:else}
							<svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 ml-0.5 text-[var(--sakura)]"><path d="M8 5v14l11-7z" /></svg>
						{/if}
					</span>
				</button>
				<div class="text-center max-w-full">
					<div class="text-sm font-bold text-90 truncate">{playlist[index]?.title ?? "-"}</div>
					<div class="text-xs text-50 truncate">{playlist[index]?.artist ?? ""}</div>
				</div>
				<div class="w-full flex items-center gap-2">
					<span class="text-[10px] text-50 tabular-nums">{fmt(currentTime)}</span>
					<input
						type="range"
						min="0"
						max="1000"
						value={progress * 1000}
						class="flex-1 accent-[var(--sakura)] h-1"
						aria-label="播放进度"
						oninput={(e) => {
							if (!audioEl?.duration) return;
							const v = Number(e.currentTarget.value) / 1000;
							audioEl.currentTime = v * audioEl.duration;
						}}
					/>
					<span class="text-[10px] text-50 tabular-nums">{fmt(duration)}</span>
				</div>
				<div class="flex items-center justify-center gap-7 pt-1">
					<button class="text-75 hover:text-[var(--sakura)] transition" aria-label="上一首" onclick={prev}>
						<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M6 6h2v12H6zm3.5 6l8.5-6v12z" /></svg>
					</button>
					<button class="w-11 h-11 rounded-full flex items-center justify-center text-white transition hover:scale-105"
						style="background: linear-gradient(135deg, var(--sakura), var(--murasaki));
						       box-shadow: 0 4px 16px color-mix(in srgb, var(--sakura) 45%, transparent);"
						aria-label={playing ? "暂停" : "播放"}
						onclick={toggle}
					>
						{#if playing}
							<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
						{:else}
							<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 ml-0.5"><path d="M8 5v14l11-7z" /></svg>
						{/if}
					</button>
					<button class="text-75 hover:text-[var(--sakura)] transition" aria-label="下一首" onclick={next}>
						<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M16 6h2v12h-2zM6 6l8.5 6L6 18z" /></svg>
					</button>
				</div>
				<label class="flex items-center gap-2 text-xs text-50 w-full justify-center pt-1">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="w-3.5 h-3.5"><path d="M11 5L6 9H3v6h3l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /></svg>
					<input
						type="range"
						min="0"
						max="100"
						value={volume * 100}
						class="w-24 accent-[var(--sakura)] h-1"
						aria-label="音量"
						oninput={(e) => (volume = Number(e.currentTarget.value) / 100)}
					/>
				</label>
			</div>
		</div>
	{/if}

	<audio
		bind:this={audioEl}
		src={playlist[index]?.file}
		onplay={onPlay}
		onpause={onPause}
		onended={next}
		onerror={onError}
		ontimeupdate={onTimeUpdate}
		preload="none"
	></audio>
{/if}

<style>
	.spinning {
		animation: spin 3.2s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.spinning {
			animation: none;
		}
	}
	button {
		cursor: pointer;
		font-family: inherit;
		background: transparent;
		border: none;
	}
</style>
