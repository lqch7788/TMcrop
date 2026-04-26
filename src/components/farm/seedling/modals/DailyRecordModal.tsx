/**
 * 每日记录弹窗
 */

import React, { useState } from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { Seedling, DailyRecord } from '../../../../types/crop';
import { addDailyRecord } from '../../../../services/seedlingService';

interface DailyRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  record: Seedling;
}

export function DailyRecordModal({ isOpen, onClose, onSuccess, record }: DailyRecordModalProps) {
  const [formData, setFormData] = useState({
    recordDate: new Date().toISOString().split('T')[0],
    temperature: undefined as number | undefined,
    humidity: undefined as number | undefined,
    watering: false,
    abnormality: '',
    remarks: ''
  });

  const handleSubmit = () => {
    if (!formData.recordDate) {
      alert('请选择记录日期');
      return;
    }

    // 调用服务添加每日记录
    addDailyRecord(record.id, {
      recordDate: formData.recordDate,
      temperature: formData.temperature,
      humidity: formData.humidity,
      watering: formData.watering,
      abnormality: formData.abnormality,
      remarks: formData.remarks
    });

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
              <label className="block text-sm font-medium text-gray-700 mb-1">记录日期</label>
              <input
                type="date"
                value={formData.recordDate}
                onChange={(e) => setFormData({ ...formData, recordDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">温度（℃）</label>
              <input
                type="number"
                value={formData.temperature || ''}
                onChange={(e) => setFormData({ ...formData, temperature: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">湿度（%）</label>
              <input
                type="number"
                value={formData.humidity || ''}
                onChange={(e) => setFormData({ ...formData, humidity: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">是否浇水</label>
              <div className="flex items-center h-full">
                <input
                  type="checkbox"
                  checked={formData.watering}
                  onChange={(e) => setFormData({ ...formData, watering: e.target.checked })}
                  className="w-5 h-5 text-emerald-600 rounded border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-600">{formData.watering ? '是' : '否'}</span>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">异常情况</label>
              <input
                type="text"
                value={formData.abnormality}
                onChange={(e) => setFormData({ ...formData, abnormality: e.target.value })}
                placeholder="请输入异常情况，无异常请留空"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                placeholder="请输入备注信息"
              />
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
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                    {r.temperature && <span>温度: {r.temperature}℃</span>}
                    {r.humidity && <span>湿度: {r.humidity}%</span>}
                    {r.abnormality && <span className="text-red-600">异常: {r.abnormality}</span>}
                  </div>
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
