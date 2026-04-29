/**
 * 问题附件 Hook
 * 用于分离存储问题相关的附件数据（照片、语音、GPS等）
 * 与流转记录分离存储，提高查询效率和可维护性
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { STORAGE_KEYS } from './useLocalStorage';

// 附件类型
export type AttachmentType = 'photo_before' | 'photo_after' | 'voice' | 'gps' | 'material';

// 附件数据结构
export interface ProblemAttachment {
  id: string;              // 唯一ID
  problemId: number;        // 关联问题ID
  flowRecordId: string;     // 关联流转记录ID
  type: AttachmentType;     // 附件类型
  data: string;            // base64 数据或文件引用
  filename: string;        // 文件名
  timestamp: string;       // 创建时间
}

// 模块级状态 - 所有组件共享同一个状态
let attachmentsState: ProblemAttachment[] = [];
let listeners: Array<(attachments: ProblemAttachment[]) => void> = [];

// 读取初始数据
try {
  const stored = localStorage.getItem(STORAGE_KEYS.PROBLEM_ATTACHMENTS);
  if (stored) {
    attachmentsState = JSON.parse(stored);
  }
} catch {
  // 忽略解析错误，使用默认空状态
}

// 通知所有监听器
const notifyListeners = () => {
  listeners.forEach(listener => listener(attachmentsState));
};

// 保存到 localStorage
const persistAttachments = (newAttachments: ProblemAttachment[]) => {
  attachmentsState = newAttachments;
  localStorage.setItem(STORAGE_KEYS.PROBLEM_ATTACHMENTS, JSON.stringify(newAttachments));
  notifyListeners();
};

// 生成唯一ID
const generateAttachmentId = (): string => {
  return `att_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * 问题附件 Hook
 */
export function useProblemAttachments() {
  const [attachments, setAttachments] = useState<ProblemAttachment[]>(attachmentsState);

  useEffect(() => {
    // 注册监听器
    listeners.push(setAttachments);
    // 初始化状态
    setAttachments(attachmentsState);
    // 清理函数
    return () => {
      listeners = listeners.filter(l => l !== setAttachments);
    };
  }, []);

  // 添加附件
  const addAttachment = useCallback((
    problemId: number,
    flowRecordId: string,
    type: AttachmentType,
    data: string,
    filename: string
  ): string => {
    const id = generateAttachmentId();
    const newAttachment: ProblemAttachment = {
      id,
      problemId,
      flowRecordId,
      type,
      data,
      filename,
      timestamp: new Date().toISOString(),
    };
    persistAttachments([...attachmentsState, newAttachment]);
    return id;
  }, []);

  // 批量添加附件
  const addAttachments = useCallback((
    problemId: number,
    flowRecordId: string,
    items: Array<{ type: AttachmentType; data: string; filename: string }>
  ): string[] => {
    const newAttachments = items.map(item => ({
      id: generateAttachmentId(),
      problemId,
      flowRecordId,
      type: item.type,
      data: item.data,
      filename: item.filename,
      timestamp: new Date().toISOString(),
    }));
    persistAttachments([...attachmentsState, ...newAttachments]);
    return newAttachments.map(a => a.id);
  }, []);

  // 获取问题的所有附件
  const getAttachments = useCallback((problemId: number): ProblemAttachment[] => {
    return attachmentsState.filter(a => a.problemId === problemId);
  }, []);

  // 获取问题的指定类型附件
  const getAttachmentsByType = useCallback((
    problemId: number,
    type: AttachmentType
  ): ProblemAttachment[] => {
    return attachmentsState.filter(a => a.problemId === problemId && a.type === type);
  }, []);

  // 获取单个附件
  const getAttachment = useCallback((id: string): ProblemAttachment | undefined => {
    return attachmentsState.find(a => a.id === id);
  }, []);

  // 删除问题的所有附件
  const deleteAttachments = useCallback((problemId: number): void => {
    persistAttachments(attachmentsState.filter(a => a.problemId !== problemId));
  }, []);

  // 删除指定附件
  const deleteAttachment = useCallback((id: string): void => {
    persistAttachments(attachmentsState.filter(a => a.id !== id));
  }, []);

  // 根据流转记录ID获取附件
  const getAttachmentsByFlowRecordId = useCallback((flowRecordId: string): ProblemAttachment[] => {
    return attachmentsState.filter(a => a.flowRecordId === flowRecordId);
  }, []);

  // 清除所有附件（测试用）
  const clearAllAttachments = useCallback(() => {
    persistAttachments([]);
  }, []);

  return {
    // 状态
    attachments,

    // 添加
    addAttachment,
    addAttachments,

    // 查询
    getAttachments,
    getAttachmentsByType,
    getAttachment,
    getAttachmentsByFlowRecordId,

    // 删除
    deleteAttachments,
    deleteAttachment,

    // 清除
    clearAllAttachments,
  };
}

// 导出类型供外部使用
export type { ProblemAttachment as ProblemAttachment };
