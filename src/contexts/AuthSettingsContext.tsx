/**
 * 组织与权限管理 Context
 *
 * ⚠️ 已重构: 此Context拆分到以下新Context:
 * - OrganizationContext: 组织、角色、用户、工序、动作、权限
 * - SettingsContext: 部门、仓库、温室
 *
 * @deprecated 请使用 useOrganization() 和 useSettings() 代替
 */

import { useOrganization } from './OrganizationContext';
import { useSettings } from './SettingsContext';

// 重新导出新hooks供旧代码使用
export { OrganizationProvider, useOrganization } from './OrganizationContext';
export { SettingsProvider, useSettings } from './SettingsContext';

/**
 * @deprecated 请使用 useOrganization() 代替
 */
export function useAuthSettings() {
  console.warn('useAuthSettings 已废弃，请使用 useOrganization() 和 useSettings()');
  return {
    ...useOrganization(),
    ...useSettings(),
  };
}
