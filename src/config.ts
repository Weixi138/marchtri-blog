import type {
	BangumiConfig,
	CommentsConfig,
	ExpressiveCodeConfig,
	FeatureConfig,
	HeroConfig,
	LicenseConfig,
	MusicConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "樱雾小筑",
	subtitle: "SakuraMist · 一座会呼吸的玻璃花房",
	lang: "zh_CN",
	themeColor: {
		hue: 335, // 樱花粉，锁定主题色保证独特性
		fixed: true, // 不向访客开放色相选择器
	},
	banner: {
		enable: false,
		src: "assets/images/demo-banner.png",
		position: "center",
		credit: {
			enable: false,
			text: "",
			url: "",
		},
	},
	toc: {
		enable: true,
		depth: 2,
	},
	favicon: [
		{
			src: "/favicon/favicon.svg",
		},
	],
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		{ name: "追番", url: "/bangumi/" },
		{ name: "看板", url: "/dashboard/" },
		LinkPreset.About,
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/demo-avatar.png",
	name: "Sakura",
	bio: "写代码，也写生活。在玻璃花房里慢慢更新。",
	links: [
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com",
		},
		{
			name: "Bilibili",
			icon: "fa6-brands:bilibili",
			url: "https://www.bilibili.com",
		},
		{
			name: "Email",
			icon: "fa6-regular:envelope",
			url: "mailto:me@example.com",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	theme: "github-dark",
};

/* ===== 特色功能配置（开关含义见 docs/03） ===== */

export const featureConfig: FeatureConfig = {
	commandPalette: true,
	terminal: true,
	weatherBg: true,
	musicPlayer: true,
	bangumi: true,
	dashboard: true,
	comments: true,
	sakura: true,
	clickBurst: true,
	typewriter: true,
	hitokoto: true,
};

export const heroConfig: HeroConfig = {
	greeting: "こんにちは，欢迎来到樱雾小筑 🌸",
	typewriterLines: [
		"在这里，写下代码与生活。",
		"背景会随你那里的天气和时间悄悄变化。",
		"按 Ctrl + K 打开命令面板试试？",
		"按反引号 ` 可以呼出神秘终端哦～",
	],
};

export const musicConfig: MusicConfig = {
	playlist: [
		{
			file: "/music/sakura-drops.wav",
			title: "樱花落",
			artist: "示例音景 · 可在 config.ts 换成你的歌单",
		},
		{
			file: "/music/night-star.wav",
			title: "夜星",
			artist: "示例音景 · 可在 config.ts 换成你的歌单",
		},
	],
	defaultVolume: 0.6,
};

export const bangumiConfig: BangumiConfig = {
	userId: "", // 填入你的 Bangumi 用户 ID（数字）后 /bangumi 页会自动拉取收藏
};

export const commentsConfig: CommentsConfig = {
	repo: "",
	repoId: "",
	category: "Announcements",
	categoryId: "",
	mapping: "pathname",
};
