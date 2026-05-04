/**
 * localStorage 数据备份工具
 * 用于 Phase 0 阶段备份本地存储数据
 * 备份文件保存在浏览器本地，可通过 JSZip 导出
 */

import JSZip from 'jszip';

/**
 * localStorage 所有数据键名
 * 包含系统数据和业务数据
 */
const STORAGE_KEYS = {
  // 作物管理
  crop_instances: 'crop_instances',
  seed_sources: 'seed_sources',
  seedlings: 'seedlings',
  plantings: 'plantings',
  harvest_records: 'harvest_records',
  crop_orders: 'crop_orders',
  crop_batches: 'crop_batches',

  // 农事管理
  farm_tasks: 'farm_tasks',
  inspections: 'inspections',
  problems: 'problems',

  // 人工管理
  labor_records: 'labor_records',
  attendance_records: 'attendance_records',
  leave_records: 'leave_records',
  overtime_records: 'overtime_records',
  salary_records: 'salary_records',

  // 审批流程
  approvals: 'approvals',
  approval_workflows: 'approval_workflows',
  hr_approvals: 'hr_approvals',

  // 系统设置
  departments: 'departments',
  positions: 'positions',
  teams: 'teams',
  warehouses: 'warehouses',
  greenhouses: 'greenhouses',
  zones: 'zones',
  blocks: 'blocks',

  // 字典与配置
  dictionaries: 'dictionaries',
  dictionary_categories: 'dictionary_categories',
  notification_channels: 'notification_channels',
  notification_rules: 'notification_rules',
  approval_rules: 'approval_rules',
  code_rules: 'code_rules',

  // 权限系统
  roles: 'roles',
  permissions: 'permissions',
  users: 'users',
  user_roles: 'user_roles',
  role_permissions: 'role_permissions',
  processes: 'processes',
  actions: 'actions',
  roles_authority: 'roles_authority',

  // 库存与采购
  inventory: 'inventory',
  production_plans: 'production_plans',
  purchase_plans: 'purchase_plans',
  material_requests: 'material_requests',
  suppliers: 'suppliers',

  // 其他
  system_configs: 'system_configs',
  operation_logs: 'operation_logs',
};

/**
 * 备份单条数据
 */
function backupItem(key: string): { key: string; value: any; timestamp: string } {
  const value = localStorage.getItem(key);
  let parsedValue: any = null;

  if (value) {
    try {
      parsedValue = JSON.parse(value);
    } catch {
      parsedValue = value;
    }
  }

  return {
    key,
    value: parsedValue,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 备份所有 localStorage 数据
 */
function backupAll(): Record<string, any> {
  const backup: Record<string, any> = {};

  Object.values(STORAGE_KEYS).forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      try {
        backup[key] = JSON.parse(value);
      } catch {
        backup[key] = value;
      }
    }
  });

  return backup;
}

/**
 * 获取备份统计数据
 */
function getBackupStats(): {
  totalKeys: number;
  keysWithData: number;
  estimatedSize: string;
  details: Array<{ key: string; count: number; size: string }>;
} {
  const details: Array<{ key: string; count: number; size: string }> = [];
  let keysWithData = 0;
  let totalSize = 0;

  Object.values(STORAGE_KEYS).forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      keysWithData++;
      const size = new Blob([value]).size;
      totalSize += size;

      let parsed: any;
      try {
        parsed = JSON.parse(value);
        const count = Array.isArray(parsed) ? parsed.length : 1;
        details.push({ key, count, size: formatBytes(size) });
      } catch {
        details.push({ key, count: 1, size: formatBytes(size) });
      }
    }
  });

  return {
    totalKeys: Object.keys(STORAGE_KEYS).length,
    keysWithData,
    estimatedSize: formatBytes(totalSize),
    details,
  };
}

/**
 * 格式化字节大小
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 创建 JSON 备份文件
 */
function createJsonBackup(): string {
  const backup = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    appName: 'TMcrop 原形图',
    data: backupAll(),
  };
  return JSON.stringify(backup, null, 2);
}

/**
 * 创建 ZIP 备份文件 (用于浏览器下载)
 */
