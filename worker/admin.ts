/**
 * 后台管理 API 路由（B2 鉴权；B3 发文接口挂在 requireAuth 之后）。
 * 约定：JSON in/out；写操作要求签名 cookie，且 Content-Type 必须是 JSON（配合 SameSite=Lax 防 CSRF）。
 */
import {
	clearFails,
	lockState,
	passwordMatches,
	recordFail,
	sessionCookie,
	signSession,
	verifySession,
} from "./auth";
import { handlePostsApi } from "./posts";

function json(data: unknown, status = 200, extraHeaders?: Headers): Response {
	const headers = new Headers(extraHeaders);
	headers.set("content-type", "application/json; charset=utf-8");
	return new Response(JSON.stringify(data), { status, headers });
}

export async function requireAuth(
	req: Request,
	env: Env,
): Promise<Response | null> {
	if (!env.SESSION_SECRET) {
		return json({ error: "服务端未配置 SESSION_SECRET" }, 500);
	}
	const ok = await verifySession(req.headers.get("cookie"), env.SESSION_SECRET);
	return ok ? null : json({ error: "未登录" }, 401);
}

function isSecure(req: Request): boolean {
	return new URL(req.url).protocol === "https:";
}

async function handleLogin(req: Request, env: Env): Promise<Response> {
	const ctype = req.headers.get("content-type") ?? "";
	if (!ctype.includes("application/json")) {
		return json({ error: "请求体必须是 JSON" }, 415);
	}
	let password = "";
	try {
		const body = (await req.json()) as { password?: unknown };
		if (typeof body.password === "string") password = body.password;
	} catch {
		return json({ error: "JSON 解析失败" }, 400);
	}
	if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
		return json({ error: "服务端未配置管理密钥" }, 500);
	}
	const ip = req.headers.get("cf-connecting-ip") ?? "local";
	const lock = lockState(ip);
	if (!lock.allowed) {
		return json({ error: `尝试过多，请 ${lock.retryAfterS} 秒后再试` }, 429);
	}
	const ok = passwordMatches(password, env.ADMIN_PASSWORD);
	if (!ok) {
		recordFail(ip);
		return json({ error: "密码错误" }, 401);
	}
	clearFails(ip);
	const token = await signSession(env.SESSION_SECRET);
	return json(
		{ ok: true },
		200,
		new Headers({ "set-cookie": sessionCookie(token, isSecure(req)) }),
	);
}

export async function handleAdminApi(
	req: Request,
	url: URL,
	env: Env,
): Promise<Response> {
	const route = url.pathname.slice("/api/admin/".length);

	if (route === "session" && req.method === "GET") {
		const denied = await requireAuth(req, env);
		return denied ?? json({ authed: true });
	}
	if (route === "login" && req.method === "POST") {
		return handleLogin(req, env);
	}
	if (route === "logout" && req.method === "POST") {
		return json(
			{ ok: true },
			200,
			new Headers({ "set-cookie": sessionCookie("", isSecure(req), 0) }),
		);
	}

	// B3 发文端点（列表/读/写/删）
	if (url.pathname === "/api/admin/posts" || url.pathname.startsWith("/api/admin/posts/")) {
		const denied = await requireAuth(req, env);
		if (denied) return denied;
		const res = await handlePostsApi(req, url, env);
		return res ?? json({ error: "not found" }, 404);
	}

	return json({ error: "not found" }, 404);
}
