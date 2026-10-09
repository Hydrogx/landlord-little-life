import { useEffect, useState } from 'react';
import type { SettlementResult } from '../game/types';
import { monthLabel } from '../game/economy';
import { formatYuan, formatSignedYuan } from '../game/economy';
import { AnimatedEmoji } from './AnimatedEmoji';
import { MoneyCounter } from './MoneyCounter';
import { GOAL_CONSECUTIVE_MONTHS, GOAL_RENT_CENTS, GOAL_PROPERTIES } from '../game/constants';

interface MonthReportModalProps {
  reportIndex: number;
  result: SettlementResult;
  consecutive: number;
  onClose: () => void;
}

/**
 * 经营月报弹窗。
 * 结算数据在动画开始前已经完成并存档，这里只呈现结果。
 */
export function MonthReportModal({ reportIndex, result, consecutive, onClose }: MonthReportModalProps) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = window.setTimeout(() => setVisible(true), 30);
    const t2 = window.setTimeout(() => setStep(1), 350);
    const t3 = window.setTimeout(() => setStep(2), 700);
    const t4 = window.setTimeout(() => setStep(3), 1050);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
    };
  }, []);

  const net = result.rentCents - result.expenses.total;

  return (
    <div className={`modal-overlay ${visible ? 'modal-overlay--visible' : ''}`} role="dialog" aria-modal="true" aria-label="经营月报">
      <div className="modal month-report">
        <div className="month-report-header">
          <AnimatedEmoji name="celebration" size={40} play="once" />
          <h2>{monthLabel(reportIndex)} · 经营月报</h2>
        </div>

        <div className="month-report-rent">
          <small>本月租金收入</small>
          <MoneyCounter cents={result.rentCents} className="month-report-rent-value" durationMs={1000} />
          {result.goalMet && (
            <span className="month-report-goal-badge">
              <AnimatedEmoji name="star" size={18} play="loop" />
              达标！连续 {consecutive} / {GOAL_CONSECUTIVE_MONTHS} 个月
            </span>
          )}
        </div>

        <div className={`month-report-grid ${step >= 1 ? 'month-report-grid--visible' : ''}`}>
          <div className="report-cell">
            <small>退租</small>
            <strong>{result.moveOuts} 套</strong>
          </div>
          <div className="report-cell">
            <small>手动签约</small>
            <strong>{result.manualSignings} 套</strong>
          </div>
          <div className="report-cell">
            <small>自动补租</small>
            <strong>{result.autoFilled} 套</strong>
          </div>
          <div className="report-cell">
            <small>月末出租</small>
            <strong>{result.endOccupied.toLocaleString()} 套</strong>
          </div>
        </div>

        <div className={`month-report-expenses ${step >= 2 ? 'month-report-grid--visible' : ''}`}>
          <h4>运营支出 {formatYuan(result.expenses.total)}</h4>
          <ul>
            <li>
              <span>维护</span>
              <span>{formatYuan(result.expenses.maintenance)}</span>
            </li>
            <li>
              <span>招租推广</span>
              <span>{formatYuan(result.expenses.marketing)}</span>
            </li>
            <li>
              <span>管家</span>
              <span>{formatYuan(result.expenses.manager)}</span>
            </li>
            <li>
              <span>社区配套</span>
              <span>{formatYuan(result.expenses.amenity)}</span>
            </li>
            <li>
              <span>续租沟通</span>
              <span>{formatYuan(result.expenses.renewal)}</span>
            </li>
          </ul>
        </div>

        <div className={`month-report-satisfaction ${step >= 3 ? 'month-report-grid--visible' : ''}`}>
          <h4>满意度与维护</h4>
          <div className="satisfaction-deltas">
            {result.satisfactionChanges.length === 0 ? (
              <span className="satisfaction-neutral">本月满意度无变化</span>
            ) : (
              result.satisfactionChanges.map((c, i) => (
                <span key={i} className={`satisfaction-delta ${c.delta >= 0 ? 'satisfaction-delta--up' : 'satisfaction-delta--down'}`}>
                  {c.reason} {c.delta >= 0 ? '+' : ''}
                  {c.delta}
                </span>
              ))
            )}
          </div>
          <div className="report-endstate">
            <span>满意度 <strong>{result.endSatisfaction}</strong>/100</span>
            <span>维护 <strong>{result.endMaintenance}</strong>/100</span>
          </div>
        </div>

        <div className="month-report-footer">
          <div className="report-net">
            <small>净收益</small>
            <strong className={net >= 0 ? 'report-net--positive' : 'report-net--negative'}>
              {formatSignedYuan(net)}
            </strong>
          </div>
          <button type="button" className="btn btn--primary" onClick={onClose} autoFocus>
            进入下个月
          </button>
        </div>
      </div>
    </div>
  );
}

export { GOAL_PROPERTIES, GOAL_RENT_CENTS };
