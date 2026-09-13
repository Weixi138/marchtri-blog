// src/effects/sakura-glass.ts
import { dynamicThemeManager } from '../utils/dynamic-theme-manager';

export function initSakuraGlass() {
  // 当前 sakura 效果（已集成到 dynamic-theme-manager）
  console.log('sakura-glass 风格已激活');
  return () => {
    // 清理逻辑
    console.log('sakura-glass 风格已卸载');
  };
}