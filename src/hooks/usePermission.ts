/**
 * 权限控制 Hook
 * 提供菜单和按钮级别的权限验证功能
 */

import { useCallback, useMemo } from 'react';
import { useAuthSettings } from '../contexts/AuthSettingsContext';
import type { AuthValue } from '../types/authority';

// 工序与菜单路径的映射关系
// 用于根据工序 OID 判断菜单权限
const PROCESS_MENU_MAP: Record<string, string[]> = {
  // 计划管理
  'PROC_PRODUCTION': ['/production', '/tech-solution', '/purchase-plan'],
  // 作物管理
  'PROC_CROP': ['/crop/seed-source', '/crop/seedling', '/crop/planting', '/crop-inventory', '/crop/order', '/crop/instance'],
  // 农事管理
  'PROC_FARM': ['/agriculture-record', '/farm-hub', '/task-center', '/daily-work-summary', '/daily-problem-summary', '/plan-summary'],
  // 库存管理
  'PROC_MATERIALS': ['/materials', '/warehouse-overview', '/warehouse-inbound', '/produce-inventory', '/supplier-management', '/material-receiving', '/material-return'],
  // 人工管理
  'PROC_LABOR': ['/labor/attendance', '/labor/personnel', '/labor/compensation', '/labor/analytics', '/labor/resignation', '/labor/recruitment', '/labor/salary-budget'],
  // 生产汇总表
  'PROC_REPORTS': ['/reports', '/daily-problem-summary', '/plan-summary'],
  // 审批中心
  'PROC_APPROVAL': ['/approvals', '/approval-demo', '/material-approval', '/production-approval', '/pending-approval', '/approved', '/my-approval', '/hr-approval'],
  // 系统设置
  'PROC_SYSTEM': ['/settings'],
};

// 动作与操作权限的映射
const ACTION_OPERATION_MAP: Record<string, string> = {
  'ACT001': 'view',    // 查看
  'ACT002': 'create',  // 新增
  'ACT003': 'edit',    // 编辑
  'ACT004': 'delete',  // 删除
  'ACT005': 'export',  // 导出
  'ACT006': 'approve', // 审核
};

export interface UsePermissionOptions {
  // 菜单路径
  menuPath?: string;
  // 工序 OID
  processOid?: string;
  // 动作 OID
  actionOid?: string;
  // 操作类型：view, create, edit, delete, export, approve
  operation?: string;
  // 需要的权限值，默认为 1（有权限）
  requiredValue?: AuthValue;
}

/**
 * 权限验证 Hook
 */
