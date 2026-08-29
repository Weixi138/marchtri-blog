/**
 * FXManager — 全站唯一动画入口（docs/02）
 * 单 rAF 循环调度所有 canvas 层；页面切后台自动暂停；
 * prefers-reduced-motion 时只画一次静态帧。
 */
export interface FXLayer {
	name: string;
	/** false 时跳过 tick（供命令面板动态开关特效） */
	visible?: boolean;
	tick(
		dt: number,
		t: number,
		ctx: CanvasRenderingContext2D,
		w: number,
		h: number,
	): void;
	staticFrame?(ctx: CanvasRenderingContext2D, w: number, h: number): void;
}

/** 全局共享状态：图层只读，Manager 写入 */
export const fxState = { audioEnergy: 0 };

export class FXManager {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private layers: FXLayer[] = [];
	private rafId = 0;
	private lastT = 0;
	private running = false;
	private w = 0;
	private h = 0;
	private dpr = 1;
	reduced: boolean;
	audioEnergy = 0; // 0..1，由音乐播放器写入

	constructor(canvas: HTMLCanvasElement, opts?: { reduced?: boolean }) {
		this.canvas = canvas;
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("FXManager: canvas 2d context unavailable");
		this.ctx = ctx;
		this.reduced =
			opts?.reduced ??
			window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		this.resize();
		window.addEventListener("resize", () => this.resize());
		document.addEventListener("visibilitychange", () => {
			if (document.hidden) this.stop();
			else this.start();
		});
	}

	add(layer: FXLayer): void {
		this.layers.push(layer);
	}

	setAudioEnergy(v: number): void {
		this.audioEnergy = Math.max(0, Math.min(1, v));
		fxState.audioEnergy = this.audioEnergy;
	}

	private resize(): void {
		const isCoarse = window.matchMedia("(pointer: coarse)").matches;
		this.dpr = Math.min(
			window.devicePixelRatio || 1,
			isCoarse ? 1.5 : 2,
		);
		this.w = window.innerWidth;
		this.h = window.innerHeight;
		this.canvas.width = Math.floor(this.w * this.dpr);
		this.canvas.height = Math.floor(this.h * this.dpr);
		this.canvas.style.width = `${this.w}px`;
		this.canvas.style.height = `${this.h}px`;
		this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
		if (this.reduced) this.drawStatic();
	}

	start(): void {
		if (this.reduced || this.running || this.layers.length === 0) return;
		this.running = true;
		this.lastT = performance.now();
		const loop = (t: number) => {
			if (!this.running) return;
			const dt = Math.min((t - this.lastT) / 1000, 0.05);
			this.lastT = t;
			this.tick(dt, t / 1000);
			this.rafId = requestAnimationFrame(loop);
		};
		this.rafId = requestAnimationFrame(loop);
	}

	stop(): void {
		this.running = false;
		if (this.rafId) cancelAnimationFrame(this.rafId);
	}

	private tick(dt: number, t: number): void {
		const { ctx, w, h } = this;
		ctx.clearRect(0, 0, w, h);
		for (const layer of this.layers) {
			if (layer.visible === false) continue;
			layer.tick(dt, t, ctx, w, h);
		}
	}

	/** reduced-motion 或降级时：各层画一帧静态画面 */
	drawStatic(): void {
		const { ctx, w, h } = this;
		ctx.clearRect(0, 0, w, h);
		for (const layer of this.layers) {
			layer.staticFrame?.(ctx, w, h);
		}
	}

	destroy(): void {
		this.stop();
		this.layers = [];
	}
}
