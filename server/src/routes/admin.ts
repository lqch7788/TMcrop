/**
 * 管理员路由 — 数据库健康检查 + 快照
 * 2026-06-20: 防止数据丢失
 */
import { Router, Request, Response } from 'express';
import { execSync } from 'child_process';
import path from 'path';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { diagnose, postStartupCompare, preStartupCheck } from '../db/healthCheck';
import { acquireWriteLock, releaseWriteLock } from '../db/index';

const router = Router();

const ROOT_DIR = path.join(__dirname, '../../..');

/**
 * GET /api/admin/db-health
 * 手动诊断 db 状态（PRAGMA integrity_check + 所有表行数）
 */
router.get(
  '/db-health',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const diag = await diagnose();
    res.json({
      success: true,
      data: {
        fileSize: `${(diag.fileSize / 1024 / 1024).toFixed(2)} MB`,
        integrity: diag.integrity,
        totalRows: diag.totalRows,
        tables: diag.tables,
      },
    });
  })
);

/**
 * GET /api/admin/db-snapshot
 * 拿当前 db 状态快照（不修改任何东西）
 */
router.get(
  '/db-snapshot',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const check = await preStartupCheck();
    res.json({ success: true, data: check.snapshot });
  })
);

/**
 * POST /api/admin/db-commit
 * 手动触发 db 快照提交（git add + git commit）
 * 用于: 写操作后前端调，自动把 db 当前状态 commit 到 git
 */
router.post(
  '/db-commit',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    // 2026-06-20: C3 修复 — trigger 字段白名单 + commit message 引号转义
    // 防止 commit message 注入（如 trigger="malicious; rm -rf /"）
    const SAFE_TRIGGER = /^[a-zA-Z0-9_-]{1,32}$/;
    const rawTrigger = String(req.body?.trigger || 'manual');
    if (!SAFE_TRIGGER.test(rawTrigger)) {
      res.status(400).json({ success: false, error: 'trigger 字段不合法（只允许字母数字下划线连字符，最多 32 字符）' });
      return;
    }
    const dbFile = path.join(ROOT_DIR, 'server/data/yuanxingtu.db');
    try {
      execSync(`git diff --quiet "${dbFile}"`, { cwd: ROOT_DIR, stdio: 'pipe' });
      res.json({ success: true, message: '无改动，跳过 commit', committed: false });
      return;
    } catch {
      // 有改动，执行 add + commit
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      // [2026-06-20] C3 修复: trigger 已白名单，但仍转义引号双保险
      const safeTrigger = rawTrigger.replace(/['"\\]/g, '\\$&');
      const msg = `chore(db): auto-snapshot ${timestamp} [trigger: ${safeTrigger}]`;
      try {
        // 2026-06-20: 临时解锁写盘（这是 server 运行中唯一合法的写盘路径）
        acquireWriteLock();
        try {
          execSync(`git add "${dbFile}"`, { cwd: ROOT_DIR, stdio: 'pipe' });
          execSync(`git commit -m "${msg}"`, { cwd: ROOT_DIR, stdio: 'pipe' });
        } finally {
          // 立即恢复只读
          releaseWriteLock();
        }
        // 2026-06-20: C3 修复: 记录 audit log（写到服务端日志，不入 db 避免日志丢失）
        console.log(`[admin/db-commit] 触发者: ${safeTrigger} | commit: ${msg}`);
        res.json({ success: true, message: '已自动 commit db', committed: true, message_detail: msg });
      } catch (e: any) {
        res.status(500).json({ success: false, error: `git commit 失败: ${e.message}` });
      }
    }
  })
);

/**
 * GET /api/admin/db-status
 * 拿 db 状态 + git 状态
 */
router.get(
  '/db-status',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const dbFile = path.join(ROOT_DIR, 'server/data/yuanxingtu.db');
    let hasUncommitted = false;
    let lastCommit = '';
    try {
      execSync(`git diff --quiet "${dbFile}"`, { cwd: ROOT_DIR, stdio: 'pipe' });
    } catch {
      hasUncommitted = true;
    }
    try {
      lastCommit = execSync(
        `git log -1 --format="%h %ai %s" -- "${dbFile}"`,
        { cwd: ROOT_DIR, encoding: 'utf8', stdio: 'pipe' }
      ).trim();
    } catch {
      lastCommit = '无 commit 记录';
    }
    res.json({
      success: true,
      data: {
        hasUncommitted,
        lastCommit,
      },
    });
  })
);

export default router;
