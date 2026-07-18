/**
 * 2026-07-18 P3-L7：JSON 池通用解析工具（4 处重复 parseJsonList/parseJsonArray 统一）
 * - 兼容 string JSON / 已解析的 array / null / undefined
 * - 不抛错，无效数据返回空数组
 */

export function parseJsonList<T = any>(raw: unknown): T[] {
  if (raw == null) return [];
  let arr: any = raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr.filter((x) => x != null);
}