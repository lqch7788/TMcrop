/**
 * 临时任务验收弹窗适配器
 * 将 TempTaskTab 的调用方式适配到增强版 VerifyTempTaskModal
 *
 * 数据来源：从后端 API 加载操作记录
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TempTask } from '../../../../types';
import { enhancedApiClient } from '../../../../lib/apiClient';
import { VerifyTempTaskModal } from '../../../dispatch/components/dispatch/VerifyTempTaskModal';

// 操作记录类型（与后端 task_operation_records 表对应）
interface TempTaskRecord {
  id: string;
  task_id: string;
  task_code: string;
  task_title: string;
  operator_id: string;
  operator_name: string;
  action: string;
  action_name: string;
  from_status: string;
  to_status: string;
  progress: number;
  comment: string;
  reason: string;
  feedback: string;
  action_time: string;
  create_time: string;
}

interface TempTaskAcceptanceAdapterProps {
  isOpen: boolean;
  task: TempTask | null;
  onConfirm: (remarks?: string) => void;
  onReject: (reason: string) => void;
  onClose: () => void;
}

export function TempTaskAcceptanceAdapter({
  isOpen,
  task,
  onConfirm,
  onReject,
  onClose,
}: TempTaskAcceptanceAdapterProps) {
  const [records, setRecords] = useState<TempTaskRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  useEffect(() => {
    if (!isOpen || !task?.id) {
      setRecords([]);
      return;
    }

    // 从后端 API 加载任务记录
    setIsLoadingRecords(true);
    const taskId = task.id;
    const url = `/temp-tasks/${taskId}/records`;

    // 使用 enhancedApiClient 发送请求（它会自动处理 API 基础 URL）
    enhancedApiClient.get<any[]>(url)
      .then((apiRecords) => {
        // apiRecords 已经是提取后的数据数组（enhancedApiClient 会自动提取 result.data）
        const recordsArray = Array.isArray(apiRecords) ? apiRecords : [];
        setRecords(recordsArray);
      })
      .catch((err) => {
        // logger.error('[TempTaskAcceptanceAdapter] 加载任务记录失败:', err);
        setRecords([]);
      })
      .finally(() => {
        setIsLoadingRecords(false);
      });
  }, [isOpen, task?.id]);

  if (!isOpen || !task) {
    return null;
  }

  return (
    <VerifyTempTaskModal
      isOpen={isOpen}
      task={task}
      records={records}
      isLoadingRecords={isLoadingRecords}
      onConfirm={onConfirm}
      onReject={onReject}
      onClose={onClose}
    />
  );
}
