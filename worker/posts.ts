/**
 * 发文 API（B3）：GitHub Contents API 读写 src/content/posts/。
 * 文章留在 git 仓库，push 后由自动构建生效；这里只做校验与转发。
 */

const DEFAULT_REPO = "Weixi138/marchtri-blog";
const POSTS_DIR = "src/content/posts";
const NAME_RE = /^[a-z0-9][a-z0-9-]*\.md$/; // 防路径穿越 + 命名规范（docs/04）
const MAX_BODY = 1024 * 1024; // 1MB 纯文本上限

function ghFetch(url: string, token: string, init?: RequestInit): Promise<Response> {
	return fetch(url, {
		...init,
		headers: {
			accept: "application/vnd.github+json",
			authorization: `Bearer ${token}`,
			"x-github-api-version": "2022-11-28",
			"user-agent": "marchtri-blog-admin-worker",
			...(init?.headers ?? {}),
		},
	});
}

/** UTF-8 安全的 base64（Workers 无 Buffer） */
function b64Encode(text: string): string {
	const bytes = new TextEncoder().encode(text);
	let s = "";
	for (const b of bytes) s += String.fromCharCode(b);
	return btoa(s);
}

function b64Decode(b64: string): string {
	const bin = atob(b64.replace(/\s/g, ""));
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return new TextDecoder().decode(bytes);
}

/** frontmatter 基础校验：必须以 --- 开头，且 title / published 非空 */
export function validateMarkdown(text: string): string | null {
	if (text.length > MAX_BODY) return "内容超过 1MB 上限";
	if (!text.startsWith("---\n")) return "缺少 YAML frontmatter（应以 --- 开头）";
	const end = text.indexOf("\n---", 4);
	if (end < 0) return "frontmatter 未闭合";
	const fm = text.slice(4, end);
	const has = (key: string) =>
		fm.split("\n").some((line) => {
			const m = line.match(new RegExp(`^${key}:\\s*(.*)$`));
			return !!m && m[1].trim().length > 0;
		});
	if (!has("title")) return "frontmatter 缺少 title";
	if (!has("published")) return "frontmatter 缺少 published";
	return null;
}

export interface PostEntry {
	name: string;
	path: string;
	sha: string;
	size: number;
}

export async function listPosts(env: Env): Promise<Response> {
	const res = await ghFetch(
		`https://api.github.com/repos/${env.GITHUB_REPO ?? DEFAULT_REPO}/contents/${POSTS_DIR}`,
		env.GITHUB_TOKEN as string,
	);
	if (!res.ok) return new Response(res.body, { status: res.status, headers: { "content-type": "application/json" } });
	const data = (await res.json()) as Array<Partial<PostEntry>>;
	const posts = data
		.filter((f) => typeof f.name === "string" && f.name.endsWith(".md"))
		.map((f) => ({ name: f.name as string, path: f.path as string, sha: f.sha as string, size: f.size as number }))
		.sort((a, b) => (a.name < b.name ? 1 : -1));
	return Response.json({ posts });
}

export async function getPost(env: Env, name: string): Promise<Response> {
	const res = await ghFetch(
		`https://api.github.com/repos/${env.GITHUB_REPO ?? DEFAULT_REPO}/contents/${POSTS_DIR}/${name}`,
		env.GITHUB_TOKEN as string,
	);
	if (!res.ok) return new Response(res.body, { status: res.status, headers: { "content-type": "application/json" } });
	const file = (await res.json()) as { content?: string; sha?: string };
	return Response.json({
		content: file.content ? b64Decode(file.content) : "",
		sha: file.sha ?? "",
	});
}

export async function putPost(
	env: Env,
	name: string,
	content: string,
	sha: string | undefined,
): Promise<Response> {
	const bad = validateMarkdown(content);
	if (bad) return Response.json({ error: bad }, { status: 400 });
	const body: Record<string, unknown> = {
		message: `post(${name.slice(0, -3)}): 通过博客后台${sha ? "更新" : "发布"}`,
		content: b64Encode(content),
	};
	if (sha) body.sha = sha;
	const res = await ghFetch(
		`https://api.github.com/repos/${env.GITHUB_REPO ?? DEFAULT_REPO}/contents/${POSTS_DIR}/${name}`,
		env.GITHUB_TOKEN as string,
		{ method: "PUT", body: JSON.stringify(body) },
	);
	const data = (await res.json().catch(() => ({}))) as { content?: { sha?: string } };
	// 409（sha 过期）等错误原样透传给前端
	return Response.json(
		res.ok ? { ok: true, sha: data.content?.sha ?? "" } : { error: (data as { message?: string }).message ?? "GitHub 请求失败", status: res.status },
		{ status: res.ok ? 200 : res.status },
	);
}

export async function deletePost(env: Env, name: string, sha: string): Promise<Response> {
	const res = await ghFetch(
		`https://api.github.com/repos/${env.GITHUB_REPO ?? DEFAULT_REPO}/contents/${POSTS_DIR}/${name}`,
		env.GITHUB_TOKEN as string,
		{ method: "DELETE", body: JSON.stringify({ message: `post(${name.slice(0, -3)}): 通过博客后台删除`, sha }) },
	);
	return Response.json(
		res.ok ? { ok: true } : { error: "删除失败（可能 sha 已过期）", status: res.status },
		{ status: res.ok ? 200 : res.status },
	);
}

/** /api/admin/posts[/name] 路由；返回 null 表示不是 posts 路由 */
export async function handlePostsApi(
	req: Request,
	url: URL,
	env: Env,
): Promise<Response | null> {
	const rest = url.pathname.slice("/api/admin/posts".length).replace(/^\//, "");
	const name = rest ? decodeURIComponent(rest) : "";
	if (name && !NAME_RE.test(name)) {
		return Response.json({ error: "文件名不合法（仅限小写字母/数字/连字符 + .md）" }, { status: 400 });
	}
	if (!env.GITHUB_TOKEN) return Response.json({ error: "服务端未配置 GITHUB_TOKEN" }, { status: 500 });

	if (req.method === "GET" && !name) return await listPosts(env);
	if (req.method === "GET" && name) return await getPost(env, name);
	if ((req.method === "PUT" || req.method === "POST") && name) {
		const body = (await req.json().catch(() => null)) as { content?: unknown; sha?: unknown } | null;
		if (!body || typeof body.content !== "string") {
			return Response.json({ error: "请求体需包含 content 字段" }, { status: 400 });
		}
		const existing = body.sha === undefined ? undefined : String(body.sha);
		if (body.sha !== undefined && existing === "") {
			return Response.json({ error: "缺少 sha" }, { status: 400 });
		}
		if (existing === undefined) {
			// 新建：目标已存在则拒绝，避免误覆盖
			const probe = await ghFetch(
				`https://api.github.com/repos/${env.GITHUB_REPO ?? DEFAULT_REPO}/contents/${POSTS_DIR}/${name}`,
				env.GITHUB_TOKEN as string,
			);
			if (probe.ok) {
				return Response.json({ error: "文件已存在，请从列表编辑（带 sha）" }, { status: 409 });
			}
		}
		return await putPost(env, name, body.content, existing);
	}
	if (req.method === "DELETE" && name) {
		const body = (await req.json().catch(() => null)) as { sha?: unknown } | null;
		if (!body || typeof body.sha !== "string" || !body.sha) {
			return Response.json({ error: "删除需要 sha" }, { status: 400 });
		}
		return await deletePost(env, name, body.sha);
	}
	return Response.json({ error: "not found" }, { status: 404 });
}
