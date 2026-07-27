/**
 * 编辑作物品种弹窗
 */

import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { EnvironmentRangeInput } from '../EnvironmentRangeInput';
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
    // 2026-07-27：按 9 位新编码规则，"品种"对应 subVariety1Name（3 位数字）
    // 保留 varietyName fallback（兼容 detailVarietyName 兜底场景）
    varietyName: getInitialVarietyName(),
    subVariety1Name: variety.subVariety1Name || '',
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
      // 2026-07-27 修复：补全 subVariety1Name 初始化（之前漏了，导致 formData.subVariety1Name 永远是 ''，保存时 fallback 到 variety 原值，新编辑丢失）
      subVariety1Name: variety.subVariety1Name || '',
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
      // 2026-07-27：按 9 位新编码规则，用户编辑的"品种"对应 subVariety1Name
      // 兼容历史 detailVarietyName 兜底
      if (hasDetail && formData.subVariety1Name) {
        updateData.detailVarietyName = formData.subVariety1Name;
      }
      updateData.subVariety1Name = formData.subVariety1Name || variety.subVariety1Name;
      if (!formData.subVariety1Name && hasDetail) {
        updateData.detailVarietyName = formData.varietyName;
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
          {/* 2026-07-27：作物 + 品种合并到同一行（9 位编码 4 段连续展示：类别/类型/作物/品种） */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-gray-500">作物编码（9位）</Label>
              <p className="font-mono text-gray-600 font-medium bg-gray-200 px-2 py-1 rounded">{variety.cropCode}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">类别（2位字母）</Label>
              <p className="text-gray-600 bg-gray-200 px-2 py-1 rounded">{variety.categoryCode} - {variety.categoryName}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">类型（2位数字）</Label>
              <p className="text-gray-600 bg-gray-200 px-2 py-1 rounded">{variety.typeCode} - {variety.typeName}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">作物（2位数字）</Label>
              <p className="text-gray-700 font-medium bg-gray-200 px-2 py-1 rounded">{variety.varietyCode} - {variety.varietyName}</p>
            </div>
            {/* 品种（3位数字）紧跟作物 — 同一行左侧对齐 */}
            {variety.subVariety1Name && (
              <div className="col-span-2">
                <Label className="text-xs text-gray-500">品种（3位数字）— 对应作物右侧</Label>
                <p className="text-gray-700 font-medium bg-gray-200 px-2 py-1 rounded">{variety.subVariety1Code} - {variety.subVariety1Name}</p>
              </div>
            )}
          </div>
        </div>

        {/* 可编辑字段 */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {/* 品种（3位数字）— 2026-07-27：从 col-span-2 整行改为 1 列，与"别名"同行（响应用户"与作物字段在同一行"要求） */}
          <div>
            <Label className="font-bold text-blue-700">
              品种 <span className="text-red-500">*</span>
              <span className="text-xs text-gray-400 ml-2 font-normal">（3位数字位）</span>
            </Label>
            <Input
              type="text"
              value={formData.subVariety1Name}
              onChange={(e) => setFormData({ ...formData, subVariety1Name: e.target.value })}
              placeholder="如：红颜、丰香"
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
                  <Trash2 className="w-4 h-4" /> 删除
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
                <EnvironmentRangeInput
                  value={formData.germinationPeriod ? String(formData.germinationPeriod) : ''}
                  onChange={(v) => setFormData({ ...formData, germinationPeriod: v || undefined })}
                  placeholderMin="最少"
                  placeholderMax="最多"
                />
              </div>
              <div>
                <Label className="text-xs text-amber-600">育苗期(天)</Label>
                <EnvironmentRangeInput
                  value={formData.seedlingPeriod ? String(formData.seedlingPeriod) : ''}
                  onChange={(v) => setFormData({ ...formData, seedlingPeriod: v || undefined })}
                  placeholderMin="最少"
                  placeholderMax="最多"
                />
              </div>
              <div>
                <Label className="text-xs text-amber-600">开花期(天)</Label>
                <EnvironmentRangeInput
                  value={formData.floweringPeriod ? String(formData.floweringPeriod) : ''}
                  onChange={(v) => setFormData({ ...formData, floweringPeriod: v || undefined })}
                  placeholderMin="最少"
                  placeholderMax="最多"
                />
              </div>
              <div>
                <Label className="text-xs text-amber-600">结果期(天)</Label>
                <EnvironmentRangeInput
                  value={formData.fruitingPeriod ? String(formData.fruitingPeriod) : ''}
                  onChange={(v) => setFormData({ ...formData, fruitingPeriod: v || undefined })}
                  placeholderMin="最少"
                  placeholderMax="最多"
                />
              </div>
              <div>
                <Label className="text-xs text-amber-600">摘收期(天)</Label>
                <EnvironmentRangeInput
                  value={formData.harvestPeriod ? String(formData.harvestPeriod) : ''}
                  onChange={(v) => setFormData({ ...formData, harvestPeriod: v || undefined })}
                  placeholderMin="最少"
                  placeholderMax="最多"
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
                <EnvironmentRangeInput
                  value={formData.airTemperature ? String(formData.airTemperature) : ''}
                  onChange={(v) => setFormData({ ...formData, airTemperature: v || undefined })}
                  placeholderMin="最小℃"
                  placeholderMax="最大℃"
                />
              </div>
              <div>
                <Label className="text-xs text-cyan-600">空气湿度(%)</Label>
                <EnvironmentRangeInput
                  value={formData.airHumidity ? String(formData.airHumidity) : ''}
                  onChange={(v) => setFormData({ ...formData, airHumidity: v || undefined })}
                  placeholderMin="最小%"
                  placeholderMax="最大%"
                />
              </div>
              <div>
                <Label className="text-xs text-cyan-600">CO₂含量(ppm)</Label>
                <EnvironmentRangeInput
                  value={formData.co2Content ? String(formData.co2Content) : ''}
                  onChange={(v) => setFormData({ ...formData, co2Content: v || undefined })}
                  placeholderMin="最小ppm"
                  placeholderMax="最大ppm"
                />
              </div>
              <div>
                <Label className="text-xs text-cyan-600">光照度(lx)</Label>
                <EnvironmentRangeInput
                  value={formData.lightIntensity ? String(formData.lightIntensity) : ''}
                  onChange={(v) => setFormData({ ...formData, lightIntensity: v || undefined })}
                  placeholderMin="最小lx"
                  placeholderMax="最大lx"
                />
              </div>
              <div>
                <Label className="text-xs text-cyan-600">土壤温度(℃)</Label>
                <EnvironmentRangeInput
                  value={formData.soilTemperature ? String(formData.soilTemperature) : ''}
                  onChange={(v) => setFormData({ ...formData, soilTemperature: v || undefined })}
                  placeholderMin="最小℃"
                  placeholderMax="最大℃"
                />
              </div>
              <div>
                <Label className="text-xs text-cyan-600">土壤湿度(%)</Label>
                <EnvironmentRangeInput
                  value={formData.soilHumidity ? String(formData.soilHumidity) : ''}
                  onChange={(v) => setFormData({ ...formData, soilHumidity: v || undefined })}
                  placeholderMin="最小%"
                  placeholderMax="最大%"
                />
              </div>
              <div>
                <Label className="text-xs text-cyan-600">土壤PH值</Label>
                <EnvironmentRangeInput
                  value={formData.soilPh ? String(formData.soilPh) : ''}
                  onChange={(v) => setFormData({ ...formData, soilPh: v || undefined })}
                  placeholderMin="最小"
                  placeholderMax="最大"
                />
              </div>
              <div>
                <Label className="text-xs text-cyan-600">土壤EC值</Label>
                <EnvironmentRangeInput
                  value={formData.soilEc ? String(formData.soilEc) : ''}
                  onChange={(v) => setFormData({ ...formData, soilEc: v || undefined })}
                  placeholderMin="最小"
                  placeholderMax="最大"
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
