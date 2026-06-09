import { useState } from 'react';
import { Modal, FormField } from '@/components/ui';
import { NumberInput } from '@/components/ui';
import { Button, Label, DatePicker } from '@/components/ui';
import { Input } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Camera, ChevronDown, ChevronUp, Scan, Wand2, X } from 'lucide-react';
import { WEATHER_OPTIONS, CROP_STATUS_OPTIONS, ISSUE_CATEGORIES, ISSUE_PRESETS, COMPLETION_TIME_OPTIONS } from '../../../../types/farm/common';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

// 天气选项常量（组件外部计算一次）
const WEATHER_OPTION_LABELS = WEATHER_OPTIONS.map(w => w.label);
// 作物状态选项常量（组件外部计算一次）
const CROP_STATUS_LABELS = CROP_STATUS_OPTIONS.map(s => s.label);

// 巡查记录类型（用于表单）
interface InspectionRecordFormData {
  recordCode: string;
  inspectionType: 'farm' | 'equipment' | 'infrastructure' | 'other';
  greenhouseId: string;
  cropName: string;
  inspectorId: string;
  batchId: string;
  batchCode: string;
  checkDate: string;
  checkTime: string;
  duration: number | string;
  weather: string;
  temperature: number | string;
  humidity: number | string;
  cropStatus: string;
  plantHeight: number | string;
  leafCount: number | string;
  // 新增巡查结果字段
  inspectionResult: 'normal' | 'abnormal'; // 正常/异常
  // 问题反馈相关
  feedbackRequired: boolean; // 是否需要反馈
  issueCategories: string[]; // 问题分类（多选）
  issuePresets: string[]; // 快速勾选的问题
  issueText: string; // 问题描述
  issueSeverity?: '轻微' | '中等' | '严重'; // 问题严重程度
  issuePhotos: string[]; // 问题照片（改名避免混淆）
  feedbackUsers: string[]; // 反馈人员（多选）
  // 原有字段保留
  newImages: string[];
  remarks: string;
  equipmentId: string;
  equipmentName: string;
  infrastructureId: string;
  infrastructureName: string;
  // 环境参数
  airTemperature: number | string;
  airHumidity: number | string;
  lightIntensity: number | string;
  co2Concentration: number | string;
  soilTemperature: number | string;
  soilMoisture: number | string;
  soilEc: number | string;
  soilPh: number | string;
}

interface CreateInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  newRecord: InspectionRecordFormData;
  onNewRecordChange: (record: InspectionRecordFormData) => void;
  errors: Record<string, string>;
  generateRecordCode: () => string;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  greenhouses: { id: string; name: string }[];
  users: { id: string; name: string; role: string }[];
  cropTypes: { id: string; name: string }[];
  cropBatches: { id: string; batchCode: string; cropName: string; status: string }[];
  equipmentRecords: { id: string; name: string; location: string; greenhouseId?: string }[];
  infrastructureRecords: { id: string; name: string; type: string; greenhouseId?: string }[];
  onOpenQRScanner: () => void;
}

/**
 * 新增巡查记录弹窗组件
 */