async function createZipBackup(): Promise<Blob> {
  const zip = new JSZip();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const folder = zip.folder(`backup-${timestamp}`);

  if (!folder) {
    throw new Error('创建 ZIP 文件夹失败');
  }

  // 添加 JSON 备份
  const jsonBackup = createJsonBackup();
  folder.file('localStorage-backup.json', jsonBackup);

  // 添加元数据
  const stats = getBackupStats();
  const metadata = {
    backupVersion: '1.0',
    backupTime: new Date().toISOString(),
    appVersion: 'V1.1',
    totalKeys: stats.totalKeys,
    keysWithData: stats.keysWithData,
    estimatedSize: stats.estimatedSize,
  };
  folder.file('backup-metadata.json', JSON.stringify(metadata, null, 2));

  // 按类别分组备份
  const categories = {
    crop: ['crop_instances', 'seed_sources', 'seedlings', 'plantings', 'harvest_records', 'crop_orders', 'crop_batches'],
    farm: ['farm_tasks', 'inspections', 'problems'],
    labor: ['labor_records', 'attendance_records', 'leave_records', 'overtime_records', 'salary_records'],
    approval: ['approvals', 'approval_workflows', 'hr_approvals'],
    system: ['departments', 'positions', 'teams', 'warehouses', 'greenhouses', 'zones', 'blocks'],
    dictionary: ['dictionaries', 'dictionary_categories', 'notification_channels', 'notification_rules', 'approval_rules', 'code_rules'],
    authority: ['roles', 'permissions', 'users', 'user_roles', 'role_permissions', 'processes', 'actions', 'roles_authority'],
    inventory: ['inventory', 'production_plans', 'purchase_plans', 'material_requests', 'suppliers'],
    other: ['system_configs', 'operation_logs'],
  };

  Object.entries(categories).forEach(([category, keys]) => {
    const categoryData: Record<string, any> = {};
    keys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          categoryData[key] = JSON.parse(value);
        } catch {
          categoryData[key] = value;
        }
      }
    });
    if (Object.keys(categoryData).length > 0) {
      folder.file(`${category}.json`, JSON.stringify(categoryData, null, 2));
    }
  });

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * 下载备份文件
 */
async function downloadBackup(): Promise<void> {
  const blob = await createZipBackup();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `TMcrop-backup-${timestamp}.zip`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 验证备份数据
 */
function validateBackup(backupData: Record<string, any>): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!backupData || typeof backupData !== 'object') {
    errors.push('备份数据格式无效');
    return { isValid: false, errors, warnings };
  }

  // 检查必需的数据类别
  const requiredCategories = ['crop_instances', 'seed_sources', 'departments'];
  requiredCategories.forEach(key => {
    if (!backupData.data?.[key]) {
      warnings.push(`缺少可选数据: ${key}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 打印备份报告到控制台
 */
function printBackupReport(): void {
  const stats = getBackupStats();
  console.log('='.repeat(50));
  console.log('📦 localStorage 备份报告');
  console.log('='.repeat(50));
  console.log(`备份时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`总键数量: ${stats.totalKeys}`);
  console.log(`有数据的键: ${stats.keysWithData}`);
  console.log(`预计大小: ${stats.estimatedSize}`);
  console.log('-'.repeat(50));
  console.log('数据明细:');
  stats.details.forEach(d => {
    console.log(`  ${d.key}: ${d.count} 条记录 (${d.size})`);
  });
  console.log('='.repeat(50));
}

// 导出函数供浏览器控制台使用
export {
  STORAGE_KEYS,
  backupItem,
  backupAll,
  getBackupStats,
  createJsonBackup,
  createZipBackup,
  downloadBackup,
  validateBackup,
  printBackupReport,
};

// 浏览器控制台命令
if (typeof window !== 'undefined') {
  (window as any).backupLocalStorage = {
    stats: getBackupStats,
    print: printBackupReport,
    backup: downloadBackup,
    json: () => createJsonBackup(),
  };
  console.log('%c📦 localStorage 备份工具已加载', 'color: green; font-weight: bold');
  console.log('使用方式:');
  console.log('  backupLocalStorage.stats() - 查看备份统计');
  console.log('  backupLocalStorage.print() - 打印备份报告');
  console.log('  backupLocalStorage.backup() - 下载 ZIP 备份文件');
  console.log('  backupLocalStorage.json() - 获取 JSON 备份数据');
}
