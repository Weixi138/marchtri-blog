/**
 * 后台鉴权核心（B2）：管理员密码比对 + HMAC 签名 session cookie。
 * 密码以 secret 存储（CF 加密保存），登录用恒定时间比较——
 * 不用 PBKDF2/bcrypt：Workers 免费版 10ms CPU 限制会击杀高迭代派生（线上 error 1101）。
 * 单人站长 + secret 不外泄 + 失败锁定，安全性足够。
 */

const enc = new TextEncoder();
const SESSION_COOKIE = "session";
const SESSION_TTL_S = 7 * 24 * 60 * 60; // 7 天

function toB64(buf: ArrayBuffer): string {
	const bytes = new Uint8Array(buf);
	let s = "";
	for (const b of bytes) s += String.fromCharCode(b);
	return btoa(s);
}

function fromB64(s: string): Uint8Array {
	const bin = atob(s);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

/** 恒定时间比较，避免按位早退泄露信息 */
function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
	return diff === 0;
}

export function passwordMatches(input: string, expected: string): boolean {
	return bytesEqual(enc.encode(input), enc.encode(expected));
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
	const key = await crypto.subtle.importKey(
		"raw",
		enc.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
	return new Uint8Array(sig);
}

/** 签发 session cookie 值：过期时间戳.HMAC 签名 */
export async function signSession(secret: string): Promise<string> {
	const expiry = String(Math.floor(Date.now() / 1000) + SESSION_TTL_S);
	const sig = await hmac(secret, expiry);
	return `${expiry}.${toB64(sig.buffer as ArrayBuffer)}`;
}

export async function verifySession(
	cookieHeader: string | null,
	secret: string,
): Promise<boolean> {
	if (!cookieHeader) return false;
	const raw = cookieHeader
		.split(";")
		.map((c) => c.trim())
		.find((c) => c.startsWith(`${SESSION_COOKIE}=`));
	if (!raw) return false;
	const value = raw.slice(SESSION_COOKIE.length + 1);
	const dot = value.indexOf(".");
	if (dot < 0) return false;
	const expiry = value.slice(0, dot);
	if (!/^\d+$/.test(expiry) || Number(expiry) * 1000 < Date.now()) return false;
	const sig = await hmac(secret, expiry);
	try {
		return bytesEqual(sig, fromB64(value.slice(dot + 1)));
	} catch {
		return false; // 非法 base64
	}
}

export function sessionCookie(value: string, secure: boolean, maxAge = SESSION_TTL_S): string {
	return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}; Max-Age=${maxAge}`;
}

/** 轻量暴力破解防护：isolate 内存计数（仅轻防护，全局防线交给 CF 速率规则） */
const attempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;

export function lockState(ip: string): { allowed: boolean; retryAfterS: number } {
	const rec = attempts.get(ip);
	if (!rec) return { allowed: true, retryAfterS: 0 };
	if (rec.lockedUntil > Date.now()) {
		return { allowed: false, retryAfterS: Math.ceil((rec.lockedUntil - Date.now()) / 1000) };
	}
	return { allowed: true, retryAfterS: 0 };
}

export function recordFail(ip: string): void {
	const rec = attempts.get(ip) ?? { count: 0, lockedUntil: 0 };
	rec.count += 1;
	if (rec.count >= MAX_FAILS) {
		rec.lockedUntil = Date.now() + LOCK_MS;
		rec.count = 0;
	}
	attempts.set(ip, rec);
}

export function clearFails(ip: string): void {
	attempts.delete(ip);
}
