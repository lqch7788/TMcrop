/**
 * 批量编辑生产计划弹窗
 * 字段来源与新建弹窗保持一致
 */

import { AlertTriangle, Check, Upload } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Modal } from '@/components/ui';
import { CropBatch, Greenhouse, PlanType } from '../../../types';
import { batchStatusColors, batchStatusLabels, RESPONSIBLE_PERSONS, getModesByPlanType } from '../constants';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import CropCodeSelector from '../../farm/common/CropCodeSelector';
import { CropVariety } from '../../../types/cropVariety';
import { getVarietyByCode, searchVarieties } from '../../../services/cropVarietyService';
import { DictSelect } from '../../common/settings/DictSelect';

const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface BatchEditModalProps {
  isOpen: boolean;
  selectedRows: string[];  // 改为 string[] (id)
  batches: CropBatch[];
  greenhouses: Greenhouse[];
  editedBatchCodes: string[];
  // L-07: 用 Omit 明确排除 id / 父表关联字段，避免误改 PK
  editedBatches: Record<string, Omit<Partial<CropBatch>, 'id' | 'createTime' | 'updateTime'>>;
  selectedBatchCode: string;
  onSelectedBatchCodeChange: (code: string) => void;
  onEditedBatchesChange: (batches: Record<string, Omit<Partial<CropBatch>, 'id' | 'createTime' | 'updateTime'>>) => void;
  onEditedBatchCodesChange: (codes: string[]) => void;
  onClose: () => void;
  onVoidWarning: () => void;
  onPublish: () => void;
  onSave: () => void;
  onConfirmNext: () => void;
}

