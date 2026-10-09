import { describe, expect, it } from 'vitest';
import { simulateGame } from '../src/game/simulator';
import { totalProperties } from '../src/game/economy';
import { GOAL_PROPERTIES, GOAL_RENT_CENTS } from '../src/game/constants';

describe('通关模拟（PRD §20）', () => {
  it('模拟策略能够从初始状态通关', () => {
    const result = simulateGame({ maxMonths: 240 });
    console.log(`[sim] 通关: ${result.won}, 用时 ${result.months} 个月`);
    for (const line of result.log) {
      console.log(`[sim] ${line}`);
    }
    expect(result.won).toBe(true);
    expect(result.months).toBeLessThan(240);
  }, 120_000);

  it('通关时房产为 1200 套', () => {
    const result = simulateGame({ maxMonths: 240 });
    expect(result.won).toBe(true);
    expect(totalProperties(result.state.propertyGroups)).toBe(GOAL_PROPERTIES);
  }, 120_000);

  it('通关时月租金恰好 160 万元', () => {
    const result = simulateGame({ maxMonths: 240 });
    expect(result.won).toBe(true);
    const rent = result.state.propertyGroups.reduce(
      (s, g) => s + g.occupied * (g.type === 'basic' ? 100_000 : g.type === 'comfort' ? 150_000 : 200_000),
      0
    );
    expect(rent).toBe(GOAL_RENT_CENTS);
  }, 120_000);

  it('通关时房型组合为 600/400/200', () => {
    const result = simulateGame({ maxMonths: 240 });
    expect(result.won).toBe(true);
    const basic = result.state.propertyGroups
      .filter((g) => g.type === 'basic')
      .reduce((s, g) => s + g.total, 0);
    const comfort = result.state.propertyGroups
      .filter((g) => g.type === 'comfort')
      .reduce((s, g) => s + g.total, 0);
    const family = result.state.propertyGroups
      .filter((g) => g.type === 'family')
      .reduce((s, g) => s + g.total, 0);
    expect(basic).toBe(600);
    expect(comfort).toBe(400);
    expect(family).toBe(200);
  }, 120_000);
});
