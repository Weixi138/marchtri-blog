// src/effects/sky-glass.ts
import { dynamicThemeManager } from '../utils/dynamic-theme-manager';

export function initSkyGlass() {
  console.log('sky-glass 风格已激活');
  return () => {
    console.log('sky-glass 风格已卸载');
  };
}