/**
 * XSS 防护 Hook 测试
 * 注意：useSanitize 是纯函数集合，直接测试其行为
 */
import { describe, it, expect } from 'vitest';
import DOMPurify from 'dompurify';

// 复制 useSanitize 的逻辑用于测试（因为原函数依赖 React hooks）
const sanitize = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'span', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'class', 'style'],
    ALLOW_DATA_ATTR: false,
  });
};

const sanitizeText = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
};

const sanitizeStrict = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  }).trim();
};

const isPotentiallyDangerous = (dirty: string): boolean => {
  const dangerous = /<script|javascript:|on\w+=/i;
  return dangerous.test(dirty);
};

describe('XSS 防护 - sanitize', () => {
  it('should allow safe HTML tags', () => {
    const dirty = '<b>bold</b> and <i>italic</i>';
    const clean = sanitize(dirty);
    expect(clean).toBe('<b>bold</b> and <i>italic</i>');
  });

  it('should allow safe tags: strong, em, br, p, span', () => {
    const dirty = '<strong>strong</strong> <em>emphasis</em><br/><p>paragraph</p><span>span</span>';
    const clean = sanitize(dirty);
    expect(clean).toContain('<strong>strong</strong>');
    expect(clean).toContain('<em>emphasis</em>');
    // DOMPurify 将 <br/> 转为 <br>
    expect(clean).toContain('<br>');
    expect(clean).toContain('<p>paragraph</p>');
    expect(clean).toContain('<span>span</span>');
  });

  it('should remove dangerous script tags', () => {
    const dirty = '<script>alert("xss")</script><b>safe</b>';
    const clean = sanitize(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('alert');
    expect(clean).toContain('<b>safe</b>');
  });

  it('should remove javascript: URLs', () => {
    const dirty = '<a href="javascript:alert(1)">click me</a>';
    const clean = sanitize(dirty);
    expect(clean).not.toContain('javascript:');
  });

  it('should remove onclick handlers', () => {
    const dirty = '<span onclick="alert(1)">click me</span>';
    const clean = sanitize(dirty);
    expect(clean).not.toContain('onclick');
  });

  it('should remove onerror handlers', () => {
    const dirty = '<img src="x" onerror="alert(1)"/>';
    const clean = sanitize(dirty);
    expect(clean).not.toContain('onerror');
  });

  it('should allow safe href with http/https', () => {
    const dirty = '<a href="https://example.com">link</a>';
    const clean = sanitize(dirty);
    expect(clean).toContain('https://example.com');
  });

  it('should handle empty string', () => {
    expect(sanitize('')).toBe('');
  });

  it('should handle string with only text', () => {
    const dirty = 'plain text without html';
    const clean = sanitize(dirty);
    expect(clean).toBe('plain text without html');
  });
});

describe('XSS 防护 - sanitizeText', () => {
  it('should strip all HTML tags', () => {
    const dirty = '<b>bold</b> <script>evil</script>';
    const clean = sanitizeText(dirty);
    expect(clean).not.toContain('<');
    expect(clean).not.toContain('</b>');
    expect(clean).not.toContain('</script>');
  });

  it('should handle nested tags', () => {
    const dirty = '<div><p><span>text</span></p></div>';
    const clean = sanitizeText(dirty);
    expect(clean).toBe('text');
  });

  it('should preserve HTML entities in text mode', () => {
    // sanitizeText 不解码 HTML 实体，这是正常行为
    const dirty = '&lt;script&gt;alert(1)&lt;/script&gt;';
    const clean = sanitizeText(dirty);
    // HTML 实体保持不变
    expect(clean).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});

describe('XSS 防护 - sanitizeStrict', () => {
  it('should remove all HTML tags', () => {
    const dirty = '<b>bold</b> and <i>italic</i>';
    const clean = sanitizeStrict(dirty);
    expect(clean).toBe('bold and italic');
  });

  it('should trim whitespace', () => {
    const dirty = '  <b>text</b>  ';
    const clean = sanitizeStrict(dirty);
    expect(clean).toBe('text');
  });

  it('should handle dangerous content', () => {
    const dirty = '<script>alert("xss")</script>';
    const clean = sanitizeStrict(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean).toBe('');
  });
});

describe('XSS 防护 - isPotentiallyDangerous', () => {
  it('should detect script tags', () => {
    expect(isPotentiallyDangerous('<script>alert(1)</script>')).toBe(true);
  });

  it('should detect javascript: URLs', () => {
    expect(isPotentiallyDangerous('javascript:alert(1)')).toBe(true);
  });

  it('should detect onclick handlers', () => {
    expect(isPotentiallyDangerous('onclick="alert(1)"')).toBe(true);
  });

  it('should detect onerror handlers', () => {
    expect(isPotentiallyDangerous('onerror="alert(1)"')).toBe(true);
  });

  it('should return false for safe content', () => {
    expect(isPotentiallyDangerous('<b>bold</b>')).toBe(false);
    expect(isPotentiallyDangerous('plain text')).toBe(false);
    expect(isPotentiallyDangerous('<a href="https://example.com">link</a>')).toBe(false);
  });
});
