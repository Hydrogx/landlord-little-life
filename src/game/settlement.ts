import {
  GOAL_CONSECUTIVE_MONTHS,
  GOAL_PROPERTIES,
  GOAL_RENT_CENTS,
  LOW_MAINTENANCE_THRESHOLD,
  MAINTENANCE_DECAY,
  MAINTENANCE_PLANS,
} from './constants';
import type { GameState, MonthReport, SatisfactionChange, SettlementResult } from './types';
import {
  amenityCostCents,
  clamp,
  managerCostCents,
  maintenanceCostCents,
  marketingCostCents,
  monthlyRentCents,
  renewalCostCents,
  totalOccupied,
  totalProperties,
} from './economy';
import { allocateMoveOuts, allocateSignings, monthlyMoveOuts, remainingSignable } from './recruitment';

/**
 * 月末结算模型（纯函数）。
 * 预测界面与正式结算必须共用本函数，保证结果一致。
 *
 * 结算顺序（PRD §10）：
 * 1. 读取本月决策和月初出租快照
 * 2. 计算退租数量
 * 3. 使用剩余候选人数自动补租；未开自动补租时不执行
 * 4. 按月末出租数量计算租金
 * 5. 计算运营支出并验证余额
 * 6. 更新资金
 * 7. 更新维护状态
 * 8. 应用满意度变化
 * 9. 检查解锁、成就和故事条件（在 progression 中）
 * 10. 检查终局达标，更新连续月份
 */
export function computeSettlement(state: GameState): SettlementResult {
  const total = totalProperties(state.propertyGroups);
  const occupiedNow = totalOccupied(state.propertyGroups);

  // 1-2. 退租（基于月初快照）
  const moveOuts = monthlyMoveOuts(state);
  const occupiedAfterMoveOut = Math.max(0, occupiedNow - moveOuts);

  // 3. 自动补租（仅管家1级后开启时执行）
  const remaining = remainingSignable(state);
  const vacantAfterMoveOut = total - occupiedAfterMoveOut;
  const autoFilled = state.autoRecruitEnabled ? Math.min(remaining, vacantAfterMoveOut) : 0;

  let groups = allocateMoveOuts(state.propertyGroups, moveOuts);
  groups = allocateSignings(groups, autoFilled, state.recruitmentPriority);
  const endOccupied = totalOccupied(groups);

  // 4. 租金（按月末出租数量）
  const rentCents = monthlyRentCents(groups);

  // 5. 运营支出
  const maintenance = maintenanceCostCents(state);
  const marketing = marketingCostCents(state);
  const manager = managerCostCents(state);
  const amenity = amenityCostCents(state);
  const renewal = renewalCostCents(state);
  const expensesTotal = maintenance + marketing + manager + amenity + renewal;

  // 6. 资金
  const endCashCents = state.cashCents + rentCents - expensesTotal;

  // 7. 维护状态：先自然下降，再按策略恢复
  const plan = MAINTENANCE_PLANS[state.maintenancePlan];
  const endMaintenance = clamp(
    state.maintenance - MAINTENANCE_DECAY + plan.recovery,
    0,
    100
  );

  // 8. 满意度变化
  const changes: SatisfactionChange[] = [];
  let sat = state.satisfaction;
  if (state.amenitiesEnabled && state.amenityLevel > 0) {
    sat += state.amenityLevel;
    changes.push({ reason: `社区配套 Lv.${state.amenityLevel}`, delta: state.amenityLevel });
  }
  if (plan.satisfactionBonus > 0) {
    sat += plan.satisfactionBonus;
    changes.push({ reason: `${plan.name}`, delta: plan.satisfactionBonus });
  }
  if (endMaintenance < LOW_MAINTENANCE_THRESHOLD) {
    const penalty = Math.ceil((LOW_MAINTENANCE_THRESHOLD - endMaintenance) / 10);
    sat -= penalty;
    changes.push({ reason: `维护不足（${endMaintenance}/100）`, delta: -penalty });
  }
  const endSatisfaction = clamp(sat, 0, 100);

  // 10. 终局达标检查
  const goalMet =
    total === GOAL_PROPERTIES && endOccupied === GOAL_PROPERTIES && rentCents === GOAL_RENT_CENTS;
  const newConsecutive = goalMet ? state.consecutiveGoalMonths + 1 : 0;
  const won = newConsecutive >= GOAL_CONSECUTIVE_MONTHS;

  return {
    moveOuts,
    autoFilled,
    manualSignings: state.candidatesUsedThisMonth,
    endOccupied,
    endGroups: groups,
    rentCents,
    expenses: {
      maintenance,
      marketing,
      manager,
      amenity,
      renewal,
      total: expensesTotal,
    },
    endCashCents,
    endMaintenance,
    endSatisfaction,
    satisfactionChanges: changes,
    goalMet,
    newConsecutive,
    won,
  };
}

/** 月末预测摘要（与结算共用同一模型） */
export function predictSettlement(state: GameState): SettlementResult {
  return computeSettlement(state);
}

/** 结算后资金是否足够（不足时禁止结束本月） */
export function canEndMonth(state: GameState): boolean {
  return computeSettlement(state).endCashCents >= 0;
}

/** 应用月末结算，返回新状态与月报（调用前必须 canEndMonth） */
export function applySettlement(state: GameState): { state: GameState; report: MonthReport; result: SettlementResult } {
  const result = computeSettlement(state);

  const newState: GameState = {
    ...state,
    monthIndex: state.monthIndex + 1,
    cashCents: result.endCashCents,
    propertyGroups: result.endGroups,
    satisfaction: result.endSatisfaction,
    maintenance: result.endMaintenance,
    consecutiveGoalMonths: result.newConsecutive,
    hasWon: state.hasWon || result.won,
    totalRentEarnedCents: state.totalRentEarnedCents + result.rentCents,
    monthStartOccupied: result.endOccupied,
    candidatesUsedThisMonth: 0,
  };

  const report: MonthReport = {
    monthIndex: state.monthIndex,
    rentCents: result.rentCents,
    expensesCents: result.expenses.total,
    expenseDetails: {
      maintenance: result.expenses.maintenance,
      marketing: result.expenses.marketing,
      manager: result.expenses.manager,
      amenity: result.expenses.amenity,
      renewal: result.expenses.renewal,
    },
    moveOuts: result.moveOuts,
    manualSignings: result.manualSignings,
    autoFilled: result.autoFilled,
    endOccupied: result.endOccupied,
    endCashCents: result.endCashCents,
    endMaintenance: result.endMaintenance,
    endSatisfaction: result.endSatisfaction,
    satisfactionChanges: result.satisfactionChanges,
    consecutiveGoalMonths: result.newConsecutive,
    goalMet: result.goalMet,
    won: result.won,
  };

  return { state: newState, report, result };
}
