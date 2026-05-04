/**
 * Express 服务入口
 * 端口: 3001
 */

import express from 'express';
import cors from './middleware/cors';
import routes from './routes';
import { initDatabase } from './db/index';
import { initializeDatabase } from './db/schema';
import { fixMissingSchema } from './db/fixMissingSchema';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3001;

// 确保 data 目录存在
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 启动函数
async function start() {
  try {
    // 初始化数据库
    console.log('正在初始化数据库...');
    await initDatabase();

    // 初始化表结构
    console.log('正在创建数据库表...');
    initializeDatabase();

    // 修复数据库结构（添加缺失的列和表）
    console.log('正在修复数据库结构...');
    await fixMissingSchema();

    // 导入种子数据（延迟导入避免循环依赖）
    console.log('正在导入种子数据...');
    const { exportDatabase } = await import('./db/seedData');
    exportDatabase();

    // 导入基础数据（V5.0新增：部门/仓库/温室/职位/字典等）
    console.log('正在导入基础数据...');
    const { exportBasicData } = await import('./db/seedBasicData');
    exportBasicData();

    // 中间件
    app.use(cors);
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // API 路由
    app.use('/api', routes);

    // 根路径
    app.get('/', (req, res) => {
      res.json({
        name: '原形图后端 API 服务',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          api: '/api',
          health: '/api/health',
          cropVarieties: '/api/crop-varieties',
          inventory: '/api/inventory',
          seedlings: '/api/seedlings',
          seedSources: '/api/seed-sources',
          plantings: '/api/plantings',
          harvest: '/api/harvest',
          suppliers: '/api/suppliers',
          cropInstances: '/api/crop-instances',
          farmTasks: '/api/farm-tasks',
          inspections: '/api/inspections',
          problems: '/api/problems',
          labor: '/api/labor'
        }
      });
    });

    // 启动服务
    app.listen(PORT, () => {
      console.log('========================================');
      console.log(`API 服务已启动: http://localhost:${PORT}`);
      console.log(`健康检查: http://localhost:${PORT}/api/health`);
      console.log('========================================');
      console.log('可用的 API 端点:');
      console.log('  GET    /api/crop-varieties - 获取作物品种列表');
      console.log('  GET    /api/inventory      - 获取库存列表');
      console.log('  GET    /api/seedlings      - 获取育苗记录列表');
      console.log('  GET    /api/seed-sources   - 获取种源记录列表');
      console.log('  GET    /api/plantings     - 获取种植记录列表');
      console.log('  GET    /api/harvest       - 获取采收记录列表');
      console.log('  GET    /api/suppliers     - 获取供应商列表');
      console.log('  GET    /api/crop-instances - 获取作物实例列表');
      console.log('  GET    /api/farm-tasks    - 获取农事任务列表');
      console.log('  GET    /api/inspections   - 获取巡查记录列表');
      console.log('  GET    /api/problems      - 获取问题记录列表');
      console.log('  GET    /api/labor         - 获取人工记录列表');
      console.log('========================================');
    });
  } catch (error) {
    console.error('启动服务失败:', error);
    process.exit(1);
  }
}

start();

export default app;
