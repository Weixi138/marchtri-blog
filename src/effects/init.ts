/**
 * FX 初始化：Layout.astro 挂载 canvas 后调用一次。
 * 暴露 window.__fx* 供音乐播放器写入音频能量、命令面板开关特效。
 */
import { FXManager } from "./manager";
import { createSkyLayer } from "./layers/sky";
import { createSakuraLayer } from "./layers/sakura";
import { createClickBurstLayer } from "./layers/click-burst";
import { fetchScene, periodFromDate } from "./weather";
import type { SceneState } from "./weather";

export interface FXOptions {
	sakura: boolean;
	clickBurst: boolean;
	weatherBg: boolean;
}

const REFRESH_MS = 30 * 60 * 1000;

/** 低内存 / 省流量降级（docs/02 降级矩阵） */
function isLowEndDevice(): boolean {
	if (typeof navigator === "undefined") return false;
	const mem = (navigator as { deviceMemory?: number }).deviceMemory;
	if (typeof mem === "number" && mem <= 4) return true;
	const conn = (navigator as { connection?: { saveData?: boolean } }).connection;
	if (conn?.saveData) return true;
	return false;
}

export function initFX(opts: FXOptions): void {
	if (typeof window === "undefined") return;
	if (window.__fxManager) return; // 幂等

	const canvas = document.getElementById("fx-canvas");
	if (!(canvas instanceof HTMLCanvasElement)) return;

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
	window.addEventListener(
		"pointerdown",
		(e) => {
			// 输入控件内点击不撒花，避免干扰表单交互
			const target = e.target as HTMLElement | null;
			if (
				target &&
				target.closest("input, textarea, select, [contenteditable]")
			)
				return;
			if (!burstState.enabled) return;
			burst.spawn(e.clientX, e.clientY);
		},
		{ passive: true },
	);

	manager.start();

	// ---- 天气场景 + 底部徽标 + 开关（供命令面板调用） ----
	const badge = document.getElementById("weather-badge");
	let weatherOn = effectiveOpts.weatherBg;
	let lastScene: SceneState | null = null;

	const applyScene = (scene: SceneState): void => {
		sky.setScene(scene);
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
	if (effectiveOpts.weatherBg) {
		setInterval(() => void refresh(), REFRESH_MS);
	}

	// 时段变化（跨越 dawn/day/dusk/night 边界）时刷新场景
	setInterval(() => void refresh(), 10 * 60 * 1000);

	window.__fxSetWeather = () => {
		weatherOn = !weatherOn;
		if (!weatherOn) {
			// 关闭天气：回到纯时间模式的晴朗场景
			const period = periodFromDate(new Date());
			applyScene({ period, precip: "clear", label: "" });
		} else {
			if (lastScene) applyScene(lastScene);
			void refresh();
		}
	};
}
