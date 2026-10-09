import type { GameState } from '../game/types';
import { AnimatedEmoji } from './AnimatedEmoji';

interface TutorialOverlayProps {
  step: number; // 1-5
  onNext: () => void;
  onSkip: () => void;
}

const TUTORIAL_STEPS: { title: string; emoji: string; text: string; hint: string }[] = [
  {
    title: '欢迎来到深圳！',
    emoji: '🏙️',
    text: '你在深圳有 8 套小房子，已经迎来了两位租客。慢慢经营，让更多人在这里安心生活吧。',
    hint: '目标：持有 1200 套房产并全部出租，每月租金 ¥1,600,000，连续保持 6 个月。',
  },
  {
    title: '查看你的房产',
    emoji: '🏢',
    text: '打开「房产」页可以看到 8 套基础公寓，其中 2 套已出租、6 套空置。房源按房型、翻新等级和社区分组管理。',
    hint: '空置的房子不产生租金，记得及时招租。',
  },
  {
    title: '招入第 3 位租客',
    emoji: '🪙',
    text: '打开「经营」页，使用自然招租（不花钱）。回到「房产」页，在空置分组上点击「招租」，或使用一键招租。',
    hint: '每月有固定的候选租客数量，重复点击不会刷新候选池。',
  },
  {
    title: '处理租客事件',
    emoji: '💌',
    text: '打开「租客」页，本月会有 1-3 个租客事件。每个事件都有免费选项，选择后会立即生效并显示故事反馈。',
    hint: '事件能提升满意度，满意度越高，招租转化率越高。',
  },
  {
    title: '购房与首次收租',
    emoji: '🏠',
    text: '资金够的时候可以购买更多房产（支持 1/5/10/50 快捷数量）。准备好后点击「结束本月」，完成首次收租并查看经营月报。',
    hint: '购房立即扣款，新房当月即可参与招租。',
  },
];

/** 新手引导：5 步，可跳过，不强制消费 */
export function TutorialOverlay({ step, onNext, onSkip }: TutorialOverlayProps) {
  if (step < 1 || step > 5) return null;
  const content = TUTORIAL_STEPS[step - 1];

  return (
    <div className="modal-overlay modal-overlay--visible" role="dialog" aria-modal="true" aria-label="新手引导">
      <div className="modal tutorial-modal">
        <div className="tutorial-emoji">
          <AnimatedEmoji name="sparkles" size={56} play="loop" />
          <span className="tutorial-emoji-static" aria-hidden="true">
            {content.emoji}
          </span>
        </div>
        <h2>{content.title}</h2>
        <p>{content.text}</p>
        <p className="tutorial-hint">💡 {content.hint}</p>
        <div className="tutorial-progress" aria-label={`第 ${step} 步，共 5 步`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={`tutorial-dot ${i < step ? 'tutorial-dot--done' : ''}`} />
          ))}
        </div>
        <div className="tutorial-actions">
          <button type="button" className="btn btn--ghost" onClick={onSkip}>
            跳过引导
          </button>
          <button type="button" className="btn btn--primary" onClick={onNext} autoFocus>
            {step === 5 ? '开始经营' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  );
}
