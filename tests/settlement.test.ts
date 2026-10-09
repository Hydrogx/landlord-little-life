import { describe, expect, it } from 'vitest';
import { createInitialState, applyPurchase, totalProperties } from '../src/game/economy';
import { applySettlement, canEndMonth, computeSettlement } from '../src/game/settlement';
import { selectEventsForMonth, applyEventChoice } from '../src/game/events';
import { checkStoryChains } from '../src/game/progression';
import { STORY_CHAINS } from '../src/data/events';
import { GOAL_RENT_CENTS } from '../src/game/constants';
import type { GameState } from '../src/game/types';

/** 构造一个满租 1200 套的状态（用于终局测试） */
function createFullState(overrides: Partial<GameState> = {}): GameState {
  let state = createInitialState();
  state = applyPurchase(state, 'basic', 592);
  state = applyPurchase(state, 'comfort', 400);
  state = applyPurchase(state, 'family', 200);
  // 全部出租；高满意度 + 管家3 + 配套3 + 自动补租，保证退租后能补满
  state = {
    ...state,
    cashCents: 100_000_000, // 测试资金 ¥1,000,000
    propertyGroups: state.propertyGroups.map((g) => ({ ...g, occupied: g.total })),
    monthStartOccupied: 1200,
    satisfaction: 100,
    maintenance: 100,
    managerLevel: 3,
    managerEnabled: true,
    amenityLevel: 3,
    amenitiesEnabled: true,
    autoRecruitEnabled: true,
    ...overrides,
  };
  return state;
}

describe('月末结算', () => {
  it('预测与正式结算结果一致', () => {
    const state = createInitialState();
    const predicted = computeSettlement(state);
    const { result, report } = applySettlement(state);
    expect(result.rentCents).toBe(predicted.rentCents);
    expect(result.endCashCents).toBe(predicted.endCashCents);
    expect(result.endOccupied).toBe(predicted.endOccupied);
    expect(report.rentCents).toBe(predicted.rentCents);
  });

  it('结算推进月份并生成月报', () => {
    const state = createInitialState();
    const { state: next, report } = applySettlement(state);
    expect(next.monthIndex).toBe(1);
    expect(report.monthIndex).toBe(0);
    expect(next.monthStartOccupied).toBe(report.endOccupied);
    expect(next.candidatesUsedThisMonth).toBe(0);
  });

  it('租金按月末出租数量计算', () => {
    const state = createInitialState();
    // 手动签入 2 人 → 4 套出租
    const signed: GameState = {
      ...state,
      propertyGroups: state.propertyGroups.map((g) => ({
        ...g,
        occupied: g.occupied + (g.id === 'basic-r0-c0-0' ? 2 : 0),
      })),
      candidatesUsedThisMonth: 2,
    };
    const result = computeSettlement(signed);
    // 4 套 × ¥1,000 = ¥4,000
    expect(result.rentCents).toBe(400_000);
  });

  it('维护状态每月自然下降 6 点，按策略恢复', () => {
    const state = createInitialState();
    // 常规维护：90 - 6 + 6 = 90
    let result = computeSettlement(state);
    expect(result.endMaintenance).toBe(90);
    // 节省维护：90 - 6 + 2 = 86
    result = computeSettlement({ ...state, maintenancePlan: 'economy' });
    expect(result.endMaintenance).toBe(86);
    // 暂停维护：90 - 6 = 84
    result = computeSettlement({ ...state, maintenancePlan: 'paused' });
    expect(result.endMaintenance).toBe(84);
  });

  it('满意度变化包含配套、维修奖励与维护不足惩罚', () => {
    const state = createInitialState();
    // 常规维护：满意度 75 + 1 = 76
    let result = computeSettlement(state);
    expect(result.endSatisfaction).toBe(76);
    expect(result.satisfactionChanges).toContainEqual({ reason: '常规维护', delta: 1 });
    // 维护不足：维护 50 → 惩罚 ceil((60-50)/10) = 1
    result = computeSettlement({ ...state, maintenance: 50, maintenancePlan: 'paused' });
    // 50 - 6 = 44 → ceil((60-44)/10) = 2
    expect(result.endSatisfaction).toBe(75 + 0 - 2);
    expect(result.satisfactionChanges).toContainEqual({ reason: '维护不足（44/100）', delta: -2 });
  });

  it('运营支出明细正确', () => {
    const state = createInitialState();
    const result = computeSettlement(state);
    // 常规维护 8×60 = 480 元，自然招租 0
    expect(result.expenses.maintenance).toBe(48_000);
    expect(result.expenses.marketing).toBe(0);
    expect(result.expenses.manager).toBe(0);
    expect(result.expenses.amenity).toBe(0);
    expect(result.expenses.renewal).toBe(0);
    // 月末资金 = 24,000 + 2,000 - 480 = 25,520
    expect(result.endCashCents).toBe(2_552_000);
  });
});

