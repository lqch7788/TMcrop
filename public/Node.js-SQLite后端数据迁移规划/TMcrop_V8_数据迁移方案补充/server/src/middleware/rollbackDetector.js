/**
 * 自动回滚检测器
 * 检测 API 错误率，超过阈值触发告警并自动回滚
 */

import { exec } from 'child_process';
import path from 'path';

interface ErrorWindow {
  timestamp: number;
  count: number;
}

class RollbackDetector {
  private errorWindows: ErrorWindow[] = [];
  private readonly windowSizeMs = 60000; // 60秒窗口
  private readonly errorThreshold = 0.3; // 30%错误率阈值
  private readonly minRequests = 10; // 最小请求数
  private totalRequests = 0;
  private totalErrors = 0;

  recordRequest(isError: boolean) {
    this.totalRequests++;
    if (isError) this.totalErrors++;

    const now = Date.now();
    const windowIndex = this.errorWindows.findIndex(w => now - w.timestamp < this.windowSizeMs);
    if (windowIndex >= 0) {
      this.errorWindows[windowIndex].count++;
    } else {
      this.errorWindows.push({ timestamp: now, count: 1 });
    }
    // 清理过期窗口
    this.errorWindows = this.errorWindows.filter(w => now - w.timestamp < this.windowSizeMs);
  }

  check(): { shouldRollback: boolean; errorRate: number; reason?: string } {
    const recentErrors = this.errorWindows.reduce((sum, w) => sum + w.count, 0);
    const recentRequests = Math.min(this.totalRequests, 100); // 最近100个请求

    if (recentRequests < this.minRequests) {
      return { shouldRollback: false, errorRate: 0 };
    }

    const errorRate = recentErrors / recentRequests;
    if (errorRate > this.errorThreshold) {
      return {
        shouldRollback: true,
        errorRate,
        reason: `错误率 ${(errorRate * 100).toFixed(1)}% 超过阈值 ${this.errorThreshold * 100}%`,
      };
    }
    return { shouldRollback: false, errorRate };
  }

  triggerRollback() {
    console.error('[RollbackDetector] 触发自动回滚');
    // 这里可以调用 git 回滚命令或其他回滚逻辑
    exec('git reset --hard HEAD~1', { cwd: path.join(__dirname, '../..') }, (err, stdout, stderr) => {
      if (err) {
        console.error('[RollbackDetector] 回滚失败:', err);
      } else {
        console.log('[RollbackDetector] 回滚成功');
      }
    });
  }
}

const detector = new RollbackDetector();

export function rollbackMiddleware(req: any, res: any, next: any) {
  const startTime = Date.now();
  const originalSend = res.json.bind(res);

  res.json = function(body: any) {
    const isError = res.statusCode >= 500 || (body && !body.success);
    detector.recordRequest(isError);
    const check = detector.check();
    if (check.shouldRollback) {
      console.error('[RollbackDetector]', check.reason);
      detector.triggerRollback();
    }
    return originalSend(body);
  };

  next();
}

export default rollbackMiddleware;
