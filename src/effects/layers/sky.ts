/**
 * Sky 层：昼夜渐变底色 + 太阳/月亮光晕 + 星星 + 天气粒子（雨/雪/雾/云/雷）
 * 是 dynamic-bg 的实现体，颜色遵循 docs/01，性能预算遵循 docs/02。
 */
import type { FXLayer } from "../manager";
import { fxState } from "../manager";
import type { SceneState, Season, SkyPeriod } from "../weather";
import { periodFromDate, seasonFromDate, solarTermFromDate } from "../weather";

type RGB = [number, number, number];
type Palette = { top: RGB; mid: RGB; bottom: RGB };

/** 天空色板：light/dark 主题各自成套，保证与卡片玻璃层协调 */
const LIGHT: Record<SkyPeriod, Palette> = {
	dawn: { top: [249, 213, 221], mid: [253, 238, 222], bottom: [205, 180, 244] },
	day: { top: [207, 234, 246], mid: [253, 241, 245], bottom: [232, 246, 240] },
	dusk: { top: [242, 180, 140], mid: [211, 139, 192], bottom: [107, 87, 158] },
	night: {
		top: [236, 232, 246],
		mid: [214, 205, 236],
		bottom: [186, 173, 220],
	}, // 浅色主题的夜晚 = 柔和暮色
};
const DARK: Record<SkyPeriod, Palette> = {
	dawn: { top: [42, 32, 56], mid: [74, 52, 72], bottom: [120, 78, 96] },
	day: { top: [30, 40, 66], mid: [52, 46, 82], bottom: [76, 58, 104] },
	dusk: { top: [38, 26, 52], mid: [84, 50, 82], bottom: [140, 84, 104] },
	night: { top: [17, 14, 30], mid: [34, 27, 58], bottom: [54, 42, 88] },
};

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpRGB = (a: RGB, b: RGB, k: number): RGB => [
	lerp(a[0], b[0], k),
	lerp(a[1], b[1], k),
	lerp(a[2], b[2], k),
];
const rgb = (c: RGB, alpha = 1) =>
	`rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha})`;

/** 季节签名色：春樱粉 / 夏青碧 / 秋暖橙 / 冬蓝紫 */
const SEASON_TINT: Record<Season, RGB> = {
	spring: [247, 139, 184],
	summer: [110, 198, 188],
	autumn: [240, 168, 120],
	winter: [143, 154, 232],
};

const TINT_K = 0.16; // 混入比例：四季差异肉眼可辨，仍不抢品牌基调
function mixPalette(p: Palette, season: Season): Palette {
	const t = SEASON_TINT[season];
	const mix = (c: RGB): RGB => [
		lerp(c[0], t[0], TINT_K),
		lerp(c[1], t[1], TINT_K),
		lerp(c[2], t[2], TINT_K),
	];
	return { top: mix(p.top), mid: mix(p.mid), bottom: mix(p.bottom) };
}

interface Star {
	x: number;
	y: number;
	r: number;
	phase: number;
}
interface RainDrop {
	x: number;
	y: number;
	len: number;
	speed: number;
	drift: number;
}
interface SnowFlake {
	x: number;
	y: number;
	r: number;
	speed: number;
	sway: number;
	phase: number;
}
interface CloudBlob {
	x: number;
	y: number;
	rx: number;
	ry: number;
	speed: number;
	alpha: number;
}

