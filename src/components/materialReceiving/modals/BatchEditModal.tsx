import React from 'react';
import { Trash2, ChevronDown } from 'lucide-react';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/DatePicker';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

// 类型定义
interface MaterialItem {
  materialCode: string;
  materialName: string;
  spec: string;
  unit: string;
  requestedQuantity: number;
  stockQuantity: number;
  unitPrice: number;
  warehousePosition: string;
  remark?: string;
}

interface RecordType {
  id: number;
  code: string;
  date: string;
  applicant: string;
  warehouseLocation: string;
  reviewer: string;
  productionBatchCode: string;
  status: string;
  materials: MaterialItem[];
}

interface BatchEditModalProps {
  isOpen: boolean;
  selectedRows: number[];
  batchEditedRecords: Record<number, RecordType>;
  currentBatchEditIndex: number;
  recordsList: RecordType[];
  onClose: () => void;
  onRecordChange: (index: number) => void;
  onFieldChange: (recordId: number, field: string, value: any) => void;
  onMaterialChange: (recordId: number, materialIndex: number, field: string, value: any) => void;
  onMaterialDelete: (recordId: number, materialIndex: number) => void;
  onNextRecord: () => void;
  onVoidApply: () => void;
  onSaveAll: () => void;
}

export const BatchEditModal: React.FC<BatchEditModalProps> = ({
  isOpen,
  selectedRows,
  batchEditedRecords = {},
  currentBatchEditIndex = 0,
  recordsList = [],
  onClose,
  onRecordChange = () => {},
  onFieldChange = () => {},
  onMaterialChange = () => {},
  onMaterialDelete = () => {},
  onNextRecord = () => {},
  onVoidApply = () => {},
  onSaveAll = () => {},
}) => {
  const currentRecordId = selectedRows?.[currentBatchEditIndex];
  const currentRecord = recordsList?.find(r => r.id === currentRecordId);
  const currentEditedData = batchEditedRecords[currentRecordId] || currentRecord || {};
  const editedCount = Object.keys(batchEditedRecords).length;
  const currentRecordData = currentEditedData as RecordType;

  // 仓库选项
  const warehouseOptions = ['仓库A区', '仓库B区', '仓库C区', '仓库D区', '仓库E区'];
  // 状态选项
  const statusOptions = ['待审批', '已审批', '已拒绝', '已取消'];

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="批量编辑领料记录"
      size="xxl"
      showFooter={false}
    >
      {/* 提示信息 */}
      <div className="bg-blue-50 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-800">
          已选择 <strong>{selectedRows.length}</strong> 条领料记录进行批量编辑，已编辑 <strong>{editedCount}</strong> 条
        </p>
      </div>

      {/* 领料单选择下拉 + 领料单号 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="col-span-2">
          <Label className="block text-sm font-medium text-gray-900 mb-1">选择领料单</Label>
          <div className="relative">
            <Select
              value={String(currentRecordId || '')}
              onValueChange={(v) => {
                const idx = selectedRows.indexOf(Number(v));
                onRecordChange(idx >= 0 ? idx : 0);
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {recordsList.map((record) => (
                  <SelectItem key={record.id} value={String(record.id)}>
                    {record.code} ({record.applicant}){batchEditedRecords[record.id] ? ' ✅已编辑' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* 领料单号 - 只读 */}
        <div className="bg-gray-50 rounded-lg p-2">
          <Label className="block text-xs font-medium text-gray-500 mb-1">领料单号</Label>
          <div className="text-sm font-medium text-gray-900">{currentEditedData.code}</div>
        </div>
      </div>

      {/* 编辑表单 - 3列布局 */}
      <div className="grid grid-cols-3 gap-4">
        {/* 日期 */}
        <div>
          <Label className="block text-xs font-medium text-gray-900 mb-1">日期</Label>
          <DatePicker
            selected={currentEditedData.date ? new Date(currentEditedData.date) : undefined}
            onChange={(date) => onFieldChange(currentRecordId, 'date', date.toISOString().slice(0, 10))}
            placeholder="选择日期"
          />
        </div>
        {/* 申领人 */}
        <div>
          <Label className="block text-xs font-medium text-gray-900 mb-1">申领人</Label>
          <Input
            type="text"
            value={currentEditedData.applicant || ''}
            onChange={(e) => onFieldChange(currentRecordId, 'applicant', e.target.value)}
            className="h-10"
          />
        </div>
        {/* 仓库地点 */}
        <div>
          <Label className="block text-xs font-medium text-gray-900 mb-1">仓库地点</Label>
          <Select
            value={currentEditedData.warehouseLocation || 'none'}
            onValueChange={(v) => onFieldChange(currentRecordId, 'warehouseLocation', v === 'none' ? '' : v)}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
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
            className="h-10"
          />
        </div>
        {/* 状态 */}
        <div>
          <Label className="block text-xs font-medium text-gray-900 mb-1">状态</Label>
          <Select
            value={currentEditedData.status || 'none'}
            onValueChange={(v) => onFieldChange(currentRecordId, 'status', v === 'none' ? '' : v)}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">请选择</SelectItem>
              {statusOptions.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* 审核人 */}
        <div>
          <Label className="block text-xs font-medium text-gray-900 mb-1">审核人</Label>
          <Input
            type="text"
            value={currentEditedData.reviewer || ''}
            onChange={(e) => onFieldChange(currentRecordId, 'reviewer', e.target.value)}
            className="h-10"
          />
        </div>
      </div>

      {/* 物料明细表格 - 带横向滚动 */}
      <MaterialEditTable
        materials={currentRecordData.materials || []}
        onMaterialChange={(idx, field, value) => onMaterialChange(currentRecordId, idx, field, value)}
        onMaterialDelete={(idx) => onMaterialDelete(currentRecordId, idx)}
      />

      {/* 操作按钮 */}
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onNextRecord} className="whitespace-nowrap">
          确认 {currentBatchEditIndex + 1 < selectedRows.length ? '(下一个)' : '(已最后一个)'}
        </Button>
        <Button onClick={onSaveAll} className="whitespace-nowrap">
          保存全部 ({editedCount} 个)
        </Button>
      </div>
    </UnifiedModal>
  );
};

