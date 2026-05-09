/**
 * XSS 防护 Hook
 * 使用 DOMPurify 对 HTML 内容进行消毒，防止 XSS 攻击
 *
 * 参考：专业开发手册 4.4.1 安全开发实践
 */
import DOMPurify from 'dompurify';

/**
 * HTML 内容消毒 Hook
 * 用于防止 XSS 攻击
 */
export function useSanitize() {
  /**
   * 消毒 HTML 内容
   * @param dirty 原始 HTML 字符串
   * @returns 消毒后的 HTML 字符串
   */
  const sanitize = (dirty: string): string => {
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'span', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'target', 'class', 'style'],
      ALLOW_DATA_ATTR: false,
    });
  };

  /**
   * 消毒纯文本（去除所有 HTML 标签）
   * @param dirty 原始 HTML 字符串
   * @returns 仅包含文本的字符串
   */
  const sanitizeText = (dirty: string): string => {
    return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  };

  /**
   * 严格消毒（只允许文本，无任何 HTML）
   * @param dirty 原始字符串
   * @returns 去除所有 HTML 后的纯文本
   */
  const sanitizeStrict = (dirty: string): string => {
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    }).trim();
  };

  /**
   * 检查字符串是否包含潜在危险内容
   * @param dirty 待检查的字符串
   * @returns 是否包含危险内容
   */
  const isPotentiallyDangerous = (dirty: string): boolean => {
    const dangerous = /<script|javascript:|on\w+=/i;
    return dangerous.test(dirty);
  };

  return {
    sanitize,
    sanitizeText,
    sanitizeStrict,
    isPotentiallyDangerous,
  };
}
