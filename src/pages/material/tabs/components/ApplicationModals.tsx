// ApplicationModals 组件
// 领料申请单的编辑弹窗和新增弹窗
// 使用统一的 Modal 组件，支持拖动、调整大小、最大化功能
import { useState } from 'react';
import { Plus, Save, Send, Trash2, Wand2, X, XCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Modal } from '@/components/ui';
import { MaterialAutocomplete } from '@/components/common/MaterialAutocomplete';
import { UserSelect } from '@/components/common/settings/UserSelect';
import type { MaterialItem, MaterialReceivingRecord } from '@/types/materialReceiving';

// ============================================
// 编辑弹窗组件
// ============================================
interface EditModalProps {
  isOpen: boolean;
  record: MaterialReceivingRecord | null;
  editForm: {
    date: string;
    applicant: string;
    department: string;
    warehouseLocation: string;
    plantArea: string;
    reviewer: string;
    productionBatchCode: string;
    status: string;
    materials: MaterialItem[];
  };
  onFormChange: React.Dispatch<React.SetStateAction<{
    date: string;
    applicant: string;
    department: string;
    warehouseLocation: string;
    plantArea: string;
    reviewer: string;
    productionBatchCode: string;
    status: string;
    materials: MaterialItem[];
  }>>;
  onClose: () => void;
  onAddMaterial: () => void;
  onRemoveMaterial: (index: number) => void;
  onMaterialChange: (index: number, field: keyof MaterialItem, value: string | number) => void;
  onSave: () => void;
  onVoidApply: () => void;
}

