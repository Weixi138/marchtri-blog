/**
 * FX 初始化：Layout.astro 挂载 canvas 后调用一次。
 * 暴露 window.__fx* 供音乐播放器写入音频能量、命令面板开关特效。
 */

import { createClickBurstLayer } from "./layers/click-burst";
import { createSakuraLayer } from "./layers/sakura";
import { createSkyLayer } from "./layers/sky";
import { FXManager, fxState } from "./manager";
import type { SceneState } from "./weather";
import {
	fetchScene,
	periodFromDate,
	seasonFromDate,
	solarTermFromDate,
} from "./weather";

export interface FXOptions {
	sakura: boolean;
	clickBurst: boolean;
	weatherBg: boolean;
}

/** 低内存 / 省流量降级（docs/02 降级矩阵） */
function isLowEndDevice(): boolean {
	if (typeof navigator === "undefined") return false;
	const mem = (navigator as { deviceMemory?: number }).deviceMemory;
	if (typeof mem === "number" && mem <= 4) return true;
	const conn = (navigator as { connection?: { saveData?: boolean } })
		.connection;
	if (conn?.saveData) return true;
	return false;
}

export function initFX(opts: FXOptions): () => void {
	if (typeof window === "undefined") return () => {};
	if (window.__fxManager) return () => {}; // 幂等

	const canvas = document.getElementById("fx-canvas");
	if (!(canvas instanceof HTMLCanvasElement)) return () => {};

	// 低内存降级：关闭粒子特效，只保留渐变底色
	const lowEnd = isLowEndDevice();
	const effectiveOpts = lowEnd
		? { ...opts, sakura: false, clickBurst: false, weatherBg: false }
		: opts;

	const manager = new FXManager(canvas);
	window.__fxManager = manager;

	const sky = createSkyLayer();
	manager.add(sky);

	const sakuraState = { enabled: effectiveOpts.sakura };
	window.__fxSakura = sakuraState;
	manager.add(createSakuraLayer(sakuraState)); // 始终注册，enabled 控制显隐

	const burst = createClickBurstLayer();
	manager.add(burst);
	const burstState = { enabled: effectiveOpts.clickBurst };
	window.__fxBurst = burstState;
	const onPointerDown = (e: PointerEvent) => {
		// 输入控件内点击不撒花，避免干扰表单交互
		const target = e.target as HTMLElement | null;
		if (target?.closest("input, textarea, select, [contenteditable]")) return;
		if (!burstState.enabled) return;
		burst.spawn(e.clientX, e.clientY);
	};
	window.addEventListener("pointerdown", onPointerDown, { passive: true });

	manager.start();

	// ---- 天气场景 + 底部徽标 + 开关（供命令面板调用） ----
	const badge = document.getElementById("weather-badge");
	let weatherOn = effectiveOpts.weatherBg;
	let lastScene: SceneState | null = null;
	let lastPeriod = periodFromDate(new Date());

	// 季节属性先行：CSS 季节 token（banner/光晕）与四季粒子都不依赖天气请求
	const season0 = seasonFromDate(new Date());
	document.documentElement.dataset.season = season0;
	fxState.season = season0;
	fxState.night = periodFromDate(new Date()) === "night";

	const applyScene = (scene: SceneState): void => {
		sky.setScene(scene);
		document.documentElement.dataset.season = scene.season;
		fxState.season = scene.season;
		fxState.night = scene.period === "night";
		if (badge) {
			if (weatherOn && scene.label) {
				badge.textContent = scene.label;
				badge.classList.remove("opacity-0");
			} else {
				badge.classList.add("opacity-0");
			}
		}
	};

	const refresh = (): Promise<void> =>
		fetchScene(weatherOn)
			.then((scene) => {
				lastScene = scene;
				applyScene(scene);
			})
			.catch(() => {});

	refresh();

	// 单轮询 + 三重门控：前台可见 && （天气开启 || 跨越时段边界）。
	// 天气数据另有 30 分钟 localStorage 缓存，命中时不产生网络请求。
	const pollTimer = setInterval(
		() => {
			if (document.hidden) return;
			const nowPeriod = periodFromDate(new Date());
			const crossed = nowPeriod !== lastPeriod;
			if (crossed) lastPeriod = nowPeriod;
			if (!weatherOn && !crossed) return;
			void refresh();
		},
		10 * 60 * 1000,
	);

	window.__fxSetWeather = () => {
		weatherOn = !weatherOn;
		if (!weatherOn) {
			// 关闭天气：回到纯时间模式的晴朗场景
			const now = new Date();
			const period = periodFromDate(now);
			lastPeriod = period;
			applyScene({
				period,
				precip: "clear",
				label: "",
				season: seasonFromDate(now),
				solarTerm: solarTermFromDate(now),
			});
		} else {
			if (lastScene) applyScene(lastScene);
			void refresh();
		}
	};

	return () => {
		clearInterval(pollTimer);
		window.removeEventListener("pointerdown", onPointerDown);
		manager.destroy();
		window.__fxManager = undefined;
	};
}
