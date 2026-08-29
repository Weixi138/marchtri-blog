declare global {
	interface Window {
		/** @swup/astro 注入的 swup 实例（官方类型不正确，这里用最小结构类型） */
		swup: {
			hooks: {
				on: (
					event: string,
					handler: (...args: never[]) => void,
					options?: unknown,
				) => unknown;
			};
			navigate?: (url: string) => void;
		};
		pagefind: {
			search: (query: string) => Promise<{
				results: Array<{
					data: () => Promise<SearchResult>;
				}>;
			}>;
		};
		/** 特效层（src/effects/） */
		__fxManager?: {
			setAudioEnergy: (v: number) => void;
			audioEnergy: number;
		};
		__fxSakura?: { enabled: boolean };
		__fxBurst?: { enabled: boolean };
		__fxSetWeather?: () => void;
	}
}

interface SearchResult {
	url: string;
	meta: {
		title: string;
	};
	excerpt: string;
	content?: string;
	word_count?: number;
	filters?: Record<string, unknown>;
	anchors?: Array<{
		element: string;
		id: string;
		text: string;
		location: number;
	}>;
	weighted_locations?: Array<{
		weight: number;
		balanced_score: number;
		location: number;
	}>;
	locations?: number[];
	raw_content?: string;
	raw_url?: string;
	sub_results?: SearchResult[];
}

export {};
