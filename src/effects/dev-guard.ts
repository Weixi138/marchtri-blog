/**
 * 开发者工具防护（docs/03 P1-7）：
 * 禁用右键菜单 + 拦截 F12 / DevTools 快捷键，触发时跳转百度。
 * 仅拦截表层操作，专业用户仍可绕过。
 */
const REDIRECT_URL = "https://www.baidu.com";

function onDevToolKey(e: KeyboardEvent): void {
	// F12
	if (e.key === "F12") {
		e.preventDefault();
		window.location.href = REDIRECT_URL;
		return;
	}
	// Ctrl+Shift+I / Cmd+Option+I (DevTools)
	if (
		(e.ctrlKey || e.metaKey) &&
		e.shiftKey &&
		(e.key === "I" || e.key === "i")
	) {
		e.preventDefault();
		window.location.href = REDIRECT_URL;
		return;
	}
	// Ctrl+Shift+J / Cmd+Option+J (Console)
	if (
		(e.ctrlKey || e.metaKey) &&
		e.shiftKey &&
		(e.key === "J" || e.key === "j")
	) {
		e.preventDefault();
		window.location.href = REDIRECT_URL;
		return;
	}
	// Ctrl+U (View Source)
	if ((e.ctrlKey || e.metaKey) && (e.key === "U" || e.key === "u")) {
		e.preventDefault();
		window.location.href = REDIRECT_URL;
		return;
	}
}

function onContextMenu(e: MouseEvent): void {
	e.preventDefault();
}

export function initDevGuard(): void {
	if (typeof window === "undefined") return;
	document.addEventListener("keydown", onDevToolKey, { capture: true });
	document.addEventListener("contextmenu", onContextMenu, { capture: true });
}
