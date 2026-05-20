/**
 * 统一 localStorage 服务 — 所有键名统一使用 TMcrop_ 前缀
 *
 * 迁移策略: 首次读取旧key时自动迁移到新key，保留旧key不删除
 */

const PREFIX = 'TMcrop_';

/** 旧key→新key映射（不删除旧数据，仅同时写入新key） */
const KEY_MIGRATION_MAP: Record<string, string> = {
  token: 'token',
  userId: 'userId',
  username: 'username',
  realName: 'realName',
  userRoles: 'userRoles',
  isAdmin: 'isAdmin',
  department: 'department',
  crop_orders: 'crop_orders',
  crop_instances: 'crop_instances',
  crop_seed_sources: 'crop_seed_sources',
  crop_seedlings: 'crop_seedlings',
  crop_plantings: 'crop_plantings',
  harvest_records: 'harvest_records',
  OVERTIME_RECORDS: 'OVERTIME_RECORDS',
  SALARY_RECORDS: 'SALARY_RECORDS',
};

/** 生成带前缀的键名 */
export function storageKey(key: string): string {
  return PREFIX + key;
}

/** 读取（优先读新key，回退旧key并自动迁移） */
export function storageGet(key: string): string | null {
  const newKey = storageKey(key);
  const newVal = localStorage.getItem(newKey);
  if (newVal !== null) return newVal;

  // 回退读取旧key
  const oldKey = KEY_MIGRATION_MAP[key];
  if (oldKey && oldKey !== key) {
    const oldVal = localStorage.getItem(oldKey);
    if (oldVal !== null) {
      // 自动迁移到新key，保留旧key
      localStorage.setItem(newKey, oldVal);
      return oldVal;
    }
  }

  // 直接读无前缀key
  const bareVal = localStorage.getItem(key);
  if (bareVal !== null) {
    localStorage.setItem(newKey, bareVal);
    return bareVal;
  }

  return null;
}

/** 写入（始终写新key） */
export function storageSet(key: string, value: string): void {
  localStorage.setItem(storageKey(key), value);
}

/** 删除（同时删除新旧key） */
export function storageRemove(key: string): void {
  localStorage.removeItem(storageKey(key));
  const oldKey = KEY_MIGRATION_MAP[key];
  if (oldKey && oldKey !== key) {
    localStorage.removeItem(oldKey);
  }
  localStorage.removeItem(key);
}
