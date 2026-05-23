/**
 * 每日记录弹窗
 * 支持：添加记录、编辑记录、删除记录、导出记录
 */

import React, { useState, useMemo, useEffect } from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { Seedling, DailyRecord } from '../../../../types/crop';
import { useDictionaryStore, getDictItems, useSeedlingStore } from '../../../../stores';
import { Input } from '../../../ui/input';
import { DatePicker } from '../../../ui/DatePicker';
import { Label } from '@/components/ui/label';
import { TextArea } from '../../../ui/TextArea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { showAlert, showConfirm } from '@/lib/dialogService';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Download, X, Check } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DailyRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  record: Seedling;
}

export function DailyRecordModal({ isOpen, onClose, onSuccess, record }: DailyRecordModalProps) {
  const dictionaries = useDictionaryStore((state) => state.dictionaries);
  const loadDictionaries = useDictionaryStore((state) => state.loadDictionaries);
  const updateDailyRecord = useSeedlingStore((state) => state.updateDailyRecord);
  const deleteDailyRecord = useSeedlingStore((state) => state.deleteDailyRecord);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (dictionaries.length === 0) {
      loadDictionaries();
    }
  }, [dictionaries.length, loadDictionaries]);

  const latestDailyRecords = useMemo(() => {
    void refreshKey;
    const latestRecord = useSeedlingStore.getState().items.find(s => s.id === record.id);
    return latestRecord?.dailyRecords || record.dailyRecords || [];
  }, [record.id, refreshKey]);

  const handleSuccess = () => {
    setRefreshKey(k => k + 1);
    onSuccess?.();
  };

  const OPERATORS = useMemo(() => {
    return getDictItems('operator').map(d => ({ value: d.dictCode, label: d.dictLabel }));
  }, [dictionaries]);

  const [formData, setFormData] = useState({
    recordDate: new Date().toISOString().split('T')[0],
    temperature: undefined as number | undefined,
    humidity: undefined as number | undefined,
    watering: false,
    abnormality: '',
    survivalCountChange: undefined as number | undefined,
    plantedCountChange: undefined as number | undefined,
    lossCountChange: undefined as number | undefined,
    remarks: '',
    phValue: undefined as number | undefined,
    ecValue: undefined as number | undefined,
    operator: ''
  });

  // 编辑状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<Partial<DailyRecord>>({});

  const handleSubmit = async () => {
    if (!formData.recordDate) {
      await showAlert('请选择记录日期');
      return;
    }

    try {
      const result = await useSeedlingStore.getState().addDailyRecord(String(record.id), {
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
      if (!result) {
        await showAlert('添加记录失败，请重试');
        return;
      }
      // 重置表单
      setFormData({
        recordDate: new Date().toISOString().split('T')[0],
        temperature: undefined,
        humidity: undefined,
        watering: false,
        abnormality: '',
        survivalCountChange: undefined,
        plantedCountChange: undefined,
        lossCountChange: undefined,
        remarks: '',
        phValue: undefined,
        ecValue: undefined,
        operator: ''
      });
    } catch (error) {
      console.error('添加每日记录失败:', error);
      await showAlert('添加记录失败，请重试');
      return;
    }

    handleSuccess();
  };

  // 开始编辑
  const handleStartEdit = (r: DailyRecord) => {
    setEditingId(r.id);
    setEditingRow({ ...r });
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingRow({});
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      const success = await updateDailyRecord(record.id, editingId, editingRow);
      if (!success) {
        await showAlert('更新记录失败，请重试');
        return;
      }
      setEditingId(null);
      setEditingRow({});
      handleSuccess();
    } catch (error) {
      console.error('更新每日记录失败:', error);
      await showAlert('更新记录失败，请重试');
    }
  };

  // 删除记录
  const handleDelete = async (r: DailyRecord) => {
    const confirmed = await showConfirm(`确定要删除 ${r.recordDate} 的这条记录吗？`);
    if (!confirmed) return;
    try {
      const success = await deleteDailyRecord(record.id, r.id);
      if (!success) {
        await showAlert('删除记录失败，请重试');
        return;
      }
      handleSuccess();
    } catch (error) {
      console.error('删除每日记录失败:', error);
      await showAlert('删除记录失败，请重试');
    }
  };

  // 导出记录
  const handleExport = async () => {
    if (latestDailyRecords.length === 0) {
      await showAlert('没有记录可导出');
      return;
    }
    const data = latestDailyRecords.map(r => ({
      '日期': r.recordDate,
      '温度(℃)': r.temperature ?? '',
      '湿度(%)': r.humidity ?? '',
      'pH值': r.phValue ?? '',
      'EC值(mS/cm)': r.ecValue ?? '',
      '浇水': r.watering ? '是' : '否',
      '成活变化': r.survivalCountChange ?? '',
      '定植变化': r.plantedCountChange ?? '',
      '损耗变化': r.lossCountChange ?? '',
      '操作员': r.operator ?? '',
      '备注': r.remarks ?? ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '每日记录');
    XLSX.writeFile(wb, `每日记录_${record.seedlingCode}.xlsx`);
  };

  // 渲染可编辑单元格
  const renderEditableCell = (r: DailyRecord, field: keyof DailyRecord, value: any) => {
    if (editingId === r.id) {
      if (field === 'watering') {
        return (
          <Input
            type="checkbox"
            checked={editingRow.watering || false}
            onChange={(e) => setEditingRow({ ...editingRow, watering: e.target.checked })}
            className="w-5 h-5"
          />
        );
      }
      if (field === 'recordDate') {
        return (
          <Input
            type="date"
            value={editingRow.recordDate || ''}
            onChange={(e) => setEditingRow({ ...editingRow, recordDate: e.target.value })}
            className="w-full px-1 py-0.5 text-xs border border-gray-400 rounded"
          />
        );
      }
      return (
        <Input
          type="number"
          value={editingRow[field as keyof DailyRecord] ?? ''}
          onChange={(e) => setEditingRow({
            ...editingRow,
            [field]: e.target.value ? Number(e.target.value) : undefined
          })}
          className="w-full px-1 py-0.5 text-xs border border-gray-400 rounded"
        />
      );
    }
    // 显示模式
    if (field === 'watering') return r.watering ? '✓' : '✗';
    if (field === 'survivalCountChange' && value !== undefined) {
      return (
        <span className={value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-500'}>
          {value > 0 ? '+' : ''}{value}
        </span>
      );
    }
    if (field === 'plantedCountChange' && value !== undefined) {
      return (
        <span className={value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-500'}>
          {value > 0 ? '+' : ''}{value}
        </span>
      );
    }
    if (field === 'lossCountChange' && value !== undefined) {
      return <span className="text-red-600">+{value}</span>;
    }
    if (value === undefined || value === null || value === '') return '-';
    if (field === 'temperature') return `${value}℃`;
    if (field === 'humidity') return `${value}%`;
    return value;
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`每日记录 - ${record.seedlingCode}`}
      size="xxxl"
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="添加记录"
      cancelText="取消"
    >
      <div className="space-y-6">
        {/* 添加新记录 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">添加新记录</h4>
          <div className="grid grid-cols-3 gap-4">
            {/* 第一行：记录日期 */}
            <div>
              <Label className="text-gray-700">记录日期</Label>
              <DatePicker
                selected={formData.recordDate ? new Date(formData.recordDate) : undefined}
                onChange={(date) => setFormData({ ...formData, recordDate: date.toISOString().split('T')[0] })}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {/* 第一行：温度 */}
            <div>
              <Label className="text-gray-700">温度（℃）</Label>
              <Input
                type="number"
                value={formData.temperature || ''}
                onChange={(e) => setFormData({ ...formData, temperature: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {/* 第一行：湿度 */}
            <div>
              <Label className="text-gray-700">湿度（%）</Label>
              <Input
                type="number"
                value={formData.humidity || ''}
                onChange={(e) => setFormData({ ...formData, humidity: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {/* 第二行：pH值 */}
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
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {/* 第二行：EC值 */}
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
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {/* 第二行：是否浇水 */}
            <div>
              <Label className="text-gray-700">是否浇水</Label>
              <div className="flex items-center h-full">
                <Input
                  type="checkbox"
                  checked={formData.watering}
                  onChange={(e) => setFormData({ ...formData, watering: e.target.checked })}
                  className="w-5 h-5 text-emerald-600 rounded border-gray-400"
                />
                <span className="ml-2 text-sm text-gray-600">{formData.watering ? '是' : '否'}</span>
              </div>
            </div>
            {/* 第三行：成活变化 */}
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
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {/* 第三行：定植变化 */}
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
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {/* 第三行：损耗数量 */}
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
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {/* 第四行：操作人员（占2列） */}
            <div className="col-span-2">
              <Label className="text-gray-700">操作人员</Label>
              <Select
                value={formData.operator}
                onValueChange={(val) => setFormData({ ...formData, operator: val })}
              >
                <SelectTrigger className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <SelectValue placeholder="请选择操作人员" />
                </SelectTrigger>
                <SelectContent>
                  {OPERATORS.map(op => (
                    <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* 第四行：异常情况 */}
            <div>
              <Label className="text-gray-700">异常情况</Label>
              <Input
                type="text"
                value={formData.abnormality}
                onChange={(e) => setFormData({ ...formData, abnormality: e.target.value })}
                placeholder="无异常请留空"
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {/* 备注（单独一行，占3列） */}
            <div className="col-span-3">
              <Label className="text-gray-700">备注</Label>
              <TextArea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                placeholder="请输入备注信息"
              />
            </div>
          </div>
        </div>

        {/* 历史记录列表 */}
        <div>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900">
              历史记录 ({latestDailyRecords.length} 条)
            </h4>
            <Button
              variant="default"
              size="sm"
              onClick={handleExport}
              disabled={latestDailyRecords.length === 0}
              className="flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              导出
            </Button>
          </div>
          {latestDailyRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无记录</div>
          ) : (
            <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-blue-500 text-white sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold w-24">日期</th>
                    <th className="px-2 py-2 text-left font-semibold">温度</th>
                    <th className="px-2 py-2 text-left font-semibold">湿度</th>
                    <th className="px-2 py-2 text-left font-semibold">pH</th>
                    <th className="px-2 py-2 text-left font-semibold">EC</th>
                    <th className="px-2 py-2 text-left font-semibold">浇水</th>
                    <th className="px-2 py-2 text-left font-semibold">成活变化</th>
                    <th className="px-2 py-2 text-left font-semibold">定植变化</th>
                    <th className="px-2 py-2 text-left font-semibold">损耗变化</th>
                    <th className="px-2 py-2 text-left font-semibold">操作员</th>
                    <th className="px-2 py-2 text-left font-semibold">备注</th>
                    <th className="px-2 py-2 text-center font-semibold w-24">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {latestDailyRecords.map((r, index) => (
                    <tr key={r.id || index} className="hover:bg-gray-50">
                      <td className="px-2 py-1.5">
                        {editingId === r.id ? (
                          <Input
                            type="date"
                            value={editingRow.recordDate || ''}
                            onChange={(e) => setEditingRow({ ...editingRow, recordDate: e.target.value })}
                            className="w-full px-1 py-0.5 text-xs border border-gray-400 rounded"
                          />
                        ) : r.recordDate}
                      </td>
                      <td className="px-2 py-1.5">
                        {renderEditableCell(r, 'temperature', r.temperature)}
                      </td>
                      <td className="px-2 py-1.5">
                        {renderEditableCell(r, 'humidity', r.humidity)}
                      </td>
                      <td className="px-2 py-1.5">
                        {renderEditableCell(r, 'phValue', r.phValue)}
                      </td>
                      <td className="px-2 py-1.5">
                        {renderEditableCell(r, 'ecValue', r.ecValue)}
                      </td>
                      <td className="px-2 py-1.5">
                        {renderEditableCell(r, 'watering', r.watering)}
                      </td>
                      <td className="px-2 py-1.5">
                        {renderEditableCell(r, 'survivalCountChange', r.survivalCountChange)}
                      </td>
                      <td className="px-2 py-1.5">
                        {renderEditableCell(r, 'plantedCountChange', r.plantedCountChange)}
                      </td>
                      <td className="px-2 py-1.5">
                        {renderEditableCell(r, 'lossCountChange', r.lossCountChange)}
                      </td>
                      <td className="px-2 py-1.5">{r.operator || '-'}</td>
                      <td className="px-2 py-1.5 text-gray-500 truncate max-w-[120px]">{r.remarks || '-'}</td>
                      <td className="px-2 py-1.5 text-center">
                        {editingId === r.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleSaveEdit}
                              className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleCancelEdit}
                              className="h-7 w-7 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStartEdit(r)}
                              className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(r)}
                              className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </UnifiedModal>
  );
}
