import { useEffect, useState } from 'react';
import type { GameState } from '../game/types';
import { monthLabel } from '../game/economy';
import { AnimatedEmoji } from './AnimatedEmoji';
import { MoneyCounter } from './MoneyCounter';
import { STORY_CHAINS } from '../data/events';

interface VictoryScreenProps {
  state: GameState;
  onContinue: () => void;
  onRestart: () => void;
}

/** 胜利页面：通关成绩与纪念卡 */
export function VictoryScreen({ state, onContinue, onRestart }: VictoryScreenProps) {
  const [confetti, setConfetti] = useState<string[]>([]);

  useEffect(() => {
    const pieces = Array.from({ length: 24 }, (_, i) =>
      String.fromCodePoint([0x1f389, 0x1f38a, 0x2b50, 0x1f31f, 0x1fa99, 0x1f4b8][i % 6])
    );
    setConfetti(pieces);
  }, []);

  const storiesDone = state.storyCompletedChains.length;
  const totalStories = STORY_CHAINS.length;

  return (
    <div className="modal-overlay modal-overlay--visible victory-overlay" role="dialog" aria-modal="true" aria-label="通关纪念">
      <div className="confetti-layer" aria-hidden="true">
        {confetti.map((c, i) => (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${(i * 37) % 100}%`,
              animationDelay: `${(i % 8) * 0.2}s`,
              fontSize: 20 + ((i * 13) % 18),
            }}
          >
            {c}
          </span>
        ))}
      </div>
      <div className="modal victory-modal">
        <div className="victory-header">
          <AnimatedEmoji name="celebration" size={72} play="loop" />
          <h1>温暖社区 · 经营达成！</h1>
          <p>1200 套房产全部出租，月租金 ¥1,600,000，连续稳定经营 6 个月。</p>
        </div>

        <div className="victory-card">
          <div className="victory-card-row">
            <span>通关月份</span>
            <strong>{monthLabel(state.monthIndex)}</strong>
          </div>
          <div className="victory-card-row">
            <span>累计租金收入</span>
            <MoneyCounter cents={state.totalRentEarnedCents} />
          </div>
          <div className="victory-card-row">
            <span>最终现金</span>
            <MoneyCounter cents={state.cashCents} />
          </div>
          <div className="victory-card-row">
            <span>满意度</span>
            <strong>{state.satisfaction} / 100</strong>
          </div>
          <div className="victory-card-row">
            <span>已完成故事</span>
            <strong>
              {storiesDone} / {totalStories} 条故事链
            </strong>
          </div>
        </div>

        <div className="victory-memorial">
          <AnimatedEmoji name="glow-star" size={40} play="loop" />
          <strong>1200 套满租 · 6 个月连续达标纪念卡</strong>
          <small>从 8 套小房子到 1200 套温暖社区，恭喜你成为深圳大房东！</small>
        </div>

        <div className="victory-actions">
          <button type="button" className="btn btn--ghost" onClick={onRestart}>
            重新开始
          </button>
          <button type="button" className="btn btn--primary" onClick={onContinue} autoFocus>
            继续经营
          </button>
        </div>
      </div>
    </div>
  );
}
