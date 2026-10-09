import { useEffect, useRef, useState } from 'react';
import { formatYuan } from '../game/economy';

interface MoneyCounterProps {
  cents: number;
  className?: string;
  /** 数字动效时长（毫秒），0 或减少动效时禁用 */
  durationMs?: number;
}

/** 金额计数动效：变化时从旧值平滑递增到新值 */
export function MoneyCounter({ cents, className = '', durationMs = 700 }: MoneyCounterProps) {
  const [display, setDisplay] = useState(cents);
  const fromRef = useRef(cents);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = fromRef.current;
    if (from === cents) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || durationMs <= 0) {
      fromRef.current = cents;
      setDisplay(cents);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = Math.round(from + (cents - from) * eased);
      setDisplay(value);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = cents;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [cents, durationMs]);

  return (
    <span className={`money-counter ${className}`} aria-label={formatYuan(cents)}>
      {formatYuan(display)}
    </span>
  );
}
