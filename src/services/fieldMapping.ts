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
 */
export function mapFieldsToCamelCase<T>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => mapFieldsToCamelCase(item)) as T;
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      const camelKey = toCamelCase(key);
      const value = obj[key];

      // 递归处理嵌套对象和数组
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[camelKey] = mapFieldsToCamelCase(value);
      } else if (Array.isArray(value)) {
        result[camelKey] = value.map(item =>
          item && typeof item === 'object' && !(item instanceof Date)
            ? mapFieldsToCamelCase(item)
            : item
        );
      } else {
        result[camelKey] = value;
      }
    }
    return result as T;
  }

  return obj;
}

/**
 * 将驼峰命名字段转换为下划线命名
 */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * 将对象的所有驼峰命名字段转换为下划线命名
 */
export function mapFieldsToSnakeCase<T>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => mapFieldsToSnakeCase(item)) as T;
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      const snakeKey = toSnakeCase(key);
      const value = obj[key];

      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[snakeKey] = mapFieldsToSnakeCase(value);
      } else if (Array.isArray(value)) {
        result[snakeKey] = value.map(item =>
          item && typeof item === 'object' && !(item instanceof Date)
            ? mapFieldsToSnakeCase(item)
            : item
        );
      } else {
        result[snakeKey] = value;
      }
    }
    return result as T;
  }

  return obj;
}
