// 在 DynamicStyleSwitch.svelte 中添加切换逻辑
// (已在 dynamic-theme-manager 中实现)

import { dynamicThemeManager } from '../utils/dynamic-theme-manager';

const styles = [
  { name: 'sakura-glass', label: '樱花玻璃' },
  { name: 'rain-glass', label: '雨中玻璃' },
  { name: 'music-viz-glass', label: '音乐可视' },
  { name: 'sky-glass', label: '天空玻璃' }
];

const switchStyle = (styleName: string) => {
  dynamicThemeManager.switchStyle(styleName);
  // 触发重新渲染
};