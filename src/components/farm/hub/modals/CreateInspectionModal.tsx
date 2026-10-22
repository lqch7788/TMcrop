import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, FormField } from '@/components/ui';
import { NumberInput } from '@/components/ui';
import { Button, Label, DatePicker, TabsList, TabsTrigger } from '@/components/ui';
import { Input } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Camera, ChevronDown, ChevronUp, Scan, Search, Wand2, X } from 'lucide-react';
import { WEATHER_OPTIONS, CROP_STATUS_OPTIONS, ISSUE_CATEGORIES, ISSUE_PRESETS, COMPLETION_TIME_OPTIONS, INSPECTION_TYPES, type InspectionType } from '../../../../types/farm/common';
import { todayLocal } from '@/lib/dateUtils';
// 2026-10-22：巡查对象改为「种植/育苗记录」可搜索选择（与农事任务新建弹窗同一数据源），
//   选中后自动带出区域与作物，减少手工逐个下拉挑选。
import { usePlantingStore, useSeedlingStore } from '../../../../stores';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

// 天气选项常量（组件外部计算一次）
const WEATHER_OPTION_LABELS = WEATHER_OPTIONS.map(w => w.label);
// 作物状态选项常量（组件外部计算一次）
const CROP_STATUS_LABELS = CROP_STATUS_OPTIONS.map(s => s.label);

// 巡查记录类型（用于表单）
interface InspectionRecordFormData {
  recordCode: string;
  inspectionType: InspectionType;
  /** 2026-10-21：安全检查的检查区域/场所 */
  area: string;
  greenhouseId: string;
  /**
   * 2026-10-22：区域名称。
   *   选种植/育苗记录时区域名可能不在温室档案里（如「2号大棚」「育苗温室A区」），
   *   仅靠 greenhouseId 反查会得到空名称；后端 inspections 表本来就只存 name，
   *   所以这里显式带一份名称，提交时优先使用。
   */
  greenhouseName: string;
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
  // 调用方（InspectionTab）传入的是 useState 派发函数，需支持函数式更新（prev => ...）
  onNewRecordChange: React.Dispatch<React.SetStateAction<InspectionRecordFormData>>;
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

  // ===== 2026-10-22：巡查对象（种植/育苗）可搜索选择 =====
  //   数据源与「农事任务 → 新建任务」的关联区域选择完全一致；
  //   选中一条记录后自动填充区域与作物，避免再手工挑两个下拉。
  const plantingItems = usePlantingStore((s) => s.items);
  const seedlingItems = useSeedlingStore((s) => s.items);
  const loadPlantings = usePlantingStore((s) => s.loadItems);
  const loadSeedlings = useSeedlingStore((s) => s.loadItems);

  useEffect(() => {
    if (!isOpen) return;
    if (plantingItems.length === 0) void loadPlantings();
    if (seedlingItems.length === 0) void loadSeedlings();
  }, [isOpen, plantingItems.length, seedlingItems.length, loadPlantings, loadSeedlings]);

