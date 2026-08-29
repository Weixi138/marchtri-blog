/**
 * 点击绽放粒子：每次点击迸出樱花瓣 + 星点（≤ 12 粒，节流 200ms）。
 */
import type { FXLayer } from "../manager";

interface BurstParticle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number; // 剩余寿命 0..1
	size: number;
	kind: "petal" | "dot";
	color: string;
	spin: number;
	angle: number;
}

const DOT_COLORS = [
	"rgba(236,111,159,0.9)",
	"rgba(159,127,240,0.85)",
	"rgba(245,167,108,0.85)",
	"rgba(255,255,255,0.95)",
];
const PETAL_COLORS = [
	"rgba(244,167,197,0.95)",
	"rgba(252,214,229,0.95)",
	"rgba(189,166,255,0.75)",
];

export function createClickBurstLayer(): FXLayer & {
	spawn: (x: number, y: number) => void;
} {
	const particles: BurstParticle[] = [];
	let lastSpawn = 0;

	function spawn(x: number, y: number): void {
		const now = performance.now();
		if (now - lastSpawn < 200) return; // docs/03 节流
		lastSpawn = now;
		const n = 8 + Math.floor(Math.random() * 5);
		for (let i = 0; i < n; i++) {
			const angle = Math.random() * Math.PI * 2;
			const speed = 60 + Math.random() * 160;
			const kind: BurstParticle["kind"] =
				Math.random() < 0.45 ? "petal" : "dot";
			particles.push({
				x,
				y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed - 60,
				life: 1,
				size: kind === "petal" ? 3.5 + Math.random() * 3 : 1.5 + Math.random() * 2,
				kind,
				color:
					kind === "petal"
						? PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)]
						: DOT_COLORS[Math.floor(Math.random() * DOT_COLORS.length)],
				spin: (Math.random() - 0.5) * 8,
				angle: Math.random() * Math.PI * 2,
			});
		}
		// 总量上限，防止狂点堆积
		while (particles.length > 120) particles.shift();
	}

	return {
		name: "click-burst",
		tick(dt, _t, ctx) {
			for (let i = particles.length - 1; i >= 0; i--) {
				const p = particles[i];
				p.life -= dt * 1.4;
				if (p.life <= 0) {
					particles.splice(i, 1);
					continue;
				}
				p.vy += 320 * dt; // 重力
				p.vx *= 1 - 1.2 * dt; // 空气阻力
				p.vy *= 1 - 0.6 * dt;
				p.x += p.vx * dt;
				p.y += p.vy * dt;
				p.angle += p.spin * dt;

				ctx.save();
				ctx.globalAlpha = Math.min(1, p.life * 1.6);
				ctx.translate(p.x, p.y);
				if (p.kind === "petal") {
					ctx.rotate(p.angle);
					ctx.fillStyle = p.color;
					ctx.beginPath();
					ctx.moveTo(0, -p.size * 1.6);
					ctx.bezierCurveTo(
						p.size * 1.4, -p.size,
						p.size * 1.1, p.size,
						0, p.size * 1.6,
					);
					ctx.bezierCurveTo(
						-p.size * 1.1, p.size,
						-p.size * 1.4, -p.size,
						0, -p.size * 1.6,
					);
					ctx.fill();
				} else {
					ctx.fillStyle = p.color;
					ctx.beginPath();
					ctx.arc(0, 0, p.size, 0, Math.PI * 2);
					ctx.fill();
				}
				ctx.restore();
			}
		},
		spawn,
	};
}
