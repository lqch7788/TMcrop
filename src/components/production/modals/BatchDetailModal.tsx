import { X } from 'lucide-react';
import { CropBatch } from '../../../types';
import { batchStatusColors, batchStatusLabels, stageProgress } from '../constants';

interface BatchDetailModalProps {
  batch: CropBatch | null;
  onClose: () => void;
  onViewWorkOrders?: () => void;
}

export function BatchDetailModal({
  batch,
  onClose,
  onViewWorkOrders,
}: BatchDetailModalProps) {
  if (!batch) return null;

  const stages = [
    { key: 'seedling', label: '苗期' },
    { key: 'vegetative', label: '生长期' },
    { key: 'flowering', label: '开花期' },
    { key: 'fruiting', label: '结果期' },
    { key: 'harvest', label: '采收期' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">批次详情</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-xs text-gray-500 uppercase">批次编号</label>
              <p className="text-sm font-medium text-gray-900 mt-1">{batch.batchCode}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">种植模式</label>
              <p className="text-sm font-medium text-gray-900 mt-1">{batch.plantingMode}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">作物名称</label>
              <p className="text-sm font-medium text-gray-900 mt-1">{batch.cropName}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">作物品种</label>
              <p className="text-sm font-medium text-gray-900 mt-1">{batch.variety}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">种植区域</label>
              <p className="text-sm font-medium text-gray-900 mt-1">{batch.greenhouseName}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">种植面积</label>
              <p className="text-sm font-medium text-gray-900 mt-1">{batch.plantingArea} m²</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">开始时间</label>
              <p className="text-sm font-medium text-gray-900 mt-1">{batch.startDate}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">预计结束时间</label>
              <p className="text-sm font-medium text-gray-900 mt-1">{batch.expectedHarvestDate}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">负责人</label>
              <p className="text-sm font-medium text-gray-900 mt-1">{batch.responsiblePerson}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">目标产量</label>
              <p className="text-sm font-medium text-gray-900 mt-1">{batch.targetYield} kg</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">当前状态</label>
              <p className="mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${batchStatusColors[batch.batchStatus || 'draft']}`}>
                  {batchStatusLabels[batch.batchStatus || 'draft']}
                </span>
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">发布人</label>
              <p className="text-sm font-medium text-gray-900 mt-1">{batch.publisher || '-'}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">初次发布时间</label>
              <p className="text-sm font-medium text-gray-900 mt-1">{batch.publishDate || '-'}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">最后修改时间</label>
              <p className="text-sm font-medium text-gray-900 mt-1">{batch.lastModifyDate || '-'}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h4 className="font-medium text-gray-900 mb-3">生长进度</h4>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
                style={{ width: `${stageProgress[batch.stage]}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              {stages.map((stage) => (
                <span
                  key={stage.key}
                  className={`text-xs ${
                    batch.stage === stage.key ? 'text-emerald-600 font-medium' : 'text-gray-400'
                  }`}
                >
                  {stage.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            关闭
          </button>
          {onViewWorkOrders && (
            <button
              onClick={onViewWorkOrders}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              查看工单
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
