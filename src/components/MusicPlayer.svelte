<script lang="ts">
	/**
	 * 音乐播放器（docs/03 P1-3）：右下角玻璃胶囊，
	 * Web Audio AnalyserNode 低频能量 → window.__fxManager 驱动背景光晕律动。
	 */
	import { onDestroy } from "svelte";

	interface Track {
		file: string;
		title: string;
		artist?: string;
	}

	let {
		playlist = [],
		defaultVolume = 0.6,
	}: { playlist?: Track[]; defaultVolume?: number } = $props();

	let open = $state(false);
	let index = $state(0);
	let playing = $state(false);
	let volume = $state(defaultVolume);
	let progress = $state(0);

	let audioEl: HTMLAudioElement | undefined = $state();
	let audioCtx: AudioContext | null = null;
	let analyser: AnalyserNode | null = null;
	let sourceCreated = false;
	let rafId = 0;

	$effect(() => {
		const saved = Number(localStorage.getItem("fx-music-volume"));
		if (!Number.isNaN(saved) && saved > 0) volume = saved;
		const savedIdx = Number(localStorage.getItem("fx-music-last"));
		if (!Number.isNaN(savedIdx) && savedIdx >= 0 && savedIdx < playlist.length)
			index = savedIdx;
	});

	$effect(() => {
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
		if (audioEl && audioEl.duration)
			progress = audioEl.currentTime / audioEl.duration;
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
	let currentTime = $state(0);
	let duration = $state(0);
</script>

{#if playlist.length}
	<!-- 收起态：旋转唱片胶囊 -->
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
			class="fixed z-[80] right-4 bottom-20 w-80 max-w-[calc(100vw-2rem)] glass-panel overflow-hidden"
			role="dialog"
			aria-label="播放列表"
		>
			<div class="flex items-center gap-1 px-4 h-11 border-b border-[var(--stroke-glass)]">
				<span class="text-sm font-bold text-75 flex-1">🎵 樱雾电台</span>
				<button class="text-50 hover:text-[var(--sakura)] text-lg leading-none" aria-label="关闭" onclick={() => (open = false)}>×</button>
			</div>

			<div class="px-4 py-3 flex items-center gap-3">
				<button
					class="w-14 h-14 rounded-full shrink-0 flex items-center justify-center text-white text-xl
					       transition hover:scale-105"
					style="background: linear-gradient(135deg, var(--sakura), var(--murasaki));
					       box-shadow: 0 4px 18px color-mix(in srgb, var(--sakura) 45%, transparent);"
					aria-label={playing ? "暂停" : "播放"}
					onclick={toggle}
				>
					{playing ? "⏸" : "▶"}
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
				<button class="text-75 hover:text-[var(--sakura)] text-lg" aria-label="上一首" onclick={prev}>⏮</button>
				<label class="flex items-center gap-1 text-xs text-50">
					🔈
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
				<button class="text-75 hover:text-[var(--sakura)] text-lg" aria-label="下一首" onclick={next}>⏭</button>
			</div>

			<div class="max-h-40 overflow-y-auto border-t border-[var(--stroke-glass)] py-1">
				{#each playlist as track, i (track.file)}
					<button
						class="w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition
						{i === index ? 'text-[var(--sakura)] bg-[var(--btn-regular-bg)]' : 'text-75 hover:bg-[var(--btn-plain-bg-hover)]'}"
						onclick={() => select(i)}
					>
						<span class="text-xs">{i === index && playing ? "🎶" : "🌸"}</span>
						<span class="flex-1 truncate">{track.title}</span>
						<span class="text-[10px] text-50 truncate max-w-[45%]">{track.artist}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<audio
		bind:this={audioEl}
		src={playlist[index]?.file}
		onplay={onPlay}
		onpause={onPause}
		onended={next}
		ontimeupdate={onTimeUpdate}
		ondurationchange={() => (duration = audioEl?.duration ?? 0)}
		preload="none"
	></audio>
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