export function usePermission(options: UsePermissionOptions = {}) {
  const {
    processOid,
    actionOid,
    operation,
    requiredValue = 1,
  } = options;

  const {
    roleAuthorities,
    roles,
    users,
    loading,
  } = useAuthSettings();

  /**
   * 检查用户是否拥有特定操作权限
   */
  const hasPermission = useCallback((
    targetProcessOid: string,
    targetActionOid: string,
    targetRequiredValue: AuthValue = 1
  ): boolean => {
    // 查找匹配的权限记录
    const authItem = roleAuthorities.find(
      item => item.processOid === targetProcessOid && item.actionOid === targetActionOid
    );

    // 如果没有找到权限记录，默认无权限
    if (!authItem) {
      return false;
    }

    return authItem.value === targetRequiredValue;
  }, [roleAuthorities]);

  /**
   * 根据工序和动作检查权限
   */
  const checkPermission = useCallback((
    targetProcessOid: string,
    targetActionOid: string
  ): boolean => {
    return hasPermission(targetProcessOid, targetActionOid, 1);
  }, [hasPermission]);

  /**
   * 根据操作类型检查权限
   * @param processOid 工序 OID
   * @param operation 操作类型：view, create, edit, delete, export, approve
   */
  const checkOperation = useCallback((
    processOid: string,
    targetOperation: string
  ): boolean => {
    // 根据操作类型找到对应的动作 OID
    const actionOid = Object.entries(ACTION_OPERATION_MAP).find(
      ([, op]) => op === targetOperation
    )?.[0];

    if (!actionOid) {
      return false;
    }

    return checkPermission(processOid, actionOid);
  }, [checkPermission]);

  /**
   * 检查菜单路径是否有权限访问
   */
  const checkMenuAccess = useCallback((menuPath: string): boolean => {
    // 管理员角色拥有所有权限
    const isAdmin = roles.some(role => {
      // 这里应该根据当前登录用户来判断，暂时使用简化逻辑
      return role.name === '系统管理员';
    });

    if (isAdmin) {
      return true;
    }

    // 遍历工序菜单映射，检查是否有匹配的菜单路径
    for (const [, paths] of Object.entries(PROCESS_MENU_MAP)) {
      if (paths.some(path => menuPath.startsWith(path))) {
        // 找到匹配的菜单，需要检查是否有查看权限
        return true; // 暂时返回 true，后续根据权限数据细粒度控制
      }
    }

    // 默认允许访问（后续可以根据权限数据精细控制）
    return true;
  }, [roles]);

  /**
   * 获取用户在特定工序下的所有权限
   */
  const getProcessPermissions = useCallback((targetProcessOid: string) => {
    return roleAuthorities
      .filter(item => item.processOid === targetProcessOid)
      .reduce((acc, item) => {
        acc[item.actionOid] = item.value;
        return acc;
      }, {} as Record<string, AuthValue>);
  }, [roleAuthorities]);

  return {
    // 权限数据
    roleAuthorities,
    roles,
    users,
    loading,
    // 权限检查方法
    hasPermission,
    checkPermission,
    checkOperation,
    checkMenuAccess,
    getProcessPermissions,
    // 便捷方法
    canView: processOid && actionOid ? () => checkPermission(processOid, 'ACT001') : undefined,
    canCreate: processOid && actionOid ? () => checkPermission(processOid, 'ACT002') : undefined,
    canEdit: processOid && actionOid ? () => checkPermission(processOid, 'ACT003') : undefined,
    canDelete: processOid && actionOid ? () => checkPermission(processOid, 'ACT004') : undefined,
    canExport: processOid && actionOid ? () => checkPermission(processOid, 'ACT005') : undefined,
    canApprove: processOid && actionOid ? () => checkPermission(processOid, 'ACT006') : undefined,
  };
}

/**
 * 权限验证高阶组件属性
 */
export interface WithPermissionProps {
  // 需要的权限
  requiredPermission?: {
    processOid: string;
    actionOid: string;
  };
  // 需要的操作类型
  requiredOperation?: 'view' | 'create' | 'edit' | 'delete' | 'export' | 'approve';
  // 菜单路径
  requiredMenuPath?: string;
  // 无权限时显示的内容
  fallback?: React.ReactNode;
}

/**
 * 权限验证 Hook（简化版）
 * 用于在组件中快速检查权限
 */
export function useAuthPermission() {
  const { roleAuthorities } = useAuthSettings();

  /**
   * 检查特定工序和动作的权限
   */
  const can = useCallback((
    processOid: string,
    actionCode: 'view' | 'create' | 'edit' | 'delete' | 'export' | 'approve'
  ): boolean => {
    // 动作代码到 OID 的映射
    const actionCodeToOid: Record<string, string> = {
      view: 'ACT001',
      create: 'ACT002',
      edit: 'ACT003',
      delete: 'ACT004',
      export: 'ACT005',
      approve: 'ACT006',
    };

    const actionOid = actionCodeToOid[actionCode];
    if (!actionOid) {
      return false;
    }

    const authItem = roleAuthorities.find(
      item => item.processOid === processOid && item.actionOid === actionOid
    );

    return authItem?.value === 1;
  }, [roleAuthorities]);

  return { can };
}