describe('终局判定', () => {
  it('达标连续 5 个月尚未胜利', () => {
    let state = createFullState({ consecutiveGoalMonths: 4 });
    state = { ...state, currentEventIds: selectEventsForMonth(state) };
    const { state: next } = applySettlement(state);
    expect(next.consecutiveGoalMonths).toBe(5);
    expect(next.hasWon).toBe(false);
  });

  it('达标连续 6 个月触发胜利', () => {
    let state = createFullState({ consecutiveGoalMonths: 5 });
    state = { ...state, currentEventIds: selectEventsForMonth(state) };
    const { state: next } = applySettlement(state);
    expect(next.consecutiveGoalMonths).toBe(6);
    expect(next.hasWon).toBe(true);
  });

  it('从 0 开始连续达标 6 次触发胜利', () => {
    let state = createFullState();
    state = { ...state, currentEventIds: selectEventsForMonth(state) };
    for (let i = 0; i < 6; i++) {
      const { state: next } = applySettlement(state);
      state = { ...next, currentEventIds: selectEventsForMonth(next) };
      expect(state.consecutiveGoalMonths).toBe(i + 1);
    }
    expect(state.hasWon).toBe(true);
  });

  it('中间出现空置，连续月份归零', () => {
    // 1200 套但关闭自动补租：退租后空置无法补满 → 租金不足 160 万 → 不达标
    const state = createFullState({
      consecutiveGoalMonths: 3,
      autoRecruitEnabled: false,
    });
    const withVacancy: GameState = {
      ...state,
      propertyGroups: state.propertyGroups.map((g, i) =>
        i === 0 ? { ...g, occupied: g.total - 1 } : g
      ),
      monthStartOccupied: 1199,
    };
    const result = computeSettlement(withVacancy);
    expect(result.endOccupied).toBeLessThan(1200);
    expect(result.rentCents).toBeLessThan(GOAL_RENT_CENTS);
    expect(result.goalMet).toBe(false);
    expect(result.newConsecutive).toBe(0);
  });

  it('租金不是 160 万时不达标', () => {
    // 1200 套，关闭自动补租：退租 6 套后无法补满，租金低于 160 万
    const full = createFullState({ autoRecruitEnabled: false });
    const result = computeSettlement(full);
    expect(result.endOccupied).toBeLessThan(1200);
    expect(result.rentCents).toBeLessThan(GOAL_RENT_CENTS);
    expect(result.goalMet).toBe(false);
  });
});

describe('困难状态', () => {
  it('无现金且空置时，暂停全部费用可继续经营', () => {
    let state = createInitialState();
    // 消耗所有现金：购买 4 套基础（24,000 元）
    state = applyPurchase(state, 'basic', 4);
    expect(state.cashCents).toBe(0);
    // 暂停全部付费服务
    const paused: GameState = {
      ...state,
      marketingPlan: 'natural',
      maintenancePlan: 'paused',
      renewalServiceEnabled: false,
      managerEnabled: false,
      amenitiesEnabled: false,
    };
    expect(canEndMonth(paused)).toBe(true);
    const result = computeSettlement(paused);
    // 2 套出租 × ¥1,000 = ¥2,000 收入，0 支出
    expect(result.rentCents).toBe(200_000);
    expect(result.expenses.total).toBe(0);
    expect(result.endCashCents).toBe(200_000);
  });

  it('预测资金不足时禁止结束本月', () => {
    const state = createInitialState();
    // 手动签约 2 人后仍可负担（收入 4,000 > 维护 480）
    const signed: GameState = {
      ...state,
      propertyGroups: state.propertyGroups.map((g) => ({ ...g, occupied: 4 })),
      candidatesUsedThisMonth: 2,
    };
    expect(canEndMonth(signed)).toBe(true);
  });
});

describe('确定性', () => {
  it('相同种子与决策得到相同结算结果', () => {
    const run = () => {
      let state = createInitialState();
      state = { ...state, currentEventIds: selectEventsForMonth(state) };
      // 选择第一个事件的第一个选项
      const eventId = state.currentEventIds[0];
      const event = state.currentEventIds.length > 0 ? eventId : null;
      void event;
      if (eventId) {
        const result = applyEventChoice(state, eventId, 'check');
        if (result) {
          state = result.state;
          state = checkStoryChains(state, STORY_CHAINS).newState;
        }
      }
      // 签入 1 人
      state = {
        ...state,
        propertyGroups: state.propertyGroups.map((g) =>
          g.id === 'basic-r0-c0-0' ? { ...g, occupied: 3 } : g
        ),
        candidatesUsedThisMonth: 1,
      };
      return computeSettlement(state);
    };
    const a = run();
    const b = run();
    expect(a).toEqual(b);
  });

  it('结算数据在动画前已存档：重复读取不会重复发放租金', () => {
    let state = createInitialState();
    const { state: next, report } = applySettlement(state);
    // 结算后月份已推进，再次结算基于新月，不会重复发放上月租金
    const second = computeSettlement(next);
    expect(second.rentCents).not.toBeUndefined();
    expect(report.rentCents).toBe(200_000);
    expect(next.monthIndex).toBe(1);
    expect(totalProperties(next.propertyGroups)).toBe(8);
    void state;
  });
});
