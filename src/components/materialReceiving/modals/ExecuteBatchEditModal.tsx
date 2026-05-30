import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { NumberInput } from '@/components/ui/NumberInput';
import { DatePicker } from '@/components/ui/DatePicker';
import type { MaterialExecuteRecord, ExecuteMaterialItem } from '../../../types/materialReceiving';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface ExecuteBatchEditModalProps {
  show: boolean;
  selectedRows: number[];
  batchEditedRecords: Record<number, MaterialExecuteRecord>;
  currentBatchEditIndex: number;
  recordsList: MaterialExecuteRecord[];
  onClose: () => void;
  onRecordChange: (index: number) => void;
  onFieldChange: (recordId: number, field: string, value: any) => void;
  onMaterialChange: (recordId: number, materialIndex: number, field: string, value: any) => void;
  onMaterialDelete: (recordId: number, materialIndex: number) => void;
  onSaveAll: () => void;
}

export const ExecuteBatchEditModal: React.FC<ExecuteBatchEditModalProps> = ({
  show,
  selectedRows,
  batchEditedRecords,
  currentBatchEditIndex,
  recordsList,
  onClose,
  onRecordChange,
  onFieldChange,
  onMaterialChange,
  onMaterialDelete,
  onSaveAll,
}) => {
  if (!show) return null;

  const currentRecordId = selectedRows[currentBatchEditIndex];
  const currentRecord = recordsList.find(r => r.id === currentRecordId);
  const currentEditedData = batchEditedRecords[currentRecordId] || currentRecord || {} as MaterialExecuteRecord;
  const editedCount = Object.keys(batchEditedRecords).length;

  // 仓库选项
  const warehouseOptions = ['仓库A区', '仓库B区', '仓库C区', '仓库D区', '仓库E区'];
  // 执行状态选项
  const statusOptions = ['待出库', '部分出库', '已出库', '已取消'];

  return (
    <UnifiedModal
      isOpen={show}
      onClose={onClose}
      title="批量编辑领料出库记录"
      size="xxl"
      showFooter={true}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button variant="blue" onClick={onSaveAll}>
            保存全部
          </Button>
        </div>
      }
    >
      <div className="p-6">
        {/* 提示信息 */}
        <div className="bg-blue-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            已选择 <strong>{selectedRows.length}</strong> 条领料出库记录进行批量编辑，已编辑 <strong>{editedCount}</strong> 条
          </p>
        </div>

        {/* 领料单选择下拉 */}
        <div className="mb-4">
          <Label className="block text-sm font-medium text-gray-900 mb-1">选择领料单</Label>
          <Select
            value={String(currentRecordId || '')}
            onValueChange={(val) => {
              const idx = selectedRows.indexOf(Number(val));
              onRecordChange(idx >= 0 ? idx : 0);
            }}
          >
            <SelectTrigger className={deepInputClass}>
              <SelectValue placeholder="请选择领料单" />
            </SelectTrigger>
            <SelectContent>
              {recordsList.map((record) => (
                <SelectItem key={record.id} value={String(record.id)}>
                  {record.code} ({record.applicant}) {batchEditedRecords[record.id] ? '✅ 已编辑' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 编辑表单 - 3列布局 */}
        <div className="grid grid-cols-3 gap-4">
          {/* 领料单号 - 只读 */}
          <div className="bg-gray-100 rounded-lg p-3">
            <Label className="block text-xs font-medium text-gray-500 mb-1">领料单号</Label>
            <div className="text-sm font-medium text-gray-900">{currentEditedData.code}</div>
          </div>
          {/* 日期 */}
          <div>
            <Label className="block text-xs font-medium text-gray-900 mb-1">日期</Label>
            <DatePicker
              selected={currentEditedData.date ? new Date(currentEditedData.date) : undefined}
              onChange={(date) => {
                const dateStr = date.toISOString().slice(0, 10);
                onFieldChange(currentRecordId, 'date', dateStr);
              }}
              placeholder="选择日期"
            />
          </div>
          {/* 申请人 */}
          <div>
            <Label className="block text-xs font-medium text-gray-900 mb-1">申请人</Label>
            <Input
              type="text"
              value={currentEditedData.applicant || ''}
              onChange={(e) => onFieldChange(currentRecordId, 'applicant', e.target.value)}
              className={deepInputClass}
            />
          </div>
          {/* 仓库地点 */}
          <div>
            <Label className="block text-xs font-medium text-gray-900 mb-1">仓库地点</Label>
            <Select
              value={currentEditedData.warehouseLocation || 'none'}
              onValueChange={(val) => onFieldChange(currentRecordId, 'warehouseLocation', val === 'none' ? '' : val)}
            >
              <SelectTrigger className={deepInputClass}>
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">请选择</SelectItem>
                {warehouseOptions.map(w => (
                  <SelectItem key={w} value={w}>{w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* 生产批次号 */}
          <div>
            <Label className="block text-xs font-medium text-gray-900 mb-1">生产批次号</Label>
            <Input
              type="text"
              value={currentEditedData.productionBatchCode || ''}
              onChange={(e) => onFieldChange(currentRecordId, 'productionBatchCode', e.target.value)}
              className={deepInputClass}
            />
          </div>
          {/* 执行状态 */}
          <div>
            <Label className="block text-xs font-medium text-gray-900 mb-1">执行状态</Label>
            <Select
              value={currentEditedData.executeStatus || 'none'}
              onValueChange={(val) => onFieldChange(currentRecordId, 'executeStatus', val === 'none' ? '' : val)}
            >
              <SelectTrigger className={deepInputClass}>
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">请选择</SelectItem>
                {statusOptions.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 物料明细表格 */}
        {currentEditedData.materials && currentEditedData.materials.length > 0 && (
          <div className="mt-6">
            <Label className="block text-sm font-medium text-gray-700 mb-2">物料明细</Label>
            <ExecuteMaterialEditTable
              materials={currentEditedData.materials}
              onMaterialChange={(idx, field, value) => onMaterialChange(currentRecordId, idx, field, value)}
              onMaterialDelete={(idx) => onMaterialDelete(currentRecordId, idx)}
            />
          </div>
        )}

        {/* 导航按钮 */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => onRecordChange(Math.max(0, currentBatchEditIndex - 1))}
            disabled={currentBatchEditIndex === 0}
          >
            上一条
          </Button>
          <Button
            variant="secondary"
            onClick={() => onRecordChange(Math.min(selectedRows.length - 1, currentBatchEditIndex + 1))}
            disabled={currentBatchEditIndex >= selectedRows.length - 1}
          >
            下一条
          </Button>
        </div>
      </div>
    </UnifiedModal>
  );
};

// 出库物料编辑表格子组件 - 带横向滚动和删除功能
interface ExecuteMaterialEditTableProps {
  materials: ExecuteMaterialItem[];
  onMaterialChange: (index: number, field: string, value: any) => void;
  onMaterialDelete: (index: number) => void;
}

const ExecuteMaterialEditTable: React.FC<ExecuteMaterialEditTableProps> = ({ materials, onMaterialChange, onMaterialDelete }) => {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* 横向滚动容器 */}
      <div className="overflow-x-auto">
        <Table className="w-full text-sm min-w-[1200px]">
          <TableHeader className="bg-blue-50">
            <TableRow>
              <TableHead className="px-2 py-2 text-left text-sm font-semibold text-blue-800 w-10">操作</TableHead>
              <TableHead className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料编码</TableHead>
              <TableHead className="px-3 py-2 text-left text-sm font-semibold text-blue-800">来源领料单号</TableHead>
              <TableHead className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料名称</TableHead>
              <TableHead className="px-3 py-2 text-left text-sm font-semibold text-blue-800">规格</TableHead>
              <TableHead className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单位</TableHead>
              <TableHead className="px-3 py-2 text-left text-sm font-semibold text-blue-800">申请数量</TableHead>
              <TableHead className="px-3 py-2 text-left text-sm font-semibold text-blue-800">实际库存</TableHead>
              <TableHead className="px-3 py-2 text-left text-sm font-semibold text-blue-800">本次实发</TableHead>
              <TableHead className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单价(元)</TableHead>
              <TableHead className="px-3 py-2 text-left text-sm font-semibold text-blue-800">仓库货位</TableHead>
              <TableHead className="px-3 py-2 text-left text-sm font-semibold text-blue-800">备注</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-200">
            {materials.map((material, idx) => {
              const subtotal = (material.requestedQuantity || 0) * (material.unitPrice || 0);
              const isQuantityDifferent = material.actualQuantity < material.requestedQuantity;
              return (
                <TableRow key={idx} className={`hover:bg-blue-50 ${isQuantityDifferent ? 'bg-amber-50' : ''}`}>
                  {/* 删除按钮 */}
                  <TableCell className="px-2 py-2 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onMaterialDelete(idx)}
                      title="删除此物料"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <Input
                      type="text"
                      value={material.materialCode || ''}
                      onChange={(e) => onMaterialChange(idx, 'materialCode', e.target.value)}
                      className="w-full h-8 px-2 border border-gray-200 rounded text-sm font-mono focus:outline-none focus:border-blue-500"
                    />
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm text-blue-800 font-mono">{material.applicationCode}</TableCell>
                  <TableCell className="px-3 py-2 text-sm text-blue-800">{material.materialName}</TableCell>
                  <TableCell className="px-3 py-2 text-sm text-blue-800">{material.spec}</TableCell>
                  <TableCell className="px-3 py-2 text-sm text-blue-800">{material.unit}</TableCell>
                  <TableCell className="px-3 py-2 text-sm text-blue-800">{material.requestedQuantity}</TableCell>
                  <TableCell className="px-3 py-2 text-sm">
                    <span className={material.stockQuantity < material.requestedQuantity ? 'text-red-600 font-medium' : 'text-green-600'}>
                      {material.stockQuantity}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm">
                    <NumberInput
                      value={material.actualQuantity}
                      onChange={(val) => onMaterialChange(idx, 'actualQuantity', parseFloat(val) || 0)}
                      decimals={2}
                      className={`h-8 px-2 ${isQuantityDifferent ? 'border-amber-500 text-amber-600' : ''}`}
                    />
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <NumberInput
                      value={material.unitPrice || ''}
                      onChange={(val) => onMaterialChange(idx, 'unitPrice', parseFloat(val) || 0)}
                      decimals={2}
                      className="h-8 px-2"
                    />
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <Input
                      type="text"
                      value={material.warehousePosition || ''}
                      onChange={(e) => onMaterialChange(idx, 'warehousePosition', e.target.value)}
                      className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <Input
                      type="text"
                      value={material.remark || ''}
                      onChange={(e) => onMaterialChange(idx, 'remark', e.target.value)}
                      className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ExecuteBatchEditModal;
