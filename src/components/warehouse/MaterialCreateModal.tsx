/**
 * 新建物料 Modal（物料库存页面用）
 *
 * 数据流：useWarehouseMaterialStore.addItem → API → 写回 Store
 * 编码规则：复用 src/pages/warehouse/utils/warehouseInbound.utils.ts 里的 handleCodeGen
 * 编码生成器 UI：复用 src/pages/warehouse/components/WarehouseInboundCodeGen
 *
 * 业务约束：与物料库存分离"主数据维护"语义，避免和出库交易混淆
 */
import React, { useEffect, useState } from 'react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { useWarehouseMaterialStore } from '@/stores';
import { showAlert } from '@/lib/dialogService';
import { CodeGenState, categoryConfig, bigCategoriesList } from '@/types/warehouseInbound.types';
import {
  handleCodeGen,
  copyToClipboard,
  resetCodeGen,
  getMidCategories,
  getSubCategories,
} from '@/pages/warehouse/utils/warehouseInbound.utils';
import { WarehouseInboundCodeGen } from '@/pages/warehouse/components/WarehouseInboundCodeGen';
import type { Material } from '@/services/apiWarehouseMaterialService';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface MaterialCreateModalProps {
  open: boolean;
  onClose: () => void;
  /** 可选：保存成功回调（父组件可以刷新列表 / 关闭其他弹窗） */
  onSuccess?: (material: Material) => void;
  /** 可选：URL 预填名称（从"去添加"链接 deep link 过来时带） */
  prefillName?: string;
  /** 可选：默认展开编码生成器（deep link 过来时建议展开） */
  defaultExpandCodeGen?: boolean;
}

