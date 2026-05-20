/**
 * 入库编辑弹窗组件
 * 从 InboundModals 拆分出来，独立管理编辑入库记录弹窗
 */

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { InboundRecord, InboundMaterial } from '../../../types/warehouseInbound.types';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/NumberInput';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useSupplierStore } from '@/stores/useSupplierStore';
import { showAlert } from '@/lib/dialogService';

interface InboundEditModalProps {
  record: InboundRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: InboundRecord) => void;
}

export const InboundEditModal: React.FC<InboundEditModalProps> = ({
  record,
  isOpen,
  onClose,
  onSave,
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
    const updated = editedMaterials.map(m =>
      m.id === materialId ? { ...m, [field]: value } : m
    );
    setEditedMaterials(updated);
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
      bigCategory: '',
      midCategory: '',
      subCategory: '',
      specification: '',
      barcode: '',
      unit: '袋',
      quantity: 0,
      price: '',
      location: '',
      batchNo: '',
      productionDate: '',
      expiryDate: '',
      remarks: '',
    };
    setEditedMaterials([...editedMaterials, newMaterial]);
  };

  // 保存
  const handleSave = () => {
    onSave({ ...record, supplier: editedSupplier, materials: editedMaterials });
    onClose();
  };

  // 状态标签
  const statusLabels: Record<string, { text: string; className: string }> = {
    pending: { text: '待审核', className: 'text-amber-600' },
    completed: { text: '已完成', className: 'text-green-600' },
    voided: { text: '已作废', className: 'text-gray-500' },
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑入库记录"
      size="xxl"
      showFooter={true}
      footer={
        <div className="flex justify-end gap-3">
          {record.status === 'completed' && (
            <Button variant="warning" onClick={() => showAlert('申请作废功能待实现')}>
              申请作废
            </Button>
          )}
          {record.status === 'pending' && (
            <Button variant="blue" onClick={handleSave}>
              保存
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            关闭
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
            <div className="mb-4 p-3 bg-gray-100 border border-gray-300 rounded-lg flex items-center gap-2">
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
                  <Input
                    type="text"
                    value={editedSupplier}
                    onChange={(e) => setEditedSupplier(e.target.value)}
                    placeholder="选择或输入供应商名称"
                    list="edit-supplier-list"
                    className="h-7 text-sm"
                  />
                ) : (
                  <span className="text-sm font-medium text-gray-900">{record.supplier}</span>
                )}
                <datalist id="edit-supplier-list">
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">操作员</span>
                <span className="text-sm font-medium text-gray-900">{record.operator}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">状态</span>
                <span className={`text-sm font-medium ${statusLabels[record.status]?.className}`}>
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
              <Table className="text-xs" style={{ minWidth: '1200px' }}>
                <TableHeader>
                  <TableRow className="bg-blue-50 sticky top-0 z-10">
                    <TableHead className="px-2 py-2 text-xs font-semibold text-blue-800">操作</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-blue-800">物料编码</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-blue-800">物料名称</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-blue-800">分类</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-blue-800">规格</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-blue-800">单位</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-blue-800">数量</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-blue-800">单价</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-blue-800">批号</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-blue-800">生产日期</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-blue-800">有效期至</TableHead>
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
                          <Input
                            type="text"
                            value={m.name}
                            onChange={(e) => handleMaterialChange(m.id, 'name', e.target.value)}
                            className="h-6 px-1 text-xs"
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
                          <Input
                            type="text"
                            value={m.productionDate}
                            onChange={(e) => handleMaterialChange(m.id, 'productionDate', e.target.value)}
                            className="h-6 px-1 text-xs"
                          />
                        ) : (
                          <span className="text-xs text-gray-600">{m.productionDate || '-'}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-1 py-1.5">
                        {record.status === 'pending' ? (
                          <Input
                            type="text"
                            value={m.expiryDate}
                            onChange={(e) => handleMaterialChange(m.id, 'expiryDate', e.target.value)}
                            className="h-6 px-1 text-xs"
                          />
                        ) : (
                          <span className="text-xs text-gray-600">{m.expiryDate || '-'}</span>
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
