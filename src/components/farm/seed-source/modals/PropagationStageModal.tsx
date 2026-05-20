/**
 * 繁殖阶段管理弹窗
 * 显示当前阶段、阶段流转路径、推进阶段按钮、完成入库按钮
 * 不同繁殖途径显示不同的阶段流程标签
 */

import React, { useState } from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { Button } from '../../../ui/button';
import { ChevronRight, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { SeedSource, PropagationType, PropagationStatus } from '../../../../types/crop';
import { useSeedSourceStore } from '../../../../stores/useSeedSourceStore';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';

// 统一繁殖阶段流转顺序
const STAGE_ORDER: PropagationStatus[] = [
  PropagationStatus.PLANNED,
  PropagationStatus.IN_PROGRESS,
  PropagationStatus.HARVESTED,
  PropagationStatus.QUALITY_CHECKED,
  PropagationStatus.COMPLETED,
];

const STAGE_LABELS: Record<string, string> = {
  planned: '已计划',
  in_progress: '进行中',
  harvested: '已采收',
  quality_checked: '已质检',
  completed: '已入库',
  failed: '失败',
};

const STAGE_DESCRIPTIONS: Record<string, string> = {
  planned: '',
  in_progress: '',
  harvested: '',
  quality_checked: '',
  completed: '',
};

// 根据途径类型设置具体阶段描述
const getStageDescriptions = (propagationType?: string): Record<string, string> => {
  if (propagationType === PropagationType.BREEDING) {
    return {
      planned: '育种计划已制定，亲本已选定',
      in_progress: '授粉/杂交/选育进行中',
      harvested: '种子已采收，记录采收数据',
      quality_checked: '发芽率、净度、水分已检测',
      completed: '种子已入库，库存已更新',
      failed: '育种过程失败',
    };
  }
  if (propagationType === PropagationType.SEED_SAVING) {
    return {
      planned: '留种计划已制定，留种株已标记',
      in_progress: '留种株生长观察中',
      harvested: '从种植作物上采收种子',
      quality_checked: '发芽率、净度、水分已检测',
      completed: '种子已入库，库存已更新',
      failed: '留种过程失败',
    };
  }
  if (propagationType === PropagationType.ASEXUAL) {
    return {
      planned: '母株已选定，繁殖计划已制定',
      in_progress: '扦插/嫁接/分株/组培培养中',
      harvested: '种苗/种球已采收',
      quality_checked: '成活率、生根率、嫁接成活率已检测',
      completed: '种苗已入库，库存已更新',
      failed: '繁殖过程失败',
    };
  }
  return STAGE_DESCRIPTIONS;
};

interface PropagationStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SeedSource | null;
  onSuccess?: () => void;
}

