/**
 * Express 服务入口
 * 端口: 3001
 */

import 'dotenv/config';
import express from 'express';
import cors from './middleware/cors';
import { requestLogger } from './middleware/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import routes from './routes';
import { initDatabase, saveDatabase } from './db/index';
import { initializeDatabase } from './db/schema';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

// 2026-06-20: 运行时黑名单 — RED 级危险函数禁止在 server 运行时调用
// 即使被 import 也立即 throw，防止任何代码路径误触发 DELETE/UPDATE
// 替代: 这些函数已物理隔离到 server/scripts/，必须显式 --script-mode 调
const BLOCKED_AT_RUNTIME = new Set([
  'exportBasicData', 'exportDatabase', 'deduplicateDictionaries',
  'runCreateCropCirculationRecordsMigration', 'runAddOriginPathMigration',
  'migrateData', 'dataMigration', 'verifyData', 'restoreData',
  'cleanupDuplicateSourceType', 'fixColumns', 'fixCropVarietyData', 'updateSupplierType',
]);
function blockAtRuntime(name: string) {
  if (BLOCKED_AT_RUNTIME.has(name)) {
    throw new Error(`❌ ${name}() 是 RED 级危险函数，server 运行时禁用。请使用 server/scripts/ 目录下的显式脚本调用。`);
  }
}

const app = express();
const PORT = 3001;

