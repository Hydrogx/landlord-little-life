import {
  BACKUP_KEY,
  GOAL_PROPERTIES,
  SAVE_KEY,
  SAVE_VERSION,
} from './constants';
import type { GameState, PropertyGroup, PropertyType } from './types';
import { countByType, totalOccupied } from './economy';
import { selectEventsForMonth } from './events';

/** 保存游戏（自动存档），并保留最近一次有效存档备份 */
export function saveGame(state: GameState): boolean {
  try {
    const json = JSON.stringify(state);
    const existing = localStorage.getItem(SAVE_KEY);
    if (existing) {
      try {
        localStorage.setItem(BACKUP_KEY, existing);
      } catch {
        // 备份失败不影响主存档
      }
    }
    localStorage.setItem(SAVE_KEY, json);
    return true;
  } catch {
    return false;
  }
}

/** 读取本地存档 */
export function loadGame(): GameState | null {
  try {
    const json = localStorage.getItem(SAVE_KEY);
    if (!json) return null;
    const parsed = parseSaveJson(json);
    if (parsed.ok) return migrateState(parsed.state);
    // 主存档损坏时尝试备份
    const backup = localStorage.getItem(BACKUP_KEY);
    if (backup) {
      const backupParsed = parseSaveJson(backup);
      if (backupParsed.ok) return migrateState(backupParsed.state);
    }
    return null;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(BACKUP_KEY);
  } catch {
    // 忽略
  }
}

/** 导出存档为 JSON 字符串 */
export function exportSave(state: GameState): string {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
}

export type ParseResult = { ok: true; state: GameState } | { ok: false; reason: string };

/** 解析并校验存档 JSON（导入时使用） */
export function parseSaveJson(json: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, reason: '文件不是有效的 JSON 格式。' };
  }
  const validation = validateState(raw);
  if (!validation.ok) return validation;
  return { ok: true, state: migrateState(validation.state) };
}

