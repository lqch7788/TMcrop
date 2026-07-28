/**
 * 库存编辑弹窗 — V2（2026-07-21 重构）
 *
 * 设计原则（深度审核后重构）：
 * 1. 与列表/详情字段对齐，确保所有可编辑字段都有输入入口
 * 2. 不可编辑字段（创建后锁定）只读展示
 * 3. 后端白名单 + 前端 FIELD_MAP 同步，确保编辑后能保存
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { InventoryStock } from '@/types/inventory';
import { QUALITY_GRADE_MAP as QUALITY_GRADE_OPTIONS } from '@/constants/cropConstants';
// 2026-07-28 审核 H-4：去掉 enhancedApiClient 直调，改走 Store.action（V2.1 铁律）
import { useInventoryStore, useWarehouseStore } from '@/stores';
import { showAlert } from '@/lib/dialogService';
import { DictSelect } from '../../common/settings/DictSelect';

interface InventoryEditModalProps {
  isOpen: boolean;
  stock: InventoryStock | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function InventoryEditModal({ isOpen, stock, onClose, onSuccess }: InventoryEditModalProps) {
  // 可编辑字段状态
  const [currentQuantity, setCurrentQuantity] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [warehouseName, setWarehouseName] = useState<string>('');
  const [grade, setGrade] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  // 2026-07-21 补全缺失字段
  const [unit, setUnit] = useState<string>('');
  const [varietyName, setVarietyName] = useState<string>('');
  const [cropName, setCropName] = useState<string>('');
  const [targetYield, setTargetYield] = useState<string>('');
  const [plantingMode, setPlantingMode] = useState<string>('');
  const [productionPlanCode, setProductionPlanCode] = useState<string>('');
  const [inboundDate, setInboundDate] = useState<string>('');
  const [supplierName, setSupplierName] = useState<string>('');
  const [unitPrice, setUnitPrice] = useState<string>('');
  // 品质等级下拉
  const gradeOptions = Object.entries(QUALITY_GRADE_OPTIONS || {}).map(([value, { label }]) => ({ value, label }));

  // 仓库列表
  const warehouses = useWarehouseStore((s) => s.warehouses) || [];
  const loadWarehouses = useWarehouseStore((s) => s.loadWarehouses);

  // 2026-07-28 审核 H-4：使用 Store 的 updateItem action（触发 notifyChange 跨页刷新）
  const updateItem = useInventoryStore((s) => s.updateItem);

  useEffect(() => {
    if (isOpen && warehouses.length === 0) {
      loadWarehouses();
    }
  }, [isOpen, warehouses.length, loadWarehouses]);

  // 加载 stock 初始值
  useEffect(() => {
    if (stock) {
      setCurrentQuantity(String(stock.currentQuantity ?? ''));
      setWarehouseId(stock.warehouseId || '');
      setWarehouseName(stock.warehouseName || '');
      setGrade(stock.grade || '');
      setRemarks(stock.remarks || '');
      // 2026-07-21 补全缺失字段
      setUnit(stock.unit || '');
      setVarietyName(stock.varietyName || '');
      setCropName(stock.cropName || '');
      setTargetYield(stock.targetYield ? String(stock.targetYield) : '');
      setPlantingMode(stock.plantingMode || '');
      setProductionPlanCode(stock.productionPlanCode || '');
      setInboundDate(stock.inboundDate || '');
      setSupplierName(stock.supplierName || '');
      setUnitPrice(stock.unitPrice ? String(stock.unitPrice) : '');
    }
  }, [stock]);

  const handleSubmit = async () => {
    if (!stock) return;
    const qty = Number(currentQuantity);
    if (isNaN(qty) || qty < 0) {
      showAlert('请输入有效的数量（非负整数）');
      return;
    }
    try {
      // 2026-07-28 审核 H-4：改用 Store 的 updateItem action（自动 notifyChange 跨页刷新 + 乐观更新）
      const result = await updateItem(stock.instanceId, {
        current_quantity: qty,
        warehouse_id: warehouseId || undefined,
        warehouse_name: warehouseName || undefined,
        grade: grade || undefined,
        remarks: remarks || undefined,
        unit: unit || undefined,
        variety_name: varietyName || undefined,
        crop_name: cropName || undefined,
        target_yield: targetYield ? Number(targetYield) : undefined,
        planting_mode: plantingMode || undefined,
        production_plan_code: productionPlanCode || undefined,
        inbound_date: inboundDate || undefined,
        supplier_name: supplierName || undefined,
        unit_price: unitPrice ? Number(unitPrice) : undefined,
      });
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        showAlert(result.error || '保存失败');
      }
    } catch (e: any) {
      showAlert(e?.message || '保存失败');
    }
  };

  if (!isOpen || !stock) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑库存"
      size="xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button variant="default" onClick={handleSubmit}>保存</Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        {/* 只读字段 */}
        <div>
          <Label>实例ID</Label>
          <Input value={stock.instanceId} disabled className="bg-gray-50 font-mono text-xs" />
        </div>
        <div>
          <Label>库存类型</Label>
          <Input value={stock.stockType === 'seed' ? '种源' : stock.stockType === 'seedling' ? '种苗' : '成品'} disabled className="bg-gray-50" />
        </div>

        {/* 可编辑字段 */}
        <div>
          <Label>作物名称</Label>
          <Input value={cropName} onChange={(e) => setCropName(e.target.value)} />
        </div>
        <div>
          <Label>品种名称</Label>
          <Input value={varietyName} onChange={(e) => setVarietyName(e.target.value)} />
        </div>

        <div>
          <Label>数量 *</Label>
          <Input
            type="number"
            value={currentQuantity}
            onChange={(e) => setCurrentQuantity(e.target.value)}
            min={0}
            step={1}
          />
        </div>
        <div>
          <Label>单位</Label>
          <DictSelect
            category="unit"
            value={unit}
            onChange={(value) => setUnit(value)}
            placeholder="选择单位"
          />
        </div>

        <div>
          <Label>品质等级</Label>
          <Select value={grade} onValueChange={setGrade}>
            <SelectTrigger>
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">无</SelectItem>
              {gradeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>目标产量</Label>
          <Input
            type="number"
            min={0}
            value={targetYield}
            onChange={(e) => setTargetYield(e.target.value)}
          />
        </div>

        <div>
          <Label>种植模式</Label>
          <DictSelect
            category="planting_mode"
            value={plantingMode}
            onChange={(value) => setPlantingMode(value)}
            placeholder="选择种植模式"
          />
        </div>
        <div>
          <Label>仓库</Label>
          <Select value={warehouseId} onValueChange={(v) => {
            setWarehouseId(v);
            const wh = warehouses.find((w) => w.id === v);
            setWarehouseName(wh?.name || '');
          }}>
            <SelectTrigger>
              <SelectValue placeholder="请选择仓库" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">无</SelectItem>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>入库日期</Label>
          <Input type="date" value={inboundDate} onChange={(e) => setInboundDate(e.target.value)} />
        </div>
        <div>
          <Label>供应商</Label>
          <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
        </div>

        <div>
          <Label>单价（元）</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
          />
        </div>
        <div>
          <Label>关联生产计划</Label>
          <Input value={productionPlanCode} onChange={(e) => setProductionPlanCode(e.target.value)} />
        </div>

        {/* 备注 - 占两列 */}
        <div className="col-span-2">
          <Label>备注</Label>
          <TextArea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} />
        </div>

        {/* 只读信息提示 */}
        <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
          <p className="font-semibold mb-1">编辑说明</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>数量和仓库变更后会自动重算状态</li>
            <li>冻结中的库存仍可编辑（不影响已冻结的配额）</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}