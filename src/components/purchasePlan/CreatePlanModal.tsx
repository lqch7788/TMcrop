/**
 * 采购计划创建弹窗组件
 */
import React, { useRef } from 'react';
import { Plus, Trash2, Upload, RefreshCw } from 'lucide-react';
import { Modal, FormField, Input, Select } from '../ui/Modal';
import type { PurchasePlanItem, PurchasePlan } from '../../types/purchase';
import * as XLSX from 'xlsx';

interface CreatePlanModalProps {
  // 弹窗状态
  isOpen: boolean;
  onClose: () => void;
  // 表单数据
  createForm: {
    purchaseApplicationCode: string;
    relatedBatchCode: string;
    purchaseType: string;
    applicant: string;
    applicantDepartment: string;
    applyDate: string;
    requiredDate: string;
    priority: string;
    remark: string;
    otherBatchReason: string;
    approvalPerson: string;
  };
  createItems: PurchasePlanItem[];
  // 数据列表（用于检查编号重复）
  purchasePlansData: PurchasePlan[];
  // 操作函数
  onFormChange: (field: string, value: any) => void;
  onItemsChange: (items: PurchasePlanItem[]) => void;
  onSubmit: () => void;
}

/**
 * 生成采购申请批次号
 */
const generateCode = () => {
  return `PA${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
};

/**
 * 采购计划创建弹窗组件
 */
export function CreatePlanModal({
  isOpen,
  onClose,
  createForm,
  createItems,
  purchasePlansData,
  onFormChange,
  onItemsChange,
  onSubmit,
}: CreatePlanModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 导入物料处理
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // 解析导入的数据
        const importedItems = jsonData.map((row: any, index: number) => ({
          id: `IMPORT-${Date.now()}-${index}`,
          materialCode: row['物料编码'] || row['materialCode'] || '',
          materialName: row['物料名称'] || row['materialName'] || '',
          category: row['分类'] || row['category'] || '',
          specification: row['规格型号'] || row['specification'] || '',
          unit: row['单位'] || row['unit'] || '袋',
          quantity: Number(row['数量'] || row['quantity'] || 0),
          estimatedPrice: Number(row['预估单价'] || row['estimatedPrice'] || 0),
          estimatedTotalPrice: Number(row['数量'] || row['quantity'] || 0) * Number(row['预估单价'] || row['estimatedPrice'] || 0),
          supplier: row['供应商'] || row['supplier'] || '',
          purpose: row['用途说明'] || row['purpose'] || '',
          remark: row['备注'] || row['remark'] || '',
        })).filter((item) => item.materialCode || item.materialName);

        if (importedItems.length > 0) {
          onItemsChange([...createItems, ...importedItems]);
          alert(`成功导入 ${importedItems.length} 条物料明细`);
        } else {
          alert('导入失败：未找到有效的物料数据');
        }
      } catch (error) {
        console.error('导入失败:', error);
        alert('导入失败：请确保文件格式正确');
      }
    };
    reader.readAsArrayBuffer(file);

    // 清空 input 值，以便重复选择同一文件
    e.target.value = '';
  };

  // 添加物料明细
  const handleAddItem = () => {
    const newItem: PurchasePlanItem = {
      id: `NEW-${Date.now()}`,
      materialId: '',
      materialCode: '',
      materialName: '',
      barcode: '',
      category: '',
      specification: '',
      unit: '袋',
      quantity: 0,
      estimatedPrice: 0,
      estimatedTotalPrice: 0,
      supplier: '',
      location: '',
      batchNo: '',
      productionDate: '',
      expiryDate: '',
      purpose: '',
      remark: '',
    };
    onItemsChange([...createItems, newItem]);
  };

  // 删除物料明细
  const handleDeleteItem = (id: string) => {
    onItemsChange(createItems.filter(item => item.id !== id));
  };

  // 更新物料明细字段
  const handleUpdateItem = (id: string, field: keyof PurchasePlanItem, value: string | number) => {
    onItemsChange(createItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // 自动计算预估总价
        if (field === 'quantity' || field === 'estimatedPrice') {
          updated.estimatedTotalPrice = Number(updated.quantity) * Number(updated.estimatedPrice);
        }
        return updated;
      }
      return item;
    }));
  };

  // 生成不重复编号
  const handleGenerateCode = () => {
    let newCode = '';
    let exists = true;
    let attempts = 0;
    while (exists && attempts < 100) {
      newCode = generateCode();
      exists = purchasePlansData.some(plan => plan.purchaseApplicationCode === newCode);
      attempts++;
    }
    onFormChange('purchaseApplicationCode', newCode);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="新增采购申请单"
      size="xxl"
      onSubmit={onSubmit}
      submitText="提交"
      cancelText="取消"
    >
      <div className="space-y-4">
        {/* 采购申请批次号单独一行 */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="采购申请批次号">
            <div className="flex gap-2">
              <Input
                value={createForm.purchaseApplicationCode}
                onChange={(e) => onFormChange('purchaseApplicationCode', e.target.value)}
                placeholder="PA2026XXXXX"
                className="flex-1"
              />
              <button
                type="button"
                onClick={handleGenerateCode}
                className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1 whitespace-nowrap"
              >
                <RefreshCw className="w-4 h-4" />
                生成
              </button>
            </div>
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="采购类型">
            <Select
              value={createForm.purchaseType}
              onChange={(e) => {
                const newType = e.target.value;
                onFormChange('purchaseType', newType);
                // 生产物资采购必须关联批次，其他类型不关联
                if (newType !== '生产物资采购') {
                  onFormChange('relatedBatchCode', '');
                }
              }}
              options={[
                { value: '生产物资采购', label: '生产物资采购' },
                { value: '紧急采购', label: '紧急采购' },
                { value: '常规采购', label: '常规采购' },
                { value: '通用物资', label: '通用物资' },
                { value: '劳保用品', label: '劳保用品' },
                { value: '设备采购', label: '设备采购' },
                { value: '其他', label: '其他' },
              ]}
            />
          </FormField>
          <FormField label="关联生产批次号">
            <Select
              value={createForm.relatedBatchCode || ''}
              onChange={(e) => onFormChange('relatedBatchCode', e.target.value || undefined)}
              options={[
                { value: 'ZZB2026-001', label: 'ZZB2026-001 - 番茄种植批次' },
                { value: 'ZZB2026-002', label: 'ZZB2026-002 - 黄瓜种植批次' },
                { value: 'ZZB2026-003', label: 'ZZB2026-003 - 草莓种植批次' },
                { value: 'YMB2026-001', label: 'YMB2026-001 - 番茄育苗批次' },
                { value: 'YMB2026-002', label: 'YMB2026-002 - 黄瓜育苗批次' },
                { value: 'JZB2026-001', label: 'JZB2026-001 - 番茄种源批次' },
                { value: 'JZB2026-002', label: 'JZB2026-002 - 黄瓜种源批次' },
                { value: 'other', label: '其他' },
              ]}
            />
          </FormField>
          {createForm.relatedBatchCode === 'other' && (
            <FormField label="其他说明">
              <Input
                value={createForm.otherBatchReason || ''}
                onChange={(e) => onFormChange('otherBatchReason', e.target.value)}
                placeholder="请说明采购原因，如：日常用具、劳保用品等"
              />
            </FormField>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="申请人">
            <Input
              value={createForm.applicant}
              disabled
              className="bg-gray-100 cursor-not-allowed"
            />
          </FormField>
          <FormField label="申请部门">
            <Input
              value={createForm.applicantDepartment}
              disabled
              className="bg-gray-100 cursor-not-allowed"
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="申请日期">
            <Input
              type="date"
              value={createForm.applyDate}
              onChange={(e) => onFormChange('applyDate', e.target.value)}
            />
          </FormField>
          <FormField label="需求日期">
            <Input
              type="date"
              value={createForm.requiredDate}
              onChange={(e) => onFormChange('requiredDate', e.target.value)}
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="优先级">
            <Select
              value={createForm.priority}
              onChange={(e) => onFormChange('priority', e.target.value)}
              options={[
                { value: '紧急', label: '紧急' },
                { value: '高', label: '高' },
                { value: '中', label: '中' },
                { value: '低', label: '低' },
              ]}
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="审批人">
            <Select
              value={createForm.approvalPerson || ''}
              onChange={(e) => onFormChange('approvalPerson', e.target.value)}
              options={[
                { value: '', label: '请选择' },
                { value: '陆启闯', label: '陆启闯' },
                { value: '周总', label: '周总' },
                { value: 'Susan', label: 'Susan' },
              ]}
            />
          </FormField>
          <FormField label="备注">
            <Input
              value={createForm.remark || ''}
              onChange={(e) => onFormChange('remark', e.target.value)}
              placeholder="请输入备注"
            />
          </FormField>
        </div>

        {/* 物料明细区域 */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-800">物料明细（{createItems.length}种物料）</h4>
            <div className="flex items-center gap-2">
              <button
                onClick={handleImportClick}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
              >
                <Upload className="w-3 h-3" />
                导入物料
              </button>
              <button
                onClick={handleAddItem}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700"
              >
                <Plus className="w-3 h-3" />
                添加物料
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          {createItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg">
              暂无物料，请点击"添加物料"按钮添加
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">操作</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">物料编码</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">物料名称</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">分类</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">规格型号</th>
                    <th className="px-2 py-2 text-center font-semibold text-gray-600 whitespace-nowrap">单位</th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-600 whitespace-nowrap">数量</th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-600 whitespace-nowrap">预估单价</th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-600 whitespace-nowrap">预估总价</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">供应商</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">用途说明</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">备注</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {createItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={item.materialCode}
                          onChange={(e) => handleUpdateItem(item.id, 'materialCode', e.target.value)}
                          placeholder="编码"
                          className="w-20 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={item.materialName}
                          onChange={(e) => handleUpdateItem(item.id, 'materialName', e.target.value)}
                          placeholder="名称"
                          className="w-20 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={item.category}
                          onChange={(e) => handleUpdateItem(item.id, 'category', e.target.value)}
                          placeholder="分类"
                          className="w-24 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={item.specification}
                          onChange={(e) => handleUpdateItem(item.id, 'specification', e.target.value)}
                          placeholder="规格"
                          className="w-16 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap text-center">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleUpdateItem(item.id, 'unit', e.target.value)}
                          placeholder="单位"
                          className="w-12 h-6 px-1 border border-gray-200 rounded text-xs text-center"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap text-right">
                        <input
                          type="number"
                          value={item.quantity || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'quantity', Number(e.target.value))}
                          placeholder="0"
                          className="w-14 h-6 px-1 border border-gray-200 rounded text-xs text-right"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap text-right">
                        <input
                          type="number"
                          value={item.estimatedPrice || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'estimatedPrice', Number(e.target.value))}
                          placeholder="0"
                          className="w-14 h-6 px-1 border border-gray-200 rounded text-xs text-right"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap text-right">
                        <span className="text-xs text-gray-900 font-medium">
                          ¥{item.estimatedTotalPrice.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={item.supplier}
                          onChange={(e) => handleUpdateItem(item.id, 'supplier', e.target.value)}
                          placeholder="供应商"
                          className="w-16 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={item.purpose}
                          onChange={(e) => handleUpdateItem(item.id, 'purpose', e.target.value)}
                          placeholder="用途"
                          className="w-16 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={item.remark}
                          onChange={(e) => handleUpdateItem(item.id, 'remark', e.target.value)}
                          placeholder="备注"
                          className="w-14 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default CreatePlanModal;
