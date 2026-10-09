import { useState } from 'react';
import type { GameState } from '../../game/types';
import {
  computeSettlement,
  predictSettlement,
} from '../../game/settlement';
import {
  formatSignedYuan,
  formatYuan,
  stageOf,
  totalOccupied,
  totalProperties,
} from '../../game/economy';
import { CommunityScene } from '../CommunityScene';
import { GoalPanel } from '../GoalPanel';
import { AnimatedEmoji } from '../AnimatedEmoji';
import { MoneyCounter } from '../MoneyCounter';
import { communityName } from '../../data/communities';
import { MAX_COMMUNITIES, PROPERTIES_PER_COMMUNITY } from '../../game/constants';

interface CommunityPageProps {
  state: GameState;
  onRenameCommunity: (index: number, name: string) => void;
}

/** 社区页：经营总览、可爱场景、目标进度 */
export function CommunityPage({ state, onRenameCommunity }: CommunityPageProps) {
  const total = totalProperties(state.propertyGroups);
  const occupied = totalOccupied(state.propertyGroups);
  const occupancyRate = total === 0 ? 0 : Math.round((occupied / total) * 100);
  const prediction = predictSettlement(state);
  const net = prediction.rentCents - prediction.expenses.total;
  const stage = stageOf(total);
  const showCommunities = total >= 20;
  const communityCount = Math.min(MAX_COMMUNITIES, Math.ceil(total / PROPERTIES_PER_COMMUNITY));
  const [editingName, setEditingName] = useState<number | null>(null);
  const [nameDraft, setNameDraft] = useState('');

  void computeSettlement;

  const communities = Array.from({ length: communityCount }).map((_, i) => {
    const groups = state.propertyGroups.filter((g) => g.community === i);
    const props = groups.reduce((s, g) => s + g.total, 0);
    const occ = groups.reduce((s, g) => s + g.occupied, 0);
    const rent = groups.reduce((s, g) => s + g.occupied * ({ basic: 100000, comfort: 150000, family: 200000 } as const)[g.type], 0);
    return { index: i, props, occ, rent };
  });

  return (
    <div className="page community-page">
      <CommunityScene state={state} />

      <section className="card overview-card" aria-label="经营概览">
        <h3>
          <AnimatedEmoji name="glow-star" size={22} play="loop" />
          经营概览
        </h3>
        <div className="overview-grid">
          <div className="overview-item">
            <small>入住率</small>
            <strong>{occupancyRate}%</strong>
            <span className="overview-sub">
              {occupied} / {total} 套
            </span>
          </div>
          <div className="overview-item">
            <small>满意度</small>
            <strong>{state.satisfaction}</strong>
            <span className="overview-sub">
              {state.satisfaction >= 80 ? '租客很满意' : state.satisfaction >= 50 ? '租客认可' : '需要关注'}
            </span>
          </div>
          <div className="overview-item">
            <small>维护状态</small>
            <strong>{state.maintenance}</strong>
            <span className="overview-sub">
              {state.maintenance >= 70 ? '设施良好' : state.maintenance >= 40 ? '需要维护' : '亟需维护'}
            </span>
          </div>
          <div className="overview-item">
            <small>预计净收益</small>
            <strong className={net >= 0 ? 'net-positive' : 'net-negative'}>
              {formatSignedYuan(net)}
            </strong>
            <span className="overview-sub">本月末</span>
          </div>
        </div>
      </section>

      <section className="card" aria-label="目标进度">
        <h3>
          <AnimatedEmoji name="house" size={22} play="loop" />
          扩张进度 · {stage.name}
        </h3>
        <p className="stage-desc">{stage.desc}</p>
        <div className="goal-bar goal-bar--large">
          <div
            className="goal-bar-fill goal-bar-fill--blue"
            style={{ width: `${Math.min(100, (total / 1200) * 100)}%` }}
          />
        </div>
        <div className="progress-labels">
          <span>{total.toLocaleString()} / 1,200 套</span>
          <span>
            <MoneyCounter cents={prediction.rentCents} /> / ¥1,600,000
          </span>
        </div>
      </section>

      {total >= 1200 && <GoalPanel state={state} />}

      {showCommunities && (
        <section className="card" aria-label="社区分区">
          <h3>
            <AnimatedEmoji name="seedling" size={22} play="loop" />
            社区分区
          </h3>
          <div className="community-list">
            {communities.map((c) => (
              <div key={c.index} className="community-item">
                {editingName === c.index ? (
                  <form
                    className="community-rename"
                    onSubmit={(e) => {
                      e.preventDefault();
                      onRenameCommunity(c.index, nameDraft.trim() || communityName(c.index, state.communityNames));
                      setEditingName(null);
                    }}
                  >
                    <input
                      type="text"
                      value={nameDraft}
                      maxLength={12}
                      onChange={(e) => setNameDraft(e.target.value)}
                      aria-label="社区名称"
                      autoFocus
                    />
                    <button type="submit" className="btn btn--small btn--primary">
                      保存
                    </button>
                    <button
                      type="button"
                      className="btn btn--small btn--ghost"
                      onClick={() => setEditingName(null)}
                    >
                      取消
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="community-name"
                    onClick={() => {
                      setEditingName(c.index);
                      setNameDraft(communityName(c.index, state.communityNames));
                    }}
                    aria-label={`重命名${communityName(c.index, state.communityNames)}`}
                  >
                    {communityName(c.index, state.communityNames)} ✏️
                  </button>
                )}
                <span className="community-stats">
                  {c.props} 套 · 出租 {c.occ} · {formatYuan(c.rent)}/月
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