export function EditModal({
  isOpen,
  record,
  editForm,
  onFormChange,
  onClose,
  onAddMaterial,
  onRemoveMaterial,
  onMaterialChange,
  onSave,
  onVoidApply,
}: EditModalProps) {
  // 编辑表单内容
  const renderFormContent = () => (
    <div className="grid grid-cols-2 gap-4">
      {/* 领料单号 - 只读 */}
      <div className="bg-gray-100 rounded-lg p-3">
        <Label className="block text-xs font-medium text-gray-500 mb-1">领料单号</Label>
        <div className="text-sm font-medium text-gray-900">{record.code}</div>
      </div>
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">申请日期</Label>
        <Input
          type="date"
          value={editForm.date}
          onChange={(e) => onFormChange({ ...editForm, date: e.target.value })}
          className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">申请人</Label>
        <UserSelect
          value={editForm.applicant}
          onChange={(value) => onFormChange({ ...editForm, applicant: value })}
          placeholder="选择申请人"
        />
      </div>
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">部门</Label>
        <Select
          value={editForm.department || 'none'}
          onValueChange={(val) => onFormChange({ ...editForm, department: val === 'none' ? '' : val })}
        >
          <SelectTrigger className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
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
        <Label className="block text-sm font-medium text-gray-700 mb-1">种植区域/用途</Label>
        <Input
          type="text"
          value={editForm.plantArea}
          onChange={(e) => onFormChange({ ...editForm, plantArea: e.target.value })}
          placeholder="如：1号棚-叶菜区"
          className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">审核人</Label>
        <UserSelect
          value={editForm.reviewer}
          onChange={(value) => onFormChange({ ...editForm, reviewer: value })}
          placeholder="选择审核人"
        />
      </div>
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">生产计划批次号</Label>
        <Input
          type="text"
          value={editForm.productionBatchCode}
          onChange={(e) => onFormChange({ ...editForm, productionBatchCode: e.target.value })}
          className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
    </div>
  );

  // 物料明细表格
  const renderMaterialsTable = () => (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-medium text-gray-700">物料明细</Label>
        <Button onClick={onAddMaterial}>
          <Plus className="w-4 h-4" />
          添加物料
        </Button>
      </div>
      {editForm.materials.length > 0 ? (
        <table className="w-full border border-gray-400 rounded-lg overflow-hidden">
          <thead className="bg-emerald-100">
            <tr>
              <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">物料编码</th>
              <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">物料名称</th>
              <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">批次号</th>
              <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">规格</th>
              <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">单位</th>
              <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">申领数量</th>
              <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">当前库存</th>
              <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">单价(元)</th>
              <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">小计(元)</th>
              <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">备注</th>
              <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600 w-12">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {editForm.materials.map((material, idx) => {
              const subtotal = material.requestedQuantity * (material.unitPrice || 0);
              const isStockWarning = material.requestedQuantity > (material.stockQuantity || 0);
              return (
                <tr key={idx}>
                  <td className="px-2 py-2">
                    <Input
                      type="text"
                      value={material.materialCode}
                      onChange={(e) => onMaterialChange(idx, 'materialCode', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-400 rounded text-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <MaterialAutocomplete
                      value={material.materialName}
                      onChange={(v) => onMaterialChange(idx, 'materialName', v)}
                      onSelect={(m) => {
                        onMaterialChange(idx, 'materialCode', m.code);
                        onMaterialChange(idx, 'spec', m.specification);
                        onMaterialChange(idx, 'unit', m.unit);
                        onMaterialChange(idx, 'stockQuantity', m.quantity);
                        onMaterialChange(idx, 'unitPrice', Number(m.price) || 0);
                      }}
                      placeholder="输入物料名称搜索"
                      className="w-full"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="text"
                      value={material.batchNo || ''}
                      onChange={(e) => onMaterialChange(idx, 'batchNo', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-400 rounded text-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="text"
                      value={material.spec}
                      onChange={(e) => onMaterialChange(idx, 'spec', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-400 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="text"
                      value={material.unit}
                      onChange={(e) => onMaterialChange(idx, 'unit', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-400 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      value={material.requestedQuantity}
                      onChange={(e) => onMaterialChange(idx, 'requestedQuantity', Number(e.target.value))}
                      className={`w-full px-2 py-1 border border-gray-400 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${isStockWarning ? 'border-red-500 text-red-600' : ''}`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      value={material.stockQuantity || ''}
                      onChange={(e) => onMaterialChange(idx, 'stockQuantity', Number(e.target.value))}
                      className="w-full px-2 py-1 border border-gray-400 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      value={material.unitPrice || ''}
                      onChange={(e) => onMaterialChange(idx, 'unitPrice', Number(e.target.value))}
                      className="w-full px-2 py-1 border border-gray-400 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-2 py-2 text-sm text-blue-700 bg-gray-50">
                    {subtotal.toFixed(2)}
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="text"
                      value={material.remark || ''}
                      onChange={(e) => onMaterialChange(idx, 'remark', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-400 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveMaterial(idx)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
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
  );

  // 底部操作栏
  const renderFooter = () => (
    <div className="flex items-center gap-3">
      <Button variant="secondary" onClick={onClose}>
        <X className="w-4 h-4" /> 取消
      </Button>
      {(record.status === '待审批' || record.status === '已审批') && (
        <Button variant="warning" onClick={onVoidApply}>
          <XCircle className="w-4 h-4" /> 作废申请
        </Button>
      )}
      <Button onClick={onSave}>
        <Save className="w-4 h-4" /> 保存提交
      </Button>
    </div>
  );

  if (!isOpen || !record) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑领料单"
      size="xl"
      showMaximize={true}
      enableDrag={true}
      enableResize={true}
      showFooter={true}
      footer={renderFooter()}
    >
      <div className="space-y-4">
        {renderFormContent()}
        {renderMaterialsTable()}
      </div>
    </Modal>
  );
}

// ============================================
// 新增弹窗组件
// ============================================
interface AddModalProps {
  isOpen: boolean;
  addForm: {
    code: string;
    date: string;
    applicant: string;
    department: string;
    warehouseLocation: string;
    plantArea: string;
    reviewer: string;
    productionBatchCode: string;
    batchRemark: string;
    materials: MaterialItem[];
  };
  onFormChange: React.Dispatch<React.SetStateAction<{
    code: string;
    date: string;
    applicant: string;
    department: string;
    warehouseLocation: string;
    plantArea: string;
    reviewer: string;
    productionBatchCode: string;
    batchRemark: string;
    materials: MaterialItem[];
  }>>;
  onClose: () => void;
  onAddMaterial: () => void;
  onRemoveMaterial: (index: number) => void;
  onMaterialChange: (index: number, field: keyof MaterialItem, value: string | number) => void;
  onGenerateCode: () => void;
  onSave: () => void;
}

export function AddModal({
  isOpen,
  addForm,
  onFormChange,
  onClose,
  onAddMaterial,
  onRemoveMaterial,
  onMaterialChange,
  onGenerateCode,
  onSave,
}: AddModalProps) {
  // 新增表单内容
  const renderFormContent = () => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">领料单号</Label>
        <div className="flex gap-2">
          <Input
            type="text"
            value={addForm.code}
            onChange={(e) => onFormChange({ ...addForm, code: e.target.value })}
            placeholder="系统自动生成"
            className="flex-1 px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Button variant="secondary" onClick={onGenerateCode}>
            <Wand2 className="w-4 h-4" /> 生成
          </Button>
        </div>
      </div>
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">申请日期</Label>
        <Input
          type="date"
          value={addForm.date}
          onChange={(e) => onFormChange({ ...addForm, date: e.target.value })}
          className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">申请人</Label>
        <UserSelect
          value={addForm.applicant}
          onChange={(value) => onFormChange({ ...addForm, applicant: value })}
          placeholder="选择申请人"
        />
      </div>
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">部门</Label>
        <Select
          value={addForm.department || 'none'}
          onValueChange={(val) => onFormChange({ ...addForm, department: val === 'none' ? '' : val })}
        >
          <SelectTrigger className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
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
        <Label className="block text-sm font-medium text-gray-700 mb-1">种植区域/用途</Label>
        <Input
          type="text"
          value={addForm.plantArea}
          onChange={(e) => onFormChange({ ...addForm, plantArea: e.target.value })}
          placeholder="如：1号棚-叶菜区"
          className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">审核人</Label>
        <UserSelect
          value={addForm.reviewer}
          onChange={(value) => onFormChange({ ...addForm, reviewer: value })}
          placeholder="选择审核人"
        />
      </div>
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">生产计划批次号</Label>
        <Input
          type="text"
          value={addForm.productionBatchCode}
          onChange={(e) => onFormChange({ ...addForm, productionBatchCode: e.target.value })}
          className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
    </div>
  );

  // 物料明细表格
  const renderMaterialsTable = () => (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-medium text-gray-700">物料明细</Label>
        <Button onClick={onAddMaterial}>
          <Plus className="w-4 h-4" />
          添加物料
        </Button>
      </div>
      {addForm.materials.length > 0 ? (
        <table className="w-full border border-gray-400 rounded-lg overflow-hidden">
          <thead className="bg-emerald-100">
            <tr>
              <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">物料编码</th>
              <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">物料名称</th>
              <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">批次号</th>
              <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">规格</th>
              <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">单位</th>
              <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">申领数量</th>
              <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">当前库存</th>
              <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">单价(元)</th>
              <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">小计(元)</th>
              <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">备注</th>
              <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600 w-12">操作</th>
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
                      onChange={(e) => onMaterialChange(idx, 'materialCode', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-400 rounded text-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <MaterialAutocomplete
                      value={material.materialName}
                      onChange={(v) => onMaterialChange(idx, 'materialName', v)}
                      onSelect={(m) => {
                        onMaterialChange(idx, 'materialCode', m.code);
                        onMaterialChange(idx, 'spec', m.specification);
                        onMaterialChange(idx, 'unit', m.unit);
                        onMaterialChange(idx, 'stockQuantity', m.quantity);
                        onMaterialChange(idx, 'unitPrice', Number(m.price) || 0);
                      }}
                      placeholder="输入物料名称搜索"
                      className="w-full"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="text"
                      value={material.batchNo || ''}
                      onChange={(e) => onMaterialChange(idx, 'batchNo', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-400 rounded text-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="text"
                      value={material.spec}
                      onChange={(e) => onMaterialChange(idx, 'spec', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-400 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="text"
                      value={material.unit}
                      onChange={(e) => onMaterialChange(idx, 'unit', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-400 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      value={material.requestedQuantity}
                      onChange={(e) => onMaterialChange(idx, 'requestedQuantity', Number(e.target.value))}
                      className={`w-full px-2 py-1 border border-gray-400 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${isStockWarning ? 'border-red-500 text-red-600' : ''}`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      value={material.stockQuantity || ''}
                      onChange={(e) => onMaterialChange(idx, 'stockQuantity', Number(e.target.value))}
                      className="w-full px-2 py-1 border border-gray-400 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      value={material.unitPrice || ''}
                      onChange={(e) => onMaterialChange(idx, 'unitPrice', Number(e.target.value))}
                      className="w-full px-2 py-1 border border-gray-400 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-2 py-2 text-sm text-emerald-700 bg-gray-50 font-medium">
                    ¥{subtotal.toFixed(2)}
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="text"
                      value={material.remark || ''}
                      onChange={(e) => onMaterialChange(idx, 'remark', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-400 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveMaterial(idx)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
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
  );

  // 底部操作栏
  const renderFooter = () => (
    <div className="flex items-center gap-3">
      <Button variant="secondary" onClick={onClose}>
        <X className="w-4 h-4" /> 取消
      </Button>
      <Button onClick={onSave}>
        <Send className="w-4 h-4" /> 提交申请
      </Button>
    </div>
  );

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="新增领料单"
      size="xl"
      showMaximize={true}
      enableDrag={true}
      enableResize={true}
      showFooter={true}
      footer={renderFooter()}
    >
      <div className="space-y-4">
        {renderFormContent()}
        {renderMaterialsTable()}
      </div>
    </Modal>
  );
}
