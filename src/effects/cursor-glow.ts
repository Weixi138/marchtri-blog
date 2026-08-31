/**
 * 鼠标跟随光晕 + 点击涟漪（桌面端 only，移动端跳过）。
 * 光晕用 rAF 插值跟随；涟漪由 animationend 自毁。
 */
export function initCursorGlow(): void {
	if (typeof window === "undefined") return;
	if (window.matchMedia("(pointer: coarse)").matches) return;
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
	if (document.getElementById("fx-cursor-glow")) return;

	const glow = document.createElement("div");
	glow.id = "fx-cursor-glow";
	glow.setAttribute("aria-hidden", "true");
	document.body.appendChild(glow);

	let tx = window.innerWidth / 2;
	let ty = window.innerHeight / 3;
	let x = tx;
	let y = ty;
	let raf = 0;

	const loop = (): void => {
		x += (tx - x) * 0.14;
		y += (ty - y) * 0.14;
		glow.style.transform = `translate(${x - 160}px, ${y - 160}px)`;
		if (Math.abs(tx - x) > 0.4 || Math.abs(ty - y) > 0.4) {
			raf = requestAnimationFrame(loop);
		} else {
			raf = 0;
		}
	};

	window.addEventListener(
		"pointermove",
		(e) => {
			tx = e.clientX;
			ty = e.clientY;
			glow.classList.add("active");
			if (!raf) raf = requestAnimationFrame(loop);
		},
		{ passive: true },
	);

	window.addEventListener(
		"pointerdown",
		(e) => {
			const ring = document.createElement("div");
			ring.className = "fx-ripple";
			ring.setAttribute("aria-hidden", "true");
			ring.style.left = `${e.clientX}px`;
			ring.style.top = `${e.clientY}px`;
			document.body.appendChild(ring);
			ring.addEventListener("animationend", () => ring.remove());
			setTimeout(() => ring.remove(), 800); // 兜底清理
		},
		{ passive: true },
	);
}

/** 标签页彩蛋：切走时换标题（纯文本颜文字，非 emoji） */
export function initTitleEasterEgg(): void {
	if (typeof window === "undefined") return;
	const original = document.title;
	document.addEventListener("visibilitychange", () => {
		document.title = document.hidden ? "(´･ω･`) 页面飞走了…" : original;
	});
}
