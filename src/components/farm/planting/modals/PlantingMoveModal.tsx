import React, { useEffect, useState, useMemo } from 'react';
import { Button, UnifiedModal, Select, Label, Input, TextArea } from '@/components/ui';
import { MovePlantingInputV2 } from '@/services/apiPlantingService';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
import { Sprout, AlertTriangle } from 'lucide-react';

interface PlantingMoveModalProps {
  isOpen: boolean;
  planting: any | null;
  onClose: () => void;
  onSubmit: (input: MovePlantingInputV2) => Promise<boolean | void> | void;
}

export default function PlantingMoveModalV2({ isOpen, planting, onClose, onSubmit }: PlantingMoveModalProps) {
  const [opType, setOpType] = useState<'move_in' | 'move_out'>('move_in');
  const [toAreaId, setToAreaId] = useState('');
  const [toAreaName, setToAreaName] = useState('');
  const [fromAreaId, setFromAreaId] = useState(planting?.areaId || '');
  const [fromAreaName, setFromAreaName] = useState(planting?.areaName || '');
  const [quantity, setQuantity] = useState<number>(0);
  const [operationDate, setOperationDate] = useState(todayLocal());
  const [remarks, setRemarks] = useState('');

  // 调入字段
  const [sourceType, setSourceType] = useState<'seed' | 'seedling'>('seed');
  const [sourceId, setSourceId] = useState('');
  const [sourceCode, setSourceCode] = useState('');

  // 调出字段
  const [targetPlantingId, setTargetPlantingId] = useState('');
  const [targetAreaId, setTargetAreaId] = useState('');
  const [targetAreaName, setTargetAreaName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [softWarning, setSoftWarning] = useState<string | null>(null);

  // 重置
  useEffect(() => {
    if (isOpen && planting) {
      setOpType('move_in');
      setToAreaId(''); setToAreaName('');
      setFromAreaId(planting.areaId || ''); setFromAreaName(planting.areaName || '');
      setQuantity(0);
      setOperationDate(todayLocal());
      setRemarks('');
      setSourceType('seed'); setSourceId(''); setSourceCode('');
      setTargetPlantingId(''); setTargetAreaId(''); setTargetAreaName('');
      setSoftWarning(null);
    }
  }, [isOpen, planting]);

  const handleSubmit = async () => {
    if (!planting) return;
    if (quantity <= 0) {
      showAlert('数量必须 > 0');
      return;
    }
    if (opType === 'move_in') {
      if (!sourceId) { showAlert('请选择来源批号'); return; }
    } else {
      if (!targetPlantingId) { showAlert('请选择目标订单'); return; }
      if (!toAreaId) { showAlert('请选择目标区域'); return; }
    }

    setSubmitting(true);
    try {
      const input: MovePlantingInputV2 = {
        operationType: opType,
        toAreaId, toAreaName,
        fromAreaId: opType === 'move_out' ? fromAreaId : undefined,
        fromAreaName: opType === 'move_out' ? fromAreaName : undefined,
        quantity, operationDate, remarks,
        sourceType: opType === 'move_in' ? sourceType : undefined,
        sourceId: opType === 'move_in' ? sourceId : undefined,
        sourceCode: opType === 'move_in' ? sourceCode : undefined,
        targetPlantingId: opType === 'move_out' ? targetPlantingId : undefined,
        targetAreaId: opType === 'move_out' ? toAreaId : undefined,
        targetAreaName: opType === 'move_out' ? toAreaName : undefined,
      };
      // 弹窗只构造 V2 input 并交给父组件处理业务调用（统一在 handleMoveSubmit 里调 movePlantingV2）
      await onSubmit(input);
      onClose();
    } catch (e: any) {
      showAlert(`操作失败：${e?.message || '未知错误'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={opType === 'move_in' ? '调入到种植订单' : '从种植订单调出'}
      size="md"
      showFooter
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting} className="flex-1">取消</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
            <Sprout className="w-4 h-4" /> 确认{opType === 'move_in' ? '调入' : '调出'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {/* 操作类型切换 */}
        <div>
          <Label>操作类型</Label>
          <div className="flex gap-2 mt-1">
            <Button size="sm" variant={opType === 'move_in' ? 'default' : 'secondary'} onClick={() => setOpType('move_in')}>调入</Button>
            <Button size="sm" variant={opType === 'move_out' ? 'default' : 'secondary'} onClick={() => setOpType('move_out')}>调出</Button>
          </div>
        </div>

        {/* 调出订单（显示只读） */}
        <div>
          <Label>调入/调出订单</Label>
          <Input value={planting?.plantingCode || ''} disabled />
        </div>

        {/* 调入特有字段 */}
        {opType === 'move_in' && (
          <>
            <div>
              <Label>目标区域</Label>
              <Input value={toAreaName} onChange={e => { setToAreaName(e.target.value); setToAreaId(e.target.value); }} placeholder="如：一棚 > 01区" />
            </div>
            <div>
              <Label>来源类型</Label>
              <div className="flex gap-2">
                <label><input type="radio" checked={sourceType === 'seed'} onChange={() => setSourceType('seed')} /> 种源</label>
                <label><input type="radio" checked={sourceType === 'seedling'} onChange={() => setSourceType('seedling')} /> 种苗</label>
              </div>
            </div>
            <div>
              <Label>来源批号</Label>
              <Input value={sourceCode} onChange={e => { setSourceCode(e.target.value); setSourceId(e.target.value); }} placeholder="批号搜索" />
            </div>
          </>
        )}

        {/* 调出特有字段 */}
        {opType === 'move_out' && (
          <>
            <div>
              <Label>调出区域</Label>
              <Input value={fromAreaName} disabled />
            </div>
            <div>
              <Label>目标订单</Label>
              <Input value={targetPlantingId} onChange={e => setTargetPlantingId(e.target.value)} placeholder="目标种植订单 ID" />
            </div>
            <div>
              <Label>目标区域</Label>
              <Input value={toAreaName} onChange={e => { setToAreaName(e.target.value); setToAreaId(e.target.value); }} placeholder="如：二棚 > 01区" />
            </div>
          </>
        )}

        {/* 公共字段 */}
        <div>
          <Label>数量</Label>
          <Input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} min={1} />
        </div>
        <div>
          <Label>业务日期</Label>
          <Input type="date" value={operationDate} onChange={e => setOperationDate(e.target.value)} />
        </div>
        <div>
          <Label>备注</Label>
          <TextArea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} />
        </div>

        {softWarning && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            <span>{softWarning}</span>
          </div>
        )}
      </div>
    </UnifiedModal>
  );
}
