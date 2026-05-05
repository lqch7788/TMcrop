// ============================================================
// 审批超时服务
// 文件路径：src/services/approvalTimeoutService.ts
// 功能：检测审批超时、执行超时动作、管理审批时限
// ============================================================

import { Approval, ApprovalType } from '../types/approval';
import {
  TimeoutConfig,
  TimeoutLevel,
  TimeoutCheckResult,
  getTimeoutConfigByType,
  getUltimateTimeoutConfig,
} from '../config/approvalTimeout';

// ============================================================
// 超时检测器接口
// ============================================================

export interface ApprovalTimeoutHandler {
  /** 升级审批 */
  onEscalate?: (approval: Approval, reason: string) => void;
  /** 自动通过 */
  onAutoApprove?: (approval: Approval, reason: string) => void;
  /** 自动拒绝 */
  onAutoReject?: (approval: Approval, reason: string) => void;
  /** 发送超时通知 */
  onTimeoutNotify?: (approval: Approval, level: TimeoutLevel) => void;
}

// ============================================================
// 超时检测器
// ============================================================

export class ApprovalTimeoutService {
  private handler: ApprovalTimeoutHandler | null = null;

  /**
   * 设置超时处理器
   */
  setHandler(handler: ApprovalTimeoutHandler): void {
    this.handler = handler;
  }

  /**
   * 检查审批单是否超时
   */
  checkTimeout(approval: Approval): TimeoutCheckResult {
    const config = getTimeoutConfigByType(approval.type as ApprovalType);
    const ultimateConfig = getUltimateTimeoutConfig();
    const now = new Date();
    const applyDate = new Date(approval.applyDate + 'T' + (approval.applyTime || '00:00:00'));
    const waitedMs = now.getTime() - applyDate.getTime();
    const waitedHours = waitedMs / (1000 * 60 * 60);
    const remainingHours = Math.max(0, config.timeoutHours - waitedHours);

    // 判断超时级别
    let level: TimeoutLevel = TimeoutLevel.NORMAL;
    let escalated = false;
    let escalationReason: string | undefined;

    // 检查是否超过最终超时（从数据字典加载）
    if (waitedHours >= ultimateConfig.hours) {
      level = TimeoutLevel.ULTIMATE;
    }
    // 检查是否超过升级时间
    else if (config.escalationHours !== undefined && waitedHours >= config.escalationHours) {
      level = TimeoutLevel.WARNING;
      escalated = true;
      escalationReason = `超过${config.escalationHours}小时未处理，自动升级`;
    }
    // 检查是否超过正常超时
    else if (waitedHours >= config.timeoutHours) {
      level = TimeoutLevel.OVERDUE;
    }

    return {
      isTimeout: waitedHours >= config.timeoutHours,
      level,
      remainingHours,
      waitedHours,
      escalated,
      escalationReason,
    };
  }

  /**
   * 处理超时审批
   */
  processTimeout(approval: Approval): void {
    const timeoutResult = this.checkTimeout(approval);

    if (!this.handler) {
      console.warn('【超时服务】未设置处理器，跳过处理');
      return;
    }

    // 发送超时通知
    if (timeoutResult.level !== TimeoutLevel.NORMAL) {
      this.handler.onTimeoutNotify?.(approval, timeoutResult.level);
    }

    // 根据超时级别执行动作
    switch (timeoutResult.level) {
      case TimeoutLevel.WARNING:
        // 警告级别 - 升级
        if (timeoutResult.escalationReason) {
          this.handler.onEscalate?.(approval, timeoutResult.escalationReason);
        }
        break;

      case TimeoutLevel.OVERDUE:
        // 超时级别 - 再次升级或通知
        this.handler.onEscalate?.(approval, `审批已超时${timeoutResult.waitedHours.toFixed(1)}小时`);
        break;

      case TimeoutLevel.ULTIMATE:
        // 最终超时 - 执行最终动作（从数据字典加载）
        const ultimateConfig = getUltimateTimeoutConfig();
        if (ultimateConfig.action === 'auto_approve') {
          this.handler.onAutoApprove?.(approval, `审批超时超过${ultimateConfig.hours}小时，自动通过`);
        } else {
          this.handler.onAutoReject?.(approval, `审批超时超过${ultimateConfig.hours}小时，自动拒绝`);
        }
        break;
    }
  }

