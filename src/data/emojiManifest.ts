/**
 * 动态 Emoji 素材清单。
 * 素材来源：Noto Emoji Animation (https://googlefonts.github.io/noto-emoji-animation/)
 * 动画资源为 512px 动画 WebP，由 Google Fonts Noto Emoji 提供。
 * 许可证：Noto Emoji 图像资源 — Apache License 2.0；字体 — SIL OFL 1.1。
 * 详见 ASSET_LICENSES.md。
 *
 * 加载失败时自动降级为静态 Emoji + CSS 动画，功能不受影响。
 */
export interface EmojiAsset {
  name: string;
  /** 本地动画 WebP 路径（相对 public） */
  webp: string;
  /** 静态降级 Emoji */
  fallback: string;
  /** 可访问标签 */
  label: string;
}

export const EMOJI_ASSETS: EmojiAsset[] = [
  { name: 'coin', webp: 'emoji/anim_1fa99.webp', fallback: '🪙', label: '金币' },
  { name: 'money', webp: 'emoji/anim_1f4b8.webp', fallback: '💸', label: '收入' },
  { name: 'celebration', webp: 'emoji/anim_1f389.webp', fallback: '🎉', label: '庆祝' },
  { name: 'confetti', webp: 'emoji/anim_1f38a.webp', fallback: '🎊', label: '彩纸' },
  { name: 'house', webp: 'emoji/anim_1f3e0.webp', fallback: '🏠', label: '房屋' },
  { name: 'sparkles', webp: 'emoji/anim_2728.webp', fallback: '✨', label: '闪光' },
  { name: 'wave', webp: 'emoji/anim_1f44b.webp', fallback: '👋', label: '挥手' },
  { name: 'smile', webp: 'emoji/anim_1f604.webp', fallback: '😄', label: '开心' },
  { name: 'smile-soft', webp: 'emoji/anim_1f60a.webp', fallback: '😊', label: '微笑' },
  { name: 'bulb', webp: 'emoji/anim_1f4a1.webp', fallback: '💡', label: '灯泡' },
  { name: 'seedling', webp: 'emoji/anim_1f331.webp', fallback: '🌱', label: '新芽' },
  { name: 'star', webp: 'emoji/anim_2b50.webp', fallback: '⭐', label: '星星' },
  { name: 'glow-star', webp: 'emoji/anim_1f31f.webp', fallback: '🌟', label: '亮星' },
  { name: 'handshake', webp: 'emoji/anim_1f91d.webp', fallback: '🤝', label: '握手' },
];

const byName = new Map(EMOJI_ASSETS.map((a) => [a.name, a]));

export function getEmojiAsset(name: string): EmojiAsset {
  return byName.get(name) ?? { name, webp: '', fallback: '😀', label: name };
}
