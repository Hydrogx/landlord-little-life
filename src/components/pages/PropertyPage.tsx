import { useState } from 'react';
import type { GameState, PropertyType, RenovationLevel } from '../../game/types';
import {
  batchRenovationCostCents,
  countByType,
  formatYuan,
  occupiedByType,
  purchaseCostCents,
  totalProperties,
} from '../../game/economy';
import { PROPERTY_TYPES, PURCHASE_QUICK_COUNTS, TYPE_INFO } from '../../game/constants';
import { AnimatedEmoji } from '../AnimatedEmoji';
import { ConfirmDialog } from '../ConfirmDialog';
import { maxPurchasable } from '../../game/economy';

interface PropertyPageProps {
  state: GameState;
  onBuy: (type: PropertyType, count: number) => { ok: boolean; error?: string };
  onRenovateGroup: (groupId: string) => { ok: boolean; error?: string };
  onRenovateType: (type: PropertyType, target: RenovationLevel) => { ok: boolean; error?: string };
  onRecruitGroup: (groupId: string) => { ok: boolean; error?: string };
  onRecruitAuto: (count: number) => { ok: boolean; error?: string };
  notify: (message: string, kind?: 'info' | 'error' | 'success') => void;
}

/** 房产页：房型数量、购房、批量翻新、招租 */
export function PropertyPage({
  state,
  onBuy,
  onRenovateGroup,
  onRenovateType,
  onRecruitGroup,
  onRecruitAuto,
  notify,
}: PropertyPageProps) {
  const total = totalProperties(state.propertyGroups);
  const [buyType, setBuyType] = useState<PropertyType | null>(null);
  const [buyCount, setBuyCount] = useState(1);
  const [renovateConfirm, setRenovateConfirm] = useState<{ type: PropertyType; target: RenovationLevel } | null>(null);

  const handleBuy = (type: PropertyType, count: number) => {
    const result = onBuy(type, count);
    if (!result.ok) {
      notify(result.error ?? '购买失败', 'error');
      return;
    }
    notify(`已购买 ${count} 套${TYPE_INFO[type].name}`, 'success');
    setBuyType(null);
  };

  return (
    <div className="page property-page">
      <section className="card" aria-label="购房市场">
        <h3>
          <AnimatedEmoji name="house" size={22} play="loop" />
          购房市场
          <span className="card-sub">持有 {total.toLocaleString()} / 1,200 套</span>
        </h3>
        <div className="property-type-grid">
          {PROPERTY_TYPES.map((type) => {
            const info = TYPE_INFO[type];
            const unlocked = total >= info.unlockAt;
            const owned = countByType(state.propertyGroups, type);
            const occupied = occupiedByType(state.propertyGroups, type);
            const max = maxPurchasable(state, type);
            return (
              <div
                key={type}
                className={`property-type-card ${unlocked ? '' : 'property-type-card--locked'}`}
                style={{ ['--type-color' as string]: info.color }}
              >
                <div className="property-type-header">
                  <span className="property-type-emoji" aria-hidden="true">
                    {info.emoji}
                  </span>
                  <div>
                    <strong>{info.name}</strong>
                    <small>{info.desc}</small>
                  </div>
                </div>
                {unlocked ? (
                  <>
                    <div className="property-type-stats">
                      <span>
                        持有 <strong>{owned}</strong> / {info.max}
                      </span>
                      <span>
                        出租 <strong>{occupied}</strong>
                      </span>
                      <span>
                        月租 <strong>{formatYuan(info.rentCents)}</strong>
                      </span>
                      <span>
                        单价 <strong>{formatYuan(info.priceCents)}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn--primary btn--block"
                      disabled={max <= 0}
                      onClick={() => {
                        setBuyType(type);
                        setBuyCount(Math.max(1, Math.min(10, max)));
                      }}
                    >
                      {max > 0 ? '购买' : '不可购买'}
                    </button>
                    {max > 0 && max < 10 && (
                      <small className="property-max-hint">最多可购 {max} 套</small>
                    )}
                  </>
                ) : (
                  <p className="property-lock-hint">
                    🔒 持有 {info.unlockAt} 套房产后解锁（当前 {total} 套）
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="card" aria-label="房源分组">
        <h3>
          <AnimatedEmoji name="sparkles" size={22} play="loop" />
          房源分组
          <span className="card-sub">
            空置 {state.propertyGroups.reduce((s, g) => s + (g.total - g.occupied), 0)} 套
          </span>
        </h3>
        <div className="recruit-quick">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => {
              const result = onRecruitAuto(999);
              if (!result.ok) notify(result.error ?? '招租失败', 'error');
              else if (result.error) notify(result.error, 'success');
            }}
          >
            一键招租（按优先级）
          </button>
        </div>
        <div className="group-list">
          {state.propertyGroups.map((g) => {
            const info = TYPE_INFO[g.type];
            const vacant = g.total - g.occupied;
            const renovationCost =
              g.renovation < 2
                ? ([80_000, 120_000][g.renovation] ?? 0) * g.total
                : 0;
            const canAffordRenovation = state.cashCents >= renovationCost;
            return (
              <div key={g.id} className="group-item">
                <div className="group-info">
                  <span className="group-type" style={{ ['--type-color' as string]: info.color }}>
                    {info.emoji} {info.name}
                  </span>
                  <span className="group-meta">
                    社区{state.communityNames[g.community] ?? g.community + 1} · 翻新 Lv.{g.renovation}
                  </span>
                </div>
                <div className="group-stats">
                  <span>
                    {g.occupied}/{g.total} 套
                  </span>
                  <div className="group-occupied-bar" role="img" aria-label={`出租率 ${Math.round((g.occupied / Math.max(1, g.total)) * 100)}%`}>
                    <div
                      className="group-occupied-fill"
                      style={{ width: `${(g.occupied / Math.max(1, g.total)) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="group-actions">
                  {vacant > 0 && (
                    <button
                      type="button"
                      className="btn btn--small btn--secondary"
                      onClick={() => {
                        const result = onRecruitGroup(g.id);
                        if (!result.ok) notify(result.error ?? '招租失败', 'error');
                        else notify(`已签入 1 位租客`, 'success');
                      }}
                    >
                      招租
                    </button>
                  )}
                  {g.renovation < 2 ? (
                    <button
                      type="button"
                      className="btn btn--small btn--ghost"
                      disabled={!canAffordRenovation}
                      onClick={() => {
                        const result = onRenovateGroup(g.id);
                        if (!result.ok) notify(result.error ?? '翻新失败', 'error');
                        else notify(`翻新完成（Lv.${g.renovation + 1}）`, 'success');
                      }}
                      title={`费用 ${formatYuan(renovationCost)}`}
                    >
                      翻新 {formatYuan(renovationCost)}
                    </button>
                  ) : (
                    <span className="group-maxed">✨ 已翻新</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card" aria-label="批量翻新">
        <h3>
          <AnimatedEmoji name="bulb" size={22} play="loop" />
          批量翻新
        </h3>
        <p className="card-hint">翻新降低维护费用（Lv.1 -10%，Lv.2 -20%），不增加租金。</p>
        <div className="batch-renovate-list">
          {PROPERTY_TYPES.map((type) => {
            const info = TYPE_INFO[type];
            if (total < info.unlockAt) return null;
            const groups = state.propertyGroups.filter((g) => g.type === type && g.renovation < 2);
            if (groups.length === 0) {
              return (
                <div key={type} className="batch-item batch-item--done">
                  <span>
                    {info.emoji} {info.name}
                  </span>
                  <span>全部已达最高翻新等级</span>
                </div>
              );
            }
            const nextTarget: RenovationLevel = (Math.min(...groups.map((g) => g.renovation)) + 1) as RenovationLevel;
            const units = groups.reduce((s, g) => s + g.total, 0);
            const cost = batchRenovationCostCents(state.propertyGroups, type, nextTarget);
            return (
              <div key={type} className="batch-item">
                <div>
                  <strong>
                    {info.emoji} {info.name}
                  </strong>
                  <small>
                    {groups.length} 个分组 · {units} 套 → Lv.{nextTarget}
                  </small>
                </div>
                <button
                  type="button"
                  className="btn btn--small btn--secondary"
                  disabled={state.cashCents < cost}
                  onClick={() => setRenovateConfirm({ type, target: nextTarget })}
                >
                  批量翻新 {formatYuan(cost)}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {buyType && (
        <BuyDialog
          type={buyType}
          count={buyCount}
          state={state}
          max={maxPurchasable(state, buyType)}
          onCountChange={setBuyCount}
          onConfirm={(count) => {
            handleBuy(buyType, count);
          }}
          onClose={() => setBuyType(null)}
        />
      )}

      {renovateConfirm && (
        <BatchRenovateDialog
          type={renovateConfirm.type}
          target={renovateConfirm.target}
          state={state}
          onConfirm={() => {
            const result = onRenovateType(renovateConfirm.type, renovateConfirm.target);
            if (!result.ok) notify(result.error ?? '翻新失败', 'error');
            else notify('批量翻新完成', 'success');
            setRenovateConfirm(null);
          }}
          onCancel={() => setRenovateConfirm(null)}
        />
      )}
    </div>
  );
}

function BuyDialog({
  type,
  count,
  state,
  max,
  onCountChange,
  onConfirm,
  onClose,
}: {
  type: PropertyType;
  count: number;
  state: GameState;
  max: number;
  onCountChange: (n: number) => void;
  onConfirm: (n: number) => void;
  onClose: () => void;
}) {
  const info = TYPE_INFO[type];
  const cost = purchaseCostCents(type, count);
  const affordable = state.cashCents >= cost;
  const income = info.rentCents * count;

  return (
    <div className="modal-overlay modal-overlay--visible" role="dialog" aria-modal="true" aria-label={`购买${info.name}`}>
      <div className="modal">
        <h3>
          {info.emoji} 购买 {info.name}
        </h3>
        <div className="buy-quantity">
          {PURCHASE_QUICK_COUNTS.map((n) => (
            <button
              key={n}
              type="button"
              className={`btn btn--small ${count === n ? 'btn--primary' : 'btn--ghost'}`}
              disabled={n > max}
              onClick={() => onCountChange(n)}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            className={`btn btn--small ${count === max ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => onCountChange(max)}
          >
            最大 ({max})
          </button>
        </div>
        <div className="buy-summary">
          <div>
            <small>数量</small>
            <strong>{count} 套</strong>
          </div>
          <div>
            <small>单价</small>
            <strong>{formatYuan(info.priceCents)}</strong>
          </div>
          <div>
            <small>总价</small>
            <strong>{formatYuan(cost)}</strong>
          </div>
          <div>
            <small>购买后资金</small>
            <strong className={affordable ? '' : 'net-negative'}>
              {formatYuan(state.cashCents - cost)}
            </strong>
          </div>
          <div>
            <small>预计新增满租收入</small>
            <strong>{formatYuan(income)}/月</strong>
          </div>
        </div>
        {!affordable && (
          <p className="buy-shortfall" role="alert">
            资金不足，还差 {formatYuan(cost - state.cashCents)}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!affordable || count <= 0}
            onClick={() => onConfirm(count)}
          >
            确认购买
          </button>
        </div>
      </div>
    </div>
  );
}

function BatchRenovateDialog({
  type,
  target,
  state,
  onConfirm,
  onCancel,
}: {
  type: PropertyType;
  target: RenovationLevel;
  state: GameState;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const info = TYPE_INFO[type];
  const groups = state.propertyGroups.filter((g) => g.type === type && g.renovation < target);
  const units = groups.reduce((s, g) => s + g.total, 0);
  const cost = batchRenovationCostCents(state.propertyGroups, type, target);
  const affordable = state.cashCents >= cost;

  return (
    <div className="modal-overlay modal-overlay--visible" role="dialog" aria-modal="true" aria-label="批量翻新">
      <div className="modal">
        <h3>✨ 批量翻新 {info.name}</h3>
        <p>
          {groups.length} 个分组 · {units} 套 → 翻新 Lv.{target}
        </p>
        <div className="buy-summary">
          <div>
            <small>总费用</small>
            <strong>{formatYuan(cost)}</strong>
          </div>
          <div>
            <small>维护折扣</small>
            <strong>Lv.{target === 1 ? '1：每组 -10%' : '2：每组 -20%'}</strong>
          </div>
          <div>
            <small>购买后资金</small>
            <strong className={affordable ? '' : 'net-negative'}>
              {formatYuan(state.cashCents - cost)}
            </strong>
          </div>
        </div>
        {!affordable && (
          <p className="buy-shortfall" role="alert">
            资金不足，还差 {formatYuan(cost - state.cashCents)}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="btn btn--primary" disabled={!affordable} onClick={onConfirm}>
            确认翻新
          </button>
        </div>
      </div>
    </div>
  );
}
