<script lang="ts">
	/**
	 * 音乐播放器（docs/03 P1-3）。
	 * - netease 模式（neteasePlaylistId 非空）：玻璃面板内嵌网易云官方外链播放器
	 * - local 模式：本地曲库，Web Audio AnalyserNode 低频能量驱动背景光晕律动
	 */
	import { onDestroy } from "svelte";

	interface Track {
		file: string;
		title: string;
		artist?: string;
	}

	let {
		playlist = [] as Track[],
		neteasePlaylistId = "",
		defaultVolume = 0.6,
	}: {
		playlist?: Track[];
		neteasePlaylistId?: string;
		defaultVolume?: number;
	} = $props();

	let open = $state(false);
	let index = $state(0);
	let playing = $state(false);
	let volume = $state(defaultVolume);
	let progress = $state(0);
	let currentTime = $state(0);
	let duration = $state(0);

	const neteaseMode = $derived(neteasePlaylistId.trim() !== "");

	let audioEl: HTMLAudioElement | undefined = $state();
	let audioCtx: AudioContext | null = null;
	let analyser: AnalyserNode | null = null;
	let sourceCreated = false;
	let rafId = 0;

	$effect(() => {
		if (neteaseMode) return;
		const saved = Number(localStorage.getItem("fx-music-volume"));
		if (!Number.isNaN(saved) && saved > 0) volume = saved;
		const savedIdx = Number(localStorage.getItem("fx-music-last"));
		if (!Number.isNaN(savedIdx) && savedIdx >= 0 && savedIdx < playlist.length)
			index = savedIdx;
	});

	$effect(() => {
		if (neteaseMode) return;
		localStorage.setItem("fx-music-volume", String(volume));
		localStorage.setItem("fx-music-last", String(index));
		if (audioEl) audioEl.volume = volume;
	});

	function ensureGraph(): void {
		if (!audioEl || sourceCreated) return;
		try {
			audioCtx = new AudioContext();
			const src = audioCtx.createMediaElementSource(audioEl);
			analyser = audioCtx.createAnalyser();
			analyser.fftSize = 256;
			src.connect(analyser);
			analyser.connect(audioCtx.destination);
			sourceCreated = true;
		} catch {
			// Web Audio 不可用：静默降级，无律动但可正常播放
			analyser = null;
		}
	}

	function pumpEnergy(): void {
		if (playing && analyser) {
			const data = new Uint8Array(analyser.frequencyBinCount);
			analyser.getByteFrequencyData(data);
			let sum = 0;
			const n = Math.floor(data.length / 4); // 低频段
			for (let i = 0; i < n; i++) sum += data[i];
			const energy = Math.min(1, sum / n / 180);
			window.__fxManager?.setAudioEnergy(energy);
		} else {
			window.__fxManager?.setAudioEnergy(0);
		}
		rafId = requestAnimationFrame(pumpEnergy);
	}

	function play(): void {
		if (!audioEl) return;
		ensureGraph();
		void audioCtx?.resume();
		void audioEl.play();
	}

	function toggle(): void {
		if (!audioEl) return;
		if (playing) {
			audioEl.pause();
		} else {
			play();
		}
	}

	function select(i: number): void {
		index = i;
		playing = true;
		setTimeout(play, 30);
	}

	function next(): void {
		if (!playlist.length) return;
		select((index + 1) % playlist.length);
	}

	function prev(): void {
		if (!playlist.length) return;
		select((index - 1 + playlist.length) % playlist.length);
	}

	function onPlay(): void {
		playing = true;
		if (!rafId) rafId = requestAnimationFrame(pumpEnergy);
	}
	function onPause(): void {
		playing = false;
	}

	function onTimeUpdate(): void {
		if (audioEl && audioEl.duration) {
			progress = audioEl.currentTime / audioEl.duration;
			currentTime = audioEl.currentTime;
			duration = audioEl.duration;
		}
	}

	onDestroy(() => {
		if (typeof window === "undefined") return; // SSR 时 onDestroy 会立即执行
		cancelAnimationFrame(rafId);
		void audioCtx?.close();
	});

	const fmt = (t: number): string => {
		if (!Number.isFinite(t)) return "0:00";
		const m = Math.floor(t / 60);
		const s = Math.floor(t % 60);
		return `${m}:${String(s).padStart(2, "0")}`;
	};
</script>

