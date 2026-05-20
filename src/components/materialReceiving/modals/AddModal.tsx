import React from 'react';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { MaterialItem, MaterialRequestFormState } from '../../../types/materialReceiving';
import { materialBaseDatabase, findMaterialByCode, findMaterialByName } from '../../../data/materialReceivingData';
import { UserSelect } from '../../common/settings/UserSelect';
import { useUserStore } from '../../../stores/useUserStore';

// 生产计划批次号选项
const PRODUCTION_BATCH_CODES = [
  'FQ2024-001', 'FQ2024-002', 'FQ2024-003', 'FQ2024-004',
  'FQ2024-005', 'FQ2024-006', 'FQ2024-007', 'FQ2024-008'
];

interface AddModalProps {
  isOpen: boolean;
  addForm: MaterialRequestFormState;
  onChange: (field: string, value: string | number | boolean | MaterialItem[]) => void;
  onSave: () => void;
  onClose: () => void;
  onAddMaterial: () => void;
  onRemoveMaterial: (index: number) => void;
  onMaterialChange: (index: number, field: string, value: string | number) => void;
  onGenerateCode: () => void;
}

export const AddModal: React.FC<AddModalProps> = ({
  isOpen,
  addForm,
  onChange,
  onSave,
  onClose,
  onAddMaterial,
  onRemoveMaterial,
  onMaterialChange,
  onGenerateCode,
}) => {
  // 获取当前登录用户（优先从Store获取）
  const storeUsers = useUserStore(state => state.users);
  const currentOperator = storeUsers[0]?.name || localStorage.getItem('username') || '当前用户';
  const isOtherBatch = addForm.productionBatchCode === '其他';

  // 物料编码或名称变化时，自动填充其他字段
  const handleMaterialCodeChange = (idx: number, value: string) => {
    onMaterialChange(idx, 'materialCode', value);
    if (value) {
      const material = findMaterialByCode(value);
      if (material) {
        onMaterialChange(idx, 'materialName', material.materialName);
        onMaterialChange(idx, 'spec', material.spec);
        onMaterialChange(idx, 'unit', material.unit);
        onMaterialChange(idx, 'category', material.category);
        onMaterialChange(idx, 'stockQuantity', material.stockQuantity);
        onMaterialChange(idx, 'unitPrice', material.unitPrice);
        onMaterialChange(idx, 'warehousePosition', material.warehousePosition);
        onMaterialChange(idx, 'remark', material.remark);
      }
    }
  };

  // 物料名称变化时，自动填充其他字段
  const handleMaterialNameChange = (idx: number, value: string) => {
    onMaterialChange(idx, 'materialName', value);
    if (value) {
      const material = findMaterialByName(value);
      if (material) {
        onMaterialChange(idx, 'materialCode', material.materialCode);
        onMaterialChange(idx, 'spec', material.spec);
        onMaterialChange(idx, 'unit', material.unit);
        onMaterialChange(idx, 'category', material.category);
        onMaterialChange(idx, 'stockQuantity', material.stockQuantity);
        onMaterialChange(idx, 'unitPrice', material.unitPrice);
        onMaterialChange(idx, 'warehousePosition', material.warehousePosition);
        onMaterialChange(idx, 'remark', material.remark);
      }
    }
  };
  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新增领料单"
      size="xxl"
      showFooter={false}
    >
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label className="block text-sm font-medium text-gray-900 mb-1">领料单号</Label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={addForm.code}
              readOnly
              placeholder="点击生成获取单号"
              className="flex-1 bg-gray-50 font-mono"
            />
            <Button
              size="sm"
              onClick={onGenerateCode}
              className="shrink-0"
              title="生成领料单号"
            >
              <RefreshCw className="w-4 h-4" />
              生成
            </Button>
          </div>
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-900 mb-1">申请日期</Label>
          <Input
            type="date"
            value={addForm.date}
            onChange={(e) => onChange('date', e.target.value)}
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-900 mb-1">操作员</Label>
          <Input
            type="text"
            value={currentOperator}
            readOnly
            className="bg-gray-100 font-medium"
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-900 mb-1">申请人</Label>
          <UserSelect
            value={addForm.applicant}
            onChange={(value) => onChange('applicant', value)}
            placeholder="选择申请人"
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-900 mb-1">部门</Label>
          <Select
            value={addForm.department || 'none'}
            onValueChange={(v) => onChange('department', v === 'none' ? '' : v)}
          >
            <SelectTrigger>
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
          <Label className="block text-sm font-medium text-gray-900 mb-1">库存地点</Label>
          <Select
            value={addForm.warehouseLocation}
            onValueChange={(v) => onChange('warehouseLocation', v)}
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
          <Label className="block text-sm font-medium text-gray-900 mb-1">种植区域/用途</Label>
          <Input
            type="text"
            value={addForm.plantArea}
            onChange={(e) => onChange('plantArea', e.target.value)}
            placeholder="如：1号棚-叶菜区"
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-900 mb-1">审核人</Label>
          <UserSelect
            value={addForm.reviewer}
            onChange={(value) => onChange('reviewer', value)}
            placeholder="选择审核人"
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-900 mb-1">生产计划批次号</Label>
          <Select
            value={addForm.productionBatchCode || 'none'}
            onValueChange={(v) => onChange('productionBatchCode', v === 'none' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="请选择生产批次" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">请选择生产批次</SelectItem>
              {PRODUCTION_BATCH_CODES.map(code => (
                <SelectItem key={code} value={code}>{code}</SelectItem>
              ))}
              <SelectItem value="其他">其他</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isOtherBatch && (
          <div className="col-span-2">
            <Label className="block text-sm font-medium text-gray-900 mb-1">其他批次备注</Label>
            <Input
              type="text"
              value={addForm.batchRemark || ''}
              onChange={(e) => onChange('batchRemark', e.target.value)}
              placeholder="请输入其他批次的具体说明"
            />
          </div>
        )}
      </div>

      {/* 物料明细 */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-bold text-gray-700">物料明细</Label>
          <Button
            size="sm"
            onClick={onAddMaterial}
          >
            <Plus className="w-4 h-4" />
            添加物料
          </Button>
        </div>
        {addForm.materials.length > 0 ? (
          <table className="w-full border border-gray-400 rounded-lg overflow-hidden">
            <thead className="bg-blue-600">
              <tr>
                <th className="px-2 py-2 text-left text-sm font-semibold text-white">物料编码</th>
                <th className="px-2 py-2 text-left text-sm font-semibold text-white">物料名称</th>
                <th className="px-2 py-2 text-left text-sm font-semibold text-white">规格</th>
                <th className="px-2 py-2 text-left text-sm font-semibold text-white">单位</th>
                <th className="px-2 py-2 text-left text-sm font-semibold text-white">申领数量</th>
                <th className="px-2 py-2 text-left text-sm font-semibold text-white">当前库存</th>
                <th className="px-2 py-2 text-left text-sm font-semibold text-white">单价(元)</th>
                <th className="px-2 py-2 text-left text-sm font-semibold text-white whitespace-nowrap">小计(元)</th>
                <th className="px-2 py-2 text-left text-sm font-semibold text-white">仓库货位</th>
                <th className="px-2 py-2 text-left text-sm font-semibold text-white">备注</th>
                <th className="px-2 py-2 text-left text-sm font-semibold text-white w-12 whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {addForm.materials.map((material, idx) => {
                const subtotal = material.requestedQuantity * (material.unitPrice || 0);
                const isStockWarning = material.requestedQuantity > (material.stockQuantity || 0);
                return (
                  <tr key={idx}>
                    <td className="px-2 py-2">
                      <Input
                        type="text"
                        value={material.materialCode}
                        onChange={(e) => handleMaterialCodeChange(idx, e.target.value)}
                        className="h-8 px-2 text-xs font-mono"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="text"
                        value={material.materialName}
                        onChange={(e) => handleMaterialNameChange(idx, e.target.value)}
                        className="h-8 px-2 text-xs"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="text"
                        value={material.spec}
                        onChange={(e) => onMaterialChange(idx, 'spec', e.target.value)}
                        className="h-8 px-2 text-xs"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="text"
                        value={material.unit}
                        onChange={(e) => onMaterialChange(idx, 'unit', e.target.value)}
                        className="h-8 px-2 text-xs"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        value={material.requestedQuantity}
                        onChange={(e) => onMaterialChange(idx, 'requestedQuantity', Number(e.target.value))}
                        className={`h-8 px-2 text-xs ${isStockWarning ? 'border-red-500 text-red-600' : ''}`}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        value={material.stockQuantity || ''}
                        onChange={(e) => onMaterialChange(idx, 'stockQuantity', Number(e.target.value))}
                        className="h-8 px-2 text-xs"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        value={material.unitPrice || ''}
                        onChange={(e) => onMaterialChange(idx, 'unitPrice', Number(e.target.value))}
                        className="h-8 px-2 text-xs"
                      />
                    </td>
                    <td className="px-2 py-2 text-sm text-blue-700 bg-gray-50 whitespace-nowrap">
                      {subtotal.toFixed(2)}
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="text"
                        value={material.warehousePosition || ''}
                        onChange={(e) => onMaterialChange(idx, 'warehousePosition', e.target.value)}
                        className="h-8 px-2 text-xs"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="text"
                        value={material.remark}
                        onChange={(e) => onMaterialChange(idx, 'remark', e.target.value)}
                        className="h-8 px-2 text-xs"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveMaterial(idx)}
                        className="text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="text-sm text-gray-500 italic border border-gray-400 rounded-lg p-4 text-center">
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

export default AddModal;