export function CreateInspectionModal({
  isOpen,
  onClose,
  onSubmit,
  newRecord,
  onNewRecordChange,
  errors,
  generateRecordCode,
  onImageUpload,
  onRemoveImage,
  greenhouses,
  users,
  cropTypes,
  cropBatches,
  equipmentRecords,
  infrastructureRecords,
  onOpenQRScanner,
}: CreateInspectionModalProps) {
  const issueCategories = ISSUE_CATEGORIES.map(c => ({ value: c.value, label: c.label }));
  const completionTimeOptions = COMPLETION_TIME_OPTIONS.map(t => ({ value: t.value, label: t.label }));

  const updateField = (field: keyof InspectionRecordFormData, value: unknown) => {
    onNewRecordChange({ ...newRecord, [field]: value });
  };

  // 处理快速勾选问题
  const togglePreset = (preset: string) => {
    const current = newRecord.issuePresets || [];
    if (current.includes(preset)) {
      updateField('issuePresets', current.filter(p => p !== preset));
    } else {
      updateField('issuePresets', [...current, preset]);
    }
  };

  // 处理反馈人员切换
  const toggleFeedbackUser = (userId: string) => {
    const current = newRecord.feedbackUsers || [];
    if (current.includes(userId)) {
      updateField('feedbackUsers', current.filter(id => id !== userId));
    } else {
      updateField('feedbackUsers', [...current, userId]);
    }
  };

  // 获取当前分类的预设选项（取第一个分类的预设）
  const currentPresets = newRecord.issueCategories?.length === 1
    ? (ISSUE_PRESETS[newRecord.issueCategories[0] as keyof typeof ISSUE_PRESETS] || [])
    : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="新增记录"
      size="xl"
      onSubmit={onSubmit}
      submitText="提交记录"
      cancelText="取消"
    >
      <div className="space-y-4">
        {/* 巡查编号和扫码定位 */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <FormField label="巡查编号" required>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newRecord.recordCode}
                  onChange={(e) => updateField('recordCode', e.target.value)}
                  placeholder="点击生成或手动输入"
                  className={deepInputClass + " font-mono"}
                />
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => updateField('recordCode', generateRecordCode())}
                >
                  <Wand2 className="w-4 h-4" /> 生成
                </Button>
              </div>
            </FormField>
          </div>
          <div className="pt-6">
            <Button
              type="button"
              variant="blue"
              size="sm"
              onClick={onOpenQRScanner}
            >
              <Scan className="w-4 h-4" />
              扫码定位
            </Button>
          </div>
        </div>

        {/* 巡查类型选择 */}
        <FormField label="巡查类型" required>
          <Select
            value={newRecord.inspectionType}
            onValueChange={(val) => updateField('inspectionType', val)}
          >
            <SelectTrigger className={deepInputClass}>
              <SelectValue placeholder="种植区域巡查" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="farm">种植区域巡查</SelectItem>
              <SelectItem value="equipment">设备保养巡查</SelectItem>
              <SelectItem value="infrastructure">基础设施巡检</SelectItem>
              <SelectItem value="other">其他</SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        {/* 动态表单区域 - 根据巡查类型显示不同字段 */}
        {newRecord.inspectionType === 'farm' && (
          <div className="grid grid-cols-2 gap-4">
            <FormField label="巡查区域" required error={errors.greenhouseId}>
              <Select
                value={newRecord.greenhouseId}
                onValueChange={(val) => updateField('greenhouseId', val)}
              >
                <SelectTrigger className={deepInputClass}>
                  <SelectValue placeholder="请选择区域" />
                </SelectTrigger>
                <SelectContent>                  {greenhouses.map(gh => (
                    <SelectItem key={gh.id} value={gh.id}>{gh.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="作物名称" required error={errors.cropName}>
              <Select
                value={newRecord.cropName}
                onValueChange={(val) => updateField('cropName', val)}
              >
                <SelectTrigger className={deepInputClass}>
                  <SelectValue placeholder="请选择作物" />
                </SelectTrigger>
                <SelectContent>                  {cropTypes.map(crop => (
                    <SelectItem key={crop.id} value={crop.name}>{crop.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
        )}

        {newRecord.inspectionType === 'equipment' && (
          <div className="grid grid-cols-2 gap-4">
            <FormField label="选择设备" required error={errors.equipmentId}>
              <Select
                value={newRecord.equipmentId}
                onValueChange={(val) => {
                  const eq = equipmentRecords.find(x => x.id === val);
                  onNewRecordChange(prev => ({
                    ...prev,
                    equipmentId: val,
                    equipmentName: eq?.name || ''
                  }));
                }}
              >
                <SelectTrigger className={deepInputClass}>
                  <SelectValue placeholder="请选择设备" />
                </SelectTrigger>
                <SelectContent>                  {equipmentRecords.map(eq => (
                    <SelectItem key={eq.id} value={eq.id}>{eq.name} - {eq.location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="设备名称">
              <Input
                type="text"
                value={newRecord.equipmentName}
                readOnly
                placeholder="自动填充"
                className={deepInputClass + " bg-gray-50"}
              />
            </FormField>
          </div>
        )}

        {newRecord.inspectionType === 'infrastructure' && (
          <div className="grid grid-cols-2 gap-4">
            <FormField label="选择基础设施" required error={errors.infrastructureId}>
              <Select
                value={newRecord.infrastructureId}
                onValueChange={(val) => {
                  const inf = infrastructureRecords.find(x => x.id === val);
                  // 使用函数式更新确保两个字段同步更新
                  onNewRecordChange(prev => ({
                    ...prev,
                    infrastructureId: val,
                    infrastructureName: inf?.name || ''
                  }));
                }}
              >
                <SelectTrigger className={deepInputClass}>
                  <SelectValue placeholder="请选择基础设施" />
                </SelectTrigger>
                <SelectContent>                  {infrastructureRecords.map(inf => (
                    <SelectItem key={inf.id} value={inf.id}>{inf.name} - {inf.type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="设施名称">
              <Input
                type="text"
                value={newRecord.infrastructureName}
                readOnly
                placeholder="自动填充"
                className={deepInputClass + " bg-gray-50"}
              />
            </FormField>
          </div>
        )}

        {newRecord.inspectionType === 'other' && (
          <FormField label="其他说明" required error={errors.remarks}>
            <TextArea
              value={newRecord.remarks}
              onChange={(e) => updateField('remarks', e.target.value)}
              placeholder="请输入其他巡查类型的具体说明"
              rows={3}
              className={deepInputClass + " resize-none"}
            />
          </FormField>
        )}

        {/* 巡查人员和关联批次 */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="巡查人员">
            <Input
              type="text"
              value={users.find(u => u.id === newRecord.inspectorId)?.name || ''}
              readOnly
              className={deepInputClass + " bg-gray-50 text-gray-700"}
            />
          </FormField>
          <FormField label="关联生产计划批次">
            <Select
              value={newRecord.batchId}
              onValueChange={(val) => updateField('batchId', val)}
            >
              <SelectTrigger className={deepInputClass}>
                <SelectValue placeholder="不关联批次" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">不关联批次</SelectItem>
                {cropBatches.filter(b => b.status === 'active' || b.status === 'planning').map(batch => (
                  <SelectItem key={batch.id} value={batch.id}>{batch.batchCode} - {batch.cropName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        {/* 日期、时间、时长 */}
        <div className="grid grid-cols-3 gap-4">
          <FormField label="巡查日期" required error={errors.checkDate}>
            <DatePicker
              selected={newRecord.checkDate ? new Date(newRecord.checkDate) : undefined}
              onChange={(date) => updateField('checkDate', date.toISOString().split('T')[0])}
              placeholder="选择日期"
            />
          </FormField>
          <FormField label="巡查时间">
            <Input
              type="time"
              value={newRecord.checkTime}
              onChange={(e) => updateField('checkTime', e.target.value)}
              className={deepInputClass}
            />
          </FormField>
          <FormField label="巡查时长(分钟)">
            <NumberInput
              value={newRecord.duration}
              onChange={(val) => updateField('duration', val)}
              placeholder="选填"
            />
          </FormField>
        </div>

        {/* 种植区域特有字段 */}
        {newRecord.inspectionType === 'farm' && (
          <div className="grid grid-cols-3 gap-4">
            <FormField label="作物状态">
              <Select
                value={newRecord.cropStatus}
                onValueChange={(val) => updateField('cropStatus', val)}
              >
                <SelectTrigger className={deepInputClass}>
                  <SelectValue placeholder="请选择作物状态" />
                </SelectTrigger>
                <SelectContent>
                  {CROP_STATUS_LABELS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="株高(cm)">
              <NumberInput
                value={newRecord.plantHeight}
                onChange={(val) => updateField('plantHeight', val)}
                placeholder="选填"
              />
            </FormField>
            <FormField label="叶片数">
              <NumberInput
                value={newRecord.leafCount}
                onChange={(val) => updateField('leafCount', val)}
                placeholder="选填"
              />
            </FormField>
          </div>
        )}

        {/* 环境参数 - 仅种植区域巡查显示 */}
        {newRecord.inspectionType === 'farm' && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">环境参数</h4>
            <div className="grid grid-cols-4 gap-4">
              <FormField label="空气温度(°C)">
                <NumberInput
                  value={newRecord.airTemperature}
                  onChange={(val) => updateField('airTemperature', val)}
                  placeholder="0.00"
                />
              </FormField>
              <FormField label="空气湿度(%)">
                <NumberInput
                  value={newRecord.airHumidity}
                  onChange={(val) => updateField('airHumidity', val)}
                  placeholder="0.00"
                />
              </FormField>
              <FormField label="光照强度(lux)">
                <NumberInput
                  value={newRecord.lightIntensity}
                  onChange={(val) => updateField('lightIntensity', val)}
                  placeholder="0.00"
                />
              </FormField>
              <FormField label="CO2浓度(ppm)">
                <NumberInput
                  value={newRecord.co2Concentration}
                  onChange={(val) => updateField('co2Concentration', val)}
                  placeholder="0.00"
                />
              </FormField>
              <FormField label="土壤温度(°C)">
                <NumberInput
                  value={newRecord.soilTemperature}
                  onChange={(val) => updateField('soilTemperature', val)}
                  placeholder="0.00"
                />
              </FormField>
              <FormField label="土壤湿度(%)">
                <NumberInput
                  value={newRecord.soilMoisture}
                  onChange={(val) => updateField('soilMoisture', val)}
                  placeholder="0.00"
                />
              </FormField>
              <FormField label="土壤EC(mS/cm)">
                <NumberInput
                  value={newRecord.soilEc}
                  onChange={(val) => updateField('soilEc', val)}
                  placeholder="0.00"
                />
              </FormField>
              <FormField label="土壤pH">
                <NumberInput
                  value={newRecord.soilPh}
                  onChange={(val) => updateField('soilPh', val)}
                  placeholder="0.00"
                />
              </FormField>
            </div>
          </div>
        )}

        {/* 巡查结果 - 勾选框选择 */}
        <div className="border-t border-gray-200 pt-4">
          <FormField label="巡查结果" required>
            <div className="flex gap-6">
              <Label className="flex items-center gap-2 cursor-pointer group">
                <Input
                  type="checkbox"
                  checked={newRecord.inspectionResult === 'normal'}
                  onChange={() => {
                    const newValue = 'normal';
                    onNewRecordChange({ ...newRecord, inspectionResult: newValue, feedbackRequired: false });
                  }}
                  className="w-5 h-5 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className={`text-sm font-medium group-hover:text-emerald-600 transition-colors ${newRecord.inspectionResult === 'normal' ? 'text-emerald-600' : 'text-gray-700'}`}>
                  正常
                </span>
              </Label>
              <Label className="flex items-center gap-2 cursor-pointer group">
                <Input
                  type="checkbox"
                  checked={newRecord.inspectionResult === 'abnormal'}
                  onChange={() => {
                    const newValue = 'abnormal';
                    onNewRecordChange({ ...newRecord, inspectionResult: newValue, feedbackRequired: true });
                  }}
                  className="w-5 h-5 rounded border-gray-400 text-red-600 focus:ring-red-500 cursor-pointer"
                />
                <span className={`text-sm font-medium group-hover:text-red-600 transition-colors ${newRecord.inspectionResult === 'abnormal' ? 'text-red-600' : 'text-gray-700'}`}>
                  异常
                </span>
              </Label>
            </div>
          </FormField>
        </div>

        {/* 异常详情 - 仅当异常时显示 */}
        {newRecord.inspectionResult === 'abnormal' && (
          <div className="border-t border-gray-200 pt-4 space-y-4">
            {/* 问题分类 - 多选复选框 */}
            <FormField label="问题分类" required>
              <div className="flex flex-wrap gap-3">
                {issueCategories.map(cat => {
                  const isSelected = newRecord.issueCategories?.includes(cat.value);
                  return (
                    <Label
                      key={cat.value}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-red-400 bg-red-50 text-red-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-red-300'
                      }`}
                    >
                      <Input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          const current = newRecord.issueCategories || [];
                          let newCategories;
                          if (isSelected) {
                            // 取消选中
                            newCategories = current.filter(c => c !== cat.value);
                          } else {
                            // 追加选中
                            newCategories = [...current, cat.value];
                          }
                          // 直接调用 onNewRecordChange
                          onNewRecordChange({ ...newRecord, issueCategories: newCategories, issuePresets: [] });
                        }}
                        className="w-4 h-4 rounded border-gray-400 text-red-600 focus:ring-red-500 cursor-pointer"
                      />
                      <span className="text-sm font-medium">{cat.label}</span>
                    </Label>
                  );
                })}
              </div>
            </FormField>

            {/* 单个分类时显示快速勾选问题 */}
            {newRecord.issueCategories?.length === 1 && currentPresets.length > 0 && (
              <FormField label="快速勾选问题">
                <div className="flex flex-wrap gap-2">
                  {currentPresets.map(preset => (
                    <Button
                      key={preset}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePreset(preset)}
                      className={`rounded-full ${
                        newRecord.issuePresets?.includes(preset)
                          ? 'bg-red-100 border-red-300 text-red-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-red-300'
                      }`}
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
              </FormField>
            )}

            {/* 多个分类时提示在问题描述输入 */}
            {newRecord.issueCategories?.length >= 2 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-700">
                  已选择多个问题分类，请在下方"问题描述"中详细输入各种问题现象
                </p>
              </div>
            )}

            {/* 问题描述 */}
            <FormField label="问题描述">
              <TextArea
                value={newRecord.issueText}
                onChange={(e) => updateField('issueText', e.target.value)}
                placeholder={newRecord.issueCategories?.length === 1 ? "请详细描述发现的问题" : "请详细描述各种问题现象"}
                rows={3}
                className={deepInputClass + " resize-none"}
              />
            </FormField>

            {/* 严重程度 */}
            <FormField label="严重程度">
              <div className="flex gap-4">
                {(['轻微', '中等', '严重'] as const).map((level) => (
                  <Label
                    key={level}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                      newRecord.issueSeverity === level
                        ? level === '严重'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : level === '中等'
                          ? 'border-amber-500 bg-amber-50 text-amber-700'
                          : 'border-gray-500 bg-gray-100 text-gray-700'
                        : 'border-gray-400 hover:border-gray-400'
                    }`}
                  >
                    <Input
                      type="radio"
                      name="issueSeverity"
                      value={level}
                      checked={newRecord.issueSeverity === level}
                      onChange={() => updateField('issueSeverity', level)}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">{level}</span>
                  </Label>
                ))}
              </div>
            </FormField>

            {/* 问题照片 */}
            <div>
              <Label className="text-gray-700 mb-2">问题照片 (最多6张)</Label>
              <div className="space-y-3">
                <div className="flex gap-3 flex-wrap">
                  {(newRecord.issuePhotos || []).map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-400">
                      <img src={img} alt={`问题照片${idx + 1}`} className="w-full h-full object-cover" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newPhotos = [...(newRecord.issuePhotos || [])];
                          newPhotos.splice(idx, 1);
                          updateField('issuePhotos', newPhotos);
                        }}
                        className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white rounded-bl-lg"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  {(newRecord.issuePhotos || []).length < 6 && (
                    <Label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-400 flex flex-col items-center justify-center cursor-pointer hover:border-red-500 hover:bg-red-50 transition-colors">
                      <Camera className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-gray-400 mt-1">添加</span>
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = e.target.files;
                          if (!files) return;
                          const currentCount = (newRecord.issuePhotos || []).length;
                          const remaining = 6 - currentCount;
                          Array.from(files).slice(0, remaining).forEach(file => {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const result = event.target?.result as string;
                              updateField('issuePhotos', [...(newRecord.issuePhotos || []), result]);
                            };
                            reader.readAsDataURL(file);
                          });
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </Label>
                  )}
                </div>
                <p className="text-xs text-gray-500">已添加 {(newRecord.issuePhotos || []).length}/6 张照片</p>
              </div>
            </div>

            {/* 反馈人员多选 */}
            <FormField label="反馈人员" required>
              <div className="flex flex-wrap gap-2 mb-2">
                {(newRecord.feedbackUsers || []).map(userId => {
                  const user = users.find(u => u.id === userId);
                  return (
                    <span
                      key={userId}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded-full"
                    >
                      {user?.name || userId}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFeedbackUser(userId)}
                        className="ml-1 hover:text-red-900"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </span>
                  );
                })}
              </div>
              <Select
                value=""
                onValueChange={(val) => {
                  if (val) {
                    toggleFeedbackUser(val);
                  }
                }}
              >
                <SelectTrigger className={deepInputClass}>
                  <SelectValue placeholder="+ 选择反馈人员" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__add__">+ 选择反馈人员</SelectItem>
                  {users.filter(u => !(newRecord.feedbackUsers || []).includes(u.id)).map(user => (
                    <SelectItem key={user.id} value={user.id}>{user.name} - {user.role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
        )}

        {/* 备注 */}
        <FormField label="备注">
          <TextArea
            value={newRecord.remarks}
            onChange={(e) => updateField('remarks', e.target.value)}
            placeholder="请输入巡查备注"
            rows={3}
            className={deepInputClass + " resize-none"}
          />
        </FormField>
      </div>
    </Modal>
  );
}

export default CreateInspectionModal;
