/**
 * 无界面通关模拟脚本。
 * 运行：npm run simulate
 * 用合理策略从初始状态玩到通关，验证游戏数值可通关（PRD §20）。
 */
import { simulateGame } from '../src/game/simulator';
import { monthLabel, totalProperties } from '../src/game/economy';

const result = simulateGame({ maxMonths: 240, verbose: true });

console.log('===== 房东小日子 · 通关模拟 =====');
console.log(`结果: ${result.won ? '✅ 成功通关' : '❌ 未通关'}`);
console.log(`用时: ${result.months} 个月`);
console.log(`最终: ${monthLabel(result.state.monthIndex)}`);
console.log(`房产: ${totalProperties(result.state.propertyGroups)} 套`);
console.log(`累计租金: ¥${(result.state.totalRentEarnedCents / 100).toLocaleString()}`);
console.log(`最终现金: ¥${(result.state.cashCents / 100).toLocaleString()}`);
console.log(`满意度: ${result.state.satisfaction} · 维护: ${result.state.maintenance}`);
console.log(`故事链: ${result.state.storyCompletedChains.length} 条完成`);
console.log('');
console.log('--- 进程记录（每6个月） ---');
for (const line of result.log) {
  console.log(line);
}

if (!result.won) {
  process.exitCode = 1;
}
