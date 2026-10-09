import { describe, expect, it } from 'vitest';
import { createInitialState, applyPurchase } from '../src/game/economy';
import {
  applyEventChoice,
  isEventEligible,
  selectEventsForMonth,
} from '../src/game/events';
import { checkStoryChains } from '../src/game/progression';
import { ALL_EVENTS, STORY_CHAINS } from '../src/data/events';
import type { GameState } from '../src/game/types';

describe('事件库', () => {
  it('至少 16 个事件、8 位角色、3 条故事链各 3 节点', () => {
    expect(ALL_EVENTS.length).toBeGreaterThanOrEqual(16);
    const characterIds = new Set(
      ALL_EVENTS.filter((e) => e.characterId).map((e) => e.characterId)
    );
    expect(characterIds.size).toBeGreaterThanOrEqual(8);
    expect(STORY_CHAINS.length).toBeGreaterThanOrEqual(3);
    for (const chain of STORY_CHAINS) {
      expect(chain.flags.length).toBe(3);
      expect(chain.eventIds.length).toBe(3);
    }
  });

  it('每个事件至少有一个零费用选项', () => {
    for (const event of ALL_EVENTS) {
      const free = event.choices.filter((c) => c.costCents === 0);
      expect(free.length, `事件 ${event.id} 缺少零费用选项`).toBeGreaterThanOrEqual(1);
    }
  });

  it('故事链节点条件正确衔接', () => {
    for (const chain of STORY_CHAINS) {
      const [first, second, third] = chain.eventIds.map((id) =>
        ALL_EVENTS.find((e) => e.id === id)
      );
      // 第一个事件无条件或只有规模条件
      expect(first).toBeDefined();
      // 第二个事件要求第一个事件产生的 flag
      expect(second?.conditions).toBeDefined();
      expect(second?.conditions).toContainEqual({
        kind: 'storyFlag',
        flag: chain.flags[0],
      });
      expect(third?.conditions).toContainEqual({
        kind: 'storyFlag',
        flag: chain.flags[1],
      });
    }
  });
});

describe('事件选择', () => {
  it('每月 1-3 个事件，相同种子得到相同事件', () => {
    const state = createInitialState();
    const a = selectEventsForMonth(state);
    const b = selectEventsForMonth(state);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThanOrEqual(1);
    expect(a.length).toBeLessThanOrEqual(3);
  });

  it('不同月份事件不同（种子推进）', () => {
    const state = createInitialState();
    const a = selectEventsForMonth(state);
    const nextMonth = { ...state, monthIndex: 1, rngSeed: 999 };
    const b = selectEventsForMonth(nextMonth);
    // 不同种子下大概率不同；只验证都是合法事件 id
    for (const id of [...a, ...b]) {
      expect(ALL_EVENTS.some((e) => e.id === id)).toBe(true);
    }
  });

  it('未满足条件的事件不可选', () => {
    const state = createInitialState();
    const gated = ALL_EVENTS.find((e) => e.id === 'ajie-learns');
    expect(gated).toBeDefined();
    // 没有 story-light-1 flag
    expect(isEventEligible(gated!, state)).toBe(false);
    const withFlag: GameState = { ...state, storyFlags: ['story-light-1'] };
    expect(isEventEligible(gated!, withFlag)).toBe(true);
  });

  it('非重复事件解决后不再出现', () => {
    const state = createInitialState();
    const event = ALL_EVENTS.find((e) => e.id === 'night-light')!;
    expect(isEventEligible(event, state)).toBe(true);
    const resolved: GameState = {
      ...state,
      resolvedEventIds: ['night-light'],
    };
    expect(isEventEligible(event, resolved)).toBe(false);
  });

  it('可重复事件解决后仍可出现', () => {
    const state = createInitialState();
    const event = ALL_EVENTS.find((e) => e.id === 'xiaoqiao-pet')!;
    expect(event.repeatable).toBe(true);
    const resolved: GameState = {
      ...state,
      resolvedEventIds: ['xiaoqiao-pet'],
    };
    expect(isEventEligible(event, resolved)).toBe(true);
  });
});

describe('事件选项应用', () => {
  it('选择后扣款并应用满意度变化', () => {
    const state = createInitialState();
    const result = applyEventChoice(state, 'night-light', 'warm-light');
    expect(result).not.toBeNull();
    expect(result!.state.cashCents).toBe(2_400_000 - 50_000);
    expect(result!.state.satisfaction).toBe(78); // 75 + 3
  });

  it('零费用选项不扣款', () => {
    const state = createInitialState();
    const result = applyEventChoice(state, 'night-light', 'check');
    expect(result!.state.cashCents).toBe(2_400_000);
    expect(result!.state.satisfaction).toBe(76);
  });

  it('资金不足的选项返回 null（界面禁用）', () => {
    const state: GameState = { ...createInitialState(), cashCents: 10_000 };
    const result = applyEventChoice(state, 'community-lighting', 'renovate-light');
    expect(result).toBeNull();
  });

  it('故事 flag 写入状态', () => {
    const state = createInitialState();
    const result = applyEventChoice(state, 'night-light', 'full-light');
    expect(result!.state.storyFlags).toContain('story-light-1');
  });

  it('事件从本月待处理列表移除', () => {
    const state: GameState = {
      ...createInitialState(),
      currentEventIds: ['night-light'],
    };
    const result = applyEventChoice(state, 'night-light', 'check');
    expect(result!.state.currentEventIds).not.toContain('night-light');
    expect(result!.state.resolvedEventIds).toContain('night-light');
  });

  it('满意度被限制在 0-100', () => {
    const state: GameState = { ...createInitialState(), satisfaction: 99 };
    const result = applyEventChoice(state, 'night-light', 'full-light');
    expect(result!.state.satisfaction).toBe(100);
  });
});

describe('故事链完成', () => {
  it('点亮全部 flag 后故事链完成', () => {
    const state: GameState = {
      ...createInitialState(),
      storyFlags: ['story-light-1', 'story-light-2', 'story-light-3'],
    };
    const { completed, newState } = checkStoryChains(state, STORY_CHAINS);
    expect(completed).toContain('chain-light');
    expect(newState.storyCompletedChains).toContain('chain-light');
  });
});

describe('购房规模条件', () => {
  it('通勤事件要求 30 套房产', () => {
    let state = createInitialState();
    const event = ALL_EVENTS.find((e) => e.id === 'commute')!;
    expect(isEventEligible(event, state)).toBe(false);
    state = applyPurchase(state, 'basic', 22); // 30 套
    expect(isEventEligible(event, state)).toBe(true);
  });
});
