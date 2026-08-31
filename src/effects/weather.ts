/**
 * 天气 × 昼夜场景判定（docs/03 P1-2）
 * 数据源 Open-Meteo（免 key）；定位：浏览器授权 → IP 粗定位 → 纯时间降级。
 * 结果缓存 localStorage 30 分钟。
 */

export type SkyPeriod = "dawn" | "day" | "dusk" | "night";
export type Precip = "clear" | "cloudy" | "fog" | "rain" | "snow" | "storm";
export type Season = "spring" | "summer" | "autumn" | "winter";

export interface SceneState {
	period: SkyPeriod;
	precip: Precip;
	/** 底部徽标文案，如「谷雨 · 小雨 · 夜」 */
	label: string;
	season: Season;
	/** 当前节气名，如「谷雨」 */
	solarTerm: string;
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

export function seasonFromDate(d: Date): Season {
	const m = d.getMonth() + 1;
	if (m >= 3 && m <= 5) return "spring";
	if (m >= 6 && m <= 8) return "summer";
	if (m >= 9 && m <= 11) return "autumn";
	return "winter";
}

/** 廿四节气近似日期表（每年偏差不过一两天，展示用途足够） */
const SOLAR_TERMS: Array<{ name: string; month: number; day: number }> = [
	{ name: "小寒", month: 1, day: 5 },
	{ name: "大寒", month: 1, day: 20 },
	{ name: "立春", month: 2, day: 4 },
	{ name: "雨水", month: 2, day: 19 },
	{ name: "惊蛰", month: 3, day: 6 },
	{ name: "春分", month: 3, day: 21 },
	{ name: "清明", month: 4, day: 5 },
	{ name: "谷雨", month: 4, day: 20 },
	{ name: "立夏", month: 5, day: 6 },
	{ name: "小满", month: 5, day: 21 },
	{ name: "芒种", month: 6, day: 6 },
	{ name: "夏至", month: 6, day: 21 },
	{ name: "小暑", month: 7, day: 7 },
	{ name: "大暑", month: 7, day: 23 },
	{ name: "立秋", month: 8, day: 7 },
	{ name: "处暑", month: 8, day: 23 },
	{ name: "白露", month: 9, day: 8 },
	{ name: "秋分", month: 9, day: 23 },
	{ name: "寒露", month: 10, day: 8 },
	{ name: "霜降", month: 10, day: 23 },
	{ name: "立冬", month: 11, day: 7 },
	{ name: "小雪", month: 11, day: 22 },
	{ name: "大雪", month: 12, day: 7 },
	{ name: "冬至", month: 12, day: 22 },
];

export function solarTermFromDate(d: Date): string {
	const m = d.getMonth() + 1;
	const day = d.getDate();
	// 倒序找最近一个已过的节气；1 月 5 日之前归属上一年冬至
	for (let i = SOLAR_TERMS.length - 1; i >= 0; i--) {
		const t = SOLAR_TERMS[i];
		if (m > t.month || (m === t.month && day >= t.day)) return t.name;
	}
	return "冬至";
}

/** 徽标文案：节气 · 天气 · 时段（三段式签名格式） */
function sceneLabel(scene: { period: SkyPeriod; precip: Precip }): string {
	const now = new Date();
	return `${solarTermFromDate(now)} · ${PRECIP_CN[scene.precip]} · ${PERIOD_CN[scene.period]}`;
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

async function ipLocate(ms: number): Promise<{ lat: number; lon: number }> {
	const r = await withTimeout(fetch("https://ipapi.co/json/"), ms);
	if (!r.ok) throw new Error("ipapi failed");
	const data = (await r.json()) as { latitude?: number; longitude?: number };
	if (typeof data.latitude !== "number" || typeof data.longitude !== "number")
		throw new Error("ipapi no coords");
	return { lat: data.latitude, lon: data.longitude };
}

function fallbackScene(): SceneState {
	const now = new Date();
	const period = periodFromDate(now);
	const precip: Precip = "clear";
	return {
		period,
		precip,
		label: sceneLabel({ period, precip }),
		season: seasonFromDate(now),
		solarTerm: solarTermFromDate(now),
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
		// 缓存里的时段/节气可能过期，重新按当前时间算
		const now = new Date();
		const period = periodFromDate(now);
		return {
			...scene,
			period,
			season: seasonFromDate(now),
			solarTerm: solarTermFromDate(now),
			label: sceneLabel({ period, precip: scene.precip }),
		};
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
		const now = new Date();
		const period = periodFromDate(now);
		const scene: SceneState = {
			period,
			precip,
			label: sceneLabel({ period, precip }),
			season: seasonFromDate(now),
			solarTerm: solarTermFromDate(now),
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
