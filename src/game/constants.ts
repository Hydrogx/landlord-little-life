import type { MarketingPlan, MaintenancePlan, PropertyType } from './types';

/** 存档版本 */
export const SAVE_VERSION = 1;
export const SAVE_KEY = 'landlord-little-life:save:v1';
export const BACKUP_KEY = 'landlord-little-life:save:v1:backup';

/** 房型定义：最大供应、基础月租金(分)、购买价(分)、解锁房产数 */
export const PROPERTY_TYPES: PropertyType[] = ['basic', 'comfort', 'family'];
export const TYPE_INFO: Record<
  PropertyType,
  {
    name: string;
    shortName: string;
    max: number;
    rentCents: number;
    priceCents: number;
    unlockAt: number;
    emoji: string;
    color: string;
    desc: string;
  }
> = {
  basic: {
    name: '基础公寓',
    shortName: '基础',
    max: 600,
    rentCents: 100_000, // ¥1,000
    priceCents: 600_000, // ¥6,000
    unlockAt: 0,
    emoji: '🏢',
    color: '#9BCBEB',
    desc: '起步与规模扩张',
  },
  comfort: {
    name: '舒适公寓',
    shortName: '舒适',
    max: 400,
    rentCents: 150_000, // ¥1,500
    priceCents: 900_000, // ¥9,000
    unlockAt: 20,
    emoji: '🏡',
    color: '#8BD3B0',
    desc: '中期经营，持有20套解锁',
  },
  family: {
    name: '家庭公寓',
    shortName: '家庭',
    max: 200,
    rentCents: 200_000, // ¥2,000
    priceCents: 1_200_000, // ¥12,000
    unlockAt: 100,
    emoji: '🏘️',
    color: '#FFB86B',
    desc: '后期社区经营，持有100套解锁',
  },
};

/** 终局目标 */
export const GOAL_PROPERTIES = 1200;
export const GOAL_RENT_CENTS = 160_000_000; // ¥1,600,000
export const GOAL_CONSECUTIVE_MONTHS = 6;

/** 初始状态 */
export const INITIAL_CASH_CENTS = 2_400_000; // ¥24,000
export const INITIAL_PROPERTIES = 8;
export const INITIAL_RENTED = 2;
export const INITIAL_SATISFACTION = 75;
export const INITIAL_MAINTENANCE = 90;

/** 招租规则 */
export const BASE_CANDIDATES = 2;
export const CANDIDATES_PER_PROPERTY_PERCENT = 3;
export const MARKETING_PLANS: Record<
  MarketingPlan,
  { name: string; costPerPropertyCents: number; bonusPercent: number; desc: string }
> = {
  natural: { name: '自然招租', costPerPropertyCents: 0, bonusPercent: 0, desc: '不花钱，靠社区口碑' },
  community: { name: '社区推广', costPerPropertyCents: 2000, bonusPercent: 2, desc: '每套每月¥20' },
  city: { name: '城市推广', costPerPropertyCents: 5000, bonusPercent: 5, desc: '每套每月¥50' },
};

/** 候选转化率（以万分比存储） */
export const CONVERSION_BASE_BPS = 6000; // 60%
export const CONVERSION_SATISFACTION_BPS = 40; // 每点满意度 +0.4%
export const CONVERSION_AMENITY_BPS = 300; // 每级配套 +3%
export const MIN_CONVERSION_BPS = 6000;
export const MAX_CONVERSION_BPS = 10000;

/** 退租规则（以万分比存储） */
export const VACANCY_BASE_BPS = 200; // 2%
export const VACANCY_LOW_SATISFACTION_THRESHOLD = 70;
export const VACANCY_LOW_SATISFACTION_BPS = 10; // 每低1点 +0.1%
export const VACANCY_MANAGER_BPS = 30; // 每级管家 -0.3%
export const MIN_VACANCY_BPS = 50; // 0.5%
export const MAX_VACANCY_BPS = 500; // 5%
/** 续租沟通：退租数量减少 floor(原数量×30%) */
export const RENEWAL_REDUCTION_NUM = 30;
export const RENEWAL_REDUCTION_DEN = 100;
export const RENEWAL_COST_PER_OCCUPIED_CENTS = 1000; // 每套已租¥10/月

/** 维护规则 */
export const MAINTENANCE_DECAY = 6;
export const LOW_MAINTENANCE_THRESHOLD = 60;
export const MAINTENANCE_PLANS: Record<
  MaintenancePlan,
  { name: string; costPerPropertyCents: number; recovery: number; satisfactionBonus: number; desc: string }
> = {
  economy: { name: '节省维护', costPerPropertyCents: 3000, recovery: 2, satisfactionBonus: 0, desc: '每套每月¥30' },
  standard: { name: '常规维护', costPerPropertyCents: 6000, recovery: 6, satisfactionBonus: 1, desc: '每套每月¥60' },
  premium: { name: '精细维护', costPerPropertyCents: 10000, recovery: 10, satisfactionBonus: 2, desc: '每套每月¥100' },
  paused: { name: '暂停维护', costPerPropertyCents: 0, recovery: 0, satisfactionBonus: 0, desc: '零费用，维护自然下降' },
};

/** 翻新规则 */
export const RENOVATION_UPGRADE_COSTS_CENTS = [80_000, 120_000]; // 0→1:¥800, 1→2:¥1200
export const RENOVATION_DISCOUNT_PERCENT = [0, 10, 20]; // 维护费用折扣（按数量加权）

/** 管家与社区配套 */
export const MANAGER_MAX_LEVEL = 3;
export const MANAGER_UPGRADE_COST_PER_LEVEL_CENTS = 1_000_000; // 每次升级 ¥10,000 × 目标等级
export const MANAGER_MONTHLY_PER_PROPERTY_CENTS = 1000; // 每套每月 ¥10 × 等级
export const AMENITY_MAX_LEVEL = 3;
export const AMENITY_UPGRADE_COST_PER_LEVEL_CENTS = 1_500_000; // 每次升级 ¥15,000 × 目标等级
export const AMENITY_MONTHLY_PER_PROPERTY_CENTS = 500; // 每套每月 ¥5 × 等级

/** 社区分区 */
export const MAX_COMMUNITIES = 6;
export const PROPERTIES_PER_COMMUNITY = 200;
export const DEFAULT_COMMUNITY_NAMES = ['梧桐里', '椰风苑', '港湾家园', '南头新城', '云谷社区', '星河湾畔'];

/** 时间 */
export const MONTHS_PER_YEAR = 12;

/** 购房快捷数量 */
export const PURCHASE_QUICK_COUNTS = [1, 5, 10, 50];
