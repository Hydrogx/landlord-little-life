import type { GameState, MaintenancePlan, MarketingPlan, RecruitmentPriority } from '../../game/types';
import {
  formatYuan,
  maintenanceCostCents,
  totalProperties,
} from '../../game/economy';
import {
  amenityCostCents,
  managerCostCents,
  marketingCostCents,
  renewalCostCents,
  totalExpensesCents,
} from '../../game/economy';
import {
  AMENITY_MAX_LEVEL,
  MANAGER_MAX_LEVEL,
  MARKETING_PLANS,
  MAINTENANCE_PLANS,
} from '../../game/constants';
import {
  conversionPercent,
  remainingSignable,
  signableThisMonth,
  totalCandidates,
} from '../../game/recruitment';
import { AnimatedEmoji } from '../AnimatedEmoji';

interface ManagementPageProps {
  state: GameState;
  onSetMarketing: (plan: MarketingPlan) => void;
  onSetMaintenance: (plan: MaintenancePlan) => void;
  onSetRenewal: (enabled: boolean) => void;
  onSetAutoRecruit: (enabled: boolean) => { ok: boolean; error?: string };
  onSetPriority: (priority: RecruitmentPriority) => void;
  onToggleManager: (enabled: boolean) => void;
  onToggleAmenities: (enabled: boolean) => void;
  onUpgradeManager: () => { ok: boolean; error?: string };
  onUpgradeAmenity: () => { ok: boolean; error?: string };
  notify: (message: string, kind?: 'info' | 'error' | 'success') => void;
}

