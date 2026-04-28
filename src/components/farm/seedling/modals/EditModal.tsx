/**
 * 育苗编辑弹窗
 */

import React, { useState, useEffect } from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { Seedling, SeedSource } from '../../../../types/crop';
import { updateSeedling } from '../../../../services/seedlingService';
import CropCodeSelector from '../../common/CropCodeSelector';
import { CropVarietyOption } from '../../../../types/cropVariety';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  record: Seedling;
  seedSources: SeedSource[];
  cropVarietyOptions: CropVarietyOption[];
  seedlingTypes: Array<{ value: string; label: string }>;
  sites: Array<{ value: string; label: string }>;
}

export function EditModal({
  isOpen,
  onClose,
  onSuccess,
  record,
  seedSources,
  cropVarietyOptions,
  seedlingTypes,
  sites
}: EditModalProps) {
  const [formData, setFormData] = useState({
    sourceId: record.sourceId,
    sourceCode: record.sourceCode,
    selectedCropCode: record.cropCode || '',
    cropName: record.cropName,
    cropVariety: record.cropVariety,
    seedlingType: record.seedlingType,
    siteId: record.siteId,
    siteName: record.siteName,
    startDate: record.startDate,
    expectedEndDate: record.expectedEndDate || '',
    endDate: record.endDate || '',
    initialCount: record.initialCount,
    survivalCount: record.survivalCount,
    plantedCount: record.plantedCount,
    remarks: record.remarks || ''
  });

  // 当 record 变化时重置表单
  useEffect(() => {
    setFormData({
      sourceId: record.sourceId,
      sourceCode: record.sourceCode,
      selectedCropCode: record.cropCode || '',
      cropName: record.cropName,
      cropVariety: record.cropVariety,
      seedlingType: record.seedlingType,
      siteId: record.siteId,
      siteName: record.siteName,
      startDate: record.startDate,
      expectedEndDate: record.expectedEndDate || '',
      endDate: record.endDate || '',
      initialCount: record.initialCount,
      survivalCount: record.survivalCount,
      plantedCount: record.plantedCount,
      remarks: record.remarks || ''
    });
  }, [record]);

  const handleSubmit = () => {
    // 获取场地名称
    const site = sites.find(s => s.value === formData.siteId);
    const siteName = site?.label || formData.siteName;

    // 获取种源批号
    const source = seedSources.find(s => s.id === formData.sourceId);
    const sourceCode = source?.seedCode || formData.sourceCode;

    // 计算成苗率和损耗
    const survivalCount = formData.survivalCount;
    const initialCount = formData.initialCount;
    const survivalRate = initialCount > 0 ? Math.round((survivalCount / initialCount) * 100) : 0;
    const lossCount = initialCount - survivalCount;
    const lossRate = initialCount > 0 ? Math.round((lossCount / initialCount) * 100) : 0;

    updateSeedling(record.id, {
      sourceId: formData.sourceId,
      sourceCode,
      cropName: formData.cropName,
      cropVariety: formData.cropVariety,
      cropCode: formData.selectedCropCode,
      seedlingType: formData.seedlingType,
      siteId: formData.siteId,
      siteName,
      startDate: formData.startDate,
      expectedEndDate: formData.expectedEndDate,
      endDate: formData.endDate,
      initialCount: formData.initialCount,
      survivalCount,
      plantedCount: formData.plantedCount,
      survivalRate,
      lossCount,
      lossRate,
      remarks: formData.remarks
    });

    onClose();
    onSuccess?.();
  };

  // 根据选择的种源自动填充作物信息
  const handleSourceChange = (sourceId: string) => {
    const source = seedSources.find(s => s.id === sourceId);
    if (source) {
      setFormData({
        ...formData,
        sourceId,
        sourceCode: source.seedCode,
        selectedCropCode: source.cropCode || '',
        cropName: source.cropName,
        cropVariety: source.cropVariety
      });
    }
  };

  // 处理作物品种选择
  const handleCropCodeChange = (cropCode: string, varietyInfo: any) => {
    setFormData({
      ...formData,
      selectedCropCode: cropCode,
      cropName: varietyInfo?.varietyName || '',
      cropVariety: varietyInfo?.subVariety1Name || varietyInfo?.varietyName || ''
    });
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑育苗"
      size="xl"
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="保存"
      cancelText="取消"
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {/* 关联种源 */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">关联种源</label>
          <select
            value={formData.sourceId}
            onChange={(e) => handleSourceChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">请选择</option>
            {seedSources.map(s => (
              <option key={s.id} value={s.id}>
                {s.seedCode} - {s.cropName} ({s.cropVariety})
              </option>
            ))}
          </select>
        </div>

        {/* 作物品种选择 */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">作物品种</label>
          <CropCodeSelector
            value={formData.selectedCropCode}
            onChange={handleCropCodeChange}
            placeholder="搜索或选择作物品种..."
            size="md"
          />
        </div>

        {/* 育苗方式 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">育苗方式</label>
          <select
            value={formData.seedlingType}
            onChange={(e) => setFormData({ ...formData, seedlingType: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">请选择</option>
            {seedlingTypes.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* 温室场地 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">温室场地</label>
          <select
            value={formData.siteId}
            onChange={(e) => {
              const site = sites.find(s => s.value === e.target.value);
              setFormData({ ...formData, siteId: e.target.value, siteName: site?.label || '' });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">请选择</option>
            {sites.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* 开始日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">开始日期</label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 预计结束日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">预计结束日期</label>
          <input
            type="date"
            value={formData.expectedEndDate}
            onChange={(e) => setFormData({ ...formData, expectedEndDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 初始数量 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">初始数量</label>
          <input
            type="number"
            value={formData.initialCount || ''}
            onChange={(e) => setFormData({ ...formData, initialCount: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 成活数量 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">成活数量</label>
          <input
            type="number"
            value={formData.survivalCount || ''}
            onChange={(e) => setFormData({ ...formData, survivalCount: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 已定植数量 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">已定植数量</label>
          <input
            type="number"
            value={formData.plantedCount || ''}
            onChange={(e) => setFormData({ ...formData, plantedCount: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 备注 - 占两列 */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">备注</label>
          <textarea
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            placeholder="请输入备注信息"
          />
        </div>
      </div>
    </UnifiedModal>
  );
}