{#if neteaseMode || playlist.length}
<div>
	<!-- 唱片胶囊：网易云模式展开时缓转，本地模式播放时旋转 -->
	<button
		class="fixed z-[80] right-4 bottom-4 w-12 h-12 rounded-full glass-panel flex items-center justify-center
		       transition hover:scale-105 active:scale-95"
		class:spinning={neteaseMode ? open : playing}
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
			class="fixed z-[80] right-4 bottom-20 w-80 max-w-[calc(100vw-2rem)] glass-panel overflow-hidden"
			role="dialog"
			aria-label="播放列表"
		>
			<div class="flex items-center gap-1 px-4 h-11 border-b border-[var(--stroke-glass)]">
				<span class="text-sm font-bold text-75 flex-1 flex items-center gap-2">
					<span class="netease-logo" aria-hidden="true"></span>
					音乐电台{neteaseMode ? " · 网易云" : ""}
				</span>
				<button class="text-50 hover:text-[var(--sakura)] text-lg leading-none" aria-label="关闭" onclick={() => (open = false)}>×</button>
			</div>

			{#if neteaseMode}
				<!-- 网易云官方外链播放器 · height=66 精简模式：只保留播放控制条，不显示歌单列表 -->
				<iframe
					src={`https://music.163.com/outchain/player?type=0&id=${neteasePlaylistId}&auto=1&height=66`}
					title="网易云音乐"
					class="w-[calc(100%-2rem)] mx-4 mb-4 h-[66px] border-0 rounded-xl overflow-hidden"
					loading="lazy"
				></iframe>
			{:else}
				<div class="px-4 py-3 flex items-center gap-3">
					<button
						class="w-14 h-14 rounded-full shrink-0 flex items-center justify-center text-white
						       transition hover:scale-105"
						style="background: linear-gradient(135deg, var(--sakura), var(--murasaki));
						       box-shadow: 0 4px 18px color-mix(in srgb, var(--sakura) 45%, transparent);"
						aria-label={playing ? "暂停" : "播放"}
						onclick={toggle}
					>
						{#if playing}
							<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
						{:else}
							<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 ml-0.5"><path d="M8 5v14l11-7z" /></svg>
						{/if}
					</button>
					<div class="flex-1 min-w-0">
						<div class="text-sm font-bold text-90 truncate">
							{playlist[index]?.title ?? "-"}
						</div>
						<div class="text-xs text-50 truncate">{playlist[index]?.artist ?? ""}</div>
						<div class="flex items-center gap-2 mt-1.5">
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
					</div>
				</div>

				<div class="flex items-center justify-center gap-6 pb-2">
					<button class="text-75 hover:text-[var(--sakura)]" aria-label="上一首" onclick={prev}>
						<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M6 6h2v12H6zm3.5 6l8.5-6v12z" /></svg>
					</button>
					<label class="flex items-center gap-1 text-xs text-50">
						<span aria-hidden="true">Vol.</span>
						<input
							type="range"
							min="0"
							max="100"
							value={volume * 100}
							class="w-20 accent-[var(--sakura)] h-1"
							aria-label="音量"
							oninput={(e) => (volume = Number(e.currentTarget.value) / 100)}
						/>
					</label>
					<button class="text-75 hover:text-[var(--sakura)]" aria-label="下一首" onclick={next}>
						<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M16 6h2v12h-2zM6 6l8.5 6L6 18z" /></svg>
					</button>
				</div>

				<div class="max-h-40 overflow-y-auto border-t border-[var(--stroke-glass)] py-1">
					{#each playlist as track, i (track.file)}
						<button
							class="w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition
							{i === index ? 'text-[var(--sakura)] bg-[var(--btn-regular-bg)]' : 'text-75 hover:bg-[var(--btn-plain-bg-hover)]'}"
							onclick={() => select(i)}
						>
							<span class="text-xs w-4 text-center tabular-nums">{i + 1}</span>
							<span class="flex-1 truncate">{track.title}</span>
							<span class="text-[10px] text-50 truncate max-w-[45%]">{track.artist}</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	{#if !neteaseMode}
		<audio
			bind:this={audioEl}
			src={playlist[index]?.file}
			onplay={onPlay}
			onpause={onPause}
			onended={next}
			ontimeupdate={onTimeUpdate}
			preload="none"
		></audio>
	{/if}
</div>
{/if}

<style>
	.spinning > span {
		animation: spin 3.2s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.netease-logo {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background:
			radial-gradient(circle at center, var(--sakura) 0 30%, transparent 32%),
			conic-gradient(from 90deg, var(--sakura), var(--murasaki), var(--sakura));
		-webkit-mask: radial-gradient(circle, transparent 26%, black 30%);
		mask: radial-gradient(circle, transparent 26%, black 30%);
	}
	@media (prefers-reduced-motion: reduce) {
		.spinning > span {
			animation: none;
		}
	}
	button {
		cursor: pointer;
		font-family: inherit;
		background: var(--bg-glass);
	}
</style>
