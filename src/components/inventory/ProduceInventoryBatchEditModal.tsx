/**
 * 产品库存批量编辑弹窗组件
 * 参照物料批量编辑弹窗结构
 */

import React from 'react';
import { UnifiedModal } from '../ui/UnifiedModal';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Input } from '../ui/input';
import { ProduceInventory } from '../../types/inventory';
import { getAllVarieties } from '../../services/cropVarietyService';

/** 与表格一致的11位作物编码生成函数 */
function generateCropCode(cropName: string, variety: string): string {
  const allVarieties = getAllVarieties();
  const exactMatch = allVarieties.find(v => {
    const varietyMatch = v.subVariety1Name === variety || v.varietyName === variety;
    const cropMatch = v.varietyName === cropName || v.typeName === cropName || v.categoryName === cropName;
    return varietyMatch && cropMatch;
  });
  if (exactMatch?.cropCode?.length >= 9) return exactMatch.cropCode.padEnd(11, '0').substring(0, 11);
  const subMatch = allVarieties.find(v => v.subVariety1Name === variety);
  if (subMatch?.cropCode?.length >= 9) return subMatch.cropCode.padEnd(11, '0').substring(0, 11);
  const varietyMatch2 = allVarieties.find(v => v.varietyName === variety);
  if (varietyMatch2?.cropCode?.length >= 9) return varietyMatch2.cropCode.padEnd(11, '0').substring(0, 11);
  const cropMatch = allVarieties.find(v => v.varietyName === cropName);
  if (cropMatch?.cropCode?.length >= 9) return cropMatch.cropCode.padEnd(11, '0').substring(0, 11);
  const typeMatch = allVarieties.find(v => v.typeName === cropName);
  if (typeMatch?.cropCode?.length >= 9) return typeMatch.cropCode.padEnd(11, '0').substring(0, 11);
  return 'OT0000000000';
}

interface ProduceInventoryBatchEditModalProps {
  isOpen: boolean;
  selectedRows: string[];
  inventoryData: ProduceInventory[];
  batchEditedItems: Record<string, Partial<ProduceInventory>>;
  currentEditIndex: number;
  onClose: () => void;
  onItemSelect: (index: number) => void;
  onFieldChange: (id: string, field: string, value: any) => void;
  onSaveAll: () => void;
  onNext: () => void;
}

