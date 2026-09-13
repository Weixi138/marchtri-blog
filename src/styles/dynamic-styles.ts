export const dynamicStyles = {
  'sakura-glass': {
    name: '樱花玻璃',
    vars: {
      '--style-bg-base': '#fdf7f9',
      '--style-bg-glass': 'rgba(255, 255, 255, 0.55)',
      '--style-sakura': '#ec6f9f',
      '--style-grad': 'linear-gradient(135deg, var(--sakura), var(--murasaki))',
      '--style-petal': 'rgba(255, 255, 255, 0.5)'
    },
    canvasLayers: ['sakura', 'petals']
  },
  'rain-glass': {
    name: '雨中玻璃',
    vars: {
      '--style-bg-base': '#e0f2f1',
      '--style-bg-glass': 'rgba(255, 255, 255, 0.7)',
      '--style-sakura': '#4fc3f7',
      '--style-grad': 'linear-gradient(135deg, #4fc3f7, #81d4fa)',
      '--style-petal': 'rgba(144, 202, 249, 0.3)'
    },
    canvasLayers: ['rain', 'particles']
  },
  'music-viz-glass': {
    name: '音乐可视',
    vars: {
      '--style-bg-base': '#2a2a2a',
      '--style-bg-glass': 'rgba(255, 255, 255, 0.1)',
      '--style-sakura': '#f4a5c5',
      '--style-grad': 'linear-gradient(135deg, #f4a5c5, #81d4fa)',
      '--style-petal': 'rgba(244, 165, 197, 0.4)'
    },
    canvasLayers: ['music-viz', 'particles']
  },
  'sky-glass': {
    name: '天空玻璃',
    vars: {
      '--style-bg-base': '#1a1a2e',
      '--style-bg-glass': 'rgba(255, 255, 255, 0.6)',
      '--style-sakura': '#c084fc',
      '--style-grad': 'linear-gradient(135deg, #c084fc, #a78bfa)',
      '--style-petal': 'rgba(192, 132, 252, 0.4)'
    },
    canvasLayers: ['sky', 'stars']
  }
};

export const getCurrentDynamicStyle = () => {
  // 从 localStorage 或 setting-utils 获取
  return 'sakura-glass'; // 默认
};