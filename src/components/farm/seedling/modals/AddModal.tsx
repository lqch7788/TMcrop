/**
 * 育苗新增弹窗
 */

import React, { useState } from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { X, Upload } from 'lucide-react';
import { SeedSource, SeedlingStatus } from '../../../../types/crop';
import { addSeedling } from '../../../../services/seedlingService';
import { decreaseAvailableCount, getSeedSourceById } from '../../../../services/seedSourceService';
import * as cropInstanceService from '../../../../services/cropInstanceService';
import CropCodeSelector from '../../common/CropCodeSelector';
import { CropVarietyOption } from '../../../../types/cropVariety';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  seedSources: SeedSource[];
  cropVarietyOptions: CropVarietyOption[];
  seedlingTypes: Array<{ value: string; label: string }>;
  sites: Array<{ value: string; label: string }>;
}

export function AddModal({
  isOpen,
  onClose,
  onSuccess,
  seedSources,
  cropVarietyOptions,
  seedlingTypes,
  sites
}: AddModalProps) {
  const [formData, setFormData] = useState({
    sourceId: '',
    sourceCode: '',
    selectedCropCode: '',
    cropName: '',
    cropVariety: '',
    seedlingType: '',
    siteId: '',
    siteName: '',
    startDate: '',
    expectedEndDate: '',
    initialCount: 0,
    remarks: ''
  });

  // 图片上传状态
  const [pictures, setPictures] = useState<string[]>([]);

  const handleSubmit = () => {
    if (!formData.sourceId || !formData.selectedCropCode || !formData.siteId || !formData.initialCount) {
      alert('请填写完整信息');
      return;
    }

    // 获取场地名称
    const site = sites.find(s => s.value === formData.siteId);
    const siteName = site?.label || '';

    // 获取种源批号
    const source = seedSources.find(s => s.id === formData.sourceId);
    const sourceCode = source?.seedCode || '';

    // 计算成苗率（初始为0）
    const survivalRate = 0;
    const lossRate = 0;

    addSeedling({
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
      initialCount: formData.initialCount,
      survivalCount: 0,
      plantedCount: 0,
      survivalRate,
      lossCount: 0,
      lossRate,
      isFinished: false,
      status: SeedlingStatus.IN_PROGRESS,
      dailyRecords: [],
      pictures: pictures,
      printCount: 0,
      remarks: formData.remarks,
      createBy: '当前用户'
    });

    // 扣减种源可用数量
    decreaseAvailableCount(formData.sourceId, formData.initialCount);

    // 更新作物实例状态为育苗中
    if (source?.instanceId) {
      cropInstanceService.updateQuantity(source.instanceId, 'seedling', 0);
    }

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

  // 场地选择时获取名称
  const handleSiteChange = (siteId: string) => {
    const site = sites.find(s => s.value === siteId);
    setFormData({ ...formData, siteId, siteName: site?.label || '' });
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新增育苗"
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
            onChange={(e) => handleSiteChange(e.target.value)}
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

        {/* 图片上传 - 占两列 */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">图片上传</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            {/* 已上传的图片预览 */}
            {pictures.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {pictures.map((pic, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={pic}
                      alt={`预览${index + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => setPictures(pictures.filter((_, i) => i !== index))}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* 上传按钮 */}
            <label className="flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 rounded-lg py-4">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">点击上传图片</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files) {
                    Array.from(files).forEach(file => {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const result = event.target?.result as string;
                        setPictures([...pictures, result]);
                      };
                      reader.readAsDataURL(file);
                    });
                  }
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </div>
      </div>
    </UnifiedModal>
  );
}
