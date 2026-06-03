import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { MaterialAutocomplete } from '@/components/common/MaterialAutocomplete';
import type { MaterialExecuteRecord, ExecuteMaterialItem } from '../../../types/materialReceiving';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface ExecuteEditModalProps {
  isOpen: boolean;
  record: MaterialExecuteRecord | null;
  editForm: {
    date: string;
    applicant: string;
    warehouseLocation: string;
    reviewer: string;
    operator: string;
    productionBatchCode: string;
    executeStatus: string;
    materials: ExecuteMaterialItem[];
  };
  onClose: () => void;
  onEditFormChange: (field: string, value: any) => void;
  onMaterialChange: (index: number, field: string, value: any) => void;
  onAddMaterial: () => void;
  onRemoveMaterial: (index: number) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const ExecuteEditModal: React.FC<ExecuteEditModalProps> = ({
  isOpen,
  record,
  editForm,
  onClose,
  onEditFormChange,
  onMaterialChange,
  onAddMaterial,
  onRemoveMaterial,
  onCancel,
  onSave,
}) => {
  if (!isOpen || !record) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑领料出库单"
      size="xl"
      showFooter={false}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-100 rounded-lg p-3">
          <Label className="block text-xs font-medium text-gray-500 mb-1">领料单号</Label>
          <div className="text-sm font-medium text-gray-900">{record.code}</div>
        </div>
        <div>
          <Label className="block text-sm font-medium text-blue-700 mb-1">申请日期</Label>
          <Input
            type="date"
            value={editForm.date}
            onChange={(e) => onEditFormChange('date', e.target.value)}
            className={deepInputClass}
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-blue-700 mb-1">申请人</Label>
          <Input
            type="text"
            value={editForm.applicant}
            onChange={(e) => onEditFormChange('applicant', e.target.value)}
            className={deepInputClass}
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-blue-700 mb-1">库存地点</Label>
          <Select
            value={editForm.warehouseLocation}
            onValueChange={(v) => onEditFormChange('warehouseLocation', v)}
          >
            <SelectTrigger className={deepInputClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="仓库A区">仓库A区</SelectItem>
              <SelectItem value="仓库B区">仓库B区</SelectItem>
              <SelectItem value="仓库C区">仓库C区</SelectItem>
              <SelectItem value="仓库D区">仓库D区</SelectItem>
              <SelectItem value="仓库E区">仓库E区</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="block text-sm font-medium text-blue-700 mb-1">审核人</Label>
          <Input
            type="text"
            value={editForm.reviewer}
            onChange={(e) => onEditFormChange('reviewer', e.target.value)}
            className={deepInputClass}
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-blue-700 mb-1">操作人</Label>
          <Input
            type="text"
            value={editForm.operator}
            onChange={(e) => onEditFormChange('operator', e.target.value)}
            className={deepInputClass}
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-blue-700 mb-1">生产计划批次号</Label>
          <Input
            type="text"
            value={editForm.productionBatchCode}
            onChange={(e) => onEditFormChange('productionBatchCode', e.target.value)}
            className={deepInputClass}
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-blue-700 mb-1">执行状态</Label>
          <Select
            value={editForm.executeStatus}
            onValueChange={(v) => onEditFormChange('executeStatus', v)}
          >
            <SelectTrigger className={deepInputClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="待出库">待出库</SelectItem>
              <SelectItem value="部分出库">部分出库</SelectItem>
              <SelectItem value="已出库">已出库</SelectItem>
              <SelectItem value="已取消">已取消</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium text-gray-700">物料明细</Label>
          <Button
            size="sm"
            onClick={onAddMaterial}
          >
            <Plus className="w-4 h-4" />
            添加物料
          </Button>
        </div>
        {editForm.materials.length > 0 && (
          <Table className="w-full border border-gray-200 rounded-lg overflow-hidden">
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">来源领料单号</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料编码</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料名称</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">规格</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">单位</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">申请数量</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">实际库存</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">本次实发</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">单价(元)</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">小计(元)</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">仓库货位</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">备注</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-200">
              {editForm.materials.map((material, idx) => {
                const subtotal = (material.requestedQuantity || 0) * (material.unitPrice || 0);
                const isQuantityDifferent = material.actualQuantity < material.requestedQuantity;
                return (
                  <TableRow key={idx} className={isQuantityDifferent ? 'bg-amber-50' : ''}>
                    <TableCell className="px-3 py-2">
                      <Input
                        type="text"
                        value={material.applicationCode || ''}
                        onChange={(e) => onMaterialChange(idx, 'applicationCode', e.target.value)}
                        className="h-8 px-2 text-xs font-mono bg-gray-50"
                        readOnly
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Input
                        type="text"
                        value={material.materialCode}
                        onChange={(e) => onMaterialChange(idx, 'materialCode', e.target.value)}
                        className="h-8 px-2 text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <MaterialAutocomplete
                        value={material.materialName}
                        onChange={(v) => onMaterialChange(idx, 'materialName', v)}
                        onSelect={(m) => {
                          onMaterialChange(idx, 'materialCode', m.code);
                          onMaterialChange(idx, 'spec', m.specification);
                          onMaterialChange(idx, 'unit', m.unit);
                          onMaterialChange(idx, 'stockQuantity', m.quantity);
                          onMaterialChange(idx, 'unitPrice', Number(m.price) || 0);
                          onMaterialChange(idx, 'warehousePosition', m.location);
                          // 不覆盖：applicationCode（只读）/ requestedQuantity（申请量）/ actualQuantity（实发量，业务人员手动填）
                        }}
                        placeholder="输入物料名称搜索"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Input
                        type="text"
                        value={material.spec}
                        onChange={(e) => onMaterialChange(idx, 'spec', e.target.value)}
                        className="h-8 px-2 text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Input
                        type="text"
                        value={material.unit}
                        onChange={(e) => onMaterialChange(idx, 'unit', e.target.value)}
                        className="h-8 px-2 text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Input
                        type="number"
                        value={material.requestedQuantity}
                        onChange={(e) => onMaterialChange(idx, 'requestedQuantity', Number(e.target.value))}
                        className="h-8 px-2 text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Input
                        type="number"
                        value={material.stockQuantity}
                        onChange={(e) => onMaterialChange(idx, 'stockQuantity', Number(e.target.value))}
                        className="h-8 px-2 text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Input
                        type="number"
                        value={material.actualQuantity}
                        onChange={(e) => onMaterialChange(idx, 'actualQuantity', Number(e.target.value))}
                        className={`h-8 px-2 text-xs ${isQuantityDifferent ? 'border-amber-500 text-amber-600' : ''}`}
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Input
                        type="number"
                        value={material.unitPrice || ''}
                        onChange={(e) => onMaterialChange(idx, 'unitPrice', Number(e.target.value))}
                        className="h-8 px-2 text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700 bg-gray-50">
                      {subtotal.toFixed(2)}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Input
                        type="text"
                        value={material.warehousePosition || ''}
                        onChange={(e) => onMaterialChange(idx, 'warehousePosition', e.target.value)}
                        className="h-8 px-2 text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Input
                        type="text"
                        value={material.remark}
                        onChange={(e) => onMaterialChange(idx, 'remark', e.target.value)}
                        className="h-8 px-2 text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveMaterial(idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button onClick={onSave}>
          保存
        </Button>
      </div>
    </UnifiedModal>
  );
};

export default ExecuteEditModal;
