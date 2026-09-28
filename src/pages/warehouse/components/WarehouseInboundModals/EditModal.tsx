/**
 * 入库编辑弹窗组件
 * 从 InboundModals 拆分出来，独立管理编辑入库记录弹窗
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, RotateCcw, Save, Trash2, X, XCircle } from 'lucide-react';
import { InboundRecord, InboundMaterial } from '../../../../types/warehouseInbound.types';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { NumberInput } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { todayLocal } from '@/lib/dateUtils';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { MaterialAutocomplete } from '@/components/common/MaterialAutocomplete';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { useSupplierStore } from '@/stores/useSupplierStore';
import { showAlert, showConfirm } from '@/lib/dialogService';
import { INBOUND_STATUS_LABELS } from '../../utils/warehouseInbound.utils';

interface InboundEditModalProps {
  record: InboundRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: InboundRecord) => void;
  /** 2026-09-27：请求冲销（红字单）——由页面打开冲销弹窗 */
  onRequestReversal?: (record: InboundRecord) => void;
  /** 2026-09-27：该单是否已被冲销（已冲销则隐藏"冲销"入口，防重复冲销） */
  isReversed?: boolean;
}

export const InboundEditModal: React.FC<InboundEditModalProps> = ({
  record,
  isOpen,
  onClose,
  onSave,
  onRequestReversal,
  isReversed = false,
}) => {
  // 供应商列表
  const suppliers = useSupplierStore((s) => s.items);
  const loadSuppliers = useSupplierStore((s) => s.loadItems);

  // 编辑后表单数据
  const [editedSupplier, setEditedSupplier] = useState('');
  const [editedMaterials, setEditedMaterials] = useState<InboundMaterial[]>([]);

  // 初始化编辑数据
  useEffect(() => {
    if (record) {
      setEditedSupplier(record.supplier);
      setEditedMaterials(record.materials);
      if (suppliers.length === 0) loadSuppliers();
    }
  }, [record, suppliers.length, loadSuppliers]);

  if (!isOpen || !record) return null;

  // 修改物料字段
  const handleMaterialChange = (materialId: number, field: keyof InboundMaterial, value: string | number) => {
    setEditedMaterials((prev) => prev.map(m =>
      m.id === materialId ? { ...m, [field]: value } : m
    ));
  };

  // 删除物料
  const handleDeleteMaterial = (materialId: number) => {
    setEditedMaterials(editedMaterials.filter(m => m.id !== materialId));
  };

  // 添加物料
  const handleAddMaterial = () => {
    const newMaterial: InboundMaterial = {
      id: Date.now(),
      code: '',
      name: '',
      category: '',
      specification: '',
      barcode: '',
      unit: '袋',
      quantity: 0,
      // 2026-09-27：库存阈值不在入库明细维护（属物料主数据，在物料库存页编辑/批量编辑）
      price: '',
      supplier: '',
      location: '',
      batchNo: '',
      productionDate: '',
      expiryDate: '',
      remarks: '',
    };
    setEditedMaterials([...editedMaterials, newMaterial]);
  };

  /**
   * 作废已完成入库单（2026-09-27）：
   * 后端在同一事务内回收库存（数量/批次账/流水），单据保留为"已作废"供追溯；作废后可删除单据。
   * 此前该按钮是 showAlert 占位（功能未实现），导致"已完成单既删不掉、也无法作废"的死胡同。
   */
  const handleVoid = async () => {
    const ok = await showConfirm(
      '作废将立即回收该单的全部入库库存（数量、批次账、流水），单据保留为"已作废"可追溯。\n作废后可删除该单据。确定作废？'
    );
    if (!ok) return;
    // 走 PUT（onSave → hook.onSaveInboundEdit）：后端检测 completed→voided 触发库存回收
    onSave({ ...record, status: 'voided' });
  };

  // 保存
  const handleSave = () => {
    // 2026-09-27：明细继承单头供应商（与新增弹窗同口径，后端另有单头兜底）
    const materialsWithSupplier = editedMaterials.map(m => ({
      ...m,
      supplier: m.supplier || editedSupplier,
    }));
    onSave({ ...record, supplier: editedSupplier, materials: materialsWithSupplier });
    onClose();
  };

  // 状态标签统一取自 utils（2026-09-28：此前本文件另写一份中文映射，4 处硬编码易漂移）
  const statusLabels = INBOUND_STATUS_LABELS;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑入库记录"
      size="xxl"
      showFooter={true}
      footer={
        <div className="flex justify-end gap-3">
          {/* 2026-09-27：冲销单为不可变更凭证（红字单），不提供任何修改/作废/再冲销操作 */}
          {record.recordType === 'reversal' ? (
            <span className="text-sm text-gray-500 mr-auto self-center">
              冲销单为不可变更凭证，仅供查看；如需纠正请对新的入库单操作
            </span>
          ) : record.status === 'completed' && (
            <>
              {/* 2026-09-27：冲销（红字单）——适用于货已被领用、无法全额作废的场景；
                  作废仅适用于货未动用的场景（全额回收），冲销按"仍在库存中的量"回收；
                  已冲销的单隐藏该入口（防重复冲销） */}
              {!isReversed && (
                <Button
                  variant="outline"
                  onClick={() => onRequestReversal?.(record)}
                  title="冲销：原单保留，生成红字单并回收仍在库存中的数量（已领用部分不回收）"
                >
                  <RotateCcw className="w-4 h-4" /> 冲销
                </Button>
              )}
              {isReversed && (
                <span className="text-xs text-gray-500 self-center mr-2">该单已被冲销</span>
              )}
              <Button variant="warning" onClick={handleVoid} title="作废：适用于货未动用的场景（全额回收入库量）">
                <XCircle className="w-4 h-4" /> 作废（回收库存）
              </Button>
            </>
          )}
          {record.status === 'pending' && (
            <Button variant="blue" onClick={handleSave}>
              <Save className="w-4 h-4" /> 保存
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            <X className="w-4 h-4" /> 关闭
          </Button>
        </div>
      }
    >
      <div className="overflow-y-auto flex-1">
          {/* 状态提示 */}
          {record.status === 'completed' && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-sm text-amber-700">此记录已完成，物料明细不可编辑。如需修改请申请作废后重新录入。</span>
            </div>
          )}
          {record.status === 'voided' && (
            <div className="mb-4 p-3 bg-gray-100 border border-gray-400 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm text-gray-600">此记录已作废，仅供查看，无法编辑。</span>
            </div>
          )}

          {/* 基本信息 */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <span className="text-xs text-gray-500 block">入库单号</span>
                <span className="text-sm font-medium text-gray-900">{record.code}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">入库日期</span>
                <span className="text-sm font-medium text-gray-900">{record.inboundDate}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">供应商</span>
                {record.status === 'pending' ? (
                  <SearchableSelect
                    value={editedSupplier}
                    onChange={setEditedSupplier}
                    options={suppliers.map((s) => ({ value: s.name, label: s.name }))}
                    placeholder="搜索或选择供应商"
                    allowClear
                  />
                ) : (
                  <span className="text-sm font-medium text-gray-900">{record.supplier}</span>
                )}
              </div>
              <div>
                <span className="text-xs text-gray-500 block">操作员</span>
                <span className="text-sm font-medium text-gray-900">{record.operator}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">状态</span>
                <span className={`text-sm font-medium ${statusLabels[record.status]?.textClassName || 'text-gray-600'}`}>
                  {statusLabels[record.status]?.text}
                </span>
              </div>
            </div>
          </div>

          {/* 物料明细 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-800">物料明细（{editedMaterials.length}种物料）</h4>
              {record.status === 'pending' && (
                <Button variant="blue" size="sm" onClick={handleAddMaterial}>
                  <Plus className="w-3 h-3" />
                  添加物料
                </Button>
              )}
            </div>
            <div className="overflow-auto rounded-lg border border-gray-200 bg-white max-h-80">
              <Table className="text-xs" style={{ minWidth: '1500px' }}>
                <TableHeader>
                  <TableRow className="bg-blue-50 sticky top-0 z-10">
                    <TableHead className="px-2 py-2 text-xs font-semibold text-blue-800">操作</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-blue-800">物料编码</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-blue-800">物料名称</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-blue-800">分类</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-blue-800">规格</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-blue-800">条形码</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-blue-800">单位</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-blue-800">数量</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-blue-800">单价</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-blue-800">存放位置</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-blue-800">批号</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-blue-800">生产日期</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-blue-800">有效期至</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-blue-800">备注</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editedMaterials.map((m) => (
                    <TableRow key={m.id} className="hover:bg-gray-50">
                      <TableCell className="px-2 py-1.5">
                        {record.status === 'pending' ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteMaterial(m.id)}
                            className="text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="px-1 py-1.5">
                        {record.status === 'pending' ? (
                          <Input
                            type="text"
                            value={m.code}
                            onChange={(e) => handleMaterialChange(m.id, 'code', e.target.value)}
                            className="h-6 px-1 text-xs"
                          />
                        ) : (
                          <span className="text-xs text-blue-600 font-medium">{m.code}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-1 py-1.5">
                        {record.status === 'pending' ? (
                          <MaterialAutocomplete
                            value={m.name}
                            onChange={(v) => handleMaterialChange(m.id, 'name', v)}
                            onSelect={(wm) => {
                              setEditedMaterials((prev) => prev.map(x =>
                                x.id === m.id ? {
                                  ...x,
                                  name: wm.name,
                                  code: wm.code || x.code,
                                  category: wm.category || x.category,
                                  specification: wm.specification || x.specification,
                                  barcode: wm.barcode || x.barcode,
                                  unit: wm.unit || x.unit,
                                  price: wm.price || x.price,
                                  location: wm.location || x.location,
                                } : x
                              ));
                            }}
                            placeholder="搜索物料名称"
                            className="w-32"
                          />
                        ) : (
                          <span className="text-xs text-gray-900">{m.name}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-1 py-1.5">
                        {record.status === 'pending' ? (
                          <Input
                            type="text"
                            value={m.category}
                            onChange={(e) => handleMaterialChange(m.id, 'category', e.target.value)}
                            className="h-6 px-1 text-xs"
                          />
                        ) : (
                          <span className="text-xs text-gray-600">{m.category || '-'}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-1 py-1.5">
                        {record.status === 'pending' ? (
                          <Input
                            type="text"
                            value={m.specification}
                            onChange={(e) => handleMaterialChange(m.id, 'specification', e.target.value)}
                            className="h-6 px-1 text-xs"
                          />
                        ) : (
                          <span className="text-xs text-gray-600">{m.specification || '-'}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-1 py-1.5">
                        {record.status === 'pending' ? (
                          <Input
                            type="text"
                            value={m.barcode}
                            onChange={(e) => handleMaterialChange(m.id, 'barcode', e.target.value)}
                            className="h-6 px-1 text-xs"
                          />
                        ) : (
                          <span className="text-xs text-gray-600">{m.barcode || '-'}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-1 py-1.5">
                        {record.status === 'pending' ? (
                          <Input
                            type="text"
                            value={m.unit}
                            onChange={(e) => handleMaterialChange(m.id, 'unit', e.target.value)}
                            className="h-6 px-1 text-xs"
                          />
                        ) : (
                          <span className="text-xs text-gray-600">{m.unit}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-1 py-1.5">
                        {record.status === 'pending' ? (
                          <NumberInput
                            value={m.quantity}
                            onChange={(val) => handleMaterialChange(m.id, 'quantity', Number(val))}
                            className="h-6 px-1 text-xs"
                            decimals={0}
                          />
                        ) : (
                          <span className="text-xs text-gray-900">{m.quantity}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-1 py-1.5">
                        {record.status === 'pending' ? (
                          <Input
                            type="text"
                            value={m.price}
                            onChange={(e) => handleMaterialChange(m.id, 'price', e.target.value)}
                            className="h-6 px-1 text-xs"
                          />
                        ) : (
                          <span className="text-xs text-gray-900">{m.price}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-1 py-1.5">
                        {record.status === 'pending' ? (
                          <Input
                            type="text"
                            value={m.location}
                            onChange={(e) => handleMaterialChange(m.id, 'location', e.target.value)}
                            className="h-6 px-1 text-xs"
                          />
                        ) : (
                          <span className="text-xs text-gray-600">{m.location || '-'}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-1 py-1.5">
                        {record.status === 'pending' ? (
                          <Input
                            type="text"
                            value={m.batchNo}
                            onChange={(e) => handleMaterialChange(m.id, 'batchNo', e.target.value)}
                            className="h-6 px-1 text-xs"
                          />
                        ) : (
                          <span className="text-xs text-gray-600">{m.batchNo || '-'}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-1 py-1.5">
                        {record.status === 'pending' ? (
                          // 2026-09-27：与新增弹窗统一为日期选择器（此前为纯文本输入，格式易错）
                          <DatePicker
                            selected={m.productionDate ? new Date(m.productionDate) : undefined}
                            onChange={(date) => handleMaterialChange(m.id, 'productionDate', todayLocal(date))}
                            placeholder="生产日期"
                          />
                        ) : (
                          <span className="text-xs text-gray-600">{m.productionDate || '-'}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-1 py-1.5">
                        {record.status === 'pending' ? (
                          <DatePicker
                            selected={m.expiryDate ? new Date(m.expiryDate) : undefined}
                            onChange={(date) => handleMaterialChange(m.id, 'expiryDate', todayLocal(date))}
                            placeholder="有效期至"
                          />
                        ) : (
                          <span className="text-xs text-gray-600">{m.expiryDate || '-'}</span>
                        )}
                      </TableCell>
                      {/* 2026-09-27：库存阈值（minStock/maxStock）属物料主数据，不在入库明细维护（改由物料库存页编辑） */}
                      <TableCell className="px-1 py-1.5">
                        {record.status === 'pending' ? (
                          <Input
                            type="text"
                            value={m.remarks}
                            onChange={(e) => handleMaterialChange(m.id, 'remarks', e.target.value)}
                            className="h-6 px-1 text-xs"
                          />
                        ) : (
                          <span className="text-xs text-gray-600">{m.remarks || '-'}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

    </UnifiedModal>
  );
};

export default InboundEditModal;
