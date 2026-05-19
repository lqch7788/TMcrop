/**
 * 施肥批量删除确认弹窗
 * 显示选中数量，若有IoT记录则警告不可删除
 */
import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { UnifiedModal } from '../../ui/UnifiedModal';
import { Button } from '../../ui/button';
import { FertilizerData } from '@/stores';

interface FertilizerBatchDeleteModalProps {
  isOpen: boolean;
  count: number;
  selectedItems: FertilizerData[];
  onClose: () => void;
  onConfirm: () => void;
}

export function FertilizerBatchDeleteModal({
  isOpen,
  count,
  selectedItems,
  onClose,
  onConfirm,
}: FertilizerBatchDeleteModalProps) {
  // 统计 IoT 记录
  const iotItems = selectedItems.filter((it) => it.dataSource === 'auto_iot');
  const manualItems = selectedItems.filter((it) => it.dataSource === 'manual');
  const hasIot = iotItems.length > 0;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="批量删除确认"
      size="md"
      showFooter={false}
    >
      <div className="space-y-4">
        {/* 基本信息 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">确认删除 {count} 条施肥记录？</p>
              <p className="text-xs text-gray-500">此操作不可恢复，请谨慎操作</p>
            </div>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-blue-700">{manualItems.length}</div>
            <div className="text-xs text-blue-500">手动记录（可删除）</div>
          </div>
          <div className={`rounded-lg p-3 text-center ${hasIot ? 'bg-amber-50' : 'bg-green-50'}`}>
            <div className={`text-lg font-bold ${hasIot ? 'text-amber-700' : 'text-green-700'}`}>
              {iotItems.length}
            </div>
            <div className={`text-xs ${hasIot ? 'text-amber-500' : 'text-green-500'}`}>
              IoT记录（不可删除）
            </div>
          </div>
        </div>

        {/* IoT 警告 */}
        {hasIot && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700">
              <p className="font-medium">检测到 {iotItems.length} 条IoT自动记录</p>
              <p className="text-xs mt-1">IoT自动记录将被跳过，仅删除手动录入的记录。</p>
            </div>
          </div>
        )}

        {/* 按钮 */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            取消
          </Button>
          {manualItems.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onConfirm}
            >
              <Trash2 className="w-4 h-4" />
              确认删除 ({manualItems.length}条)
            </Button>
          )}
          {manualItems.length === 0 && (
            <Button
              variant="secondary"
              size="sm"
              disabled
              className="opacity-50 cursor-not-allowed"
            >
              无可删除记录
            </Button>
          )}
        </div>
      </div>
    </UnifiedModal>
  );
}
