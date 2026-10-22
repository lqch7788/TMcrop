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

/**
 * 取一组业务编码里「- 后缀」的数值最大值。
 *
 * 2026-10-22（审核 L3）：日序取号不能用 SQL 的 `ORDER BY code DESC LIMIT 1` ——
 *   字符串比较下 "NS20261022-999" > "NS20261022-1000"（'9' > '1'），
 *   当日第 1000 条会重新算出 1000，与已存在编号撞唯一约束。
 * 调用方需把当日全部编码取回，交给本函数按数值求最大。
 */
export function maxNumericSuffix(codes: readonly string[]): number {
  let max = 0;
  for (const code of codes) {
    const idx = code.lastIndexOf('-');
    if (idx < 0) continue;
    const n = parseInt(code.slice(idx + 1), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}
