import type { TenantEvent } from '../game/types';

/**
 * 租客事件库：24个事件，含4条故事链（每条3个节点）。
 * 每个事件至少有一个零费用选项；选项效果在选择时立即生效。
 */
export const ALL_EVENTS: TenantEvent[] = [
  // ================= 故事链 1：楼道之光（小林 × 阿杰） =================
  {
    id: 'night-light',
    title: '楼道里的小夜灯',
    description: '小林说，晚归时楼道有些暗，阿杰建议检查灯具。',
    characterId: 'xiaolin',
    choices: [
      { id: 'check', label: '常规检查', costCents: 0, satisfactionDelta: 1, resultText: '阿杰检查了楼道灯，大部分都亮着。租客们觉得房东很上心。' },
      { id: 'warm-light', label: '更换暖色灯具', costCents: 50_000, satisfactionDelta: 3, resultText: '暖色灯装好了，晚归的租客不再摸黑。' },
      { id: 'full-light', label: '整理照明与指示牌', costCents: 120_000, satisfactionDelta: 5, nextStoryFlag: 'story-light-1', resultText: '楼道照明与指示牌焕然一新，阿杰记下了每种灯具的接法。' },
    ],
    repeatable: false,
  },
  {
    id: 'ajie-learns',
    title: '阿杰的维修课',
    description: '阿杰想系统学习维修，向你请教社区里的老设备。',
    characterId: 'ajie',
    conditions: [{ kind: 'storyFlag', flag: 'story-light-1' }],
    choices: [
      { id: 'book', label: '借阅维修手册', costCents: 0, satisfactionDelta: 1, nextStoryFlag: 'story-light-2', resultText: '阿杰捧着维修手册看得入迷，约定下次一起来修公共灯。' },
      { id: 'course', label: '报修培训班', costCents: 80_000, satisfactionDelta: 3, nextStoryFlag: 'story-light-2', resultText: '阿杰上了培训班，工具包更专业了。' },
      { id: 'assistant', label: '请阿杰做维修助手', costCents: 150_000, satisfactionDelta: 5, maintenanceDelta: 5, nextStoryFlag: 'story-light-2', resultText: '阿杰成了社区维修助手，公共设施越修越快。' },
    ],
    repeatable: false,
  },
  {
    id: 'community-lighting',
    title: '明亮的楼道',
    description: '阿杰完成了照明学习，社区楼道可以更亮一点。',
    characterId: 'ajie',
    conditions: [{ kind: 'storyFlag', flag: 'story-light-2' }],
    choices: [
      { id: 'tips', label: '张贴节能提示', costCents: 0, satisfactionDelta: 1, resultText: '节能提示贴出来了，租客们纷纷点赞。' },
      { id: 'sensor', label: '安装感应灯', costCents: 200_000, satisfactionDelta: 4, maintenanceDelta: 3, nextStoryFlag: 'story-light-3', resultText: '感应灯亮了，人走灯缓灭，节能又安心。' },
      { id: 'renovate-light', label: '全楼道暖色灯改造', costCents: 500_000, satisfactionDelta: 8, maintenanceDelta: 5, nextStoryFlag: 'story-light-3', resultText: '整栋楼的暖色灯改造完成，阿杰和小林一起点亮最后一盏灯。' },
    ],
    repeatable: false,
  },

  // ================= 故事链 2：社区画展（阿晴） =================
  {
    id: 'qing-corner',
    title: '画画的角落',
    description: '阿晴在楼道角落支起画板，正在画深圳的天际线。',
    characterId: 'aqing',
    choices: [
      { id: 'chat', label: '聊聊她的画', costCents: 0, satisfactionDelta: 1, resultText: '阿晴聊起画里的深圳，眼里有光。' },
      { id: 'wall', label: '布置一面涂鸦墙', costCents: 60_000, satisfactionDelta: 3, nextStoryFlag: 'story-art-1', resultText: '涂鸦墙布置好了，阿晴有了固定的创作角落。' },
      { id: 'studio', label: '腾出一间画室', costCents: 150_000, satisfactionDelta: 5, maintenanceDelta: -2, nextStoryFlag: 'story-art-1', resultText: '画室腾出来了，阿晴可以安心创作。' },
    ],
    repeatable: false,
  },
  {
    id: 'qing-exhibit',
    title: '画展筹备',
    description: '阿晴想在社区办一场小型画展，征集你的意见。',
    characterId: 'aqing',
    conditions: [{ kind: 'storyFlag', flag: 'story-art-1' }],
    choices: [
      { id: 'poster', label: '帮忙打印海报', costCents: 0, satisfactionDelta: 1, nextStoryFlag: 'story-art-2', resultText: '海报贴出去了，租客们都来围观。' },
      { id: 'frame', label: '赞助画框', costCents: 90_000, satisfactionDelta: 3, nextStoryFlag: 'story-art-2', resultText: '画框到位，阿晴的作品更显眼了。' },
      { id: 'host', label: '协办社区画展', costCents: 200_000, satisfactionDelta: 6, nextStoryFlag: 'story-art-2', resultText: '画展场地布置完成，阿晴兴奋地核对作品清单。' },
    ],
    repeatable: false,
  },
  {
    id: 'qing-opening',
    title: '画展开幕',
    description: '画展开幕在即，阿晴邀请你参加开幕活动。',
    characterId: 'aqing',
    conditions: [{ kind: 'storyFlag', flag: 'story-art-2' }],
    choices: [
      { id: 'visit', label: '参观画展', costCents: 0, satisfactionDelta: 2, resultText: '画展很热闹，租客们举着阿晴的画合影。' },
      { id: 'tea', label: '开幕茶会', costCents: 120_000, satisfactionDelta: 5, resultText: '茶会上，阿晴给每位来宾讲了画背后的故事。' },
      { id: 'market', label: '画展 + 邻里市集', costCents: 300_000, satisfactionDelta: 9, nextStoryFlag: 'story-art-3', resultText: '画展和邻里市集一起开张，整个社区都热闹起来，阿晴的画被订走了好几幅。' },
    ],
    repeatable: false,
  },

  // ================= 故事链 3：阳台小番茄（乐乐一家） =================
  {
    id: 'lele-storage',
    title: '收纳小能手',
    description: '乐乐家阳台堆满纸箱，乐乐妈想重新收纳。',
    characterId: 'lele',
    choices: [
      { id: 'help', label: '帮忙整理', costCents: 0, satisfactionDelta: 1, resultText: '纸箱整理好了，乐乐找到了他的小汽车。' },
      { id: 'boxes', label: '送上收纳箱', costCents: 40_000, satisfactionDelta: 3, nextStoryFlag: 'story-family-1', resultText: '收纳箱到位，阳台清爽了不少。' },
      { id: 'renovate', label: '阳台收纳改造', costCents: 100_000, satisfactionDelta: 5, maintenanceDelta: -2, nextStoryFlag: 'story-family-1', resultText: '阳台收纳改造完成，乐乐有了自己的玩具角。' },
    ],
    repeatable: false,
  },
  {
    id: 'lele-tomato',
    title: '阳台小番茄',
    description: '乐乐想在阳台种小番茄，向你讨教经验。',
    characterId: 'lele',
    conditions: [{ kind: 'storyFlag', flag: 'story-family-1' }],
    choices: [
      { id: 'seeds', label: '分享种子', costCents: 0, satisfactionDelta: 1, nextStoryFlag: 'story-family-2', resultText: '乐乐小心翼翼埋下种子，每天跑去浇水。' },
      { id: 'pots', label: '送上花盆与营养土', costCents: 50_000, satisfactionDelta: 3, nextStoryFlag: 'story-family-2', resultText: '花盆和营养土送到，乐乐的小番茄有了新家。' },
      { id: 'garden', label: '搭建亲子小菜园', costCents: 180_000, satisfactionDelta: 6, maintenanceDelta: 2, nextStoryFlag: 'story-family-2', resultText: '亲子小菜园搭好了，乐乐一家的阳台绿意盎然。' },
    ],
    repeatable: false,
  },
  {
    id: 'lele-picnic',
    title: '亲子野餐会',
    description: '小番茄结果了，乐乐家想办一场野餐会。',
    characterId: 'lele',
    conditions: [{ kind: 'storyFlag', flag: 'story-family-2' }],
    choices: [
      { id: 'join', label: '参加野餐', costCents: 0, satisfactionDelta: 2, resultText: '野餐会上，乐乐请大家品尝小番茄。' },
      { id: 'snacks', label: '准备野餐垫与零食', costCents: 80_000, satisfactionDelta: 5, resultText: '野餐垫铺开，零食齐全，孩子们玩得满头大汗。' },
      { id: 'family-day', label: '社区亲子日', costCents: 250_000, satisfactionDelta: 8, nextStoryFlag: 'story-family-3', resultText: '社区亲子日热闹开场，乐乐家的小番茄成了最抢手的零食。' },
    ],
    repeatable: false,
  },

  // ================= 故事链 4：社区花园（周叔） =================
  {
    id: 'zhou-balcony',
    title: '周叔的阳台花园',
    description: '周叔的阳台四季花开，他请你参观。',
    characterId: 'zhoushu',
    choices: [
      { id: 'visit', label: '参观阳台', costCents: 0, satisfactionDelta: 1, resultText: '周叔的阳台满是花香，他讲起每盆花的来历。' },
      { id: 'seeds', label: '送上花种', costCents: 30_000, satisfactionDelta: 3, nextStoryFlag: 'story-garden-1', resultText: '花种包好，周叔笑着说今年试种新品种。' },
      { id: 'rack', label: '阳台花架', costCents: 90_000, satisfactionDelta: 5, nextStoryFlag: 'story-garden-1', resultText: '花架装好了，周叔的阳台更像小花园。' },
    ],
    repeatable: false,
  },
  {
    id: 'zhou-garden-plan',
    title: '社区花园计划',
    description: '周叔想把阳台经验分享给社区，筹划一个小花园。',
    characterId: 'zhoushu',
    conditions: [{ kind: 'storyFlag', flag: 'story-garden-1' }],
    choices: [
      { id: 'discuss', label: '讨论方案', costCents: 0, satisfactionDelta: 1, nextStoryFlag: 'story-garden-2', resultText: '周叔在白纸上画出花园草图，租客们围过来出主意。' },
      { id: 'seedlings', label: '认购花苗', costCents: 100_000, satisfactionDelta: 4, nextStoryFlag: 'story-garden-2', resultText: '花苗送到社区，租客们轮流浇水。' },
      { id: 'build', label: '共建社区花园', costCents: 350_000, satisfactionDelta: 8, maintenanceDelta: 3, nextStoryFlag: 'story-garden-2', resultText: '社区花园落成，周叔站在花丛中笑得合不拢嘴。' },
    ],
    repeatable: false,
  },
  {
    id: 'zhou-bloom',
    title: '花园盛开',
    description: '社区花园的第一季花开了，周叔想办个赏花活动。',
    characterId: 'zhoushu',
    conditions: [{ kind: 'storyFlag', flag: 'story-garden-2' }],
    choices: [
      { id: 'admire', label: '赏花', costCents: 0, satisfactionDelta: 2, resultText: '租客们在花前拍照，孩子们追着蝴蝶跑。' },
      { id: 'tea-party', label: '花园茶话会', costCents: 100_000, satisfactionDelta: 5, resultText: '茶话会上，周叔讲起了年轻时种花的故事。' },
      { id: 'festival', label: '社区花园节', costCents: 300_000, satisfactionDelta: 8, nextStoryFlag: 'story-garden-3', resultText: '花园节这天，整个社区花香四溢，周叔被孩子们围在中间讲花的故事。' },
    ],
    repeatable: false,
  },

  // ================= 独立事件 =================
  {
    id: 'xiaoqiao-pet',
    title: '年糕的体检',
    description: '小乔带橘猫年糕做体检，问社区能不能设宠物饮水点。',
    characterId: 'xiaoqiao',
    choices: [
      { id: 'pet', label: '摸摸年糕', costCents: 0, satisfactionDelta: 1, resultText: '年糕呼噜呼噜地蹭你的手，小乔笑了。' },
      { id: 'sticker', label: '宠物友好贴纸', costCents: 30_000, satisfactionDelta: 2, resultText: '宠物友好贴纸贴上了公告栏。' },
      { id: 'water', label: '宠物饮水点', costCents: 80_000, satisfactionDelta: 4, resultText: '楼下多了宠物饮水点，年糕第一个打卡。' },
    ],
    repeatable: true,
  },
  {
    id: 'ayuan-startup',
    title: '阿远的创业',
    description: '阿远刚从外地来深创业，搬进社区不久。',
    characterId: 'ayuan',
    conditions: [{ kind: 'minMonth', month: 2 }],
    choices: [
      { id: 'welcome', label: '欢迎阿远', costCents: 0, satisfactionDelta: 1, resultText: '阿远收到欢迎卡片，说这是来深圳最暖的一天。' },
      { id: 'introduce', label: '介绍邻居认识', costCents: 0, satisfactionDelta: 2, resultText: '你牵线介绍了陈姐和周叔，阿远认识了第一批邻居。' },
      { id: 'corner', label: '社区创业角', costCents: 120_000, satisfactionDelta: 4, resultText: '社区创业角挂牌，阿远有了固定的工作位。' },
    ],
    repeatable: true,
  },
  {
    id: 'rainy-day',
    title: '雨季来临',
    description: '深圳雨季来了，租客提醒注意楼道排水。',
    conditions: [{ kind: 'minMonth', month: 3 }],
    choices: [
      { id: 'drain', label: '检查排水', costCents: 0, satisfactionDelta: 1, maintenanceDelta: 2, resultText: '排水沟清理干净，雨季不再积水。' },
      { id: 'raincoat', label: '备好雨具', costCents: 40_000, satisfactionDelta: 2, resultText: '大堂备了共享雨伞，租客出门不慌。' },
      { id: 'dehumidify', label: '楼道除湿', costCents: 90_000, satisfactionDelta: 3, maintenanceDelta: 3, resultText: '楼道除湿完成，墙角的霉斑消失了。' },
    ],
    repeatable: true,
  },
  {
    id: 'commute',
    title: '早高峰通勤',
    description: '租客们讨论早高峰通勤太挤。',
    conditions: [{ kind: 'minProperties', count: 30 }],
    choices: [
      { id: 'tips', label: '张贴通勤贴士', costCents: 0, satisfactionDelta: 1, resultText: '通勤贴士贴上公告栏，租客们收藏了错峰路线。' },
      { id: 'bike', label: '共享单车月卡补贴', costCents: 60_000, satisfactionDelta: 3, resultText: '月卡补贴发放，租客骑行更方便了。' },
      { id: 'shuttle', label: '班车接驳点', costCents: 200_000, satisfactionDelta: 6, resultText: '接驳点设好了，早高峰不再手忙脚乱。' },
    ],
    repeatable: true,
  },
  {
    id: 'chenjie-breakfast',
    title: '陈姐的早餐',
    description: '陈姐的早餐店生意好，问要不要给租客优惠。',
    characterId: 'chenjie',
    choices: [
      { id: 'taste', label: '尝尝肠粉', costCents: 0, satisfactionDelta: 1, resultText: '肠粉滑嫩鲜美，你和租客都成了回头客。' },
      { id: 'coupon', label: '早餐优惠券', costCents: 50_000, satisfactionDelta: 3, resultText: '优惠券发下去，陈姐的店门口排起小队。' },
      { id: 'corner2', label: '社区早餐角', costCents: 150_000, satisfactionDelta: 5, resultText: '社区早餐角开张，热气腾腾的开始一天的生活。' },
    ],
    repeatable: true,
  },
  {
    id: 'midnight-noise',
    title: '深夜噪音',
    description: '有租客反映深夜楼道有脚步声和谈话声。',
    conditions: [{ kind: 'minMonth', month: 4 }],
    choices: [
      { id: 'remind', label: '友好提醒', costCents: 0, satisfactionDelta: 1, resultText: '你贴了温馨提醒，深夜楼道安静了许多。' },
      { id: 'mat', label: '隔音门垫', costCents: 70_000, satisfactionDelta: 3, resultText: '隔音门垫铺上，脚步声轻了。' },
      { id: 'soundproof', label: '隔音改造', costCents: 180_000, satisfactionDelta: 6, maintenanceDelta: -2, resultText: '楼道隔音改造完成，夜里只剩空调的轻响。' },
    ],
    repeatable: true,
  },
  {
    id: 'package-delivery',
    title: '快递柜满了',
    description: '电商大促，快递柜爆满，包裹堆在大堂。',
    conditions: [{ kind: 'minProperties', count: 50 }],
    choices: [
      { id: 'notify', label: '通知取件', costCents: 0, satisfactionDelta: 1, resultText: '你挨个通知，包裹很快被领完。' },
      { id: 'shelf', label: '增设临时货架', costCents: 50_000, satisfactionDelta: 3, resultText: '临时货架撑起了大促的包裹山。' },
      { id: 'smart', label: '智能快递柜', costCents: 250_000, satisfactionDelta: 6, resultText: '智能快递柜到位，取件扫码即走。' },
    ],
    repeatable: true,
  },
  {
    id: 'summer-heat',
    title: '炎炎夏日',
    description: '深圳高温预警，租客希望公共区域凉快一点。',
    conditions: [{ kind: 'minMonth', month: 5 }],
    choices: [
      { id: 'fan', label: '风扇检查', costCents: 0, satisfactionDelta: 1, resultText: '公共风扇都修好了，风凉了不少。' },
      { id: 'water', label: '公共饮水', costCents: 40_000, satisfactionDelta: 2, resultText: '大堂有了免费饮水点。' },
      { id: 'ac', label: '空调共享房', costCents: 120_000, satisfactionDelta: 4, resultText: '空调共享房开放，午后有了避暑的地方。' },
    ],
    repeatable: true,
  },
];

