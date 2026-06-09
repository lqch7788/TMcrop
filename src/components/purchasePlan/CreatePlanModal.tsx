/**
 * 采购计划创建弹窗组件
 */
import React, { useRef, useState } from 'react';
import { Plus, Trash2, Upload, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Modal, FormField } from '@/components/ui';
import { Input } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Button } from '@/components/ui';
import type { PurchasePlanItem, PurchasePlan } from '../../types/purchase';
import { PURCHASE_TYPE_TEXT } from '../../types/purchase';
import { usePlantingStore, useDictionaryStore } from '../../stores';
import { MaterialAutocomplete } from '@/components/common/MaterialAutocomplete';
import * as XLSX from 'xlsx';
import { showAlert } from '@/lib/dialogService';
// M-7: 改用静态 import（原本 generateCode 函数内 await import 每次调用都重新打包）
import { getNextPurchaseApplicationCode } from '../../services/apiPurchasePlanService';
// H-2: 复用 codeGenerator 的兜底逻辑
import { yearMonthLocal } from '@/lib/dateUtils';

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
  // 操作函数（支持值或 updater 函数，避免连续 setState 互相覆盖）
  onFormChange: (field: string, value: any) => void;
  onItemsChange: (items: PurchasePlanItem[] | ((prev: PurchasePlanItem[]) => PurchasePlanItem[])) => void;
  onSubmit: () => void;
}

/**
 * 生成采购申请批次号
 * 改为调用后端 /api/purchase-plans/next-code 端点
 * 规则：PA + YYYYMM + 4位流水号，流水号基于 DB 最大已用序号 +1
 */
