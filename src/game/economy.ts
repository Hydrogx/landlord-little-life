import {
  AMENITY_MAX_LEVEL,
  AMENITY_MONTHLY_PER_PROPERTY_CENTS,
  AMENITY_UPGRADE_COST_PER_LEVEL_CENTS,
  DEFAULT_COMMUNITY_NAMES,
  GOAL_PROPERTIES,
  INITIAL_CASH_CENTS,
  INITIAL_MAINTENANCE,
  INITIAL_PROPERTIES,
  INITIAL_RENTED,
  INITIAL_SATISFACTION,
  MANAGER_MAX_LEVEL,
  MANAGER_MONTHLY_PER_PROPERTY_CENTS,
  MANAGER_UPGRADE_COST_PER_LEVEL_CENTS,
  MAINTENANCE_PLANS,
  MARKETING_PLANS,
  MAX_COMMUNITIES,
  PROPERTIES_PER_COMMUNITY,
  RENEWAL_COST_PER_OCCUPIED_CENTS,
  RENOVATION_DISCOUNT_PERCENT,
  RENOVATION_UPGRADE_COSTS_CENTS,
  SAVE_VERSION,
  TYPE_INFO,
} from './constants';
import type {
  GameState,
  PropertyGroup,
  PropertyType,
  RenovationLevel,
} from './types';
import { nextSeed } from './rng';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// ---------- 房产统计 ----------

export function totalProperties(groups: PropertyGroup[]): number {
  let sum = 0;
  for (const g of groups) sum += g.total;
  return sum;
}

export function totalOccupied(groups: PropertyGroup[]): number {
  let sum = 0;
  for (const g of groups) sum += g.occupied;
  return sum;
}

export function totalVacant(groups: PropertyGroup[]): number {
  return totalProperties(groups) - totalOccupied(groups);
}

export function countByType(groups: PropertyGroup[], type: PropertyType): number {
  let sum = 0;
  for (const g of groups) if (g.type === type) sum += g.total;
  return sum;
}

export function occupiedByType(groups: PropertyGroup[], type: PropertyType): number {
  let sum = 0;
  for (const g of groups) if (g.type === type) sum += g.occupied;
  return sum;
}

/** 当前月租金收入（分） */
export function monthlyRentCents(groups: PropertyGroup[]): number {
  let sum = 0;
  for (const g of groups) sum += g.occupied * TYPE_INFO[g.type].rentCents;
  return sum;
}

/** 月租金预测 = 按当前出租状态计算的租金（月末结算可能因退租/补租变化，预测使用结算模型） */
export function currentRentCents(state: GameState): number {
  return monthlyRentCents(state.propertyGroups);
}

// ---------- 房型解锁 ----------

export function isTypeUnlocked(totalProps: number, type: PropertyType): boolean {
  return totalProps >= TYPE_INFO[type].unlockAt;
}

export function unlockedTypes(totalProps: number): PropertyType[] {
  return (Object.keys(TYPE_INFO) as PropertyType[]).filter((t) =>
    isTypeUnlocked(totalProps, t)
  );
}

// ---------- 购房 ----------

export function purchaseCostCents(type: PropertyType, count: number): number {
  return TYPE_INFO[type].priceCents * count;
}

/** 剩余可购数量：受资金、房型供应上限、1200总上限约束 */
export function maxPurchasable(state: GameState, type: PropertyType): number {
  const total = totalProperties(state.propertyGroups);
  const byType = countByType(state.propertyGroups, type);
  const byBudget = Math.floor(state.cashCents / TYPE_INFO[type].priceCents);
  return Math.max(
    0,
    Math.min(TYPE_INFO[type].max - byType, GOAL_PROPERTIES - total, byBudget)
  );
}

/** 为新购房产分配社区（每200套一个社区，最多6个，确定性分配） */
function communityForIndex(globalIndex: number): number {
  return Math.min(MAX_COMMUNITIES - 1, Math.floor(globalIndex / PROPERTIES_PER_COMMUNITY));
}

