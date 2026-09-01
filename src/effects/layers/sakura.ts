/**
 * 四季粒子层：春樱瓣 / 夏夜萤火（白天为淡青光斑）/ 秋枫叶 / 冬细雪。
 * 季节与昼夜来自 fxState（init.ts 写入），切换时重播种；移动端减半。
 */
import type { FXLayer } from "../manager";
import { fxState } from "../manager";
import type { Season } from "../weather";

interface Particle {
	x: number;
	y: number;
	size: number;
	angle: number;
	spin: number;
	/** 垂直速度：正=下落，负=上浮 */
	speed: number;
	sway: number;
	phase: number;
	drift: number;
	color: string;
}

type Mode = "petal" | "firefly" | "mote" | "maple" | "snow";

const PALETTES: Record<string, string[]> = {
	petalLight: [
		"rgba(236, 140, 180, 0.9)",
		"rgba(228, 118, 165, 0.82)",
		"rgba(250, 198, 220, 0.95)",
		"rgba(160, 130, 245, 0.55)",
	],
	petalDark: [
		"rgba(248, 178, 210, 0.75)",
		"rgba(244, 165, 197, 0.66)",
		"rgba(226, 200, 255, 0.6)",
		"rgba(189, 166, 255, 0.5)",
	],
	fireflyLight: [
		"rgba(255, 216, 122, 0.95)",
		"rgba(255, 232, 160, 0.9)",
		"rgba(214, 240, 150, 0.8)",
	],
	fireflyDark: [
		"rgba(255, 224, 138, 0.95)",
		"rgba(255, 240, 178, 0.9)",
		"rgba(226, 246, 168, 0.85)",
	],
	moteLight: [
		"rgba(120, 210, 196, 0.5)",
		"rgba(160, 226, 214, 0.42)",
		"rgba(110, 186, 200, 0.4)",
	],
	moteDark: [
		"rgba(127, 208, 196, 0.55)",
		"rgba(160, 226, 214, 0.45)",
		"rgba(140, 190, 230, 0.4)",
	],
	mapleLight: [
		"rgba(240, 148, 74, 0.92)",
		"rgba(222, 98, 58, 0.88)",
		"rgba(250, 188, 88, 0.92)",
		"rgba(186, 76, 56, 0.75)",
	],
	mapleDark: [
		"rgba(255, 178, 108, 0.82)",
		"rgba(240, 128, 88, 0.72)",
		"rgba(255, 206, 120, 0.78)",
		"rgba(214, 110, 82, 0.62)",
	],
	snowLight: [
		"rgba(255, 255, 255, 0.92)",
		"rgba(238, 244, 255, 0.78)",
		"rgba(224, 234, 252, 0.66)",
	],
	snowDark: [
		"rgba(235, 240, 255, 0.85)",
		"rgba(214, 224, 250, 0.68)",
		"rgba(240, 244, 255, 0.75)",
	],
};

function modeOf(season: Season, night: boolean): Mode {
	if (season === "spring") return "petal";
	if (season === "autumn") return "maple";
	if (season === "winter") return "snow";
	return night ? "firefly" : "mote";
}

function drawPetal(ctx: CanvasRenderingContext2D, size: number): void {
	ctx.beginPath();
	ctx.moveTo(0, -size);
	ctx.bezierCurveTo(size * 0.9, -size * 0.6, size * 0.7, size * 0.7, 0, size);
	ctx.bezierCurveTo(
		-size * 0.7,
		size * 0.7,
		-size * 0.9,
		-size * 0.6,
		0,
		-size,
	);
	ctx.fill();
}

