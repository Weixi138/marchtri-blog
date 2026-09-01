/**
 * 全站文章日期显示统一使用北京时区（Asia/Shanghai）：
 * 站点内容由作者在中国发布，静态构建却跑在 UTC 构建机上，
 * 用 toISOString() 或构建机本地方法都会在凌晨时段把文章归错一天。
 * 北京无夏令时、恒为 UTC+8，直接偏移取 UTC 字段即可，无 locale 依赖。
 */
export function formatDateToYYYYMMDD(date: Date): string {
	const shifted = new Date(date.getTime() + 8 * 3600 * 1000);
	return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}