  /**
   * 批量检查超时
   */
  checkBatchTimeout(approvals: Approval[]): Map<string, TimeoutCheckResult> {
    const results = new Map<string, TimeoutCheckResult>();

    for (const approval of approvals) {
      if (approval.status === 'pending') {
        results.set(approval.id, this.checkTimeout(approval));
      }
    }

    return results;
  }

  /**
   * 获取需要处理的超时审批
   */
  getTimeoutApprovals(approvals: Approval[]): {
    warning: Approval[];
    overdue: Approval[];
    ultimate: Approval[];
  } {
    const warning: Approval[] = [];
    const overdue: Approval[] = [];
    const ultimate: Approval[] = [];

    for (const approval of approvals) {
      if (approval.status !== 'pending') continue;

      const result = this.checkTimeout(approval);

      switch (result.level) {
        case TimeoutLevel.WARNING:
          warning.push(approval);
          break;
        case TimeoutLevel.OVERDUE:
          overdue.push(approval);
          break;
        case TimeoutLevel.ULTIMATE:
          ultimate.push(approval);
          break;
      }
    }

    return { warning, overdue, ultimate };
  }

  /**
   * 获取超时统计
   */
  getTimeoutStats(approvals: Approval[]): {
    total: number;
    warning: number;
    overdue: number;
    ultimate: number;
  } {
    const { warning, overdue, ultimate } = this.getTimeoutApprovals(approvals);

    return {
      total: warning.length + overdue.length + ultimate.length,
      warning: warning.length,
      overdue: overdue.length,
      ultimate: ultimate.length,
    };
  }

  /**
   * 格式化超时信息
   */
  formatTimeoutInfo(result: TimeoutCheckResult): string {
    const levelText: Record<TimeoutLevel, string> = {
      [TimeoutLevel.NORMAL]: '正常',
      [TimeoutLevel.WARNING]: '警告',
      [TimeoutLevel.OVERDUE]: '超时',
      [TimeoutLevel.ULTIMATE]: '最终超时',
    };

    if (result.level === TimeoutLevel.NORMAL) {
      return `剩余 ${result.remainingHours.toFixed(1)} 小时`;
    }

    let info = `【${levelText[result.level]}】已等待 ${result.waitedHours.toFixed(1)} 小时`;
    if (result.escalationReason) {
      info += ` - ${result.escalationReason}`;
    }
    return info;
  }
}

// ============================================================
// 超时服务单例
// ============================================================

export const approvalTimeoutService = new ApprovalTimeoutService();

// ============================================================
// 超时定时检查Hook（用于React组件）
// ============================================================

import { useEffect, useRef, useCallback } from 'react';

/**
 * 启动定时超时检查
 * @param approvals 审批列表
 * @param onTimeoutFound 发现超时时回调
 * @param intervalMs 检查间隔（默认5分钟）
 */
export function useTimeoutChecker(
  approvals: Approval[],
  onTimeoutFound: (approval: Approval, result: TimeoutCheckResult) => void,
  intervalMs: number = 5 * 60 * 1000
): void {
  const handlerRef = useRef(onTimeoutFound);
  handlerRef.current = onTimeoutFound;

  const check = useCallback(() => {
    for (const approval of approvals) {
      if (approval.status !== 'pending') continue;

      const result = approvalTimeoutService.checkTimeout(approval);
      if (result.level !== TimeoutLevel.NORMAL) {
        handlerRef.current(approval, result);
      }
    }
  }, [approvals]);

  useEffect(() => {
    // 立即检查一次
    check();

    // 设置定时检查
    const timer = setInterval(check, intervalMs);
    return () => clearInterval(timer);
  }, [check, intervalMs]);
}

export default approvalTimeoutService;
