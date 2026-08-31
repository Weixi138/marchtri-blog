/**
 * 滚动入场编排：给 .reveal 元素加 .in-view（60ms 错落）。
 * 兼容 swup：每次 page:view 后重新观察新内容。
 */
export function initReveal(): void {
	if (typeof window === "undefined") return;
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		document.querySelectorAll(".reveal").forEach((el) => {
			el.classList.add("in-view");
		});
		// reduced-motion 下 CSS 已强制可见，这里只为兜底
	}

	const io = new IntersectionObserver(
		(entries) => {
			for (const e of entries) {
				if (e.isIntersecting) {
					e.target.classList.add("in-view");
					io.unobserve(e.target);
				}
			}
		},
		{ threshold: 0.08 },
	);

	const observeAll = (): void => {
		document
			.querySelectorAll<HTMLElement>(".reveal:not(.in-view)")
			.forEach((el, i) => {
				const delay = `${Math.min(i * 60, 360)}ms`;
				if (!el.style.getPropertyValue("--reveal-delay")) {
					el.style.setProperty("--reveal-delay", delay);
				}
				io.observe(el);
			});
	};

	observeAll();

	const setupSwup = (): void => {
		window.swup?.hooks.on("page:view", observeAll);
	};
	if (window.swup?.hooks) {
		setupSwup();
	} else {
		document.addEventListener("swup:enable", setupSwup);
	}
}
