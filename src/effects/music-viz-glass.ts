// src/effects/music-viz-glass.ts
import { dynamicThemeManager } from '../utils/dynamic-theme-manager';

export function initMusicVizGlass() {
  console.log('music-viz-glass 风格已激活');
  return () => {
    console.log('music-viz-glass 风格已卸载');
  };
}