/** 结构性校验：字段类型、金额非负、房产上限、出租数量不超过持有 */
export function validateState(raw: unknown): ParseResult {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, reason: '存档内容为空或格式不正确。' };
  }
  const s = raw as Record<string, unknown>;

  if (typeof s.saveVersion !== 'number') {
    return { ok: false, reason: '缺少存档版本号。' };
  }
  if ((s.saveVersion as number) > SAVE_VERSION) {
    return { ok: false, reason: `存档版本（v${s.saveVersion}）高于当前游戏版本，请更新游戏。` };
  }

  const requiredNumbers: [string, string][] = [
    ['月份', 'monthIndex'],
    ['资金', 'cashCents'],
    ['满意度', 'satisfaction'],
    ['维护状态', 'maintenance'],
    ['管家等级', 'managerLevel'],
    ['配套等级', 'amenityLevel'],
    ['月初出租数', 'monthStartOccupied'],
    ['本月已用候选数', 'candidatesUsedThisMonth'],
    ['连续达标月份', 'consecutiveGoalMonths'],
    ['累计租金', 'totalRentEarnedCents'],
    ['随机种子', 'rngSeed'],
    ['教程步骤', 'tutorialStep'],
  ];
  for (const [label, key] of requiredNumbers) {
    if (typeof s[key] !== 'number' || !Number.isFinite(s[key] as number)) {
      return { ok: false, reason: `存档字段"${label}"缺失或不是有效数字。` };
    }
  }

  if ((s.cashCents as number) < 0) return { ok: false, reason: '资金不能为负数。' };
  if ((s.monthIndex as number) < 0 || !Number.isInteger(s.monthIndex)) {
    return { ok: false, reason: '月份数据无效。' };
  }
  if ((s.satisfaction as number) < 0 || (s.satisfaction as number) > 100) {
    return { ok: false, reason: '满意度超出 0-100 范围。' };
  }
  if ((s.maintenance as number) < 0 || (s.maintenance as number) > 100) {
    return { ok: false, reason: '维护状态超出 0-100 范围。' };
  }
  if ((s.managerLevel as number) < 0 || (s.managerLevel as number) > 3) {
    return { ok: false, reason: '管家等级超出 0-3 范围。' };
  }
  if ((s.amenityLevel as number) < 0 || (s.amenityLevel as number) > 3) {
    return { ok: false, reason: '配套等级超出 0-3 范围。' };
  }

  // 房产分组
  if (!Array.isArray(s.propertyGroups)) {
    return { ok: false, reason: '房产数据缺失。' };
  }
  const validTypes: PropertyType[] = ['basic', 'comfort', 'family'];
  const groups: PropertyGroup[] = [];
  let total = 0;
  for (const item of s.propertyGroups) {
    if (typeof item !== 'object' || item === null) {
      return { ok: false, reason: '房产分组数据格式不正确。' };
    }
    const g = item as Record<string, unknown>;
    if (!validTypes.includes(g.type as PropertyType)) {
      return { ok: false, reason: `未知的房型：${String(g.type)}。` };
    }
    if (typeof g.renovation !== 'number' || ![0, 1, 2].includes(g.renovation as number)) {
      return { ok: false, reason: '翻新等级无效（应为 0/1/2）。' };
    }
    if (typeof g.community !== 'number' || (g.community as number) < 0 || (g.community as number) > 5) {
      return { ok: false, reason: '社区编号无效（应为 0-5）。' };
    }
    if (typeof g.total !== 'number' || !Number.isInteger(g.total) || (g.total as number) < 0) {
      return { ok: false, reason: '房产数量无效。' };
    }
    if (typeof g.occupied !== 'number' || !Number.isInteger(g.occupied) || (g.occupied as number) < 0) {
      return { ok: false, reason: '出租数量无效。' };
    }
    if ((g.occupied as number) > (g.total as number)) {
      return { ok: false, reason: '某分组的出租数量超过了持有数量。' };
    }
    total += g.total as number;
    groups.push({
      id: String(g.id ?? `${g.type}-${groups.length}`),
      type: g.type as PropertyType,
      renovation: g.renovation as PropertyGroup['renovation'],
      community: g.community as number,
      total: g.total as number,
      occupied: g.occupied as number,
    });
  }

  // 房型供应上限
  for (const type of validTypes) {
    const byType = countByType(groups, type);
    const maxByType = { basic: 600, comfort: 400, family: 200 }[type];
    if (byType > maxByType) {
      return { ok: false, reason: `${type} 房型数量 ${byType} 超过供应上限 ${maxByType}。` };
    }
  }
  if (total > GOAL_PROPERTIES) {
    return { ok: false, reason: `房产总数 ${total} 超过 1200 套上限。` };
  }

  // 月初出租数校验
  const occupied = totalOccupied(groups);
  if ((s.monthStartOccupied as number) > occupied) {
    return { ok: false, reason: '月初出租数超过当前出租总数。' };
  }

  // 布尔字段
  const boolFields = ['managerEnabled', 'amenitiesEnabled', 'renewalServiceEnabled', 'autoRecruitEnabled', 'hasWon'];
  for (const key of boolFields) {
    if (typeof s[key] !== 'boolean') {
      return { ok: false, reason: `存档字段"${key}"缺失或不是布尔值。` };
    }
  }

  // 字符串枚举字段
  const enumFields: [string, string[]][] = [
    ['marketingPlan', ['natural', 'community', 'city']],
    ['maintenancePlan', ['economy', 'standard', 'premium', 'paused']],
    ['recruitmentPriority', ['basic-first', 'rent-first']],
  ];
  for (const [key, allowed] of enumFields) {
    if (typeof s[key] !== 'string' || !allowed.includes(s[key] as string)) {
      return { ok: false, reason: `存档字段"${key}"无效。` };
    }
  }

  // 数组字段
  const arrayFields = ['currentEventIds', 'resolvedEventIds', 'storyFlags', 'storyCompletedChains', 'reports', 'achievements', 'communityNames', 'lastEventResults'];
  for (const key of arrayFields) {
    if (!Array.isArray(s[key])) {
      return { ok: false, reason: `存档字段"${key}"缺失或不是数组。` };
    }
  }

  // preferences
  if (
    typeof s.preferences !== 'object' ||
    s.preferences === null ||
    typeof (s.preferences as Record<string, unknown>).soundEnabled !== 'boolean' ||
    typeof (s.preferences as Record<string, unknown>).reducedMotion !== 'boolean'
  ) {
    return { ok: false, reason: '偏好设置数据无效。' };
  }

  const state: GameState = {
    saveVersion: SAVE_VERSION,
    monthIndex: s.monthIndex as number,
    cashCents: s.cashCents as number,
    propertyGroups: groups,
    satisfaction: s.satisfaction as number,
    maintenance: s.maintenance as number,
    managerLevel: s.managerLevel as number,
    amenityLevel: s.amenityLevel as number,
    managerEnabled: s.managerEnabled as boolean,
    amenitiesEnabled: s.amenitiesEnabled as boolean,
    marketingPlan: s.marketingPlan as GameState['marketingPlan'],
    maintenancePlan: s.maintenancePlan as GameState['maintenancePlan'],
    renewalServiceEnabled: s.renewalServiceEnabled as boolean,
    autoRecruitEnabled: s.autoRecruitEnabled as boolean,
    recruitmentPriority: s.recruitmentPriority as GameState['recruitmentPriority'],
    monthStartOccupied: s.monthStartOccupied as number,
    candidatesUsedThisMonth: s.candidatesUsedThisMonth as number,
    currentEventIds: (s.currentEventIds as unknown[]).map(String),
    resolvedEventIds: (s.resolvedEventIds as unknown[]).map(String),
    storyFlags: (s.storyFlags as unknown[]).map(String),
    storyCompletedChains: (s.storyCompletedChains as unknown[]).map(String),
    consecutiveGoalMonths: s.consecutiveGoalMonths as number,
    hasWon: s.hasWon as boolean,
    totalRentEarnedCents: s.totalRentEarnedCents as number,
    reports: (s.reports as unknown[]).map((r) => r as GameState['reports'][number]),
    achievements: (s.achievements as unknown[]).map(String),
    rngSeed: s.rngSeed as number,
    tutorialStep: s.tutorialStep as number,
    lastEventResults: (s.lastEventResults as unknown[]).map((r) => r as GameState['lastEventResults'][number]),
    communityNames: (s.communityNames as unknown[]).map(String),
    preferences: (s.preferences as GameState['preferences']),
  };

  return { ok: true, state };
}

/** 旧版本迁移（当前版本无需迁移，保留扩展点） */
function migrateState(state: GameState): GameState {
  // 确保本月事件存在（兼容异常情况）
  if (state.currentEventIds.length === 0 && !state.hasWon) {
    const events = selectEventsForMonth(state);
    if (events.length > 0) {
      return { ...state, currentEventIds: events };
    }
  }
  return state;
}

/** 下载存档文件到本地 */
export function downloadSaveFile(state: GameState): void {
  const json = exportSave(state);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const year = Math.floor(state.monthIndex / 12) + 1;
  const month = (state.monthIndex % 12) + 1;
  a.href = url;
  a.download = `房东小日子-存档-第${year}年${month}月.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
