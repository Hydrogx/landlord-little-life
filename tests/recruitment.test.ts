import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/game/economy';
import {
  baseCandidateCount,
  conversionBps,
  marketingBonusCandidates,
  maxManualRecruit,
  monthlyMoveOuts,
  remainingSignable,
  signableThisMonth,
  totalCandidates,
  vacancyRateBps,
  allocateMoveOuts,
  allocateSignings,
} from '../src/game/recruitment';
import type { GameState } from '../src/game/types';

describe('候选租客规则', () => {
  it('基础候选数 = 2 + ceil(持有房产 × 3%)', () => {
    expect(baseCandidateCount(8)).toBe(3); // 2 + ceil(0.24)
    expect(baseCandidateCount(100)).toBe(5); // 2 + 3
    expect(baseCandidateCount(1200)).toBe(38); // 2 + 36
  });

  it('招租方案新增候选数', () => {
    expect(marketingBonusCandidates(100, 'natural')).toBe(0);
    expect(marketingBonusCandidates(100, 'community')).toBe(2); // ceil(100×2%)
    expect(marketingBonusCandidates(100, 'city')).toBe(5); // ceil(100×5%)
  });

  it('初始状态候选总数为 3', () => {
    const state = createInitialState();
    expect(totalCandidates(state)).toBe(3);
  });

  it('转化率公式与上下限', () => {
    const state = createInitialState();
    // 60% + 75×0.4% = 90%
    expect(conversionBps(state)).toBe(9000);
    // 满意度 100 → 100%
    expect(conversionBps({ ...state, satisfaction: 100 })).toBe(10000);
    // 满意度 0 → 下限 60%
    expect(conversionBps({ ...state, satisfaction: 0 })).toBe(6000);
    // 配套 Lv.3 开启：60% + 100×0.4% + 3×3% = 100%（上限）
    expect(
      conversionBps({ ...state, satisfaction: 100, amenityLevel: 3, amenitiesEnabled: true })
    ).toBe(10000);
  });

  it('每月可签约人数 = floor(候选 × 转化率)', () => {
    const state = createInitialState();
    // 3 候选 × 90% = 2.7 → 2
    expect(signableThisMonth(state)).toBe(2);
  });

  it('候选池重复使用：手动签约后剩余容量减少', () => {
    let state = createInitialState();
    expect(remainingSignable(state)).toBe(2);
    // 手动签约 1 人
    state = { ...state, candidatesUsedThisMonth: 1 };
    expect(remainingSignable(state)).toBe(1);
    // 再签 1 人后本月容量用完
    state = { ...state, candidatesUsedThisMonth: 2 };
    expect(remainingSignable(state)).toBe(0);
    expect(maxManualRecruit(state)).toBe(0);
  });
});

describe('退租规则', () => {
  it('退租率公式与上下限', () => {
    const state = createInitialState();
    // 满意度 75 ≥ 70，管家 0：2%
    expect(vacancyRateBps(state)).toBe(200);
    // 满意度 0：2% + 70×0.1% = 9% → 上限 5%
    expect(vacancyRateBps({ ...state, satisfaction: 0 })).toBe(500);
    // 管家 Lv.3：2% - 0.9% = 1.1%
    expect(
      vacancyRateBps({ ...state, managerLevel: 3, managerEnabled: true })
    ).toBe(110);
    // 满意度 100 + 管家 Lv.3：仍是 1.1%（公式下限 0.5% 在给定参数下不可达）
    expect(
      vacancyRateBps({
        ...state,
        satisfaction: 100,
        managerLevel: 3,
        managerEnabled: true,
      })
    ).toBe(110);
  });

  it('每月退租数量 = floor(月初已出租 × 退租率)', () => {
    const state = createInitialState();
    // 月初 2 套 × 2% = 0.04 → 0
    expect(monthlyMoveOuts(state)).toBe(0);
    // 100 套已租 × 2% = 2
    expect(monthlyMoveOuts({ ...state, monthStartOccupied: 100 })).toBe(2);
  });

  it('续租沟通减少 floor(原数量×30%)', () => {
    const state: GameState = {
      ...createInitialState(),
      monthStartOccupied: 100,
      renewalServiceEnabled: true,
    };
    // 100 × 2% = 2，减少 floor(2×30%)=0 → 2
    expect(monthlyMoveOuts(state)).toBe(2);
    // 1000 套已租：20 → 减少 floor(20×0.3)=6 → 14
    expect(monthlyMoveOuts({ ...state, monthStartOccupied: 1000 })).toBe(14);
  });
});

describe('分配算法', () => {
  it('按优先级分配签约（basic-first）', () => {
    const groups = [
      { id: 'f', type: 'family' as const, renovation: 0 as const, community: 0, total: 10, occupied: 0 },
      { id: 'b', type: 'basic' as const, renovation: 0 as const, community: 0, total: 10, occupied: 0 },
    ];
    const result = allocateSignings(groups, 5, 'basic-first');
    expect(result.find((g) => g.id === 'b')?.occupied).toBe(5);
    expect(result.find((g) => g.id === 'f')?.occupied).toBe(0);
  });

  it('按优先级分配签约（rent-first）', () => {
    const groups = [
      { id: 'f', type: 'family' as const, renovation: 0 as const, community: 0, total: 10, occupied: 0 },
      { id: 'b', type: 'basic' as const, renovation: 0 as const, community: 0, total: 10, occupied: 0 },
    ];
    const result = allocateSignings(groups, 5, 'rent-first');
    expect(result.find((g) => g.id === 'f')?.occupied).toBe(5);
    expect(result.find((g) => g.id === 'b')?.occupied).toBe(0);
  });

  it('退租按比例分配（最大余数法）', () => {
    const groups = [
      { id: 'a', type: 'basic' as const, renovation: 0 as const, community: 0, total: 10, occupied: 10 },
      { id: 'b', type: 'basic' as const, renovation: 0 as const, community: 1, total: 10, occupied: 10 },
    ];
    const result = allocateMoveOuts(groups, 5);
    // 各 2.5 → 向下取整各退 2，余额 1 按平局顺序给 a → a 退 3、b 退 2
    expect(result.find((g) => g.id === 'a')?.occupied).toBe(7);
    expect(result.find((g) => g.id === 'b')?.occupied).toBe(8);
    expect(result.reduce((s, g) => s + g.occupied, 0)).toBe(15);
  });

  it('退租分配不超过已出租数量', () => {
    const groups = [
      { id: 'a', type: 'basic' as const, renovation: 0 as const, community: 0, total: 10, occupied: 3 },
      { id: 'b', type: 'basic' as const, renovation: 0 as const, community: 1, total: 10, occupied: 7 },
    ];
    const result = allocateMoveOuts(groups, 5);
    // a: 1.5 → 退 2；b: 3.5 → 退 3
    expect(result.find((g) => g.id === 'a')?.occupied).toBe(1);
    expect(result.find((g) => g.id === 'b')?.occupied).toBe(4);
    expect(result.reduce((s, g) => s + g.occupied, 0)).toBe(5);
  });
});
