/**
 * 灰度发布中间件
 * Phase 2: 配置灰度策略，控制哪些模块使用 API 模式
 *
 * 灰度阶段：
 * - shadow: 影子模式 - 100% 读 localStorage，同时写入 API（不同步读取）
 * - trial: 试运行 - 100% 读 localStorage，CRUD 全部走 API 但不展示
 * - partial: 部分启用 - 读取优先 localStorage，写入走 API
 * - majority: 大多数 - 读取优先 API，写入走 API
 * - full: 全量 - 100% 读写 API
 */

/**
 * 灰度配置
 */
const gradualConfig = {
  // 当前阶段
  currentStage: 'full',

  // 阶段定义
  stages: {
    shadow: {
      name: 'shadow',
      readApiRatio: 0,
      writeApiEnabled: true,
      description: '影子模式：100%读localStorage，写双写API'
    },
    trial: {
      name: 'trial',
      readApiRatio: 10,
      writeApiEnabled: true,
      description: '试运行：10%流量读API，写双写'
    },
    partial: {
      name: 'partial',
      readApiRatio: 50,
      writeApiEnabled: true,
      description: '部分启用：50%流量读API'
    },
    majority: {
      name: 'majority',
      readApiRatio: 90,
      writeApiEnabled: true,
      description: '大多数：90%流量读API'
    },
    full: {
      name: 'full',
      readApiRatio: 100,
      writeApiEnabled: true,
      description: '全量：100%读写API'
    }
  },

  // 试用白名单（用户ID）
  trialWhitelist: [],

  // 模块灰度配置
  moduleConfig: {
    cropVariety: 'full',
    seedSource: 'full',
    seedling: 'full',
    planting: 'full',
    harvest: 'full',
    cropInstance: 'full',
    cropOrder: 'full',
    farmTask: 'full',
    inspection: 'full',
    problem: 'full',
    labor: 'full',
    supplier: 'full',
    department: 'shadow',
    warehouse: 'shadow',
    greenhouse: 'shadow',
    inventory: 'shadow',
    productionPlan: 'shadow',
    purchasePlan: 'shadow',
    authority: 'shadow'
  },

  /**
   * 检查用户是否在试用白名单
   */
  isUserInTrial(userId) {
    return this.trialWhitelist.includes(userId);
  },

  /**
   * 获取模块灰度阶段
   */
  getModuleStage(moduleName) {
    const stageName = this.moduleConfig[moduleName] || 'shadow';
    return this.stages[stageName];
  },

  /**
   * 获取当前配置
   */
  getConfig() {
    return {
      currentStage: this.currentStage,
      stage: this.stages[this.currentStage],
      moduleConfig: this.moduleConfig
    };
  },

  /**
   * 设置当前阶段
   */
  setStage(stageName) {
    if (this.stages[stageName]) {
      this.currentStage = stageName;
      console.log(`[Gradual] 灰度阶段切换为: ${stageName}`);
      return true;
    }
    return false;
  },

  /**
   * 设置模块灰度
   */
  setModuleStage(moduleName, stageName) {
    if (this.stages[stageName]) {
      this.moduleConfig[moduleName] = stageName;
      console.log(`[Gradual] 模块 ${moduleName} 灰度阶段切换为: ${stageName}`);
      return true;
    }
    return false;
  }
};

/**
 * 灰度中间件
 */
function gradualMiddleware(req, res, next) {
  // 解析模块名称（从路径）
  const pathParts = req.path.split('/').filter(Boolean);
  const moduleName = pathParts[0] || 'default';

  // 获取模块灰度配置
  const stage = gradualConfig.getModuleStage(moduleName);
  const userId = req.user?.id || 'anonymous';

  // 决定是否使用 API
  let useApiRead = false;
  let useApiWrite = false;

  if (gradualConfig.currentStage === 'full') {
    // 全量模式：全部走 API
    useApiRead = true;
    useApiWrite = true;
  } else if (gradualConfig.currentStage === 'shadow') {
    // 影子模式：读 localStorage，写双写 API
    useApiRead = false;
    useApiWrite = true;
  } else {
    // 其他阶段：根据比例决定
    useApiWrite = stage.writeApiEnabled;

    // 试用白名单用户优先使用 API
    if (gradualConfig.isUserInTrial(userId)) {
      useApiRead = true;
    } else {
      // 根据比例随机决定
      useApiRead = Math.random() * 100 < stage.readApiRatio;
    }
  }

  // 附加灰度信息到请求对象
  req.gradualConfig = {
    moduleName,
    stage: stage.name,
    useApiRead,
    useApiWrite,
    userId
  };

  // 记录日志
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      `[Gradual] ${req.method} ${req.path} | ` +
      `模块:${moduleName} | 阶段:${stage.name} | ` +
      `读API:${useApiRead} | 写API:${useApiWrite}`
    );
  }

  next();
}

/**
 * 获取灰度统计
 */
function getGrayScaleStats() {
  const stats = {
    currentStage: gradualConfig.currentStage,
    total: Object.keys(gradualConfig.moduleConfig).length,
    byStage: {},
    fullyMigrated: [],
    pendingMigration: []
  };

  Object.entries(gradualConfig.moduleConfig).forEach(([module, stageName]) => {
    if (!stats.byStage[stageName]) {
      stats.byStage[stageName] = [];
    }
    stats.byStage[stageName].push(module);

    if (stageName === 'full') {
      stats.fullyMigrated.push(module);
    } else {
      stats.pendingMigration.push(module);
    }
  });

  return stats;
}

/**
 * 健康检查接口
 */
function healthCheck() {
  return {
    status: 'ok',
    currentStage: gradualConfig.currentStage,
    timestamp: new Date().toISOString(),
    stats: getGrayScaleStats()
  };
}

module.exports = {
  gradualMiddleware,
  gradualConfig,
  getGrayScaleStats,
  healthCheck
};
