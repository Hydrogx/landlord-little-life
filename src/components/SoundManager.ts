/**
 * 轻量音效：WebAudio 合成，无需音频文件。
 * 默认关闭，用户在设置中主动开启后播放。
 */

let audioCtx: AudioContext | null = null;
let enabled = false;

export function setSoundEnabled(value: boolean): void {
  enabled = value;
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

function tone(freq: number, durationMs: number, type: OscillatorType = 'sine', gain = 0.08): void {
  const ctx = getCtx();
  if (!ctx || !enabled) return;
  try {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // 忽略音频错误
  }
}

export type SoundName = 'click' | 'coin' | 'success' | 'error' | 'movein' | 'win';

export function playSound(name: SoundName): void {
  if (!enabled) return;
  switch (name) {
    case 'click':
      tone(660, 60, 'sine', 0.04);
      break;
    case 'coin':
      tone(880, 90, 'square', 0.05);
      window.setTimeout(() => tone(1320, 120, 'square', 0.05), 70);
      break;
    case 'success':
      tone(523, 100, 'sine', 0.06);
      window.setTimeout(() => tone(659, 100, 'sine', 0.06), 90);
      window.setTimeout(() => tone(784, 160, 'sine', 0.06), 180);
      break;
    case 'error':
      tone(220, 180, 'sawtooth', 0.05);
      break;
    case 'movein':
      tone(740, 80, 'triangle', 0.06);
      window.setTimeout(() => tone(988, 120, 'triangle', 0.06), 80);
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) =>
        window.setTimeout(() => tone(f, 220, 'triangle', 0.07), i * 140)
      );
      break;
  }
}
