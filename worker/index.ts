/**
 * Worker 入口（B1）：/api/* 走后台管理接口，其余请求交静态资源（dist/）。
 * 鉴权与发文 API 在 B2/B3 中于 worker/admin.ts 实现。
 */
import { handleAdminApi } from "./admin";

export default {
	async fetch(req: Request, env: Env): Promise<Response> {
		const url = new URL(req.url);
		if (url.pathname.startsWith("/api/")) {
			return handleAdminApi(req, url, env);
		}
		const assetRes = await env.ASSETS.fetch(req);
		// 未命中的页面路径回退到 404 页（保留原 HTTP 状态由 Workers 资产层处理）
		return assetRes;
	},
};
