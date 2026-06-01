/**
 * 安全的 JSON 解析工具
 * 解析失败返回 fallback，避免单条脏数据导致整个接口挂掉
 */

export function safeJsonParse<T>(str: unknown, fallback: T): T {
  if (str === null || str === undefined || str === '') {
    return fallback;
  }
  if (typeof str !== 'string') {
    // 已经是对象/数组，直接返回
    return str as T;
  }
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

/**
 * 安全 JSON.stringify（处理循环引用和 BigInt）
 */
export function safeJsonStringify(value: unknown, fallback = '[]'): string {
  try {
    return JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v));
  } catch {
    return fallback;
  }
}
