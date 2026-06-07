import { Package, Plus, Trash2, ChevronRight, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { InboundRecord, InboundMaterial } from './MaterialInboundTab';
import { useUserStore } from '../../stores/useUserStore';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, TextRun } from 'docx';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { UnifiedModal } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { NumberInput } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';

interface InboundDetailModalProps {
  record: InboundRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InboundDetailModal({ record, isOpen, onClose }: InboundDetailModalProps) {
  if (!isOpen || !record) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="入库记录详情"
      size="xxl"
      showFooter={true}
      footer={
        <Button variant="secondary" onClick={onClose}>关闭</Button>
      }
      showMaximize={false}
      enableDrag={false}
      enableResize={false}
    >
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
          <Table className="min-w-full text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="px-3 py-2 text-sm font-semibold text-gray-600 whitespace-nowrap">物料编码</TableHead>
                <TableHead className="px-3 py-2 text-sm font-semibold text-gray-600 whitespace-nowrap">物料名称</TableHead>
                <TableHead className="px-3 py-2 text-sm font-semibold text-gray-600 whitespace-nowrap">分类</TableHead>
                <TableHead className="px-3 py-2 text-sm font-semibold text-gray-600 whitespace-nowrap">规格</TableHead>
                <TableHead className="px-3 py-2 text-sm font-semibold text-gray-600 whitespace-nowrap">条形码</TableHead>
                <TableHead className="px-3 py-2 text-sm font-semibold text-gray-600 whitespace-nowrap">单位</TableHead>
                <TableHead className="px-3 py-2 text-sm font-semibold text-gray-600 whitespace-nowrap">数量</TableHead>
                <TableHead className="px-3 py-2 text-sm font-semibold text-gray-600 whitespace-nowrap">单价</TableHead>
                <TableHead className="px-3 py-2 text-sm font-semibold text-gray-600 whitespace-nowrap">供应商</TableHead>
                <TableHead className="px-3 py-2 text-sm font-semibold text-gray-600 whitespace-nowrap">存放位置</TableHead>
                <TableHead className="px-3 py-2 text-sm font-semibold text-gray-600 whitespace-nowrap">批号</TableHead>
                <TableHead className="px-3 py-2 text-sm font-semibold text-gray-600 whitespace-nowrap">生产日期</TableHead>
                <TableHead className="px-3 py-2 text-sm font-semibold text-gray-600 whitespace-nowrap">有效期至</TableHead>
                <TableHead className="px-3 py-2 text-sm font-semibold text-gray-600 whitespace-nowrap">备注</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {record.materials.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="px-3 py-2 text-xs text-blue-600 font-medium whitespace-nowrap">{m.materialCode}</TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">{m.materialName}</TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.category || '-'}</TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.specification || '-'}</TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.barcode || '-'}</TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.unit}</TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">{m.quantity}</TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">{m.price}元</TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.supplier || '-'}</TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.location || '-'}</TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.batchNo || '-'}</TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.productionDate || '-'}</TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.expiryDate || '-'}</TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{m.remarks || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </UnifiedModal>
  );
}

interface InboundEditModalProps {
  record: InboundRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: InboundRecord) => void;
}

