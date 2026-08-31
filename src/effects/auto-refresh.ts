/**
 * 自动刷新检测新文章（docs/03 P1-8）：
 * 定期 fetch 首页，对比 Content-Length 变化；
 * 发现新内容时在右下角弹出提示条，点击即可刷新。
 */

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 分钟
const STORAGE_KEY = "fx-auto-refresh-last";

function createBanner(): HTMLElement {
	const el = document.createElement("div");
	el.id = "fx-refresh-banner";
	el.setAttribute("role", "status");
	el.setAttribute("aria-live", "polite");
	el.className =
		"fixed z-[85] right-4 bottom-20 glass-panel px-4 py-3 flex items-center gap-3 " +
		"transition-all duration-300 translate-x-full opacity-0";
	el.innerHTML = `
		<span class="text-sm text-90">发现新内容</span>
		<button id="fx-refresh-btn"
			class="text-xs px-3 py-1.5 rounded-full text-white transition hover:brightness-110 active:scale-95"
			style="background: linear-gradient(135deg, var(--sakura), var(--murasaki));">
			刷新
		</button>
		<button id="fx-refresh-close"
			class="text-50 hover:text-90 transition ml-1 text-lg leading-none"
			aria-label="关闭">&times;</button>
	`;
	document.body.appendChild(el);
	return el;
}

function showBanner(): void {
	const el = document.getElementById("fx-refresh-banner");
	if (!el) return;
	el.classList.remove("translate-x-full", "opacity-0");
	el.classList.add("translate-x-0", "opacity-100");
}

function hideBanner(): void {
	const el = document.getElementById("fx-refresh-banner");
	if (!el) return;
	el.classList.add("translate-x-full", "opacity-0");
	el.classList.remove("translate-x-0", "opacity-100");
}

async function checkForUpdates(): Promise<void> {
	try {
		const res = await fetch(window.location.href, {
			cache: "no-store",
			method: "HEAD",
		});
		const contentLength = res.headers.get("content-length") || "";
		const etag = res.headers.get("etag") || "";
		const fingerprint = `${contentLength}-${etag}`;

		const prev = sessionStorage.getItem(STORAGE_KEY);
		if (prev && prev !== fingerprint) {
			showBanner();
		}
		sessionStorage.setItem(STORAGE_KEY, fingerprint);
	} catch {
		// 网络异常静默忽略
	}
}

export function initAutoRefresh(): void {
	if (typeof window === "undefined") return;

	createBanner();

	document.getElementById("fx-refresh-btn")?.addEventListener("click", () => {
		window.location.reload();
	});

	document.getElementById("fx-refresh-close")?.addEventListener("click", () => {
		hideBanner();
	});

	// 首次检查（延迟 10s 避免干扰首屏）
	setTimeout(checkForUpdates, 10 * 1000);

	// 定期检查
	setInterval(checkForUpdates, CHECK_INTERVAL);

	// 页面重新可见时检查（用户切走又切回来）
	document.addEventListener("visibilitychange", () => {
		if (!document.hidden) checkForUpdates();
	});
}
