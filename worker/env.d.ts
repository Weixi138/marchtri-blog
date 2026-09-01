/**
 * Cloudflare Worker 运行环境绑定（docs/05 · B1 部署收束）。
 * secrets 经 `wrangler secret put` 配置，本地开发放 .dev.vars。
 * 不引入 @cloudflare/workers-types，这里声明用到的最小结构。
 */
interface AssetFetcher {
	fetch(request: Request): Promise<Response>;
}

interface Env {
	/** Workers 静态资源绑定（dist/） */
	ASSETS: AssetFetcher;
	/** 管理员密码（CF secret 加密存储；Workers 免费版 CPU 限制下不做 KDF 哈希） */
	ADMIN_PASSWORD?: string;
	/** session cookie 的 HMAC 密钥 */
	SESSION_SECRET?: string;
	/** 细粒度 GitHub PAT：仅 marchtri-blog 仓库 Contents 读写 */
	GITHUB_TOKEN?: string;
	/** 发布目标仓库，默认 Weixi138/marchtri-blog */
	GITHUB_REPO?: string;
}
