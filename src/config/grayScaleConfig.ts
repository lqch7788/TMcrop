/**
 * 灰度发布配置
 * Phase 2: 配置灰度策略，控制哪些模块使用 API 模式
 *
 * 配置说明：
 * - shadow: 影子模式 - 100% 读 localStorage，同时写入 API（不同步读取）
 * - trial: 试运行 - 100% 读 localStorage，CRUD 全部走 API 但不展示
 * - partial: 部分启用 - 读取优先 localStorage，写入走 API
 * - majority: 大多数 - 读取优先 API，写入走 API
 * - full: 全量 - 100% 读写 API
 */

export type GrayStage = 'shadow' | 'trial' | 'partial' | 'majority' | 'full';

export interface ModuleGrayConfig {
  stage: GrayStage;
  // API 读取比例 (0-100)
  readApiRatio: number;
  // 是否启用 API 写入
  writeApiEnabled: boolean;
  // 降级回 localStorage 的条件
  fallbackEnabled: boolean;
  // 描述
  description: string;
}

// 模块灰度配置
export const grayScaleConfig: Record<string, ModuleGrayConfig> = {
  // ========== 已完成迁移的模块 (Full Mode) ==========
  cropVariety: {
    stage: 'full',
    readApiRatio: 100,
    writeApiEnabled: true,
    fallbackEnabled: true,
    description: '作物品种 - 全量 API 模式',
  },
  seedSource: {
    stage: 'full',
    readApiRatio: 100,
    writeApiEnabled: true,
    fallbackEnabled: true,
    description: '种源记录 - 全量 API 模式',
  },
  seedling: {
    stage: 'full',
    readApiRatio: 100,
    writeApiEnabled: true,
    fallbackEnabled: true,
    description: '育苗记录 - 全量 API 模式',
  },
  planting: {
    stage: 'full',
    readApiRatio: 100,
    writeApiEnabled: true,
    fallbackEnabled: true,
    description: '种植记录 - 全量 API 模式',
  },
  harvest: {
    stage: 'full',
    readApiRatio: 100,
    writeApiEnabled: true,
    fallbackEnabled: true,
    description: '采收记录 - 全量 API 模式',
  },
  cropInstance: {
    stage: 'full',
    readApiRatio: 100,
    writeApiEnabled: true,
    fallbackEnabled: true,
    description: '作物实例 - 全量 API 模式',
  },
  cropOrder: {
    stage: 'full',
    readApiRatio: 100,
    writeApiEnabled: true,
    fallbackEnabled: true,
    description: '作物订单 - 全量 API 模式',
  },
  farmTask: {
    stage: 'full',
    readApiRatio: 100,
    writeApiEnabled: true,
    fallbackEnabled: true,
    description: '农事任务 - 全量 API 模式',
  },
  inspection: {
    stage: 'full',
    readApiRatio: 100,
    writeApiEnabled: true,
    fallbackEnabled: true,
    description: '巡查记录 - 全量 API 模式',
  },
  problem: {
    stage: 'full',
    readApiRatio: 100,
    writeApiEnabled: true,
    fallbackEnabled: true,
    description: '问题记录 - 全量 API 模式',
  },
  labor: {
    stage: 'full',
    readApiRatio: 100,
    writeApiEnabled: true,
    fallbackEnabled: true,
    description: '人工记录 - 全量 API 模式',
  },
  supplier: {
    stage: 'full',
    readApiRatio: 100,
    writeApiEnabled: true,
    fallbackEnabled: true,
    description: '供应商 - 全量 API 模式',
  },

  // ========== 待迁移模块 (Shadow Mode) ==========
  department: {
    stage: 'shadow',
    readApiRatio: 0,
    writeApiEnabled: true,
    fallbackEnabled: true,
    description: '部门管理 - 影子模式，写入 API，读取 localStorage',
  },
  warehouse: {
    stage: 'shadow',
    readApiRatio: 0,
    writeApiEnabled: true,
    fallbackEnabled: true,
    description: '仓库管理 - 影子模式，写入 API，读取 localStorage',
  },
  greenhouse: {
    stage: 'shadow',
    readApiRatio: 0,
    writeApiEnabled: true,
    fallbackEnabled: true,
    description: '温室管理 - 影子模式，写入 API，读取 localStorage',
  },
  inventory: {
    stage: 'shadow',
    readApiRatio: 0,
    writeApiEnabled: true,
    fallbackEnabled: true,
    description: '库存管理 - 影子模式，写入 API，读取 localStorage',
  },
  productionPlan: {
    stage: 'shadow',
    readApiRatio: 0,
    writeApiEnabled: true,
    fallbackEnabled: true,
    description: '生产计划 - 影子模式，写入 API，读取 localStorage',
  },
  purchasePlan: {
    stage: 'shadow',
    readApiRatio: 0,
    writeApiEnabled: true,
    fallbackEnabled: true,
    description: '采购计划 - 影子模式，写入 API，读取 localStorage',
  },
  authority: {
    stage: 'shadow',
    readApiRatio: 0,
    writeApiEnabled: true,
    fallbackEnabled: true,
    description: '权限系统 - 影子模式，写入 API，读取 localStorage',
  },
};

/**
 * 获取模块灰度配置
 */
export function getModuleConfig(moduleName: string): ModuleGrayConfig {
  return grayScaleConfig[moduleName] || {
    stage: 'shadow',
    readApiRatio: 0,
    writeApiEnabled: false,
    fallbackEnabled: true,
    description: '默认影子模式',
  };
}

/**
 * 判断是否应该使用 API 读取
 */
export function shouldUseApiRead(moduleName: string): boolean {
  const config = getModuleConfig(moduleName);
  if (!config.writeApiEnabled) {
    return false;
  }
  return Math.random() * 100 < config.readApiRatio;
}

/**
 * 判断是否应该使用 API 写入
 */
export function shouldUseApiWrite(moduleName: string): boolean {
  const config = getModuleConfig(moduleName);
  return config.writeApiEnabled;
}

/**
 * 灰度统计
 */
export function getGrayScaleStats(): {
  total: number;
  byStage: Record<GrayStage, number>;
  fullyMigrated: string[];
  pendingMigration: string[];
} {
  const stats = {
    total: Object.keys(grayScaleConfig).length,
    byStage: {
      shadow: 0,
      trial: 0,
      partial: 0,
      majority: 0,
      full: 0,
    } as Record<GrayStage, number>,
    fullyMigrated: [] as string[],
    pendingMigration: [] as string[],
  };

  Object.entries(grayScaleConfig).forEach(([module, config]) => {
    stats.byStage[config.stage]++;
    if (config.stage === 'full') {
      stats.fullyMigrated.push(module);
    } else {
      stats.pendingMigration.push(module);
    }
  });

  return stats;
}

// 打印统计到控制台
if (typeof window !== 'undefined') {
  (window as any).grayScaleStats = getGrayScaleStats;
  console.log('%c📊 灰度配置统计', 'color: blue; font-weight: bold');
  const stats = getGrayScaleStats();
  console.log(`总模块数: ${stats.total}`);
  console.log(`已全量迁移: ${stats.fullyMigrated.length}`, stats.fullyMigrated);
  console.log(`待迁移: ${stats.pendingMigration.length}`, stats.pendingMigration);
}