export function createSkyLayer(): FXLayer & { setScene(s: SceneState): void } {
	const now0 = new Date();
	let scene: SceneState = {
		period: periodFromDate(now0),
		precip: "clear",
		label: "",
		season: seasonFromDate(now0),
		solarTerm: solarTermFromDate(now0),
	};
	let lastW = -1;

	// 平滑过渡用的当前/目标色板
	let cur: Palette;
	let target!: Palette;
	let paletteT = 1; // 0→1 过渡进度

	// 星 / 雨 / 雪 / 云 池
	let stars: Star[] = [];
	let rain: RainDrop[] = [];
	let snow: SnowFlake[] = [];
	let clouds: CloudBlob[] = [];
	let fogPhase = 0;
	let flashAlpha = 0;
	let nextFlash = 5;

	// 主题标志缓存：classList 每帧读取开销大，改由 MutationObserver 驱动
	let darkTheme = document.documentElement.classList.contains("dark");

	function isDarkTheme(): boolean {
		return darkTheme;
	}

	function seedParticles(w: number, h: number): void {
		const k = w < 768 ? 0.5 : 1; // 移动端密度减半（docs/02 降级矩阵）
		stars = Array.from({ length: Math.floor(70 * k) }, () => ({
			x: Math.random() * w,
			y: Math.random() * h * 0.65,
			r: 0.4 + Math.random() * 1.1,
			phase: Math.random() * Math.PI * 2,
		}));
		const rainN = scene.precip === "storm" ? 130 : 70;
		rain = Array.from({ length: Math.floor(rainN * k) }, () => ({
			x: Math.random() * w,
			y: Math.random() * h,
			len: 9 + Math.random() * 14,
			speed: 420 + Math.random() * 260,
			drift: -40 - Math.random() * 30,
		}));
		snow = Array.from({ length: Math.floor(55 * k) }, () => ({
			x: Math.random() * w,
			y: Math.random() * h,
			r: 1 + Math.random() * 2.2,
			speed: 26 + Math.random() * 30,
			sway: 14 + Math.random() * 18,
			phase: Math.random() * Math.PI * 2,
		}));
		clouds = Array.from({ length: Math.floor(5 * k) + 2 }, () => ({
			x: Math.random() * w,
			y: h * (0.08 + Math.random() * 0.4),
			rx: 130 + Math.random() * 180,
			ry: 26 + Math.random() * 30,
			speed: 6 + Math.random() * 8,
			alpha: 0.05 + Math.random() * 0.06,
		}));
	}

	function currentPalette(): Palette {
		const set = isDarkTheme() ? DARK : LIGHT;
		return mixPalette(set[scene.period], scene.season);
	}

	function retarget(): void {
		target = currentPalette();
	}

	retarget();
	cur = target;

	// 主题切换即时生效：监听 <html> 的 class，替代每帧 classList 读取
	new MutationObserver(() => {
		darkTheme = document.documentElement.classList.contains("dark");
		retarget();
	}).observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["class"],
	});

	// 太阳/月亮横坐标按小时缓慢移动，60s 缓存一次即可
	let hourFrac = 0;
	let hourCacheT = -1;

	function nightness(): number {
		if (scene.period === "night") return isDarkTheme() ? 1 : 0;
		if (scene.period === "dusk") return isDarkTheme() ? 0.4 : 0.1;
		return 0;
	}

	return {
		name: "sky",
		setScene(s: SceneState) {
			scene = s;
			retarget();
			paletteT = 0;
			// 粒子组随天气增删
			if (s.precip === "clear") rain = [];
			if (s.precip !== "snow") snow = [];
			if (s.precip !== "cloudy" && s.precip !== "fog") clouds = [];
			if (s.precip === "rain" || s.precip === "storm") {
				if (rain.length === 0 && lastW > 0)
					seedParticles(lastW, window.innerHeight);
			}
			if (s.precip === "snow" && snow.length === 0 && lastW > 0) {
				seedParticles(lastW, window.innerHeight);
			}
		},

		tick(dt, t, ctx, w, h) {
			if (w !== lastW) {
				lastW = w;
				seedParticles(w, h);
				retarget();
			}
			if (paletteT < 1) paletteT = Math.min(1, paletteT + dt / 2);
			const k = paletteT * paletteT * (3 - 2 * paletteT);
			cur = {
				top: lerpRGB(cur.top, target.top, k),
				mid: lerpRGB(cur.mid, target.mid, k),
				bottom: lerpRGB(cur.bottom, target.bottom, k),
			};

			// ---- 底色渐变 ----
			const grad = ctx.createLinearGradient(0, 0, 0, h);
			grad.addColorStop(0, rgb(cur.top));
			grad.addColorStop(0.55, rgb(cur.mid));
			grad.addColorStop(1, rgb(cur.bottom));
			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, w, h);

			// ---- 星星（夜）----
			const n = nightness();
			if (n > 0) {
				for (const s of stars) {
					const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.8 + s.phase));
					ctx.fillStyle = `rgba(255,244,250,${(0.7 * tw * n).toFixed(3)})`;
					ctx.beginPath();
					ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
					ctx.fill();
				}
			}

			// ---- 太阳/月亮光晕，音频能量放大呼吸 ----
			const energy = fxState.audioEnergy;
			if (hourCacheT < 0 || t - hourCacheT >= 60) {
				const now = new Date();
				hourFrac = (now.getHours() + now.getMinutes() / 60) / 24;
				hourCacheT = t;
			}
			const gx = w * (0.15 + hourFrac * 0.7);
			const gy = h * (scene.period === "night" ? 0.22 : 0.3);
			const baseR = Math.min(w, h) * (scene.period === "night" ? 0.16 : 0.22);
			const glowR = baseR + Math.sin(t * 0.6) * 6 + energy * baseR * 0.35;
			const glowColor =
				scene.period === "night"
					? "rgba(220,214,255,"
					: scene.period === "dusk" || scene.period === "dawn"
						? "rgba(255,196,150,"
						: "rgba(255,236,200,";
			const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, glowR);
			glow.addColorStop(0, `${glowColor}${0.5 + energy * 0.25})`);
			glow.addColorStop(1, `${glowColor}0)`);
			ctx.fillStyle = glow;
			ctx.fillRect(0, 0, w, h);

			// ---- 云 ----
			for (const c of clouds) {
				c.x += c.speed * dt;
				if (c.x - c.rx > w) c.x = -c.rx;
				ctx.save();
				ctx.translate(c.x, c.y);
				ctx.scale(1, c.ry / c.rx);
				const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, c.rx);
				cg.addColorStop(0, `rgba(255,255,255,${c.alpha})`);
				cg.addColorStop(1, "rgba(255,255,255,0)");
				ctx.fillStyle = cg;
				ctx.beginPath();
				ctx.arc(0, 0, c.rx, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			}

			// ---- 雾 ----
			if (scene.precip === "fog") {
				fogPhase += dt * 12;
				for (let i = 0; i < 3; i++) {
					const y = h * (0.25 + i * 0.25);
					const xoff = ((fogPhase * (i + 1)) % (w + 400)) - 200;
					const fg = ctx.createLinearGradient(xoff - 250, 0, xoff + 250, 0);
					fg.addColorStop(0, "rgba(255,255,255,0)");
					fg.addColorStop(0.5, `rgba(255,255,255,${0.1 - i * 0.02})`);
					fg.addColorStop(1, "rgba(255,255,255,0)");
					ctx.fillStyle = fg;
					ctx.fillRect(0, y, w, 90);
				}
			}

			// ---- 雨 ----
			if (scene.precip === "rain" || scene.precip === "storm") {
				ctx.strokeStyle = `rgba(190,205,240,${isDarkTheme() ? 0.35 : 0.4})`;
				ctx.lineWidth = 1;
				ctx.beginPath();
				for (const d of rain) {
					d.y += d.speed * dt;
					d.x += d.drift * dt;
					if (d.y > h + 20) {
						d.y = -20;
						d.x = Math.random() * (w + 100);
					}
					ctx.moveTo(d.x, d.y);
					ctx.lineTo(d.x + d.drift * 0.05 * d.len, d.y + d.len);
				}
				ctx.stroke();
			}

			// ---- 雷 ----
			if (scene.precip === "storm") {
				nextFlash -= dt;
				if (nextFlash <= 0) {
					flashAlpha = 0.55;
					nextFlash = 4 + Math.random() * 6;
				}
				if (flashAlpha > 0.01) {
					ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
					ctx.fillRect(0, 0, w, h);
					flashAlpha *= 0.86;
				}
			}

			// ---- 雪 ----
			if (scene.precip === "snow") {
				ctx.fillStyle = "rgba(255,255,255,0.8)";
				for (const f of snow) {
					f.y += f.speed * dt;
					const x = f.x + Math.sin(t + f.phase) * f.sway;
					if (f.y > h + 5) {
						f.y = -5;
						f.x = Math.random() * w;
					}
					ctx.beginPath();
					ctx.arc(x, f.y, f.r, 0, Math.PI * 2);
					ctx.fill();
				}
			}
		},

		staticFrame(ctx, w, h) {
			seedParticles(w, h);
			const set = isDarkTheme() ? DARK : LIGHT;
			const p = mixPalette(
				set[periodFromDate(new Date())],
				seasonFromDate(new Date()),
			);
			const grad = ctx.createLinearGradient(0, 0, 0, h);
			grad.addColorStop(0, rgb(p.top));
			grad.addColorStop(0.55, rgb(p.mid));
			grad.addColorStop(1, rgb(p.bottom));
			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, w, h);
			if (isDarkTheme()) {
				for (const s of stars) {
					ctx.fillStyle = "rgba(255,244,250,0.6)";
					ctx.beginPath();
					ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
					ctx.fill();
				}
			}
		},
	};
}
