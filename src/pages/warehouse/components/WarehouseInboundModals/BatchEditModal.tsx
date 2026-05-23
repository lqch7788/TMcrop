/**
 * 入库批量编辑弹窗组件
 * 从 InboundModals 拆分出来，独立管理批量编辑入库记录弹窗
 */

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronRight, AlertTriangle } from 'lucide-react';
import { InboundRecord, InboundMaterial } from '../../../types/warehouseInbound.types';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { NumberInput } from '@/components/ui/NumberInput';
import { DatePicker } from '@/components/ui/DatePicker';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { showAlert } from '@/lib/dialogService';

interface InboundBatchEditModalProps {
  records: InboundRecord[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (records: InboundRecord[]) => void;
}

export const InboundBatchEditModal: React.FC<InboundBatchEditModalProps> = ({
  records,
  isOpen,
  onClose,
  onSave,
}) => {
  // 当前编辑的记录索引
  const [currentIndex, setCurrentIndex] = useState(0);

  // 编辑后的记录列表
  const [editedRecords, setEditedRecords] = useState<InboundRecord[]>(records);

  // 编辑后的物料列表（按记录ID索引）
  const [editedMaterials, setEditedMaterials] = useState<Record<number, InboundMaterial[]>>({});

  // 作废弹窗状态
  const [showVoidModal, setShowVoidModal] = useState(false);

  // 初始化
  useEffect(() => {
    setEditedRecords(records);
    setCurrentIndex(0);
    setEditedMaterials({});
  }, [records]);

  if (!isOpen || editedRecords.length === 0) return null;

  // 当前编辑的记录
  const currentRecord = editedRecords[currentIndex];

  // 当前编辑的物料列表
  const currentEditedMaterials = editedMaterials[currentRecord.id] || currentRecord.materials;

  // 修改物料字段
  const handleMaterialChange = (materialId: number, field: keyof InboundMaterial, value: string | number) => {
    const updatedMaterials = currentEditedMaterials.map(m =>
      m.id === materialId ? { ...m, [field]: value } : m
    );
    setEditedMaterials({ ...editedMaterials, [currentRecord.id]: updatedMaterials });
  };

  // 删除物料
  const handleDeleteMaterial = (materialId: number) => {
    const updatedMaterials = currentEditedMaterials.filter(m => m.id !== materialId);
    setEditedMaterials({ ...editedMaterials, [currentRecord.id]: updatedMaterials });
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
    setEditedMaterials({ ...editedMaterials, [currentRecord.id]: [...currentEditedMaterials, newMaterial] });
  };

  // 修改记录字段
  const handleRecordChange = (field: keyof InboundRecord, value: string) => {
    const updatedRecords = editedRecords.map((r, idx) =>
      idx === currentIndex ? { ...r, [field]: value } : r
    );
    setEditedRecords(updatedRecords);
  };

  // 下一个记录
  const handleNext = () => {
    if (currentIndex < records.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  // 保存全部
  const handleSaveAll = () => {
    const finalRecords = editedRecords.map(r => ({
      ...r,
      materials: editedMaterials[r.id] || r.materials,
    }));
    onSave(finalRecords);
    onClose();
  };

  return (
    <>
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-4">
          <span>批量编辑入库记录</span>
          <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded">
            已选择 {records.length} 条
          </span>
        </div>
      }
      size="xxl"
      showFooter={true}
      footer={
        <div className="flex justify-end gap-3">
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
        </div>
      }
    >

        {/* 记录选择和基本信息 */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
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

          {/* 记录选择器 */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1">
              <Label className="text-xs text-gray-600">选择入库记录</Label>
              <Select
                value={String(currentRecord.id)}
                onValueChange={(val) => {
                  const idx = records.findIndex(r => r.id === Number(val));
                  if (idx >= 0) setCurrentIndex(idx);
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {records.map((r, idx) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.code} - {r.supplier} ({r.materials.length}种物料) {editedMaterials[r.id] ? '✓ 已编辑' : ''} {idx !== currentIndex ? '' : '←'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 基本信息 */}
          <div className="grid grid-cols-5 gap-3">
            <div>
              <Label className="text-xs text-gray-600">入库单号</Label>
              <Input
                type="text"
                value={currentRecord.code}
                readOnly
                className="h-8 text-sm bg-gray-100"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">入库日期</Label>
              <DatePicker
                selected={currentRecord.inboundDate ? new Date(currentRecord.inboundDate) : undefined}
                onChange={() => {}}
                placeholder="入库日期"
                disabled
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">供应商</Label>
              <Input
                type="text"
                value={currentRecord.supplier}
                readOnly
                className="h-8 text-sm bg-gray-100"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">操作员</Label>
              <Input
                type="text"
                value={currentRecord.operator}
                readOnly
                className="h-8 text-sm bg-gray-100"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">状态</Label>
              <Select
                value={currentRecord.status}
              >
                <SelectTrigger className="h-8 bg-gray-100">
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

        {/* 物料明细区域 */}
        <div className="flex-1 overflow-hidden p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h4 className="text-sm font-semibold text-gray-800">物料明细（{currentEditedMaterials.length}种物料）</h4>
            {currentRecord.status === 'pending' && (
              <Button
                size="sm"
                onClick={handleAddMaterial}
              >
                <Plus className="w-3 h-3" />
                添加物料
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-auto rounded-lg border border-gray-200 bg-white">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-gray-50 sticky top-0 z-10">
                  <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600">操作</TableHead>
                  <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600">物料编码</TableHead>
                  <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600">物料名称</TableHead>
                  <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600">分类</TableHead>
                  <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600">规格</TableHead>
                  <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600">条形码</TableHead>
                  <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600">单位</TableHead>
                  <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600">数量</TableHead>
                  <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600">单价</TableHead>
                  <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600">存放位置</TableHead>
                  <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600">批号</TableHead>
                  <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600">生产日期</TableHead>
                  <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600">有效期至</TableHead>
                  <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600">备注</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentEditedMaterials.map((m) => (
                  <TableRow key={m.id} className="hover:bg-gray-50">
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
                          value={m.code}
                          onChange={(e) => handleMaterialChange(m.id, 'code', e.target.value)}
                          className="h-6 px-1 text-xs"
                        />
                      ) : (
                        <span className="text-xs text-gray-900">{m.code || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell className="px-1 py-1.5">
                      {currentRecord.status === 'pending' ? (
                        <Input
                          type="text"
                          value={m.name}
                          onChange={(e) => handleMaterialChange(m.id, 'name', e.target.value)}
                          className="h-6 px-1 text-xs"
                        />
                      ) : (
                        <span className="text-xs text-gray-900">{m.name || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell className="px-1 py-1.5">
                      {currentRecord.status === 'pending' ? (
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
                      {currentRecord.status === 'pending' ? (
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
                      {currentRecord.status === 'pending' ? (
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
                      {currentRecord.status === 'pending' ? (
                        <Input
                          type="text"
                          value={m.unit}
                          onChange={(e) => handleMaterialChange(m.id, 'unit', e.target.value)}
                          className="h-6 px-1 text-xs"
                        />
                      ) : (
                        <span className="text-xs text-gray-600">{m.unit || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell className="px-1 py-1.5">
                      {currentRecord.status === 'pending' ? (
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
                      {currentRecord.status === 'pending' ? (
                        <Input
                          type="text"
                          value={m.price}
                          onChange={(e) => handleMaterialChange(m.id, 'price', e.target.value)}
                          className="h-6 px-1 text-xs"
                        />
                      ) : (
                        <span className="text-xs text-gray-900">{m.price}元</span>
                      )}
                    </TableCell>
                    <TableCell className="px-1 py-1.5">
                      {currentRecord.status === 'pending' ? (
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
                      {currentRecord.status === 'pending' ? (
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
                      {currentRecord.status === 'pending' ? (
                        <DatePicker
                          selected={m.productionDate ? new Date(m.productionDate) : undefined}
                          onChange={(date) => handleMaterialChange(m.id, 'productionDate', date.toISOString().slice(0, 10))}
                          placeholder="生产日期"
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
                          placeholder="有效期至"
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

    </UnifiedModal>

    {/* 申请作废确认弹窗 */}
    {showVoidModal && (
      <UnifiedModal
        isOpen={showVoidModal}
        onClose={() => setShowVoidModal(false)}
        title="申请作废确认"
        size="xl"
        showFooter={true}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowVoidModal(false)}>
              取消
            </Button>
            <Button variant="warning" onClick={() => {
              showAlert('作废申请已提交');
              setShowVoidModal(false);
            }}>
              确认作废
            </Button>
          </div>
        }
      >
        {/* 警示信息 */}
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

        {/* 记录信息 */}
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

        {/* 物料明细 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-2">物料明细</h4>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <Table className="min-w-full text-xs">
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="px-3 py-2 text-xs font-semibold text-gray-600">物料编码</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-semibold text-gray-600">物料名称</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-semibold text-gray-600">规格</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-semibold text-gray-600">数量</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-semibold text-gray-600">单位</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentEditedMaterials.map((m) => (
                  <TableRow key={m.id} className="hover:bg-gray-50">
                    <TableCell className="px-3 py-2 text-blue-600 font-medium">{m.code || '-'}</TableCell>
                    <TableCell className="px-3 py-2 text-gray-900">{m.name || '-'}</TableCell>
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
    )}
  </>
  );
};

export default InboundBatchEditModal;
