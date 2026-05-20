// ExecuteBatchEditModal 组件
// 批量编辑出库弹窗 — 参照领料申请单 BatchEditModal，支持记录选择、字段编辑、物料表格编辑
import { useState, useMemo, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import type { MaterialExecuteRecord, ExecuteMaterialItem } from '@/types/materialReceiving';

interface ExecuteBatchEditModalProps {
  show: boolean;
  selectedRows: (string | number)[];
  recordsList: MaterialExecuteRecord[];
  onClose: () => void;
  /** 保存全部回调，传入编辑后的记录map，由调用方负责持久化到数据库 */
  onSaveAll: (editedRecords: Record<string | number, Partial<MaterialExecuteRecord>>) => void;
}

export function ExecuteBatchEditModal({
  show,
  selectedRows,
  recordsList,
  onClose,
  onSaveAll,
}: ExecuteBatchEditModalProps) {
  // 内部管理批量编辑状态
  const [batchEditedRecords, setBatchEditedRecords] = useState<Record<string | number, Partial<MaterialExecuteRecord>>>({});
  const [currentRecordId, setCurrentRecordId] = useState<string | number>(selectedRows[0] || '');

  // 当前编辑的记录（优先取编辑过的数据）
  const currentEditedData = useMemo(() => {
    const original = recordsList.find(r => r.id === currentRecordId);
    if (!original) return null;
    const edits = batchEditedRecords[currentRecordId] || {};
    return { ...original, ...edits, materials: edits.materials || original.materials };
  }, [currentRecordId, recordsList, batchEditedRecords]);

  const editedCount = Object.keys(batchEditedRecords).length;

  // 修改主记录字段
  const handleFieldChange = useCallback((field: string, value: string) => {
    setBatchEditedRecords(prev => ({
      ...prev,
      [currentRecordId]: { ...(prev[currentRecordId] || {}), [field]: value },
    }));
  }, [currentRecordId]);

  // 修改物料字段
  const handleMaterialChange = useCallback((materialIndex: number, field: string, value: string | number) => {
    setBatchEditedRecords(prev => {
      const record = prev[currentRecordId] || {};
      const materials = [...(record.materials || recordsList.find(r => r.id === currentRecordId)?.materials || [])];
      if (materials[materialIndex]) {
        materials[materialIndex] = { ...materials[materialIndex], [field]: value };
      }
      return { ...prev, [currentRecordId]: { ...record, materials } };
    });
  }, [currentRecordId, recordsList]);

  // 删除物料行
  const handleMaterialDelete = useCallback((materialIndex: number) => {
    setBatchEditedRecords(prev => {
      const record = prev[currentRecordId] || {};
      const materials = [...(record.materials || recordsList.find(r => r.id === currentRecordId)?.materials || [])];
      materials.splice(materialIndex, 1);
      return { ...prev, [currentRecordId]: { ...record, materials } };
    });
  }, [currentRecordId, recordsList]);

  if (!show) return null;

  const warehouseOptions = ['仓库A区', '仓库B区', '仓库C区', '仓库D区', '仓库E区'];
  const statusOptions = ['已出库', '部分出库', '待出库', '已取消'];

  return (
    <UnifiedModal
      isOpen={show}
      onClose={onClose}
      title="批量编辑出库单"
      size="xxl"
      showFooter={false}
    >
      {/* 提示信息 */}
      <div className="bg-blue-50 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-800">
          已选择 <strong>{selectedRows.length}</strong> 条出库记录进行批量编辑，已编辑 <strong>{editedCount}</strong> 条
        </p>
      </div>

      {/* 出库单选择下拉 + 出库单号 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="col-span-2">
          <Label className="block text-sm font-medium text-gray-900 mb-1">选择出库单</Label>
          <Select
            value={String(currentRecordId)}
            onValueChange={(val) => setCurrentRecordId(val)}
          >
            <SelectTrigger className="w-full h-10 px-3 pr-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500">
              <SelectValue placeholder="请选择出库单" />
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
        <div className="bg-gray-50 rounded-lg p-2">
          <Label className="block text-xs font-medium text-gray-500 mb-1">出库单号</Label>
          <div className="text-sm font-medium text-gray-900">{currentEditedData?.code || '-'}</div>
        </div>
      </div>

      {/* 编辑表单 - 3列布局 */}
      {currentEditedData && (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="block text-xs font-medium text-gray-900 mb-1">日期</Label>
            <Input
              type="date"
              value={currentEditedData.date || ''}
              onChange={(e) => handleFieldChange('date', e.target.value)}
              className="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <Label className="block text-xs font-medium text-gray-900 mb-1">申领人</Label>
            <Input
              type="text"
              value={currentEditedData.applicant || ''}
              onChange={(e) => handleFieldChange('applicant', e.target.value)}
              className="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <Label className="block text-xs font-medium text-gray-900 mb-1">库存地点</Label>
            <Select
              value={currentEditedData.warehouseLocation || 'none'}
              onValueChange={(val) => handleFieldChange('warehouseLocation', val === 'none' ? '' : val)}
            >
              <SelectTrigger className="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500">
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
          <div>
            <Label className="block text-xs font-medium text-gray-900 mb-1">审核人</Label>
            <Input
              type="text"
              value={currentEditedData.reviewer || ''}
              onChange={(e) => handleFieldChange('reviewer', e.target.value)}
              className="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <Label className="block text-xs font-medium text-gray-900 mb-1">操作人</Label>
            <Input
              type="text"
              value={currentEditedData.operator || ''}
              onChange={(e) => handleFieldChange('operator', e.target.value)}
              className="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <Label className="block text-xs font-medium text-gray-900 mb-1">生产批次号</Label>
            <Input
              type="text"
              value={currentEditedData.productionBatchCode || ''}
              onChange={(e) => handleFieldChange('productionBatchCode', e.target.value)}
              className="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <Label className="block text-xs font-medium text-gray-900 mb-1">执行状态</Label>
            <Select
              value={currentEditedData.executeStatus || 'none'}
              onValueChange={(val) => handleFieldChange('executeStatus', val === 'none' ? '' : val)}
            >
              <SelectTrigger className="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500">
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
      )}

      {/* 物料明细表格 */}
      <MaterialEditTable
        materials={currentEditedData?.materials || []}
        onMaterialChange={handleMaterialChange}
        onMaterialDelete={handleMaterialDelete}
      />

      {/* 操作按钮 */}
      <div className="flex justify-end gap-3 mt-6">
        {selectedRows.length > 1 && (
          <Button
            variant="outline"
            onClick={() => {
              const currentIdx = selectedRows.indexOf(currentRecordId);
              const nextIdx = (currentIdx + 1) % selectedRows.length;
              setCurrentRecordId(selectedRows[nextIdx]);
            }}
            className="whitespace-nowrap"
          >
            下一个
          </Button>
        )}
        <Button variant="secondary" onClick={onClose} className="whitespace-nowrap">
          取消
        </Button>
        <Button
          onClick={() => onSaveAll(batchEditedRecords)}
          disabled={editedCount === 0}
          className="whitespace-nowrap"
        >
          保存全部 ({editedCount} 条)
        </Button>
      </div>
    </UnifiedModal>
  );
}

// ==================== 物料编辑表格子组件 ====================

interface MaterialEditTableProps {
  materials: ExecuteMaterialItem[];
  onMaterialChange: (index: number, field: string, value: string | number) => void;
  onMaterialDelete: (index: number) => void;
}

const MaterialEditTable: React.FC<MaterialEditTableProps> = ({ materials, onMaterialChange, onMaterialDelete }) => {
  return (
    <div className="mt-6">
      <h4 className="text-sm font-bold text-gray-700 mb-2">物料明细</h4>
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1200px]">
            <thead className="bg-blue-600">
              <tr>
                <th className="px-2 py-2 text-left text-sm font-semibold text-white w-10 whitespace-nowrap">操作</th>
                <th className="px-2 py-2 text-left text-sm font-semibold text-white">来源单号</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-white">物料编码</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-white">物料名称</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-white">批次号</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-white">规格</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-white">单位</th>
                <th className="px-3 py-2 text-right text-sm font-semibold text-white">申领数量</th>
                <th className="px-3 py-2 text-right text-sm font-semibold text-white">实际库存</th>
                <th className="px-3 py-2 text-right text-sm font-semibold text-white">本次实发</th>
                <th className="px-3 py-2 text-right text-sm font-semibold text-white">单价(元)</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-white">仓库货位</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-white">备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {materials.map((mat, idx) => {
                const diff = (mat.requestedQuantity || 0) - (mat.actualQuantity || 0);
                return (
                  <tr key={idx} className={diff > 0 ? 'bg-amber-50' : ''}>
                    <td className="px-2 py-2 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onMaterialDelete(idx)}
                        className="text-red-500 hover:bg-red-50"
                        title="删除此物料"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="text"
                        value={mat.applicationCode || ''}
                        onChange={(e) => onMaterialChange(idx, 'applicationCode', e.target.value)}
                        className="w-28 h-8 px-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="text"
                        value={mat.materialCode || ''}
                        onChange={(e) => onMaterialChange(idx, 'materialCode', e.target.value)}
                        className="w-24 h-8 px-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="text"
                        value={mat.materialName || ''}
                        onChange={(e) => onMaterialChange(idx, 'materialName', e.target.value)}
                        className="w-24 h-8 px-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="text"
                        value={mat.batchNo || ''}
                        onChange={(e) => onMaterialChange(idx, 'batchNo', e.target.value)}
                        className="w-20 h-8 px-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="text"
                        value={mat.spec || ''}
                        onChange={(e) => onMaterialChange(idx, 'spec', e.target.value)}
                        className="w-20 h-8 px-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="text"
                        value={mat.unit || ''}
                        onChange={(e) => onMaterialChange(idx, 'unit', e.target.value)}
                        className="w-16 h-8 px-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min="0"
                        value={mat.requestedQuantity || 0}
                        onChange={(e) => onMaterialChange(idx, 'requestedQuantity', Number(e.target.value))}
                        className="w-16 h-8 px-2 border border-gray-300 rounded text-right text-xs focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min="0"
                        value={mat.stockQuantity || 0}
                        onChange={(e) => onMaterialChange(idx, 'stockQuantity', Number(e.target.value))}
                        className="w-16 h-8 px-2 border border-gray-300 rounded text-right text-xs focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min="0"
                        value={mat.actualQuantity || 0}
                        onChange={(e) => onMaterialChange(idx, 'actualQuantity', Number(e.target.value))}
                        className={`w-16 h-8 px-2 border rounded text-right text-xs focus:outline-none focus:border-blue-500 ${diff > 0 ? 'border-amber-400' : 'border-emerald-400'}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={mat.unitPrice ?? ''}
                        onChange={(e) => onMaterialChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-20 h-8 px-2 border border-gray-300 rounded text-right text-xs focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="text"
                        value={mat.warehousePosition || ''}
                        onChange={(e) => onMaterialChange(idx, 'warehousePosition', e.target.value)}
                        className="w-24 h-8 px-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="text"
                        value={mat.remark || ''}
                        onChange={(e) => onMaterialChange(idx, 'remark', e.target.value)}
                        className="w-24 h-8 px-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                      />
                    </td>
                  </tr>
                );
              })}
              {(!materials || materials.length === 0) && (
                <tr>
                  <td colSpan={13} className="px-3 py-4 text-center text-gray-500">暂无物料明细</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
