/**
 * Dispatch 派工前软警告 Modal 弹出工具
 *
 * 独立成模块的目的：让 useDispatchScheduleBridge 测试可以 vi.mock 拦截
 * （同模块内的函数无法被 spy / vi.mock 拦截，这是 ESM 模块语义限制）。
 *
 * 设计：createRoot 挂到 document.body 临时 div，用户点确认 / 取消后 cleanup + resolve。
 *
 * 排班调度 × 班组分配贯通（2026-07-30）
 */

import React, { type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  DispatchConflictSoftWarn,
  type DispatchConflictSoftWarnProps,
} from '../components/dispatch/DispatchConflictSoftWarn';

export type SoftWarnScheduleStatus = DispatchConflictSoftWarnProps['scheduleStatus'];

export interface ShowSoftWarnModalProps {
  workerName: string;
  date: string;
  scheduleStatus: SoftWarnScheduleStatus;
}

/**
 * 弹出软警告 Modal，返回 Promise<覆写原因或空串>
 * - 用户在 Modal 填原因并点"仍要派工" → resolve(原因非空字符串)
 * - 用户点"取消" → resolve(空字符串)
 *
 * 不抛错、不捕获调用方回调错误。
 */
export function showSoftWarnModal(
  props: ShowSoftWarnModalProps,
): Promise<string> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root: Root = createRoot(container);

    const cleanup = () => {
      root.unmount();
      container.remove();
    };

    const handleConfirm = (reason: string) => {
      cleanup();
      resolve(reason);
    };
    const handleCancel = () => {
      cleanup();
      // 用空字符串而非 null，方便调用方统一用 `!reason` 判断
      resolve('');
    };

    const element: ReactElement = React.createElement(DispatchConflictSoftWarn, {
      open: true,
      workerName: props.workerName,
      date: props.date,
      scheduleStatus: props.scheduleStatus,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    });
    root.render(element);
  });
}
