import React from 'react';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import type { MaterialReceivingRecord, ExecuteMaterialItem } from '../../../types/materialReceiving';

interface ExecuteAddModalProps {
  isOpen: boolean;
  addForm: {
    code: string;
    date: string;
    applicant: string;
    warehouseLocation: string;
    reviewer: string;
    operator: string;
    productionBatchCode: string;
    materials: ExecuteMaterialItem[];
  };
  selectedApplicationCode: string;
  selectedMaterialIndices: Set<number>;
  materialActualQuantities: Record<number, number>;
  materialPool: ExecuteMaterialItem[];
  materialReceivingDetails: MaterialReceivingRecord[];
  onClose: () => void;
  onAddFormChange: (field: string, value: any) => void;
  onSelectedApplicationCodeChange: (code: string) => void;
  onSelectedMaterialIndicesChange: (indices: Set<number>) => void;
  onMaterialActualQuantitiesChange: (quantities: Record<number, number>) => void;
  onAddToMaterialPool: () => void;
  onRemoveFromMaterialPool: (index: number) => void;
  onUpdateMaterialPoolQuantity: (index: number, quantity: number) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const ExecuteAddModal: React.FC<ExecuteAddModalProps> = ({
  isOpen,
  addForm,
  selectedApplicationCode,
  selectedMaterialIndices,
  materialActualQuantities,
  materialPool,
  materialReceivingDetails,
  onClose,
  onAddFormChange,
  onSelectedApplicationCodeChange,
  onSelectedMaterialIndicesChange,
  onMaterialActualQuantitiesChange,
  onAddToMaterialPool,
  onRemoveFromMaterialPool,
  onUpdateMaterialPoolQuantity,
  onCancel,
  onSave,
}) => {
  const selectedApp = materialReceivingDetails.find(app => app.code === selectedApplicationCode);

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新增领料出库单"
      size="xl"
      showFooter={false}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-100 rounded-lg p-3">
          <Label className="block text-xs font-medium text-gray-500 mb-1">出库单号</Label>
          <div className="text-sm font-medium text-gray-900">{addForm.code || '系统自动生成'}</div>
        </div>
        <div>
          <Label className="block text-sm font-medium text-blue-700 mb-1">关联领料单号</Label>
          <Select
            value={selectedApplicationCode || 'none'}
            onValueChange={(v) => {
              const code = v === 'none' ? '' : v;
              onSelectedApplicationCodeChange(code);
              onSelectedMaterialIndicesChange(new Set());
              onMaterialActualQuantitiesChange({});
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="请选择领料单" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">请选择领料单</SelectItem>
              {materialReceivingDetails
                .filter(app => app.status === '已审批' && app.materials.length > 0)
                .map(app => (
                  <SelectItem key={app.id} value={app.code}>
                    {app.code} - {app.applicant}
                  </SelectItem>
                ))
              }
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="block text-sm font-medium text-blue-700 mb-1">申请日期</Label>
          <Input
            type="date"
            value={addForm.date}
            onChange={(e) => onAddFormChange('date', e.target.value)}
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-blue-700 mb-1">库存地点</Label>
          <Select
            value={addForm.warehouseLocation}
            onValueChange={(v) => onAddFormChange('warehouseLocation', v)}
          >
            <SelectTrigger>
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
            value={addForm.reviewer}
            onChange={(e) => onAddFormChange('reviewer', e.target.value)}
            placeholder="请输入审核人"
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-blue-700 mb-1">操作人</Label>
          <Input
            type="text"
            value={addForm.operator}
            onChange={(e) => onAddFormChange('operator', e.target.value)}
            placeholder="请输入操作人"
          />
        </div>
      </div>

      {selectedApplicationCode && selectedApp && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium text-gray-700">选择物料（勾选要出库的物料并填写实发数量）</Label>
            <Button
              size="sm"
              onClick={onAddToMaterialPool}
              disabled={selectedMaterialIndices.size === 0}
            >
              添加到物料池 ({selectedMaterialIndices.size})
            </Button>
          </div>
          <Table className="w-full border border-gray-200 rounded-lg overflow-hidden mt-2">
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600 w-10">选择</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料编码</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料名称</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">规格</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">单位</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">申请数量</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">当前库存</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">单价(元)</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">仓库货位</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">实发数量</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-200">
              {selectedApp.materials.map((material, idx) => (
                <TableRow key={idx} className={selectedMaterialIndices.has(idx) ? 'bg-emerald-50' : ''}>
                  <TableCell className="px-3 py-2">
                    <Checkbox
                      checked={selectedMaterialIndices.has(idx)}
                      onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedMaterialIndices);
                        if (checked) {
                          newSelected.add(idx);
                          onMaterialActualQuantitiesChange({
                            ...materialActualQuantities,
                            [idx]: material.requestedQuantity
                          });
                        } else {
                          newSelected.delete(idx);
                          const newQuantities = { ...materialActualQuantities };
                          delete newQuantities[idx];
                          onMaterialActualQuantitiesChange(newQuantities);
                        }
                        onSelectedMaterialIndicesChange(newSelected);
                      }}
                    />
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm text-gray-600 font-mono">{material.materialCode}</TableCell>
                  <TableCell className="px-3 py-2 text-sm text-gray-600">{material.materialName}</TableCell>
                  <TableCell className="px-3 py-2 text-sm text-gray-600">{material.spec}</TableCell>
                  <TableCell className="px-3 py-2 text-sm text-gray-600">{material.unit}</TableCell>
                  <TableCell className="px-3 py-2 text-sm text-gray-600">{material.requestedQuantity}</TableCell>
                  <TableCell className="px-3 py-2 text-sm text-gray-600">{material.stockQuantity}</TableCell>
                  <TableCell className="px-3 py-2 text-sm text-gray-600">{(material.unitPrice || 0).toFixed(2)}</TableCell>
                  <TableCell className="px-3 py-2 text-sm text-gray-600">{material.warehousePosition || '-'}</TableCell>
                  <TableCell className="px-3 py-2">
                    <Input
                      type="number"
                      min="0"
                      max={material.requestedQuantity}
                      value={materialActualQuantities[idx] ?? material.requestedQuantity}
                      onChange={(e) => {
                        onMaterialActualQuantitiesChange({
                          ...materialActualQuantities,
                          [idx]: Number(e.target.value)
                        });
                      }}
                      disabled={!selectedMaterialIndices.has(idx)}
                      className="w-20 h-8 text-sm"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {materialPool.length > 0 && (
        <div className="mt-6">
          <Label className="text-sm font-medium text-gray-700 mb-2">物料池（可修改实发数量或移除）</Label>
          <Table className="w-full border border-gray-200 rounded-lg overflow-hidden mt-2">
            <TableHeader className="bg-emerald-50">
              <TableRow>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600 w-16">操作</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">来源领料单号</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料编码</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料名称</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">规格</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">单位</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">申请数量</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">单价(元)</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">小计(元)</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">仓库货位</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-gray-600">本次实发</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-200">
              {materialPool.map((material, idx) => {
                const subtotal = (material.requestedQuantity || 0) * (material.unitPrice || 0);
                const isQuantityDifferent = material.actualQuantity < material.requestedQuantity;
                return (
                  <TableRow key={idx} className={isQuantityDifferent ? 'bg-amber-50' : ''}>
                    <TableCell className="px-3 py-2">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => onRemoveFromMaterialPool(idx)}
                        className="text-red-600 hover:text-red-800"
                      >
                        移除
                      </Button>
                    </TableCell>
                    <TableCell className="px-3 py-2 text-sm text-blue-700 font-mono">{material.applicationCode}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-600 font-mono">{material.materialCode}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-600">{material.materialName}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-600">{material.spec}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-600">{material.unit}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-600">{material.requestedQuantity}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-600">{(material.unitPrice || 0).toFixed(2)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-600">{subtotal.toFixed(2)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-600">{material.warehousePosition || '-'}</TableCell>
                    <TableCell className="px-3 py-2">
                      <Input
                        type="number"
                        min="0"
                        max={material.requestedQuantity}
                        value={material.actualQuantity}
                        onChange={(e) => onUpdateMaterialPoolQuantity(idx, Number(e.target.value))}
                        className={`w-20 h-8 text-sm ${isQuantityDifferent ? 'border-amber-500 text-amber-600' : ''}`}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 底部按钮 */}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button
          onClick={onSave}
          disabled={materialPool.length === 0}
        >
          保存
        </Button>
      </div>
    </UnifiedModal>
  );
};

export default ExecuteAddModal;
