/**
 * 2026-07-21：字符串乱码防御工具
 *
 * 历史教训：早期入库时部分种源字段被错误写入 U+FFFD 替代字符（efbfbd），
 *   导致追溯时间线显示乱码，且每条 update 操作都基于"乱码旧值"生成新的乱码 opinion。
 *
 * 防御策略：
 * 1. 所有写入数据库的字符串，先经过 sanitizeString 清理
 * 2. 检测到乱码模式（连续 U+FFFD 或孤立替代字符）→ 替换为占位符
 * 3. 严格模式：可选择直接拒绝写入（抛错）
 *
 * 使用场景：
 * - controller 中 PUT / POST 入参校验后
 * - service 中 INSERT/UPDATE 前
 */

/** 检测字符串是否包含连续乱码（2+ 个 U+FFFD） */
export function hasMojibake(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  // 连续 2+ 个 U+FFFD = 乱码
  return /�{2,}/.test(value);
}

/** 检测字符串是否含孤立 U+FFFD（单字符替代） */
export function hasOrphanReplacement(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  // 不在有效 UTF-8 范围内的字节被替换为 U+FFFD
  return value.includes('�');
}

/** 清理字符串中的乱码：用占位符替换 */
export function sanitizeString(
  value: string | null | undefined,
  placeholder = '（历史数据丢失）'
): string {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') {
    // 防御：非字符串输入转字符串
    value = String(value);
  }
  // 替换连续 U+FFFD 为占位符
  let result = value.replace(/�{2,}/g, placeholder);
  // 替换孤立 U+FFFD 为空（防止混入正常文本）
  result = result.replace(/�/g, '');
  return result;
}

/**
 * 严格清洗对象：递归清洗对象的所有字符串字段
 * - 检测到乱码 → 替换为占位符
 * - 不抛错（保持向后兼容）
 *
 * @param obj 待清洗的对象
 * @param placeholder 替换占位符
 * @returns 清洗后的新对象（原对象不变）
 */
export function sanitizeObject<T = any>(
  obj: T,
  placeholder = '（历史数据丢失）'
): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    return sanitizeString(obj, placeholder) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, placeholder)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = sanitizeObject((obj as any)[key], placeholder);
    }
    return result as T;
  }
  return obj;
}

/**
 * 严格模式：检测到乱码时抛错（用于不允许脏数据的关键场景，如 audit log）
 * @throws Error 当字符串包含乱码时
 */
export function assertNoMojibake(
  value: string | null | undefined,
  fieldName = 'field'
): void {
  if (hasMojibake(value)) {
    throw new Error(
      `[乱码防御] ${fieldName} 字段包含乱码（U+FFFD 替代字符），拒绝写入以防止脏数据累积。请检查数据来源（HTTP 请求编码或上游 service）。`
    );
  }
  if (hasOrphanReplacement(value)) {
    // 警告但不抛错（孤立 U+FFFD 可能是数据本身的边缘情况）
    console.warn(
      `[乱码防御-警告] ${fieldName} 字段含孤立 U+FFFD 字符，已自动清理:`,
      value
    );
  }
}