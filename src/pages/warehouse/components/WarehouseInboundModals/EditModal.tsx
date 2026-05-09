/**
 * 入库编辑弹窗组件
 * 从 InboundModals 拆分出来，独立管理编辑入库记录弹窗
 */

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { InboundRecord, InboundMaterial } from '../../../types/warehouseInbound.types';
import { Button } from '@/components/ui/button';

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
  // 编辑后的物料列表
  const [editedMaterials, setEditedMaterials] = useState<InboundMaterial[]>([]);

  // 初始化编辑数据
  useEffect(() => {
    if (record) {
      setEditedMaterials(record.materials);
    }
  }, [record]);

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
      materialCode: '',
      materialName: '',
      category: '',
      bigCategory: '',
      midCategory: '',
      subCategory: '',
      specification: '',
      barcode: '',
      unit: '袋',
      quantity: 0,
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

  // 保存
  const handleSave = () => {
    onSave({ ...record, materials: editedMaterials });
    onClose();
  };

  // 状态标签
  const statusLabels: Record<string, { text: string; className: string }> = {
    pending: { text: '待审核', className: 'text-amber-600' },
    completed: { text: '已完成', className: 'text-green-600' },
    voided: { text: '已作废', className: 'text-gray-500' },
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl shadow-xl max-h-[90vh] flex flex-col">
        {/* 标题栏 */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-600 flex-shrink-0">
          <h3 className="text-lg font-semibold text-white">编辑入库记录</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto flex-1">
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
                <span className="text-sm font-medium text-gray-900">{record.supplier}</span>
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
              <table className="text-xs" style={{ tableLayout: 'auto', minWidth: '1200px' }}>
                <colgroup>
                  <col style={{ width: '50px', minWidth: '50px' }} />
                  <col style={{ width: '120px', minWidth: '120px' }} />
                  <col style={{ width: '150px', minWidth: '150px' }} />
                  <col style={{ width: '180px', minWidth: '180px' }} />
                  <col style={{ width: '150px', minWidth: '150px' }} />
                  <col style={{ width: '80px', minWidth: '80px' }} />
                  <col style={{ width: '60px', minWidth: '60px' }} />
                  <col style={{ width: '70px', minWidth: '70px' }} />
                  <col style={{ width: '80px', minWidth: '80px' }} />
                  <col style={{ width: '120px', minWidth: '120px' }} />
                  <col style={{ width: '100px', minWidth: '100px' }} />
                  <col style={{ width: '100px', minWidth: '100px' }} />
                </colgroup>
                <thead className="bg-blue-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold text-blue-800">操作</th>
                    <th className="px-2 py-2 text-left font-semibold text-blue-800">物料编码</th>
                    <th className="px-2 py-2 text-left font-semibold text-blue-800">物料名称</th>
                    <th className="px-2 py-2 text-left font-semibold text-blue-800">分类</th>
                    <th className="px-2 py-2 text-left font-semibold text-blue-800">规格</th>
                    <th className="px-2 py-2 text-left font-semibold text-blue-800">单位</th>
                    <th className="px-2 py-2 text-left font-semibold text-blue-800">数量</th>
                    <th className="px-2 py-2 text-left font-semibold text-blue-800">单价</th>
                    <th className="px-2 py-2 text-left font-semibold text-blue-800">批号</th>
                    <th className="px-2 py-2 text-left font-semibold text-blue-800">生产日期</th>
                    <th className="px-2 py-2 text-left font-semibold text-blue-800">有效期至</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {editedMaterials.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-2 py-1.5">
                        {record.status === 'pending' ? (
                          <button
                            onClick={() => handleDeleteMaterial(m.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-1 py-1.5">
                        {record.status === 'pending' ? (
                          <input
                            type="text"
                            value={m.materialCode}
                            onChange={(e) => handleMaterialChange(m.id, 'materialCode', e.target.value)}
                            className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                          />
                        ) : (
                          <span className="text-xs text-blue-600 font-medium">{m.materialCode}</span>
                        )}
                      </td>
                      <td className="px-1 py-1.5">
                        {record.status === 'pending' ? (
                          <input
                            type="text"
                            value={m.materialName}
                            onChange={(e) => handleMaterialChange(m.id, 'materialName', e.target.value)}
                            className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                          />
                        ) : (
                          <span className="text-xs text-gray-900">{m.materialName}</span>
                        )}
                      </td>
                      <td className="px-1 py-1.5">
                        {record.status === 'pending' ? (
                          <input
                            type="text"
                            value={m.category}
                            onChange={(e) => handleMaterialChange(m.id, 'category', e.target.value)}
                            className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                          />
                        ) : (
                          <span className="text-xs text-gray-600">{m.category || '-'}</span>
                        )}
                      </td>
                      <td className="px-1 py-1.5">
                        {record.status === 'pending' ? (
                          <input
                            type="text"
                            value={m.specification}
                            onChange={(e) => handleMaterialChange(m.id, 'specification', e.target.value)}
                            className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                          />
                        ) : (
                          <span className="text-xs text-gray-600">{m.specification || '-'}</span>
                        )}
                      </td>
                      <td className="px-1 py-1.5">
                        {record.status === 'pending' ? (
                          <input
                            type="text"
                            value={m.unit}
                            onChange={(e) => handleMaterialChange(m.id, 'unit', e.target.value)}
                            className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                          />
                        ) : (
                          <span className="text-xs text-gray-600">{m.unit}</span>
                        )}
                      </td>
                      <td className="px-1 py-1.5">
                        {record.status === 'pending' ? (
                          <input
                            type="number"
                            value={m.quantity}
                            onChange={(e) => handleMaterialChange(m.id, 'quantity', Number(e.target.value))}
                            className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                          />
                        ) : (
                          <span className="text-xs text-gray-900">{m.quantity}</span>
                        )}
                      </td>
                      <td className="px-1 py-1.5">
                        {record.status === 'pending' ? (
                          <input
                            type="text"
                            value={m.price}
                            onChange={(e) => handleMaterialChange(m.id, 'price', e.target.value)}
                            className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                          />
                        ) : (
                          <span className="text-xs text-gray-900">{m.price}</span>
                        )}
                      </td>
                      <td className="px-1 py-1.5">
                        {record.status === 'pending' ? (
                          <input
                            type="text"
                            value={m.batchNo}
                            onChange={(e) => handleMaterialChange(m.id, 'batchNo', e.target.value)}
                            className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                          />
                        ) : (
                          <span className="text-xs text-gray-600">{m.batchNo || '-'}</span>
                        )}
                      </td>
                      <td className="px-1 py-1.5">
                        {record.status === 'pending' ? (
                          <input
                            type="text"
                            value={m.productionDate}
                            onChange={(e) => handleMaterialChange(m.id, 'productionDate', e.target.value)}
                            className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                          />
                        ) : (
                          <span className="text-xs text-gray-600">{m.productionDate || '-'}</span>
                        )}
                      </td>
                      <td className="px-1 py-1.5">
                        {record.status === 'pending' ? (
                          <input
                            type="text"
                            value={m.expiryDate}
                            onChange={(e) => handleMaterialChange(m.id, 'expiryDate', e.target.value)}
                            className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                          />
                        ) : (
                          <span className="text-xs text-gray-600">{m.expiryDate || '-'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          {record.status === 'completed' && (
            <Button variant="warning" onClick={() => alert('申请作废功能待实现')}>
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
      </div>
    </div>
  );
};

export default InboundEditModal;
