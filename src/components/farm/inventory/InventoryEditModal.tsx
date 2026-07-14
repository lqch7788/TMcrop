/**
 * 库存编辑弹窗
 * 2026-07-14：新增——支持编辑库存记录的核心字段（数量、仓库、品质等）
 * 设计原则：只暴露允许编辑的字段，freeze/transferred 等状态不可手动改
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { InventoryStock } from '@/types/inventory';
import { QUALITY_GRADE_MAP as QUALITY_GRADE_OPTIONS } from '@/constants/cropConstants';
import { useWarehouseStore } from '@/stores';
import { showAlert } from '@/lib/dialogService';
import { enhancedApiClient } from '@/lib/apiClient';

interface InventoryEditModalProps {
  isOpen: boolean;
  stock: InventoryStock | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function InventoryEditModal({ isOpen, stock, onClose, onSuccess }: InventoryEditModalProps) {
  // 2026-07-14：表单状态——只暴露可编辑字段
  const [currentQuantity, setCurrentQuantity] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [warehouseName, setWarehouseName] = useState<string>('');
  const [grade, setGrade] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  // 品质等级下拉（兜底空数组防止 undefined.map 崩溃）
  const gradeOptions = Object.entries(QUALITY_GRADE_OPTIONS || {}).map(([value, { label }]) => ({ value, label }));

  // 2026-07-14：仓库列表（注意：Store 字段名是 warehouses，不是 items）
  const warehouses = useWarehouseStore((s) => s.warehouses) || [];
  // 2026-07-14：打开弹窗时触发仓库数据加载（如果还没加载）
  const loadWarehouses = useWarehouseStore((s) => s.loadWarehouses);
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
    }
  }, [stock]);

  // 2026-07-14：提交
  const handleSubmit = async () => {
    if (!stock) return;
    const qty = Number(currentQuantity);
    if (isNaN(qty) || qty < 0) {
      showAlert('请输入有效的数量（非负整数）');
      return;
    }
    try {
      // 2026-07-14：用 instanceId 作为路由参数（列表数据里没有 id 字段）
      // 注意：apiClient baseURL 已含 /api 前缀，这里不要再加 /api
      // 注意：enhancedApiClient 已自动解包 response.data — success=true 时返回 data 内容，success=false 时 throw
      await enhancedApiClient.put<{ id: string }>(`/inventory/${stock.instanceId}`, {
        current_quantity: qty,
        warehouse_id: warehouseId || undefined,
        warehouse_name: warehouseName || undefined,
        grade: grade || undefined,
        remarks: remarks || undefined,
      });
      // 没有抛错 = 保存成功
      onSuccess();
      onClose();
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
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button variant="default" onClick={handleSubmit}>保存</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 只读字段：实例 ID / 库存类型 / 状态 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>实例ID</Label>
            <Input value={stock.instanceId} disabled className="bg-gray-50" />
          </div>
          <div>
            <Label>作物名称</Label>
            <Input value={stock.cropName || '-'} disabled className="bg-gray-50" />
          </div>
        </div>

        {/* 可编辑字段 */}
        <div className="grid grid-cols-2 gap-4">
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
        </div>

        <div className="grid grid-cols-2 gap-4">
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
            <Label>备注</Label>
            <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
        </div>

        {/* 只读信息提示 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
          <p className="font-semibold mb-1">编辑说明</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>数量和仓库变更后会自动重算冻结状态（如全部冻结→部分冻结）</li>
            <li>冻结中的库存仍可编辑（不影响已冻结的配额）</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}
