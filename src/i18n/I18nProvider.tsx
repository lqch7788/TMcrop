/**
 * v0.3 前置 4：I18n Provider 组件
 *
 * 使用方式（可选）：
 *   // main.tsx 中
 *   import { I18nProvider } from '@/i18n/I18nProvider';
 *   <I18nProvider locale="zh-CN">
 *     <App />
 *   </I18nProvider>
 *
 * 注意：v0.3 阶段 0 仅做骨架，**不强制**在 main.tsx 注册。
 *       现有所有组件继续用硬编码中文，**不影响**。
 *       v0.4+ 阶段，按"逐模块迁移"策略逐步切换到 useT。
 */

import { useState, useMemo, useEffect, type ReactNode } from 'react';
import {
  I18nContext,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getStoredLocale,
  setLocaleGlobal,
  type LocaleCode,
  type I18nContextValue,
} from '@/hooks/useT';

export interface I18nProviderProps {
  children: ReactNode;
  locale?: LocaleCode;
}

export function I18nProvider({ children, locale: initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<LocaleCode>(
    initialLocale ?? (typeof window !== 'undefined' ? getStoredLocale() : DEFAULT_LOCALE)
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('app.locale', locale);
    }
  }, [locale]);

  const value: I18nContextValue = useMemo(
    () => ({
      locale,
      setLocale: (next) => {
        setLocaleState(next);
        // 持久化 + 刷新（确保所有 useT 重新计算）
        setLocaleGlobal(next);
      },
      messages: SUPPORTED_LOCALES[locale],
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export default I18nProvider;