/** 执行购房（调用前必须校验资金与上限） */
export function applyPurchase(
  state: GameState,
  type: PropertyType,
  count: number
): GameState {
  if (count <= 0) return state;
  const groups = state.propertyGroups.map((g) => ({ ...g }));
  let total = totalProperties(groups);
  let remaining = count;
  while (remaining > 0) {
    const community = communityForIndex(total);
    // 同一 (type, renovation=0, community) 的组合并
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
      Math.min(total + remaining, (community + 1) * PROPERTIES_PER_COMMUNITY) - total;
    const add = Math.min(spaceInCommunity, remaining);
    group.total += add;
    total += add;
    remaining -= add;
  }
  return {
    ...state,
    propertyGroups: groups,
    cashCents: state.cashCents - purchaseCostCents(type, count),
    achievements: maybeAddAchievement(state, 'first-purchase'),
  };
}

// ---------- 翻新 ----------

export function renovationCostCents(group: PropertyGroup): number {
  if (group.renovation >= 2) return 0;
  return RENOVATION_UPGRADE_COSTS_CENTS[group.renovation] * group.total;
}

export function canRenovate(group: PropertyGroup): boolean {
  return group.renovation < 2 && group.total > 0;
}

/** 翻新单个分组（调用前校验资金） */
export function applyRenovation(state: GameState, groupId: string): GameState {
  const groups = state.propertyGroups.map((g) => {
    if (g.id !== groupId || g.renovation >= 2) return g;
    return { ...g, renovation: (g.renovation + 1) as RenovationLevel };
  });
  const target = state.propertyGroups.find((g) => g.id === groupId);
  if (!target) return state;
  return {
    ...state,
    propertyGroups: groups,
    cashCents: state.cashCents - renovationCostCents(target),
  };
}

/** 批量翻新某房型所有未达目标等级的分组（调用前校验资金） */
export function applyRenovationBatch(
  state: GameState,
  type: PropertyType,
  targetLevel: RenovationLevel
): GameState {
  let cost = 0;
  const groups = state.propertyGroups.map((g) => {
    if (g.type !== type || g.renovation >= targetLevel) return g;
    // 逐级计费
    for (let lvl = g.renovation; lvl < targetLevel; lvl++) {
      cost += RENOVATION_UPGRADE_COSTS_CENTS[lvl] * g.total;
    }
    return { ...g, renovation: targetLevel };
  });
  return { ...state, propertyGroups: groups, cashCents: state.cashCents - cost };
}

export function batchRenovationCostCents(
  groups: PropertyGroup[],
  type: PropertyType,
  targetLevel: RenovationLevel
): number {
  let cost = 0;
  for (const g of groups) {
    if (g.type !== type || g.renovation >= targetLevel) continue;
    for (let lvl = g.renovation; lvl < targetLevel; lvl++) {
      cost += RENOVATION_UPGRADE_COSTS_CENTS[lvl] * g.total;
    }
  }
  return cost;
}

/** 翻新折扣：按各组房源数量加权（百分比整数） */
export function weightedRenovationDiscountPercent(groups: PropertyGroup[]): number {
  const total = totalProperties(groups);
  if (total === 0) return 0;
  const weighted = groups.reduce(
    (sum, g) => sum + g.total * RENOVATION_DISCOUNT_PERCENT[g.renovation],
    0
  );
  return Math.floor(weighted / total);
}

// ---------- 维护费用 ----------

export function maintenanceCostCents(state: GameState): number {
  const plan = MAINTENANCE_PLANS[state.maintenancePlan];
  if (plan.costPerPropertyCents === 0) return 0;
  const total = totalProperties(state.propertyGroups);
  const base = total * plan.costPerPropertyCents;
  const discount = weightedRenovationDiscountPercent(state.propertyGroups);
  return Math.floor((base * (100 - discount)) / 100);
}

export function marketingCostCents(state: GameState): number {
  const total = totalProperties(state.propertyGroups);
  return total * MARKETING_PLANS[state.marketingPlan].costPerPropertyCents;
}

export function managerCostCents(state: GameState): number {
  if (!state.managerEnabled || state.managerLevel === 0) return 0;
  return (
    totalProperties(state.propertyGroups) *
    state.managerLevel *
    MANAGER_MONTHLY_PER_PROPERTY_CENTS
  );
}

export function amenityCostCents(state: GameState): number {
  if (!state.amenitiesEnabled || state.amenityLevel === 0) return 0;
  return (
    totalProperties(state.propertyGroups) *
    state.amenityLevel *
    AMENITY_MONTHLY_PER_PROPERTY_CENTS
  );
}

