// src/effects/rain-glass.ts
import { dynamicThemeManager } from '../utils/dynamic-theme-manager';

export function initRainGlass() {
  console.log('rain-glass 风格已激活');
  return () => {
    console.log('rain-glass 风格已卸载');
  };
}