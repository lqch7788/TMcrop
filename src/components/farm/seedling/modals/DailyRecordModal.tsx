/**
 * 每日记录弹窗
 */

import React, { useState, useMemo, useEffect } from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { Seedling, DailyRecord } from '../../../../types/crop';
import { useDictionaryStore, getDictItems, useSeedlingStore } from '../../../../stores';
import { Input } from '../../../ui/input';
import { Label } from '@/components/ui/label';
import { TextArea } from '../../../ui/TextArea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';

interface DailyRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  record: Seedling;
}

export function DailyRecordModal({ isOpen, onClose, onSuccess, record }: DailyRecordModalProps) {
  // 字典数据转换（使用 Zustand store 获取）
  const dictionaries = useDictionaryStore((state) => state.dictionaries);
  const loadDictionaries = useDictionaryStore((state) => state.loadDictionaries);

  useEffect(() => {
    if (dictionaries.length === 0) {
      loadDictionaries();
    }
  }, [dictionaries.length, loadDictionaries]);

  // 操作人员选项
  const OPERATORS = useMemo(() => {
    return getDictItems('operator').map(d => ({ value: d.dictCode, label: d.dictLabel }));
  }, [dictionaries]);

  const [formData, setFormData] = useState({
    recordDate: new Date().toISOString().split('T')[0],
    temperature: undefined as number | undefined,
    humidity: undefined as number | undefined,
    watering: false,
    abnormality: '',
    // 数量变化字段
    survivalCountChange: undefined as number | undefined,
    plantedCountChange: undefined as number | undefined,
    lossCountChange: undefined as number | undefined,
    remarks: '',
    // 水质参数（新增）
    phValue: undefined as number | undefined,
    ecValue: undefined as number | undefined,
    // 操作人员（新增）
    operator: ''
  });

  const handleSubmit = async () => {
    if (!formData.recordDate) {
      alert('请选择记录日期');
      return;
    }

    // 通过 Store 添加每日记录（架构：组件 → Store → API）
    try {
      await useSeedlingStore.getState().addDailyRecord(String(record.id), {
        recordDate: formData.recordDate,
        temperature: formData.temperature,
        humidity: formData.humidity,
        watering: formData.watering,
        abnormality: formData.abnormality || undefined,
        survivalCountChange: formData.survivalCountChange,
        plantedCountChange: formData.plantedCountChange,
        lossCountChange: formData.lossCountChange,
        remarks: formData.remarks || undefined,
        phValue: formData.phValue,
        ecValue: formData.ecValue,
        operator: formData.operator || undefined
      });
    } catch (error) {
      console.error('添加每日记录失败:', error);
      alert('添加记录失败，请重试');
      return;
    }

    onClose();
    onSuccess?.();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`每日记录 - ${record.seedlingCode}`}
      size="lg"
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="添加记录"
      cancelText="取消"
    >
      <div className="space-y-6">
        {/* 添加新记录 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">添加新记录</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-700">记录日期</Label>
              <Input
                type="date"
                value={formData.recordDate}
                onChange={(e) => setFormData({ ...formData, recordDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <Label className="text-gray-700">温度（℃）</Label>
              <Input
                type="number"
                value={formData.temperature || ''}
                onChange={(e) => setFormData({ ...formData, temperature: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <Label className="text-gray-700">湿度（%）</Label>
              <Input
                type="number"
                value={formData.humidity || ''}
                onChange={(e) => setFormData({ ...formData, humidity: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <Label className="text-gray-700">是否浇水</Label>
              <div className="flex items-center h-full">
                <Input
                  type="checkbox"
                  checked={formData.watering}
                  onChange={(e) => setFormData({ ...formData, watering: e.target.checked })}
                  className="w-5 h-5 text-emerald-600 rounded border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-600">{formData.watering ? '是' : '否'}</span>
              </div>
            </div>
            {/* pH值（新增） */}
            <div>
              <Label className="text-gray-700">pH值</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.phValue ?? ''}
                onChange={(e) => setFormData({
                  ...formData,
                  phValue: e.target.value ? Number(e.target.value) : undefined
                })}
                placeholder="如：6.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {/* EC值（新增） */}
            <div>
              <Label className="text-gray-700">EC值（mS/cm）</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.ecValue ?? ''}
                onChange={(e) => setFormData({
                  ...formData,
                  ecValue: e.target.value ? Number(e.target.value) : undefined
                })}
                placeholder="如：2.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-gray-700">异常情况</Label>
              <Input
                type="text"
                value={formData.abnormality}
                onChange={(e) => setFormData({ ...formData, abnormality: e.target.value })}
                placeholder="请输入异常情况，无异常请留空"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {/* 数量变化输入 */}
            <div className="col-span-2 mt-4">
              <h5 className="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">数量变化（选填）</h5>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-700">成活变化</Label>
                  <Input
                    type="number"
                    value={formData.survivalCountChange ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      survivalCountChange: e.target.value ? Number(e.target.value) : undefined
                    })}
                    placeholder="正数增加，负数减少"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">定植变化</Label>
                  <Input
                    type="number"
                    value={formData.plantedCountChange ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      plantedCountChange: e.target.value ? Number(e.target.value) : undefined
                    })}
                    placeholder="正数增加，负数减少"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">损耗数量</Label>
                  <Input
                    type="number"
                    value={formData.lossCountChange ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      lossCountChange: e.target.value ? Number(e.target.value) : undefined
                    })}
                    placeholder="正数增加"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
            <div className="col-span-2">
              <Label className="text-gray-700">备注</Label>
              <TextArea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                placeholder="请输入备注信息"
              />
            </div>
            {/* 操作人员（新增） */}
            <div className="col-span-2">
              <Label className="text-gray-700">操作人员</Label>
              <Select
                value={formData.operator}
                onValueChange={(val) => setFormData({ ...formData, operator: val })}
              >
                <SelectTrigger className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <SelectValue placeholder="请选择操作人员" />
                </SelectTrigger>
                <SelectContent>
                  {OPERATORS.map(op => (
                    <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 历史记录列表 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
            历史记录 ({record.dailyRecords.length} 条)
          </h4>
          {record.dailyRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无记录</div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2">
              {record.dailyRecords.map((r, index) => (
                <div key={r.id || index} className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{r.recordDate}</span>
                    {r.watering && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">已浇水</span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs text-gray-600">
                    {r.temperature && <span>温度: {r.temperature}℃</span>}
                    {r.humidity && <span>湿度: {r.humidity}%</span>}
                    {r.phValue && <span>pH: {r.phValue}</span>}
                    {r.ecValue && <span>EC: {r.ecValue}</span>}
                    {r.abnormality && <span className="text-red-600 col-span-2">异常: {r.abnormality}</span>}
                    {r.operator && <span className="text-blue-600">操作员: {r.operator}</span>}
                  </div>
                  {/* 数量变化显示 */}
                  {(r.survivalCountChange !== undefined || r.plantedCountChange !== undefined || r.lossCountChange !== undefined) && (
                    <div className="grid grid-cols-3 gap-2 text-xs mt-2 pt-2 border-t border-gray-100">
                      {r.survivalCountChange !== undefined && (
                        <span className={r.survivalCountChange > 0 ? 'text-green-600' : r.survivalCountChange < 0 ? 'text-red-600' : 'text-gray-500'}>
                          成活: {r.survivalCountChange > 0 ? '+' : ''}{r.survivalCountChange}
                        </span>
                      )}
                      {r.plantedCountChange !== undefined && (
                        <span className={r.plantedCountChange > 0 ? 'text-green-600' : r.plantedCountChange < 0 ? 'text-red-600' : 'text-gray-500'}>
                          定植: {r.plantedCountChange > 0 ? '+' : ''}{r.plantedCountChange}
                        </span>
                      )}
                      {r.lossCountChange !== undefined && (
                        <span className="text-red-600">
                          损耗: +{r.lossCountChange}
                        </span>
                      )}
                    </div>
                  )}
                  {r.remarks && (
                    <div className="mt-2 text-xs text-gray-500">{r.remarks}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </UnifiedModal>
  );
}