// 物料编辑表格子组件 - 带横向滚动和删除功能
interface MaterialEditTableProps {
  materials: MaterialItem[];
  onMaterialChange: (index: number, field: string, value: any) => void;
  onMaterialDelete: (index: number) => void;
}

const MaterialEditTable: React.FC<MaterialEditTableProps> = ({ materials, onMaterialChange, onMaterialDelete }) => {
  return (
    <div className="mt-6">
      <h4 className="text-sm font-bold text-gray-700 mb-2">物料明细</h4>
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        {/* 横向滚动容器 */}
        <div className="overflow-x-auto">
          <Table className="w-full text-sm min-w-[1200px]">
            <TableHeader className="bg-blue-600">
              <TableRow>
                <TableHead className="px-2 py-2 text-left text-sm font-semibold text-white w-10 whitespace-nowrap">操作</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">物料编码</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">物料名称</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">规格</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">单位</TableHead>
                <TableHead className="px-3 py-2 text-right text-sm font-semibold text-white">申请数量</TableHead>
                <TableHead className="px-3 py-2 text-right text-sm font-semibold text-white">当前库存</TableHead>
                <TableHead className="px-3 py-2 text-right text-sm font-semibold text-white">单价(元)</TableHead>
                <TableHead className="px-3 py-2 text-right text-sm font-semibold text-white whitespace-nowrap">小计(元)</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">仓库货位</TableHead>
                <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">备注</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-300">
              {materials.map((mat, idx) => {
                const subtotal = (mat.requestedQuantity || 0) * (mat.unitPrice || 0);
                const isStockWarning = (mat.requestedQuantity || 0) > (mat.stockQuantity || 0);
                return (
                  <TableRow key={idx}>
                    {/* 删除按钮 */}
                    <TableCell className="px-2 py-2 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onMaterialDelete(idx)}
                        className="text-red-500 hover:bg-red-50"
                        title="删除此物料"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Input
                        type="text"
                        value={mat.materialCode || ''}
                        onChange={(e) => onMaterialChange(idx, 'materialCode', e.target.value)}
                        className="w-24 h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Input
                        type="text"
                        value={mat.materialName || ''}
                        onChange={(e) => onMaterialChange(idx, 'materialName', e.target.value)}
                        className="w-24 h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Input
                        type="text"
                        value={mat.spec || ''}
                        onChange={(e) => onMaterialChange(idx, 'spec', e.target.value)}
                        className="w-20 h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Input
                        type="text"
                        value={mat.unit || ''}
                        onChange={(e) => onMaterialChange(idx, 'unit', e.target.value)}
                        className="w-16 h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Input
                        type="number"
                        min="0"
                        value={mat.requestedQuantity || 0}
                        onChange={(e) => onMaterialChange(idx, 'requestedQuantity', Number(e.target.value))}
                        className={`w-16 h-8 text-right text-xs ${isStockWarning ? 'border-red-500 text-red-600' : ''}`}
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Input
                        type="number"
                        min="0"
                        value={mat.stockQuantity || 0}
                        onChange={(e) => onMaterialChange(idx, 'stockQuantity', Number(e.target.value))}
                        className="w-16 h-8 text-right text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={mat.unitPrice ?? ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const rounded = Math.round(val * 100) / 100;
                          onMaterialChange(idx, 'unitPrice', rounded);
                        }}
                        className="w-20 h-8 text-right text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right text-xs text-blue-700 bg-gray-50">
                      {subtotal.toFixed(2)}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Input
                        type="text"
                        value={mat.warehousePosition || ''}
                        onChange={(e) => onMaterialChange(idx, 'warehousePosition', e.target.value)}
                        className="w-24 h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Input
                        type="text"
                        value={mat.remark || ''}
                        onChange={(e) => onMaterialChange(idx, 'remark', e.target.value)}
                        className="w-24 h-8 text-xs"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!materials || materials.length === 0) && (
                <TableRow>
                  <TableCell colSpan={11} className="px-3 py-4 text-center text-gray-500">暂无物料明细</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default BatchEditModal;
