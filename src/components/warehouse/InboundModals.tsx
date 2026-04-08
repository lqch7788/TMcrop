import { X, Package, Plus, Trash2, ChevronRight, AlertTriangle, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { InboundRecord, InboundMaterial } from './MaterialInboundTab';

interface InboundDetailModalProps {
  record: InboundRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InboundDetailModal({ record, isOpen, onClose }: InboundDetailModalProps) {
  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-5xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-emerald-600 flex-shrink-0">
          <h3 className="text-lg font-semibold text-white">入库记录详情</h3>
          <button onClick={onClose} className="text-white hover:bg-emerald-700 p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <div className="bg-emerald-50 rounded-lg p-4 mb-6 border border-emerald-200">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <span className="text-xs text-emerald-600 block font-medium">入库单号</span>
                <span className="text-lg font-mono font-bold text-emerald-700">{record.code}</span>
              </div>
              <div>
                <span className="text-xs text-emerald-600 block font-medium">入库日期</span>
                <span className="text-sm font-medium text-gray-900">{record.inboundDate}</span>
              </div>
              <div>
                <span className="text-xs text-emerald-600 block font-medium">供应商</span>
                <span className="text-sm font-medium text-gray-900">{record.supplier}</span>
              </div>
              <div>
                <span className="text-xs text-emerald-600 block font-medium">操作员</span>
                <span className="text-sm font-medium text-gray-900">{record.operator}</span>
              </div>
              <div>
                <span className="text-xs text-emerald-600 block font-medium">状态</span>
                <span className={`text-sm font-medium ${
                  record.status === 'completed' ? 'text-green-600' :
                  record.status === 'voided' ? 'text-gray-500' :
                  'text-amber-600'
                }`}>
                  {record.status === 'completed' ? '已完成' : record.status === 'voided' ? '已作废' : '待审核'}
                </span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-emerald-200">
              <span className="text-xs text-emerald-600">物料统计：</span>
              <span className="text-sm font-medium text-gray-900 ml-2">
                共 {record.materials.length} 种物料，合计 {record.materials.reduce((sum, m) => sum + Number(m.quantity), 0)} 件
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              物料明细
            </h4>
            <div className="overflow-auto rounded-lg border border-gray-200 max-h-96">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">物料编码</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">物料名称</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">分类</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">规格</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">条形码</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">单位</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">数量</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">单价</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">供应商</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">存放位置</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">批号</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">生产日期</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">有效期至</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">备注</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {record.materials.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-blue-600 font-medium whitespace-nowrap">{m.materialCode}</td>
                      <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">{m.materialName}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.category || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.specification || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.barcode || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.unit}</td>
                      <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">{m.quantity}</td>
                      <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">{m.price}元</td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.supplier || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.location || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.batchNo || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.productionDate || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.expiryDate || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

interface InboundEditModalProps {
  record: InboundRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: InboundRecord) => void;
}

export function InboundEditModal({ record, isOpen, onClose, onSave }: InboundEditModalProps) {
  if (!isOpen || !record) return null;

  const [editedMaterials, setEditedMaterials] = useState<InboundMaterial[]>([]);

  useEffect(() => {
    if (record) {
      setEditedMaterials(record.materials);
    }
  }, [record]);

  const handleMaterialChange = (materialId: number, field: keyof InboundMaterial, value: string | number) => {
    const updated = editedMaterials.map(m =>
      m.id === materialId ? { ...m, [field]: value } : m
    );
    setEditedMaterials(updated);
  };

  const handleDeleteMaterial = (materialId: number) => {
    setEditedMaterials(editedMaterials.filter(m => m.id !== materialId));
  };

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

  const handleSave = () => {
    onSave({ ...record, materials: editedMaterials });
    onClose();
  };

  const statusLabels: Record<string, { text: string; className: string }> = {
    pending: { text: '待审核', className: 'text-amber-600' },
    completed: { text: '已完成', className: 'text-green-600' },
    voided: { text: '已作废', className: 'text-gray-500' },
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-600 flex-shrink-0">
          <h3 className="text-lg font-semibold text-white">编辑入库记录</h3>
          <button onClick={onClose} className="text-white hover:bg-blue-700 p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
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

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-800">物料明细（{editedMaterials.length}种物料）</h4>
              {record.status === 'pending' && (
                <button
                  onClick={handleAddMaterial}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700"
                >
                  <Plus className="w-3 h-3" />
                  添加物料
                </button>
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
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          {record.status === 'completed' && (
            <button
              onClick={() => alert('申请作废功能待实现')}
              className="h-10 px-5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
            >
              申请作废
            </button>
          )}
          {record.status === 'pending' && (
            <button
              onClick={handleSave}
              className="h-10 px-5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              保存
            </button>
          )}
          <button
            onClick={onClose}
            className="h-10 px-5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

interface InboundBatchEditModalProps {
  records: InboundRecord[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (records: InboundRecord[]) => void;
}

export function InboundBatchEditModal({ records, isOpen, onClose, onSave }: InboundBatchEditModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editedRecords, setEditedRecords] = useState<InboundRecord[]>(records);
  const [editedMaterials, setEditedMaterials] = useState<Record<number, InboundMaterial[]>>({});
  const [showVoidModal, setShowVoidModal] = useState(false);

  useEffect(() => {
    setEditedRecords(records);
    setCurrentIndex(0);
    setEditedMaterials({});
  }, [records]);

  if (!isOpen || editedRecords.length === 0) return null;

  const currentRecord = editedRecords[currentIndex];
  const currentEditedMaterials = editedMaterials[currentRecord.id] || currentRecord.materials;

  const handleMaterialChange = (materialId: number, field: keyof InboundMaterial, value: string | number) => {
    const updatedMaterials = currentEditedMaterials.map(m =>
      m.id === materialId ? { ...m, [field]: value } : m
    );
    setEditedMaterials({ ...editedMaterials, [currentRecord.id]: updatedMaterials });
  };

  const handleDeleteMaterial = (materialId: number) => {
    const updatedMaterials = currentEditedMaterials.filter(m => m.id !== materialId);
    setEditedMaterials({ ...editedMaterials, [currentRecord.id]: updatedMaterials });
  };

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
    setEditedMaterials({ ...editedMaterials, [currentRecord.id]: [...currentEditedMaterials, newMaterial] });
  };

  const handleRecordChange = (field: keyof InboundRecord, value: string) => {
    const updatedRecords = editedRecords.map((r, idx) =>
      idx === currentIndex ? { ...r, [field]: value } : r
    );
    setEditedRecords(updatedRecords);
  };

  const handleNext = () => {
    if (currentIndex < records.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handleSaveAll = () => {
    const finalRecords = editedRecords.map(r => ({
      ...r,
      materials: editedMaterials[r.id] || r.materials,
    }));
    onSave(finalRecords);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-7xl shadow-xl max-h-[calc(100vh-2rem)] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-600 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-white">批量编辑入库记录</h3>
            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded">
              已选择 {records.length} 条
            </span>
          </div>
          <button onClick={onClose} className="text-white hover:bg-blue-700 p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          {/* 状态提示 */}
          {currentRecord.status === 'completed' && (
            <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-xs text-amber-700">此记录已完成，物料明细不可编辑。如需修改请申请作废后重新录入。</span>
            </div>
          )}
          {currentRecord.status === 'voided' && (
            <div className="mb-3 p-2 bg-gray-100 border border-gray-300 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-xs text-gray-600">此记录已作废，仅供查看，无法编辑。</span>
            </div>
          )}

          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">选择入库记录</label>
              <select
                value={currentRecord.id}
                onChange={(e) => {
                  const idx = records.findIndex(r => r.id === Number(e.target.value));
                  if (idx >= 0) setCurrentIndex(idx);
                }}
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                {records.map((r, idx) => (
                  <option key={r.id} value={r.id}>
                    {r.code} - {r.supplier} ({r.materials.length}种物料) {editedMaterials[r.id] && <span className="bg-green-100 text-green-700">✅ 已编辑</span>} {idx !== currentIndex ? '' : '←'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">入库单号</label>
              <input
                type="text"
                value={currentRecord.code}
                readOnly
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">入库日期</label>
              <input
                type="date"
                value={currentRecord.inboundDate}
                readOnly
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">供应商</label>
              <input
                type="text"
                value={currentRecord.supplier}
                readOnly
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">操作员</label>
              <input
                type="text"
                value={currentRecord.operator}
                readOnly
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">状态</label>
              <select
                value={currentRecord.status}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm bg-gray-100"
              >
                <option value="pending">待审核</option>
                <option value="completed">已完成</option>
                <option value="voided">已作废</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h4 className="text-sm font-semibold text-gray-800">物料明细（{currentEditedMaterials.length}种物料）</h4>
            {currentRecord.status === 'pending' && (
              <button
                onClick={handleAddMaterial}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700"
              >
                <Plus className="w-3 h-3" />
                添加物料
              </button>
            )}
          </div>
          <div className="flex-1 overflow-auto rounded-lg border border-gray-200 bg-white">
            <table className="text-xs" style={{ tableLayout: 'auto' }}>
              <colgroup>
                <col style={{ width: '50px', minWidth: '50px' }} />
                <col style={{ width: '120px', minWidth: '120px' }} />
                <col style={{ width: '180px', minWidth: '180px' }} />
                <col style={{ width: '150px', minWidth: '150px' }} />
                <col style={{ width: '200px', minWidth: '200px' }} />
                <col style={{ width: '120px', minWidth: '120px' }} />
                <col style={{ width: '70px', minWidth: '70px' }} />
                <col style={{ width: '80px', minWidth: '80px' }} />
                <col style={{ width: '80px', minWidth: '80px' }} />
                <col style={{ width: '150px', minWidth: '150px' }} />
                <col style={{ width: '120px', minWidth: '120px' }} />
                <col style={{ width: '120px', minWidth: '120px' }} />
                <col style={{ width: '130px', minWidth: '130px' }} />
                <col style={{ width: '130px', minWidth: '130px' }} />
                <col style={{ width: '150px', minWidth: '150px' }} />
              </colgroup>
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600">操作</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600">物料编码</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600">物料名称</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600">分类</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600">规格</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600">条形码</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600">单位</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600">数量</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600">单价</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600">供应商</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600">存放位置</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600">批号</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600">生产日期</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600">有效期至</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600">备注</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentEditedMaterials.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-2 py-1.5">
                      {currentRecord.status === 'pending' ? (
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
                      {currentRecord.status === 'pending' ? (
                        <input
                          type="text"
                          value={m.materialCode}
                          onChange={(e) => handleMaterialChange(m.id, 'materialCode', e.target.value)}
                          className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      ) : (
                        <span className="text-xs text-gray-900">{m.materialCode || '-'}</span>
                      )}
                    </td>
                    <td className="px-1 py-1.5">
                      {currentRecord.status === 'pending' ? (
                        <input
                          type="text"
                          value={m.materialName}
                          onChange={(e) => handleMaterialChange(m.id, 'materialName', e.target.value)}
                          className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      ) : (
                        <span className="text-xs text-gray-900">{m.materialName || '-'}</span>
                      )}
                    </td>
                    <td className="px-1 py-1.5">
                      {currentRecord.status === 'pending' ? (
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
                      {currentRecord.status === 'pending' ? (
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
                      {currentRecord.status === 'pending' ? (
                        <input
                          type="text"
                          value={m.barcode}
                          onChange={(e) => handleMaterialChange(m.id, 'barcode', e.target.value)}
                          className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      ) : (
                        <span className="text-xs text-gray-600">{m.barcode || '-'}</span>
                      )}
                    </td>
                    <td className="px-1 py-1.5">
                      {currentRecord.status === 'pending' ? (
                        <input
                          type="text"
                          value={m.unit}
                          onChange={(e) => handleMaterialChange(m.id, 'unit', e.target.value)}
                          className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      ) : (
                        <span className="text-xs text-gray-600">{m.unit || '-'}</span>
                      )}
                    </td>
                    <td className="px-1 py-1.5">
                      {currentRecord.status === 'pending' ? (
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
                      {currentRecord.status === 'pending' ? (
                        <input
                          type="text"
                          value={m.price}
                          onChange={(e) => handleMaterialChange(m.id, 'price', e.target.value)}
                          className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      ) : (
                        <span className="text-xs text-gray-900">{m.price}元</span>
                      )}
                    </td>
                    <td className="px-1 py-1.5">
                      {currentRecord.status === 'pending' ? (
                        <input
                          type="text"
                          value={m.supplier}
                          onChange={(e) => handleMaterialChange(m.id, 'supplier', e.target.value)}
                          className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      ) : (
                        <span className="text-xs text-gray-600">{m.supplier || '-'}</span>
                      )}
                    </td>
                    <td className="px-1 py-1.5">
                      {currentRecord.status === 'pending' ? (
                        <input
                          type="text"
                          value={m.location}
                          onChange={(e) => handleMaterialChange(m.id, 'location', e.target.value)}
                          className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      ) : (
                        <span className="text-xs text-gray-600">{m.location || '-'}</span>
                      )}
                    </td>
                    <td className="px-1 py-1.5">
                      {currentRecord.status === 'pending' ? (
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
                      {currentRecord.status === 'pending' ? (
                        <input
                          type="date"
                          value={m.productionDate}
                          onChange={(e) => handleMaterialChange(m.id, 'productionDate', e.target.value)}
                          className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      ) : (
                        <span className="text-xs text-gray-600">{m.productionDate || '-'}</span>
                      )}
                    </td>
                    <td className="px-1 py-1.5">
                      {currentRecord.status === 'pending' ? (
                        <input
                          type="date"
                          value={m.expiryDate}
                          onChange={(e) => handleMaterialChange(m.id, 'expiryDate', e.target.value)}
                          className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      ) : (
                        <span className="text-xs text-gray-600">{m.expiryDate || '-'}</span>
                      )}
                    </td>
                    <td className="px-1 py-1.5">
                      {currentRecord.status === 'pending' ? (
                        <input
                          type="text"
                          value={m.remarks}
                          onChange={(e) => handleMaterialChange(m.id, 'remarks', e.target.value)}
                          className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      ) : (
                        <span className="text-xs text-gray-600">{m.remarks || '-'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={() => setShowVoidModal(true)}
            className="h-10 px-5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
          >
            申请作废
          </button>
          <button
            onClick={handleNext}
            className="h-10 px-5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
          >
            确认{currentIndex < records.length - 1 ? '(下一个)' : '(已最后一个)'}
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleSaveAll}
            className="h-10 px-5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            保存全部（{records.length}个）
          </button>
        </div>

        {/* 申请作废确认弹窗 */}
        {showVoidModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl max-h-[80vh] flex flex-col">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-orange-500 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-white" />
                  <h3 className="text-lg font-semibold text-white">申请作废确认</h3>
                </div>
                <button onClick={() => setShowVoidModal(false)} className="text-white hover:bg-orange-600 p-1 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-orange-700">
                      <p className="font-medium mb-1">警示预警</p>
                      <ul className="list-disc list-inside space-y-1 text-orange-600">
                        <li>作废后会影响系统其他的统计工作</li>
                        <li>会造成数据不准确</li>
                        <li>作废后，这个料单内容将无法使用和恢复</li>
                        <li>仅作为记录查看</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-gray-500 block">入库单号</span>
                      <span className="font-medium text-gray-900">{currentRecord.code}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">入库日期</span>
                      <span className="font-medium text-gray-900">{currentRecord.inboundDate}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">供应商</span>
                      <span className="font-medium text-gray-900">{currentRecord.supplier}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">物料数量</span>
                      <span className="font-medium text-gray-900">{currentEditedMaterials.length} 种</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">物料明细</h4>
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">物料编码</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">物料名称</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">规格</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">数量</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">单位</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {currentEditedMaterials.map((m) => (
                          <tr key={m.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-blue-600 font-medium">{m.materialCode || '-'}</td>
                            <td className="px-3 py-2 text-gray-900">{m.materialName || '-'}</td>
                            <td className="px-3 py-2 text-gray-600">{m.specification || '-'}</td>
                            <td className="px-3 py-2 text-gray-900">{m.quantity}</td>
                            <td className="px-3 py-2 text-gray-600">{m.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
                <button
                  onClick={() => setShowVoidModal(false)}
                  className="h-10 px-5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    alert('作废申请已提交');
                    setShowVoidModal(false);
                  }}
                  className="h-10 px-5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
                >
                  确认作废
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface InboundExportModalProps {
  records: InboundRecord[];
  isOpen: boolean;
  onClose: () => void;
}

export function InboundExportModal({ records, isOpen, onClose }: InboundExportModalProps) {
  const [exportFormat, setExportFormat] = useState('excel');

  if (!isOpen) return null;

  const handleExport = () => {
    console.log(`导出 ${records.length} 条记录，格式: ${exportFormat}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">选择导出格式</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500 mb-4">已选择 {records.length} 条入库记录</p>
          <div className="space-y-3">
            {[
              { value: 'excel', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
              { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
              { value: 'word', label: 'Word (.docx)', desc: '适用于文档编辑和分享' },
            ].map((format) => (
              <label
                key={format.value}
                className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                  exportFormat === format.value
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="exportFormat"
                  value={format.value}
                  checked={exportFormat === format.value}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-gray-900">{format.label}</span>
                  <span className="block text-xs text-gray-500">{format.desc}</span>
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 h-10 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              取消
            </button>
            <button
              onClick={handleExport}
              className="flex-1 h-10 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              确认导出
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface InboundAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Omit<InboundRecord, 'id'>) => void;
  onGenerateCode: () => string;
}

export function InboundAddModal({ isOpen, onClose, onSave, onGenerateCode }: InboundAddModalProps) {
  const [formData, setFormData] = useState({
    code: '',
    inboundDate: new Date().toISOString().split('T')[0],
    supplier: '',
    operator: '',
    status: 'pending' as 'pending' | 'completed',
  });
  const [materials, setMaterials] = useState<InboundMaterial[]>([]);

  if (!isOpen) return null;

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
    setMaterials([...materials, newMaterial]);
  };

  const handleMaterialChange = (id: number, field: keyof InboundMaterial, value: string | number) => {
    setMaterials(materials.map(m =>
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const handleDeleteMaterial = (id: number) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  const handleSave = () => {
    onSave({
      code: formData.code || onGenerateCode(),
      inboundDate: formData.inboundDate,
      supplier: formData.supplier,
      operator: formData.operator,
      status: formData.status,
      materials,
    });
    setFormData({
      code: '',
      inboundDate: new Date().toISOString().split('T')[0],
      supplier: '',
      operator: '',
      status: 'pending',
    });
    setMaterials([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-emerald-600 flex-shrink-0">
          <h3 className="text-lg font-semibold text-white">新增入库记录</h3>
          <button onClick={onClose} className="text-white hover:bg-emerald-700 p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-emerald-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-emerald-700 mb-1">入库单号</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="自动生成"
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-emerald-700 mb-1">入库日期</label>
              <input
                type="date"
                value={formData.inboundDate}
                onChange={(e) => setFormData({ ...formData, inboundDate: e.target.value })}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-emerald-700 mb-1">供应商</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-emerald-700 mb-1">操作员</label>
              <input
                type="text"
                value={formData.operator}
                onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-emerald-700 mb-1">状态</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pending' | 'completed' })}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm"
              >
                <option value="pending">待审核</option>
                <option value="completed">已完成</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-800">物料明细（{materials.length}种物料）</h4>
            <button
              onClick={handleAddMaterial}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700"
            >
              <Plus className="w-3 h-3" />
              添加物料
            </button>
          </div>
          {materials.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              暂无物料，请点击"添加物料"按钮添加
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">操作</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">物料编码</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">物料名称</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">分类</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">规格</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">条形码</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">单位</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">数量</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">单价</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">供应商</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">存放位置</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">批号</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">生产日期</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">有效期至</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">备注</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {materials.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteMaterial(m.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={m.materialCode}
                          onChange={(e) => handleMaterialChange(m.id, 'materialCode', e.target.value)}
                          className="w-20 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={m.materialName}
                          onChange={(e) => handleMaterialChange(m.id, 'materialName', e.target.value)}
                          className="w-24 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={m.category}
                          onChange={(e) => handleMaterialChange(m.id, 'category', e.target.value)}
                          className="w-20 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={m.specification}
                          onChange={(e) => handleMaterialChange(m.id, 'specification', e.target.value)}
                          className="w-16 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={m.barcode}
                          onChange={(e) => handleMaterialChange(m.id, 'barcode', e.target.value)}
                          className="w-20 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={m.unit}
                          onChange={(e) => handleMaterialChange(m.id, 'unit', e.target.value)}
                          className="w-12 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="number"
                          value={m.quantity}
                          onChange={(e) => handleMaterialChange(m.id, 'quantity', Number(e.target.value))}
                          className="w-16 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={m.price}
                          onChange={(e) => handleMaterialChange(m.id, 'price', e.target.value)}
                          className="w-16 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={m.supplier}
                          onChange={(e) => handleMaterialChange(m.id, 'supplier', e.target.value)}
                          className="w-20 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={m.location}
                          onChange={(e) => handleMaterialChange(m.id, 'location', e.target.value)}
                          className="w-16 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={m.batchNo}
                          onChange={(e) => handleMaterialChange(m.id, 'batchNo', e.target.value)}
                          className="w-20 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="date"
                          value={m.productionDate}
                          onChange={(e) => handleMaterialChange(m.id, 'productionDate', e.target.value)}
                          className="w-24 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="date"
                          value={m.expiryDate}
                          onChange={(e) => handleMaterialChange(m.id, 'expiryDate', e.target.value)}
                          className="w-24 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={m.remarks}
                          onChange={(e) => handleMaterialChange(m.id, 'remarks', e.target.value)}
                          className="w-20 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

interface InboundDeleteConfirmModalProps {
  records: InboundRecord[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function InboundDeleteConfirmModal({ records, isOpen, onClose, onConfirm }: InboundDeleteConfirmModalProps) {
  if (!isOpen || records.length === 0) return null;

  const totalMaterials = records.reduce((sum, r) => sum + r.materials.length, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">确认删除</h3>
        </div>
        <div className="text-sm text-gray-600 mb-6">
          <p>确定要删除选中的入库记录吗？</p>
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
            <p><strong>选中数量：</strong>{records.length} 条入库记录</p>
            <p><strong>物料总数：</strong>{totalMaterials} 种物料</p>
          </div>
          <p className="mt-2 text-red-500">此操作不可撤销</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-10 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-10 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
}
