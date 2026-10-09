import { useMemo } from 'react';
import type { GameState } from '../game/types';
import { predictSettlement } from '../game/settlement';
import { formatYuan, formatSignedYuan } from '../game/economy';
import { AnimatedEmoji } from './AnimatedEmoji';
import { playSound } from './SoundManager';

interface EndMonthBarProps {
  state: GameState;
  onEndMonth: () => void;
  onApplyBasicOps: () => void;
  onPauseAll: () => void;
}

/** 固定月末操作栏：预测摘要 + 结束本月 */
export function EndMonthBar({ state, onEndMonth, onApplyBasicOps, onPauseAll }: EndMonthBarProps) {
  const prediction = useMemo(() => predictSettlement(state), [state]);
  const canEnd = prediction.endCashCents >= 0;
  const gap = canEnd ? 0 : -prediction.endCashCents;
  const net = prediction.rentCents - prediction.expenses.total;

  const handleEnd = () => {
    if (!canEnd) {
      playSound('error');
      return;
    }
    playSound('coin');
    onEndMonth();
  };

  return (
    <div className={`endmonth-bar ${canEnd ? '' : 'endmonth-bar--blocked'}`} role="region" aria-label="月末结算">
      <div className="endmonth-summary">
        <div className="endmonth-cell">
          <small>预计收入</small>
          <strong className="endmonth-income">{formatYuan(prediction.rentCents)}</strong>
        </div>
        <div className="endmonth-cell">
          <small>预计支出</small>
          <strong className="endmonth-expense">{formatYuan(prediction.expenses.total)}</strong>
        </div>
        <div className="endmonth-cell">
          <small>预计结余</small>
          <strong className={net >= 0 ? 'endmonth-net' : 'endmonth-net endmonth-net--negative'}>
            {formatSignedYuan(net)}
          </strong>
        </div>
        <div className="endmonth-cell">
          <small>月末资金</small>
          <strong>{formatYuan(prediction.endCashCents)}</strong>
        </div>
      </div>
      <div className="endmonth-actions">
        {!canEnd && (
          <div className="endmonth-warning" role="alert">
            <AnimatedEmoji name="smile-soft" size={20} play="once" />
            预测资金缺口 {formatYuan(gap)}，请调整运营方案
          </div>
        )}
        <div className="endmonth-buttons">
          {!canEnd && (
            <>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={onApplyBasicOps}
              >
                调整为基础运营
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={onPauseAll}
              >
                暂停全部服务
              </button>
            </>
          )}
          <button
            type="button"
            className={`btn btn--primary btn--endmonth ${canEnd ? '' : 'btn--disabled'}`}
            onClick={handleEnd}
            disabled={!canEnd}
            aria-disabled={!canEnd}
          >
            结束本月
            <AnimatedEmoji name="coin" size={22} play="once" />
          </button>
        </div>
      </div>
    </div>
  );
}
