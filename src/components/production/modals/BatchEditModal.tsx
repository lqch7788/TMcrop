import { X } from 'lucide-react';
import { CropBatch, Greenhouse, CropType } from '../../../types';
import { batchStatusColors, batchStatusLabels, RESPONSIBLE_PERSONS } from '../constants';

interface PlantingMode {
  id: string;
  name: string;
  description: string;
}

interface BatchEditModalProps {
  isOpen: boolean;
  selectedRows: number[];
  batches: CropBatch[];
  greenhouses: Greenhouse[];
  cropTypes: CropType[];
  plantingModes: PlantingMode[];
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
  cropTypes,
  plantingModes,
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
    const crop = cropTypes.find(c => c.name === cropName);
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
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-600 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-white">批量编辑生产计划</h3>
            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded">
              已选择 {selectedRows.length} 条
            </span>
          </div>
          <button onClick={onClose} className="text-white hover:bg-blue-700 p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <div className="bg-blue-50 rounded-lg p-3 mb-3">
            <p className="text-sm text-blue-800">
              已选择 <strong>{selectedRows.length}</strong> 个生产计划进行批量编辑，
              已编辑 <strong>{editedBatchCodes.length}</strong> 个
            </p>
          </div>

          {/* Batch Selector */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">选择生产计划批次号</label>
              <select
                value={selectedBatchCode}
                onChange={(e) => onSelectedBatchCodeChange(e.target.value)}
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">请选择批次号</option>
                {selectedBatches.map(batch => (
                  <option key={batch.id} value={batch.batchCode}>
                    {batch.batchCode} - {batch.cropName}{' '}
                    {editedBatchCodes.includes(batch.batchCode) && (
                      <span className="bg-green-100 text-green-700">✅ 已编辑</span>
                    )}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4 flex flex-col">
          {selectedBatchCode && currentBatch && (
            <div className="grid grid-cols-4 gap-3 flex-shrink-0">
              {/* 批次号 - 不可编辑 */}
              <div className="bg-gray-100 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">生产计划批次号</div>
                <div className="text-sm font-medium text-gray-900">{currentBatch.batchCode}</div>
              </div>

              {/* 种植模式 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">种植模式</div>
                <select
                  value={editedData.plantingMode ?? currentBatch.plantingMode}
                  onChange={(e) => handleFieldChange('plantingMode', e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                >
                  {plantingModes.map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* 作物名称 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">作物名称</div>
                <select
                  value={editedData.cropName ?? currentBatch.cropName}
                  onChange={(e) => handleCropChange(e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                >
                  {cropTypes.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* 作物品种 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">作物品种</div>
                <select
                  value={editedData.variety ?? currentBatch.variety}
                  onChange={(e) => handleFieldChange('variety', e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                >
                  {(cropTypes.find(c => c.name === (editedData.cropName ?? currentBatch.cropName))?.varieties || []).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              {/* 种植区域 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">种植区域</div>
                <select
                  value={editedData.greenhouseId ?? currentBatch.greenhouseId}
                  onChange={(e) => handleGreenhouseChange(e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                >
                  {greenhouses.filter(g => g.status === 'active').map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {/* 种植面积 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">种植面积</div>
                <input
                  type="text"
                  value={editedData.plantingArea ?? currentBatch.plantingArea}
                  onChange={(e) => handleFieldChange('plantingArea', e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 开始时间 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">开始时间</div>
                <input
                  type="date"
                  value={editedData.startDate ?? currentBatch.startDate}
                  onChange={(e) => handleFieldChange('startDate', e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 预计结束时间 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">预计结束时间</div>
                <input
                  type="date"
                  value={editedData.expectedHarvestDate ?? currentBatch.expectedHarvestDate}
                  onChange={(e) => handleFieldChange('expectedHarvestDate', e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 负责人 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">负责人</div>
                <select
                  value={editedData.responsiblePerson ?? currentBatch.responsiblePerson}
                  onChange={(e) => handleFieldChange('responsiblePerson', e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                >
                  {RESPONSIBLE_PERSONS.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              {/* 目标产量 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">目标产量</div>
                <input
                  type="text"
                  value={editedData.targetYield ?? currentBatch.targetYield}
                  onChange={(e) => handleFieldChange('targetYield', e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 发布人 - 不可编辑 */}
              <div className="bg-gray-100 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">发布人</div>
                <div className="text-sm text-gray-700">{currentBatch.publisher || '-'}</div>
              </div>

              {/* 当前状态 - 不可编辑 */}
              <div className="bg-gray-100 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">当前状态</div>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${batchStatusColors[currentBatch.batchStatus || 'draft']}`}>
                  {batchStatusLabels[currentBatch.batchStatus || 'draft']}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end flex-shrink-0">
          <div className="flex gap-3">
            <button
              onClick={onConfirmNext}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              确认（下一个）
            </button>
            <button
              onClick={onVoidWarning}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
            >
              申请作废
            </button>
            <button
              onClick={onPublish}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              发布
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
