/**
 * 无界面经营模拟：用纯函数模拟一个合理的玩家策略，
 * 验证游戏确实能够从初始状态通关（PRD §20）。
 * 不使用 localStorage，不依赖界面。
 */
import {
  countByType,
  createInitialState,
  maintenanceCostCents,
  maxPurchasable,
  totalExpensesCents,
  totalProperties,
  totalVacant,
} from './economy';
import { applySettlement, canEndMonth, computeSettlement } from './settlement';
import { applyEventChoice, getEvent, selectEventsForMonth } from './events';
import { checkAchievements, checkStoryChains } from './progression';
import { STORY_CHAINS } from '../data/events';
import { remainingSignable } from './recruitment';
import type { GameState, MaintenancePlan, MarketingPlan, PropertyType } from './types';
import { TYPE_INFO } from './constants';

export interface SimResult {
  won: boolean;
  months: number;
  state: GameState;
  log: string[];
}

/** 估算下月运营费用上界（用于保留资金） */
function estimateNextMonthOpex(state: GameState): number {
  const total = totalProperties(state.propertyGroups);
  const occupied = state.propertyGroups.reduce((s, g) => s + g.occupied, 0);
  // 城市推广 + 精细维护 + 管家3 + 配套3 + 续租
  return (
    total * (5000 + 10000 + 3000 + 1500) +
    occupied * 1000
  );
}

/** 选择事件中性价比最高的可负担选项 */
function chooseBestEventOption(state: GameState, eventId: string): string | null {
  const event = getEvent(eventId);
  if (!event) return null;
  const affordable = event.choices.filter((c) => c.costCents <= state.cashCents);
  if (affordable.length === 0) return null;
  // 评分：满意度收益优先，兼顾故事flag与费用
  let best = affordable[0];
  let bestScore = -Infinity;
  for (const choice of affordable) {
    let score = choice.satisfactionDelta * 1000 - choice.costCents / 100;
    if (choice.maintenanceDelta) score += choice.maintenanceDelta * 300;
    if (choice.nextStoryFlag) score += 500;
    if (choice.costCents === 0) score += 200;
    if (score > bestScore) {
      bestScore = score;
      best = choice;
    }
  }
  return best.id;
}

/** 购房目标房型：先基础到上限，再舒适，再家庭 */
function targetPurchaseType(state: GameState): PropertyType | null {
  const basic = countByType(state.propertyGroups, 'basic');
  const comfort = countByType(state.propertyGroups, 'comfort');
  const family = countByType(state.propertyGroups, 'family');
  if (basic < TYPE_INFO.basic.max) return 'basic';
  if (comfort < TYPE_INFO.comfort.max) return 'comfort';
  if (family < TYPE_INFO.family.max) return 'family';
  return null;
}

