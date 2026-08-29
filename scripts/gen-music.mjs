/**
 * 生成占位音乐（public/music/*.wav）：轻柔的五声音阶环境音景。
 * 用法：node scripts/gen-music.mjs
 * 正式使用时把 public/music 换成你自己的音频，并在 src/config.ts 配置歌单。
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SR = 22050;

function writeWav(path, samples) {
	const n = samples.length;
	const buf = Buffer.alloc(44 + n * 2);
	buf.write("RIFF", 0);
	buf.writeUInt32LE(36 + n * 2, 4);
	buf.write("WAVE", 8);
	buf.write("fmt ", 12);
	buf.writeUInt32LE(16, 16);
	buf.writeUInt16LE(1, 20); // PCM
	buf.writeUInt16LE(1, 22); // mono
	buf.writeUInt32LE(SR, 24);
	buf.writeUInt32LE(SR * 2, 28);
	buf.writeUInt16LE(2, 32);
	buf.writeUInt16LE(16, 34);
	buf.write("data", 36);
	buf.writeUInt32LE(n * 2, 40);
	for (let i = 0; i < n; i++) {
		buf.writeInt16LE(
			Math.max(-1, Math.min(1, samples[i])) * 32767 | 0,
			44 + i * 2,
		);
	}
	writeFileSync(path, buf);
	console.log("wrote", path, `${(n / SR).toFixed(1)}s`);
}

/** 五声拨弦音景：樱花落 */
function sakuraDrops(seconds = 14) {
	const n = Math.floor(SR * seconds);
	const out = new Float32Array(n);
	// A 大调五声音阶（A3 起）
	const scale = [220, 246.9, 277.2, 329.6, 370, 440, 493.9, 554.4];
	const step = SR * 0.42; // 每 0.42s 一个音
	for (let t = 0; t < step * 32; t += step) {
		const f = scale[Math.floor(Math.random() * scale.length)];
		const start = Math.floor(t);
		const dur = Math.floor(SR * 1.6);
		for (let i = 0; i < dur && start + i < n; i++) {
			const tt = i / SR;
			const env = Math.exp(-tt * 2.4) * Math.min(1, tt * 200);
			const v =
				Math.sin(2 * Math.PI * f * tt) * 0.5 +
				Math.sin(2 * Math.PI * f * 2 * tt) * 0.18 +
				Math.sin(2 * Math.PI * f * 3.01 * tt) * 0.06;
			out[start + i] += v * env * 0.22;
		}
	}
	// 轻微低频底
	for (let i = 0; i < n; i++) {
		const tt = i / SR;
		out[i] +=
			Math.sin(2 * Math.PI * 110 * tt) * 0.03 * (0.6 + 0.4 * Math.sin(tt * 0.7));
	}
	return out;
}

/** 慢 pad 和弦：夜星 */
function nightStar(seconds = 16) {
	const n = Math.floor(SR * seconds);
	const out = new Float32Array(n);
	const chords = [
		[220, 261.6, 329.6], // Am
		[174.6, 220, 261.6], // F
		[196, 246.9, 293.7], // G
		[164.8, 207.7, 246.9], // E
	];
	const chordDur = n / chords.length;
	chords.forEach((chord, ci) => {
		const start = Math.floor(ci * chordDur);
		const len = Math.floor(chordDur * 1.3);
		for (let i = 0; i < len && start + i < n; i++) {
			const tt = i / SR;
			const fade =
				Math.min(1, tt * 1.2) * Math.min(1, (len / SR - tt) * 1.2);
			let v = 0;
			for (const f of chord) {
				v += Math.sin(2 * Math.PI * f * tt) * 0.12;
				v += Math.sin(2 * Math.PI * f * 0.5 * tt) * 0.05;
			}
			out[start + i] += v * fade;
		}
	});
	return out;
}

const dir = join(process.cwd(), "public", "music");
mkdirSync(dir, { recursive: true });
writeWav(join(dir, "sakura-drops.wav"), sakuraDrops());
writeWav(join(dir, "night-star.wav"), nightStar());
console.log("done");
