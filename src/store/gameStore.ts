import { create } from 'zustand';
import {
  AMENITY_MAX_LEVEL,
  MANAGER_MAX_LEVEL,
  TYPE_INFO,
} from '../game/constants';
import type {
  GameState,
  MaintenancePlan,
  MarketingPlan,
  PropertyType,
  RecruitmentPriority,
  RenovationLevel,
  SettlementResult,
} from '../game/types';
import {
  amenityUpgradeCostCents,
  applyPurchase,
  applyRenovation,
  applyRenovationBatch,
  batchRenovationCostCents,
  canRenovate,
  createInitialState,
  maintenanceCostCents,
  managerUpgradeCostCents,
  maxPurchasable,
  purchaseCostCents,
  renovationCostCents,
  totalProperties,
} from '../game/economy';
import { allocateSignings, maxManualRecruit, remainingSignable } from '../game/recruitment';
// allocateSignings 用于 recruitAuto 的按优先级分配
import { applySettlement, canEndMonth, computeSettlement } from '../game/settlement';
import { applyEventChoice } from '../game/events';
import { checkAchievements, checkStoryChains } from '../game/progression';
import { STORY_CHAINS } from '../data/events';
import { selectEventsForMonth } from '../game/events';
import { clearSave, downloadSaveFile, loadGame, parseSaveJson, saveGame } from '../game/save';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

interface GameStore {
  state: GameState;
  /** 最近一次结算结果（用于月报弹窗与收租动效） */
  lastSettlement: SettlementResult | null;
  /** 待展示的月报月份（结算动画结束后显示） */
  pendingReport: boolean;

  newGame: () => void;
  loadFromStorage: () => boolean;
  buyProperty: (type: PropertyType, count: number) => ActionResult;
  renovateGroup: (groupId: string) => ActionResult;
  renovateType: (type: PropertyType, target: RenovationLevel) => ActionResult;
  setMarketingPlan: (plan: MarketingPlan) => void;
  setMaintenancePlan: (plan: MaintenancePlan) => void;
  setRenewalService: (enabled: boolean) => void;
  setAutoRecruit: (enabled: boolean) => ActionResult;
  setPriority: (priority: RecruitmentPriority) => void;
  toggleManager: (enabled: boolean) => void;
  toggleAmenities: (enabled: boolean) => void;
  upgradeManager: () => ActionResult;
  upgradeAmenity: () => ActionResult;
  recruitIntoGroup: (groupId: string) => ActionResult;
  recruitAuto: (count: number) => ActionResult;
  chooseEvent: (eventId: string, choiceId: string) => ActionResult;
  endMonth: () => ActionResult;
  dismissReport: () => void;
  applyBasicOps: () => void;
  pauseAllServices: () => void;
  renameCommunity: (index: number, name: string) => void;
  setPreference: (key: 'soundEnabled' | 'reducedMotion', value: boolean) => void;
  importSave: (json: string) => ActionResult;
  exportSave: () => void;
  confirmRestart: () => void;
  advanceTutorial: () => void;
  skipTutorial: () => void;
  debugSet: (patch: Partial<GameState>) => void;
  debugFillGoal: () => void;
}

