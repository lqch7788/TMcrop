/**
 * 采收入库新增弹窗组件
 * 参照物料入库新增弹窗设计
 * V3.1: 使用 API 驱动的 Select 组件替换硬编码选项
 */

import React, { useEffect, useState } from 'react';
import { ChevronDown, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { UnifiedModal } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import {
  getProduceCategoryInfo,
} from '../../../../data/produceCodeRule';
import { getCurrentUsername } from '../../../../hooks/farm';
import { DictSelect } from '../../../common/settings/DictSelect';
import { UserSelect } from '../../../common/settings/UserSelect';
import { GreenhouseSelect } from '../../../common/settings/GreenhouseSelect';
import { WarehouseSelect } from '../../../common/settings/WarehouseSelect';
import { useDictionaryStore, getDictItems } from '../../../../stores';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface ProductDetail {
  cropCode: string;      // 作物编码（11位）
  cropName: string;      // 作物名称
  cropVariety: string;   // 作物品种（最细化名称）
  plantingMode: string;  // 种植模式
  harvestQuantity: number;
  unit: string;  // 单位
  targetYield: number;
  grade: string;
  auditor: string;
  remarks: string;
}

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  addForm: {
    harvestCode: string;
    harvestDate: string;
    greenhouseId: string;
    greenhouseIds: string[];  // 多选采收区域（主区域 greenhouseId 取数组第一个）
    batchCode: string;
    harvesterIds: string[];
    harvesterNames: string[];
    auditor: string;
    remarks: string;
    // V3.0 新增字段
    harvestType: 'seed' | 'seedling' | 'product';  // 采收类型
    targetInventory: 'seed' | 'seedling' | 'product';  // 目标库存
    saleType: 'self_use' | 'external_sale';  // 自用不入库，外售入作物库存
    products: ProductDetail[];
    // V3.1 补录相关字段
    isSupplementary: boolean;  // 是否补录
    supplementaryReason: string;  // 补录原因
    // V3.2 单价和单位
    unitPrice: number;  // 单价
    unit: string;  // 单位
    // V3.3 仓库
    warehouseId: string;  // 仓库ID
  };
  onFormChange: (field: string, value: any) => void;
  onAddProduct: () => void;
  onRemoveProduct: (index: number) => void;
  onProductChange: (index: number, field: string, value: any) => void;
  onGenerateCode: () => void;
  greenhouses: Array<{ id: string; name: string }>;
  warehouses: Array<{ id: string; name: string; warehouseType?: string }>;
  cropBatches: Array<{ id: string; batchCode: string; cropName: string; variety: string; plantingMode: string; targetYield: number; sourceType?: string; planType?: string; status?: string; cropCode?: string; greenhouseId?: string; greenhouseName?: string; batchStatus?: string; endType?: string }>;
  /** 批次号 → 实际种植/育苗的温室ID 列表（用于过滤采收区域下拉） */
  batchAreasMap?: Record<string, string[]>;
  users: Array<{ id: string; name: string; role: string }>;
  errors: Record<string, string>;
}

