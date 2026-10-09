import { DEFAULT_COMMUNITY_NAMES, MAX_COMMUNITIES } from '../game/constants';

export const COMMUNITY_SCENE_EMOJIS = ['🌳', '🌲', '🌴', '🌺', '⛲', '🛝', '🥾', '🚲'];

export function communityName(index: number, customNames?: string[]): string {
  if (customNames && customNames[index]) return customNames[index];
  return DEFAULT_COMMUNITY_NAMES[index] ?? `社区${index + 1}`;
}

export function maxCommunitiesForProperties(total: number): number {
  if (total < 20) return 0;
  return Math.min(MAX_COMMUNITIES, Math.ceil(total / 200));
}