export function PropagationStageModal({
  isOpen,
  onClose,
  record,
  onSuccess,
}: PropagationStageModalProps) {
  const { updatePropagationStage, completePropagation, loadItems } = useSeedSourceStore();
  const [confirming, setConfirming] = useState(false);
  const [harvestQuantity, setHarvestQuantity] = useState(0);

  if (!record) return null;

  const currentStage = record.propagationStatus || PropagationStatus.PLANNED;
  const currentIndex = STAGE_ORDER.indexOf(currentStage as PropagationStatus);
  const descriptions = getStageDescriptions(record.propagationType);

  // 判断是否可以推进到下一阶段
  const canAdvance = currentIndex >= 0 && currentIndex < STAGE_ORDER.length - 1 && currentStage !== PropagationStatus.FAILED;
  const nextStage = canAdvance ? STAGE_ORDER[currentIndex + 1] : null;
  const canComplete = currentStage === PropagationStatus.QUALITY_CHECKED;

  // 推进阶段
  const handleAdvance = async () => {
    if (!nextStage) return;
    setConfirming(true);
    const success = await updatePropagationStage(record.id, nextStage);
    setConfirming(false);
    if (success) {
      onSuccess?.();
    }
  };

  // 完成入库
  const handleComplete = async () => {
    if (harvestQuantity <= 0) {
      alert('请输入入库数量');
      return;
    }
    setConfirming(true);
    const success = await completePropagation(record.id, harvestQuantity);
    setConfirming(false);
    if (success) {
      await loadItems();
      onSuccess?.();
      onClose();
    }
  };

  const isFailed = currentStage === PropagationStatus.FAILED;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="繁殖阶段管理"
      size="lg"
      showFooter={true}
      onSubmit={() => onClose()}
      submitText="关闭"
      cancelText=""
    >
      <div className="space-y-6">
        {/* 当前阶段状态 */}
        <div className={`p-4 rounded-lg ${isFailed ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">当前阶段</p>
              <p className={`text-lg font-bold ${isFailed ? 'text-red-700' : 'text-emerald-700'}`}>
                {STAGE_LABELS[currentStage] || currentStage}
              </p>
              <p className="text-sm text-gray-600 mt-1">{descriptions[currentStage] || ''}</p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isFailed ? 'bg-red-100' : 'bg-emerald-100'}`}>
              {isFailed ? (
                <AlertTriangle className="w-6 h-6 text-red-600" />
              ) : (
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              )}
            </div>
          </div>
        </div>

        {/* 阶段流转路径 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">阶段流转路径</h4>
          <div className="flex items-center flex-wrap gap-1">
            {STAGE_ORDER.map((stage, index) => {
              const isActive = index === currentIndex && !isFailed;
              const isPast = index < currentIndex;
              const isFuture = index > currentIndex;
              return (
                <React.Fragment key={stage}>
                  {index > 0 && (
                    <ChevronRight className={`w-4 h-4 ${isPast ? 'text-emerald-400' : 'text-gray-300'}`} />
                  )}
                  <div
                    className={`px-3 py-2 rounded-lg text-xs font-medium text-center min-w-[80px] ${
                      isActive
                        ? 'bg-emerald-500 text-white ring-2 ring-emerald-300'
                        : isPast
                        ? 'bg-emerald-100 text-emerald-700'
                        : isFailed
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <div>{STAGE_LABELS[stage]}</div>
                  </div>
                </React.Fragment>
              );
            })}
            {/* 失败状态 */}
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <div
              className={`px-3 py-2 rounded-lg text-xs font-medium text-center min-w-[60px] ${
                isFailed ? 'bg-red-500 text-white ring-2 ring-red-300' : 'bg-gray-100 text-gray-400'
              }`}
            >
              失败
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            已完成阶段为绿色，当前阶段高亮显示
          </p>
        </div>

        {/* 操作按钮区域 */}
        {!isFailed && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">阶段操作</h4>

            {/* 推进到下一阶段 */}
            {canAdvance && nextStage && (
              <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    推进到「{STAGE_LABELS[nextStage] || nextStage}」
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {descriptions[nextStage] || ''}
                  </p>
                </div>
                <Button
                  variant="blue"
                  size="sm"
                  onClick={handleAdvance}
                  disabled={confirming}
                >
                  <ArrowRight className="w-4 h-4" />
                  {confirming ? '处理中...' : '推进'}
                </Button>
              </div>
            )}

            {/* 完成入库 */}
            {canComplete && (
              <div className="bg-white rounded-lg p-3 border border-emerald-200">
                <p className="text-sm font-medium text-gray-900 mb-2">完成繁殖入库</p>
                <p className="text-xs text-gray-500 mb-3">
                  质检已完成，确认入库数量后将更新库存。入库前请确认数量准确。
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label className="text-gray-600 text-xs">入库数量</Label>
                    <Input
                      type="number"
                      value={harvestQuantity || ''}
                      onChange={(e) => setHarvestQuantity(Number(e.target.value))}
                      min={1}
                      placeholder="请输入入库数量"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleComplete}
                    disabled={confirming || harvestQuantity <= 0}
                    className="self-end"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {confirming ? '处理中...' : '确认入库'}
                  </Button>
                </div>
              </div>
            )}

            {/* 如已是完成状态 */}
            {currentStage === PropagationStatus.COMPLETED && (
              <div className="bg-emerald-50 rounded-lg p-4 text-center">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-emerald-700">繁殖已入库完成</p>
                <p className="text-xs text-emerald-600 mt-1">该种源已完成全部阶段流转，库存已更新</p>
              </div>
            )}
          </div>
        )}

        {/* 失败状态 */}
        {isFailed && (
          <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-red-700">繁殖过程已标记为失败</p>
            <p className="text-xs text-red-600 mt-1">该种源的繁殖过程已终止，无法继续操作</p>
          </div>
        )}
      </div>
    </UnifiedModal>
  );
}
