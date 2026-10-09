/** 命名租客角色（表现层，不逐人承担出租数据） */
export interface CharacterDef {
  id: string;
  name: string;
  role: string;
  emoji: string;
  bio: string;
  color: string;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'xiaolin',
    name: '小林',
    role: '初入职场的程序员',
    emoji: '👨‍💻',
    bio: '刚来深圳打拼，梦想是写出一款让人开心的App。',
    color: '#9BCBEB',
  },
  {
    id: 'aqing',
    name: '阿晴',
    role: '自由插画师',
    emoji: '👩‍🎨',
    bio: '把深圳的街巷画进本子，梦想办一场社区画展。',
    color: '#FFB86B',
  },
  {
    id: 'chenjie',
    name: '陈姐',
    role: '早餐店经营者',
    emoji: '👩‍🍳',
    bio: '天不亮就起来揉面，街坊都爱她的肠粉。',
    color: '#8BD3B0',
  },
  {
    id: 'ajie',
    name: '阿杰',
    role: '维修学徒',
    emoji: '👨‍🔧',
    bio: '工具包里装满了好奇，正在学习修理一切。',
    color: '#F6C177',
  },
  {
    id: 'lele',
    name: '乐乐一家',
    role: '年轻家庭',
    emoji: '👨‍👩‍👧',
    bio: '爸爸妈妈和乐乐，阳台种着小番茄。',
    color: '#EBBCF4',
  },
  {
    id: 'zhoushu',
    name: '周叔',
    role: '退休居民',
    emoji: '👴',
    bio: '退休后在阳台养花，愿意见证每个春天。',
    color: '#A8D08D',
  },
  {
    id: 'xiaoqiao',
    name: '小乔',
    role: '宠物护理师',
    emoji: '👩‍⚕️',
    bio: '和一只叫年糕的橘猫，照看社区里的毛孩子。',
    color: '#F7B8A4',
  },
  {
    id: 'ayuan',
    name: '阿远',
    role: '创业者',
    emoji: '🧑‍💼',
    bio: '从外地来深创业，正在认识新邻居。',
    color: '#A3C4F3',
  },
];

export function getCharacter(id: string): CharacterDef | undefined {
  return CHARACTERS.find((c) => c.id === id);
}