function persist(state: GameState): void {
  saveGame(state);
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: createInitialState(),
  lastSettlement: null,
  pendingReport: false,

  newGame: () => {
    const initial = createInitialState();
    const withEvents = {
      ...initial,
      tutorialStep: 1,
      currentEventIds: selectEventsForMonth(initial),
    };
    set({ state: withEvents, lastSettlement: null, pendingReport: false });
    persist(withEvents);
  },

  loadFromStorage: () => {
    const loaded = loadGame();
    if (loaded) {
      set({ state: loaded });
      return true;
    }
    return false;
  },

  buyProperty: (type, count) => {
    const { state } = get();
    const total = totalProperties(state.propertyGroups);
    if (total + count > 1200) {
      return { ok: false, error: '购买后总房产将超过 1200 套上限。' };
    }
    const max = maxPurchasable(state, type);
    if (count > max) {
      if (max === 0) {
        const supplyLeft = TYPE_INFO[type].max - countByTypeSafe(state, type);
        const capLeft = 1200 - total;
        const reasons: string[] = [];
        if (supplyLeft <= 0) reasons.push(`${TYPE_INFO[type].name}已达到供应上限`);
        if (capLeft <= 0) reasons.push('已达 1200 套总上限');
        if (state.cashCents < purchaseCostCents(type, 1)) {
          const shortfall = purchaseCostCents(type, 1) - state.cashCents;
          reasons.push(`资金不足，还差 ¥${Math.ceil(shortfall / 100).toLocaleString()}`);
        }
        return { ok: false, error: reasons.join('；') + '。' };
      }
      return { ok: false, error: `最多可购买 ${max} 套${TYPE_INFO[type].name}。` };
    }
    const next = applyPurchase(state, type, count);
    set({ state: next });
    persist(next);
    return { ok: true };
  },

  renovateGroup: (groupId) => {
    const { state } = get();
    const group = state.propertyGroups.find((g) => g.id === groupId);
    if (!group) return { ok: false, error: '未找到该房源分组。' };
    if (!canRenovate(group)) return { ok: false, error: '该分组已是最高翻新等级。' };
    const cost = renovationCostCents(group);
    if (state.cashCents < cost) {
      return { ok: false, error: `资金不足，还差 ¥${Math.ceil((cost - state.cashCents) / 100).toLocaleString()}。` };
    }
    const next = applyRenovation(state, groupId);
    set({ state: next });
    persist(next);
    return { ok: true };
  },

  renovateType: (type, target) => {
    const { state } = get();
    const cost = batchRenovationCostCents(state.propertyGroups, type, target);
    if (cost === 0) return { ok: false, error: '没有需要翻新的房源。' };
    if (state.cashCents < cost) {
      return { ok: false, error: `资金不足，还差 ¥${Math.ceil((cost - state.cashCents) / 100).toLocaleString()}。` };
    }
    const next = applyRenovationBatch(state, type, target);
    set({ state: next });
    persist(next);
    return { ok: true };
  },

  setMarketingPlan: (plan) => {
    const { state } = get();
    const next = { ...state, marketingPlan: plan };
    set({ state: next });
    persist(next);
  },

  setMaintenancePlan: (plan) => {
    const { state } = get();
    const next = { ...state, maintenancePlan: plan };
    set({ state: next });
    persist(next);
  },

  setRenewalService: (enabled) => {
    const { state } = get();
    const next = { ...state, renewalServiceEnabled: enabled };
    set({ state: next });
    persist(next);
  },

  setAutoRecruit: (enabled) => {
    const { state } = get();
    if (enabled && state.managerLevel < 1) {
      return { ok: false, error: '自动补租需要管家等级达到 1 级。' };
    }
    const next = { ...state, autoRecruitEnabled: enabled };
    set({ state: next });
    persist(next);
    return { ok: true };
  },

  setPriority: (priority) => {
    const { state } = get();
    const next = { ...state, recruitmentPriority: priority };
    set({ state: next });
    persist(next);
  },

  toggleManager: (enabled) => {
    const { state } = get();
    const next = { ...state, managerEnabled: enabled };
    set({ state: next });
    persist(next);
  },

  toggleAmenities: (enabled) => {
    const { state } = get();
    const next = { ...state, amenitiesEnabled: enabled };
    set({ state: next });
    persist(next);
  },

  upgradeManager: () => {
    const { state } = get();
    if (state.managerLevel >= MANAGER_MAX_LEVEL) {
      return { ok: false, error: '管家已达到最高等级。' };
    }
    const nextLevel = state.managerLevel + 1;
    const cost = managerUpgradeCostCents(nextLevel);
    if (state.cashCents < cost) {
      return { ok: false, error: `资金不足，还差 ¥${Math.ceil((cost - state.cashCents) / 100).toLocaleString()}。` };
    }
    const next: GameState = {
      ...state,
      managerLevel: nextLevel,
      managerEnabled: true,
      cashCents: state.cashCents - cost,
    };
    set({ state: next });
    persist(next);
    return { ok: true };
  },

  upgradeAmenity: () => {
    const { state } = get();
    if (state.amenityLevel >= AMENITY_MAX_LEVEL) {
      return { ok: false, error: '社区配套已达到最高等级。' };
    }
    const nextLevel = state.amenityLevel + 1;
    const cost = amenityUpgradeCostCents(nextLevel);
    if (state.cashCents < cost) {
      return { ok: false, error: `资金不足，还差 ¥${Math.ceil((cost - state.cashCents) / 100).toLocaleString()}。` };
    }
    const next: GameState = {
      ...state,
      amenityLevel: nextLevel,
      amenitiesEnabled: true,
      cashCents: state.cashCents - cost,
    };
    set({ state: next });
    persist(next);
    return { ok: true };
  },

  recruitIntoGroup: (groupId) => {
    const { state } = get();
    if (remainingSignable(state) <= 0) {
      return { ok: false, error: '本月候选租客已用完，下月会有新的候选池。' };
    }
    const group = state.propertyGroups.find((g) => g.id === groupId);
    if (!group) return { ok: false, error: '未找到该房源分组。' };
    if (group.occupied >= group.total) return { ok: false, error: '该分组已满租。' };
    const updated = state.propertyGroups.map((g) =>
      g.id === groupId ? { ...g, occupied: g.occupied + 1 } : g
    );
    const next: GameState = {
      ...state,
      propertyGroups: updated,
      candidatesUsedThisMonth: state.candidatesUsedThisMonth + 1,
    };
    set({ state: next });
    persist(next);
    return { ok: true };
  },

  recruitAuto: (count) => {
    const { state } = get();
    const max = maxManualRecruit(state);
    if (max <= 0) {
      return { ok: false, error: remainingSignable(state) <= 0 ? '本月候选租客已用完。' : '没有空置房源。' };
    }
    const actual = Math.min(count, max);
    const groups = allocateSignings(state.propertyGroups, actual, state.recruitmentPriority);
    const next: GameState = {
      ...state,
      propertyGroups: groups,
      candidatesUsedThisMonth: state.candidatesUsedThisMonth + actual,
    };
    set({ state: next });
    persist(next);
    return { ok: true, error: `已签入 ${actual} 位租客。` };
  },

  chooseEvent: (eventId, choiceId) => {
    const { state } = get();
    const result = applyEventChoice(state, eventId, choiceId);
    if (!result) return { ok: false, error: '无法选择该选项（可能资金不足）。' };
    // 检查故事链完成与成就
    let nextState = result.state;
    const chainResult = checkStoryChains(nextState, STORY_CHAINS);
    nextState = chainResult.newState;
    const newAchievements = checkAchievements(nextState);
    if (newAchievements.length > 0) {
      nextState = { ...nextState, achievements: [...nextState.achievements, ...newAchievements] };
    }
    set({ state: nextState });
    persist(nextState);
    return { ok: true };
  },

  endMonth: () => {
    const { state } = get();
    if (!canEndMonth(state)) {
      const result = computeSettlement(state);
      const gap = -result.endCashCents;
      return {
        ok: false,
        error: `预测月末资金缺口 ¥${Math.ceil(gap / 100).toLocaleString()}。请调整运营方案或暂停付费服务。`,
      };
    }
    const { state: nextState, report, result } = applySettlement(state);
    // 新月份的事件与候选池
    const events = selectEventsForMonth(nextState);
    let finalState: GameState = { ...nextState, currentEventIds: events };
    // 解锁检查产生的成就
    const newAchievements = checkAchievements(finalState);
    if (newAchievements.length > 0) {
      finalState = { ...finalState, achievements: [...finalState.achievements, ...newAchievements] };
    }
    finalState = { ...finalState, reports: [...finalState.reports, report].slice(-24) };
    set({ state: finalState, lastSettlement: result, pendingReport: true });
    persist(finalState);
    return { ok: true };
  },

  dismissReport: () => {
    set({ pendingReport: false, lastSettlement: null });
  },

  applyBasicOps: () => {
    const { state } = get();
    const next: GameState = {
      ...state,
      marketingPlan: 'natural',
      maintenancePlan: 'economy',
      renewalServiceEnabled: false,
    };
    set({ state: next });
    persist(next);
  },

  pauseAllServices: () => {
    const { state } = get();
    const next: GameState = {
      ...state,
      marketingPlan: 'natural',
      maintenancePlan: 'paused',
      renewalServiceEnabled: false,
      managerEnabled: false,
      amenitiesEnabled: false,
    };
    set({ state: next });
    persist(next);
  },

  renameCommunity: (index, name) => {
    const { state } = get();
    const names = [...state.communityNames];
    names[index] = name.slice(0, 12) || names[index];
    const next = { ...state, communityNames: names };
    set({ state: next });
    persist(next);
  },

  setPreference: (key, value) => {
    const { state } = get();
    const next: GameState = {
      ...state,
      preferences: { ...state.preferences, [key]: value },
    };
    set({ state: next });
    persist(next);
  },

  importSave: (json) => {
    const parsed = parseSaveJson(json);
    if (!parsed.ok) return { ok: false, error: parsed.reason };
    set({ state: parsed.state, lastSettlement: null, pendingReport: false });
    persist(parsed.state);
    return { ok: true };
  },

  exportSave: () => {
    downloadSaveFile(get().state);
  },

  confirmRestart: () => {
    clearSave();
    const initial = createInitialState();
    const withEvents = {
      ...initial,
      tutorialStep: 1,
      currentEventIds: selectEventsForMonth(initial),
    };
    set({ state: withEvents, lastSettlement: null, pendingReport: false });
    persist(withEvents);
  },

  advanceTutorial: () => {
    const { state } = get();
    if (state.tutorialStep === 0) {
      const next = { ...state, tutorialStep: 1 };
      set({ state: next });
      persist(next);
      return;
    }
    if (state.tutorialStep < 6) {
      const next = { ...state, tutorialStep: state.tutorialStep + 1 };
      set({ state: next });
      persist(next);
    }
  },

  skipTutorial: () => {
    const { state } = get();
    const next = { ...state, tutorialStep: 6 };
    set({ state: next });
    persist(next);
  },

  debugSet: (patch) => {
    if (!import.meta.env.DEV) return;
    const { state } = get();
    const next = { ...state, ...patch };
    set({ state: next });
    persist(next);
  },

  /** 调试：直接填充终局状态（仅开发环境） */
  debugFillGoal: () => {
    if (!import.meta.env.DEV) return;
    const { state } = get();
    const groups: GameState['propertyGroups'] = [];
    // 600 基础：每社区 100 套
    for (let i = 0; i < 600; i++) {
      groups.push({
        id: `dbg-b-${i}`,
        type: 'basic',
        renovation: 1,
        community: Math.floor(i / 100),
        total: 1,
        occupied: 1,
      });
    }
    // 400 舒适：按比例分配到 6 个社区
    for (let i = 0; i < 400; i++) {
      groups.push({
        id: `dbg-c-${i}`,
        type: 'comfort',
        renovation: 1,
        community: Math.floor((i * 6) / 400),
        total: 1,
        occupied: 1,
      });
    }
    // 200 家庭：按比例分配到 6 个社区
    for (let i = 0; i < 200; i++) {
      groups.push({
        id: `dbg-f-${i}`,
        type: 'family',
        renovation: 1,
        community: Math.floor((i * 6) / 200),
        total: 1,
        occupied: 1,
      });
    }

    const next: GameState = {
      ...state,
      propertyGroups: groups,
      cashCents: 100_000_000,
      satisfaction: 100,
      maintenance: 100,
      managerLevel: 3,
      managerEnabled: true,
      amenityLevel: 3,
      amenitiesEnabled: true,
      autoRecruitEnabled: true,
      monthStartOccupied: 1200,
    };
    set({ state: next });
    persist(next);
  },
}));

function countByTypeSafe(state: GameState, type: PropertyType): number {
  let sum = 0;
  for (const g of state.propertyGroups) if (g.type === type) sum += g.total;
  return sum;
}

/** 选择器：派生数据 */
export function selectTotalProperties(state: GameState): number {
  return totalProperties(state.propertyGroups);
}

/** 当前预测（供界面使用，与结算共用模型） */
export function selectPrediction(state: GameState): SettlementResult {
  return computeSettlement(state);
}

/** 当前维护费用（供界面展示） */
export function selectMaintenanceCost(state: GameState): number {
  return maintenanceCostCents(state);
}
