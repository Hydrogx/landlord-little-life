import type { GameState } from '../game/types';
import { monthLabel, totalOccupied, totalProperties, currentRentCents } from '../game/economy';
import { formatYuan } from '../game/economy';
import { MoneyCounter } from './MoneyCounter';
import { AnimatedEmoji } from './AnimatedEmoji';

interface TopBarProps {
  state: GameState;
}

/** 顶部状态栏：月份、资金、房产数、出租数、租金预测 */
export function TopBar({ state }: TopBarProps) {
  const total = totalProperties(state.propertyGroups);
  const occupied = totalOccupied(state.propertyGroups);
  const rent = currentRentCents(state);

  return (
    <header className="topbar">
      <div className="topbar-row">
        <div className="topbar-item topbar-item--month">
          <AnimatedEmoji name="glow-star" size={20} play="loop" />
          <span>{monthLabel(state.monthIndex)}</span>
        </div>
        <div className="topbar-item topbar-item--cash">
          <AnimatedEmoji name="coin" size={20} play="loop" />
          <MoneyCounter cents={state.cashCents} className="topbar-cash" />
        </div>
        <div className="topbar-item">
          <AnimatedEmoji name="house" size={20} play="loop" />
          <span>
            {total.toLocaleString()} 套
            <small className="topbar-sub">出租 {occupied}</small>
          </span>
        </div>
        <div className="topbar-item">
          <AnimatedEmoji name="money" size={20} play="loop" />
          <span>
            {formatYuan(rent)}
            <small className="topbar-sub">月租金</small>
          </span>
        </div>
        <div className="topbar-item topbar-item--meters">
          <span
            className="meter"
            role="img"
            aria-label={`满意度 ${state.satisfaction}`}
          >
            <span className="meter-icon" aria-hidden="true">
              {state.satisfaction >= 80 ? '😊' : state.satisfaction >= 50 ? '🙂' : '😟'}
            </span>
            <span className="meter-value">{state.satisfaction}</span>
            <small className="topbar-sub">满意度</small>
          </span>
          <span
            className="meter"
            role="img"
            aria-label={`维护状态 ${state.maintenance}`}
          >
            <span className="meter-icon" aria-hidden="true">
              {state.maintenance >= 70 ? '🔧' : state.maintenance >= 40 ? '🪛' : '⚠️'}
            </span>
            <span className="meter-value">{state.maintenance}</span>
            <small className="topbar-sub">维护</small>
          </span>
        </div>
      </div>
    </header>
  );
}
