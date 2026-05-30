import { X, Upload } from 'lucide-react';
import { CropBatch, Greenhouse } from '../../../types';
import { batchStatusColors, batchStatusLabels, RESPONSIBLE_PERSONS } from '../constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/DatePicker';
import { getAllVarieties } from '../../../services/cropVarietyService';
import { getDictItems } from '../../../stores/useDictionaryStore';

interface BatchEditModalProps {
  isOpen: boolean;
  selectedRows: number[];
  batches: CropBatch[];
  greenhouses: Greenhouse[];
  editedBatchCodes: string[];
  editedBatches: Record<string, Partial<CropBatch>>;
  selectedBatchCode: string;
  onSelectedBatchCodeChange: (code: string) => void;
  onEditedBatchesChange: (batches: Record<string, Partial<CropBatch>>) => void;
  onEditedBatchCodesChange: (codes: string[]) => void;
  onClose: () => void;
  onVoidWarning: () => void;
  onPublish: () => void;
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
  onConfirmNext,
}: BatchEditModalProps) {
  if (!isOpen) return null;

  // 从作物品种库获取作物类型列表（去重）
  const allVarieties = getAllVarieties();
  const cropTypeOptions = Array.from(
    new Map(allVarieties.map(v => [v.varietyName, v])).values()
  ).map(v => ({ name: v.varietyName, typeName: v.typeName, varieties: [v.subVariety1Name || v.varietyName].filter(Boolean) }));

  // 从字典获取种植模式选项
  const plantingModeOptions = getDictItems('planting_mode').map(d => ({
    id: d.dictCode,
    name: d.dictLabel,
    description: d.dictLabel,
  }));

  const selectedBatches = selectedRows.map(id => batches.find(b => b.id === id)).filter(Boolean) as CropBatch[];
  const currentBatch = selectedBatchCode ? batches.find(b => b.batchCode === selectedBatchCode) : null;
  const editedData = selectedBatchCode ? editedBatches[selectedBatchCode] || {} : {};

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

  const handleCropChange = (cropName: string) => {
    const crop = cropTypeOptions.find(c => c.name === cropName);
    handleFieldChange('cropName', cropName);
    if (crop) {
      handleFieldChange('variety', crop.varieties[0]);
    }
  };

  const handleGreenhouseChange = (greenhouseId: string) => {
    const gh = greenhouses.find(g => g.id === greenhouseId);
    handleFieldChange('greenhouseId', greenhouseId);
    if (gh) {
      handleFieldChange('greenhouseName', gh.name);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-5xl shadow-xl max-h-[calc(100vh-2rem)] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-300 flex items-center justify-between bg-blue-600 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-white">批量编辑生产计划</h3>
            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded">
              已选择 {selectedRows.length} 条
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-blue-700">
            <X className="w-5 h-5" />
          </Button>
        </div>

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
                <SelectTrigger className="h-9">
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
        <div className="flex-1 overflow-hidden p-4 flex flex-col">
          {selectedBatchCode && currentBatch && (
            <>
              {/* 第一行：基本信息 */}
              <div className="grid grid-cols-4 gap-3 flex-shrink-0 mb-3">
                {/* 批次号 - 不可编辑 */}
                <div className="bg-gray-100 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">生产计划批次号</div>
                  <div className="text-sm font-medium text-gray-900">{currentBatch.batchCode}</div>
                </div>

                {/* 种植模式 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">种植模式</div>
                  <Select
                    value={editedData.plantingMode ?? currentBatch.plantingMode}
                    onValueChange={(v) => handleFieldChange('plantingMode', v)}
                  >
                    <SelectTrigger className="h-8 px-2 text-sm">
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      {plantingModeOptions.map(m => (
                        <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 作物名称 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">作物名称</div>
                  <Select
                    value={editedData.cropName ?? currentBatch.cropName}
                    onValueChange={(v) => handleCropChange(v)}
                  >
                    <SelectTrigger className="h-8 px-2 text-sm">
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      {cropTypeOptions.map(c => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 作物品种 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">作物品种</div>
                  <Select
                    value={editedData.variety ?? currentBatch.variety}
                    onValueChange={(v) => handleFieldChange('variety', v)}
                  >
                    <SelectTrigger className="h-8 px-2 text-sm">
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      {(cropTypeOptions.find(c => c.name === (editedData.cropName ?? currentBatch.cropName))?.varieties || []).map(v => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 种植区域 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">种植区域</div>
                  <Select
                    value={editedData.greenhouseId ?? currentBatch.greenhouseId}
                    onValueChange={(v) => handleGreenhouseChange(v)}
                  >
                    <SelectTrigger className="h-8 px-2 text-sm">
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      {greenhouses.filter(g => g.status === 'active').map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 种植面积 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">种植面积</div>
                  <Input
                    type="text"
                    value={editedData.plantingArea ?? currentBatch.plantingArea}
                    onChange={(e) => handleFieldChange('plantingArea', e.target.value)}
                    className="h-8 px-2 text-sm"
                  />
                </div>

                {/* 开始时间 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">开始时间</div>
                  <DatePicker
                    selected={editedData.startDate ? new Date(editedData.startDate) : currentBatch.startDate ? new Date(currentBatch.startDate) : undefined}
                    onChange={(date) => handleFieldChange('startDate', date.toISOString().split('T')[0])}
                    placeholder="选择日期"
                  />
                </div>

                {/* 预计结束时间 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">预计结束时间</div>
                  <DatePicker
                    selected={editedData.expectedHarvestDate ? new Date(editedData.expectedHarvestDate) : currentBatch.expectedHarvestDate ? new Date(currentBatch.expectedHarvestDate) : undefined}
                    onChange={(date) => handleFieldChange('expectedHarvestDate', date.toISOString().split('T')[0])}
                    placeholder="选择日期"
                  />
                </div>

                {/* 负责人 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">负责人</div>
                  <Select
                    value={editedData.responsiblePerson ?? currentBatch.responsiblePerson}
                    onValueChange={(v) => handleFieldChange('responsiblePerson', v)}
                  >
                    <SelectTrigger className="h-8 px-2 text-sm">
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      {RESPONSIBLE_PERSONS.map(name => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 目标产量 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">目标产量</div>
                  <Input
                    type="text"
                    value={editedData.targetYield ?? currentBatch.targetYield}
                    onChange={(e) => handleFieldChange('targetYield', e.target.value)}
                    className="h-8 px-2 text-sm"
                  />
                </div>

                {/* 发布人 - 不可编辑 */}
                <div className="bg-gray-100 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">发布人</div>
                  <div className="text-sm text-gray-700">{currentBatch.publisher || '-'}</div>
                </div>

                {/* 初次发布时间 - 不可编辑 */}
                <div className="bg-gray-100 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">初次发布时间</div>
                  <div className="text-sm text-gray-700">{currentBatch.publishDate || '-'}</div>
                </div>

                {/* 最后修改时间 - 不可编辑 */}
                <div className="bg-gray-100 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">最后修改时间</div>
                  <div className="text-sm text-gray-700">{currentBatch.lastModifyDate || '-'}</div>
                </div>

                {/* 当前状态 - 不可编辑 */}
                <div className="bg-gray-100 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">当前状态</div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${batchStatusColors[currentBatch.batchStatus || 'draft']}`}>
                    {batchStatusLabels[currentBatch.batchStatus || 'draft']}
                  </span>
                </div>

                {/* 计划是否完成 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">计划是否完成</div>
                  <Select
                    value={editedData.isCompleted === undefined ? 'no' : editedData.isCompleted ? 'yes' : 'no'}
                    onValueChange={(v) => handleFieldChange('isCompleted', v === 'yes')}
                  >
                    <SelectTrigger className="h-8 px-2 text-sm">
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">否</SelectItem>
                      <SelectItem value="yes">是</SelectItem>
                    </SelectContent>
                  </Select>
                  {editedData.isCompleted === true && (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      ⚠️ 选择"是"后计划将归档，无法编辑和删除
                    </p>
                  )}
                </div>
              </div>

              {/* 第二行：计划详情文件上传 */}
              <div className="bg-gray-50 rounded-lg p-3 flex-shrink-0">
                <div className="text-xs text-gray-500 mb-2">计划详情文件</div>
                <div className="flex items-center gap-4">
                  {editedData.planDetailFileName ?? currentBatch.planDetailFileName ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">
                        {editedData.planDetailFileName ?? currentBatch.planDetailFileName}
                      </span>
                      <Button
                        size="sm"
                        variant="blue"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = '.md,.docx,.txt';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              handleFieldChange('planDetailFileName', file.name);
                              // 读取文件内容
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                handleFieldChange('planDetail', event.target?.result as string);
                              };
                              reader.readAsText(file);
                            }
                          };
                          input.click();
                        }}
                      >
                        <Upload className="w-3 h-3" />
                        重新上传
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.md,.docx,.txt';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            handleFieldChange('planDetailFileName', file.name);
                            // 读取文件内容
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              handleFieldChange('planDetail', event.target?.result as string);
                            };
                            reader.readAsText(file);
                          }
                        };
                        input.click();
                      }}
                    >
                      <Upload className="w-3 h-3" />
                      上传计划文件
                    </Button>
                  )}
                  <span className="text-xs text-gray-500">支持 .md, .docx, .txt 格式</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-300 flex justify-end flex-shrink-0">
          <div className="flex gap-3">
            <Button onClick={onConfirmNext}>
              确认（下一个）
            </Button>
            <Button variant="warning" onClick={onVoidWarning}>
              申请作废
            </Button>
            <Button variant="blue" onClick={onPublish}>
              提交
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
