/**
 * 数据范围 Hook（行级权限，基地维度）
 *
 * 2026-10-25 新增。数据源：GET /api/authority/my-data-scope
 *
 * 用途：
 *   - 过滤基地选择器（只显示用户有权限的基地）
 *   - 置灰/隐藏越权数据的操作按钮
 *   - 在管理页展示「我的数据范围」以便排障
 *
 * ⚠️ 当前边界：只有 `user_base_permissions`（用户 → 基地）会生效。
 *   角色级的 `roles_data_authority` 存的是组织 OID，与基地 OID 是两套 ID 空间，
 *   无法换算，接口会在 `unsupported` 里显式返回原因（不会静默忽略）。
 *   未配置任何范围时不限制（fail open，保持现有行为）。
 */
import { useState, useEffect, useCallback } from 'react';
import { enhancedApiClient } from '../lib/apiClient';

export interface DataScope {
  restricted: boolean;
  baseOids: string[];
  source: 'admin' | 'user_base' | 'none';
  reason: string;
  unsupported: Array<{ source: string; detail: string }>;
}

const EMPTY_SCOPE: DataScope = {
  restricted: false,
  baseOids: [],
  source: 'none',
  reason: '未加载',
  unsupported: [],
};

/** 模块级缓存：同一会话内只拉一次（数据范围不会频繁变化） */
let cachedScope: DataScope | null = null;
let inflight: Promise<DataScope> | null = null;

/**
 * 获取当前用户数据范围（带会话内缓存与请求去重）
 */
export function useDataScope() {
  const [scope, setScope] = useState<DataScope>(cachedScope ?? EMPTY_SCOPE);
  const [loading, setLoading] = useState(!cachedScope);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    if (!force && cachedScope) {
      setScope(cachedScope);
      setLoading(false);
      return cachedScope;
    }
    if (inflight) {
      const s = await inflight;
      setScope(s);
      setLoading(false);
      return s;
    }

    setLoading(true);
    setError(null);
    inflight = (async () => {
      try {
        const data = await enhancedApiClient.get<DataScope>('/authority/my-data-scope');
        const normalized: DataScope = {
          restricted: !!data?.restricted,
          baseOids: Array.isArray(data?.baseOids) ? data.baseOids : [],
          source: data?.source ?? 'none',
          reason: data?.reason ?? '',
          unsupported: Array.isArray(data?.unsupported) ? data.unsupported : [],
        };
        cachedScope = normalized;
        return normalized;
      } catch (e) {
        // 拉取失败按「不限制」处理，避免误伤业务
        const fallback: DataScope = {
          ...EMPTY_SCOPE,
          reason: `获取数据范围失败：${(e as Error)?.message || '未知错误'}`,
        };
        cachedScope = fallback;
        return fallback;
      } finally {
        inflight = null;
      }
    })();

    const s = await inflight;
    setScope(s);
    setLoading(false);
    return s;
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * 判断某基地是否在当前用户范围内
   * @param baseOid 基地 OID；空值表示「未归属」
   * @param policy   未归属数据的处理策略，默认放行（兼容现状）
   */
  const isBaseVisible = useCallback(
    (baseOid: string | null | undefined, policy: 'allow' | 'deny' = 'allow') => {
      if (!scope.restricted) return true;
      if (!baseOid) return policy === 'allow';
      return scope.baseOids.includes(baseOid);
    },
    [scope],
  );

  /** 过滤基地列表（保持原顺序） */
  const filterBases = useCallback(
    <T extends { oid?: string; id?: string }>(list: T[]): T[] => {
      if (!scope.restricted) return list;
      return list.filter((b) => {
        const oid = b.oid || b.id || '';
        return oid ? scope.baseOids.includes(oid) : true;
      });
    },
    [scope],
  );

  return { scope, loading, error, reload: () => load(true), isBaseVisible, filterBases };
}

/** 清空缓存（登出/切换用户时调用） */
export function clearDataScopeCache() {
  cachedScope = null;
  inflight = null;
}

export default useDataScope;