export function ProduceInventoryBatchEditModal({
  isOpen,
  selectedRows,
  inventoryData,
  batchEditedItems,
  currentEditIndex,
  onClose,
  onItemSelect,
  onFieldChange,
  onSaveAll,
  onNext,
}: ProduceInventoryBatchEditModalProps) {
  if (!isOpen) return null;

  // 获取选中的库存项
  const selectedItems = inventoryData.filter(item => selectedRows.includes(item.id));
  const currentItemId = selectedRows[currentEditIndex];
  const currentItem = selectedItems.find(item => item.id === currentItemId);
  // 合并原始数据和编辑数据，确保显示完整信息
  const currentEditedData = currentItemId ? { ...currentItem, ...batchEditedItems[currentItemId] } : {};
  const editedCount = Object.keys(batchEditedItems).length;

  // 处理预警设置字段变化
  const handleAlertFieldChange = (id: string, field: string, value: number) => {
    const currentAlertSettings = currentItem?.alertSettings || { minStock: 0, maxStock: 0, expirationDays: 0 };
    onFieldChange(id, 'alertSettings', { ...currentAlertSettings, [field]: value });
  };

  // 计算过期日期（入库日期 + 保质期天数）
  const calculateExpirationDate = (storageDate: string, days: number): string => {
    if (!storageDate || !days) return '-';
    const date = new Date(storageDate);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  // 获取计算得出的过期日期
  const expirationDays = currentEditedData.alertSettings?.expirationDays ?? currentItem?.alertSettings?.expirationDays ?? 0;
  const calculatedExpirationDate = calculateExpirationDate(currentEditedData.storageDate || currentItem?.storageDate || '', expirationDays);

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="批量编辑产品库存"
      size="xxl"
      showFooter={true}
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button size="sm" variant="outline" onClick={onNext}>
            确认 {currentEditIndex + 1 < selectedRows.length ? '(下一个)' : '(已最后一个)'}
          </Button>
          <Button size="sm" onClick={onSaveAll}>
            保存全部 ({editedCount} 个)
          </Button>
        </div>
      }
    >
      <div className="bg-emerald-50 rounded-lg p-4 mb-4">
        <p className="text-sm text-emerald-800">已选择 <strong>{selectedRows.length}</strong> 个产品进行批量编辑，已编辑 <strong>{editedCount}</strong> 个</p>
      </div>

      {/* 选择产品下拉框 */}
      <div className="mb-4">
        <Label className="text-gray-700">选择产品</Label>
        <Select value={currentItemId || ''} onValueChange={(val) => {
          const idx = selectedRows.indexOf(val);
          onItemSelect(idx >= 0 ? idx : 0);
        }}>
          <SelectTrigger className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
            <SelectValue placeholder="选择产品" />
          </SelectTrigger>
          <SelectContent>
            {selectedItems.map((item, idx) => (
              <SelectItem key={item.id} value={item.id}>
                {generateCropCode(item.cropName, item.variety)} - {item.cropName} {batchEditedItems[item.id] && '✅ 已编辑'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 产品基本信息（只读） */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">产品基本信息（不可编辑）</h4>
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">产品编码</div>
            <div className="text-sm font-medium text-gray-900">{generateCropCode(currentItem?.cropName || currentEditedData.cropName || '', currentItem?.variety || currentEditedData.variety || '') || '-'}</div>
          </div>
          <div className="bg-white rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">产品名称</div>
            <div className="text-sm font-medium text-gray-900">{currentEditedData.cropName || '-'}</div>
          </div>
          <div className="bg-white rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">品种</div>
            <div className="text-sm font-medium text-gray-900">{currentEditedData.variety || '-'}</div>
          </div>
          <div className="bg-white rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">品质等级</div>
            <div className="text-sm font-medium text-gray-900">{currentEditedData.grade || '-'}</div>
          </div>
          <div className="bg-white rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">批次号</div>
            <div className="text-sm font-medium text-gray-900">{currentEditedData.batchCode || '-'}</div>
          </div>
          <div className="bg-white rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">仓库</div>
            <div className="text-sm font-medium text-gray-900">{currentEditedData.warehouseName || '-'}</div>
          </div>
          <div className="bg-white rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">采收日期</div>
            <div className="text-sm font-medium text-gray-900">{currentEditedData.harvestDate || '-'}</div>
          </div>
          <div className="bg-white rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">入库日期</div>
            <div className="text-sm font-medium text-gray-900">{currentEditedData.storageDate || '-'}</div>
          </div>
        </div>
      </div>

      {/* 可编辑字段 */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700">可编辑字段</h4>

        {/* 库存信息 */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-gray-700">库存数量</Label>
            <Input
              type="number"
              min="0"
              value={currentEditedData.quantity ?? ''}
              onChange={(e) => onFieldChange(currentItemId, 'quantity', Number(e.target.value))}
              className="w-full h-8 px-3 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-700">最低库存预警</Label>
            <Input
              type="number"
              min="0"
              value={currentEditedData.alertSettings?.minStock ?? ''}
              onChange={(e) => handleAlertFieldChange(currentItemId, 'minStock', Number(e.target.value))}
              className="w-full h-8 px-3 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-700">最高库存预警</Label>
            <Input
              type="number"
              min="0"
              value={currentEditedData.alertSettings?.maxStock ?? ''}
              onChange={(e) => handleAlertFieldChange(currentItemId, 'maxStock', Number(e.target.value))}
              className="w-full h-8 px-3 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-gray-700">存放位置</Label>
            <Input
              type="text"
              value={currentEditedData.storageLocation || ''}
              onChange={(e) => onFieldChange(currentItemId, 'storageLocation', e.target.value)}
              placeholder="例如：A区-01-03"
              className="w-full h-8 px-3 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-700">保质期天数</Label>
            <Input
              type="number"
              min="0"
              value={currentEditedData.alertSettings?.expirationDays ?? ''}
              onChange={(e) => handleAlertFieldChange(currentItemId, 'expirationDays', Number(e.target.value))}
              className="w-full h-8 px-3 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="bg-gray-100 rounded-lg p-2">
            <div className="text-xs font-medium text-gray-700 mb-1">过期日期（自动计算）</div>
            <div className="text-sm font-medium text-gray-900">{calculatedExpirationDate}</div>
          </div>
        </div>
      </div>
    </UnifiedModal>
  );
}

export default ProduceInventoryBatchEditModal;
