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
      console.log('[TempTaskAcceptanceAdapter] 跳过：isOpen=', isOpen, 'task?.id=', task?.id);
      setRecords([]);
      return;
    }

    // 从后端 API 加载任务记录
    setIsLoadingRecords(true);
    const taskId = task.id;
    console.log('[TempTaskAcceptanceAdapter] 开始加载操作记录, taskId:', taskId, 'task.taskCode:', task.taskCode);

    const url = `/temp-tasks/${taskId}/records`;
    console.log('[TempTaskAcceptanceAdapter] 发送请求 URL:', url);

    // 直接使用 fetch 测试 API 连通性
    fetch(url)
      .then(res => {
        console.log('[TempTaskAcceptanceAdapter] fetch 响应状态:', res.status);
        return res.json();
      })
      .then(result => {
        console.log('[TempTaskAcceptanceAdapter] fetch JSON 结果:', JSON.stringify(result));
        if (result.success && Array.isArray(result.data)) {
          setRecords(result.data);
        } else {
          console.error('[TempTaskAcceptanceAdapter] 数据格式错误:', result);
          setRecords([]);
        }
      })
      .catch((err) => {
        console.error('[TempTaskAcceptanceAdapter] fetch 请求失败:', err);
        setRecords([]);
      })
      .finally(() => {
        console.log('[TempTaskAcceptanceAdapter] 请求完成，设置 isLoadingRecords=false');
        setIsLoadingRecords(false);
      });

    // 同时使用 enhancedApiClient 发送请求（用于对比）
    enhancedApiClient.get<any[]>(url)
      .then((apiRecords) => {
        console.log('[TempTaskAcceptanceAdapter] enhancedApiClient 返回记录数:', apiRecords?.length || 0);
      })
      .catch((err) => {
        console.error('[TempTaskAcceptanceAdapter] enhancedApiClient 请求失败:', err);
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
