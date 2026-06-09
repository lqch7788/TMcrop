/**
 * 巡查记录表格工具栏组件
 */

import React from 'react';
import { Download, Edit2, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui';

interface InspectionToolbarProps {
  // 模式状态
  exportMode: boolean;
  batchEditMode: boolean;
  batchDeleteMode: boolean;
  // 统计信息
  stats?: {
    total: number;
    normal: number;
    attention: number;
    abnormal: number;
  };
  // 操作回调
  onCreate: () => void;
  onBatchEdit: () => void;
  onBatchDelete: () => void;
  onExport: () => void;
  onConfirmExport: () => void;
  onCancelExport: () => void;
  onConfirmBatchEdit: () => void;
  onCancelBatchEdit: () => void;
  onConfirmBatchDelete: () => void;
  onCancelBatchDelete: () => void;
}

export function InspectionToolbar({
  exportMode,
  batchEditMode,
  batchDeleteMode,
  stats,
  onCreate,
  onBatchEdit,
  onBatchDelete,
  onExport,
  onConfirmExport,
  onCancelExport,
  onConfirmBatchEdit,
  onCancelBatchEdit,
  onConfirmBatchDelete,
  onCancelBatchDelete,
}: InspectionToolbarProps) {
  return (
    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-semibold text-gray-900">巡查记录列表</h3>
        {stats && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">共</span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 font-semibold rounded">{stats.total}</span>
            <span className="text-gray-500">条</span>
            <span className="text-green-600">| 正常 {stats.normal}</span>
            <span className="text-yellow-600">| 需关注 {stats.attention}</span>
            <span className="text-red-600">| 异常 {stats.abnormal}</span>
          </div>
        )}
      </div>
      {(exportMode || batchEditMode || batchDeleteMode) ? (
        <div className="flex gap-2">
          {exportMode && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={onConfirmExport}
              >
                <Download className="w-4 h-4" />
                确认导出
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={onCancelExport}
              >
                <X className="w-4 h-4" /> 取消
              </Button>
            </>
          )}
          {batchEditMode && (
            <>
              <Button
                variant="blue"
                size="sm"
                onClick={onConfirmBatchEdit}
              >
                <Edit2 className="w-4 h-4" />
                确认编辑
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={onCancelBatchEdit}
              >
                <X className="w-4 h-4" /> 取消
              </Button>
            </>
          )}
          {batchDeleteMode && (
            <>
              <Button
                size="sm"
                variant="destructive"
                onClick={onConfirmBatchDelete}
              >
                <Trash2 className="w-4 h-4" />
                确认删除
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={onCancelBatchDelete}
              >
                <X className="w-4 h-4" /> 取消
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={onCreate}
          >
            <Plus className="w-4 h-4" />
            新增
          </Button>
          <Button
            size="sm"
            variant="blue"
            onClick={onBatchEdit}
          >
            <Edit2 className="w-4 h-4" />
            编辑
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onBatchDelete}
          >
            <Trash2 className="w-4 h-4" />
            删除
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onExport}
          >
            <Download className="w-4 h-4" />
            导出
          </Button>
        </div>
      )}
    </div>
  );
}
