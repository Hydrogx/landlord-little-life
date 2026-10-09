import {
  GOAL_CONSECUTIVE_MONTHS,
  GOAL_PROPERTIES,
  GOAL_RENT_CENTS,
  TYPE_INFO,
} from './constants';
import type { GameState } from './types';
import { occupiedByType, stageOf, totalProperties } from './economy';

// ---------- 阶段解锁提示 ----------

export interface UnlockInfo {
  id: string;
  title: string;
  desc: string;
  at: number;
  achieved: boolean;
}

export function unlockInfos(state: GameState): UnlockInfo[] {
  const total = totalProperties(state.propertyGroups);
  return [
    { id: 'unlock-comfort', title: '舒适公寓解锁', desc: '可购买舒适公寓（¥1,500/月）', at: 20, achieved: total >= 20 },
    { id: 'unlock-family', title: '家庭公寓解锁', desc: '可购买家庭公寓（¥2,000/月）', at: 100, achieved: total >= 100 },
    { id: 'unlock-manager', title: '管家系统解锁', desc: '可升级管家，开启自动补租', at: 20, achieved: total >= 20 },
    { id: 'unlock-amenity', title: '社区配套解锁', desc: '可升级配套，提高招租转化', at: 100, achieved: total >= 100 },
    { id: 'unlock-communities', title: '社区分区', desc: '每200套一个社区分区', at: 20, achieved: total >= 20 },
    { id: 'unlock-goal', title: '终局挑战', desc: '持有1200套后开始稳定经营挑战', at: GOAL_PROPERTIES, achieved: total >= GOAL_PROPERTIES },
  ];
}

export function newlyUnlocked(prev: GameState, next: GameState): UnlockInfo[] {
  const before = new Set(unlockInfos(prev).filter((u) => u.achieved).map((u) => u.id));
  return unlockInfos(next).filter((u) => u.achieved && !before.has(u.id));
}

// ---------- 成就 ----------

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  emoji: string;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: 'first-rent', name: '第一笔租金', desc: '完成第一次月末收租', emoji: '🪙' },
  { id: 'first-purchase', name: '首次购房', desc: '购买第一套房产', emoji: '🏠' },
  { id: 'props-20', name: '小有规模', desc: '持有20套房产', emoji: '🏘️' },
  { id: 'props-100', name: '社区房东', desc: '持有100套房产', emoji: '🏙️' },
  { id: 'props-400', name: '扩张达人', desc: '持有400套房产', emoji: '🌆' },
  { id: 'props-1200', name: '深圳大房东', desc: '持有1200套房产', emoji: '🌇' },
  { id: 'satisfaction-90', name: '口碑社区', desc: '满意度达到90', emoji: '💛' },
  { id: 'story-chain', name: '故事收藏家', desc: '完成第一条租客故事链', emoji: '📖' },
  { id: 'goal-6-months', name: '稳定经营大师', desc: '连续6个月达成终局目标', emoji: '🏆' },
];

export function checkAchievements(state: GameState): string[] {
  const total = totalProperties(state.propertyGroups);
  const earned = new Set(state.achievements);
  const newly: string[] = [];
  const add = (id: string) => {
    if (!earned.has(id) && !newly.includes(id)) newly.push(id);
  };

  // 第一次收租
  if (state.reports.length > 0) add('first-rent');
  // 房产规模
  if (total >= 20) add('props-20');
  if (total >= 100) add('props-100');
  if (total >= 400) add('props-400');
  if (total >= GOAL_PROPERTIES) add('props-1200');
  // 满意度
  if (state.satisfaction >= 90) add('satisfaction-90');
  // 故事链
  if (state.storyCompletedChains.length > 0) add('story-chain');
  // 终局
  if (state.consecutiveGoalMonths >= GOAL_CONSECUTIVE_MONTHS) add('goal-6-months');

  return newly;
}

// ---------- 故事链 ----------

export interface StoryChainDef {
  id: string;
  name: string;
  characterId: string;
  desc: string;
  flags: string[]; // 按顺序的storyFlag
}

/** 故事链完成 = 所有节点flag都已点亮 */
export function checkStoryChains(state: GameState, chains: StoryChainDef[]): { completed: string[]; newState: GameState } {
  const newlyCompleted: string[] = [];
  for (const chain of chains) {
    if (state.storyCompletedChains.includes(chain.id)) continue;
    if (chain.flags.every((f) => state.storyFlags.includes(f))) {
      newlyCompleted.push(chain.id);
    }
  }
  if (newlyCompleted.length === 0) return { completed: [], newState: state };
  return {
    completed: newlyCompleted,
    newState: {
      ...state,
      storyCompletedChains: [...state.storyCompletedChains, ...newlyCompleted],
    },
  };
}

// ---------- 终局挑战面板 ----------

export interface GoalPanelData {
  properties: number;
  propertiesGoal: number;
  rented: number;
  rentedGoal: number;
  rentCents: number;
  rentGoalCents: number;
  consecutive: number;
  consecutiveGoal: number;
  active: boolean;
}

export function goalPanelData(state: GameState): GoalPanelData {
  const total = totalProperties(state.propertyGroups);
  const totalRented =
    occupiedByType(state.propertyGroups, 'basic') +
    occupiedByType(state.propertyGroups, 'comfort') +
    occupiedByType(state.propertyGroups, 'family');
  const rent = state.propertyGroups.reduce(
    (sum, g) => sum + g.occupied * TYPE_INFO[g.type].rentCents,
    0
  );
  return {
    properties: total,
    propertiesGoal: GOAL_PROPERTIES,
    rented: totalRented,
    rentedGoal: GOAL_PROPERTIES,
    rentCents: rent,
    rentGoalCents: GOAL_RENT_CENTS,
    consecutive: state.consecutiveGoalMonths,
    consecutiveGoal: GOAL_CONSECUTIVE_MONTHS,
    active: total >= GOAL_PROPERTIES,
  };
}

/** 阶段进度（用于场景与引导） */
export function stageProgress(state: GameState) {
  const total = totalProperties(state.propertyGroups);
  const stage = stageOf(total);
  return { total, stage };
}
