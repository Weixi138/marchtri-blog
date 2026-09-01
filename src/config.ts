import type {
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
	title: "MarchTri",
	subtitle: "写代码，也写生活。",
	lang: "zh_CN",
	banner: {
		enable: true,
		// 纯 CSS 渐变装饰 Banner（MainGridLayout），不再使用外链随机图
		src: "",
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
		{ name: "看板", url: "/dashboard/" },
		{ name: "照片", url: "/photos/" },
		LinkPreset.About,
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/demo-avatar.png",
	name: "MarchTri",
	bio: "写代码，也写生活。",
	links: [
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/Weixi138",
		},
		{
			name: "Bilibili",
			icon: "fa6-brands:bilibili",
			url: "https://space.bilibili.com/1858198083",
		},
		{
			name: "Email",
			icon: "fa6-regular:envelope",
			url: "mailto:2287590270@qq.com",
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
	dashboard: true,
	comments: true,
	sakura: true,
	clickBurst: true,
	typewriter: true,
	hitokoto: true,
	loadingScreen: true,
	cursorGlow: true,
	photoWall: true,
	devGuard: false,
	autoRefresh: true,
	adminPanel: true,
};

export const heroConfig: HeroConfig = {
	greeting: "こんにちは，我是 MarchTri",
	typewriterLines: [
		"在这里，写下代码与生活。",
		"背景会随你那里的天气和时间悄悄变化。",
		"按 Ctrl + K 打开命令面板试试？",
		"按反引号 ` 可以呼出神秘终端哦～",
	],
	seasonNotes: {
		spring: { tag: "春 · 樱吹雪", line: "樱瓣落在肩头，是春天写的信。" },
		summer: { tag: "夏 · 蝉时雨", line: "晚风、萤火与冰镇西瓜，夏天正当时。" },
		autumn: { tag: "秋 · 枫时雨", line: "枫叶红了，把秋天夹进书页里。" },
		winter: { tag: "冬 · 雪见夜", line: "落雪有声，围炉夜话正合适。" },
	},
};

/**
 * 音乐配置
 * - neteasePlaylistId: 网易云音乐歌单 ID（歌单页 URL 里 playlist?id=xxx 的数字）。
 *   填了则构建期经公开接口拉取曲目（播放器为全自研玻璃组件 + 外链直链，无 iframe）；
 *   留空则只使用本地歌单。
 *   注意：外链曲目因跨域限制不做音频律动，律动仅本地曲目支持。
 * - playlist: 本地歌单（public/music/ 下的音频），恒并入播放列表尾部，作外链全挂时的兜底。
 */
export const musicConfig: MusicConfig = {
	neteasePlaylistId: "18088651885",
	playlist: [
		{
			file: "/music/sakura-drops.wav",
			title: "樱花落",
			artist: "本站音景",
		},
		{
			file: "/music/night-star.wav",
			title: "夜星",
			artist: "本站音景",
		},
	],
	defaultVolume: 0.6,
};

/** Giscus 评论配置（repo 未配置时不渲染评论 DOM） */
export const commentsConfig: CommentsConfig = {
	repo: "Weixi138/marchtri-blog",
	repoId: "R_kgDOUH18IA",
	category: "Announcements",
	categoryId: "DIC_kwDOUH18IA4C0PNV",
	mapping: "pathname",
};
