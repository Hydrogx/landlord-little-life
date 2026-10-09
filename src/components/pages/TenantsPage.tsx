import { useState } from 'react';
import type { GameState, TenantEvent } from '../../game/types';
import { getCharacter, CHARACTERS } from '../../data/characters';
import { ALL_EVENTS, STORY_CHAINS } from '../../data/events';
import { getEvent } from '../../game/events';
import { formatYuan } from '../../game/economy';
import { AnimatedEmoji } from '../AnimatedEmoji';

interface TenantsPageProps {
  state: GameState;
  onChooseEvent: (eventId: string, choiceId: string) => { ok: boolean; error?: string };
  notify: (message: string, kind?: 'info' | 'error' | 'success') => void;
}

/** 租客页：人物卡、故事记录、当前事件 */
export function TenantsPage({ state, onChooseEvent, notify }: TenantsPageProps) {
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const currentEvents = state.currentEventIds
    .map((id) => getEvent(id))
    .filter((e): e is TenantEvent => Boolean(e));

  return (
    <div className="page tenants-page">
      <section className="card" aria-label="当前租客事件">
        <h3>
          <AnimatedEmoji name="bulb" size={22} play="loop" />
          本月租客事件
          <span className="card-sub">{currentEvents.length} 个待处理</span>
        </h3>
        {currentEvents.length === 0 ? (
          <p className="card-hint">本月事件都已处理完毕，下个月会有新的事件。</p>
        ) : (
          <div className="event-list">
            {currentEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                state={state}
                onChoose={(choiceId) => {
                  const result = onChooseEvent(event.id, choiceId);
                  if (!result.ok) {
                    notify(result.error ?? '选择失败', 'error');
                  } else {
                    notify('已处理', 'success');
                  }
                }}
              />
            ))}
          </div>
        )}
      </section>

      {state.lastEventResults.length > 0 && (
        <section className="card" aria-label="最近事件反馈">
          <h3>
            <AnimatedEmoji name="smile" size={22} play="loop" />
            最近反馈
          </h3>
          <ul className="event-results">
            {state.lastEventResults.map((r, i) => {
              const event = getEvent(r.eventId);
              return (
                <li key={i}>
                  <strong>{event?.title ?? '事件'}</strong>
                  <p>{r.resultText}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="card" aria-label="租客角色">
        <h3>
          <AnimatedEmoji name="handshake" size={22} play="loop" />
          租客们
        </h3>
        <div className="character-grid">
          {CHARACTERS.map((c) => {
            const involved = STORY_CHAINS.some((chain) => chain.characterId === c.id);
            return (
              <button
                key={c.id}
                type="button"
                className={`character-card ${selectedCharacter === c.id ? 'character-card--selected' : ''}`}
                onClick={() => setSelectedCharacter(selectedCharacter === c.id ? null : c.id)}
                style={{ ['--char-color' as string]: c.color }}
              >
                <span className="character-emoji" aria-hidden="true">
                  {c.emoji}
                </span>
                <strong>{c.name}</strong>
                <small>{c.role}</small>
                {involved && <span className="character-story-badge">有故事线</span>}
              </button>
            );
          })}
        </div>
        {selectedCharacter && (
          <div className="character-detail">
            <p>{CHARACTERS.find((c) => c.id === selectedCharacter)?.bio}</p>
          </div>
        )}
      </section>

      <section className="card" aria-label="故事链">
        <h3>
          <AnimatedEmoji name="glow-star" size={22} play="loop" />
          故事记录
        </h3>
        <div className="story-chain-list">
          {STORY_CHAINS.map((chain) => {
            const character = getCharacter(chain.characterId);
            const doneFlags = chain.flags.filter((f) => state.storyFlags.includes(f));
            const completed = state.storyCompletedChains.includes(chain.id);
            return (
              <div
                key={chain.id}
                className={`story-chain ${completed ? 'story-chain--done' : ''}`}
              >
                <div className="story-chain-header">
                  <span className="character-emoji" aria-hidden="true">
                    {character?.emoji}
                  </span>
                  <div>
                    <strong>{chain.name}</strong>
                    <small>{chain.desc}</small>
                  </div>
                  <span className="story-chain-status">
                    {completed ? '✅ 已完成' : `${doneFlags.length}/${chain.flags.length}`}
                  </span>
                </div>
                <div className="story-flags">
                  {chain.flags.map((flag, i) => {
                    const lit = state.storyFlags.includes(flag);
                    const event = ALL_EVENTS.find((e) => e.id === chain.eventIds[i]);
                    return (
                      <div key={flag} className={`story-flag ${lit ? 'story-flag--lit' : ''}`}>
                        <span className="story-flag-dot" aria-hidden="true">
                          {lit ? '●' : '○'}
                        </span>
                        <span>{event?.title ?? flag}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function EventCard({
  event,
  state,
  onChoose,
}: {
  event: TenantEvent;
  state: GameState;
  onChoose: (choiceId: string) => void;
}) {
  const character = getCharacter(event.characterId ?? '');
  return (
    <article className="event-card">
      <header className="event-header">
        {character && (
          <span className="event-character" style={{ ['--char-color' as string]: character.color }}>
            <span aria-hidden="true">{character.emoji}</span>
            {character.name}
          </span>
        )}
        <h4>{event.title}</h4>
      </header>
      <p className="event-description">{event.description}</p>
      <div className="event-choices">
        {event.choices.map((choice) => {
          const affordable = choice.costCents <= state.cashCents;
          return (
            <button
              key={choice.id}
              type="button"
              className="event-choice"
              disabled={!affordable}
              onClick={() => onChoose(choice.id)}
            >
              <span className="event-choice-label">{choice.label}</span>
              <span className="event-choice-effects">
                {choice.costCents > 0 && <span className="effect-cost">-{formatYuan(choice.costCents)}</span>}
                {choice.costCents === 0 && <span className="effect-free">免费</span>}
                {choice.satisfactionDelta !== 0 && (
                  <span className={`effect-sat ${choice.satisfactionDelta > 0 ? 'effect-sat--up' : 'effect-sat--down'}`}>
                    满意度 {choice.satisfactionDelta > 0 ? '+' : ''}
                    {choice.satisfactionDelta}
                  </span>
                )}
                {choice.maintenanceDelta !== undefined && choice.maintenanceDelta !== 0 && (
                  <span className={`effect-maint ${choice.maintenanceDelta > 0 ? 'effect-maint--up' : 'effect-maint--down'}`}>
                    维护 {choice.maintenanceDelta > 0 ? '+' : ''}
                    {choice.maintenanceDelta}
                  </span>
                )}
                {choice.nextStoryFlag && <span className="effect-story">📖 后续故事</span>}
              </span>
            </button>
          );
        })}
      </div>
    </article>
  );
}
