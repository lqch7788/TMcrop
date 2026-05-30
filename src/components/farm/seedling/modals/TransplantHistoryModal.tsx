/**
 * 栽种历史履历弹窗
 * 显示二维码的移入移出轨迹
 */

import React, { useState, useEffect } from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { Seedling, TransplantHistory, TransplantAction } from '../../../../types/crop';
import { getTransplantHistory } from '../../../../services/apiSeedlingService';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';

interface TransplantHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: Seedling;
}

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

export function TransplantHistoryModal({ isOpen, onClose, record }: TransplantHistoryModalProps) {
  const [historyData, setHistoryData] = useState<TransplantHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && record?.id) {
      setIsLoading(true);
      getTransplantHistory(record.id).then(data => {
        setHistoryData(data);
        setIsLoading(false);
      }).catch(() => {
        setHistoryData([]);
        setIsLoading(false);
      });
    }
  }, [isOpen, record?.id]);

  // 生成默认标签列表（如果没有历史数据）
  function generateDefaultLabels(seedling: Seedling): string[] {
    const labels: string[] = [];
    for (let i = 1; i <= Math.min(seedling.initialCount, 20); i++) {
      labels.push(`${seedling.seedlingCode}-${String(i).padStart(3, '0')}`);
    }
    if (seedling.initialCount > 20) {
      labels.push(`...共${seedling.initialCount}个二维码`);
    }
    return labels;
  }

  // 获取所有二维码编号
  const labelNumbers = historyData.length > 0
    ? historyData.map(h => h.labelNumber)
    : generateDefaultLabels(record);

  const [selectedLabel, setSelectedLabel] = useState<string>('');

  useEffect(() => {
    if (labelNumbers.length > 0 && !selectedLabel) {
      setSelectedLabel(labelNumbers[0]);
    }
  }, [labelNumbers, selectedLabel]);

  // 获取当前选中的履历
  const currentHistory = historyData.find(h => h.labelNumber === selectedLabel);

  // 获取操作类型标签样式
  const getActionStyle = (action: TransplantAction) => {
    switch (action) {
      case TransplantAction.MOVE_IN:
        return 'bg-green-100 text-green-700';
      case TransplantAction.MOVE_OUT:
        return 'bg-orange-100 text-orange-700';
      case TransplantAction.TRANSPLANT:
        return 'bg-blue-100 text-blue-700';
      case TransplantAction.MARK:
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // 获取操作类型名称
  const getActionName = (action: TransplantAction) => {
    switch (action) {
      case TransplantAction.MOVE_IN: return '移入';
      case TransplantAction.MOVE_OUT: return '移出';
      case TransplantAction.TRANSPLANT: return '定植';
      case TransplantAction.MARK: return '标记';
      default: return action;
    }
  };

  if (isLoading) {
    return (
      <UnifiedModal
        isOpen={isOpen}
        onClose={onClose}
        title={`栽种历史 - ${record.seedlingCode}`}
        size="xl"
        showFooter={false}
      >
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">加载中...</div>
        </div>
      </UnifiedModal>
    );
  }

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`栽种历史 - ${record.seedlingCode}`}
      size="xl"
      showFooter={false}
    >
      <div className="space-y-4">
        {/* 二维码选择 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <Label className="text-gray-700">选择二维码编号：</Label>
            <Select
              value={selectedLabel}
              onValueChange={(val) => setSelectedLabel(val)}
            >
              <SelectTrigger className={deepInputClass}>
                <SelectValue placeholder="选择标签" />
              </SelectTrigger>
              <SelectContent>
                {labelNumbers.map(label => (
                  <SelectItem key={label} value={label}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 履历时间线 */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            操作履历
          </h4>

          {currentHistory && currentHistory.history.length > 0 ? (
            <div className="space-y-4">
              {currentHistory.history.map((item, index) => (
                <div key={item.id || index} className="flex gap-4">
                  {/* 时间线 */}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${getActionStyle(item.action)}`}>
                      {getActionName(item.action).charAt(0)}
                    </div>
                    {index < currentHistory.history.length - 1 && (
                      <div className="w-0.5 h-12 bg-gray-200 mt-1"></div>
                    )}
                  </div>

                  {/* 履历内容 */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionStyle(item.action)}`}>
                        {getActionName(item.action)}
                      </span>
                      <span className="text-sm text-gray-500">{item.date}</span>
                      {item.operator && (
                        <span className="text-xs text-gray-400">操作员: {item.operator}</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-700">
                      {item.fromArea && (
                        <span className="mr-2">从: <span className="font-medium">{item.fromArea}</span></span>
                      )}
                      {item.toArea && (
                        <span>到: <span className="font-medium">{item.toArea}</span></span>
                      )}
                    </div>
                    {item.count && (
                      <div className="text-xs text-gray-500 mt-1">数量: {item.count}</div>
                    )}
                    {item.remarks && (
                      <div className="text-xs text-gray-400 mt-1 italic">{item.remarks}</div>
                    )}
                    {/* 标记相关 */}
                    {item.markName && (
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: item.markColor || '#ccc' }}
                        ></span>
                        <span className="text-sm">{item.markName}</span>
                        {item.markIcon && <span className="text-lg">{item.markIcon}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              暂无履历记录
            </div>
          )}
        </div>

        {/* 当前状态 */}
        {currentHistory && (
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-gray-600">当前位置：</span>
                <span className="font-medium text-gray-900">{currentHistory.currentArea || '未知'}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">状态：</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  currentHistory.status === 'in_stock' ? 'bg-gray-100 text-gray-700' :
                  currentHistory.status === 'transplanting' ? 'bg-blue-100 text-blue-700' :
                  currentHistory.status === 'growing' ? 'bg-green-100 text-green-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {currentHistory.status === 'in_stock' ? '库存' :
                   currentHistory.status === 'transplanting' ? '定植中' :
                   currentHistory.status === 'growing' ? '生长期' : '已采收'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </UnifiedModal>
  );
}
