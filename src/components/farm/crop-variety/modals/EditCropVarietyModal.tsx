/**
 * 编辑作物品种弹窗
 */

import React, { useState, useEffect } from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { CropVariety, CropVarietyStatus } from '../../../../types/cropVariety';
import { updateVariety } from '../../../../services/cropVarietyService';

interface EditCropVarietyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  variety: CropVariety;
}

export function EditCropVarietyModal({
  isOpen,
  onClose,
  onSuccess,
  variety
}: EditCropVarietyModalProps) {
  const [formData, setFormData] = useState({
    varietyName: variety.varietyName || '',
    alias: variety.alias?.join(', ') || '',
    growthCycle: variety.growthCycle,
    targetYield: variety.targetYield,
    yieldUnit: variety.yieldUnit || 'kg/亩',
    status: variety.status,
    remarks: variety.remarks || ''
  });

  // 当 variety 变化时重置表单
  useEffect(() => {
    setFormData({
      varietyName: variety.varietyName || '',
      alias: variety.alias?.join(', ') || '',
      growthCycle: variety.growthCycle,
      targetYield: variety.targetYield,
      yieldUnit: variety.yieldUnit || 'kg/亩',
      status: variety.status,
      remarks: variety.remarks || ''
    });
  }, [variety]);

  // 解析别名
  const parseAlias = (aliasStr: string): string[] => {
    if (!aliasStr.trim()) return [];
    return aliasStr.split(/[,，;；]/).map(s => s.trim()).filter(s => s);
  };

  // 提交
  const handleSubmit = () => {
    updateVariety(variety.id, {
      varietyName: formData.varietyName,
      alias: parseAlias(formData.alias),
      growthCycle: formData.growthCycle,
      targetYield: formData.targetYield,
      yieldUnit: formData.yieldUnit,
      status: formData.status as CropVarietyStatus,
      remarks: formData.remarks
    });

    onSuccess();
    onClose();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑作物品种"
      size="lg"
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="保存"
      cancelText="取消"
    >
      <div className="space-y-6">
        {/* 品种信息（只读） */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">品种信息（不可修改）</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">作物编码</label>
              <p className="font-mono text-emerald-600 font-medium">{variety.cropCode}</p>
              <p className="text-xs text-gray-400 mt-1">格式：类别(2位) + 类型(2位) + 品种(2位) + 子品种(3位)</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">类别</label>
              <p className="text-gray-700">{variety.categoryName}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">类型</label>
              <p className="text-gray-700">{variety.typeName}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">品种</label>
              <p className="text-gray-900 font-medium">{variety.varietyName}</p>
            </div>
            {variety.subVariety1Name && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">子品种</label>
                <p className="text-gray-900 font-medium">{variety.subVariety1Name}</p>
              </div>
            )}
          </div>
        </div>

        {/* 可编辑字段 */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {/* 作物名称 */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-900 mb-1">
              作物名称
            </label>
            <input
              type="text"
              value={formData.varietyName}
              onChange={(e) => setFormData({ ...formData, varietyName: e.target.value })}
              placeholder="如：红颜草莓、红颜草莓-A"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* 别名 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              别名 <span className="text-xs text-gray-400">(多个用逗号分隔)</span>
            </label>
            <input
              type="text"
              value={formData.alias}
              onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
              placeholder="如：西红柿、洋柿子"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* 状态 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">状态</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as CropVarietyStatus })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="active">启用</option>
              <option value="inactive">停用</option>
            </select>
          </div>

          {/* 生长周期 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              生长周期 <span className="text-xs text-gray-400">(天)</span>
            </label>
            <input
              type="number"
              value={formData.growthCycle || ''}
              onChange={(e) => setFormData({ ...formData, growthCycle: Number(e.target.value) || undefined })}
              placeholder="如：120"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* 目标产量 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">目标产量</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={formData.targetYield || ''}
                onChange={(e) => setFormData({ ...formData, targetYield: Number(e.target.value) || undefined })}
                placeholder="如：5000"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <select
                value={formData.yieldUnit}
                onChange={(e) => setFormData({ ...formData, yieldUnit: e.target.value })}
                className="w-24 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="kg/亩">kg/亩</option>
                <option value="斤/亩">斤/亩</option>
                <option value="吨/亩">吨/亩</option>
              </select>
            </div>
          </div>

          {/* 备注 */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-900 mb-1">备注</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              rows={3}
              placeholder="请输入备注信息..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>
        </div>
      </div>
    </UnifiedModal>
  );
}