/** 经营页：招租、维修、管家、配套、续租策略 */
export function ManagementPage({
  state,
  onSetMarketing,
  onSetMaintenance,
  onSetRenewal,
  onSetAutoRecruit,
  onSetPriority,
  onToggleManager,
  onToggleAmenities,
  onUpgradeManager,
  onUpgradeAmenity,
  notify,
}: ManagementPageProps) {
  const total = totalProperties(state.propertyGroups);
  const candidates = totalCandidates(state);
  const conversion = conversionPercent(state);
  const signable = signableThisMonth(state);
  const remaining = remainingSignable(state);
  const expenses = totalExpensesCents(state);

  return (
    <div className="page management-page">
      <section className="card" aria-label="本月候选租客">
        <h3>
          <AnimatedEmoji name="handshake" size={22} play="loop" />
          本月候选池
        </h3>
        <div className="candidate-pool">
          <div className="candidate-stat">
            <small>候选租客</small>
            <strong>{candidates} 人</strong>
            <span>基础 2 + 房产×3%{state.marketingPlan !== 'natural' ? ` + 推广×${MARKETING_PLANS[state.marketingPlan].bonusPercent}%` : ''}</span>
          </div>
          <div className="candidate-stat">
            <small>转化率</small>
            <strong>{conversion.toFixed(0)}%</strong>
            <span>60% + 满意度×0.4%{state.amenitiesEnabled ? ` + 配套×3%` : ''}</span>
          </div>
          <div className="candidate-stat">
            <small>本月可签约</small>
            <strong>{signable} 人</strong>
            <span>已用 {state.candidatesUsedThisMonth} · 剩余 {remaining}</span>
          </div>
        </div>
      </section>

      <section className="card" aria-label="招租方案">
        <h3>
          <AnimatedEmoji name="money" size={22} play="loop" />
          招租方案
        </h3>
        <div className="plan-grid">
          {(Object.keys(MARKETING_PLANS) as MarketingPlan[]).map((plan) => {
            const info = MARKETING_PLANS[plan];
            const cost = total * info.costPerPropertyCents;
            const active = state.marketingPlan === plan;
            return (
              <button
                key={plan}
                type="button"
                className={`plan-card ${active ? 'plan-card--active' : ''}`}
                onClick={() => onSetMarketing(plan)}
                aria-pressed={active}
              >
                <strong>{info.name}</strong>
                <small>{info.desc}</small>
                <span>
                  {plan === 'natural'
                    ? '免费'
                    : `${formatYuan(cost)}/月`}
                </span>
                {info.bonusPercent > 0 && (
                  <span className="plan-bonus">候选 +{info.bonusPercent}%</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card" aria-label="维修策略">
        <h3>
          <AnimatedEmoji name="bulb" size={22} play="loop" />
          维修策略
        </h3>
        <p className="card-hint">
          当前维护费用：{formatYuan(maintenanceCostCents(state))}/月（含翻新折扣）
        </p>
        <div className="plan-grid">
          {(Object.keys(MAINTENANCE_PLANS) as MaintenancePlan[]).map((plan) => {
            const info = MAINTENANCE_PLANS[plan];
            const cost = plan === 'paused' ? 0 : total * info.costPerPropertyCents;
            const active = state.maintenancePlan === plan;
            return (
              <button
                key={plan}
                type="button"
                className={`plan-card ${active ? 'plan-card--active' : ''}`}
                onClick={() => onSetMaintenance(plan)}
                aria-pressed={active}
              >
                <strong>{info.name}</strong>
                <small>{info.desc}</small>
                <span>{plan === 'paused' ? '免费' : `${formatYuan(cost)}/月`}</span>
                {plan !== 'paused' && (
                  <span className="plan-bonus">
                    月末维护 +{info.recovery}
                    {info.satisfactionBonus > 0 ? ` · 满意度 +${info.satisfactionBonus}` : ''}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card" aria-label="服务开关">
        <h3>
          <AnimatedEmoji name="sparkles" size={22} play="loop" />
          服务与策略
        </h3>
        <div className="service-list">
          <ServiceToggle
            title="提前续租沟通"
            desc={`退租减少 30% · 费用 ${formatYuan(renewalCostCents(state))}/月（按月初出租数×¥10）`}
            enabled={state.renewalServiceEnabled}
            onChange={onSetRenewal}
          />
          <ServiceToggle
            title="自动补租"
            desc="月末用剩余候选租客自动填补空房（需管家 Lv.1+）"
            enabled={state.autoRecruitEnabled}
            disabled={state.managerLevel < 1}
            disabledReason={state.managerLevel < 1 ? '需要管家 Lv.1' : undefined}
            onChange={(enabled) => {
              const result = onSetAutoRecruit(enabled);
              if (!result.ok) notify(result.error ?? '操作失败', 'error');
            }}
          />
          <div className="service-item">
            <div className="service-text">
              <strong>招租分配优先级</strong>
              <small>空房补租与一键招租时的房型顺序</small>
            </div>
            <div className="segmented" role="group" aria-label="招租分配优先级">
              <button
                type="button"
                className={state.recruitmentPriority === 'basic-first' ? 'segmented-item segmented-item--active' : 'segmented-item'}
                onClick={() => onSetPriority('basic-first')}
                aria-pressed={state.recruitmentPriority === 'basic-first'}
              >
                优先基础
              </button>
              <button
                type="button"
                className={state.recruitmentPriority === 'rent-first' ? 'segmented-item segmented-item--active' : 'segmented-item'}
                onClick={() => onSetPriority('rent-first')}
                aria-pressed={state.recruitmentPriority === 'rent-first'}
              >
                优先高租金
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="card" aria-label="管家">
        <h3>
          <AnimatedEmoji name="smile-soft" size={22} play="loop" />
          管家系统
          <span className="card-sub">Lv.{state.managerLevel} / {MANAGER_MAX_LEVEL}</span>
        </h3>
        <p className="card-hint">
          每级降低退租率 0.3% · Lv.1 解锁自动补租 · 月费 {formatYuan(managerCostCents(state))}
        </p>
        <div className="level-row">
          <div className="level-dots" aria-label={`管家等级 ${state.managerLevel}`}>
            {Array.from({ length: MANAGER_MAX_LEVEL }).map((_, i) => (
              <span key={i} className={`level-dot ${i < state.managerLevel ? 'level-dot--lit' : ''}`} />
            ))}
          </div>
          <ServiceToggle
            title={state.managerEnabled ? '管家服务中' : '管家已暂停'}
            desc={state.managerEnabled ? '正常提供效果并收费' : '暂停后不收费、不提供效果'}
            enabled={state.managerEnabled}
            disabled={state.managerLevel === 0}
            disabledReason={state.managerLevel === 0 ? '尚未升级' : undefined}
            onChange={onToggleManager}
            compact
          />
          {state.managerLevel < MANAGER_MAX_LEVEL && (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                const result = onUpgradeManager();
                if (!result.ok) notify(result.error ?? '升级失败', 'error');
                else notify(`管家升级到 Lv.${state.managerLevel + 1}`, 'success');
              }}
            >
              升级到 Lv.{state.managerLevel + 1}（{formatYuan(1_000_000 * (state.managerLevel + 1))}）
            </button>
          )}
        </div>
      </section>

      <section className="card" aria-label="社区配套">
        <h3>
          <AnimatedEmoji name="seedling" size={22} play="loop" />
          社区配套
          <span className="card-sub">Lv.{state.amenityLevel} / {AMENITY_MAX_LEVEL}</span>
        </h3>
        <p className="card-hint">
          每级提高招租转化率 3% · 每月满意度 +{state.amenityLevel} · 月费 {formatYuan(amenityCostCents(state))}
        </p>
        <div className="level-row">
          <div className="level-dots" aria-label={`社区配套等级 ${state.amenityLevel}`}>
            {Array.from({ length: AMENITY_MAX_LEVEL }).map((_, i) => (
              <span key={i} className={`level-dot ${i < state.amenityLevel ? 'level-dot--lit' : ''}`} />
            ))}
          </div>
          <ServiceToggle
            title={state.amenitiesEnabled ? '配套运营中' : '配套已暂停'}
            desc={state.amenitiesEnabled ? '正常提供效果并收费' : '暂停后不收费、不提供效果'}
            enabled={state.amenitiesEnabled}
            disabled={state.amenityLevel === 0}
            disabledReason={state.amenityLevel === 0 ? '尚未升级' : undefined}
            onChange={onToggleAmenities}
            compact
          />
          {state.amenityLevel < AMENITY_MAX_LEVEL && (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                const result = onUpgradeAmenity();
                if (!result.ok) notify(result.error ?? '升级失败', 'error');
                else notify(`社区配套升级到 Lv.${state.amenityLevel + 1}`, 'success');
              }}
            >
              升级到 Lv.{state.amenityLevel + 1}（{formatYuan(1_500_000 * (state.amenityLevel + 1))}）
            </button>
          )}
        </div>
      </section>

      <section className="card" aria-label="本月运营费用">
        <h3>本月运营费用合计</h3>
        <div className="expense-breakdown">
          <div>
            <span>维护</span>
            <span>{formatYuan(maintenanceCostCents(state))}</span>
          </div>
          <div>
            <span>招租推广</span>
            <span>{formatYuan(marketingCostCents(state))}</span>
          </div>
          <div>
            <span>管家</span>
            <span>{formatYuan(managerCostCents(state))}</span>
          </div>
          <div>
            <span>社区配套</span>
            <span>{formatYuan(amenityCostCents(state))}</span>
          </div>
          <div>
            <span>续租沟通</span>
            <span>{formatYuan(renewalCostCents(state))}</span>
          </div>
          <div className="expense-total">
            <strong>合计</strong>
            <strong>{formatYuan(expenses)}/月</strong>
          </div>
        </div>
      </section>
    </div>
  );
}

function ServiceToggle({
  title,
  desc,
  enabled,
  onChange,
  disabled = false,
  disabledReason,
  compact = false,
}: {
  title: string;
  desc: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  disabledReason?: string;
  compact?: boolean;
}) {
  return (
    <div className={`service-item ${compact ? 'service-item--compact' : ''}`}>
      <div className="service-text">
        <strong>{title}</strong>
        <small>{disabledReason ?? desc}</small>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={title}
        className={`toggle ${enabled ? 'toggle--on' : ''} ${disabled ? 'toggle--disabled' : ''}`}
        disabled={disabled}
        onClick={() => onChange(!enabled)}
      >
        <span className="toggle-knob" />
      </button>
    </div>
  );
}