  const [areaTab, setAreaTab] = useState<'planting' | 'seedling'>('planting');
  const [areaSearch, setAreaSearch] = useState('');
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);

  // 点击选择器外部关闭下拉（只读 ref，空依赖安全）
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (areaRef.current && !areaRef.current.contains(e.target as Node)) setShowAreaDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 弹窗每次打开时清空选择器的本地状态（表单字段由父组件重置，这里只管 tab/搜索词）
  useEffect(() => {
    if (!isOpen) return;
    setAreaTab('planting');
    setAreaSearch('');
    setShowAreaDropdown(false);
  }, [isOpen]);

  /** 作物显示名：与农事任务新建弹窗同口径（子品种 > 品种 > 作物） */
  const formatCropDisplay = (item: any) =>
    item.subVariety1Name || item.cropVariety || item.cropName || '';

  /** 区域显示名：种植取大棚/根区，育苗取场地 */
  const formatAreaDisplay = (item: any) => areaTab === 'planting'
    ? (item.rootName || item.areaName || item.greenhouseName || '未指定区域')
    : (item.siteName || item.areaName || item.greenhouseName || '育苗区');

  const areaOptions = useMemo(() => {
    const kw = areaSearch.trim().toLowerCase();
    if (areaTab === 'planting') {
      return plantingItems.filter((p) => !p.isHarvest).filter((p) =>
        !kw
        || (p.plantCode || '').toLowerCase().includes(kw)
        || (p.cropName || '').toLowerCase().includes(kw)
        || (p.cropVariety || '').toLowerCase().includes(kw)
        || (p.subVariety1Name || '').toLowerCase().includes(kw)
        || (p.rootName || '').toLowerCase().includes(kw)
        || (p.areaName || '').toLowerCase().includes(kw));
    }
    return seedlingItems.filter((s) =>
      !kw
      || (s.seedlingCode || '').toLowerCase().includes(kw)
      || (s.cropName || '').toLowerCase().includes(kw)
      || (s.cropVariety || '').toLowerCase().includes(kw)
      || (s.siteName || '').toLowerCase().includes(kw));
  }, [areaTab, areaSearch, plantingItems, seedlingItems]);

  /**
   * 选中种植/育苗记录 → 自动填充「巡查区域 + 作物名称」。
   *
   * 区域 id：能在温室档案里按名称匹配到就用真实 id；否则用占位 id。
   *   inspections 接口只落 greenhouse_name（不写 greenhouse_id），
   *   占位 id 仅用于表单内下拉回显，提交时由 InspectionTab 归一化。
   */
  const applyArea = (item: any) => {
    const crop = formatCropDisplay(item);
    const areaName = formatAreaDisplay(item);
    const matched = greenhouses.find((g) => g.name === areaName);
    onNewRecordChange((prev) => ({
      ...prev,
      greenhouseId: matched?.id || '__picked_area__',
      greenhouseName: areaName,
      cropName: crop,
    }));
    setAreaSearch('');
    setShowAreaDropdown(false);
  };

  // 作物下拉：作物字典 + 当前自动填充值（品种名可能不在字典里，补一项才能正常显示）
  const cropOptions = useMemo(() => {
    const names = cropTypes.map((c) => c.name);
    if (newRecord.cropName && !names.includes(newRecord.cropName)) names.push(newRecord.cropName);
    return names;
  }, [cropTypes, newRecord.cropName]);

  // 区域下拉：温室档案 + 当前自动填充区域（档案里没有时补一项，避免下拉空白）
  const greenhouseOptions = useMemo(() => {
    const list = greenhouses.map((g) => ({ id: g.id, name: g.name }));
    if (newRecord.greenhouseId && !list.some((g) => g.id === newRecord.greenhouseId)) {
      list.push({ id: newRecord.greenhouseId, name: newRecord.greenhouseName || '已选区域' });
    }
    return list;
  }, [greenhouses, newRecord.greenhouseId, newRecord.greenhouseName]);

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
              {INSPECTION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        {/* 动态表单区域 - 根据巡查类型显示不同字段 */}
        {newRecord.inspectionType === 'farm' && (
          <div className="grid grid-cols-2 gap-4">
            {/* 2026-10-22：巡查对象改为可搜索选择（种植/育苗记录），选中后自动填充下方两项。
                交互与「农事任务 → 新建任务」的关联区域选择一致。 */}
            <div className="col-span-2">
              <FormField label="快速选择巡查对象（种植/育苗，选中后自动填充区域和作物）">
                <div className="relative" ref={areaRef}>
                  <div className="flex items-center gap-2 mb-2">
                    <TabsList
                      selectedValue={areaTab}
                      onValueChange={(v) => {
                        setAreaTab(v as 'planting' | 'seedling');
                        setAreaSearch('');
                        setShowAreaDropdown(true);
                      }}
                    >
                      <TabsTrigger value="planting" className="text-xs">🌱 种植区域</TabsTrigger>
                      <TabsTrigger value="seedling" className="text-xs">🌿 育苗区域</TabsTrigger>
                    </TabsList>
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="text"
                        value={areaSearch}
                        onChange={(e) => { setAreaSearch(e.target.value); setShowAreaDropdown(true); }}
                        onFocus={() => setShowAreaDropdown(true)}
                        placeholder={`搜索${areaTab === 'planting' ? '种植' : '育苗'}批号/作物/区域`}
                        className="w-full h-10 pl-10 pr-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  {showAreaDropdown && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                      {areaOptions.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-gray-400">
                          没有匹配的{areaTab === 'planting' ? '种植' : '育苗'}记录
                        </p>
                      ) : (
                        areaOptions.slice(0, 50).map((item: any) => {
                          const crop = formatCropDisplay(item);
                          const areaName = formatAreaDisplay(item);
                          const code = areaTab === 'planting' ? item.plantCode : item.seedlingCode;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => applyArea(item)}
                              className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 border-b border-gray-50 last:border-b-0 text-sm"
                            >
                              <span className="font-medium">{crop || '未命名作物'}</span>
                              {item.cropName && crop !== item.cropName && (
                                <span className="text-gray-400 text-xs ml-1">（{item.cropName}）</span>
                              )}
                              <span className="text-gray-400 mx-1">·</span>
                              <span className="text-gray-600">{areaName}</span>
                              <span className="text-gray-400 mx-1">·</span>
                              <span className="text-xs text-gray-500 font-mono">{code || '-'}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
                {newRecord.greenhouseName && newRecord.cropName && (
                  <p className="text-xs text-emerald-600 mt-1">
                    已填充：{newRecord.greenhouseName} · {newRecord.cropName}
                  </p>
                )}
              </FormField>
            </div>
            <FormField label="巡查区域" required error={errors.greenhouseId}>
              <Select
                value={newRecord.greenhouseId}
                onValueChange={(val) => {
                  const gh = greenhouses.find((g) => g.id === val);
                  // 手工改区域时同步名称，避免残留上一次自动填充的名称
                  onNewRecordChange((prev) => ({
                    ...prev,
                    greenhouseId: val,
                    greenhouseName: gh?.name || prev.greenhouseName || '',
                  }));
                }}
              >
                <SelectTrigger className={deepInputClass}>
                  <SelectValue placeholder="请选择区域" />
                </SelectTrigger>
                <SelectContent>                  {greenhouseOptions.map(gh => (
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
                <SelectContent>                  {cropOptions.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
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

        {/* 2026-10-21：安全检查并入巡查 —— 填写检查区域/场所（后端 area 列） */}
        {newRecord.inspectionType === 'safety' && (
          <div className="grid grid-cols-2 gap-4">
            <FormField label="检查区域 / 场所" required error={errors.area}>
              <Input
                type="text"
                value={newRecord.area || ''}
                onChange={(e) => updateField('area', e.target.value)}
                placeholder="如：全园区 / A 区配电房 / 农药仓库"
                className={deepInputClass}
              />
            </FormField>
            <FormField label="安全检查说明">
              <Input
                type="text"
                value={newRecord.remarks}
                onChange={(e) => updateField('remarks', e.target.value)}
                placeholder="可补充检查范围或依据"
                className={deepInputClass}
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
              onChange={(date) => updateField('checkDate', todayLocal(date))}
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
                        className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white rounded-bl-lg p-0"
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
                        className="ml-1 hover:text-red-900 w-6 h-6"
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
