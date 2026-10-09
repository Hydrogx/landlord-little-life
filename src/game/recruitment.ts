import {
  BASE_CANDIDATES,
  CANDIDATES_PER_PROPERTY_PERCENT,
  CONVERSION_AMENITY_BPS,
  CONVERSION_BASE_BPS,
  CONVERSION_SATISFACTION_BPS,
  MAX_CONVERSION_BPS,
  MIN_CONVERSION_BPS,
  MARKETING_PLANS,
  MAX_VACANCY_BPS,
  MIN_VACANCY_BPS,
  RENEWAL_REDUCTION_DEN,
  RENEWAL_REDUCTION_NUM,
  VACANCY_BASE_BPS,
  VACANCY_LOW_SATISFACTION_BPS,
  VACANCY_LOW_SATISFACTION_THRESHOLD,
  VACANCY_MANAGER_BPS,
} from './constants';
import type { GameState, PropertyGroup, PropertyType, RecruitmentPriority } from './types';
import { clamp, totalOccupied, totalProperties } from './economy';

// ---------- 候选租客 ----------

/** 每月基础候选租客数量 = 2 + ceil(持有房产数量 × 3%) */
export function baseCandidateCount(totalProps: number): number {
  return BASE_CANDIDATES + Math.ceil((totalProps * CANDIDATES_PER_PROPERTY_PERCENT) / 100);
}

/** 招租方案新增候选数 */
export function marketingBonusCandidates(totalProps: number, plan: GameState['marketingPlan']): number {
  if (plan === 'natural') return 0;
  return Math.ceil((totalProps * MARKETING_PLANS[plan].bonusPercent) / 100);
}

/** 本月候选租客总数 */
export function totalCandidates(state: GameState): number {
  const total = totalProperties(state.propertyGroups);
  return baseCandidateCount(total) + marketingBonusCandidates(total, state.marketingPlan);
}

/** 候选转化率（万分比） */
export function conversionBps(state: GameState): number {
  let bps = CONVERSION_BASE_BPS + state.satisfaction * CONVERSION_SATISFACTION_BPS;
  if (state.amenitiesEnabled) {
    bps += state.amenityLevel * CONVERSION_AMENITY_BPS;
  }
  return clamp(bps, MIN_CONVERSION_BPS, MAX_CONVERSION_BPS);
}

export function conversionPercent(state: GameState): number {
  return conversionBps(state) / 100;
}

/** 每月可签约人数 = floor(候选总数 × 转化率) */
export function signableThisMonth(state: GameState): number {
  return Math.floor((totalCandidates(state) * conversionBps(state)) / 10000);
}

/** 本月剩余可签约人数（手动签约会消耗，同一份候选容量不可重复使用） */
export function remainingSignable(state: GameState): number {
  return Math.max(0, signableThisMonth(state) - state.candidatesUsedThisMonth);
}

// ---------- 退租 ----------

/** 每月退租率（万分比） */
export function vacancyRateBps(state: GameState): number {
  const lowSat = Math.max(0, VACANCY_LOW_SATISFACTION_THRESHOLD - state.satisfaction);
  let bps =
    VACANCY_BASE_BPS +
    lowSat * VACANCY_LOW_SATISFACTION_BPS -
    (state.managerEnabled ? state.managerLevel * VACANCY_MANAGER_BPS : 0);
  return clamp(bps, MIN_VACANCY_BPS, MAX_VACANCY_BPS);
}

/** 每月退租数量 = floor(月初已出租数量 × 退租率)，开启续租沟通后减少 floor(原数量×30%) */
export function monthlyMoveOuts(state: GameState): number {
  const rate = vacancyRateBps(state);
  let outs = Math.floor((state.monthStartOccupied * rate) / 10000);
  if (state.renewalServiceEnabled) {
    outs = outs - Math.floor((outs * RENEWAL_REDUCTION_NUM) / RENEWAL_REDUCTION_DEN);
  }
  return outs;
}

// ---------- 分配算法（确定性） ----------

const TYPE_ORDER_BASIC_FIRST: PropertyType[] = ['basic', 'comfort', 'family'];
const TYPE_ORDER_RENT_FIRST: PropertyType[] = ['family', 'comfort', 'basic'];

function groupSortKey(g: PropertyGroup): number[] {
  // 社区升序、翻新等级降序、id 升序 → 稳定且确定
  return [g.community, -g.renovation, parseInt(g.id.split('-').pop() ?? '0', 10)];
}

/**
 * 把 n 个新签租客分配到空房。
 * 优先按房型（basic-first 或 rent-first），同房型内按社区、翻新等级排序。
 */
export function allocateSignings(
  groups: PropertyGroup[],
  count: number,
  priority: RecruitmentPriority
): PropertyGroup[] {
  const result = groups.map((g) => ({ ...g }));
  const order = priority === 'rent-first' ? TYPE_ORDER_RENT_FIRST : TYPE_ORDER_BASIC_FIRST;
  let remaining = count;
  for (const type of order) {
    if (remaining <= 0) break;
    const vacantGroups = result
      .filter((g) => g.type === type && g.occupied < g.total)
      .sort((a, b) => {
        const ka = groupSortKey(a);
        const kb = groupSortKey(b);
        for (let i = 0; i < ka.length; i++) {
          if (ka[i] !== kb[i]) return ka[i] - kb[i];
        }
        return 0;
      });
    for (const g of vacantGroups) {
      if (remaining <= 0) break;
      const space = g.total - g.occupied;
      const add = Math.min(space, remaining);
      g.occupied += add;
      remaining -= add;
    }
  }
  return result;
}

/**
 * 按现有出租数量比例分配退租（最大余数法，确定性平局按分组顺序）。
 * exact/floors 计算的是“退租数量”，剩余出租 = 原出租 - 退租。
 */
export function allocateMoveOuts(groups: PropertyGroup[], count: number): PropertyGroup[] {
  if (count <= 0) return groups.map((g) => ({ ...g }));
  const result = groups.map((g) => ({ ...g }));
  const occupied = totalOccupied(result);
  if (occupied === 0) return result;
  const clamped = Math.min(count, occupied);

  const original = result.map((g) => g.occupied);
  const exact = original.map((o) => (o * clamped) / occupied);
  const floors = exact.map((v) => Math.floor(v));
  let remaining = clamped - floors.reduce((a, b) => a + b, 0);
  result.forEach((g, i) => {
    g.occupied = original[i] - floors[i];
  });
  // 最大余数分配，平局按分组在列表中的顺序
  const byFraction = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .filter((x) => exact[x.i] > 0)
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const x of byFraction) {
    if (remaining <= 0) break;
    if (result[x.i].occupied > 0) {
      result[x.i].occupied -= 1;
      remaining -= 1;
    }
  }
  // 兜底：理论上不会执行，防御性处理
  for (const g of result) {
    if (remaining <= 0) break;
    while (g.occupied > 0 && remaining > 0) {
      g.occupied -= 1;
      remaining -= 1;
    }
  }
  return result;
}

/** 手动招租校验与执行（单套） */
export function canRecruit(state: GameState): boolean {
  return remainingSignable(state) > 0 && totalProperties(state.propertyGroups) > totalOccupied(state.propertyGroups);
}

/** 手动招租上限（本月剩余容量与空房数的较小值） */
export function maxManualRecruit(state: GameState): number {
  return Math.min(remainingSignable(state), totalProperties(state.propertyGroups) - totalOccupied(state.propertyGroups));
}
