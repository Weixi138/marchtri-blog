/**
 * Hero 打字机：循环轮播 heroConfig.typewriterLines。
 * swup 会替换 #swup-container 内容但模块脚本只执行一次，
 * 因此通过 swup page:view 钩子在返回首页时重新绑定。
 */
import { heroConfig } from "../config";

function bindTypewriter(): void {
	const el = document.getElementById("typewriter-text");
	if (!el) return;
	if (el.dataset.bound === "1") return;
	el.dataset.bound = "1";

	const cursor = document.getElementById("typewriter-cursor");
	const lines = heroConfig.typewriterLines;
	if (!lines.length) return;

	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		el.textContent = lines[0];
		if (cursor) cursor.style.display = "none";
		return;
	}

	let li = 0;
	let ci = 0;
	let deleting = false;
	let timer = 0;

	const step = (): void => {
		const line = lines[li];
		if (!deleting) {
			ci += 1;
			el.textContent = line.slice(0, ci);
			if (ci >= line.length) {
				deleting = true;
				timer = window.setTimeout(step, 2400); // 完整句停顿
				return;
			}
			timer = window.setTimeout(step, 95);
		} else {
			ci -= 1;
			el.textContent = line.slice(0, ci);
			if (ci <= 0) {
				deleting = false;
				li = (li + 1) % lines.length;
			}
			timer = window.setTimeout(step, 45);
		}
	};
	step();

	// swup 换页时清掉遗留定时器
	window.swup?.hooks.on("visit:start", () => {
		window.clearTimeout(timer);
		el.dataset.bound = "";
	});
}

bindTypewriter();

const setup = (): void => {
	window.swup?.hooks.on("page:view", bindTypewriter);
};
if (window.swup?.hooks) {
	setup();
} else {
	document.addEventListener("swup:enable", setup);
}
