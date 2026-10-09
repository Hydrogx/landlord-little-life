import { useEffect, useRef, useState } from 'react';
import { getEmojiAsset } from '../data/emojiManifest';

export type EmojiPlayMode = 'once' | 'loop' | 'hover';

interface AnimatedEmojiProps {
  name: string;
  size?: number;
  play?: EmojiPlayMode;
  fallback?: string;
  label?: string;
  /** once 模式播放时长（毫秒） */
  onceDurationMs?: number;
  className?: string;
}

/** 同屏循环动画上限（PRD §15：最多6个） */
const MAX_SIMULTANEOUS_LOOPS = 6;
const activeLoops = new Set<number>();
let loopIdCounter = 0;

let reducedMotionMedia: MediaQueryList | null = null;
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
}

/**
 * 动态 Emoji 组件。
 * 优先加载本地动画 WebP（Noto Emoji Animation 素材），
 * 失败或减少动效时降级为静态 Emoji + CSS 动画。
 */
export function AnimatedEmoji({
  name,
  size = 48,
  play = 'once',
  fallback,
  label,
  onceDurationMs = 1400,
  className = '',
}: AnimatedEmojiProps) {
  const asset = getEmojiAsset(name);
  const emoji = fallback ?? asset.fallback;
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [onceDone, setOnceDone] = useState(false);
  const [inView, setInView] = useState(true);
  const [loopActive, setLoopActive] = useState(false);
  const idRef = useRef<number>(0);
  const reducedMotion = useReducedMotion();

  const wantsAnimation =
    !reducedMotion &&
    (play === 'loop' || play === 'once' || (play === 'hover' && hovering)) &&
    !failed;

  // loop 模式：注册同屏计数与视口暂停
  useEffect(() => {
    if (play !== 'loop') return;
    const id = ++loopIdCounter;
    idRef.current = id;
    if (activeLoops.size < MAX_SIMULTANEOUS_LOOPS) {
      activeLoops.add(id);
      setLoopActive(true);
    } else {
      setLoopActive(false);
    }
    return () => {
      if (activeLoops.delete(id)) {
        // 腾出名额后不需要主动唤醒其他组件，下一帧自然重渲染
      }
    };
  }, [play]);

  // once 模式：播放指定时长后回到静态
  useEffect(() => {
    if (play !== 'once' || reducedMotion || failed) return;
    const timer = window.setTimeout(() => setOnceDone(true), onceDurationMs);
    return () => window.clearTimeout(timer);
  }, [play, onceDurationMs, reducedMotion, failed]);

  // 视口检测：离开视口暂停循环动画
  useEffect(() => {
    if (play !== 'loop') return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => setInView(entries[0]?.isIntersecting ?? true),
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [play]);

  const containerRef = useRef<HTMLSpanElement>(null);

  const showWebp =
    wantsAnimation &&
    asset.webp !== '' &&
    (play === 'loop' ? loopActive && inView : true) &&
    (play === 'once' ? !onceDone : true);

  const ariaLabel = label ?? asset.label ?? emoji;

  return (
    <span
      ref={containerRef}
      className={`animated-emoji animated-emoji--${play} ${className}`}
      style={{ width: size, height: size, fontSize: size }}
      role="img"
      aria-label={ariaLabel}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
    >
      {showWebp ? (
        <img
          src={asset.webp}
          alt=""
          aria-hidden="true"
          width={size}
          height={size}
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          style={{ width: size, height: size, opacity: loaded ? 1 : 0 }}
        />
      ) : (
        <span aria-hidden="true" className={reducedMotion ? undefined : 'emoji-css-anim'}>
          {emoji}
        </span>
      )}
    </span>
  );
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => reducedMotionMedia?.matches ?? false);
  useEffect(() => {
    if (!reducedMotionMedia) return;
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    reducedMotionMedia.addEventListener?.('change', handler);
    return () => reducedMotionMedia?.removeEventListener?.('change', handler);
  }, []);
  return reduced;
}
