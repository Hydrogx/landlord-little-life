import { useState } from 'react';
import type { GameState } from '../../game/types';
import { monthLabel, formatYuan } from '../../game/economy';
import { ACHIEVEMENT_DEFS } from '../../game/progression';
import { AnimatedEmoji } from '../AnimatedEmoji';

interface RecordsPageProps {
  state: GameState;
}

/** 记录页：月报、收入趋势、成就 */
export function RecordsPage({ state }: RecordsPageProps) {
  const [expandedReport, setExpandedReport] = useState<number | null>(null);
  const recentReports = [...state.reports].reverse();
  const trend = [...state.reports].slice(-12);
  const maxRent = Math.max(1, ...trend.map((r) => r.rentCents));

  return (
    <div className="page records-page">
      <section className="card" aria-label="收入趋势">
        <h3>
          <AnimatedEmoji name="money" size={22} play="loop" />
          最近 12 个月收入
        </h3>
        {trend.length === 0 ? (
          <p className="card-hint">还没有月报数据，完成第一个月后即可查看。</p>
        ) : (
          <div className="income-chart" role="img" aria-label="最近12个月租金收入柱状图">
            {trend.map((r) => (
              <div key={r.monthIndex} className="chart-col">
                <div
                  className="chart-bar"
                  style={{ height: `${Math.max(4, (r.rentCents / maxRent) * 100)}%` }}
                  title={`${monthLabel(r.monthIndex)}：${formatYuan(r.rentCents)}`}
                />
                <small className="chart-label">
                  {r.monthIndex % 12 + 1}月
                </small>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card" aria-label="月报记录">
        <h3>
          <AnimatedEmoji name="glow-star" size={22} play="loop" />
          经营月报
        </h3>
        {recentReports.length === 0 ? (
          <p className="card-hint">还没有月报。点击「结束本月」完成第一个月。</p>
        ) : (
          <div className="report-list">
            {recentReports.map((r) => {
              const expanded = expandedReport === r.monthIndex;
              return (
                <div key={r.monthIndex} className={`report-item ${expanded ? 'report-item--expanded' : ''}`}>
                  <button
                    type="button"
                    className="report-item-header"
                    onClick={() => setExpandedReport(expanded ? null : r.monthIndex)}
                    aria-expanded={expanded}
                  >
                    <span>{monthLabel(r.monthIndex)}</span>
                    <span className="report-item-rent">{formatYuan(r.rentCents)}</span>
                    <span className="report-item-net">
                      净 {formatYuan(r.rentCents - r.expensesCents)}
                    </span>
                    <span aria-hidden="true">{expanded ? '▲' : '▼'}</span>
                  </button>
                  {expanded && (
                    <div className="report-item-detail">
                      <div>
                        <small>租金收入</small>
                        <span>{formatYuan(r.rentCents)}</span>
                      </div>
                      <div>
                        <small>运营支出</small>
                        <span>{formatYuan(r.expensesCents)}</span>
                      </div>
                      <div>
                        <small>退租 / 签约 / 补租</small>
                        <span>
                          {r.moveOuts} / {r.manualSignings} / {r.autoFilled}
                        </span>
                      </div>
                      <div>
                        <small>月末出租</small>
                        <span>{r.endOccupied} 套</span>
                      </div>
                      <div>
                        <small>月末资金</small>
                        <span>{formatYuan(r.endCashCents)}</span>
                      </div>
                      <div>
                        <small>满意度 / 维护</small>
                        <span>
                          {r.endSatisfaction} / {r.endMaintenance}
                        </span>
                      </div>
                      {r.goalMet && (
                        <div className="report-goal-badge">
                          ⭐ 终局达标 · 连续 {r.consecutiveGoalMonths} 个月
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card" aria-label="成就">
        <h3>
          <AnimatedEmoji name="celebration" size={22} play="loop" />
          成就
          <span className="card-sub">
            {state.achievements.length} / {ACHIEVEMENT_DEFS.length}
          </span>
        </h3>
        <div className="achievement-grid">
          {ACHIEVEMENT_DEFS.map((a) => {
            const earned = state.achievements.includes(a.id);
            return (
              <div
                key={a.id}
                className={`achievement-card ${earned ? 'achievement-card--earned' : ''}`}
              >
                <span className="achievement-emoji" aria-hidden="true">
                  {earned ? a.emoji : '🔒'}
                </span>
                <strong>{a.name}</strong>
                <small>{a.desc}</small>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