export function renewalCostCents(state: GameState): number {
  if (!state.renewalServiceEnabled) return 0;
  return state.monthStartOccupied * RENEWAL_COST_PER_OCCUPIED_CENTS;
}

export function totalExpensesCents(state: GameState): number {
  return (
    maintenanceCostCents(state) +
    marketingCostCents(state) +
    managerCostCents(state) +
    amenityCostCents(state) +
    renewalCostCents(state)
  );
}

// ---------- 管家与配套升级 ----------

export function managerUpgradeCostCents(nextLevel: number): number {
  return MANAGER_UPGRADE_COST_PER_LEVEL_CENTS * nextLevel;
}

export function amenityUpgradeCostCents(nextLevel: number): number {
  return AMENITY_UPGRADE_COST_PER_LEVEL_CENTS * nextLevel;
}

// ---------- 初始状态 ----------

export function createInitialState(): GameState {
  const groups: PropertyGroup[] = [
    {
      id: 'basic-r0-c0-0',
      type: 'basic',
      renovation: 0,
      community: 0,
      total: INITIAL_PROPERTIES,
      occupied: INITIAL_RENTED,
    },
  ];
  return {
    saveVersion: SAVE_VERSION,
    monthIndex: 0,
    cashCents: INITIAL_CASH_CENTS,
    propertyGroups: groups,
    satisfaction: INITIAL_SATISFACTION,
    maintenance: INITIAL_MAINTENANCE,
    managerLevel: 0,
    amenityLevel: 0,
    managerEnabled: false,
    amenitiesEnabled: false,
    marketingPlan: 'natural',
    maintenancePlan: 'standard',
    renewalServiceEnabled: false,
    autoRecruitEnabled: false,
    recruitmentPriority: 'basic-first',
    monthStartOccupied: INITIAL_RENTED,
    candidatesUsedThisMonth: 0,
    currentEventIds: [],
    resolvedEventIds: [],
    storyFlags: [],
    storyCompletedChains: [],
    consecutiveGoalMonths: 0,
    hasWon: false,
    totalRentEarnedCents: 0,
    reports: [],
    achievements: [],
    rngSeed: 20240101,
    tutorialStep: 0,
    lastEventResults: [],
    communityNames: [...DEFAULT_COMMUNITY_NAMES],
    preferences: { soundEnabled: false, reducedMotion: false },
  };
}

function maybeAddAchievement(state: GameState, id: string): string[] {
  if (state.achievements.includes(id)) return state.achievements;
  return [...state.achievements, id];
}

// ---------- 展示格式化 ----------

/** 分 → "¥1,600,000" */
export function formatYuan(cents: number): string {
  const yuan = Math.floor(cents / 100);
  return '¥' + yuan.toLocaleString('en-US').replace(/,/g, ',');
}

/** 分 → 带符号的元（用于增减） */
export function formatSignedYuan(cents: number): string {
  const sign = cents > 0 ? '+' : cents < 0 ? '-' : '';
  const abs = Math.abs(Math.floor(cents / 100));
  return `${sign}¥${abs.toLocaleString('en-US')}`;
}

export function monthLabel(monthIndex: number): string {
  const year = Math.floor(monthIndex / 12) + 1;
  const month = (monthIndex % 12) + 1;
  return `第${year}年${month}月`;
}

export type StageId = 'start' | 'growth' | 'community' | 'expand' | 'stable';

export interface StageInfo {
  id: StageId;
  name: string;
  min: number;
  max: number;
  desc: string;
}

export const STAGES: StageInfo[] = [
  { id: 'start', name: '起步', min: 0, max: 19, desc: '基础招租、房型分组、租客故事' },
  { id: 'growth', name: '成长', min: 20, max: 99, desc: '舒适公寓、批量操作、管家' },
  { id: 'community', name: '社区', min: 100, max: 399, desc: '家庭公寓、社区配套、候补招租' },
  { id: 'expand', name: '扩张', min: 400, max: 1199, desc: '社区分区总览、批量购买' },
  { id: 'stable', name: '稳定经营', min: 1200, max: Infinity, desc: '6个月终局挑战' },
];

export function stageOf(totalProps: number): StageInfo {
  for (const s of STAGES) {
    if (totalProps >= s.min && totalProps <= s.max) return s;
  }
  return STAGES[STAGES.length - 1];
}