export const AddModal: React.FC<AddModalProps> = ({
  isOpen,
  onClose,
  onSave,
  addForm,
  onFormChange,
  onAddProduct,
  onRemoveProduct,
  onProductChange,
  onGenerateCode,
  greenhouses,
  warehouses,
  cropBatches,
  batchAreasMap = {},
  users,
  errors,
}) => {
  // 获取当前登录用户
  const currentOperator = getCurrentUsername() || '陆启闯';

  // 获取数据字典（品质等级、采收类型等）
  const dictionaries = useDictionaryStore((state) => state.dictionaries);
  const loadDictionaries = useDictionaryStore((state) => state.loadDictionaries);

  useEffect(() => {
    if (dictionaries.length === 0) {
      loadDictionaries();
    }
  }, [dictionaries.length, loadDictionaries]);

  const qualityGradeOptions = getDictItems('quality_level');
  const harvestTypeOptions = getDictItems('harvest_type');
  // 从数据字典获取采收人员列表（feedback_personnel 分类）
  const harvestWorkerOptions = getDictItems('feedback_personnel');

  // 批次类型筛选（种源/育苗/种植分开展示）
  const [batchTypeFilter, setBatchTypeFilter] = useState<'all' | 'seed' | 'seedling' | 'planting'>('all');

  // 过滤批次号列表（排除已正常结束 + 按类型筛选）
  const filteredBatches = cropBatches.filter(batch => {
    const status = batch.batchStatus || batch.status;
    if (status === 'completed' && (batch as any).endType === 'normal') return false;
    if (batchTypeFilter !== 'all' && (batch as any).sourceType !== batchTypeFilter) return false;
    return true;
  });

  // 切换类型筛选时清除已选批次
  const handleBatchTypeChange = (type: 'all' | 'seed' | 'seedling' | 'planting') => {
    setBatchTypeFilter(type);
    onFormChange('batchCode', '');
  };

  // 根据种源类型获取单位
  const getUnitBySourceType = (sourceType: string): string => {
    // 默认单位，实际应根据作物类型
    return '株';
  };

  // 处理采收人员选择
  const toggleHarvester = (userId: string, userName: string) => {
    const currentIds = addForm.harvesterIds;
    const currentNames = addForm.harvesterNames;
    if (currentIds.includes(userId)) {
      onFormChange('harvesterIds', currentIds.filter(id => id !== userId));
      onFormChange('harvesterNames', currentNames.filter(name => name !== userName));
    } else {
      onFormChange('harvesterIds', [...currentIds, userId]);
      onFormChange('harvesterNames', [...currentNames, userName]);
    }
  };

  // 处理采收区域多选
  const toggleGreenhouse = (ghId: string) => {
    const current = addForm.greenhouseIds || [];
    let next: string[];
    if (current.includes(ghId)) {
      next = current.filter(id => id !== ghId);
    } else {
      next = [...current, ghId];
    }
    onFormChange('greenhouseIds', next);
    // 同步主区域字段（取第一个）
    onFormChange('greenhouseId', next[0] || '');
  };

  // 根据当前选中的批次号，决定可用的温室列表
  // 数据源优先级：
  //   1) batchAreasMap[batchCode] — 从种植/育苗记录反查的实际种植区域（最准，支持多区域）
  //   2) selectedBatch.greenhouseId — 批次自带的温室（单值，可能为空）
  //   3) 全部温室（兜底）
  const selectedBatch = filteredBatches.find(b => b.batchCode === addForm.batchCode);
  const mapAreas = addForm.batchCode ? batchAreasMap[addForm.batchCode] : undefined;
  const allowedAreaIds: string[] | null = mapAreas && mapAreas.length > 0
    ? mapAreas
    : (selectedBatch?.greenhouseId ? [selectedBatch.greenhouseId] : null);
  const availableGreenhouses = allowedAreaIds
    ? greenhouses.filter(gh => allowedAreaIds.includes(gh.id))
    : greenhouses;
  const isGreenhouseLocked = allowedAreaIds !== null;

  // 生成产品编码
  const handleProductCodeGenerate = (idx: number, categoryCode: string, typeCode: string, subCode: string) => {
    const baseCode = `${categoryCode}${typeCode}${subCode}`;
    const seq = Math.floor(Math.random() * 999) + 1;
    const generatedCode = `${baseCode}${String(seq).padStart(3, '0')}`;
    onProductChange(idx, 'productCode', generatedCode);
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="采收登记"
      size="xxl"
      showFooter={false}
    >
      {/* 基本信息区域 */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label className="text-gray-900">采收单号</Label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={addForm.harvestCode}
              readOnly
              placeholder="点击生成获取单号"
              className={deepInputClass + " bg-gray-50 font-mono"}
            />
            <Button
              variant="default"
              size="sm"
              onClick={onGenerateCode}
              className="shrink-0 gap-1 text-sm"
              title="生成采收单号"
            >
              <RefreshCw className="w-4 h-4" />
              生成
            </Button>
          </div>
          {errors.harvestCode && <p className="text-red-500 text-xs mt-1">{errors.harvestCode}</p>}
        </div>
        <div>
          <Label className="text-gray-900">采收时间</Label>
          <Input
            type="datetime-local"
            value={addForm.harvestDate}
            onChange={(e) => onFormChange('harvestDate', e.target.value)}
            className={deepInputClass}
          />
          {errors.harvestDate && <p className="text-red-500 text-xs mt-1">{errors.harvestDate}</p>}
        </div>
        <div>
          <Label className="text-gray-900">操作员</Label>
          <Input
            type="text"
            value={currentOperator}
            readOnly
            className={deepInputClass + " bg-gray-100 font-medium"}
          />
        </div>
        <div>
          <Label className="text-gray-900">关联批次</Label>
          {/* 批次类型筛选按钮组 */}
          <div className="flex gap-1 mb-2">
            {[
              { key: 'all' as const, label: '全部' },
              { key: 'seed' as const, label: '种源' },
              { key: 'seedling' as const, label: '育苗' },
              { key: 'planting' as const, label: '种植' },
            ].map(t => (
              <Button
                key={t.key}
                size="sm"
                variant={batchTypeFilter === t.key ? 'default' : 'secondary'}
                className="text-xs px-3 h-7"
                onClick={() => handleBatchTypeChange(t.key)}
              >
                {t.label}
              </Button>
            ))}
          </div>
          <Select
            value={addForm.batchCode}
            onValueChange={(val) => {
              // 切到"不关联"时，把自动联动字段清空，避免残留旧批次信息
              if (val === '__none__') {
                onFormChange('batchCode', '');
                onFormChange('harvestType', 'product');
                onFormChange('targetInventory', 'product');
                onFormChange('greenhouseIds', []);
                onFormChange('greenhouseId', '');
                return;
              }
              // 选了具体批次 → 让父组件 useEffect 联动 harvestType/greenhouseIds
              onFormChange('batchCode', val);
            }}
          >
            <SelectTrigger className={deepInputClass}>
              <SelectValue placeholder="请选择批次（或不关联）" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— 不关联 —（自由填写）</SelectItem>
              {filteredBatches.map(batch => {
                const areas = batchAreasMap[batch.batchCode];
                const areaNames = areas
                  ? areas.map(id => greenhouses.find(g => g.id === id)?.name).filter(Boolean)
                  : (batch.greenhouseName ? [batch.greenhouseName] : []);
                return (
                  <SelectItem key={batch.id} value={batch.batchCode}>
                    {batch.batchCode} - {batch.cropName}
                    {areaNames.length > 0 ? `（${areaNames.join('、')}）` : ''}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {errors.batchCode && <p className="text-red-500 text-xs mt-1">{errors.batchCode}</p>}
        </div>
        <div>
          <Label className="text-gray-900">
            采收区域
            {isGreenhouseLocked && (
              <span className="ml-2 text-xs text-emerald-600">（已根据批次锁定）</span>
            )}
          </Label>
          <div className="relative">
            <div
              className="w-full min-h-[42px] px-3 py-2 border border-gray-400 rounded-lg bg-white cursor-pointer flex items-center justify-between"
              onClick={() => {
                const dropdown = document.getElementById('greenhouse-dropdown');
                if (dropdown) dropdown.classList.toggle('hidden');
              }}
            >
              <span className="text-sm text-gray-700">
                {addForm.greenhouseIds && addForm.greenhouseIds.length > 0
                  ? addForm.greenhouseIds
                      .map(id => greenhouses.find(g => g.id === id)?.name || id)
                      .join('、')
                  : '请选择采收区域（可多选）'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
            <div id="greenhouse-dropdown" className="hidden absolute z-10 w-full mt-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg">
              {availableGreenhouses.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-400 italic">无可用区域</div>
              ) : (
                availableGreenhouses.map(gh => (
                  <Label
                    key={gh.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <Input
                      type="checkbox"
                      checked={(addForm.greenhouseIds || []).includes(gh.id)}
                      onChange={() => toggleGreenhouse(gh.id)}
                      className="w-4 h-4 text-emerald-600 rounded border-gray-400 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700">{gh.name}</span>
                  </Label>
                ))
              )}
            </div>
          </div>
          {errors.greenhouseId && <p className="text-red-500 text-xs mt-1">{errors.greenhouseId}</p>}
        </div>
        <div>
          <Label className="text-gray-900">审核人员</Label>
          <Input
            type="text"
            value={addForm.auditor}
            onChange={(e) => onFormChange('auditor', e.target.value)}
            placeholder="请输入审核人员"
            className={deepInputClass}
          />
        </div>
        {/* V3.2 单价和单位字段 */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Label className="text-gray-900">
              单价 (元) <span className="text-xs text-gray-400">(可选)</span>
            </Label>
            <Input
              type="number"
              value={addForm.unitPrice || ''}
              onChange={(e) => onFormChange('unitPrice', Number(e.target.value))}
              placeholder="输入单价"
              min="0"
              step="0.01"
              className={deepInputClass}
            />
          </div>
          <div className="flex-1">
            <Label className="text-gray-900">单位</Label>
            <DictSelect
              category="unit"
              value={addForm.unit}
              onChange={(value) => onFormChange('unit', value)}
              placeholder="选择单位"
            />
          </div>
        </div>
        {(addForm.products.length > 0 && addForm.products.some((p: any) => p.harvestQuantity > 0)) && (
          <p className="mt-1 text-sm text-emerald-600 font-medium">
            预计收入: {((addForm.unitPrice || 0) * (addForm.products.reduce((sum: number, p: any) => sum + (p.harvestQuantity || 0), 0))).toFixed(2)} 元
          </p>
        )}
        {/* V3.0 采收类型 */}
        <div>
          <Label className="text-gray-900">采收类型</Label>
          <DictSelect
            category="harvest_type"
            value={addForm.harvestType}
            onChange={(value) => {
              onFormChange('harvestType', value);
              // 联动更新目标库存
              onFormChange('targetInventory', value);
            }}
            placeholder="选择采收类型"
          />
          <p className="mt-1 text-xs text-gray-400">种子/种苗采收将入库到相应库存</p>
        </div>
        {/* V3.0 目标库存 */}
        <div>
          <Label className="text-gray-900">目标库存</Label>
          <DictSelect
            category="target_inventory"
            value={addForm.targetInventory}
            onChange={(value) => onFormChange('targetInventory', value)}
            placeholder="选择目标库存"
          />
          <p className="mt-1 text-xs text-gray-400">
            {addForm.targetInventory === 'seed' && '采收种子将回到种源库存，形成循环'}
            {addForm.targetInventory === 'seedling' && '采收购苗将回到育苗库存，待下次定植'}
            {addForm.targetInventory === 'product' && '采收成品将进入产品库存'}
          </p>
        </div>
        {/* V3.4 采收去向（自用不入库 / 外售入作物库存） */}
        <div>
          <Label className="text-gray-900">采收去向</Label>
          <div className="flex gap-2 mt-1">
            <Button
              variant={addForm.saleType === 'self_use' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => onFormChange('saleType', 'self_use')}
            >
              自用（不入库）
            </Button>
            <Button
              variant={addForm.saleType === 'external_sale' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => onFormChange('saleType', 'external_sale')}
            >
              外售（入作物库存）
            </Button>
          </div>
        </div>
        {/* V3.3 仓库选择 - 根据目标库存类型联动过滤，自用时隐藏 */}
        {addForm.saleType !== 'self_use' && (
        <div>
          <Label className="text-gray-900">目标仓库</Label>
          <WarehouseSelect
            value={addForm.warehouseId}
            onChange={(val) => onFormChange('warehouseId', val)}
            placeholder="请选择目标仓库"
            warehouseType={addForm.targetInventory === 'seed' ? 'seed_storage' : addForm.targetInventory === 'seedling' ? 'seedling' : 'cold_storage'}
            className={deepInputClass}
          />
          <p className="mt-1 text-xs text-gray-400">
            {addForm.targetInventory === 'seed' && '（筛选：种子库）'}
            {addForm.targetInventory === 'seedling' && '（筛选：种苗库）'}
            {addForm.targetInventory === 'product' && '（筛选：成品冷库）'}
          </p>
          {errors.warehouseId && <p className="text-red-500 text-xs mt-1">{errors.warehouseId}</p>}
        </div>
        )}
        {/* V3.1 补录字段 + 采收人员 同一行 */}
        <div className="flex gap-4">
          <div className="flex-1">
            <Label className="text-gray-900">是否补录</Label>
            <DictSelect
              category="is_supplementary"
              value={addForm.isSupplementary ? 'yes' : 'no'}
              onChange={(value) => onFormChange('isSupplementary', value === 'yes')}
              placeholder="选择是否补录"
            />
          </div>
          <div className="flex-1">
            <Label className="text-gray-900">采收人员</Label>
            <div className="relative">
              <div
                className="w-full min-h-[42px] px-3 py-2 border border-gray-400 rounded-lg bg-white cursor-pointer flex items-center justify-between"
                onClick={() => {
                  const dropdown = document.getElementById('harvester-dropdown');
                  if (dropdown) dropdown.classList.toggle('hidden');
                }}
              >
                <span className="text-sm text-gray-700">
                  {addForm.harvesterIds.length > 0
                    ? `${addForm.harvesterIds.length} 人已选择`
                    : '请选择采收人员'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </div>
              <div id="harvester-dropdown" className="hidden absolute z-10 w-full mt-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg">
                {harvestWorkerOptions.map(worker => (
                  <Label
                    key={worker.dictCode}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <Input
                      type="checkbox"
                      checked={addForm.harvesterIds.includes(worker.dictCode)}
                      onChange={() => toggleHarvester(worker.dictCode, worker.dictLabel)}
                      className="w-4 h-4 text-emerald-600 rounded border-gray-400 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700">{worker.dictLabel}</span>
                  </Label>
                ))}
              </div>
            </div>
          </div>
        </div>
        {addForm.isSupplementary && (
          <div>
            <Label className="text-gray-900">
              补录原因 <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              value={addForm.supplementaryReason}
              onChange={(e) => onFormChange('supplementaryReason', e.target.value)}
              placeholder="请输入补录原因"
              className={deepInputClass}
            />
          </div>
        )}
      </div>

      {/* 产品明细 */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <Label className="font-bold text-gray-700">产品明细</Label>
          <Button
            variant="default"
            size="sm"
            onClick={onAddProduct}
            className="gap-1"
          >
            <Plus className="w-4 h-4" />
            添加产品
          </Button>
        </div>

        {addForm.products.length > 0 ? (
          <div className="overflow-x-auto border border-gray-400 rounded-lg">
            <table className="w-full min-w-[900px]">
              <thead style={{ backgroundColor: '#059669' }}>
                <tr style={{ backgroundColor: '#059669' }}>
                  <th className="px-2 py-2 text-white text-sm font-semibold w-36 text-left">作物编码</th>
                  <th className="px-2 py-2 text-white text-sm font-semibold w-32 text-left">品种</th>
                  <th className="px-2 py-2 text-white text-sm font-semibold w-32 text-left">作物品种</th>
                  <th className="px-2 py-2 text-white text-sm font-semibold w-28 text-left">种植模式</th>
                  <th className="px-2 py-2 text-white text-sm font-semibold w-20 text-left">品质等级</th>
                  <th className="px-2 py-2 text-white text-sm font-semibold w-20 text-left">采收量</th>
                  <th className="px-2 py-2 text-white text-sm font-semibold w-14 text-left">单位</th>
                  <th className="px-2 py-2 text-white text-sm font-semibold w-20 text-left">目标产量</th>
                  <th className="px-2 py-2 text-white text-sm font-semibold w-14 text-left">完成率</th>
                  <th className="px-2 py-2 text-white text-sm font-semibold w-10 text-left">备注</th>
                  <th className="px-2 py-2 text-white text-sm font-semibold w-10 text-left">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {addForm.products.map((product, idx) => {
                  const completionRate = product.targetYield > 0
                    ? Math.round((product.harvestQuantity / product.targetYield) * 100)
                    : 0;

                  return (
                    <tr key={idx}>
                      {/* 作物编码 */}
                      <td className="px-2 py-2">
                        <Input
                          type="text"
                          value={product.cropCode}
                          onChange={(e) => onProductChange(idx, 'cropCode', e.target.value.toUpperCase())}
                          placeholder="编码"
                          className={deepInputClass}
                        />
                      </td>
                      {/* 品种（类型名，如"黄瓜"） */}
                      <td className="px-2 py-2">
                        <Input
                          type="text"
                          value={product.cropName}
                          onChange={(e) => onProductChange(idx, 'cropName', e.target.value)}
                          placeholder="品种"
                          className={deepInputClass}
                        />
                      </td>
                      {/* 作物品种（最细化名，如"水果黄瓜"） */}
                      <td className="px-2 py-2">
                        <Input
                          type="text"
                          value={product.cropVariety}
                          onChange={(e) => onProductChange(idx, 'cropVariety', e.target.value)}
                          placeholder="作物品种"
                          className={deepInputClass}
                        />
                      </td>
                      {/* 种植模式（DictSelect 强制中文） */}
                      <td className="px-2 py-2">
                        <DictSelect
                          category="planting_mode"
                          value={product.plantingMode}
                          onChange={(value) => onProductChange(idx, 'plantingMode', value)}
                          placeholder="选择种植模式"
                        />
                      </td>
                      {/* 品质等级 */}
                      <td className="px-2 py-2">
                        <Select
                          value={product.grade}
                          onValueChange={(val) => onProductChange(idx, 'grade', val)}
                        >
                          <SelectTrigger className={deepInputClass}>
                            <SelectValue placeholder="等级" />
                          </SelectTrigger>
                          <SelectContent>
                            {qualityGradeOptions.map(g => (
                              <SelectItem key={g.dictCode} value={g.dictCode}>{g.dictLabel}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      {/* 采收量 */}
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          value={product.harvestQuantity}
                          onChange={(e) => onProductChange(idx, 'harvestQuantity', Number(e.target.value))}
                          min="0"
                          className={deepInputClass}
                        />
                      </td>
                      {/* 单位 */}
                      <td className="px-2 py-2">
                        <DictSelect
                          category="unit"
                          value={product.unit}
                          onChange={(value) => onProductChange(idx, 'unit', value)}
                          placeholder="单位"
                        />
                      </td>
                      {/* 目标产量 */}
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          value={product.targetYield}
                          onChange={(e) => onProductChange(idx, 'targetYield', Number(e.target.value))}
                          min="0"
                          className={deepInputClass}
                        />
                      </td>
                      {/* 完成率 */}
                      <td className="px-2 py-2 text-sm text-blue-700 bg-gray-50 text-center">
                        {completionRate}%
                      </td>
                      {/* 备注 */}
                      <td className="px-2 py-2">
                        <Input
                          type="text"
                          value={product.remarks}
                          onChange={(e) => onProductChange(idx, 'remarks', e.target.value)}
                          placeholder="备注"
                          className={deepInputClass}
                        />
                      </td>
                      {/* 操作 */}
                      <td className="px-2 py-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveProduct(idx)}
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
          </div>
        ) : (
          <div className="text-sm text-gray-500 italic border border-gray-400 rounded-lg p-4 text-center">
            暂无产品明细，请点击"添加产品"按钮添加
          </div>
        )}
      </div>

      {/* 备注 */}
      <div className="mt-4">
        <Label className="text-gray-900">备注</Label>
        <TextArea
          value={addForm.remarks}
          onChange={(e) => onFormChange('remarks', e.target.value)}
          placeholder="请输入采收备注"
          rows={2}
          className={deepInputClass + " resize-none"}
        />
      </div>

      {/* 底部按钮 */}
      <div className="mt-6 flex justify-end gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
        >
          <X className="w-4 h-4" /> 取消
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onSave}
        >
          <Save className="w-4 h-4" /> 保存
        </Button>
      </div>
    </UnifiedModal>
  );
};

export default AddModal;
