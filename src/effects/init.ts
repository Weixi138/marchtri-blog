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

export function initFX(opts: FXOptions): void {
	if (typeof window === "undefined") return;
	if (window.__fxManager) return; // 幂等

	const canvas = document.getElementById("fx-canvas");
	if (!(canvas instanceof HTMLCanvasElement)) return;

	const manager = new FXManager(canvas);
	window.__fxManager = manager;

	const sky = createSkyLayer();
	manager.add(sky);

	const sakuraState = { enabled: opts.sakura };
	window.__fxSakura = sakuraState;
	manager.add(createSakuraLayer(sakuraState)); // 始终注册，enabled 控制显隐

	const burst = createClickBurstLayer();
	manager.add(burst);
	const burstState = { enabled: opts.clickBurst };
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
	let weatherOn = opts.weatherBg;
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
	if (opts.weatherBg) {
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
