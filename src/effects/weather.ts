/**
 * 天气 × 昼夜场景判定（docs/03 P1-2）
 * 数据源 Open-Meteo（免 key）；定位：浏览器授权 → IP 粗定位 → 纯时间降级。
 * 结果缓存 localStorage 30 分钟。
 */

export type SkyPeriod = "dawn" | "day" | "dusk" | "night";
export type Precip = "clear" | "cloudy" | "fog" | "rain" | "snow" | "storm";

export interface SceneState {
	period: SkyPeriod;
	precip: Precip;
	/** 底部徽标文案，如「小雨 · 黄昏」 */
	label: string;
}

const CACHE_KEY = "fx-scene-v1";
const CACHE_TTL = 30 * 60 * 1000;

const PERIOD_CN: Record<SkyPeriod, string> = {
	dawn: "黎明",
	day: "白天",
	dusk: "黄昏",
	night: "夜晚",
};

const PRECIP_CN: Record<Precip, string> = {
	clear: "晴",
	cloudy: "多云",
	fog: "雾",
	rain: "雨",
	snow: "雪",
	storm: "雷雨",
};

/** WMO weather code → 粗分类 */
function codeToPrecip(code: number): Precip {
	if (code === 0) return "clear";
	if (code <= 3) return "cloudy";
	if (code <= 48) return "fog";
	if (code <= 67 || (code >= 80 && code <= 82)) return "rain";
	if (code <= 77 || code === 85 || code === 86) return "snow";
	if (code >= 95) return "storm";
	return "cloudy";
}

export function periodFromDate(d: Date): SkyPeriod {
	const h = d.getHours();
	if (h >= 5 && h < 7) return "dawn";
	if (h >= 7 && h < 17) return "day";
	if (h >= 17 && h < 19) return "dusk";
	return "night";
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
	return Promise.race([
		p,
		new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
	]);
}

function geolocate(ms: number): Promise<{ lat: number; lon: number }> {
	return withTimeout(
		new Promise((resolve, reject) => {
			if (!("geolocation" in navigator)) return reject(new Error("no geo"));
			navigator.geolocation.getCurrentPosition(
				(pos) =>
					resolve({
						lat: pos.coords.latitude,
						lon: pos.coords.longitude,
					}),
				(rej) => reject(rej),
				{ timeout: ms, maximumAge: 600000 },
			);
		}),
		ms + 500,
	);
}

async function ipLocate(
	ms: number,
): Promise<{ lat: number; lon: number }> {
	const r = await withTimeout(fetch("https://ipapi.co/json/"), ms);
	if (!r.ok) throw new Error("ipapi failed");
	const data = (await r.json()) as { latitude?: number; longitude?: number };
	if (typeof data.latitude !== "number" || typeof data.longitude !== "number")
		throw new Error("ipapi no coords");
	return { lat: data.latitude, lon: data.longitude };
}

function fallbackScene(): SceneState {
	const period = periodFromDate(new Date());
	return {
		period,
		precip: "clear",
		label: `${PRECIP_CN.clear} · ${PERIOD_CN[period]}`,
	};
}

function readCache(): SceneState | null {
	try {
		const raw = localStorage.getItem(CACHE_KEY);
		if (!raw) return null;
		const { ts, scene } = JSON.parse(raw) as {
			ts: number;
			scene: SceneState;
		};
		if (Date.now() - ts > CACHE_TTL) return null;
		// 缓存里的时段可能过期，重新按当前时间算时段
		const period = periodFromDate(new Date());
		return { ...scene, period, label: `${PRECIP_CN[scene.precip]} · ${PERIOD_CN[period]}` };
	} catch {
		return null;
	}
}

export async function fetchScene(enableWeather: boolean): Promise<SceneState> {
	if (!enableWeather) return fallbackScene();
	const cached = readCache();
	if (cached) return cached;

	let coords: { lat: number; lon: number } | null = null;
	try {
		coords = await geolocate(3000);
	} catch {
		try {
			coords = await ipLocate(3000);
		} catch {
			coords = null;
		}
	}
	if (!coords) return fallbackScene();

	try {
		const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat.toFixed(3)}&longitude=${coords.lon.toFixed(3)}&current_weather=true`;
		const r = await withTimeout(fetch(url), 5000);
		if (!r.ok) throw new Error("open-meteo failed");
		const data = (await r.json()) as {
			current_weather?: { weathercode?: number };
		};
		const precip = codeToPrecip(data.current_weather?.weathercode ?? 0);
		const period = periodFromDate(new Date());
		const scene: SceneState = {
			period,
			precip,
			label: `${PRECIP_CN[precip]} · ${PERIOD_CN[period]}`,
		};
		try {
			localStorage.setItem(
				CACHE_KEY,
				JSON.stringify({ ts: Date.now(), scene }),
			);
		} catch {
			/* 存不进就算了 */
		}
		return scene;
	} catch {
		return fallbackScene();
	}
}
