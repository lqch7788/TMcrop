import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { MaterialAutocomplete } from '@/components/common/MaterialAutocomplete';
import type { MaterialReceivingRecord, MaterialItem, MaterialRequestFormState } from '../../../types/materialReceiving';
import { UserSelect } from '../../common/settings/UserSelect';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface EditModalProps {
  isOpen: boolean;
  record: MaterialReceivingRecord;
  editForm: MaterialRequestFormState;
  onChange: (field: string, value: string | number | boolean | MaterialItem[]) => void;
  onSave: () => void;
  onClose: () => void;
  onAddMaterial: () => void;
  onRemoveMaterial: (index: number) => void;
  onMaterialChange: (index: number, field: string, value: string | number) => void;
}

export const EditModal: React.FC<EditModalProps> = ({
  isOpen,
  record,
  editForm,
  onChange,
  onSave,
  onClose,
  onAddMaterial,
  onRemoveMaterial,
  onMaterialChange,
}) => {
  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑领料单"
      size="xl"
      showFooter={false}
    >
      <div className="grid grid-cols-2 gap-4">
        {/* 领料单号 - 只读 */}
        <div className="bg-gray-100 rounded-lg p-3">
          <Label className="block text-xs font-medium text-gray-500 mb-1">领料单号</Label>
          <div className="text-sm font-medium text-gray-900">{record.code}</div>
        </div>
        <div>
          <Label className="block text-sm font-medium text-blue-700 mb-1">申请日期</Label>
          <Input
            type="date"
            value={editForm.date}
            onChange={(e) => onChange('date', e.target.value)}
            className={deepInputClass}
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-blue-700 mb-1">申请人</Label>
          <UserSelect
            value={editForm.applicant}
            onChange={(value) => onChange('applicant', value)}
            placeholder="选择申请人"
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-blue-700 mb-1">部门</Label>
          <Select
            value={editForm.department || 'none'}
            onValueChange={(v) => onChange('department', v === 'none' ? '' : v)}
          >
            <SelectTrigger className={deepInputClass}>
              <SelectValue placeholder="请选择部门" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">请选择部门</SelectItem>
              <SelectItem value="生产部">生产部</SelectItem>
              <SelectItem value="后勤部">后勤部</SelectItem>
              <SelectItem value="设备部">设备部</SelectItem>
              <SelectItem value="技术部">技术部</SelectItem>
              <SelectItem value="采后处理部">采后处理部</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="block text-sm font-medium text-blue-700 mb-1">库存地点</Label>
          <Select
            value={editForm.warehouseLocation}
            onValueChange={(v) => onChange('warehouseLocation', v)}
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
          <Label className="block text-sm font-medium text-blue-700 mb-1">种植区域/用途</Label>
          <Input
            type="text"
            value={editForm.plantArea}
            onChange={(e) => onChange('plantArea', e.target.value)}
            placeholder="如：1号棚-叶菜区"
            className={deepInputClass}
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-blue-700 mb-1">审核人</Label>
          <UserSelect
            value={editForm.reviewer}
            onChange={(value) => onChange('reviewer', value)}
            placeholder="选择审核人"
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-blue-700 mb-1">生产计划批次号</Label>
          <Input
            type="text"
            value={editForm.productionBatchCode}
            onChange={(e) => onChange('productionBatchCode', e.target.value)}
            className={deepInputClass}
          />
        </div>
      </div>

      {/* 物料明细 */}
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
        {editForm.materials.length > 0 ? (
          <Table className="w-full border border-gray-200 rounded-lg overflow-hidden">
            <TableHeader className="bg-emerald-100">
              <TableRow>
                <TableHead className="px-2 py-2 text-left text-sm font-semibold text-gray-600">物料编码</TableHead>
                <TableHead className="px-2 py-2 text-left text-sm font-semibold text-gray-600">物料名称</TableHead>
                <TableHead className="px-2 py-2 text-left text-sm font-semibold text-gray-600">规格</TableHead>
                <TableHead className="px-2 py-2 text-left text-sm font-semibold text-gray-600">单位</TableHead>
                <TableHead className="px-2 py-2 text-left text-sm font-semibold text-gray-600">申领数量</TableHead>
                <TableHead className="px-2 py-2 text-left text-sm font-semibold text-gray-600">当前库存</TableHead>
                <TableHead className="px-2 py-2 text-left text-sm font-semibold text-gray-600">单价(元)</TableHead>
                <TableHead className="px-2 py-2 text-left text-sm font-semibold text-gray-600">小计(元)</TableHead>
                <TableHead className="px-2 py-2 text-left text-sm font-semibold text-gray-600">仓库货位</TableHead>
                <TableHead className="px-2 py-2 text-left text-sm font-semibold text-gray-600">备注</TableHead>
                <TableHead className="px-2 py-2 text-left text-sm font-semibold text-gray-600 w-12">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-200">
              {editForm.materials.map((material, idx) => {
                const subtotal = material.requestedQuantity * (material.unitPrice || 0);
                const isStockWarning = material.requestedQuantity > (material.stockQuantity || 0);
                return (
                  <TableRow key={idx}>
                    <TableCell className="px-2 py-2">
                      <Input
                        type="text"
                        value={material.materialCode}
                        onChange={(e) => onMaterialChange(idx, 'materialCode', e.target.value)}
                        className="h-8 px-2 text-xs font-mono"
                      />
                    </TableCell>
                    <TableCell className="px-2 py-2">
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
                        }}
                        placeholder="输入物料名称搜索"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      <Input
                        type="text"
                        value={material.spec}
                        onChange={(e) => onMaterialChange(idx, 'spec', e.target.value)}
                        className="h-8 px-2 text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      <Input
                        type="text"
                        value={material.unit}
                        onChange={(e) => onMaterialChange(idx, 'unit', e.target.value)}
                        className="h-8 px-2 text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      <Input
                        type="number"
                        value={material.requestedQuantity}
                        onChange={(e) => onMaterialChange(idx, 'requestedQuantity', Number(e.target.value))}
                        className={`h-8 px-2 text-xs ${isStockWarning ? 'border-red-500 text-red-600' : ''}`}
                      />
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      <Input
                        type="number"
                        value={material.stockQuantity || ''}
                        onChange={(e) => onMaterialChange(idx, 'stockQuantity', Number(e.target.value))}
                        className="h-8 px-2 text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      <Input
                        type="number"
                        value={material.unitPrice || ''}
                        onChange={(e) => onMaterialChange(idx, 'unitPrice', Number(e.target.value))}
                        className="h-8 px-2 text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-2 py-2 text-sm text-blue-700 bg-gray-50">
                      {subtotal.toFixed(2)}
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      <Input
                        type="text"
                        value={material.warehousePosition || ''}
                        onChange={(e) => onMaterialChange(idx, 'warehousePosition', e.target.value)}
                        className="h-8 px-2 text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      <Input
                        type="text"
                        value={material.remark || ''}
                        onChange={(e) => onMaterialChange(idx, 'remark', e.target.value)}
                        className="h-8 px-2 text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveMaterial(idx)}
                        className="text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-sm text-gray-500 italic border border-gray-200 rounded-lg p-4 text-center">
            暂无物料明细，请点击"添加物料"按钮添加
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          取消
        </Button>
        <Button onClick={onSave}>
          保存
        </Button>
      </div>
    </UnifiedModal>
  );
};

export default EditModal;
