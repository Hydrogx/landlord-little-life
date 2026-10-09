import { ALL_EVENTS } from '../data/events';
import type { TenantEvent } from './types';
import type { GameState } from './types';
import { clamp, totalProperties } from './economy';
import { mulberry32, seededShuffle } from './rng';

/** 每月事件数量：1-3个 */
export function eventCountForMonth(rng: () => number): number {
  return 1 + Math.floor(rng() * 3);
}

export function isEventEligible(event: TenantEvent, state: GameState): boolean {
  // 非重复事件只出现一次（优先检查，避免被无条件事件提前放行）
  if (!event.repeatable && state.resolvedEventIds.includes(event.id)) return false;
  if (!event.conditions) return true;
  for (const cond of event.conditions) {
    switch (cond.kind) {
      case 'minProperties':
        if (totalProperties(state.propertyGroups) < cond.count) return false;
        break;
      case 'minMonth':
        if (state.monthIndex < cond.month) return false;
        break;
      case 'storyFlag':
        if (!state.storyFlags.includes(cond.flag)) return false;
        break;
      case 'notStoryFlag':
        if (state.storyFlags.includes(cond.flag)) return false;
        break;
      case 'notResolved':
        if (state.resolvedEventIds.includes(cond.eventId)) return false;
        break;
    }
  }
  return true;
}

/**
 * 为本月选择事件（带种子随机，确定性）。
 * 相同种子与决策得到相同事件。
 */
export function selectEventsForMonth(state: GameState): string[] {
  const rng = mulberry32((state.rngSeed ^ Math.imul(state.monthIndex + 1, 2654435761)) >>> 0);
  const eligible = ALL_EVENTS.filter((e) => isEventEligible(e, state));
  if (eligible.length === 0) return [];
  const shuffled = seededShuffle(eligible, rng);
  const count = Math.min(eventCountForMonth(rng), shuffled.length);
  return shuffled.slice(0, count).map((e) => e.id);
}

export function getEvent(id: string): TenantEvent | undefined {
  return ALL_EVENTS.find((e) => e.id === id);
}

export interface EventChoiceResult {
  state: GameState;
  event: TenantEvent;
  choiceId: string;
  resultText: string;
}

/** 应用事件选项（即时效果：扣款、满意度/维护变化、故事flag） */
export function applyEventChoice(state: GameState, eventId: string, choiceId: string): EventChoiceResult | null {
  const event = getEvent(eventId);
  if (!event) return null;
  const choice = event.choices.find((c) => c.id === choiceId);
  if (!choice) return null;
  if (choice.costCents > state.cashCents) return null; // 资金不足禁用

  let newState: GameState = {
    ...state,
    cashCents: state.cashCents - choice.costCents,
    satisfaction: clamp(state.satisfaction + choice.satisfactionDelta, 0, 100),
    maintenance:
      choice.maintenanceDelta !== undefined
        ? clamp(state.maintenance + choice.maintenanceDelta, 0, 100)
        : state.maintenance,
    storyFlags: choice.nextStoryFlag
      ? state.storyFlags.includes(choice.nextStoryFlag)
        ? state.storyFlags
        : [...state.storyFlags, choice.nextStoryFlag]
      : state.storyFlags,
    currentEventIds: state.currentEventIds.filter((id) => id !== eventId),
    resolvedEventIds:
      event.repeatable || state.resolvedEventIds.includes(eventId)
        ? state.resolvedEventIds
        : [...state.resolvedEventIds, eventId],
    lastEventResults: [
      ...state.lastEventResults,
      { eventId, resultText: choice.resultText },
    ].slice(-5),
  };

  return { state: newState, event, choiceId, resultText: choice.resultText };
}