export function MaterialCreateModal({
  open,
  onClose,
  onSuccess,
  prefillName,
  defaultExpandCodeGen = false,
}: MaterialCreateModalProps) {
  const addItem = useWarehouseMaterialStore((s) => s.addItem);
  const warehouseItems = useWarehouseMaterialStore((s) => s.items);

  // 表单状态
  const [form, setForm] = useState({
    code: '',
    name: prefillName || '',
    category: '',
    bigCategory: '',
    midCategory: '',
    subCategory: '',
    specification: '',
    unit: '',
    minStock: 0,
    maxStock: 0,
    price: '',
    supplier: '',
    location: '',
    barcode: '',
    dataStatus: '启用',
  });

  // 编码生成器状态
  const [codeGen, setCodeGen] = useState<CodeGenState>({
    bigCategory: '',
    midCategory: '',
    subCategory: '',
    generatedCode: '',
  });
  const [codeGenError, setCodeGenError] = useState('');
  const [codeGenSuccess, setCodeGenSuccess] = useState('');
  const [codeGenExpanded, setCodeGenExpanded] = useState(defaultExpandCodeGen);
  const [copySuccess, setCopySuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 打开时同步 prefillName（URL deep link 场景）
  useEffect(() => {
    if (open && prefillName) {
      setForm((prev) => ({ ...prev, name: prefillName }));
    }
  }, [open, prefillName]);

  // 编码生成后同步到 form.code（用户也可以手动覆盖）
  useEffect(() => {
    if (codeGen.generatedCode) {
      setForm((prev) => ({ ...prev, code: codeGen.generatedCode }));
    }
  }, [codeGen.generatedCode]);

  // 分类变化时同步到 form（避免用户在两个地方分别选）
  useEffect(() => {
    const bigName = codeGen.bigCategory ? (bigCategoriesList.find((b) => b.code === codeGen.bigCategory)?.name || '') : '';
    const midName = codeGen.bigCategory && codeGen.midCategory ? (categoryConfig[codeGen.bigCategory]?.categories?.[codeGen.midCategory]?.name || '') : '';
    const subName = codeGen.bigCategory && codeGen.midCategory && codeGen.subCategory
      ? (categoryConfig[codeGen.bigCategory]?.categories?.[codeGen.midCategory]?.subCategories?.[codeGen.subCategory]?.name || '')
      : '';
    const category = [bigName, midName, subName].filter(Boolean).join('-');
    setForm((prev) => ({
      ...prev,
      bigCategory: codeGen.bigCategory,
      midCategory: codeGen.midCategory,
      subCategory: codeGen.subCategory,
      category,
    }));
  }, [codeGen.bigCategory, codeGen.midCategory, codeGen.subCategory]);

  // 编码生成（按现有物料编码 max+1 生成下一个，避免随机重码）
  const handleGenerate = () => {
    // 从仓库物料主数据 Store 取已用编码列表
    const existingCodes = (warehouseItems ?? []).map((m) => m.code).filter((c): c is string => typeof c === 'string' && c.length > 0);
    handleCodeGen(codeGen, setCodeGen, setCodeGenError, setCodeGenSuccess, existingCodes);
  };

  // 复制编码
  const handleCopy = () => {
    if (codeGen.generatedCode) {
      copyToClipboard(codeGen.generatedCode, setCopySuccess);
    }
  };

  // 重置编码生成器
  const handleResetCodeGen = () => {
    resetCodeGen(setCodeGen, setCodeGenError, setCodeGenSuccess);
    setCopySuccess(false);
  };

  // 库存阈值字符串显示状态（独立于 form.minStock/maxStock number state）
  // 原因：直接绑 value={form.minStock} 时，clear 输入框会被 Number('') || 0 强制回到 0，无法删
  // 拆出 string display state 后，input 可清空，form state 保留最后一次有效数字
  const [minStockInput, setMinStockInput] = useState('0');
  const [maxStockInput, setMaxStockInput] = useState('0');

  const handleMinStockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setMinStockInput(raw);
    const num = parseFloat(raw);
    setForm((prev) => ({
      ...prev,
      minStock: isNaN(num) ? 0 : Math.max(0, Math.round(num * 100) / 100),
    }));
  };

  const handleMaxStockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setMaxStockInput(raw);
    const num = parseFloat(raw);
    setForm((prev) => ({
      ...prev,
      maxStock: isNaN(num) ? 0 : Math.max(0, Math.round(num * 100) / 100),
    }));
  };

  // 检测编码是否含字母 I/O（方案 C 防御性提示：避免与 1/0 形近）
  // 行业惯例：VIN、Base32、很多序列号规范都排除 I/O
  const hasIOChar = (code: string) => /[IO]/.test(code);

  // 必填字段校验（I/O 不阻断保存 —— 只是 UI 提示，用户可强行保存）
  const validate = (): string | null => {
    if (!form.code.trim()) return '请填写物料编码（可用上方编码生成器自动生成）';
    if (!form.name.trim()) return '请填写物料名称';
    if (!form.category) return '请选择完整分类（大类/中类/小类）';
    if (!form.specification.trim()) return '请填写规格型号';
    if (!form.unit.trim()) return '请填写单位';
    if (form.minStock < 0 || form.maxStock < 0) return '库存阈值不能为负';
    if (form.maxStock > 0 && form.minStock > form.maxStock) return '最低库存不能高于最高库存';
    return null;
  };

  // 保存
  const handleSave = async () => {
    const err = validate();
    if (err) {
      showAlert(err);
      return;
    }
    setSubmitting(true);
    try {
      const payload: Omit<Material, 'id'> = {
        code: form.code.trim(),
        name: form.name.trim(),
        category: form.category,
        specification: form.specification.trim(),
        unit: form.unit.trim(),
        quantity: 0, // 新建物料库存为 0；后续通过入库流程增加
        minStock: form.minStock,
        maxStock: form.maxStock,
        price: form.price.trim() || '0',
        supplier: form.supplier.trim(),
        location: form.location.trim(),
        barcode: form.barcode.trim(),
        lastUpdateTime: new Date().toISOString(),
        dataStatus: form.dataStatus,
      };
      const result = await addItem(payload);
      if (result) {
        // 防御：成功消息用本地 form.code 而非 result.code（即使后端只回 id，UX 也不变）
        const displayCode = result.code || form.code.trim();
        showAlert(`物料 ${displayCode} 创建成功`);
        onSuccess?.(result);
        onClose();
      } else {
        showAlert('保存失败：服务返回空值，请稍后重试');
      }
    } catch (error) {
      showAlert(`保存失败：${(error as Error).message || '未知错误'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // 中类/小类级联下拉选项
  const midOptions = codeGen.bigCategory
    ? getMidCategories(codeGen.bigCategory)
    : [];
  const subOptions =
    codeGen.bigCategory && codeGen.midCategory
      ? getSubCategories(codeGen.bigCategory, codeGen.midCategory)
      : [];

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title="新增物料"
      size="xxl"
      showFooter
      onSubmit={handleSave}
      submitText={submitting ? '保存中…' : '保存'}
      cancelText="取消"
    >
      <div className="space-y-4">
        {/* 编码生成器（复用入库页 UI） */}
        <WarehouseInboundCodeGen
          expanded={codeGenExpanded}
          onToggleExpand={() => setCodeGenExpanded(!codeGenExpanded)}
          codeGen={codeGen}
          onCodeGenChange={(field, value) =>
            setCodeGen((prev) => ({ ...prev, [field]: value }))
          }
          onGenerate={handleGenerate}
          onCopy={handleCopy}
          onReset={handleResetCodeGen}
          error={codeGenError}
          success={codeGenSuccess}
          copySuccess={copySuccess}
        />

        {/* 基本信息 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="block text-sm font-medium text-gray-900 mb-1">
              物料编码 <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
              placeholder="使用上方编码生成器自动生成，或手动输入"
              className={deepInputClass}
            />
            {hasIOChar(form.code) && (
              <div className="mt-1 text-xs text-amber-600 flex items-start gap-1">
                <span className="font-bold">⚠️</span>
                <span>编码含字母 I/O，与数字 1/0 形近，建议核对或替换</span>
              </div>
            )}
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-900 mb-1">
              物料名称 <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="如：尿素 50kg/袋"
              className={deepInputClass}
            />
          </div>
        </div>

        {/* 分类（如果编码生成器已选，自动同步） */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="block text-sm font-medium text-gray-900 mb-1">
              大类 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={codeGen.bigCategory || 'none'}
              onValueChange={(val) => {
                const actual = val === 'none' ? '' : val;
                setCodeGen((prev) => ({ ...prev, bigCategory: actual, midCategory: '', subCategory: '', generatedCode: '' }));
                setCodeGenError('');
                setCodeGenSuccess('');
              }}
            >
              <SelectTrigger className={deepInputClass}>
                <SelectValue placeholder="请选择大类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">请选择</SelectItem>
                {bigCategoriesList.map((b) => (
                  <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-900 mb-1">
              中类 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={codeGen.midCategory || 'none'}
              disabled={!codeGen.bigCategory}
              onValueChange={(val) => {
                const actual = val === 'none' ? '' : val;
                setCodeGen((prev) => ({ ...prev, midCategory: actual, subCategory: '', generatedCode: '' }));
                setCodeGenError('');
                setCodeGenSuccess('');
              }}
            >
              <SelectTrigger className={deepInputClass}>
                <SelectValue placeholder="请选择中类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">请选择</SelectItem>
                {midOptions.map((m) => (
                  <SelectItem key={m.code} value={m.code}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-900 mb-1">
              小类 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={codeGen.subCategory || 'none'}
              disabled={!codeGen.midCategory}
              onValueChange={(val) => {
                const actual = val === 'none' ? '' : val;
                setCodeGen((prev) => ({ ...prev, subCategory: actual, generatedCode: '' }));
                setCodeGenError('');
                setCodeGenSuccess('');
              }}
            >
              <SelectTrigger className={deepInputClass}>
                <SelectValue placeholder="请选择小类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">请选择</SelectItem>
                {subOptions.map((s) => (
                  <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 规格 + 单位 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="block text-sm font-medium text-gray-900 mb-1">
              规格型号 <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              value={form.specification}
              onChange={(e) => setForm((prev) => ({ ...prev, specification: e.target.value }))}
              placeholder="如：50kg/袋"
              className={deepInputClass}
            />
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-900 mb-1">
              单位 <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              value={form.unit}
              onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
              placeholder="如：袋 / 瓶 / 箱 / 公斤"
              className={deepInputClass}
            />
          </div>
        </div>

        {/* 库存阈值 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="block text-sm font-medium text-gray-900 mb-1">最低库存</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={minStockInput}
              onChange={handleMinStockChange}
              placeholder="0"
              className={deepInputClass}
            />
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-900 mb-1">最高库存</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={maxStockInput}
              onChange={handleMaxStockChange}
              placeholder="0"
              className={deepInputClass}
            />
          </div>
        </div>

        {/* 价格 / 供应商 / 货位 / 条码 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="block text-sm font-medium text-gray-900 mb-1">单价(元)</Label>
            <Input
              type="text"
              value={form.price}
              onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
              placeholder="如：85.00"
              className={deepInputClass}
            />
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-900 mb-1">供应商</Label>
            <Input
              type="text"
              value={form.supplier}
              onChange={(e) => setForm((prev) => ({ ...prev, supplier: e.target.value }))}
              placeholder="如：中化化肥有限公司"
              className={deepInputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="block text-sm font-medium text-gray-900 mb-1">存放位置</Label>
            <Input
              type="text"
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              placeholder="如：A区-01-01"
              className={deepInputClass}
            />
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-900 mb-1">条码</Label>
            <Input
              type="text"
              value={form.barcode}
              onChange={(e) => setForm((prev) => ({ ...prev, barcode: e.target.value }))}
              placeholder="选填"
              className={deepInputClass}
            />
          </div>
        </div>

        <div>
          <Label className="block text-sm font-medium text-gray-900 mb-1">数据状态</Label>
          <Select
            value={form.dataStatus}
            onValueChange={(val) => setForm((prev) => ({ ...prev, dataStatus: val }))}
          >
            <SelectTrigger className={deepInputClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="启用">启用</SelectItem>
              <SelectItem value="停用">停用</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </UnifiedModal>
  );
}

export default MaterialCreateModal;
