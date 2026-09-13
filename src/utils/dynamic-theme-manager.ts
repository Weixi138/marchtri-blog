// src/utils/dynamic-theme-manager.ts
import { dynamicStyles, getCurrentDynamicStyle } from '../styles/dynamic-styles';

export class DynamicThemeManager {
  private currentStyle: string = 'sakura-glass';
  private canvasLayers: any[] = [];
  private styleVars: any = {};

  constructor() {
    this.loadCurrentStyle();
  }

  private loadCurrentStyle() {
    this.currentStyle = getCurrentDynamicStyle();
    this.applyStyle(this.currentStyle);
  }

  private applyStyle(styleName: string) {
    const style = dynamicStyles[styleName];
    if (!style) return;

    this.styleVars = style.vars;
    this.applyCSSVariables(style.vars);
    this.loadCanvasLayers(style.canvasLayers);
  }

  private applyCSSVariables(vars: any) {
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }

  private loadCanvasLayers(layers: string[]) {
    // 清理旧层
    this.cleanupCanvasLayers();

    // 加载新层（实际实现根据 FXManager 扩展）
    layers.forEach(layer => {
      this.canvasLayers.push({
        name: layer,
        element: this.createCanvasLayer(layer)
      });
    });
  }

  private createCanvasLayer(layer: string) {
    const canvas = document.createElement('canvas');
    canvas.id = `dynamic-layer-${layer}`;
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.zIndex = '-1';
    canvas.style.pointerEvents = 'none';
    document.body.appendChild(canvas);

    // 这里可以根据不同风格初始化不同效果
    switch (layer) {
      case 'sakura':
        return this.initSakuraEffect(canvas);
      case 'rain':
        return this.initRainEffect(canvas);
      case 'music-viz':
        return this.initMusicViz(canvas);
      case 'sky':
        return this.initSkyEffect(canvas);
    }
  }

  private initSakuraEffect(canvas: HTMLCanvasElement) {
    // 当前 sakura 效果的简化版
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const petals = [];
    for (let i = 0; i < 80; i++) {
      petals.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 8 + 4,
        speed: Math.random() * 3 + 2,
        angle: Math.random() * Math.PI * 2
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      petals.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = 'rgba(236, 111, 159, 0.6)';
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size*0.6);
        ctx.restore();
        p.y += p.speed;
        p.angle += 0.1;
        if (p.y > window.innerHeight) p.y = 0;
      });
      requestAnimationFrame(animate);
    };
    animate();
  }

  private initRainEffect(canvas: HTMLCanvasElement) {
    // 雨滴效果
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drops = [];
    for (let i = 0; i < 100; i++) {
      drops.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        length: Math.random() * 30 + 20,
        speed: Math.random() * 8 + 12
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(144, 202, 249, 0.6)';
      ctx.lineWidth = 2;

      drops.forEach(drop => {
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x, drop.y + drop.length);
        ctx.stroke();
        drop.y += drop.speed;
        if (drop.y > window.innerHeight) drop.y = 0;
      });
      requestAnimationFrame(animate);
    };
    animate();
  }

  private initMusicViz(canvas: HTMLCanvasElement) {
    // 音乐可视化（简化波形）
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let dataArray: Uint8Array;
    let bufferLength: number;

    const initAudio = () => {
      if (window.AudioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 128;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        bufferLength = analyser.frequencyBinCount;

        // 监听音乐播放器（如果有）
        const musicPlayer = document.querySelector('.music-player') as HTMLAudioElement;
        if (musicPlayer) {
          musicPlayer.addEventListener('play', () => {
            if (audioContext.state === 'suspended') audioContext.resume();
          });
        }
      }
    };

    const animate = () => {
      if (!analyser) return;
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / bufferLength * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

        ctx.fillStyle = `rgba(244, 165, 197, ${0.7 + Math.random() * 0.3})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }

      requestAnimationFrame(animate);
    };

    initAudio();
    animate();
  }

  private initSkyEffect(canvas: HTMLCanvasElement) {
    // 天气天空效果
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stars = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 2 + 1
      });
    }

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#c084fc';
      stars.forEach(star => {
        ctx.fillRect(star.x, star.y, star.size, star.size);
        star.y = (star.y + 0.5) % window.innerHeight;
      });

      requestAnimationFrame(animate);
    };
    animate();
  }

  private cleanupCanvasLayers() {
    this.canvasLayers.forEach(layer => {
      const el = document.getElementById(`dynamic-layer-${layer.name}`);
      if (el) el.remove();
    });
    this.canvasLayers = [];
  }

  // 公共接口
  switchStyle(styleName: string) {
    this.currentStyle = styleName;
    this.applyStyle(styleName);
    this.saveToLocalStorage();
  }

  private saveToLocalStorage() {
    localStorage.setItem('currentDynamicStyle', this.currentStyle);
  }
}

export const dynamicThemeManager = new DynamicThemeManager();