export function BatchEditModal({
  isOpen,
  selectedRows,
  batches,
  greenhouses,
  editedBatchCodes,
  editedBatches,
  selectedBatchCode,
  onSelectedBatchCodeChange,
  onEditedBatchesChange,
  onEditedBatchCodesChange,
  onClose,
  onVoidWarning,
  onPublish,
  onSave,
  onConfirmNext,
}: BatchEditModalProps) {
  // 作物变更状态（必须在条件返回之前）
  const [selectedCrop, setSelectedCrop] = useState<CropVariety | null>(null);
  // 种植区域展开状态
  const [greenhouseExpanded, setGreenhouseExpanded] = useState(false);
  // 种植模式展开状态
  const [plantingModeExpanded, setPlantingModeExpanded] = useState(false);

  // 获取当前编辑的批次（在条件返回之前获取）
  // H-08: useMemo 缓存 selectedBatches（O(N×M) → O(N+M)）
  const selectedBatches = useMemo(
    () => selectedRows
      .map(id => batches.find(b => b.id === id))
      .filter((b): b is CropBatch => b !== undefined),
    [selectedRows, batches]
  );
  const currentBatch = useMemo(
    () => selectedBatchCode ? batches.find(b => b.batchCode === selectedBatchCode) || null : null,
    [selectedBatchCode, batches]
  );
  const editedData = selectedBatchCode ? editedBatches[selectedBatchCode] || {} : {};

  // 2026-06-05: 切换行 / 重新打开弹窗时反向查表初始化 selectedCrop
  // 3 重兜底，保证**所有行**都能显示（不挑名字、不依赖 crop_varieties 表是否完整）
  // 注意：必须在 `if (!isOpen) return null` 之前调用，遵守 Hooks 顺序规则
  useEffect(() => {
    if (!isOpen || !currentBatch) {
      setSelectedCrop(null);
      return;
    }

    const cropName = currentBatch.cropName || '';
    const variety = currentBatch.variety || '';

    // 兜底 1：按 cropCode 精准匹配（修复后新数据/灌上 crop_code 的存量会走这条）
    if (currentBatch.cropCode) {
      const byCode = getVarietyByCode(currentBatch.cropCode);
      if (byCode) { setSelectedCrop(byCode); return; }
    }

    // 兜底 2：用 cropName + variety 联合模糊搜索 crop_varieties 表
    const keyword = `${cropName} ${variety}`.trim();
    if (keyword) {
      const results = searchVarieties(keyword);
      if (results.length > 0) {
        const hit = results[0];
        setSelectedCrop({
          id: '',
          cropCode: hit.value,
          categoryName: '',
          typeName: '',
          varietyName: hit.label,
          subVariety1Name: '',
          fullPath: hit.fullPath,
        });
        return;
      }
    }

    // 兜底 3：**完全脱离 crop_varieties 表**直接用 currentBatch 自身字段拼路径
    // 确保即使 crop_varieties 表里没数据，老数据也没灌上 cropCode，也能显示
    if (cropName || variety) {
      const fallbackPath = [cropName, variety].filter(Boolean).join(' > ');
      setSelectedCrop({
        id: '',
        cropCode: currentBatch.cropCode || '',
        categoryName: '',
        typeName: '',
        varietyName: variety || cropName,
        subVariety1Name: '',
        fullPath: fallbackPath,
      });
      return;
    }

    setSelectedCrop(null);
    // 依赖故意拆字段而非 currentBatch 整体（更精准触发）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBatch?.batchCode, currentBatch?.variety, currentBatch?.cropCode, currentBatch?.cropName, isOpen]);

  // L-06: file input ref + cleanup（之前每次点击都 new 一个 input，未清理）
  // 必须在 early return 之前声明（React Hooks 规则：hooks 调用顺序必须稳定）
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    return () => {
      // 卸载时清理 ref
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  const triggerFilePicker = () => {
    // 受控 input（ref 复用），而不是动态 createElement 每次都 new
    if (fileInputRef.current) {
      fileInputRef.current.click();
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.docx,.txt';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFieldChange('planDetailFileName', file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
          handleFieldChange('planDetail', event.target?.result as string);
        };
        reader.readAsText(file);
      }
    };
    fileInputRef.current = input;
    input.click();
  };

  // M-10: 修正误导注释 — 这里**没有**用 useMemo（每次渲染都重算）；
  // 由于依赖只 greenhouseName 字符串，单步 split 代价极小，无需 memo
  const currentGreenhouseNames = editedData.greenhouseName
    ? editedData.greenhouseName.split(',').map(n => n.trim()).filter(Boolean)
    : currentBatch?.greenhouseName
      ? currentBatch.greenhouseName.split(',').map(n => n.trim()).filter(Boolean)
      : [];

  // 获取当前批次的计划类型，用于种植模式选项
  const currentPlanType = editedData.planType || currentBatch?.planType || PlanType.PLANTING;
  const plantingModeOptions = getModesByPlanType(currentPlanType);

  // 处理字段变更
  const handleFieldChange = (field: keyof CropBatch, value: unknown) => {
    const updated = {
      ...editedBatches,
      [selectedBatchCode]: { ...editedBatches[selectedBatchCode], [field]: value },
    };
    onEditedBatchesChange(updated);
    if (!editedBatchCodes.includes(selectedBatchCode)) {
      onEditedBatchCodesChange([...editedBatchCodes, selectedBatchCode]);
    }
  };

  // 作物变更（使用 CropCodeSelector 一致的方式）
  const handleCropChange = (code: string, varietyInfo: CropVariety | null) => {
    if (varietyInfo) {
      setSelectedCrop(varietyInfo);
      handleFieldChange('cropCode', varietyInfo.cropCode);
      handleFieldChange('cropName', varietyInfo.varietyName);
      handleFieldChange('variety', varietyInfo.subVariety1Name || varietyInfo.varietyName);
    } else {
      setSelectedCrop(null);
      handleFieldChange('cropCode', '');
      handleFieldChange('cropName', '');
      handleFieldChange('variety', '');
    }
  };

  // 种植模式列表
  const currentPlantingModes = editedData.plantingMode
    ? editedData.plantingMode.split(',')
    : currentBatch?.plantingMode
      ? currentBatch.plantingMode.split(',')
      : [];


  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="批量编辑生产计划"
      // 2026-06-10: 统一 4 页面 × 新增/编辑弹窗尺寸 = 900×650
      size="xl"
      width={900}
      height={650}
      showFooter={true}
      footer={
        <div className="flex gap-3">
          <Button size="sm" onClick={onConfirmNext}>
            <Check className="w-4 h-4" /> 确认（下一个）
          </Button>
          <Button size="sm" variant="warning" onClick={onVoidWarning}>
            <AlertTriangle className="w-4 h-4" />
            申请作废
          </Button>
          <Button size="sm" variant="blue" onClick={currentBatch?.batchStatus === 'pending' || currentBatch?.batchStatus === 'rejected' ? onPublish : onSave}>
            {currentBatch?.batchStatus === 'pending' || currentBatch?.batchStatus === 'rejected' ? '提交' : '保存'}
          </Button>
        </div>
      }
    >

        {/* Info Banner */}
        <div className="p-4 bg-gray-50 border-b border-gray-300 flex-shrink-0">
          <div className="bg-blue-50 rounded-lg p-3 mb-3">
            <p className="text-sm text-blue-800">
              已选择 <strong>{selectedRows.length}</strong> 个生产计划进行批量编辑，
              已编辑 <strong>{editedBatchCodes.length}</strong> 个
            </p>
          </div>

          {/* Batch Selector */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1">
              <Label className="text-xs text-gray-600">选择生产计划批次号</Label>
              <Select value={selectedBatchCode} onValueChange={(v) => onSelectedBatchCodeChange(v)}>
                <SelectTrigger className={deepInputClass}>
                  <SelectValue placeholder="请选择批次号" />
                </SelectTrigger>
                <SelectContent>
                  {selectedBatches.map(batch => (
                    <SelectItem key={batch.id} value={batch.batchCode}>
                      {batch.batchCode} - {batch.cropName}
                      {editedBatchCodes.includes(batch.batchCode) ? ' [已编辑]' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedBatchCode && currentBatch && (
            <div className="space-y-4">
              {/* 第一行：批次号 + 作物品种 */}
              <div className="grid grid-cols-2 gap-4">
                {/* 批次号 - 不可编辑 */}
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">生产计划批次号</div>
                  <div className="text-sm font-medium text-gray-900">{currentBatch.batchCode}</div>
                </div>

                {/* 作物品种 - 可编辑（与新建一致） */}
                <div>
                  <div className="text-xs text-gray-500 mb-1">作物品种</div>
                  <CropCodeSelector
                    value={(editedData.cropCode || currentBatch.cropCode || selectedCrop?.cropCode || '')}
                    onChange={handleCropChange}
                    placeholder="搜索或选择作物品种..."
                    size="sm"
                    showFullPath={true}
                  />
                  {selectedCrop && (
                    <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs">
                      <span className="text-emerald-700">
                        {selectedCrop.categoryName} &gt; {selectedCrop.typeName} &gt; {selectedCrop.varietyName}
                        {selectedCrop.subVariety1Name && ` > ${selectedCrop.subVariety1Name}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 第二行：种植区域 + 生产模式（多选） */}
              <div className="grid grid-cols-2 gap-4">
                {/* 种植区域 - 多选 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-500">种植区域</span>
                    <button
                      type="button"
                      onClick={() => setGreenhouseExpanded(!greenhouseExpanded)}
                      className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
                    >
                      {greenhouseExpanded ? '收起' : '展开'}
                    </button>
                  </div>
                  {greenhouseExpanded ? (
                    <div className="flex flex-col gap-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                      {greenhouses.filter(g => g.status === 'active').map(g => (
                        <div key={g.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`edit-gh-${g.id}`}
                            checked={currentGreenhouseNames.includes(g.name)}
                            onCheckedChange={(checked) => {
                              // 使用局部变量保存当前值，避免闭包问题
                              const currentNames = currentGreenhouseNames;
                              if (checked) {
                                // 勾选：添加这个温室名称
                                const newNames = [...currentNames.filter(n => n !== g.name), g.name];
                                handleFieldChange('greenhouseName', newNames.join(','));
                              } else {
                                // 取消勾选：移除这个温室名称
                                const newNames = currentNames.filter(n => n !== g.name);
                                handleFieldChange('greenhouseName', newNames.join(','));
                              }
                            }}
                          />
                          <label htmlFor={`edit-gh-${g.id}`} className="text-sm cursor-pointer">{g.name}</label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 bg-gray-50 flex items-center">
                      {currentGreenhouseNames.length === 0 ? '请选择' : currentGreenhouseNames.join(', ')}
                    </div>
                  )}
                </div>

                {/* 生产模式 - 多选 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-500">生产模式</span>
                    <button
                      type="button"
                      onClick={() => setPlantingModeExpanded(!plantingModeExpanded)}
                      className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
                    >
                      {plantingModeExpanded ? '收起' : '展开'}
                    </button>
                  </div>
                  {plantingModeExpanded ? (
                    <div className="flex flex-col gap-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                      {plantingModeOptions.map(mode => (
                        <div key={mode.value} className="flex items-center gap-2">
                          <Checkbox
                            id={`edit-pm-${mode.value}`}
                            checked={currentPlantingModes.includes(mode.value)}
                            onCheckedChange={(checked) => {
                              // 使用局部变量保存当前值，避免闭包问题
                              const currentModes = currentPlantingModes;
                              if (checked) {
                                const newModes = [...currentModes.filter((m: string) => m !== ''), mode.value];
                                handleFieldChange('plantingMode', newModes.join(','));
                              } else {
                                const newModes = currentModes.filter((m: string) => m !== mode.value);
                                handleFieldChange('plantingMode', newModes.join(','));
                              }
                            }}
                          />
                          <label htmlFor={`edit-pm-${mode.value}`} className="text-sm cursor-pointer">{mode.label}</label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 bg-gray-50 flex items-center">
                      {currentPlantingModes.length === 0 ? '请选择' : currentPlantingModes.map(m => plantingModeOptions.find(mode => mode.value === m)?.label).filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {/* 第三行：开始时间 + 预计结束时间 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">开始时间</div>
                  <Input
                    type="date"
                    value={editedData.startDate || currentBatch.startDate || ''}
                    onChange={(e) => handleFieldChange('startDate', e.target.value)}
                    className={deepInputClass}
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">预计结束时间</div>
                  <Input
                    type="date"
                    value={editedData.expectedHarvestDate || currentBatch.expectedHarvestDate || ''}
                    onChange={(e) => handleFieldChange('expectedHarvestDate', e.target.value)}
                    className={deepInputClass}
                  />
                </div>
              </div>

              {/* 第四行：负责人 + 目标产量 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">负责人</div>
                  <Select
                    value={editedData.responsiblePerson || currentBatch.responsiblePerson || ''}
                    onValueChange={(v) => handleFieldChange('responsiblePerson', v)}
                  >
                    <SelectTrigger className={deepInputClass}>
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      {RESPONSIBLE_PERSONS.map(name => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {/* 2026-06-14: 育苗计划显示"目标投入+目标产出"，育种/种植显示"目标产量+单位" */}
                  {currentPlanType === 'seedling' ? (
                    <>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">目标投入（母株/种子/分株基数）</div>
                        <Input
                          type="number"
                          min="0"
                          value={(() => {
                            const v = editedData.targetInputCount ?? currentBatch.targetInputCount;
                            return v === undefined || v === null || v === 0 ? '' : v;
                          })()}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === '') { handleFieldChange('targetInputCount', 0); return; }
                            const n = Number(v);
                            if (!Number.isNaN(n) && n >= 0) handleFieldChange('targetInputCount', n);
                          }}
                          placeholder="0"
                          className={deepInputClass}
                        />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">目标产出（成活/扩繁/嫁接苗）</div>
                        <Input
                          type="number"
                          min="0"
                          value={(() => {
                            const v = editedData.targetOutputCount ?? currentBatch.targetOutputCount;
                            return v === undefined || v === null || v === 0 ? '' : v;
                          })()}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === '') { handleFieldChange('targetOutputCount', 0); return; }
                            const n = Number(v);
                            if (!Number.isNaN(n) && n >= 0) handleFieldChange('targetOutputCount', n);
                          }}
                          placeholder="0"
                          className={deepInputClass}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">目标产量</div>
                        <Input
                          type="number"
                          value={editedData.targetYield ?? currentBatch.targetYield ?? ''}
                          onChange={(e) => handleFieldChange('targetYield', e.target.value)}
                          placeholder="0"
                          className={deepInputClass}
                        />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">单位</div>
                        <DictSelect
                          category="unit"
                          value={editedData.unit || currentBatch.unit || ''}
                          onChange={(v) => handleFieldChange('unit', v)}
                          placeholder="选择单位"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 第五行：种植面积 + 面积单位 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">种植面积</div>
                  <Input
                    type="number"
                    value={editedData.plantingArea ?? currentBatch.plantingArea ?? ''}
                    onChange={(e) => handleFieldChange('plantingArea', e.target.value)}
                    placeholder="0"
                    className={deepInputClass}
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">面积单位</div>
                  <DictSelect
                    category="area_unit"
                    value={editedData.plantingAreaUnit || currentBatch.plantingAreaUnit || ''}
                    onChange={(v) => handleFieldChange('plantingAreaUnit', v)}
                    placeholder="选择面积单位"
                  />
                </div>
              </div>

              {/* 第六行：只读字段 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">发布人</div>
                  <div className="text-sm text-gray-700">{currentBatch.publisher || '-'}</div>
                </div>
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">初次发布时间</div>
                  <div className="text-sm text-gray-700">{currentBatch.publishDate || '-'}</div>
                </div>
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">最后修改时间</div>
                  <div className="text-sm text-gray-700">{currentBatch.lastModifyDate || '-'}</div>
                </div>
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">当前状态</div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${batchStatusColors[currentBatch.batchStatus || 'draft']}`}>
                    {batchStatusLabels[currentBatch.batchStatus || 'draft']}
                  </span>
                </div>
              </div>

              {/* 执行状态切换（仅审批通过后可见） */}
              {currentBatch.batchStatus === 'published' && (
                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 mb-1">执行状态</div>
                      <Select
                        value={editedData.executionStatus || currentBatch.executionStatus || 'pending_execution'}
                        onValueChange={(v) => handleFieldChange('executionStatus', v)}
                      >
                        <SelectTrigger className={deepInputClass}>
                          <SelectValue placeholder="请选择执行状态" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending_execution">待执行</SelectItem>
                          <SelectItem value="in_progress">进行中</SelectItem>
                          <SelectItem value="completed">已完成</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* 计划详情文件上传 */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-2">计划详情文件</div>
                <div className="flex items-center gap-4">
                  {editedData.planDetailFileName ?? currentBatch.planDetailFileName ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">
                        {editedData.planDetailFileName ?? currentBatch.planDetailFileName}
                      </span>
                      {/* L-06: 受控 input ref 复用 + cleanup */}
                      <Button
                        size="sm"
                        variant="blue"
                        onClick={triggerFilePicker}
                      >
                        <Upload className="w-4 h-4" />
                        重新上传
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={triggerFilePicker}
                    >
                      <Upload className="w-4 h-4" />
                      上传计划文件
                    </Button>
                  )}
                  <span className="text-xs text-gray-500">支持 .md, .docx, .txt 格式</span>
                </div>
              </div>
            </div>
          )}
        </div>
    </Modal>
  );
}
