/**
 * 设置联动组件导出
 */

// Provider
export { SettingsDataProvider, useSettingsData, triggerSettingsRefresh } from './SettingsDataProvider';
export type {
  User,
  Department,
  Position,
  Team,
  Warehouse,
  Greenhouse,
  DictionaryItem,
  Device,
  NotificationChannel,
  NotificationRule,
  CodeRule,
  Zone,
  Block,
  DictionaryCategory,
} from './SettingsDataProvider';

// Hooks
export { useUsers, useDepartments, usePositions, useTeams, useWarehouses, useGreenhouses, useDictionaries, useDevices, useNotificationChannels, useNotificationRules, useCodeRules, useZones, useBlocks, useDictionaryCategories } from './SettingsDataProvider';

// Select Components
export { DepartmentSelect } from './DepartmentSelect';
export { PositionSelect } from './PositionSelect';
export { TeamSelect } from './TeamSelect';
export { WarehouseSelect } from './WarehouseSelect';
export { GreenhouseSelect } from './GreenhouseSelect';
export { DictSelect, DictTag } from './DictSelect';
export { DeviceSelect } from './DeviceSelect';
export { ZoneSelect } from './ZoneSelect';
export { BlockSelect } from './BlockSelect';
