/**
 * Express 服务入口
 * 端口: 3001
 */

import express from 'express';
import cors from './middleware/cors';
import { requestLogger } from './middleware/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import routes from './routes';
import { initDatabase, saveDatabase } from './db/index';
import { initializeDatabase } from './db/schema';
import { fixMissingSchema, deduplicateDictionaries } from './db/fixMissingSchema';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const app = express();
const PORT = 3001;

// 清理默认端口上的旧进程（Windows）
function killExistingProcess(port: number): boolean {
  try {
    if (process.platform === 'win32') {
      const result = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf8', timeout: 5000 });
      const lines = result.trim().split('\n').filter(Boolean);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0') {
          execSync(`taskkill /PID ${pid} /F`, { timeout: 5000 });
          console.log(`✓ 已关闭端口 ${port} 上的旧进程 (PID: ${pid})`);
          return true;
        }
      }
    }
  } catch {
    // 未找到占用进程，正常
  }
  return false;
}

// 确保 data 目录存在
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 启动函数
async function start() {
  try {
    // 清理默认端口旧进程，避免端口冲突
    killExistingProcess(PORT);

    // 初始化数据库
    console.log('正在初始化数据库...');
    await initDatabase();

    // 初始化表结构
    console.log('正在创建数据库表...');
    initializeDatabase();

    // 修复数据库结构（添加缺失的列和表）
    console.log('正在修复数据库结构...');
    await fixMissingSchema();

    // 字典数据去重（合并两套种子数据可能产生的重复）
    console.log('正在执行字典数据去重...');
    deduplicateDictionaries();

    // 导入基础数据（V5.0：部门/仓库/温室/字典等，数据更完整，先执行）
    console.log('正在导入基础数据...');
    const { exportBasicData } = await import('./db/seedBasicData');
    exportBasicData();

    // 导入种子数据（补充基础数据中未覆盖的字典分类）
    console.log('正在导入种子数据...');
    const { exportDatabase } = await import('./db/seedData');
    exportDatabase();

    // 导入物料编码分类种子数据（7大类+18中类+80+小类）
    console.log('正在导入物料编码分类数据...');
    const { seedMaterialCodeCategories } = await import('./db/seedMaterialCodeCategories');
    seedMaterialCodeCategories();

    // 种子数据加载完成后持久化到磁盘
    console.log('正在保存数据库...');
    saveDatabase();
    console.log('数据库保存完成');

    // 中间件
    app.use(cors);
    app.use(requestLogger);
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // API 路由
    app.use('/api', routes);

    // 生产环境/Electron：托管前端静态文件
    // Electron 打包后通过 FRONTEND_DIST 环境变量指定前端文件路径（可能在 asar 内）
    const frontendDist = process.env.FRONTEND_DIST || path.join(__dirname, '../../dist');
    if (fs.existsSync(frontendDist)) {
      app.use(express.static(frontendDist));
      // SPA fallback：所有非API请求返回index.html
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
          res.sendFile(path.join(frontendDist, 'index.html'));
        }
      });
    }

    // 404 处理（必须在路由之后）
    app.use(notFoundHandler);

    // 全局错误处理（必须在所有中间件和路由之后）
    app.use(errorHandler);

    // 启动服务（端口冲突自动尝试下一个端口，最多尝试10次）
    const MAX_PORT = PORT + 9;
    let currentPort = PORT;

    await new Promise<void>((resolve, reject) => {
      const tryListen = () => {
        const server = app.listen(currentPort, () => {
          console.log('========================================');
          console.log(`API 服务已启动: http://localhost:${currentPort}`);
          console.log(`健康检查: http://localhost:${currentPort}/api/health`);
          if (currentPort !== PORT) {
            console.log(`⚠  默认端口 ${PORT} 已被占用，已自动切换到 ${currentPort}`);
          }
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
          resolve();
        });

        server.on('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            if (currentPort < MAX_PORT) {
              console.log(`⚠  端口 ${currentPort} 已被占用，尝试 ${currentPort + 1}...`);
              currentPort++;
              server.close();
              tryListen();
            } else {
              console.error(`\n❌ 端口 ${PORT}-${MAX_PORT} 全部被占用`);
              console.error(`   请手动关闭占用进程后重试，或设置 PORT 环境变量`);
              reject(err);
            }
          } else {
            reject(err);
          }
        });
      };
      tryListen();
    });
  } catch (error) {
    console.error('启动服务失败:', error);
    process.exit(1);
  }
}

start();

export default app;
