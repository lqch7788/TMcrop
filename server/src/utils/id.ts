/**
 * ID 生成工具
 * 提供统一的 ID 生成函数
 */

/**
 * 生成唯一 ID
 * @param prefix - ID 前缀
 * @returns 格式: prefix_timestamp_random
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}
