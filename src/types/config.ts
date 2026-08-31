import type { AUTO_MODE, DARK_MODE, LIGHT_MODE } from "@constants/constants";

export type SiteConfig = {
	title: string;
	subtitle: string;

	lang:
		| "en"
		| "zh_CN"
		| "zh_TW"
		| "ja"
		| "ko"
		| "es"
		| "th"
		| "vi"
		| "tr"
		| "id";

	banner: {
		enable: boolean;
		src: string;
		position?: "top" | "center" | "bottom";
		credit: {
			enable: boolean;
			text: string;
			url?: string;
		};
	};
	toc: {
		enable: boolean;
		depth: 1 | 2 | 3;
	};

	favicon: Favicon[];
};

export type Favicon = {
	src: string;
	theme?: "light" | "dark";
	sizes?: string;
};

export enum LinkPreset {
	Home = 0,
	Archive = 1,
	About = 2,
}

export type NavBarLink = {
	name: string;
	url: string;
	external?: boolean;
};

export type NavBarConfig = {
	links: (NavBarLink | LinkPreset)[];
};

export type ProfileConfig = {
	avatar?: string;
	name: string;
	bio?: string;
	links: {
		name: string;
		url: string;
		icon: string;
	}[];
};

export type LicenseConfig = {
	enable: boolean;
	name: string;
	url: string;
};

export type LIGHT_DARK_MODE =
	| typeof LIGHT_MODE
	| typeof DARK_MODE
	| typeof AUTO_MODE;

export type BlogPostData = {
	body: string;
	title: string;
	published: Date;
	description: string;
	tags: string[];
	draft?: boolean;
	image?: string;
	category?: string;
	prevTitle?: string;
	prevSlug?: string;
	nextTitle?: string;
	nextSlug?: string;
};

export type ExpressiveCodeConfig = {
	theme: string;
};

/* ===== 博客扩展配置 ===== */

export type FeatureConfig = {
	commandPalette: boolean;
	terminal: boolean;
	weatherBg: boolean;
	musicPlayer: boolean;
	dashboard: boolean;
	comments: boolean;
	sakura: boolean;
	clickBurst: boolean;
	typewriter: boolean;
	hitokoto: boolean;
	loadingScreen: boolean;
	cursorGlow: boolean;
	photoWall: boolean;
	autoRefresh: boolean;
	devGuard: boolean;
};

export type HeroConfig = {
	greeting: string;
	typewriterLines: string[];
};

export type MusicTrack = {
	file: string;
	title: string;
	artist?: string;
};

export type MusicConfig = {
	/** 网易云音乐歌单 ID：填了优先渲染网易云官方外链播放器 */
	neteasePlaylistId: string;
	/** 本地歌单（public/music/），播放时驱动音频律动 */
	playlist: MusicTrack[];
	defaultVolume: number; // 0 - 1
};

export type CommentsConfig = {
	repo: `${string}/${string}` | "";
	repoId: string;
	category: string;
	categoryId: string;
	mapping: "pathname" | "url" | "title" | "og:title";
};