function drawMaple(ctx: CanvasRenderingContext2D, size: number): void {
	const spikes = 5;
	const inner = size * 0.42;
	ctx.beginPath();
	for (let k = 0; k < spikes * 2; k++) {
		const r = k % 2 === 0 ? size : inner;
		const a = (k / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
		const x = Math.cos(a) * r;
		const y = Math.sin(a) * r;
		if (k === 0) {
			ctx.moveTo(x, y);
		} else {
			const midA = a - Math.PI / spikes;
			ctx.quadraticCurveTo(
				Math.cos(midA) * inner * 0.72,
				Math.sin(midA) * inner * 0.72,
				x,
				y,
			);
		}
	}
	ctx.closePath();
	ctx.fill();
}

function make(mode: Mode, w: number, h: number, colors: string[]): Particle[] {
	const mobile = w < 768;
	const counts: Record<Mode, [number, number]> = {
		petal: [24, 14],
		firefly: [18, 10],
		mote: [16, 9],
		maple: [20, 12],
		snow: [30, 18],
	};
	const [desk, mob] = counts[mode];
	const count = mobile ? mob : desk;
	return Array.from({ length: count }, (_, i) => {
		const base: Particle = {
			x: Math.random() * w,
			y: Math.random() * h,
			size: 0,
			angle: Math.random() * Math.PI * 2,
			spin: 0,
			speed: 0,
			sway: 0,
			phase: Math.random() * Math.PI * 2,
			drift: 0,
			color: colors[i % colors.length],
		};
		switch (mode) {
			case "petal":
				base.size = 5 + Math.random() * 5.5;
				base.spin = (Math.random() - 0.5) * 1.6;
				base.speed = 26 + Math.random() * 34;
				base.sway = 18 + Math.random() * 28;
				break;
			case "firefly":
				base.size = 1.6 + Math.random() * 1.8;
				base.speed = -(6 + Math.random() * 10);
				base.sway = 10 + Math.random() * 16;
				break;
			case "mote":
				base.size = 1.4 + Math.random() * 2.2;
				base.speed = -(2 + Math.random() * 4);
				base.drift = (Math.random() - 0.5) * 16;
				break;
			case "maple":
				base.size = 7.5 + Math.random() * 6;
				base.spin = (Math.random() - 0.5) * 2.4;
				base.speed = 44 + Math.random() * 32;
				base.sway = 30 + Math.random() * 26;
				break;
			case "snow":
				base.size = 1.4 + Math.random() * 2.2;
				base.speed = 14 + Math.random() * 14;
				base.sway = 10 + Math.random() * 14;
				break;
		}
		return base;
	});
}

export function createSakuraLayer(
	state: { enabled: boolean } = { enabled: true },
): FXLayer {
	let particles: Particle[] = [];
	let mode: Mode = "petal";
	let lastW = -1;
	let lastSeason: Season = fxState.season;
	let lastNight = fxState.night;
	let lastDark = document.documentElement.classList.contains("dark");

	function paletteKey(): string {
		const dark = document.documentElement.classList.contains("dark");
		return mode + (dark ? "Dark" : "Light");
	}

	function seed(w: number, h: number): void {
		mode = modeOf(fxState.season, fxState.night);
		particles = make(mode, w, h, PALETTES[paletteKey()] ?? PALETTES.petalLight);
	}

	function maybeReseed(w: number, h: number): void {
		const dark = document.documentElement.classList.contains("dark");
		if (
			w !== lastW ||
			fxState.season !== lastSeason ||
			fxState.night !== lastNight ||
			dark !== lastDark
		) {
			lastW = w;
			lastSeason = fxState.season;
			lastNight = fxState.night;
			lastDark = dark;
			seed(w, h);
		}
	}

	return {
		name: "sakura",
		get visible() {
			return state.enabled;
		},
		tick(dt, t, ctx, w, h) {
			maybeReseed(w, h);
			const boost = 1 + fxState.audioEnergy * 0.8;
			for (const p of particles) {
				switch (mode) {
					case "petal":
					case "maple": {
						p.y += p.speed * boost * dt;
						p.angle += p.spin * dt;
						if (p.y > h + 16) {
							p.y = -16;
							p.x = Math.random() * w;
						}
						const x = p.x + Math.sin(t * 0.7 + p.phase) * p.sway;
						ctx.save();
						ctx.translate(x, p.y);
						const flip = 0.55 + 0.45 * Math.sin(t * 0.9 + p.phase * 1.3);
						ctx.scale(flip, 1);
						ctx.rotate(p.angle + Math.sin(t * 0.5 + p.phase) * 0.4);
						ctx.fillStyle = p.color;
						if (mode === "petal") drawPetal(ctx, p.size);
						else drawMaple(ctx, p.size);
						ctx.restore();
						break;
					}
					case "snow": {
						p.y += p.speed * dt;
						if (p.y > h + 6) {
							p.y = -6;
							p.x = Math.random() * w;
						}
						const x = p.x + Math.sin(t * 0.55 + p.phase) * p.sway;
						ctx.save();
						ctx.fillStyle = p.color;
						ctx.beginPath();
						ctx.arc(x, p.y, p.size, 0, Math.PI * 2);
						ctx.fill();
						ctx.restore();
						break;
					}
					case "firefly": {
						p.y += p.speed * dt;
						if (p.y < -12) {
							p.y = h + 12;
							p.x = Math.random() * w;
						}
						const x =
							p.x +
							Math.sin(t * 0.5 + p.phase) * p.sway +
							Math.sin(t * 1.7 + p.phase * 2.1) * 4;
						const pulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 1.9 + p.phase));
						ctx.save();
						ctx.globalAlpha = pulse * 0.35;
						ctx.fillStyle = p.color;
						ctx.beginPath();
						ctx.arc(x, p.y, p.size * 2.6, 0, Math.PI * 2);
						ctx.fill();
						ctx.globalAlpha = pulse;
						ctx.beginPath();
						ctx.arc(x, p.y, p.size, 0, Math.PI * 2);
						ctx.fill();
						ctx.restore();
						break;
					}
					case "mote": {
						p.x += p.drift * dt;
						p.y += p.speed * dt + Math.sin(t * 0.4 + p.phase) * 3 * dt;
						if (p.x > w + 8) p.x = -8;
						else if (p.x < -8) p.x = w + 8;
						if (p.y < -8) p.y = h + 8;
						else if (p.y > h + 8) p.y = -8;
						const tw = 0.55 + 0.45 * Math.sin(t * 0.8 + p.phase);
						ctx.save();
						ctx.globalAlpha = tw;
						ctx.fillStyle = p.color;
						ctx.beginPath();
						ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
						ctx.fill();
						ctx.restore();
						break;
					}
				}
			}
		},
		staticFrame(ctx, w, h) {
			maybeReseed(w, h);
			for (const p of particles) {
				ctx.save();
				ctx.translate(p.x, p.y);
				ctx.rotate(p.angle);
				ctx.fillStyle = p.color;
				if (mode === "petal") drawPetal(ctx, p.size);
				else if (mode === "maple") drawMaple(ctx, p.size);
				else {
					ctx.beginPath();
					ctx.arc(0, 0, p.size * (mode === "firefly" ? 2 : 1), 0, Math.PI * 2);
					ctx.fill();
				}
				ctx.restore();
			}
		},
	};
}
