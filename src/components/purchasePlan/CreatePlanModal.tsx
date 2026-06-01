/**
 * 采购计划创建弹窗组件
 */
import React, { useRef } from 'react';
import { Plus, Trash2, Upload, RefreshCw } from 'lucide-react';
import { Modal, FormField } from '../ui/Modal';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import type { PurchasePlanItem, PurchasePlan } from '../../types/purchase';
import { PURCHASE_TYPE_TEXT } from '../../types/purchase';
import { usePlantingStore } from '../../stores';
import * as XLSX from 'xlsx';
import { showAlert } from '@/lib/dialogService';

const safeArray = <T,>(v: T[] | undefined | null): T[] => Array.isArray(v) ? v : [];

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
 * 改为调用后端 /api/purchase-plans/next-code 端点
 * 规则：PA + YYYYMM + 4位流水号，流水号基于 DB 最大已用序号 +1
 */
const generateCode = async (): Promise<string> => {
  try {
    const { getNextPurchaseApplicationCode } = await import('../../services/apiPurchasePlanService');
    return await getNextPurchaseApplicationCode();
  } catch (err) {
    // 后端调用失败时的兜底：PA+年月+4位随机（不保证唯一，但前端会校验）
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `PA${ym}${random}`;
  }
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
  // 深度输入框样式
  const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 字典：从 store 动态加载（字段名以实际 store 定义为准）
  const plantingItems = safeArray(usePlantingStore((s: any) => s.items));
  const loadPlantings = usePlantingStore((s: any) => s.loadItems);

  React.useEffect(() => {
    if (plantingItems.length === 0 && loadPlantings) loadPlantings();
  }, [plantingItems.length, loadPlantings]);

  // 关联批次选项：usePlantingStore.items 字段为 plantCode / cropName
  const batchOptions = React.useMemo(() => {
    const opts = plantingItems.map((b: any) => ({
      value: String(b.plantCode || b.id),
      label: `${b.plantCode || b.id} - ${b.cropName || ''}`,
    }));
    opts.push({ value: 'other', label: '其他' });
    return opts;
  }, [plantingItems]);

  // 部门选项：硬编码（字典表无 department 分类，现有数据使用"生产部/后勤部/办公室/技术部"）
  const departmentOptions = [
    { value: '生产部', label: '生产部' },
    { value: '后勤部', label: '后勤部' },
    { value: '办公室', label: '办公室' },
    { value: '技术部', label: '技术部' },
  ];

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
          showAlert(`成功导入 ${importedItems.length} 条物料明细`);
        } else {
          showAlert('导入失败：未找到有效的物料数据');
        }
      } catch (error) {
        // logger.error('导入失败:', error);
        showAlert('导入失败：请确保文件格式正确');
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

  // 生成不重复编号（调用后端端点获取下一个可用流水号）
  const handleGenerateCode = async () => {
    const newCode = await generateCode();
    if (newCode) {
      onFormChange('purchaseApplicationCode', newCode);
    } else {
      // 极端情况兜底：手动生成
      const now = new Date();
      const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
      onFormChange('purchaseApplicationCode', `PA${ym}${random}`);
    }
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
                placeholder="PA2026060001"
                className="flex-1"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleGenerateCode}
              >
                <RefreshCw className="w-4 h-4" />
                生成
              </Button>
            </div>
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="采购类型">
            <Select
              value={createForm.purchaseType}
              onValueChange={(v) => {
                onFormChange('purchaseType', v);
                // 生产物资采购必须关联批次，其他类型不关联
                if (v !== 'production') {
                  onFormChange('relatedBatchCode', '');
                }
              }}
            >
              <SelectTrigger className={deepInputClass}><SelectValue placeholder="请选择" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="production">生产物资采购</SelectItem>
                <SelectItem value="urgent">紧急采购</SelectItem>
                <SelectItem value="routine">常规采购</SelectItem>
                <SelectItem value="material">通用物资</SelectItem>
                <SelectItem value="safety">劳保用品</SelectItem>
                <SelectItem value="equipment">设备采购</SelectItem>
                <SelectItem value="other">其他</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="关联生产批次号">
            <Select
              value={createForm.relatedBatchCode || ''}
              onValueChange={(v) => onFormChange('relatedBatchCode', v || undefined)}
            >
              <SelectTrigger className={deepInputClass}><SelectValue placeholder="请选择" /></SelectTrigger>
              <SelectContent>
                {batchOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          {createForm.relatedBatchCode === 'other' && (
            <FormField label="其他说明">
              <Input
                value={createForm.otherBatchReason || ''}
                onChange={(e) => onFormChange('otherBatchReason', e.target.value)}
                placeholder="请说明采购原因，如：日常用具、劳保用品等"
                className={deepInputClass}
              />
            </FormField>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="申请人">
            <Input
              value={createForm.applicant}
              onChange={(e) => onFormChange('applicant', e.target.value)}
              className={deepInputClass}
            />
          </FormField>
          <FormField label="申请部门">
            <Select
              value={createForm.applicantDepartment}
              onValueChange={(v) => onFormChange('applicantDepartment', v)}
              disabled={departmentOptions.length === 0}
            >
              <SelectTrigger className={deepInputClass}><SelectValue placeholder="请选择部门" /></SelectTrigger>
              <SelectContent>
                {departmentOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="申请日期">
            <Input
              type="date"
              value={createForm.applyDate}
              onChange={(e) => onFormChange('applyDate', e.target.value)}
              className={deepInputClass}
            />
          </FormField>
          <FormField label="需求日期">
            <Input
              type="date"
              value={createForm.requiredDate}
              onChange={(e) => onFormChange('requiredDate', e.target.value)}
              className={deepInputClass}
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="优先级">
            <Select
              value={createForm.priority}
              onValueChange={(v) => onFormChange('priority', v)}
            >
              <SelectTrigger className={deepInputClass}><SelectValue placeholder="请选择" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent">紧急</SelectItem>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="normal">中</SelectItem>
                <SelectItem value="low">低</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="备注">
            <Input
              value={createForm.remark || ''}
              onChange={(e) => onFormChange('remark', e.target.value)}
              placeholder="请输入备注"
              className={deepInputClass}
            />
          </FormField>
        </div>

        {/* 物料明细区域 */}
        <div className="border-t border-gray-300 pt-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-800">物料明细（{createItems.length}种物料）</h4>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="blue"
                onClick={handleImportClick}
              >
                <Upload className="w-4 h-4" />
                导入物料
              </Button>
              <Button
                size="sm"
                onClick={handleAddItem}
              >
                <Plus className="w-4 h-4" />
                添加物料
              </Button>
            </div>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          {createItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-gray-400 rounded-lg">
              暂无物料，请点击"添加物料"按钮添加
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white">
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <Input
                          value={item.materialCode}
                          onChange={(e) => handleUpdateItem(item.id, 'materialCode', e.target.value)}
                          placeholder="编码"
                          className={deepInputClass}
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <Input
                          value={item.materialName}
                          onChange={(e) => handleUpdateItem(item.id, 'materialName', e.target.value)}
                          placeholder="名称"
                          className={deepInputClass}
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <Input
                          value={item.category}
                          onChange={(e) => handleUpdateItem(item.id, 'category', e.target.value)}
                          placeholder="分类"
                          className={deepInputClass}
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <Input
                          value={item.specification}
                          onChange={(e) => handleUpdateItem(item.id, 'specification', e.target.value)}
                          placeholder="规格"
                          className={deepInputClass}
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap text-center">
                        <Input
                          value={item.unit}
                          onChange={(e) => handleUpdateItem(item.id, 'unit', e.target.value)}
                          placeholder="单位"
                          className={deepInputClass}
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap text-right">
                        <Input
                          type="number"
                          value={item.quantity || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'quantity', Number(e.target.value))}
                          placeholder="0"
                          className={deepInputClass}
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap text-right">
                        <Input
                          type="number"
                          value={item.estimatedPrice || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'estimatedPrice', Number(e.target.value))}
                          placeholder="0"
                          className={deepInputClass}
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap text-right">
                        <span className="text-xs text-gray-900 font-medium">
                          ¥{item.estimatedTotalPrice.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <Input
                          value={item.supplier}
                          onChange={(e) => handleUpdateItem(item.id, 'supplier', e.target.value)}
                          placeholder="供应商"
                          className={deepInputClass}
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <Input
                          value={item.purpose}
                          onChange={(e) => handleUpdateItem(item.id, 'purpose', e.target.value)}
                          placeholder="用途"
                          className={deepInputClass}
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <Input
                          value={item.remark}
                          onChange={(e) => handleUpdateItem(item.id, 'remark', e.target.value)}
                          placeholder="备注"
                          className="h-6 w-14 p-1 text-xs rounded border-gray-300"
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