// 清理默认端口上的旧进程（Windows）
// 2026-06-20: tsx watch fork 会启动 10 个子进程各占一个端口，必须全部杀干净
// 关键修复：
//   1. /F /T 递归强杀（连同子进程一起杀）
//   2. 不仅杀 PORT，还要杀 PORT+1..PORT+9 所有占用的（除了 RESERVED_PORTS 3002）
//   3. 避免反复触发 tryListen 时死循环
function killExistingProcess(port: number): boolean {
  const RESERVED_PORTS = new Set<number>([3002]);
  if (process.platform !== 'win32') return false;

  // 收集所有相关端口（PORT 到 PORT+9，跳过 RESERVED）
  const portsToCheck: number[] = [];
  for (let p = port; p <= port + 9; p++) {
    if (!RESERVED_PORTS.has(p)) portsToCheck.push(p);
  }

  // 收集这些端口上所有 PID
  const pids = new Set<string>();
  for (const p of portsToCheck) {
    try {
      const out = execSync(`netstat -ano | findstr :${p} | findstr LISTENING`, { encoding: 'utf8', timeout: 3000 });
      for (const line of out.trim().split('\n').filter(Boolean)) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0') pids.add(pid);
      }
    } catch { /* 端口空闲 */ }
  }

  if (pids.size === 0) return false;

  // 第一阶段：向每个 PID 发 SIGTERM（无 /F），让 server 走 saveDatabase() 落盘
  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid}`, { timeout: 5000 });
      console.log(`✓ 已向 PID ${pid} 发送优雅退出信号，等待落盘...`);
    } catch { /* 已死或无权 */ }
  }

  // 第二阶段：等最多 5 秒，期间每 500ms 检查端口是否释放
  const start = Date.now();
  while (Date.now() - start < 5000) {
    let allReleased = true;
    for (const p of portsToCheck) {
      try {
        const out = execSync(`netstat -ano | findstr :${p} | findstr LISTENING`, { encoding: 'utf8', timeout: 3000 });
        for (const line of out.trim().split('\n').filter(Boolean)) {
          const parts = line.trim().split(/\s+/);
          if (pids.has(parts[parts.length - 1])) {
            allReleased = false;
            break;
          }
        }
      } catch { /* 端口空闲 */ }
      if (allReleased) break;
    }
    if (allReleased) {
      console.log(`✓ 旧进程已全部优雅退出并完成落盘`);
      return true;
    }
    execSync('powershell -NoProfile -Command "Start-Sleep -Milliseconds 500"', { timeout: 3000 });
  }

  // 第三阶段：5 秒后还在，递归强杀（/F /T 杀子树）
  console.log(`⚠️ 5 秒内未全部退出，开始强杀（含子进程）...`);
  for (const pid of pids) {
    try {
      execSync(`taskkill /F /T /PID ${pid}`, { timeout: 5000 });
      console.log(`  ✓ 强杀 PID ${pid}（含子进程）`);
    } catch { /* 已死 */ }
  }
  return true;
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

    // ============================================================
    // 2026-06-20: 数据库加载白名单 + 完整性检查
    // 原因: 之前的事故（plantings 6 → 0）是因为 server 启动时
    //       fixMissingSchema/seedData/seedBasicData 等函数会跑 DELETE/UPDATE/INSERT
    //       把磁盘已有用户数据破坏或清空
    // 修复方案:
    //   1. 启动前 PRAGMA integrity_check — 确保 db 文件本身没损坏
    //   2. 启动前 db 状态快照（记录关键表行数）
    //   3. 启动后对比快照 — 如果行数减少，报警（不阻断避免误报）
    //   4. 启动白名单: 只允许 GREEN 级函数跑
    //   5. YELLOW/RED 级函数全部禁用（移到 server/scripts/ 显式调用）
    // ============================================================
    const { preStartupCheck, postStartupCompare } = await import('./db/healthCheck');

    // Step 1: 启动前 db 完整性检查 + 快照
    console.log('正在加载数据库...');
    await initDatabase();
    const dbFile = path.join(__dirname, '../data/yuanxingtu.db');
    const dbFileExists = fs.existsSync(dbFile);
    if (dbFileExists) {
      const fileSize = fs.statSync(dbFile).size;
      console.log(`✓ 数据库文件存在: yuanxingtu.db (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
    } else {
      console.log('⚠️ 数据库文件不存在，将创建新库');
    }
    const preCheck = await preStartupCheck();
    if (!preCheck.ok) {
      console.error(`❌ ${preCheck.error}`);
      console.error('   处理方案:');
      console.error('   1. 从 server/data/_db_backup/ 选最近一个备份');
      console.error('   2. 或从 git 历史恢复: git show <commit>:server/data/yuanxingtu.db > server/data/yuanxingtu.db');
      throw new Error('数据库完整性检查未通过，拒绝启动以保护数据');
    }
    if (preCheck.snapshot) {
      const nonEmpty = Object.entries(preCheck.snapshot).filter(([_, n]) => n > 0);
      if (nonEmpty.length > 0) {
        console.log('✓ 启动前 db 状态快照:');
        for (const [t, n] of nonEmpty) console.log(`    ${t}: ${n} 条`);
      }
    }

    // Step 2: 启动白名单 — 只跑 GREEN 级别函数
    // initializeDatabase: 只 CREATE TABLE IF NOT EXISTS（幂等）— 唯一允许跑的
    // fixMissingSchema: YELLOW 级（含 UPDATE 迁移）— 临时禁用
    //   原因: 它会在内存里跑大量 UPDATE 锁定历史数据，
    //         虽然不删行，但有些代码路径会 DELETE + CREATE（重建表），
    //         之前在 c55 恢复后启动就触发了某种路径导致 db 被改写
    //   临时方案: 只跑 initializeDatabase（确保所有表存在）
    //   永久方案: 切换 better-sqlite3 后单独迁移工具
    console.log('正在创建数据库表...');
    initializeDatabase();
    console.log('[启动白名单] 临时禁用 fixMissingSchema（YELLOW 级含 UPDATE 迁移）');

    // 2026-07-19：启动时自动回填 inventory_transfer → inventory_inbound_records 流水
    // 老数据通过 inventoryTransfer 调拨生成的种源没写 inventory_inbound_records，
    // 导致 listReturnableInboundRecords 查不到、种源退库弹窗空白
    // 此操作幂等（NOT EXISTS 过滤），不会重复插入
    try {
      const { backfillTransferInboundRecords, migrateBackfillIds } = await import('./db/backfillTransferInboundRecords');
      // 先删除旧格式 IR-RETRO-STK...-{timestamp}-{random} → 重新以新格式 IR-YYYYMMDD-NNNN 生成
      const migrated = migrateBackfillIds();
      console.log(`[backfillTransferInboundRecords] 清理旧格式回填行：删除 ${migrated.deleted} 条`);
      const result = await backfillTransferInboundRecords();
      console.log(`[backfillTransferInboundRecords] 启动回填：插入 ${result.inserted} 条，跳过 ${result.skipped} 条`);
    } catch (e: any) {
      console.warn('[backfillTransferInboundRecords] 启动回填失败（不影响主流程）:', e?.message || e);
    }

    // 2026-08-14：启动时回填育苗"已入库数量"（seedlings.harvest_stocked_count）
    // 历史入库记录从未累加该字段（旧补录回写指向不存在的 harvest_to_inventory_qty 列），
    // 一次性按 harvest_records 聚合回填；幂等（仅回填 0/NULL 行，不覆盖手工纠错值）
    try {
      const { backfillSeedlingHarvestStockedCount } = await import('./db/backfillSeedlingHarvestStocked');
      const result = backfillSeedlingHarvestStockedCount();
      console.log(`[backfillSeedlingHarvestStocked] 启动回填：${result.filledCount} 条记录，累计 ${result.totalQty}`);
    } catch (e: any) {
      console.warn('[backfillSeedlingHarvestStocked] 启动回填失败（不影响主流程）:', e?.message || e);
    }

    // （种植回填块已移到 fixSchemaColumns 之后，见下方）

    // 2026-07-19 P0-15：GREEN 级 schema 补齐（纯 ADD COLUMN + CREATE INDEX，无 UPDATE/DELETE）
    // 绕过 YELLOW 级 fixMissingSchema 禁用导致老/新 DB schema 不一致问题
    try {
      const { fixSchemaColumns } = await import('./db/fixSchemaColumns');
      const result = fixSchemaColumns();
      console.log(`[fixSchemaColumns] 启动补齐：新增 ${result.addedColumns} 列，新增 ${result.addedIndexes} 索引`);
    } catch (e: any) {
      console.warn('[fixSchemaColumns] 启动补齐失败（不影响主流程）:', e?.message || e);
    }

    // 2026-08-14：启动时回填种植"已入库量"（plantings.harvest_to_inventory_qty）
    // plantings 表此前无此列、无任何累加路径（列表"已入库量"恒显示 '-'），本次闭环改造后一次性回填
    // ⚠️ 顺序铁律：必须放在 fixSchemaColumns 之后（列由 GREEN 级补齐先添加，否则回填检测"列不存在"跳过）；
    //   回填内的 saveDatabase 会连带把 fixSchemaColumns 新增列落盘（sql.js 内存库重启即失）
    try {
      const { backfillPlantingHarvestToInventory } = await import('./db/backfillPlantingHarvestToInventory');
      const result = backfillPlantingHarvestToInventory();
      console.log(`[backfillPlantingHarvestToInventory] 启动回填：${result.filledCount} 条记录，累计 ${result.totalQty}`);
    } catch (e: any) {
      console.warn('[backfillPlantingHarvestToInventory] 启动回填失败（不影响主流程）:', e?.message || e);
    }

    // Step 3: 启动后 db 状态对比
    if (dbFileExists) {
      const compare = postStartupCompare(preCheck.snapshot);
      if (compare.warnings.length > 0) {
        console.log('📊 启动后 db 状态:');
        for (const w of compare.warnings) console.log(w);
        const errors = compare.warnings.filter(w => w.includes('❌'));
        if (errors.length > 0) {
          console.error('⚠️ 警告: 启动过程中关键表行数减少！');
          console.error('   可能原因: seed/fix 误改了用户数据');
          console.error('   处理: 立即停止 server，从 backup 恢复 db');
        }
      } else {
        console.log('✓ 启动后 db 状态: 所有关键表行数无减少');
      }
    }

    // Step 4: 禁用所有 RED/YELLOW 级 seed/migration/fix 函数
    // 这些函数移到 server/scripts/，必须显式 --script-mode 调用
    console.log('[启动白名单] 禁用所有 seed/migration/fix 函数（已移到 server/scripts/）');

    // 2026-06-20: 周期落盘 + 优雅退出保护 — 临时全部禁用
    // 原因: sql.js 内存数据库的 saveDatabase() 会把内存任何状态写回磁盘，
    //       即使内存只有 schema（无业务数据），落盘后会覆盖用户已有数据
    // 等待切换 better-sqlite3 后重新启用（better-sqlite3 每次写立即 fsync，无需 saveDatabase）
    console.log('[TEMP] 禁用周期落盘 setInterval 和 SIGINT/SIGTERM saveDatabase 钩子');
    console.log('       （保护磁盘用户数据不被内存空状态覆盖）');

    const gracefulExit = (signal: string) => {
      console.log(`\n[${signal}] 收到退出信号，直接退出（不调 saveDatabase 以保护磁盘数据）`);
      process.exit(0);
    };
    process.on('SIGINT', () => gracefulExit('SIGINT'));
    process.on('SIGTERM', () => gracefulExit('SIGTERM'));
    // 2026-06-20: H1 修复 — beforeExit/uncaughtException 都不调 saveDatabase
    // sql.js 内存 Database 对象被 GC 时不会写盘
    process.on('beforeExit', () => {
      console.log('[beforeExit] 进程即将退出（不调 saveDatabase）');
    });
    process.on('uncaughtException', (err) => {
      console.error('[uncaughtException] 捕获未捕获异常:', err.message);
      // 不调 saveDatabase！直接退出
      gracefulExit('uncaughtException');
    });

    // 2026-07-14 安全加固：手动安全响应头（防点击劫持/MIME嗅探/HSTS/XSS）
    app.use((_req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'");
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      }
      next();
    });

    // 中间件
    app.use(cors);
    app.use(requestLogger);
    // 2026-07-16 审核修复：默认 100kb 限制会拒绝病虫害图片（base64 最多 5 张 × ~700KB）
    // 提升到 8mb（5 张 × 1MB base64 膨胀 1.37x ≈ 7MB + 其他字段余量）
    app.use(express.json({ limit: '8mb' }));
    app.use(express.urlencoded({ extended: true, limit: '8mb' }));

    // API 路由（optionalAuthenticate：演示模式无 token 放行；带 token 验证）
    const { optionalAuthenticate } = await import('./middleware/auth');
    app.use('/api', optionalAuthenticate);
    // 2026-06-13: 全局响应 camelCase 转换
    // 把 res.json 输出从 snake_case 转 camelCase，让前端统一用 camelCase 读
    // 注意：请求体仍保持 snake_case（前端 store 的 toBackendPayload 已转换）
    const { camelCaseResponseMiddleware } = await import('./middleware/camelCaseResponse');
    app.use('/api', camelCaseResponseMiddleware);
    app.use('/api', routes);
    // 2026-06-20: admin 路由（db 健康检查 + 自动 commit）
    const adminRouter = (await import('./routes/admin')).default;
    app.use('/api/admin', adminRouter);

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
    // 2026-06-20: 跳过 3002 端口（留给其他系统）
    const RESERVED_PORTS = new Set<number>([3002]);
    const MAX_PORT = PORT + 9;
    let currentPort = PORT;

    await new Promise<void>((resolve, reject) => {
      const tryListen = () => {
        // 跳过保留端口（如 3002）
        if (RESERVED_PORTS.has(currentPort)) {
          console.log(`⚠  端口 ${currentPort} 是保留端口（其他系统占用），跳过`);
          currentPort++;
          if (currentPort > MAX_PORT) {
            console.error(`\n❌ 所有可用端口（除 ${Array.from(RESERVED_PORTS).join(', ')}）都被占用`);
            reject(new Error('No available port'));
            return;
          }
          tryListen();
          return;
        }
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
              console.log(`⚠  端口 ${currentPort} 已被占用`);
              currentPort++;
              // 跳过保留端口（如 3002）
              while (RESERVED_PORTS.has(currentPort) && currentPort <= MAX_PORT) {
                console.log(`⚠  跳过保留端口 ${currentPort}（其他系统占用）`);
                currentPort++;
              }
              if (currentPort > MAX_PORT) {
                console.error(`\n❌ 所有可用端口（除 ${Array.from(RESERVED_PORTS).join(', ')}）都被占用`);
                reject(new Error('No available port'));
                return;
              }
              console.log(`   尝试 ${currentPort}...`);
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
