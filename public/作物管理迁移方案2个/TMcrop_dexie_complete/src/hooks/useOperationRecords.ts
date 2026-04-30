/**
 * 统一农事操作记录管理 Hook
 * 管理所有来源的操作记录：任务派发、临时任务、手动录入
 * 数据存储在 localStorage，实现刷新后数据不丢失
 */

import React, { useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { COMMON_STATUS } from '../types/farm/common';

// ============================================
// 操作记录来源类型
// ============================================
export type OperationSourceType = 'task' | 'tempTask' | 'manual' | 'inspection';

// 来源配置
export const SOURCE_CONFIG: Record<OperationSourceType, { label: string; color: string }> = {
  task: { label: '任务派发', color: 'text-blue-600' },
  tempTask: { label: '临时任务', color: 'text-orange-600' },
  manual: { label: '手动录入', color: 'text-green-600' },
  inspection: { label: '巡查记录', color: 'text-purple-600' },
};

// ============================================
// 操作记录类型定义
// ============================================
export interface FarmOperationRecord {
  id: string;
  recordCode: string;         // 操作记录编号

  // 来源信息
  sourceType: OperationSourceType;  // 来源类型
  sourceId?: string;         // 来源ID（任务ID/临时任务ID）
  sourceCode?: string;       // 来源编号

  // 操作信息
  operationType: string;     // 操作类型值
  operationTypeName: string; // 操作类型名称
  status: string;            // 状态

  // 地块与作物
  greenhouseId: string;
  greenhouseName: string;
  cropName: string;
  variety?: string;
  batchId?: string;
  batchCode?: string;

  // 执行信息
  operatorId: string;
  operatorName: string;
  operationDate: string;
  startTime?: string;
  endTime?: string;
  duration?: number;         // 工作时长（分钟）

  // 工作量
  workload?: number;
  workloadDays?: number;
  workloadHours?: number;
  workers?: number;
  unit?: string;

  // 物料使用
  materials?: { name: string; qty: number; unit: string }[];

  // 反馈信息
  gpsLocation?: { lat: number; lng: number };
  photosBefore?: string[];
  photosAfter?: string[];
  voiceNote?: string;
  materialCode?: string;

  // 备注
  remarks?: string;

  // 进度（关联任务时有）
  progress?: number;
  progressIncrement?: number;  // 本次增加的进度

  // 区域（分解任务时使用）
  area?: string;

  // 子记录（用于折叠展示）
  children?: FarmOperationRecordChild[];

  // 驳回原因
  rejectReason?: string;

  // 时间戳
  createdAt: string;
  updatedAt?: string;
}

// 子记录（每次进度提交都生成一条）
export interface FarmOperationRecordChild {
  id: string;
  recordCode: string;

  // 操作类型
  operationType: 'accept' | 'progress' | 'complete' | 'reject' | 'accept_confirm' | 'create';
  operationTypeName: string;

  // 执行信息
  operatorId: string;
  operatorName: string;
  operationDate: string;
  time?: string;

  // 进度信息
  progress?: number;
  progressIncrement?: number;
  area?: string;

  // 工作量
  workload?: number;
  workloadDays?: number;
  workloadHours?: number;
  workers?: number;
  unit?: string;

  // 物料
  materials?: { name: string; qty: number; unit: string }[];

  // 反馈信息
  gpsLocation?: { lat: number; lng: number };
  photosBefore?: string[];
  photosAfter?: string[];
  voiceNote?: string;
  materialCode?: string;

  // 备注
  remarks?: string;

  // 驳回原因
  rejectReason?: string;

  // 时间戳
  createdAt: string;
}

// ============================================
// 生成操作记录编号
// ============================================
function generateRecordCode(): string {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const random = String(Math.random()).slice(2, 6);
  return `OP${dateStr}-${random}`;
}

// ============================================
// Hook 返回类型
// ============================================
export interface UseOperationRecordsReturn {
  // 操作记录列表
  records: FarmOperationRecord[];
  setRecords: React.Dispatch<React.SetStateAction<FarmOperationRecord[]>>;

  // 添加操作记录（手动录入）
  addRecord: (record: Omit<FarmOperationRecord, 'id' | 'recordCode' | 'createdAt' | 'updatedAt'>) => FarmOperationRecord;

  // 添加任务来源的操作记录
  addTaskRecord: (record: Omit<FarmOperationRecord, 'id' | 'recordCode' | 'sourceType' | 'createdAt' | 'updatedAt'>) => FarmOperationRecord;

  // 添加临时任务来源的操作记录
  addTempTaskRecord: (record: Omit<FarmOperationRecord, 'id' | 'recordCode' | 'sourceType' | 'createdAt' | 'updatedAt'>) => FarmOperationRecord;

  // 更新记录状态
  updateRecordStatus: (id: string, status: string) => void;

  // 获取记录
  getRecord: (id: string) => FarmOperationRecord | undefined;

  // 获取来源类型的记录
  getRecordsBySource: (sourceType: OperationSourceType) => FarmOperationRecord[];

  // 获取关联任务的所有记录
  getRecordsByTaskId: (taskId: string) => FarmOperationRecord[];

  // 删除记录
  deleteRecord: (id: string) => void;

  // 展开/折叠子记录
  toggleChildren: (id: string) => void;

  // 展开的记录ID集合
  expandedIds: Set<string>;

  // 根据筛选条件获取记录
  getFilteredRecords: (filters: {
    sourceType?: OperationSourceType;
    status?: string;
    operationType?: string;
    greenhouseId?: string;
    operatorId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => FarmOperationRecord[];
}

// ============================================
// useOperationRecords Hook
// ============================================

// ============================================
// 演示数据生成
// ============================================
function generateDemoRecords(): FarmOperationRecord[] {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // 计算日期
  const getDate = (daysAgo: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  const demoRecords: FarmOperationRecord[] = [
    // ========== 1. 正常完成的常规任务 ==========
    {
      id: 'DEMO_TASK_001',
      recordCode: 'OP20260410-1001',
      sourceType: 'task',
      sourceId: 'TASK_001',
      sourceCode: 'RW20260408-001',
      operationType: 'dispatch',
      operationTypeName: '任务分派',
      status: 'completed',
      greenhouseId: 'GH_001',
      greenhouseName: '玻璃温室A区',
      cropName: '番茄',
      variety: '大红番茄',
      batchId: 'BATCH_001',
      batchCode: 'FP20260401',
      operatorId: 'USER_001',
      operatorName: '张技术员',
      operationDate: getDate(5),
      startTime: '08:00',
      endTime: '12:00',
      duration: 240,
      workload: 100,
      unit: '株',
      progress: 100,
      remarks: '番茄整枝修剪工作完成',
      createdAt: new Date(getDate(5)).toISOString(),
      updatedAt: new Date(getDate(2)).toISOString(),
    },
    {
      id: 'DEMO_TASK_002',
      recordCode: 'OP20260408-1002',
      sourceType: 'task',
      sourceId: 'TASK_002',
      sourceCode: 'RW20260408-002',
      operationType: 'dispatch',
      operationTypeName: '任务分派',
      status: 'completed',
      greenhouseId: 'GH_002',
      greenhouseName: '玻璃温室B区',
      cropName: '黄瓜',
      variety: '水果黄瓜',
      operatorId: 'USER_002',
      operatorName: '李技术员',
      operationDate: getDate(4),
      duration: 180,
      workload: 50,
      unit: 'kg',
      progress: 100,
      remarks: '黄瓜采收完成',
      createdAt: new Date(getDate(4)).toISOString(),
      updatedAt: new Date(getDate(1)).toISOString(),
    },

    // ========== 2. 一次驳回后完成的流程 ==========
    {
      id: 'DEMO_TASK_003',
      recordCode: 'OP20260412-1003',
      sourceType: 'task',
      sourceId: 'TASK_003',
      sourceCode: 'RW20260412-003',
      operationType: 'dispatch',
      operationTypeName: '任务分派',
      status: 'completed',
      greenhouseId: 'GH_003',
      greenhouseName: '塑料大棚C区',
      cropName: '茄子',
      variety: '长茄子',
      operatorId: 'USER_001',
      operatorName: '张技术员',
      operationDate: getDate(3),
      progress: 100,
      remarks: '茄子病虫害防治，经一次驳回后重新执行完成',
      createdAt: new Date(getDate(3)).toISOString(),
      updatedAt: new Date(getDate(1)).toISOString(),
      children: [
        {
          id: 'DEMO_TASK_003_CHILD_1',
          recordCode: 'OP20260411-1010',
          operationType: 'reject',
          operationTypeName: '审核驳回',
          operatorId: 'USER_001',
          operatorName: '张技术员',
          operationDate: getDate(2),
          progress: 30,
          remarks: '药剂配比不符合要求',
          rejectReason: '药剂配比浓度过高，可能造成药害',
          createdAt: new Date(getDate(2)).toISOString(),
        },
        {
          id: 'DEMO_TASK_003_CHILD_2',
          recordCode: 'OP20260412-1011',
          operationType: 'complete',
          operationTypeName: '执行完成',
          operatorId: 'USER_003',
          operatorName: '王操作员',
          operationDate: getDate(1),
          progress: 100,
          workload: 30,
          unit: 'L',
          remarks: '按要求重新配比后完成喷施',
          createdAt: new Date(getDate(1)).toISOString(),
        },
      ],
    },

    // ========== 3. 连续驳回2次，待重新派发 ==========
    {
      id: 'DEMO_TASK_004',
      recordCode: 'OP20260414-1004',
      sourceType: 'task',
      sourceId: 'TASK_004',
      sourceCode: 'RW20260414-004',
      operationType: 'dispatch',
      operationTypeName: '任务分派',
      status: 'pending_reassign',
      greenhouseId: 'GH_001',
      greenhouseName: '玻璃温室A区',
      cropName: '辣椒',
      variety: '螺丝椒',
      operatorId: 'USER_002',
      operatorName: '李技术员',
      operationDate: getDate(2),
      progress: 50,
      remarks: '辣椒整枝工作，已驳回2次，等待重新派发',
      rejectReason: '执行质量不达标，已是第2次驳回',
      createdAt: new Date(getDate(2)).toISOString(),
      updatedAt: new Date().toISOString(),
      children: [
        {
          id: 'DEMO_TASK_004_CHILD_1',
          recordCode: 'OP20260413-1020',
          operationType: 'reject',
          operationTypeName: '审核驳回（第1次）',
          operatorId: 'USER_002',
          operatorName: '李技术员',
          operationDate: getDate(1),
          progress: 30,
          rejectReason: '整枝不彻底，侧枝留得太多',
          createdAt: new Date(getDate(1)).toISOString(),
        },
        {
          id: 'DEMO_TASK_004_CHILD_2',
          recordCode: 'OP20260414-1021',
          operationType: 'complete',
          operationTypeName: '重新执行提交',
          operatorId: 'USER_004',
          operatorName: '赵操作员',
          operationDate: getDate(1),
          progress: 50,
          workload: 80,
          unit: '株',
          remarks: '重新整枝后提交',
          createdAt: new Date(getDate(1)).toISOString(),
        },
        {
          id: 'DEMO_TASK_004_CHILD_3',
          recordCode: 'OP20260414-1022',
          operationType: 'reject',
          operationTypeName: '审核驳回（第2次）',
          operatorId: 'USER_002',
          operatorName: '李技术员',
          operationDate: getDate(0),
          progress: 50,
          rejectReason: '仍有遗漏，需要重新处理',
          createdAt: new Date().toISOString(),
        },
      ],
    },

    // ========== 4. 待执行的超时任务（pending超过24小时） ==========
    {
      id: 'DEMO_TASK_005',
      recordCode: 'OP20260413-1005',
      sourceType: 'task',
      sourceId: 'TASK_005',
      sourceCode: 'RW20260413-005',
      operationType: 'dispatch',
      operationTypeName: '任务分派',
      status: 'pending',
      greenhouseId: 'GH_004',
      greenhouseName: '露天种植区A',
      cropName: '白菜',
      variety: '大白菜',
      operatorId: 'USER_001',
      operatorName: '张技术员',
      operationDate: getDate(2),
      progress: 0,
      remarks: '待执行的浇水任务，已超时未接受',
      createdAt: new Date(getDate(2)).toISOString(),
      updatedAt: new Date(getDate(2)).toISOString(),
    },

    // ========== 5. 执行中超时任务（in_progress超过48小时） ==========
    {
      id: 'DEMO_TASK_006',
      recordCode: 'OP20260410-1006',
      sourceType: 'task',
      sourceId: 'TASK_006',
      sourceCode: 'RW20260410-006',
      operationType: 'dispatch',
      operationTypeName: '任务分派',
      status: 'in_progress',
      greenhouseId: 'GH_002',
      greenhouseName: '玻璃温室B区',
      cropName: '番茄',
      variety: '樱桃番茄',
      operatorId: 'USER_003',
      operatorName: '王操作员',
      operationDate: getDate(3),
      progress: 60,
      remarks: '番茄绑蔓工作，进行中但进度缓慢，已超时',
      createdAt: new Date(getDate(3)).toISOString(),
      updatedAt: new Date().toISOString(),
    },

    // ========== 6. 临时任务 - 正常完成 ==========
    {
      id: 'DEMO_TEMP_001',
      recordCode: 'OP20260412-2001',
      sourceType: 'tempTask',
      sourceId: 'TEMP_TASK_001',
      sourceCode: 'TT20260412-001',
      operationType: 'create',
      operationTypeName: '创建临时任务',
      status: 'completed',
      greenhouseId: 'GH_001',
      greenhouseName: '玻璃温室A区',
      cropName: '番茄',
      operatorId: 'USER_001',
      operatorName: '张技术员',
      operationDate: getDate(3),
      progress: 100,
      remarks: '应急修复灌溉管道漏水',
      createdAt: new Date(getDate(3)).toISOString(),
      updatedAt: new Date(getDate(2)).toISOString(),
    },

    // ========== 7. 临时任务 - 一次驳回后完成 ==========
    {
      id: 'DEMO_TEMP_002',
      recordCode: 'OP20260411-2002',
      sourceType: 'tempTask',
      sourceId: 'TEMP_TASK_002',
      sourceCode: 'TT20260411-002',
      operationType: 'create',
      operationTypeName: '创建临时任务',
      status: 'completed',
      greenhouseId: 'GH_003',
      greenhouseName: '塑料大棚C区',
      cropName: '茄子',
      operatorId: 'USER_002',
      operatorName: '李技术员',
      operationDate: getDate(4),
      progress: 100,
      remarks: '处理茄子叶片发黄问题，经驳回后完成',
      createdAt: new Date(getDate(4)).toISOString(),
      updatedAt: new Date(getDate(2)).toISOString(),
      children: [
        {
          id: 'DEMO_TEMP_002_CHILD_1',
          recordCode: 'OP20260410-2010',
          operationType: 'reject',
          operationTypeName: '审核驳回',
          operatorId: 'USER_002',
          operatorName: '李技术员',
          operationDate: getDate(3),
          progress: 40,
          rejectReason: '用药方案不对症，需更换药剂',
          createdAt: new Date(getDate(3)).toISOString(),
        },
        {
          id: 'DEMO_TEMP_002_CHILD_2',
          recordCode: 'OP20260411-2011',
          operationType: 'accept_confirm',
          operationTypeName: '审核通过',
          operatorId: 'USER_002',
          operatorName: '李技术员',
          operationDate: getDate(2),
          progress: 100,
          remarks: '更换药剂后问题解决',
          createdAt: new Date(getDate(2)).toISOString(),
        },
      ],
    },

    // ========== 8. 临时任务 - 待验收（已完成提交待审核） ==========
    {
      id: 'DEMO_TEMP_003',
      recordCode: 'OP20260414-2003',
      sourceType: 'tempTask',
      sourceId: 'TEMP_TASK_003',
      sourceCode: 'TT20260414-003',
      operationType: 'create',
      operationTypeName: '创建临时任务',
      status: 'waiting_acceptance',
      greenhouseId: 'GH_002',
      greenhouseName: '玻璃温室B区',
      cropName: '黄瓜',
      operatorId: 'USER_003',
      operatorName: '王操作员',
      operationDate: getDate(1),
      progress: 100,
      remarks: '黄瓜霜霉病防治作业，已提交待验收',
      createdAt: new Date(getDate(1)).toISOString(),
      updatedAt: new Date().toISOString(),
    },

    // ========== 9. 临时任务 - 连续驳回2次待重新派发 ==========
    {
      id: 'DEMO_TEMP_004',
      recordCode: 'OP20260413-2004',
      sourceType: 'tempTask',
      sourceId: 'TEMP_TASK_004',
      sourceCode: 'TT20260413-004',
      operationType: 'create',
      operationTypeName: '创建临时任务',
      status: 'pending_reassign',
      greenhouseId: 'GH_004',
      greenhouseName: '露天种植区A',
      cropName: '白菜',
      operatorId: 'USER_001',
      operatorName: '张技术员',
      operationDate: getDate(2),
      progress: 50,
      remarks: '白菜害虫防治，已驳回2次，等待重新派发',
      createdAt: new Date(getDate(2)).toISOString(),
      updatedAt: new Date().toISOString(),
      children: [
        {
          id: 'DEMO_TEMP_004_CHILD_1',
          recordCode: 'OP20260412-2020',
          operationType: 'reject',
          operationTypeName: '审核驳回（第1次）',
          operatorId: 'USER_001',
          operatorName: '张技术员',
          operationDate: getDate(1),
          progress: 30,
          rejectReason: '喷施不均匀，部分叶片未喷到',
          createdAt: new Date(getDate(1)).toISOString(),
        },
        {
          id: 'DEMO_TEMP_004_CHILD_2',
          recordCode: 'OP20260413-2021',
          operationType: 'reject',
          operationTypeName: '审核驳回（第2次）',
          operatorId: 'USER_001',
          operatorName: '张技术员',
          operationDate: getDate(0),
          progress: 50,
          rejectReason: '药品浓度仍需调整',
          createdAt: new Date().toISOString(),
        },
      ],
    },

    // ========== 10. 巡查记录 - 已处理 ==========
    {
      id: 'DEMO_INSP_001',
      recordCode: 'OP20260410-3001',
      sourceType: 'inspection',
      sourceId: 'INSP_001',
      sourceCode: 'XC20260410-001',
      operationType: 'inspection_report',
      operationTypeName: '巡查上报',
      status: 'completed',
      greenhouseId: 'GH_001',
      greenhouseName: '玻璃温室A区',
      cropName: '番茄',
      operatorId: 'USER_005',
      operatorName: '巡检员小陈',
      operationDate: getDate(5),
      progress: 100,
      remarks: '发现番茄叶片发黄，已处理',
      createdAt: new Date(getDate(5)).toISOString(),
      updatedAt: new Date(getDate(4)).toISOString(),
    },

    // ========== 11. 巡查记录 - 待处理 ==========
    {
      id: 'DEMO_INSP_002',
      recordCode: 'OP20260413-3002',
      sourceType: 'inspection',
      sourceId: 'INSP_002',
      sourceCode: 'XC20260413-002',
      operationType: 'inspection_report',
      operationTypeName: '巡查上报',
      status: 'pending',
      greenhouseId: 'GH_002',
      greenhouseName: '玻璃温室B区',
      cropName: '黄瓜',
      operatorId: 'USER_005',
      operatorName: '巡检员小陈',
      operationDate: getDate(2),
      progress: 0,
      remarks: '发现黄瓜叶片出现疑似霜霉病症状，待确认处理',
      createdAt: new Date(getDate(2)).toISOString(),
      updatedAt: new Date(getDate(2)).toISOString(),
    },

    // ========== 12. 手动录入记录 ==========
    {
      id: 'DEMO_MANUAL_001',
      recordCode: 'OP20260412-4001',
      sourceType: 'manual',
      operationType: 'manual_entry',
      operationTypeName: '手动录入',
      status: 'completed',
      greenhouseId: 'GH_001',
      greenhouseName: '玻璃温室A区',
      cropName: '番茄',
      variety: '大红番茄',
      operatorId: 'USER_001',
      operatorName: '张技术员',
      operationDate: getDate(3),
      duration: 120,
      workload: 200,
      unit: 'kg',
      remarks: '番茄日常巡园记录',
      createdAt: new Date(getDate(3)).toISOString(),
      updatedAt: new Date(getDate(3)).toISOString(),
    },
  ];

  return demoRecords;
}

export function useOperationRecords(): UseOperationRecordsReturn {
  // 从 localStorage 读取操作记录，演示数据作为默认值（清空后自动恢复）
  const [records, setRecords] = useLocalStorage<FarmOperationRecord[]>(
    'yuanxingtu_operationRecords',
    generateDemoRecords()
  );

  // 展开的记录ID集合
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // 切换展开/折叠
  const toggleChildren = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 添加操作记录（手动录入）
  const addRecord = useCallback((recordData: Omit<FarmOperationRecord, 'id' | 'recordCode' | 'createdAt' | 'updatedAt'>): FarmOperationRecord => {
    const now = new Date().toISOString();
    const newRecord: FarmOperationRecord = {
      ...recordData,
      id: `OP_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      recordCode: generateRecordCode(),
      sourceType: 'manual',
      createdAt: now,
      updatedAt: now,
    };

    setRecords(prev => [newRecord, ...prev]);
    return newRecord;
  }, [setRecords]);

  // 添加任务来源的操作记录
  const addTaskRecord = useCallback((recordData: Omit<FarmOperationRecord, 'id' | 'recordCode' | 'sourceType' | 'createdAt' | 'updatedAt'>): FarmOperationRecord => {
    const now = new Date().toISOString();
    const newRecord: FarmOperationRecord = {
      ...recordData,
      id: `OP_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      recordCode: generateRecordCode(),
      sourceType: 'task',
      createdAt: now,
      updatedAt: now,
    };

    // 检查是否已存在该任务的主记录
    const existingIndex = records.findIndex(r => r.sourceId === recordData.sourceId && r.sourceType === 'task');

    if (existingIndex >= 0) {
      // 更新主记录的children
      setRecords(prev => {
        const updated = [...prev];
        const childRecord: FarmOperationRecordChild = {
          id: newRecord.id,
          recordCode: newRecord.recordCode,
          operationType: recordData.operationType as any,
          operationTypeName: recordData.operationTypeName,
          operatorId: recordData.operatorId,
          operatorName: recordData.operatorName,
          operationDate: recordData.operationDate,
          progress: recordData.progress,
          progressIncrement: recordData.progressIncrement,
          area: recordData.area,
          workload: recordData.workload,
          workloadDays: recordData.workloadDays,
          workloadHours: recordData.workloadHours,
          workers: recordData.workers,
          unit: recordData.unit,
          materials: recordData.materials,
          gpsLocation: recordData.gpsLocation,
          photosBefore: recordData.photosBefore,
          photosAfter: recordData.photosAfter,
          voiceNote: recordData.voiceNote,
          materialCode: recordData.materialCode,
          remarks: recordData.remarks,
          rejectReason: recordData.rejectReason,
          createdAt: now,
        };
        updated[existingIndex] = {
          ...updated[existingIndex],
          progress: recordData.progress,
          status: recordData.status,
          children: [childRecord, ...(updated[existingIndex].children || [])],
          updatedAt: now,
        };
        return updated;
      });
      return records[existingIndex];
    } else {
      // 新建主记录
      setRecords(prev => [newRecord, ...prev]);
      return newRecord;
    }
  }, [records, setRecords]);

  // 添加临时任务来源的操作记录
  const addTempTaskRecord = useCallback((recordData: Omit<FarmOperationRecord, 'id' | 'recordCode' | 'sourceType' | 'createdAt' | 'updatedAt'>): FarmOperationRecord => {
    const now = new Date().toISOString();
    const newRecord: FarmOperationRecord = {
      ...recordData,
      id: `OP_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      recordCode: generateRecordCode(),
      sourceType: 'tempTask',
      createdAt: now,
      updatedAt: now,
    };

    setRecords(prev => [newRecord, ...prev]);
    return newRecord;
  }, [setRecords]);

  // 更新记录状态
  const updateRecordStatus = useCallback((id: string, status: string) => {
    setRecords(prev => prev.map(record =>
      record.id === id
        ? { ...record, status, updatedAt: new Date().toISOString() }
        : record
    ));
  }, [setRecords]);

  // 获取记录
  const getRecord = useCallback((id: string) => {
    return records.find(record => record.id === id);
  }, [records]);

  // 获取来源类型的记录
  const getRecordsBySource = useCallback((sourceType: OperationSourceType) => {
    return records.filter(record => record.sourceType === sourceType);
  }, [records]);

  // 获取关联任务的所有记录
  const getRecordsByTaskId = useCallback((taskId: string) => {
    return records.filter(record => record.sourceId === taskId);
  }, [records]);

  // 删除记录
  const deleteRecord = useCallback((id: string) => {
    setRecords(prev => prev.filter(record => record.id !== id));
  }, [setRecords]);

  // 获取筛选后的记录
  const getFilteredRecords = useCallback((filters: {
    sourceType?: OperationSourceType;
    status?: string;
    operationType?: string;
    greenhouseId?: string;
    operatorId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    return records.filter(record => {
      if (filters.sourceType && record.sourceType !== filters.sourceType) return false;
      if (filters.status && record.status !== filters.status) return false;
      if (filters.operationType && record.operationType !== filters.operationType) return false;
      if (filters.greenhouseId && record.greenhouseId !== filters.greenhouseId) return false;
      if (filters.operatorId && record.operatorId !== filters.operatorId) return false;
      if (filters.dateFrom && record.operationDate < filters.dateFrom) return false;
      if (filters.dateTo && record.operationDate > filters.dateTo) return false;
      return true;
    });
  }, [records]);

  return {
    records,
    setRecords,
    addRecord,
    addTaskRecord,
    addTempTaskRecord,
    updateRecordStatus,
    getRecord,
    getRecordsBySource,
    getRecordsByTaskId,
    deleteRecord,
    toggleChildren,
    expandedIds,
    getFilteredRecords,
  };
}

// 导出类型
export type { FarmOperationRecord, FarmOperationRecordChild };
