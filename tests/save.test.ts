import { describe, expect, it } from 'vitest';
import { createInitialState, applyPurchase } from '../src/game/economy';
import { parseSaveJson, validateState, exportSave } from '../src/game/save';
import type { GameState } from '../src/game/types';

describe('存档往返', () => {
  it('导出 → 导入后关键状态一致', () => {
    let state = createInitialState();
    state = applyPurchase(state, 'basic', 4);
    state = {
      ...state,
      satisfaction: 82,
      maintenance: 77,
      storyFlags: ['story-light-1'],
      resolvedEventIds: ['night-light'],
      achievements: ['first-rent'],
      monthIndex: 5,
    };
    const json = exportSave(state);
    const parsed = parseSaveJson(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.state.cashCents).toBe(state.cashCents);
    expect(parsed.state.monthIndex).toBe(state.monthIndex);
    expect(parsed.state.satisfaction).toBe(state.satisfaction);
    expect(parsed.state.maintenance).toBe(state.maintenance);
    expect(parsed.state.storyFlags).toEqual(state.storyFlags);
    expect(parsed.state.resolvedEventIds).toEqual(state.resolvedEventIds);
    expect(parsed.state.achievements).toEqual(state.achievements);
    expect(parsed.state.propertyGroups).toEqual(state.propertyGroups);
    expect(parsed.state.preferences).toEqual(state.preferences);
  });

  it('损坏的 JSON 返回可理解的原因', () => {
    const result = parseSaveJson('不是 JSON {{{');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBeTruthy();
    }
  });

  it('缺少字段返回可理解的原因', () => {
    const result = parseSaveJson('{}');
    expect(result.ok).toBe(false);
  });

  it('拒绝负数资金', () => {
    const state = createInitialState();
    const bad = { ...state, cashCents: -100 };
    const result = validateState(bad);
    expect(result.ok).toBe(false);
  });

  it('拒绝超过供应上限的房型数量', () => {
    let state = createInitialState();
    state = applyPurchase(state, 'basic', 592); // 600
    const bad = {
      ...state,
      propertyGroups: [
        ...state.propertyGroups,
        { id: 'extra', type: 'basic' as const, renovation: 0, community: 0, total: 1, occupied: 0 },
      ],
    };
    const result = validateState(bad);
    expect(result.ok).toBe(false);
  });

  it('拒绝超过 1200 套总上限', () => {
    let state = createInitialState();
    state = applyPurchase(state, 'basic', 592);
    state = applyPurchase(state, 'comfort', 400);
    state = applyPurchase(state, 'family', 200);
    expect(state.propertyGroups.reduce((s, g) => s + g.total, 0)).toBe(1200);
    const bad = {
      ...state,
      propertyGroups: [
        ...state.propertyGroups,
        { id: 'extra', type: 'basic' as const, renovation: 0, community: 0, total: 1, occupied: 0 },
      ],
    };
    const result = validateState(bad);
    expect(result.ok).toBe(false);
  });

  it('拒绝出租数超过持有数的分组', () => {
    const state = createInitialState();
    const bad = {
      ...state,
      propertyGroups: [
        { id: 'g', type: 'basic' as const, renovation: 0, community: 0, total: 2, occupied: 5 },
      ],
    };
    const result = validateState(bad);
    expect(result.ok).toBe(false);
  });

  it('拒绝超出范围的满意度与维护状态', () => {
    const state = createInitialState();
    expect(validateState({ ...state, satisfaction: 101 }).ok).toBe(false);
    expect(validateState({ ...state, maintenance: -1 }).ok).toBe(false);
  });

  it('拒绝未知枚举值', () => {
    const state = createInitialState();
    expect(validateState({ ...state, marketingPlan: 'galactic' }).ok).toBe(false);
    expect(validateState({ ...state, maintenancePlan: 'extreme' }).ok).toBe(false);
  });

  it('拒绝未来版本的存档', () => {
    const state = createInitialState();
    expect(validateState({ ...state, saveVersion: 999 }).ok).toBe(false);
  });
});
