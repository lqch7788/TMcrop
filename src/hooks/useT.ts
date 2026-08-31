/**
 * v0.3 前置 4：i18n 轻量自建 Hook
 *
 * 特性：
 *   - 零依赖（不引入 react-intl）
 *   - 支持嵌套 key（如 t('farm.task.status.pending')）
 *   - 支持变量插值（如 t('pesticide.warning.harvestTooClose', { days: 3 })）
 *   - 支持语言切换
 *   - 缺省语言：中文（zh-CN）
 *
 * 使用方式：
 *   import { useT } from '@/hooks/useT';
 *   const t = useT();
 *   <Button>{t('common.save')}</Button>
 *   <span>{t('pesticide.warning.harvestTooClose', { days: 3, interval: 14 })}</span>
 *
 * 集成（可选）：
 *   在 main.tsx 中包裹 <I18nProvider locale="zh-CN" />
 */

import { useContext, createContext, useMemo } from 'react';
import zhCN from '@/locales/zh-CN.json';
import enUS from '@/locales/en-US.json';

export type LocaleCode = 'zh-CN' | 'en-US';

export const SUPPORTED_LOCALES: Record<LocaleCode, Record<string, unknown>> = {
  'zh-CN': zhCN as Record<string, unknown>,
  'en-US': enUS as Record<string, unknown>,
};

export const DEFAULT_LOCALE: LocaleCode = 'zh-CN';

export interface I18nContextValue {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  messages: Record<string, unknown>;
}

export const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {
    // 默认占位（应在 Provider 中重写）
  },
  messages: SUPPORTED_LOCALES[DEFAULT_LOCALE],
});

/**
 * 类型安全的 t 函数
 * @param key 点分隔的 key（如 'farm.task.status.pending'）
 * @param values 可选插值变量
 * @returns 翻译字符串（缺 key 时返回 key 本身）
 */
export type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

function lookup(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

function interpolate(template: string, values?: Record<string, string | number>): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = values[key];
    return v === undefined ? `{${key}}` : String(v);
  });
}

export function createT(messages: Record<string, unknown>): TranslateFn {
  return (key, values) => {
    const v = lookup(messages, key);
    if (typeof v === 'string') return interpolate(v, values);
    // 缺 key 时返回 key 本身（便于排查）
    if (import.meta.env.DEV) {
      console.warn(`[i18n] Missing key: ${key}`);
    }
    return key;
  };
}

/**
 * 主 Hook：在 React 组件中使用
 */
export function useT(): TranslateFn {
  const { messages } = useContext(I18nContext);
  return useMemo(() => createT(messages), [messages]);
}

/**
 * 切换语言（不依赖 Context，可在工具函数中使用）
 */
export function setLocaleGlobal(locale: LocaleCode): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('app.locale', locale);
    window.location.reload();
  }
}

/**
 * 读取持久化的语言偏好
 */
export function getStoredLocale(): LocaleCode {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const stored = window.localStorage.getItem('app.locale');
  if (stored === 'zh-CN' || stored === 'en-US') return stored;
  return DEFAULT_LOCALE;
}

export default useT;
