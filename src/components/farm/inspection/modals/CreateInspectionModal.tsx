import { useState } from 'react';
import { Modal, FormField } from '../../../ui/Modal';
import { NumberInput } from '../../../ui/NumberInput';
import { Scan, Camera, X, ChevronDown, ChevronUp } from 'lucide-react';
import { WEATHER_OPTIONS, CROP_STATUS_OPTIONS, ISSUE_CATEGORIES, ISSUE_PRESETS, COMPLETION_TIME_OPTIONS } from '../../../../types/farm/common';

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
  issuePhotos: string[]; // 问题照片（改名避免混淆）
  feedbackUsers: string[]; // 反馈人员（多选）
  expectedCompletion: string; // 期望完成时间
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
  const weatherOptions = WEATHER_OPTIONS.map(w => w.label);
  const cropStatusOptions = CROP_STATUS_OPTIONS.map(s => s.label);
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
                <input
                  type="text"
                  value={newRecord.recordCode}
                  onChange={(e) => updateField('recordCode', e.target.value)}
                  placeholder="点击生成或手动输入"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => updateField('recordCode', generateRecordCode())}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 whitespace-nowrap"
                >
                  生成
                </button>
              </div>
            </FormField>
          </div>
          <div className="pt-6">
            <button
              type="button"
              onClick={onOpenQRScanner}
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              <Scan className="w-4 h-4" />
              扫码定位
            </button>
          </div>
        </div>

        {/* 巡查类型选择 */}
        <FormField label="巡查类型" required>
          <select
            value={newRecord.inspectionType}
            onChange={(e) => updateField('inspectionType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="farm">种植区域巡查</option>
            <option value="equipment">设备保养巡查</option>
            <option value="infrastructure">基础设施巡检</option>
            <option value="other">其他</option>
          </select>
        </FormField>

        {/* 动态表单区域 - 根据巡查类型显示不同字段 */}
        {newRecord.inspectionType === 'farm' && (
          <div className="grid grid-cols-2 gap-4">
            <FormField label="巡查区域" required error={errors.greenhouseId}>
              <select
                value={newRecord.greenhouseId}
                onChange={(e) => updateField('greenhouseId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">请选择区域</option>
                {greenhouses.map(gh => (
                  <option key={gh.id} value={gh.id}>{gh.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="作物名称" required error={errors.cropName}>
              <select
                value={newRecord.cropName}
                onChange={(e) => updateField('cropName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">请选择作物</option>
                {cropTypes.map(crop => (
                  <option key={crop.id} value={crop.name}>{crop.name}</option>
                ))}
              </select>
            </FormField>
          </div>
        )}

        {newRecord.inspectionType === 'equipment' && (
          <div className="grid grid-cols-2 gap-4">
            <FormField label="选择设备" required error={errors.equipmentId}>
              <select
                value={newRecord.equipmentId}
                onChange={(e) => {
                  const eq = equipmentRecords.find(x => x.id === e.target.value);
                  updateField('equipmentId', e.target.value);
                  updateField('equipmentName', eq?.name || '');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择设备</option>
                {equipmentRecords.map(eq => (
                  <option key={eq.id} value={eq.id}>{eq.name} - {eq.location}</option>
                ))}
              </select>
            </FormField>
            <FormField label="设备名称">
              <input
                type="text"
                value={newRecord.equipmentName}
                readOnly
                placeholder="自动填充"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </FormField>
          </div>
        )}

        {newRecord.inspectionType === 'infrastructure' && (
          <div className="grid grid-cols-2 gap-4">
            <FormField label="选择基础设施" required error={errors.infrastructureId}>
              <select
                value={newRecord.infrastructureId}
                onChange={(e) => {
                  const inf = infrastructureRecords.find(x => x.id === e.target.value);
                  updateField('infrastructureId', e.target.value);
                  updateField('infrastructureName', inf?.name || '');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">请选择基础设施</option>
                {infrastructureRecords.map(inf => (
                  <option key={inf.id} value={inf.id}>{inf.name} - {inf.type}</option>
                ))}
              </select>
            </FormField>
            <FormField label="设施名称">
              <input
                type="text"
                value={newRecord.infrastructureName}
                readOnly
                placeholder="自动填充"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </FormField>
          </div>
        )}

        {newRecord.inspectionType === 'other' && (
          <FormField label="其他说明" required error={errors.remarks}>
            <textarea
              value={newRecord.remarks}
              onChange={(e) => updateField('remarks', e.target.value)}
              placeholder="请输入其他巡查类型的具体说明"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </FormField>
        )}

        {/* 巡查人员和关联批次 */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="巡查人员">
            <input
              type="text"
              value={users.find(u => u.id === newRecord.inspectorId)?.name || ''}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
            />
          </FormField>
          <FormField label="关联批次">
            <select
              value={newRecord.batchId}
              onChange={(e) => updateField('batchId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">不关联批次</option>
              {cropBatches.filter(b => b.status === 'active' || b.status === 'planning').map(batch => (
                <option key={batch.id} value={batch.id}>{batch.batchCode} - {batch.cropName}</option>
              ))}
            </select>
          </FormField>
        </div>

        {/* 日期、时间、时长 */}
        <div className="grid grid-cols-3 gap-4">
          <FormField label="巡查日期" required error={errors.checkDate}>
            <input
              type="date"
              value={newRecord.checkDate}
              onChange={(e) => updateField('checkDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </FormField>
          <FormField label="巡查时间">
            <input
              type="time"
              value={newRecord.checkTime}
              onChange={(e) => updateField('checkTime', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

        {/* 天气、温度、湿度 */}
        <div className="grid grid-cols-3 gap-4">
          <FormField label="天气">
            <select
              value={newRecord.weather}
              onChange={(e) => updateField('weather', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {weatherOptions.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </FormField>
          <FormField label="温度(°C)" required error={errors.temperature}>
            <NumberInput
              value={newRecord.temperature}
              onChange={(val) => updateField('temperature', val)}
              placeholder="0.00"
            />
          </FormField>
          <FormField label="湿度(%)" required error={errors.humidity}>
            <NumberInput
              value={newRecord.humidity}
              onChange={(val) => updateField('humidity', val)}
              placeholder="0.00"
            />
          </FormField>
        </div>

        {/* 种植区域特有字段 */}
        {newRecord.inspectionType === 'farm' && (
          <div className="grid grid-cols-3 gap-4">
            <FormField label="作物状态">
              <select
                value={newRecord.cropStatus}
                onChange={(e) => updateField('cropStatus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {cropStatusOptions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
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
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={newRecord.inspectionResult === 'normal'}
                  onChange={() => {
                    const newValue = 'normal';
                    onNewRecordChange({ ...newRecord, inspectionResult: newValue, feedbackRequired: false });
                  }}
                  className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className={`text-sm font-medium group-hover:text-emerald-600 transition-colors ${newRecord.inspectionResult === 'normal' ? 'text-emerald-600' : 'text-gray-700'}`}>
                  正常
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={newRecord.inspectionResult === 'abnormal'}
                  onChange={() => {
                    const newValue = 'abnormal';
                    onNewRecordChange({ ...newRecord, inspectionResult: newValue, feedbackRequired: true });
                  }}
                  className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                />
                <span className={`text-sm font-medium group-hover:text-red-600 transition-colors ${newRecord.inspectionResult === 'abnormal' ? 'text-red-600' : 'text-gray-700'}`}>
                  异常
                </span>
              </label>
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
                    <label
                      key={cat.value}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-red-400 bg-red-50 text-red-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-red-300'
                      }`}
                    >
                      <input
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
                        className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                      />
                      <span className="text-sm font-medium">{cat.label}</span>
                    </label>
                  );
                })}
              </div>
            </FormField>

            {/* 单个分类时显示快速勾选问题 */}
            {newRecord.issueCategories?.length === 1 && currentPresets.length > 0 && (
              <FormField label="快速勾选问题">
                <div className="flex flex-wrap gap-2">
                  {currentPresets.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => togglePreset(preset)}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                        newRecord.issuePresets?.includes(preset)
                          ? 'bg-red-100 border-red-300 text-red-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-red-300'
                      }`}
                    >
                      {preset}
                    </button>
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
              <textarea
                value={newRecord.issueText}
                onChange={(e) => updateField('issueText', e.target.value)}
                placeholder={newRecord.issueCategories?.length === 1 ? "请详细描述发现的问题" : "请详细描述各种问题现象"}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </FormField>

            {/* 问题照片 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">问题照片 (最多6张)</label>
              <div className="space-y-3">
                <div className="flex gap-3 flex-wrap">
                  {(newRecord.issuePhotos || []).map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-300">
                      <img src={img} alt={`问题照片${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          const newPhotos = [...(newRecord.issuePhotos || [])];
                          newPhotos.splice(idx, 1);
                          updateField('issuePhotos', newPhotos);
                        }}
                        className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white rounded-bl-lg flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {(newRecord.issuePhotos || []).length < 6 && (
                    <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-red-500 hover:bg-red-50 transition-colors">
                      <Camera className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-gray-400 mt-1">添加</span>
                      <input
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
                    </label>
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
                      <button
                        type="button"
                        onClick={() => toggleFeedbackUser(userId)}
                        className="ml-1 hover:text-red-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    toggleFeedbackUser(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">+ 选择反馈人员</option>
                {users.filter(u => !(newRecord.feedbackUsers || []).includes(u.id)).map(user => (
                  <option key={user.id} value={user.id}>{user.name} - {user.role}</option>
                ))}
              </select>
            </FormField>

            {/* 期望完成时间 */}
            <FormField label="期望完成">
              <select
                value={newRecord.expectedCompletion}
                onChange={(e) => updateField('expectedCompletion', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">请选择</option>
                {completionTimeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </FormField>
          </div>
        )}

        {/* 备注 */}
        <FormField label="备注">
          <textarea
            value={newRecord.remarks}
            onChange={(e) => updateField('remarks', e.target.value)}
            placeholder="请输入巡查备注"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </FormField>
      </div>
    </Modal>
  );
}

export default CreateInspectionModal;