export function InboundEditModal({ record, isOpen, onClose, onSave }: InboundEditModalProps) {
  const [editedMaterials, setEditedMaterials] = useState<InboundMaterial[]>([]);

  useEffect(() => {
    if (record) {
      setEditedMaterials(record.materials);
    }
  }, [record]);

  if (!isOpen || !record) return null;

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
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑入库记录"
      size="xl"
      showFooter={true}
      footer={
        <>
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
        </>
      }
      showMaximize={false}
      enableDrag={false}
      enableResize={false}
    >
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
            <Button variant="blue" size="sm" onClick={handleAddMaterial}>
              <Plus className="w-3 h-3" />
              添加物料
            </Button>
          )}
        </div>
        <div className="overflow-auto rounded-lg border border-gray-200 bg-white max-h-80">
          <Table className="text-xs" style={{ tableLayout: 'auto', minWidth: '1200px' }}>
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
            <TableHeader>
              <TableRow>
                <TableHead className="px-2 py-2 font-semibold text-blue-800">操作</TableHead>
                <TableHead className="px-2 py-2 font-semibold text-blue-800">物料编码</TableHead>
                <TableHead className="px-2 py-2 font-semibold text-blue-800">物料名称</TableHead>
                <TableHead className="px-2 py-2 font-semibold text-blue-800">分类</TableHead>
                <TableHead className="px-2 py-2 font-semibold text-blue-800">规格</TableHead>
                <TableHead className="px-2 py-2 font-semibold text-blue-800">单位</TableHead>
                <TableHead className="px-2 py-2 font-semibold text-blue-800">数量</TableHead>
                <TableHead className="px-2 py-2 font-semibold text-blue-800">单价</TableHead>
                <TableHead className="px-2 py-2 font-semibold text-blue-800">批号</TableHead>
                <TableHead className="px-2 py-2 font-semibold text-blue-800">生产日期</TableHead>
                <TableHead className="px-2 py-2 font-semibold text-blue-800">有效期至</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editedMaterials.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="px-2 py-1.5">
                    {record.status === 'pending' ? (
                      <Button
                        size="icon"
                        variant="ghost"
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
                        value={m.materialCode}
                        onChange={(e) => handleMaterialChange(m.id, 'materialCode', e.target.value)}
                        className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                      />
                    ) : (
                      <span className="text-xs text-blue-600 font-medium">{m.materialCode}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-1 py-1.5">
                    {record.status === 'pending' ? (
                      <Input
                        type="text"
                        value={m.materialName}
                        onChange={(e) => handleMaterialChange(m.id, 'materialName', e.target.value)}
                        className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                      />
                    ) : (
                      <span className="text-xs text-gray-900">{m.materialName}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-1 py-1.5">
                    {record.status === 'pending' ? (
                      <Input
                        type="text"
                        value={m.category}
                        onChange={(e) => handleMaterialChange(m.id, 'category', e.target.value)}
                        className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
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
                        className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
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
                        className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                      />
                    ) : (
                      <span className="text-xs text-gray-600">{m.unit}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-1 py-1.5">
                    {record.status === 'pending' ? (
                      <NumberInput
                        value={m.quantity}
                        onChange={(val) => {
                          const num = val === '' ? 0 : Number(val);
                          handleMaterialChange(m.id, 'quantity', num);
                        }}
                        decimals={2}
                        className="h-8 px-2 text-xs"
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
                        className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
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
                        className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
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
                        className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
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
                        className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
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
    </UnifiedModal>
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
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="批量编辑入库记录"
      size="xxxl"
      showFooter={true}
      footer={
        <>
          <Button variant="warning" onClick={() => setShowVoidModal(true)}>
            申请作废
          </Button>
          <Button variant="secondary" onClick={handleNext}>
            确认{currentIndex < records.length - 1 ? '(下一个)' : '(已最后一个)'}
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="blue" onClick={handleSaveAll}>
            保存全部（{records.length}个）
          </Button>
        </>
      }
      showMaximize={false}
      enableDrag={false}
      enableResize={false}
      headerAction={
        <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs rounded">
          已选择 {records.length} 条
        </span>
      }
    >
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        {/* 状态提示 */}
        {currentRecord.status === 'completed' && (
          <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="text-xs text-amber-700">此记录已完成，物料明细不可编辑。如需修改请申请作废后重新录入。</span>
          </div>
        )}
        {currentRecord.status === 'voided' && (
          <div className="mb-3 p-2 bg-gray-100 border border-gray-400 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-xs text-gray-600">此记录已作废，仅供查看，无法编辑。</span>
          </div>
        )}

        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1">
            <Label className="block text-xs font-medium text-gray-600 mb-1">选择入库记录</Label>
            <Select
              value={String(currentRecord.id)}
              onValueChange={(val) => {
                const idx = records.findIndex(r => r.id === Number(val));
                if (idx >= 0) setCurrentIndex(idx);
              }}
            >
              <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500">
                <SelectValue placeholder="选择入库记录" />
              </SelectTrigger>
              <SelectContent>
                {records.map((r, idx) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.code} - {r.supplier} ({r.materials.length}种物料){editedMaterials[r.id] ? ' ✅ 已编辑' : ''}{idx !== currentIndex ? '' : ' ←'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-3">
          <div>
            <Label className="block text-xs font-medium text-gray-600 mb-1">入库单号</Label>
            <Input
              type="text"
              value={currentRecord.code}
              readOnly
              className="w-full h-8 px-2 border border-gray-200 rounded text-sm bg-gray-100"
            />
          </div>
          <div>
            <Label className="block text-xs font-medium text-gray-600 mb-1">入库日期</Label>
            <DatePicker
              selected={currentRecord.inboundDate ? new Date(currentRecord.inboundDate) : undefined}
              disabled={true}
              placeholder="入库日期"
            />
          </div>
          <div>
            <Label className="block text-xs font-medium text-gray-600 mb-1">供应商</Label>
            <Input
              type="text"
              value={currentRecord.supplier}
              readOnly
              className="w-full h-8 px-2 border border-gray-200 rounded text-sm bg-gray-100"
            />
          </div>
          <div>
            <Label className="block text-xs font-medium text-gray-600 mb-1">操作员</Label>
            <Input
              type="text"
              value={currentRecord.operator}
              readOnly
              className="w-full h-8 px-2 border border-gray-200 rounded text-sm bg-gray-100"
            />
          </div>
          <div>
            <Label className="block text-xs font-medium text-gray-600 mb-1">状态</Label>
            <Select value={currentRecord.status} disabled>
              <SelectTrigger className="w-full h-8 px-2 border border-gray-200 rounded text-sm bg-gray-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">待审核</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="voided">已作废</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <h4 className="text-sm font-semibold text-gray-800">物料明细（{currentEditedMaterials.length}种物料）</h4>
          {currentRecord.status === 'pending' && (
            <Button size="sm" onClick={handleAddMaterial}>
              <Plus className="w-3 h-3" />
              添加物料
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-auto rounded-lg border border-gray-200 bg-white">
          <Table className="text-xs" style={{ tableLayout: 'auto' }}>
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
            <TableHeader>
              <TableRow>
                <TableHead className="px-2 py-2 font-semibold text-gray-600">操作</TableHead>
                <TableHead className="px-2 py-2 font-semibold text-gray-600">物料编码</TableHead>
                <TableHead className="px-2 py-2 font-semibold text-gray-600">物料名称</TableHead>
                <TableHead className="px-2 py-2 font-semibold text-gray-600">分类</TableHead>
                <TableHead className="px-2 py-2 font-semibold text-gray-600">规格</TableHead>
                <TableHead className="px-2 py-2 font-semibold text-gray-600">条形码</TableHead>
                <TableHead className="px-2 py-2 font-semibold text-gray-600">单位</TableHead>
                <TableHead className="px-2 py-2 font-semibold text-gray-600">数量</TableHead>
                <TableHead className="px-2 py-2 font-semibold text-gray-600">单价</TableHead>
                <TableHead className="px-2 py-2 font-semibold text-gray-600">供应商</TableHead>
                <TableHead className="px-2 py-2 font-semibold text-gray-600">存放位置</TableHead>
                <TableHead className="px-2 py-2 font-semibold text-gray-600">批号</TableHead>
                <TableHead className="px-2 py-2 font-semibold text-gray-600">生产日期</TableHead>
                <TableHead className="px-2 py-2 font-semibold text-gray-600">有效期至</TableHead>
                <TableHead className="px-2 py-2 font-semibold text-gray-600">备注</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentEditedMaterials.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="px-2 py-1.5">
                    {currentRecord.status === 'pending' ? (
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteMaterial(m.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="px-1 py-1.5">
                    {currentRecord.status === 'pending' ? (
                      <Input
                        type="text"
                        value={m.materialCode}
                        onChange={(e) => handleMaterialChange(m.id, 'materialCode', e.target.value)}
                        className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                      />
                    ) : (
                      <span className="text-xs text-gray-900">{m.materialCode || '-'}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-1 py-1.5">
                    {currentRecord.status === 'pending' ? (
                      <Input
                        type="text"
                        value={m.materialName}
                        onChange={(e) => handleMaterialChange(m.id, 'materialName', e.target.value)}
                        className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                      />
                    ) : (
                      <span className="text-xs text-gray-900">{m.materialName || '-'}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-1 py-1.5">
                    {currentRecord.status === 'pending' ? (
                      <Input
                        type="text"
                        value={m.category}
                        onChange={(e) => handleMaterialChange(m.id, 'category', e.target.value)}
                        className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                      />
                    ) : (
                      <span className="text-xs text-gray-600">{m.category || '-'}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-1 py-1.5">
                    {currentRecord.status === 'pending' ? (
                      <Input
                        type="text"
                        value={m.specification}
                        onChange={(e) => handleMaterialChange(m.id, 'specification', e.target.value)}
                        className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                      />
                    ) : (
                      <span className="text-xs text-gray-600">{m.specification || '-'}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-1 py-1.5">
                    {currentRecord.status === 'pending' ? (
                      <Input
                        type="text"
                        value={m.barcode}
                        onChange={(e) => handleMaterialChange(m.id, 'barcode', e.target.value)}
                        className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                      />
                    ) : (
                      <span className="text-xs text-gray-600">{m.barcode || '-'}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-1 py-1.5">
                    {currentRecord.status === 'pending' ? (
                      <Input
                        type="text"
                        value={m.unit}
                        onChange={(e) => handleMaterialChange(m.id, 'unit', e.target.value)}
                        className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                      />
                    ) : (
                      <span className="text-xs text-gray-600">{m.unit || '-'}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-1 py-1.5">
                    {currentRecord.status === 'pending' ? (
                      <NumberInput
                        value={m.quantity}
                        onChange={(val) => {
                          const num = val === '' ? 0 : Number(val);
                          handleMaterialChange(m.id, 'quantity', num);
                        }}
                        decimals={2}
                        className="h-8 px-2 text-xs"
                      />
                    ) : (
                      <span className="text-xs text-gray-900">{m.quantity}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-1 py-1.5">
                    {currentRecord.status === 'pending' ? (
                      <Input
                        type="text"
                        value={m.price}
                        onChange={(e) => handleMaterialChange(m.id, 'price', e.target.value)}
                        className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                      />
                    ) : (
                      <span className="text-xs text-gray-900">{m.price}元</span>
                    )}
                  </TableCell>
                  <TableCell className="px-1 py-1.5">
                    {currentRecord.status === 'pending' ? (
                      <Input
                        type="text"
                        value={m.supplier}
                        onChange={(e) => handleMaterialChange(m.id, 'supplier', e.target.value)}
                        className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                      />
                    ) : (
                      <span className="text-xs text-gray-600">{m.supplier || '-'}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-1 py-1.5">
                    {currentRecord.status === 'pending' ? (
                      <Input
                        type="text"
                        value={m.location}
                        onChange={(e) => handleMaterialChange(m.id, 'location', e.target.value)}
                        className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                      />
                    ) : (
                      <span className="text-xs text-gray-600">{m.location || '-'}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-1 py-1.5">
                    {currentRecord.status === 'pending' ? (
                      <Input
                        type="text"
                        value={m.batchNo}
                        onChange={(e) => handleMaterialChange(m.id, 'batchNo', e.target.value)}
                        className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
                      />
                    ) : (
                      <span className="text-xs text-gray-600">{m.batchNo || '-'}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-1 py-1.5">
                    {currentRecord.status === 'pending' ? (
                      <DatePicker
                        selected={m.productionDate ? new Date(m.productionDate) : undefined}
                        onChange={(date) => handleMaterialChange(m.id, 'productionDate', date.toISOString().slice(0, 10))}
                        placeholder="选择日期"
                      />
                    ) : (
                      <span className="text-xs text-gray-600">{m.productionDate || '-'}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-1 py-1.5">
                    {currentRecord.status === 'pending' ? (
                      <DatePicker
                        selected={m.expiryDate ? new Date(m.expiryDate) : undefined}
                        onChange={(date) => handleMaterialChange(m.id, 'expiryDate', date.toISOString().slice(0, 10))}
                        placeholder="选择日期"
                      />
                    ) : (
                      <span className="text-xs text-gray-600">{m.expiryDate || '-'}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-1 py-1.5">
                    {currentRecord.status === 'pending' ? (
                      <Input
                        type="text"
                        value={m.remarks}
                        onChange={(e) => handleMaterialChange(m.id, 'remarks', e.target.value)}
                        className="w-full h-6 px-1 border border-gray-200 rounded text-xs"
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

      {/* 申请作废确认弹窗 */}
      <UnifiedModal
        isOpen={showVoidModal}
        onClose={() => setShowVoidModal(false)}
        title="申请作废确认"
        size="lg"
        showFooter={true}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowVoidModal(false)}>
              取消
            </Button>
            <Button variant="warning" onClick={() => {
              showAlert('作废申请已提交');
              setShowVoidModal(false);
            }}>
              确认作废
            </Button>
          </>
        }
        showMaximize={false}
        enableDrag={false}
        enableResize={false}
      >
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
            <Table className="min-w-full text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="px-3 py-2 font-semibold text-gray-600">物料编码</TableHead>
                  <TableHead className="px-3 py-2 font-semibold text-gray-600">物料名称</TableHead>
                  <TableHead className="px-3 py-2 font-semibold text-gray-600">规格</TableHead>
                  <TableHead className="px-3 py-2 font-semibold text-gray-600">数量</TableHead>
                  <TableHead className="px-3 py-2 font-semibold text-gray-600">单位</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentEditedMaterials.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="px-3 py-2 text-blue-600 font-medium">{m.materialCode || '-'}</TableCell>
                    <TableCell className="px-3 py-2 text-gray-900">{m.materialName || '-'}</TableCell>
                    <TableCell className="px-3 py-2 text-gray-600">{m.specification || '-'}</TableCell>
                    <TableCell className="px-3 py-2 text-gray-900">{m.quantity}</TableCell>
                    <TableCell className="px-3 py-2 text-gray-600">{m.unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </UnifiedModal>
    </UnifiedModal>
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

  // 生成导出文件名
  const generateFileName = (format: string) => {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const recordCount = records.length;
    return `物料入库记录_${timestamp}_${recordCount}条.${format}`;
  };

  // 导出为Excel格式 - 优化版：入库单信息只在第一行显示，物料行用序号关联
  const exportToExcel = () => {
    // 准备表头
    const headers = [
      '入库单号', '入库日期', '供应商', '操作员', '状态', '序号',
      '物料编码', '物料名称', '分类', '规格', '条形码', '单位',
      '数量', '单价', '批号', '生产日期', '有效期至', '存放位置', '备注'
    ];

    // 准备数据行
    const rows: (string | number)[][] = [];

    records.forEach(record => {
      const materialCount = record.materials.length;
      const statusText = record.status === 'pending' ? '待审核' : record.status === 'completed' ? '已完成' : '已作废';

      // 添加入库单信息行（只在第一行显示入库单信息）
      // 添加物料明细行（后续行只显示序号和物料信息）
      record.materials.forEach((material, index) => {
        const materialRow = [
          index === 0 ? record.code : '',           // 入库单号：只在第一行显示
          index === 0 ? record.inboundDate : '',    // 入库日期：只在第一行显示
          index === 0 ? record.supplier : '',       // 供应商：只在第一行显示
          index === 0 ? record.operator : '',        // 操作员：只在第一行显示
          index === 0 ? statusText : '',            // 状态：只在第一行显示
          `${index + 1}/${materialCount}`,         // 序号：每行都显示
          material.materialCode,
          material.materialName,
          material.category || '',
          material.specification || '',
          material.barcode || '',
          material.unit,
          material.quantity,
          material.price || '',
          material.batchNo || '',
          material.productionDate || '',
          material.expiryDate || '',
          material.location || '',
          material.remarks || ''
        ];
        rows.push(materialRow);
      });
    });

    // 创建工作簿和工作表
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // 设置列宽
    worksheet['!cols'] = [
      { wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, // 入库单信息6列
      { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 8 }, // 物料明细6列
      { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 } // 物料属性7列
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '物料入库记录');

    // 下载文件
    XLSX.writeFile(workbook, generateFileName('xlsx'));
  };

  // 导出为CSV格式 - 优化版：入库单信息只在第一行显示，物料行用序号关联
  const exportToCsv = () => {
    const headers = [
      '入库单号', '入库日期', '供应商', '操作员', '状态', '序号',
      '物料编码', '物料名称', '分类', '规格', '条形码', '单位',
      '数量', '单价', '批号', '生产日期', '有效期至', '存放位置', '备注'
    ];

    const rows: string[][] = [];

    records.forEach(record => {
      const statusText = record.status === 'pending' ? '待审核' : record.status === 'completed' ? '已完成' : '已作废';
      const materialCount = record.materials.length;

      // 添加物料明细行（入库单信息只在第一行显示）
      record.materials.forEach((material, index) => {
        rows.push([
          index === 0 ? record.code : '',           // 入库单号：只在第一行显示
          index === 0 ? record.inboundDate : '',    // 入库日期：只在第一行显示
          index === 0 ? record.supplier : '',       // 供应商：只在第一行显示
          index === 0 ? record.operator : '',        // 操作员：只在第一行显示
          index === 0 ? statusText : '',            // 状态：只在第一行显示
          `${index + 1}/${materialCount}`,         // 序号：每行都显示
          material.materialCode,
          material.materialName,
          material.category || '',
          material.specification || '',
          material.barcode || '',
          material.unit,
          String(material.quantity),
          material.price || '',
          material.batchNo || '',
          material.productionDate || '',
          material.expiryDate || '',
          material.location || '',
          material.remarks || ''
        ]);
      });
    });

    // 添加BOM以便Excel正确识别UTF-8编码的CSV
    const BOM = '﻿';
    const csvContent = BOM + [headers, ...rows].map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = generateFileName('csv');
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // 导出为Word格式
  const exportToWord = async () => {
    const tables: DocxTable[] = [];

    for (const record of records) {
      // 为每条入库记录创建一个表
      const headerRow = new DocxTableRow({
        children: [
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: '入库单号', bold: true })] })] }),
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: '入库日期', bold: true })] })] }),
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: '供应商', bold: true })] })] }),
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: '操作员', bold: true })] })] }),
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: '状态', bold: true })] })] }),
        ],
      });

      const dataRow = new DocxTableRow({
        children: [
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: record.code })] })] }),
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: record.inboundDate })] })] }),
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: record.supplier })] })] }),
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: record.operator })] })] }),
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: record.status === 'pending' ? '待审核' : record.status === 'completed' ? '已完成' : '已作废' })] })] }),
        ],
      });

      // 物料明细表头
      const materialHeaderRow = new DocxTableRow({
        children: [
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: '物料编码', bold: true })] })] }),
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: '物料名称', bold: true })] })] }),
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: '分类', bold: true })] })] }),
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: '规格', bold: true })] })] }),
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: '单位', bold: true })] })] }),
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: '数量', bold: true })] })] }),
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: '单价', bold: true })] })] }),
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: '批号', bold: true })] })] }),
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: '有效期至', bold: true })] })] }),
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: '存放位置', bold: true })] })] }),
        ],
      });

      const materialRows = record.materials.map(m => new DocxTableRow({
        children: [
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: m.materialCode })] })] }),
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: m.materialName })] })] }),
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: m.category || '-' })] })] }),
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: m.specification || '-' })] })] }),
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: m.unit })] })] }),
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(m.quantity) })] })] }),
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: m.price || '-' })] })] }),
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: m.batchNo || '-' })] })] }),
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: m.expiryDate || '-' })] })] }),
          new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: m.location || '-' })] })] }),
        ],
      }));

      tables.push(
        new DocxTable({
          rows: [
            headerRow,
            dataRow,
            materialHeaderRow,
            ...materialRows
          ],
        })
      );
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [new TextRun({ text: '物料入库记录', bold: true, size: 32 })],
            alignment: 1 as any, // Center alignment
          }),
          new Paragraph({ children: [] }),
          ...tables.flatMap(t => t.rows.map(row => new Paragraph({ children: [] }))),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = generateFileName('docx');
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExport = () => {
    switch (exportFormat) {
      case 'excel':
        exportToExcel();
        break;
      case 'csv':
        exportToCsv();
        break;
      case 'word':
        exportToWord();
        break;
    }
    onClose();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="选择导出格式"
      size="sm"
      showFooter={true}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleExport}>
            确认导出
          </Button>
        </>
      }
      showMaximize={false}
      enableDrag={false}
      enableResize={false}
    >
      <p className="text-sm text-gray-500 mb-4">已选择 {records.length} 条入库记录</p>
      <div className="space-y-3">
        {[
          { value: 'excel', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
          { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
          { value: 'word', label: 'Word (.docx)', desc: '适用于文档编辑和分享' },
        ].map((format) => (
          <Label
            key={format.value}
            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
              exportFormat === format.value
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <Input
              type="radio"
              name="exportFormat"
              value={format.value}
              checked={exportFormat === format.value}
              onChange={(e) => setExportFormat(e.target.value)}
              className="w-4 h-4 text-emerald-600 border-gray-400 focus:ring-emerald-500"
            />
            <div className="ml-3">
              <span className="block text-sm font-medium text-gray-900">{format.label}</span>
              <span className="block text-xs text-gray-500">{format.desc}</span>
            </div>
          </Label>
        ))}
      </div>
    </UnifiedModal>
  );
}