export function simulateGame(
  options: { maxMonths?: number; verbose?: boolean } = {}
): SimResult {
  const maxMonths = options.maxMonths ?? 240;
  const log: string[] = [];
  let state = createInitialState();
  state = { ...state, currentEventIds: selectEventsForMonth(state) };
  let months = 0;

  while (!state.hasWon && months < maxMonths) {
    months += 1;

    // 1. 处理本月事件
    for (const eventId of [...state.currentEventIds]) {
      const choiceId = chooseBestEventOption(state, eventId);
      if (!choiceId) continue;
      const result = applyEventChoice(state, eventId, choiceId);
      if (result) {
        state = result.state;
        state = checkStoryChains(state, STORY_CHAINS).newState;
      }
    }

    const total = totalProperties(state.propertyGroups);
    const vacant = totalVacant(state.propertyGroups);
    const remaining = remainingSignable(state);

    // 2. 招租方案：预算充足用城市推广，否则社区推广
    const reserve = estimateNextMonthOpex(state) * 2;
    let marketing: MarketingPlan = 'natural';
    const cityCost = total * 5000;
    const communityCost = total * 2000;
    if (state.cashCents - cityCost > reserve) marketing = 'city';
    else if (state.cashCents - communityCost > reserve) marketing = 'community';
    state = { ...state, marketingPlan: marketing };

    // 3. 手动招租：签满剩余容量
    const manual = Math.min(remaining, vacant);
    if (manual > 0) {
      // 按优先级分配（模拟中用 basic-first）
      const groups = state.propertyGroups.map((g) => ({ ...g }));
      let toAssign = manual;
      const order: PropertyType[] = ['basic', 'comfort', 'family'];
      for (const type of order) {
        for (const g of groups) {
          if (toAssign <= 0) break;
          if (g.type !== type) continue;
          const space = g.total - g.occupied;
          const add = Math.min(space, toAssign);
          g.occupied += add;
          toAssign -= add;
        }
      }
      state = {
        ...state,
        propertyGroups: groups,
        candidatesUsedThisMonth: state.candidatesUsedThisMonth + manual,
      };
    }

    // 4. 维修策略
    let maintenancePlan: MaintenancePlan = 'paused';
    const premiumCost = maintenanceCostCents({ ...state, maintenancePlan: 'premium' });
    const standardCost = maintenanceCostCents({ ...state, maintenancePlan: 'standard' });
    const economyCost = maintenanceCostCents({ ...state, maintenancePlan: 'economy' });
    if (state.cashCents - premiumCost > reserve) maintenancePlan = 'premium';
    else if (state.cashCents - standardCost > reserve) maintenancePlan = 'standard';
    else if (state.cashCents - economyCost > reserve) maintenancePlan = 'economy';
    state = { ...state, maintenancePlan };

    // 5. 续租沟通
    const renewalCost = state.monthStartOccupied * 1000;
    state = {
      ...state,
      renewalServiceEnabled: state.cashCents - renewalCost > reserve,
    };

    // 6. 管家与配套
    if (total >= 20 && state.managerLevel < 3) {
      const cost = 1_000_000 * (state.managerLevel + 1);
      if (state.cashCents - cost > reserve) {
        state = {
          ...state,
          managerLevel: state.managerLevel + 1,
          managerEnabled: true,
          cashCents: state.cashCents - cost,
        };
      }
    }
    if (state.managerLevel > 0) state = { ...state, managerEnabled: true };
    if (total >= 100 && state.amenityLevel < 3) {
      const cost = 1_500_000 * (state.amenityLevel + 1);
      if (state.cashCents - cost > reserve) {
        state = {
          ...state,
          amenityLevel: state.amenityLevel + 1,
          amenitiesEnabled: true,
          cashCents: state.cashCents - cost,
        };
      }
    }
    if (state.amenityLevel > 0) state = { ...state, amenitiesEnabled: true };

    // 7. 自动补租
    state = { ...state, autoRecruitEnabled: state.managerLevel >= 1 };

    // 8. 购房：保留运营资金后尽量多买
    const type = targetPurchaseType(state);
    if (type) {
      const max = maxPurchasable(state, type);
      if (max > 0) {
        const price = TYPE_INFO[type].priceCents;
        const affordableByBudget = Math.floor(
          Math.max(0, state.cashCents - reserve) / price
        );
        const count = Math.min(max, affordableByBudget, 50);
        if (count > 0) {
          // 直接内联购房逻辑（与 applyPurchase 一致）
          const cost = price * count;
          const groups = state.propertyGroups.map((g) => ({ ...g }));
          let totalBefore = totalProperties(groups);
          let remainingCount = count;
          while (remainingCount > 0) {
            const community = Math.min(5, Math.floor(totalBefore / 200));
            let group = groups.find(
              (g) => g.type === type && g.renovation === 0 && g.community === community
            );
            if (!group) {
              group = {
                id: `${type}-r0-c${community}-${groups.length}`,
                type,
                renovation: 0,
                community,
                total: 0,
                occupied: 0,
              };
              groups.push(group);
            }
            const spaceInCommunity =
              Math.min(totalBefore + remainingCount, (community + 1) * 200) - totalBefore;
            const add = Math.min(spaceInCommunity, remainingCount);
            group.total += add;
            totalBefore += add;
            remainingCount -= add;
          }
          state = {
            ...state,
            propertyGroups: groups,
            cashCents: state.cashCents - cost,
          };
        }
      }
    }

    // 9. 翻新：资金非常充足时翻新到 Lv.1（降低维护费）
    if (state.cashCents > reserve * 3) {
      for (const g of state.propertyGroups) {
        if (g.renovation === 0 && g.total > 0) {
          const cost = 80_000 * g.total;
          if (state.cashCents - cost > reserve * 2) {
            state = {
              ...state,
              propertyGroups: state.propertyGroups.map((x) =>
                x.id === g.id ? { ...x, renovation: 1 } : x
              ),
              cashCents: state.cashCents - cost,
            };
          }
        }
      }
    }

    // 10. 确保可以结束本月（否则逐级暂停服务）
    let guard = 0;
    while (!canEndMonth(state) && guard < 10) {
      guard += 1;
      const current = computeSettlement(state);
      if (current.endCashCents >= 0) break;
      // 优先暂停最贵的服务
      if (state.renewalServiceEnabled) {
        state = { ...state, renewalServiceEnabled: false };
      } else if (state.maintenancePlan === 'premium') {
        state = { ...state, maintenancePlan: 'standard' };
      } else if (state.maintenancePlan === 'standard') {
        state = { ...state, maintenancePlan: 'economy' };
      } else if (state.maintenancePlan === 'economy') {
        state = { ...state, maintenancePlan: 'paused' };
      } else if (state.marketingPlan === 'city') {
        state = { ...state, marketingPlan: 'community' };
      } else if (state.marketingPlan === 'community') {
        state = { ...state, marketingPlan: 'natural' };
      } else if (state.amenitiesEnabled) {
        state = { ...state, amenitiesEnabled: false };
      } else if (state.managerEnabled) {
        state = { ...state, managerEnabled: false };
      } else {
        break; // 全部暂停后仍不足（理论上不会发生）
      }
    }

    // 11. 月末结算
    const before = state.monthIndex;
    const { state: nextState, report } = applySettlement(state);
    state = { ...nextState, currentEventIds: selectEventsForMonth(nextState) };
    state = checkStoryChains(state, STORY_CHAINS).newState;
    const newAchievements = checkAchievements(state);
    if (newAchievements.length > 0) {
      state = { ...state, achievements: [...state.achievements, ...newAchievements] };
    }

    if (options.verbose && months % 6 === 0) {
      const t = totalProperties(state.propertyGroups);
      const occ = state.propertyGroups.reduce((s, g) => s + g.occupied, 0);
      log.push(
        `第${before + 1}月: 房产${t} 出租${occ} 租金¥${(report.rentCents / 100).toLocaleString()} 现金¥${(state.cashCents / 100).toLocaleString()} 满意度${state.satisfaction} 连续达标${state.consecutiveGoalMonths}`
      );
    }
  }

  return { won: state.hasWon, months, state, log };
}

export { totalExpensesCents };
