import { useMemo } from 'react';
import type { GameState } from '../game/types';
import {
  countByType,
  occupiedByType,
  stageOf,
  totalOccupied,
  totalProperties,
} from '../game/economy';
import { AnimatedEmoji } from './AnimatedEmoji';
import { communityName } from '../data/communities';

interface CommunitySceneProps {
  state: GameState;
}

/**
 * 中央社区场景：SVG 绘制建筑，随阶段增加楼层、绿植和公共设施。
 * 只展示代表性建筑，并标注实际房产数量。
 */
export function CommunityScene({ state }: CommunitySceneProps) {
  const total = totalProperties(state.propertyGroups);
  const occupied = totalOccupied(state.propertyGroups);
  const stage = stageOf(total);
  const basic = countByType(state.propertyGroups, 'basic');
  const comfort = countByType(state.propertyGroups, 'comfort');
  const family = countByType(state.propertyGroups, 'family');
  const occupancyRate = total === 0 ? 0 : Math.round((occupied / total) * 100);

  // 代表性建筑数量：随规模增长，最多 8 栋
  const buildingCount = Math.min(8, Math.max(3, Math.ceil(total / 60)));
  const buildings = useMemo(() => {
    const list: { x: number; w: number; h: number; floors: number; type: 'basic' | 'comfort' | 'family'; lit: number }[] = [];
    const baseX = 40;
    const span = 520;
    for (let i = 0; i < buildingCount; i++) {
      const w = 44 + ((i * 37) % 26);
      const x = baseX + (i * (span / buildingCount)) + ((i * 13) % 10);
      // 楼层随阶段与房型分布
      const mix = i % 3;
      const type = mix === 0 ? 'basic' : mix === 1 ? 'comfort' : 'family';
      const available = type === 'basic' ? basic : type === 'comfort' ? comfort : family;
      const floors = Math.min(9, 2 + Math.floor((i * 7 + total) / 40) + (available > 0 ? 1 : 0));
      const h = floors * 26 + 10;
      const lit = occupied > 0 ? Math.min(floors * 3, Math.ceil((occupied / Math.max(1, total)) * floors * 3)) : 0;
      list.push({ x, w, h, floors, type, lit });
    }
    return list;
  }, [buildingCount, total, occupied, basic, comfort, family]);

  const amenityDecorations = state.amenitiesEnabled
    ? [
        { level: 1, emoji: '⛲', x: 60, y: 168, name: '喷泉' },
        { level: 2, emoji: '🛝', x: 480, y: 172, name: '滑梯' },
        { level: 3, emoji: '🌸', x: 280, y: 176, name: '花园' },
      ].filter((d) => d.level <= state.amenityLevel)
    : [];

  // 代表性租客（只展示少量）
  const residentCount = Math.min(5, Math.ceil(occupancyRate / 20));
  const residents = ['👨‍💻', '👩‍🎨', '👩‍🍳', '👴', '🐱'].slice(0, residentCount);

  return (
    <div className="community-scene" aria-label={`社区场景：${stage.name}阶段，共${total}套房产`}>
      <svg viewBox="0 0 600 260" className="scene-svg" role="img" aria-label="社区建筑插画">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#BFE3F7" />
            <stop offset="100%" stopColor="#EAF6FF" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="600" height="260" fill="url(#sky)" rx="16" />
        <circle cx="520" cy="44" r="22" fill="#FFE9A8" />
        <g opacity="0.9">
          <ellipse cx="120" cy="52" rx="34" ry="12" fill="#FFFFFF" />
          <ellipse cx="150" cy="46" rx="26" ry="10" fill="#FFFFFF" />
          <ellipse cx="360" cy="38" rx="30" ry="11" fill="#FFFFFF" />
        </g>
        {/* 地面 */}
        <rect x="0" y="196" width="600" height="64" fill="#BEE3C6" rx="0" />
        <rect x="0" y="196" width="600" height="8" fill="#9BD4A8" />
        {/* 树木 */}
        {[
          { x: 18, y: 172 },
          { x: 250, y: 178 },
          { x: 430, y: 170 },
          { x: 566, y: 176 },
        ].map((t, i) => (
          <g key={i}>
            <rect x={t.x} y={t.y} width="6" height="26" fill="#8B6B4A" rx="2" />
            <circle cx={t.x + 3} cy={t.y - 10} r="18" fill="#7CC48F" />
            <circle cx={t.x - 8} cy={t.y - 2} r="12" fill="#8BD3A2" />
            <circle cx={t.x + 14} cy={t.y - 2} r="12" fill="#8BD3A2" />
          </g>
        ))}
        {/* 建筑 */}
        {buildings.map((b, i) => {
          const color =
            b.type === 'basic' ? '#9BCBEB' : b.type === 'comfort' ? '#8BD3B0' : '#FFB86B';
          const baseY = 196;
          return (
            <g key={i}>
              <rect
                x={b.x}
                y={baseY - b.h}
                width={b.w}
                height={b.h}
                fill={color}
                rx="6"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              {/* 窗户 */}
              {Array.from({ length: b.floors * 3 }).map((_, w) => {
                const col = w % 3;
                const row = Math.floor(w / 3);
                const wx = b.x + 8 + col * (b.w - 16) / 2.4;
                const wy = baseY - b.h + 10 + row * 26;
                const isLit = w < b.lit;
                return (
                  <rect
                    key={w}
                    x={wx}
                    y={wy}
                    width="9"
                    height="11"
                    rx="2"
                    fill={isLit ? '#FFE9A8' : '#FFFFFF'}
                    opacity={isLit ? 1 : 0.75}
                  />
                );
              })}
              <rect x={b.x + b.w / 2 - 6} y={baseY - 14} width="12" height="14" rx="2" fill="#FFFFFF" opacity="0.9" />
            </g>
          );
        })}
        {/* 配套装饰 */}
        {amenityDecorations.map((d, i) => (
          <text key={i} x={d.x} y={d.y} fontSize="26" textAnchor="middle">
            {d.emoji}
          </text>
        ))}
        {/* 代表性租客 */}
        {residents.map((r, i) => (
          <text key={i} x={90 + i * 90} y={214} fontSize="20" textAnchor="middle">
            {r}
          </text>
        ))}
      </svg>
      <div className="scene-badges">
        <span className="scene-badge scene-badge--stage">{stage.name}阶段</span>
        <span className="scene-badge">房产 {total} 套</span>
        <span className="scene-badge">出租 {occupied} 套</span>
        <span className="scene-badge">入住率 {occupancyRate}%</span>
      </div>
      {state.amenitiesEnabled && state.amenityLevel > 0 && (
        <div className="scene-amenity-note">
          <AnimatedEmoji name="seedling" size={18} play="loop" />
          社区配套 Lv.{state.amenityLevel}：{amenityDecorations.map((d) => d.name).join('、') || '规划中'}
        </div>
      )}
      <div className="scene-community-names">
        {Array.from({ length: Math.min(6, Math.max(0, Math.ceil(total / 200))) }).map((_, i) => (
          <span key={i} className="scene-community-tag">
            {communityName(i, state.communityNames)}
          </span>
        ))}
      </div>
    </div>
  );
}
