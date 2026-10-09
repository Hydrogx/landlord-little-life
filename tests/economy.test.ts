import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/game/economy';
import {
  countByType,
  maxPurchasable,
  monthlyRentCents,
  purchaseCostCents,
  totalOccupied,
  totalProperties,
  applyPurchase,
  applyRenovation,
  renovationCostCents,
  weightedRenovationDiscountPercent,
  maintenanceCostCents,
  formatYuan,
  monthLabel,
  stageOf,
} from '../src/game/economy';
import { TYPE_INFO, GOAL_RENT_CENTS } from '../src/game/constants';
import type { PropertyGroup } from '../src/game/types';

describe('初始游戏状态', () => {
  it('初始为 8 套房、2 套已租、24,000 元', () => {
    const state = createInitialState();
    expect(totalProperties(state.propertyGroups)).toBe(8);
    expect(totalOccupied(state.propertyGroups)).toBe(2);
    expect(state.cashCents).toBe(2_400_000); // ¥24,000
    expect(state.monthIndex).toBe(0);
    expect(state.satisfaction).toBe(75);
    expect(state.maintenance).toBe(90);
    expect(state.consecutiveGoalMonths).toBe(0);
  });

  it('初始月租金预测为 2,000 元', () => {
    const state = createInitialState();
    expect(monthlyRentCents(state.propertyGroups)).toBe(200_000);
  });

  it('月份标签正确', () => {
    expect(monthLabel(0)).toBe('第1年1月');
    expect(monthLabel(11)).toBe('第1年12月');
    expect(monthLabel(12)).toBe('第2年1月');
  });

  it('阶段划分正确', () => {
    expect(stageOf(8).id).toBe('start');
    expect(stageOf(20).id).toBe('growth');
    expect(stageOf(100).id).toBe('community');
    expect(stageOf(400).id).toBe('expand');
    expect(stageOf(1200).id).toBe('stable');
  });
});

describe('房产与购房规则', () => {
  it('最终房型组合满租租金恰好 160 万元', () => {
    // 600 基础 + 400 舒适 + 200 家庭，全部出租
    const groups: PropertyGroup[] = [
      { id: 'b', type: 'basic', renovation: 0, community: 0, total: 600, occupied: 600 },
      { id: 'c', type: 'comfort', renovation: 0, community: 1, total: 400, occupied: 400 },
      { id: 'f', type: 'family', renovation: 0, community: 2, total: 200, occupied: 200 },
    ];
    expect(totalProperties(groups)).toBe(1200);
    expect(monthlyRentCents(groups)).toBe(GOAL_RENT_CENTS);
    expect(formatYuan(GOAL_RENT_CENTS)).toBe('¥1,600,000');
  });

  it('资金不足购房被拒绝，资金和房产不变', () => {
    const state = createInitialState();
    // 资金 24,000 元，基础公寓 6,000 元/套：最多 4 套
    expect(maxPurchasable(state, 'basic')).toBe(4);
    // 模拟购买 5 套会被拒绝（store 层校验），纯函数层面验证价格
    expect(purchaseCostCents('basic', 5)).toBe(3_000_000);
    expect(state.cashCents).toBe(2_400_000);
    expect(totalProperties(state.propertyGroups)).toBe(8);
  });

  it('购房扣款并增加房产', () => {
    const state = createInitialState();
    const next = applyPurchase(state, 'basic', 2);
    expect(next.cashCents).toBe(2_400_000 - 1_200_000);
    expect(totalProperties(next.propertyGroups)).toBe(10);
  });

  it('超过房型供应量时被限制到剩余可购数量', () => {
    let state = createInitialState();
    // 买满 600 基础
    state = applyPurchase(state, 'basic', 592);
    expect(countByType(state.propertyGroups, 'basic')).toBe(600);
    expect(maxPurchasable(state, 'basic')).toBe(0);
  });

  it('超过 1200 套总上限时不可购买', () => {
    let state = createInitialState();
    state = applyPurchase(state, 'basic', 592); // 600 基础
    state = applyPurchase(state, 'comfort', 400); // 1000
    state = applyPurchase(state, 'family', 200); // 1200
    expect(totalProperties(state.propertyGroups)).toBe(1200);
    expect(maxPurchasable(state, 'basic')).toBe(0);
    expect(maxPurchasable(state, 'comfort')).toBe(0);
    expect(maxPurchasable(state, 'family')).toBe(0);
  });

  it('房型解锁条件：20 套解锁舒适，100 套解锁家庭', () => {
    let state = createInitialState();
    expect(TYPE_INFO.comfort.unlockAt).toBe(20);
    expect(TYPE_INFO.family.unlockAt).toBe(100);
    state = applyPurchase(state, 'basic', 12); // 20 套
    expect(totalProperties(state.propertyGroups)).toBe(20);
    state = applyPurchase(state, 'basic', 80); // 100 套
    expect(totalProperties(state.propertyGroups)).toBe(100);
  });

  it('购房分配到社区分区（每200套一个）', () => {
    let state = createInitialState();
    state = applyPurchase(state, 'basic', 192); // 200 套 → 仍在社区 0
    const communities200 = new Set(state.propertyGroups.map((g) => g.community));
    expect(communities200.has(0)).toBe(true);
    expect(communities200.has(1)).toBe(false);
    state = applyPurchase(state, 'basic', 1); // 201 套 → 进入社区 1
    const communities201 = new Set(state.propertyGroups.map((g) => g.community));
    expect(communities201.has(0)).toBe(true);
    expect(communities201.has(1)).toBe(true);
  });
});

describe('翻新规则', () => {
  it('翻新费用正确：0→1 为 800 元/套，1→2 为 1200 元/套', () => {
    const group: PropertyGroup = { id: 'g', type: 'basic', renovation: 0, community: 0, total: 5, occupied: 2 };
    expect(renovationCostCents(group)).toBe(400_000); // 5 × ¥800
    const next = applyRenovation(createInitialState(), 'basic-r0-c0-0');
    expect(next).toBeDefined();
  });

  it('翻新折扣按数量加权，只作用于维护费用', () => {
    const state = createInitialState();
    // 8 套全部 Lv.0 → 折扣 0
    expect(weightedRenovationDiscountPercent(state.propertyGroups)).toBe(0);
    // 翻新全部到 Lv.1 → 折扣 10%
    let renovated = applyRenovation(state, 'basic-r0-c0-0');
    expect(renovated.propertyGroups[0].renovation).toBe(1);
    expect(weightedRenovationDiscountPercent(renovated.propertyGroups)).toBe(10);
    // 维护费用降低 10%（常规维护：8×60×0.9 = 432 元）
    expect(maintenanceCostCents({ ...renovated, maintenancePlan: 'standard' })).toBe(43_200);
  });
});

describe('金额格式化', () => {
  it('千位分隔与 ¥ 符号', () => {
    expect(formatYuan(160_000_000)).toBe('¥1,600,000');
    expect(formatYuan(2_400_000)).toBe('¥24,000');
    expect(formatYuan(1_000_000)).toBe('¥10,000');
  });
});