interface InboundAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Omit<InboundRecord, 'id'>) => void;
  onGenerateCode: () => string;
  existingCodes: string[];
}

export function InboundAddModal({ isOpen, onClose, onSave, onGenerateCode, existingCodes }: InboundAddModalProps) {
  // 获取当前用户信息（从 Zustand Store）
  const storeUsers = useUserStore(state => state.users);
  const currentUserName = storeUsers[0]?.name || localStorage.getItem('username') || '当前用户';
  // 获取当天日期字符串
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    code: '',
    inboundDate: today,
    supplier: '',
    operator: currentUserName, // 默认当前登录用户
  });
  const [materials, setMaterials] = useState<InboundMaterial[]>([]);
  const [codeError, setCodeError] = useState('');

  // 生成入库单号（带自动查重）
  const handleGenerateCode = () => {
    let newCode = onGenerateCode();
    let attempts = 0;
    const maxAttempts = 999;

    // 查重：如果生成的编号已存在，则递增直到找到可用编号
    while (existingCodes.includes(newCode) && attempts < maxAttempts) {
      const today = new Date().toISOString().split('T')[0];
      const todayPrefix = `RK${today.replace(/-/g, '')}-`;
      const seq = parseInt(newCode.replace(todayPrefix, ''), 10);
      const nextSeq = seq + 1;
      if (nextSeq > 999) {
        setCodeError('今日编号已达上限999');
        return;
      }
      newCode = `${todayPrefix}${String(nextSeq).padStart(3, '0')}`;
      attempts++;
    }

    if (existingCodes.includes(newCode)) {
      setCodeError('编号生成失败，请稍后重试');
      return;
    }

    setFormData({ ...formData, code: newCode });
    setCodeError('');
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

  const handleSubmit = () => {
    // 提交后默认进入待审核状态
    onSave({
      code: formData.code || onGenerateCode(),
      inboundDate: formData.inboundDate,
      supplier: formData.supplier,
      operator: formData.operator,
      status: 'pending' as const,
      materials,
    });
    setFormData({
      code: '',
      inboundDate: today,
      supplier: '',
      operator: currentUserName,
    });
    setMaterials([]);
    onClose();
  };

  // 如果弹窗未打开，不渲染任何内容
  if (!isOpen) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新增入库记录"
      size="xxxl"
      showFooter={true}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit}>
            提交
          </Button>
        </>
      }
      showMaximize={true}
      enableDrag={true}
      enableResize={true}
    >
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="block text-xs font-medium text-emerald-700 mb-1">入库单号</Label>
            <div className="flex gap-1">
              <Input
                type="text"
                value={formData.code}
                onChange={(e) => {
                  setFormData({ ...formData, code: e.target.value });
                  setCodeError('');
                }}
                placeholder="点击生成"
                className="flex-1 h-8 px-2 border border-gray-200 rounded text-sm font-mono"
              />
              <Button variant="blue" size="sm" onClick={handleGenerateCode} title="生成入库单号">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </Button>
            </div>
            {codeError && <span className="text-xs text-red-500 mt-0.5">{codeError}</span>}
          </div>
          <div>
            <Label className="block text-xs font-medium text-emerald-700 mb-1">入库日期</Label>
            <DatePicker
              selected={new Date(formData.inboundDate)}
              disabled={true}
              placeholder="入库日期"
            />
          </div>
          <div>
            <Label className="block text-xs font-medium text-emerald-700 mb-1">供应商</Label>
            <Input
              type="text"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              className="w-full h-8 px-2 border border-gray-200 rounded text-sm"
            />
          </div>
          <div>
            <Label className="block text-xs font-medium text-emerald-700 mb-1">操作员</Label>
            <Input
              type="text"
              value={formData.operator}
              readOnly
              className="w-full h-8 px-2 border border-gray-200 rounded text-sm bg-gray-100 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-800">物料明细（{materials.length}种物料）</h4>
          <Button variant="blue" size="sm" onClick={handleAddMaterial}>
            <Plus className="w-3 h-3" />
            添加物料
          </Button>
        </div>
        {materials.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            暂无物料，请点击"添加物料"按钮添加
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <Table className="min-w-full text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="px-2 py-2 font-semibold text-gray-600 whitespace-nowrap">操作</TableHead>
                  <TableHead className="px-2 py-2 font-semibold text-gray-600 whitespace-nowrap">物料编码</TableHead>
                  <TableHead className="px-2 py-2 font-semibold text-gray-600 whitespace-nowrap">物料名称</TableHead>
                  <TableHead className="px-2 py-2 font-semibold text-gray-600 whitespace-nowrap">分类</TableHead>
                  <TableHead className="px-2 py-2 font-semibold text-gray-600 whitespace-nowrap">规格</TableHead>
                  <TableHead className="px-2 py-2 font-semibold text-gray-600 whitespace-nowrap">条形码</TableHead>
                  <TableHead className="px-2 py-2 font-semibold text-gray-600 whitespace-nowrap">单位</TableHead>
                  <TableHead className="px-2 py-2 font-semibold text-gray-600 whitespace-nowrap">数量</TableHead>
                  <TableHead className="px-2 py-2 font-semibold text-gray-600 whitespace-nowrap">单价</TableHead>
                  <TableHead className="px-2 py-2 font-semibold text-gray-600 whitespace-nowrap">供应商</TableHead>
                  <TableHead className="px-2 py-2 font-semibold text-gray-600 whitespace-nowrap">存放位置</TableHead>
                  <TableHead className="px-2 py-2 font-semibold text-gray-600 whitespace-nowrap">批号</TableHead>
                  <TableHead className="px-2 py-2 font-semibold text-gray-600 whitespace-nowrap">生产日期</TableHead>
                  <TableHead className="px-2 py-2 font-semibold text-gray-600 whitespace-nowrap">有效期至</TableHead>
                  <TableHead className="px-2 py-2 font-semibold text-gray-600 whitespace-nowrap">备注</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="px-2 py-1.5 whitespace-nowrap">
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteMaterial(m.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                    <TableCell className="px-1 py-1.5 whitespace-nowrap">
                      <Input
                        type="text"
                        value={m.materialCode}
                        onChange={(e) => handleMaterialChange(m.id, 'materialCode', e.target.value)}
                        className="w-20 h-6 px-1 border border-gray-200 rounded text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-1 py-1.5 whitespace-nowrap">
                      <Input
                        type="text"
                        value={m.materialName}
                        onChange={(e) => handleMaterialChange(m.id, 'materialName', e.target.value)}
                        className="w-24 h-6 px-1 border border-gray-200 rounded text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-1 py-1.5 whitespace-nowrap">
                      <Input
                        type="text"
                        value={m.category}
                        onChange={(e) => handleMaterialChange(m.id, 'category', e.target.value)}
                        className="w-20 h-6 px-1 border border-gray-200 rounded text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-1 py-1.5 whitespace-nowrap">
                      <Input
                        type="text"
                        value={m.specification}
                        onChange={(e) => handleMaterialChange(m.id, 'specification', e.target.value)}
                        className="w-16 h-6 px-1 border border-gray-200 rounded text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-1 py-1.5 whitespace-nowrap">
                      <Input
                        type="text"
                        value={m.barcode}
                        onChange={(e) => handleMaterialChange(m.id, 'barcode', e.target.value)}
                        className="w-20 h-6 px-1 border border-gray-200 rounded text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-1 py-1.5 whitespace-nowrap">
                      <Input
                        type="text"
                        value={m.unit}
                        onChange={(e) => handleMaterialChange(m.id, 'unit', e.target.value)}
                        className="w-12 h-6 px-1 border border-gray-200 rounded text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-1 py-1.5 whitespace-nowrap">
                      <NumberInput
                        value={m.quantity}
                        onChange={(val) => {
                          const num = val === '' ? 0 : Number(val);
                          handleMaterialChange(m.id, 'quantity', num);
                        }}
                        decimals={2}
                        className="h-8 px-2 text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-1 py-1.5 whitespace-nowrap">
                      <Input
                        type="text"
                        value={m.price}
                        onChange={(e) => handleMaterialChange(m.id, 'price', e.target.value)}
                        className="w-16 h-6 px-1 border border-gray-200 rounded text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-1 py-1.5 whitespace-nowrap">
                      <Input
                        type="text"
                        value={m.supplier}
                        onChange={(e) => handleMaterialChange(m.id, 'supplier', e.target.value)}
                        className="w-20 h-6 px-1 border border-gray-200 rounded text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-1 py-1.5 whitespace-nowrap">
                      <Input
                        type="text"
                        value={m.location}
                        onChange={(e) => handleMaterialChange(m.id, 'location', e.target.value)}
                        className="w-16 h-6 px-1 border border-gray-200 rounded text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-1 py-1.5 whitespace-nowrap">
                      <Input
                        type="text"
                        value={m.batchNo}
                        onChange={(e) => handleMaterialChange(m.id, 'batchNo', e.target.value)}
                        className="w-20 h-6 px-1 border border-gray-200 rounded text-xs"
                      />
                    </TableCell>
                    <TableCell className="px-1 py-1.5 whitespace-nowrap">
                      <DatePicker
                        selected={m.productionDate ? new Date(m.productionDate) : undefined}
                        onChange={(date) => handleMaterialChange(m.id, 'productionDate', date.toISOString().slice(0, 10))}
                        placeholder="选择日期"
                      />
                    </TableCell>
                    <TableCell className="px-1 py-1.5 whitespace-nowrap">
                      <DatePicker
                        selected={m.expiryDate ? new Date(m.expiryDate) : undefined}
                        onChange={(date) => handleMaterialChange(m.id, 'expiryDate', date.toISOString().slice(0, 10))}
                        placeholder="选择日期"
                      />
                    </TableCell>
                    <TableCell className="px-1 py-1.5 whitespace-nowrap">
                      <Input
                        type="text"
                        value={m.remarks}
                        onChange={(e) => handleMaterialChange(m.id, 'remarks', e.target.value)}
                        className="w-20 h-6 px-1 border border-gray-200 rounded text-xs"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </UnifiedModal>
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
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="确认删除"
      size="sm"
      showFooter={true}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            确认删除
          </Button>
        </>
      }
      showMaximize={false}
      enableDrag={false}
      enableResize={false}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <span className="text-sm text-gray-700 font-medium">确定要删除选中的入库记录吗？</span>
      </div>
      <div className="text-sm text-gray-600 mb-4">
        <div className="p-2 bg-gray-50 rounded text-xs">
          <p><strong>选中数量：</strong>{records.length} 条入库记录</p>
          <p><strong>物料总数：</strong>{totalMaterials} 种物料</p>
        </div>
        <p className="mt-2 text-red-500">此操作不可撤销</p>
      </div>
    </UnifiedModal>
  );
}
