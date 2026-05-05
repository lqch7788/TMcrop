/**
 * API字段映射工具
 * 将后端返回的snake_case字段转换为前端camelCase格式
 */

/**
 * 将下划线命名字段转换为驼峰命名
 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * 将对象的所有下划线字段转换为驼峰命名
 * @param obj - 待转换的对象
 * @returns 转换后的对象
 */
export function mapFieldsToCamelCase<T>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => mapFieldsToCamelCase<unknown>(item)) as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      const camelKey = toCamelCase(key);
      const value = (obj as Record<string, unknown>)[key];

      // 递归处理嵌套对象和数组
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[camelKey] = mapFieldsToCamelCase<unknown>(value);
      } else if (Array.isArray(value)) {
        result[camelKey] = (value as unknown[]).map(item =>
          item && typeof item === 'object' && !(item instanceof Date)
            ? mapFieldsToCamelCase<unknown>(item)
            : item
        );
      } else {
        result[camelKey] = value;
      }
    }
    return result as T;
  }

  return obj as T;
}

/**
 * 将驼峰命名字段转换为下划线命名
 */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * 将对象的所有驼峰命名字段转换为下划线命名
 * @param obj - 待转换的对象
 * @returns 转换后的对象
 */
export function mapFieldsToSnakeCase<T>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => mapFieldsToSnakeCase<unknown>(item)) as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      const snakeKey = toSnakeCase(key);
      const value = (obj as Record<string, unknown>)[key];

      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[snakeKey] = mapFieldsToSnakeCase<unknown>(value);
      } else if (Array.isArray(value)) {
        result[snakeKey] = (value as unknown[]).map(item =>
          item && typeof item === 'object' && !(item instanceof Date)
            ? mapFieldsToSnakeCase<unknown>(item)
            : item
        );
      } else {
        result[snakeKey] = value;
      }
    }
    return result as T;
  }

  return obj as T;
}
