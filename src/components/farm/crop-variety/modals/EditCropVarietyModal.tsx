/**
 * 编辑作物品种弹窗
 */

import React, { useState, useEffect } from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextArea } from '@/components/ui/TextArea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { CropVariety, CropVarietyStatus } from '../../../../types/cropVariety';
import { useCropVarietyStore } from '../../../../stores/useCropVarietyStore';
import { showAlert } from '@/lib/dialogService';

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
  // Zustand Store
  const store = useCropVarietyStore();

  // 作物品种：detailVarietyCode !== '00' 时显示最细分品种名称(detailVarietyName)，否则显示子品种或品种名
  const getInitialVarietyName = () => {
    if (variety.detailVarietyCode && variety.detailVarietyCode !== '00') {
      return variety.detailVarietyName || variety.subVariety1Name || variety.varietyName || '';
    }
    return variety.subVariety1Name || variety.varietyName || '';
  };

  const [formData, setFormData] = useState({
    varietyName: getInitialVarietyName(),
    alias: variety.alias?.join(', ') || '',
    image: variety.image || '',
    description: variety.description || '',
    germinationPeriod: variety.germinationPeriod,
    seedlingPeriod: variety.seedlingPeriod,
    floweringPeriod: variety.floweringPeriod,
    fruitingPeriod: variety.fruitingPeriod,
    harvestPeriod: variety.harvestPeriod,
    airTemperature: variety.airTemperature,
    airHumidity: variety.airHumidity,
    co2Content: variety.co2Content,
    lightIntensity: variety.lightIntensity,
    soilTemperature: variety.soilTemperature,
    soilHumidity: variety.soilHumidity,
    soilPh: variety.soilPh,
    soilEc: variety.soilEc,
    status: variety.status,
    remarks: variety.remarks || ''
  });

  // 当 variety 变化时重置表单
  useEffect(() => {
    setFormData({
      varietyName: getInitialVarietyName(),
      alias: variety.alias?.join(', ') || '',
      image: variety.image || '',
      description: variety.description || '',
      germinationPeriod: variety.germinationPeriod,
      seedlingPeriod: variety.seedlingPeriod,
      floweringPeriod: variety.floweringPeriod,
      fruitingPeriod: variety.fruitingPeriod,
      harvestPeriod: variety.harvestPeriod,
      airTemperature: variety.airTemperature,
      airHumidity: variety.airHumidity,
      co2Content: variety.co2Content,
      lightIntensity: variety.lightIntensity,
      soilTemperature: variety.soilTemperature,
      soilHumidity: variety.soilHumidity,
      soilPh: variety.soilPh,
      soilEc: variety.soilEc,
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
  const handleSubmit = async () => {
    try {
      // 判断更新哪个字段：有 detailVarietyCode 且不为 '00' 时更新 detailVarietyName，否则更新 varietyName
      const hasDetail = variety.detailVarietyCode && variety.detailVarietyCode !== '00';
      const updateData: Record<string, unknown> = {
        alias: parseAlias(formData.alias),
        image: formData.image || undefined,
        description: formData.description || undefined,
        germinationPeriod: formData.germinationPeriod,
        seedlingPeriod: formData.seedlingPeriod,
        floweringPeriod: formData.floweringPeriod,
        fruitingPeriod: formData.fruitingPeriod,
        harvestPeriod: formData.harvestPeriod,
        airTemperature: formData.airTemperature,
        airHumidity: formData.airHumidity,
        co2Content: formData.co2Content,
        lightIntensity: formData.lightIntensity,
        soilTemperature: formData.soilTemperature,
        soilHumidity: formData.soilHumidity,
        soilPh: formData.soilPh,
        soilEc: formData.soilEc,
        status: formData.status as CropVarietyStatus,
        remarks: formData.remarks
      };
      // 根据是否有 detail 级别决定更新哪个名称字段
      if (hasDetail) {
        updateData.detailVarietyName = formData.varietyName;
      } else {
        updateData.varietyName = formData.varietyName;
      }
      await store.updateItem(variety.id, updateData);
      onSuccess();
      onClose();
    } catch (error) {
      await showAlert('保存失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑作物品种"
      size="xxl"
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="保存"
      cancelText="取消"
    >
      <div className="space-y-6">
        {/* 品种信息（只读）- 灰色背景 */}
        <div className="bg-gray-100 rounded-lg p-4">
          <h4 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
            品种信息（不可修改）
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-gray-500">作物编码</Label>
              <p className="font-mono text-gray-600 font-medium bg-gray-200 px-2 py-1 rounded">{variety.cropCode}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">类别</Label>
              <p className="text-gray-600 bg-gray-200 px-2 py-1 rounded">{variety.categoryName}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">类型</Label>
              <p className="text-gray-600 bg-gray-200 px-2 py-1 rounded">{variety.typeName}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">品种</Label>
              <p className="text-gray-700 font-medium bg-gray-200 px-2 py-1 rounded">{variety.varietyName}</p>
            </div>
            {variety.subVariety1Name && (
              <div>
                <Label className="text-xs text-gray-500">子品种</Label>
                <p className="text-gray-700 font-medium bg-gray-200 px-2 py-1 rounded">{variety.subVariety1Name}</p>
              </div>
            )}
          </div>
        </div>

        {/* 可编辑字段 */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {/* 作物品种 - 蓝色标签必填 */}
          <div className="col-span-2">
            <Label className="font-bold text-blue-700">
              作物品种 <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              value={formData.varietyName}
              onChange={(e) => setFormData({ ...formData, varietyName: e.target.value })}
              placeholder="如：红颜草莓、红颜草莓-A"
              className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
            />
          </div>

          {/* 别名 - 橙色标签可选 */}
          <div>
            <Label className="text-amber-700">
              别名 <span className="text-xs text-gray-400">(多个用逗号分隔)</span>
            </Label>
            <Input
              type="text"
              value={formData.alias}
              onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
              placeholder="如：西红柿、洋柿子"
              className="w-full px-3 py-2 border-2 border-amber-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            />
          </div>

          {/* 图片 */}
          <div>
            <Label className="text-amber-700">
              图片
            </Label>
            <div className="flex items-center gap-3">
              {formData.image && (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-amber-200 flex-shrink-0">
                  <img src={formData.image} alt="预览" className="w-full h-full object-cover" />
                </div>
              )}
              <Label className="flex-1 px-3 py-2 border border-amber-200 rounded-lg text-sm bg-amber-50 cursor-pointer hover:bg-amber-100 transition-colors flex items-center justify-center">
                <span className="text-amber-600">
                  {formData.image ? '更换图片' : '上传图片'}
                </span>
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setFormData({ ...formData, image: event.target?.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </Label>
              {formData.image && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setFormData({ ...formData, image: '' })}
                >
                  删除
                </Button>
              )}
            </div>
          </div>

          {/* 特性描述 */}
          <div className="col-span-2">
            <Label className="text-amber-700">
              特性描述
            </Label>
            <TextArea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              placeholder="简要描述该作物品种的主要特性..."
              className="w-full px-3 py-2 border-2 border-amber-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white resize-none"
            />
          </div>

          {/* 作物生长周期 */}
          <div className="col-span-2">
            <Label className="font-bold text-amber-700">
              作物生长周期
            </Label>
            <div className="grid grid-cols-5 gap-3">
              <div>
                <Label className="text-xs text-amber-600">发芽期(天)</Label>
                <Input
                  type="number"
                  value={formData.germinationPeriod || ''}
                  onChange={(e) => setFormData({ ...formData, germinationPeriod: Number(e.target.value) || undefined })}
                  placeholder="0"
                  className="w-full px-2 py-1.5 border-2 border-amber-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>
              <div>
                <Label className="text-xs text-amber-600">育苗期(天)</Label>
                <Input
                  type="number"
                  value={formData.seedlingPeriod || ''}
                  onChange={(e) => setFormData({ ...formData, seedlingPeriod: Number(e.target.value) || undefined })}
                  placeholder="0"
                  className="w-full px-2 py-1.5 border-2 border-amber-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>
              <div>
                <Label className="text-xs text-amber-600">开花期(天)</Label>
                <Input
                  type="number"
                  value={formData.floweringPeriod || ''}
                  onChange={(e) => setFormData({ ...formData, floweringPeriod: Number(e.target.value) || undefined })}
                  placeholder="0"
                  className="w-full px-2 py-1.5 border-2 border-amber-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>
              <div>
                <Label className="text-xs text-amber-600">结果期(天)</Label>
                <Input
                  type="number"
                  value={formData.fruitingPeriod || ''}
                  onChange={(e) => setFormData({ ...formData, fruitingPeriod: Number(e.target.value) || undefined })}
                  placeholder="0"
                  className="w-full px-2 py-1.5 border-2 border-amber-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>
              <div>
                <Label className="text-xs text-amber-600">摘收期(天)</Label>
                <Input
                  type="number"
                  value={formData.harvestPeriod || ''}
                  onChange={(e) => setFormData({ ...formData, harvestPeriod: Number(e.target.value) || undefined })}
                  placeholder="0"
                  className="w-full px-2 py-1.5 border-2 border-amber-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* 状态 - 绿色标签 */}
          <div>
            <Label className="font-bold text-emerald-700">状态</Label>
            <Select
              value={formData.status}
              onValueChange={(val) => setFormData({ ...formData, status: val as CropVarietyStatus })}
            >
              <SelectTrigger className="w-full px-3 py-2 border-2 border-emerald-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50">
                <SelectValue placeholder="启用" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">启用</SelectItem>
                <SelectItem value="inactive">停用</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 作物适宜环境参数 - 4列布局 */}
          <div className="col-span-2">
            <Label className="font-bold text-cyan-700">
              作物适宜环境参数
            </Label>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className="text-xs text-cyan-600">空气温度(℃)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.airTemperature ?? ''}
                  onChange={(e) => setFormData({ ...formData, airTemperature: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0.00"
                  className="w-full px-2 py-1.5 border border-cyan-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-cyan-50"
                />
              </div>
              <div>
                <Label className="text-xs text-cyan-600">空气湿度(%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.airHumidity ?? ''}
                  onChange={(e) => setFormData({ ...formData, airHumidity: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0.00"
                  className="w-full px-2 py-1.5 border border-cyan-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-cyan-50"
                />
              </div>
              <div>
                <Label className="text-xs text-cyan-600">CO₂含量(ppm)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.co2Content ?? ''}
                  onChange={(e) => setFormData({ ...formData, co2Content: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0.00"
                  className="w-full px-2 py-1.5 border border-cyan-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-cyan-50"
                />
              </div>
              <div>
                <Label className="text-xs text-cyan-600">光照度(lx)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.lightIntensity ?? ''}
                  onChange={(e) => setFormData({ ...formData, lightIntensity: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0.00"
                  className="w-full px-2 py-1.5 border border-cyan-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-cyan-50"
                />
              </div>
              <div>
                <Label className="text-xs text-cyan-600">土壤温度(℃)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.soilTemperature ?? ''}
                  onChange={(e) => setFormData({ ...formData, soilTemperature: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0.00"
                  className="w-full px-2 py-1.5 border border-cyan-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-cyan-50"
                />
              </div>
              <div>
                <Label className="text-xs text-cyan-600">土壤湿度(%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.soilHumidity ?? ''}
                  onChange={(e) => setFormData({ ...formData, soilHumidity: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0.00"
                  className="w-full px-2 py-1.5 border border-cyan-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-cyan-50"
                />
              </div>
              <div>
                <Label className="text-xs text-cyan-600">土壤PH值</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.soilPh ?? ''}
                  onChange={(e) => setFormData({ ...formData, soilPh: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0.00"
                  className="w-full px-2 py-1.5 border border-cyan-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-cyan-50"
                />
              </div>
              <div>
                <Label className="text-xs text-cyan-600">土壤EC值</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.soilEc ?? ''}
                  onChange={(e) => setFormData({ ...formData, soilEc: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0.00"
                  className="w-full px-2 py-1.5 border border-cyan-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-cyan-50"
                />
              </div>
            </div>
          </div>

          {/* 备注 */}
          <div className="col-span-2">
            <Label className="text-gray-500">备注</Label>
            <TextArea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              rows={3}
              placeholder="请输入备注信息..."
              className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
            />
          </div>
        </div>
      </div>
    </UnifiedModal>
  );
}
