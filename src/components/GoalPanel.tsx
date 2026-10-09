import { goalPanelData } from '../game/progression';
import { formatYuan } from '../game/economy';
import { AnimatedEmoji } from './AnimatedEmoji';
import { GOAL_CONSECUTIVE_MONTHS } from '../game/constants';
import type { GameState } from '../game/types';

/** 终局挑战面板：1200套满租 + 160万租金 + 连续6个月 */
export function GoalPanel({ state }: { state: GameState }) {
  const data = goalPanelData(state);
  const dots = Array.from({ length: GOAL_CONSECUTIVE_MONTHS });

  return (
    <section className="card goal-panel" aria-label="终局挑战">
      <h3>
        <AnimatedEmoji name="star" size={24} play="loop" />
        温暖社区稳定经营挑战
      </h3>
      <div className="goal-rows">
        <div className="goal-row">
          <span>房产</span>
          <strong>
            {data.properties.toLocaleString()} / {data.propertiesGoal.toLocaleString()}
          </strong>
          <div className="goal-bar">
            <div
              className="goal-bar-fill goal-bar-fill--blue"
              style={{ width: `${Math.min(100, (data.properties / data.propertiesGoal) * 100)}%` }}
            />
          </div>
        </div>
        <div className="goal-row">
          <span>出租</span>
          <strong>
            {data.rented.toLocaleString()} / {data.rentedGoal.toLocaleString()}
          </strong>
          <div className="goal-bar">
            <div
              className="goal-bar-fill goal-bar-fill--green"
              style={{ width: `${Math.min(100, (data.rented / data.rentedGoal) * 100)}%` }}
            />
          </div>
        </div>
        <div className="goal-row">
          <span>本月租金</span>
          <strong>
            {formatYuan(data.rentCents)} / {formatYuan(data.rentGoalCents)}
          </strong>
          <div className="goal-bar">
            <div
              className="goal-bar-fill goal-bar-fill--gold"
              style={{ width: `${Math.min(100, (data.rentCents / data.rentGoalCents) * 100)}%` }}
            />
          </div>
        </div>
      </div>
      <div className="goal-consecutive">
        <span>连续达标：</span>
        <span className="goal-dots" aria-label={`已连续达标 ${data.consecutive} 个月`}>
          {dots.map((_, i) => (
            <span
              key={i}
              className={`goal-dot ${i < data.consecutive ? 'goal-dot--lit' : ''}`}
              aria-hidden="true"
            >
              {i < data.consecutive ? '●' : '○'}
            </span>
          ))}
        </span>
        <strong>
          {data.consecutive} / {data.consecutiveGoal} 个月
        </strong>
      </div>
      {!data.active && (
        <p className="goal-hint">持有 1200 套房产后开始终局挑战。</p>
      )}
    </section>
  );
}
