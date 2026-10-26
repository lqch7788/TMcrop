/**
 * 按钮级权限 Hook（2026-10-26）
 *
 * 背景：
 *   此前各页面用 `{canCreate && <Button>}` 把没权限的按钮整个隐藏，
 *   用户不知道自己缺哪些功能。产品要求改为：
 *     「按钮始终可见，无权限时呈禁用态（灰化 + 禁止光标），
 *       点击时弹出明确的权限不足提示」
 *
 * 为什么不用 disabled 属性：
 *   disabled 的按钮不会触发 onClick，无法满足"点击要给提示"。
 *   所以用 aria-disabled + 灰化样式 + onClick 内拦截。
 *
 * 用法：
 *   const { allowed: canCreate, guard, disabledClass } =
 *     usePermissionAction('PROC_PLANTING', 'create');
 *
 *   <Button
 *     onClick={guard(handleAdd)}
 *     className={cn(disabledClass, ...)}
 *     title={canCreate ? undefined : '权限不足：无新增权限'}
 *   >
 *     新增
 *   </Button>
 *
 *   actionCode 支持 code 形态（view/create/…）和 ACT OID（ACT001/…），
 *   useAuthStore.hasProcessPermission 内部已做双形态匹配。
 */
import { useCallback } from 'react';
import { useAuthStore } from '@/stores';
import { showToast } from '@/lib/dialogService';

/** 动作代码 → 中文标签（用于提示文案） */
export const ACTION_LABELS: Record<string, string> = {
  view: '查看',
  create: '新增',
  edit: '编辑',
  delete: '删除',
  export: '导出',
  approve: '审批',
  ACT001: '查看',
  ACT002: '新增',
  ACT003: '编辑',
  ACT004: '删除',
  ACT005: '导出',
  ACT006: '审批',
};

/** 无权限按钮的统一视觉：半透明 + 禁止光标；hover 不再变色 */
export const PERMISSION_DENIED_CLASS = 'opacity-50 cursor-not-allowed';

/**
 * 纯函数版守卫（给「权限以 props 传入」的展示组件用）
 *
 * 例：PlantingTable 收到 canCreate / canEdit 等 boolean props，
 * 组件内没有 processOid 上下文，用这个包一层即可。
 *
 * @param allowed 是否有权限
 * @param label   动作中文名，用于提示文案
 * @param fn      有权限时执行的回调
 */
export function guardByPermission<T extends (...args: never[]) => unknown>(
  allowed: boolean,
  label: string,
  fn: T,
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  return (...args: Parameters<T>) => {
    if (!allowed) {
      showToast(`权限不足：您没有「${label}」权限，请联系管理员`, 'error');
      return undefined;
    }
    return fn(...args) as ReturnType<T>;
  };
}

export interface PermissionAction {
  /** 当前用户是否拥有该动作权限 */
  allowed: boolean;
  /** 包装回调：无权限时弹提示并中断，有权限时正常执行 */
  guard: <T extends (...args: never[]) => unknown>(fn: T) => T;
  /** 无权限时附加到 className 的样式（有权限时为空串） */
  disabledClass: string;
  /** 无权限时附加到 title 的提示（有权限时为 undefined） */
  disabledTitle: string | undefined;
}

/**
 * @param processOid 工序 OID，如 'PROC_PLANTING'
 * @param actionCode 动作，'create' / 'ACT002' 均可
 */
export function usePermissionAction(processOid: string, actionCode: string): PermissionAction {
  const hasProcessPermission = useAuthStore((s) => s.hasProcessPermission);
  const allowed = hasProcessPermission(processOid, actionCode);
  const label = ACTION_LABELS[actionCode] || actionCode;

  const guard = useCallback(
    <T extends (...args: never[]) => unknown>(fn: T): T => {
      return ((...args: never[]) => {
        if (!allowed) {
          showToast(`权限不足：您没有「${label}」权限，请联系管理员`, 'error');
          return undefined;
        }
        return fn(...args);
      }) as T;
    },
    [allowed, label],
  );

  return {
    allowed,
    guard,
    disabledClass: allowed ? '' : PERMISSION_DENIED_CLASS,
    disabledTitle: allowed ? undefined : `权限不足：需要「${label}」权限`,
  };
}

export default usePermissionAction;
