/**
 * 房东小日子 - 核心数据类型
 * 所有金额在数据层使用整数"分"(cents)，界面层转换为元。
 */

export type PropertyType = 'basic' | 'comfort' | 'family';
export type MarketingPlan = 'natural' | 'community' | 'city';
export type MaintenancePlan = 'economy' | 'standard' | 'premium' | 'paused';
export type RecruitmentPriority = 'basic-first' | 'rent-first';
export type RenovationLevel = 0 | 1 | 2;

/** 房源分组：房型 + 翻新等级 + 所属社区 */
export interface PropertyGroup {
  id: string;
  type: PropertyType;
  renovation: RenovationLevel;
  community: number; // 0-5
  total: number;
  occupied: number;
}

export interface EventChoice {
  id: string;
  label: string;
  costCents: number;
  satisfactionDelta: number;
  maintenanceDelta?: number;
  nextStoryFlag?: string;
  resultText: string;
}

export type EventCondition =
  | { kind: 'minProperties'; count: number }
  | { kind: 'minMonth'; month: number }
  | { kind: 'storyFlag'; flag: string }
  | { kind: 'notStoryFlag'; flag: string }
  | { kind: 'notResolved'; eventId: string };

export interface TenantEvent {
  id: string;
  title: string;
  description: string;
  characterId?: string;
  conditions?: EventCondition[];
  choices: EventChoice[];
  repeatable: boolean;
}

export interface SatisfactionChange {
  reason: string;
  delta: number;
}

export interface MonthReport {
  monthIndex: number;
  rentCents: number;
  expensesCents: number;
  expenseDetails: {
    maintenance: number;
    marketing: number;
    manager: number;
    amenity: number;
    renewal: number;
  };
  moveOuts: number;
  manualSignings: number;
  autoFilled: number;
  endOccupied: number;
  endCashCents: number;
  endMaintenance: number;
  endSatisfaction: number;
  satisfactionChanges: SatisfactionChange[];
  consecutiveGoalMonths: number;
  goalMet: boolean;
  won: boolean;
}

/** 月末结算结果（预测与正式结算共用） */
export interface SettlementResult {
  moveOuts: number;
  autoFilled: number;
  manualSignings: number;
  endOccupied: number;
  endGroups: PropertyGroup[];
  rentCents: number;
  expenses: {
    maintenance: number;
    marketing: number;
    manager: number;
    amenity: number;
    renewal: number;
    total: number;
  };
  endCashCents: number;
  endMaintenance: number;
  endSatisfaction: number;
  satisfactionChanges: SatisfactionChange[];
  goalMet: boolean;
  newConsecutive: number;
  won: boolean;
}

export interface GameState {
  saveVersion: number;
  monthIndex: number;
  cashCents: number;

  propertyGroups: PropertyGroup[];
  satisfaction: number;
  maintenance: number;

  managerLevel: number;
  amenityLevel: number;
  managerEnabled: boolean;
  amenitiesEnabled: boolean;

  marketingPlan: MarketingPlan;
  maintenancePlan: MaintenancePlan;
  renewalServiceEnabled: boolean;
  autoRecruitEnabled: boolean;
  recruitmentPriority: RecruitmentPriority;

  monthStartOccupied: number;
  candidatesUsedThisMonth: number;

  currentEventIds: string[];
  resolvedEventIds: string[];
  storyFlags: string[];
  storyCompletedChains: string[];

  consecutiveGoalMonths: number;
  hasWon: boolean;
  totalRentEarnedCents: number;

  reports: MonthReport[];
  achievements: string[];
  rngSeed: number;

  tutorialStep: number; // 0=未开始 1..5=进行中 6=完成
  lastEventResults: { eventId: string; resultText: string }[];

  communityNames: string[];
  preferences: {
    soundEnabled: boolean;
    reducedMotion: boolean;
  };
}

export interface CommunityInfo {
  index: number;
  name: string;
  properties: number;
  occupied: number;
  rentCents: number;
}