const generateCode = async (): Promise<string> => {
  try {
    // M-7: 静态 import
    return await getNextPurchaseApplicationCode();
  } catch {
    // 后端调用失败时的兜底：PA+年月+4位随机（不保证唯一，但前端会校验）
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `PA${yearMonthLocal()}${random}`;
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

  // 审批规则说明折叠状态（默认折叠）
  const [showApprovalRules, setShowApprovalRules] = useState(false);

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
          quantity: Math.max(0, Math.round(Number(row['数量'] || row['quantity'] || 0) * 100) / 100),
          estimatedPrice: Math.max(0, Math.round(Number(row['预估单价'] || row['estimatedPrice'] || 0) * 100) / 100),
          estimatedTotalPrice: 0, // 下面统一计算
          supplier: row['供应商'] || row['supplier'] || '',
          purpose: row['用途说明'] || row['purpose'] || '',
          remark: row['备注'] || row['remark'] || '',
        })).map((item) => ({
          ...item,
          estimatedTotalPrice: Math.round(item.quantity * item.estimatedPrice * 100) / 100,
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
  // 数量/单价：限制为正数，最多 2 位小数
  const sanitizePositive = (raw: number, maxDecimals = 2): number => {
    if (isNaN(raw) || raw < 0) return 0;
    // 保留 2 位小数（不四舍五入到整数）
    return Math.round(raw * Math.pow(10, maxDecimals)) / Math.pow(10, maxDecimals);
  };
  const handleUpdateItem = (id: string, field: keyof PurchasePlanItem, value: string | number) => {
    // 用函数式 setState，避免连续 7 次调用（onSelect 一次性写多字段）时互相覆盖
    onItemsChange((prev: PurchasePlanItem[]) => prev.map(item => {
      if (item.id === id) {
        let v = value as any;
        if (field === 'quantity' || field === 'estimatedPrice') {
          v = sanitizePositive(Number(value));
        }
        const updated = { ...item, [field]: v };
        if (field === 'quantity' || field === 'estimatedPrice') {
          updated.estimatedTotalPrice = Math.round(updated.quantity * updated.estimatedPrice * 100) / 100;
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

  // 动态读取字典 amount_threshold（数据源：基础数据→字典管理→amount_threshold）
  // 直接绕过 store 缓存，每次弹窗打开都从 API 拉最新数据
  const loadDictionaries = useDictionaryStore((s: any) => s.loadDictionaries);
  const [amountThresholdsRaw, setAmountThresholdsRaw] = React.useState<any[]>([]);
  const [thresholdsLoading, setThresholdsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setThresholdsLoading(true);
    (async () => {
      try {
        const { getDictionaries } = await import('../../services/dictionaryService');
        const all = await getDictionaries('amount_threshold');
        setAmountThresholdsRaw(all);
      } catch (err) {
        console.error('读取金额阈值字典失败:', err);
        if (loadDictionaries) await loadDictionaries();
      } finally {
        setThresholdsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // 按 sortOrder 升序排列阈值，映射为 {maxAmount, displayName, level}
  const amountThresholds = React.useMemo(() => {
    const items = amountThresholdsRaw
      .filter((d: any) => (d.status === 'active' || !d.status))
      .sort((a: any, b: any) => (a.sortNumber || 0) - (b.sortNumber || 0));
    return items.map((d: any, idx: number) => {
      const maxAmount = Number(d.name) || 0;
      // 优先用 displayName（后端 display_name 映射）
      const displayName = d.displayName || d.name || '';
      return { maxAmount, displayName, sortOrder: idx };
    });
  }, [amountThresholdsRaw]);

  // 阈值列表（语义：每档 = 金额 ≥ 本档 maxAmount，区间叠加到下一档）
  // 例：1000/5000/10000/50000 → 4 档分别匹配 [0,1000)/[1000,5000)/[5000,10000)/[10000,∞)
  const thresholdDisplay = React.useMemo(() => {
    const list: { max: string; label: string; color: string }[] = [];
    const colorMap = ['green', 'amber', 'orange', 'red']; // exempt/quick/standard/strict
    if (amountThresholds.length === 0) return list;
    amountThresholds.forEach((t, i) => {
      const isLast = i === amountThresholds.length - 1;
      const range = isLast
        ? `金额 ≥ ${t.maxAmount.toLocaleString()} 元`
        : i === 0
          ? `金额 < ${t.maxAmount.toLocaleString()} 元`
          : `金额 ${amountThresholds[i - 1].maxAmount.toLocaleString()} ~ ${t.maxAmount.toLocaleString()} 元`;
      const color = colorMap[i] || 'gray';
      const colorClass = {
        green: 'text-green-700',
        amber: 'text-amber-700',
        orange: 'text-orange-700',
        red: 'text-red-700',
        gray: 'text-gray-700',
      }[color];
      // 优先使用字典里配置的 displayName，否则兜底为"需相应审批"
      const label = t.displayName && t.displayName.trim() && t.displayName !== String(t.maxAmount)
        ? t.displayName
        : '需相应审批';
      list.push({ max: range, label, color: colorClass });
    });
    return list;
  }, [amountThresholds]);

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
          {/* 审批规则提示：金额阈值说明（数据源：基础数据→字典→amount_threshold，动态读取） */}
          <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 leading-relaxed overflow-hidden">
            <button
              type="button"
              onClick={() => setShowApprovalRules(v => !v)}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-blue-100/50 transition-colors"
            >
              <span className="flex items-center gap-1 font-medium">
                <span>📋</span>
                <span>采购金额审批规则</span>
              </span>
              {showApprovalRules
                ? <ChevronUp className="w-4 h-4 text-blue-600" />
                : <ChevronDown className="w-4 h-4 text-blue-600" />}
            </button>
            {showApprovalRules && (
              <div className="px-3 pb-3 border-t border-blue-200/60">
                <div className="pt-2">总金额 = 物料明细「数量 × 单价」之和。规则如下：</div>
                {thresholdDisplay.length > 0 ? (
                  <ul className="mt-1 ml-3 space-y-0.5">
                    {thresholdDisplay.map((t, i) => (
                      <li key={i}>• {t.max} → <span className={`font-semibold ${t.color}`}>{t.label}</span></li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-1 text-blue-600">阈值未配置，请联系管理员</div>
                )}
                <div className="mt-1 text-blue-600">阈值可在「基础数据 → 字典管理 → amount_threshold」分类下调整</div>
              </div>
            )}
          </div>
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
                          <Trash2 className="w-4 h-4 text-red-500" />
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
                        <MaterialAutocomplete
                          value={item.materialName}
                          onChange={(v) => handleUpdateItem(item.id, 'materialName', v)}
                          onSelect={(m) => {
                            handleUpdateItem(item.id, 'materialId', String(m.id));
                            handleUpdateItem(item.id, 'materialCode', m.code);
                            handleUpdateItem(item.id, 'materialName', m.name);
                            handleUpdateItem(item.id, 'category', m.category || '');
                            handleUpdateItem(item.id, 'specification', m.specification || '');
                            handleUpdateItem(item.id, 'unit', m.unit || '');
                            handleUpdateItem(item.id, 'barcode', m.barcode || '');
                            handleUpdateItem(item.id, 'supplier', m.supplier || '');
                          }}
                          placeholder="输入名称搜索物料库"
                          className="min-w-[160px]"
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
                          min={0}
                          step={0.01}
                          value={item.quantity || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'quantity', Number(e.target.value))}
                          placeholder="0"
                          className={deepInputClass}
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap text-right">
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.estimatedPrice || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'estimatedPrice', Number(e.target.value))}
                          placeholder="0"
                          className={deepInputClass}
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap text-right">
                        <span className="text-xs text-gray-900 font-medium">
                          ¥{item.estimatedTotalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
