/**
 * 樱花飘落层：≤ 24 朵（移动端减半），微风摆动，随音频能量轻微加速。
 */
import type { FXLayer } from "../manager";
import { fxState } from "../manager";

interface Petal {
	x: number;
	y: number;
	size: number;
	angle: number;
	spin: number;
	speed: number;
	sway: number;
	phase: number;
	color: string;
}

const LIGHT_COLORS = [
	"rgba(236, 140, 180, 0.9)",
	"rgba(228, 118, 165, 0.82)",
	"rgba(250, 198, 220, 0.95)",
	"rgba(160, 130, 245, 0.55)", // 偶尔一片淡紫
];
const DARK_COLORS = [
	"rgba(248, 178, 210, 0.75)",
	"rgba(244, 165, 197, 0.66)",
	"rgba(226, 200, 255, 0.6)",
	"rgba(189, 166, 255, 0.5)",
];

function drawPetal(
	ctx: CanvasRenderingContext2D,
	size: number,
): void {
	ctx.beginPath();
	ctx.moveTo(0, -size);
	ctx.bezierCurveTo(size * 0.9, -size * 0.6, size * 0.7, size * 0.7, 0, size);
	ctx.bezierCurveTo(-size * 0.7, size * 0.7, -size * 0.9, -size * 0.6, 0, -size);
	ctx.fill();
}

export function createSakuraLayer(
	state: { enabled: boolean } = { enabled: true },
): FXLayer {
	let petals: Petal[] = [];
	let lastW = -1;

	function seed(w: number, h: number): void {
		const count = w < 768 ? 18 : 32;
		const colors =
			document.documentElement.classList.contains("dark")
				? DARK_COLORS
				: LIGHT_COLORS;
		petals = Array.from({ length: count }, (_, i) => ({
			x: Math.random() * w,
			y: Math.random() * h,
			size: 5 + Math.random() * 5.5,
			angle: Math.random() * Math.PI * 2,
			spin: (Math.random() - 0.5) * 1.6,
			speed: 26 + Math.random() * 34,
			sway: 18 + Math.random() * 28,
			phase: Math.random() * Math.PI * 2,
			color: colors[i % colors.length],
		}));
	}

	return {
		name: "sakura",
		get visible() {
			return state.enabled;
		},
		tick(dt, t, ctx, w, h) {
			if (w !== lastW) {
				lastW = w;
				seed(w, h);
			}
			const boost = 1 + fxState.audioEnergy * 0.8;
			for (const p of petals) {
				p.y += p.speed * boost * dt;
				p.angle += p.spin * dt;
				if (p.y > h + 14) {
					p.y = -14;
					p.x = Math.random() * w;
				}
				const x = p.x + Math.sin(t * 0.7 + p.phase) * p.sway;
				ctx.save();
				ctx.translate(x, p.y);
				// 微透视：横向压缩 + 摆动，模拟花瓣翻转
				const flip = 0.55 + 0.45 * Math.sin(t * 0.9 + p.phase * 1.3);
				ctx.scale(flip, 1);
				ctx.rotate(p.angle + Math.sin(t * 0.5 + p.phase) * 0.4);
				ctx.fillStyle = p.color;
				drawPetal(ctx, p.size);
				ctx.restore();
			}
		},
		staticFrame(ctx, w, h) {
			if (w !== lastW) {
				lastW = w;
				seed(w, h);
			}
			for (const p of petals) {
				ctx.save();
				ctx.translate(p.x, p.y);
				ctx.rotate(p.angle);
				ctx.fillStyle = p.color;
				drawPetal(ctx, p.size);
				ctx.restore();
			}
		},
	};
}