/** 故事链定义：所有节点 flag 点亮即完成 */
export interface StoryChainDef {
  id: string;
  name: string;
  characterId: string;
  desc: string;
  flags: string[];
  eventIds: string[];
}

export const STORY_CHAINS: StoryChainDef[] = [
  {
    id: 'chain-light',
    name: '楼道之光',
    characterId: 'ajie',
    desc: '阿杰从学徒到维修能手，照亮整个社区。',
    flags: ['story-light-1', 'story-light-2', 'story-light-3'],
    eventIds: ['night-light', 'ajie-learns', 'community-lighting'],
  },
  {
    id: 'chain-art',
    name: '社区画展',
    characterId: 'aqing',
    desc: '阿晴从角落写生到社区画展。',
    flags: ['story-art-1', 'story-art-2', 'story-art-3'],
    eventIds: ['qing-corner', 'qing-exhibit', 'qing-opening'],
  },
  {
    id: 'chain-family',
    name: '阳台小番茄',
    characterId: 'lele',
    desc: '乐乐一家从收纳到亲子日。',
    flags: ['story-family-1', 'story-family-2', 'story-family-3'],
    eventIds: ['lele-storage', 'lele-tomato', 'lele-picnic'],
  },
  {
    id: 'chain-garden',
    name: '社区花园',
    characterId: 'zhoushu',
    desc: '周叔把阳台花香带进整个社区。',
    flags: ['story-garden-1', 'story-garden-2', 'story-garden-3'],
    eventIds: ['zhou-balcony', 'zhou-garden-plan', 'zhou-bloom'],
  },
];
