/**
 * 繁殖过程记录弹窗
 * 上半：添加繁殖过程记录表单（根据途径类型和当前阶段动态显示不同字段）
 * 下半：历史记录时间线列表
 */

import React, { useState, useEffect } from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { Plus, Clock, Thermometer, Droplets, AlertTriangle } from 'lucide-react';
import { SeedSource, PropagationType, PropagationStatus, PropagationRecord } from '../../../../types/crop';
import { useSeedSourceStore } from '../../../../stores/useSeedSourceStore';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { TextArea } from '../../../ui/TextArea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';

// 阶段中文映射
const STAGE_LABELS: Record<string, string> = {
  planned: '已计划',
  in_progress: '进行中',
  harvested: '已采收',
  quality_checked: '已质检',
  completed: '已入库',
  failed: '失败',
};

const STAGE_COLORS: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  harvested: 'bg-green-100 text-green-700',
  quality_checked: 'bg-purple-100 text-purple-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
};

interface PropagationRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SeedSource | null;
  onSuccess?: () => void;
}

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

export function PropagationRecordModal({
  isOpen,
  onClose,
  record,
  onSuccess,
}: PropagationRecordModalProps) {
  const { addPropagationRecord, loadPropagationRecords } = useSeedSourceStore();
  const [records, setRecords] = useState<PropagationRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // 表单字段
  const [formData, setFormData] = useState<Partial<PropagationRecord>>({
    stage: PropagationStatus.IN_PROGRESS,
    recordDate: new Date().toISOString().slice(0, 16),
    temperature: undefined,
    humidity: undefined,
    abnormality: '',
    operator: '',
    remarks: '',
    pollinationType: undefined,
    pollinatorCrop: '',
    flowerCount: 0,
    fruitSetCount: 0,
    harvestSeedCount: 0,
    seedWeight: 0,
    harvestPlantCount: 0,
    germinationRate: 0,
    purity: 0,
    moisture: 0,
    survivalRate: 0,
    rootedRate: 0,
    graftSuccessRate: 0,
  });

  // 加载已有记录
  useEffect(() => {
    if (isOpen && record) {
      setLoading(true);
      loadPropagationRecords(record.id).then((data) => {
        setRecords(data);
        setLoading(false);
      });
    }
  }, [isOpen, record, loadPropagationRecords]);

  // 重置表单
  const resetForm = () => {
    setFormData({
      stage: PropagationStatus.IN_PROGRESS,
      recordDate: new Date().toISOString().slice(0, 16),
      temperature: undefined,
      humidity: undefined,
      abnormality: '',
      operator: '',
      remarks: '',
      pollinationType: undefined,
      pollinatorCrop: '',
      flowerCount: 0,
      fruitSetCount: 0,
      harvestSeedCount: 0,
      seedWeight: 0,
      harvestPlantCount: 0,
      germinationRate: 0,
      purity: 0,
      moisture: 0,
      survivalRate: 0,
      rootedRate: 0,
      graftSuccessRate: 0,
    });
  };

  const handleSubmit = async () => {
    if (!record) return;
    const data = {
      ...formData,
      seedSourceId: record.id,
      recordDate: formData.recordDate || new Date().toISOString(),
      stage: formData.stage || PropagationStatus.IN_PROGRESS,
    };
    const result = await addPropagationRecord(record.id, data as any);
    if (result) {
      resetForm();
      const updated = await loadPropagationRecords(record.id);
      setRecords(updated);
      onSuccess?.();
    }
  };

  const isBreeding = record?.propagationType === PropagationType.BREEDING;
  const isSeedSaving = record?.propagationType === PropagationType.SEED_SAVING;
  const isAsexual = record?.propagationType === PropagationType.ASEXUAL;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="繁殖过程记录"
      size="xl"
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="添加记录"
      cancelText="关闭"
    >
      <div className="space-y-6">
        {/* 上部：添加记录表单 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600" />
            添加过程记录
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {/* 记录日期 */}
            <div>
              <Label className="text-gray-600 text-xs">记录日期</Label>
              <Input
                type="datetime-local"
                value={formData.recordDate || ''}
                onChange={(e) => setFormData({ ...formData, recordDate: e.target.value })}
                className={deepInputClass}
              />
            </div>

            {/* 阶段 */}
            <div>
              <Label className="text-gray-600 text-xs">当前阶段</Label>
              <Select
                value={formData.stage}
                onValueChange={(val) => setFormData({ ...formData, stage: val as PropagationStatus })}
              >
                <SelectTrigger className={deepInputClass}>
                  <SelectValue placeholder="选择阶段" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STAGE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 温度 */}
            <div>
              <Label className="text-gray-600 text-xs flex items-center gap-1">
                <Thermometer className="w-3 h-3 text-orange-500" /> 温度（℃）
              </Label>
              <Input
                type="number"
                step="0.1"
                value={formData.temperature ?? ''}
                onChange={(e) => setFormData({ ...formData, temperature: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="如 25.5"
                className={deepInputClass}
              />
            </div>

            {/* 湿度 */}
            <div>
              <Label className="text-gray-600 text-xs flex items-center gap-1">
                <Droplets className="w-3 h-3 text-blue-500" /> 湿度（%）
              </Label>
              <Input
                type="number"
                step="0.1"
                value={formData.humidity ?? ''}
                onChange={(e) => setFormData({ ...formData, humidity: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="如 65"
                className={deepInputClass}
              />
            </div>

            {/* 操作人 */}
            <div>
              <Label className="text-gray-600 text-xs">操作人</Label>
              <Input
                type="text"
                value={formData.operator || ''}
                onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                placeholder="操作人姓名"
                className={deepInputClass}
              />
            </div>

            {/* === 育种途径字段 === */}
            {isBreeding && (
              <>
                <div>
                  <Label className="text-gray-600 text-xs">授粉类型</Label>
                  <Select
                    value={formData.pollinationType || '__none__'}
                    onValueChange={(val) => setFormData({ ...formData, pollinationType: val === '__none__' ? undefined : val as any })}
                  >
                    <SelectTrigger className={deepInputClass}>
                      <SelectValue placeholder="未设置" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">未设置</SelectItem>
                      <SelectItem value="self">自花授粉</SelectItem>
                      <SelectItem value="cross">异花授粉</SelectItem>
                      <SelectItem value="open">开放授粉</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">授粉作物</Label>
                  <Input
                    type="text"
                    value={formData.pollinatorCrop || ''}
                    onChange={(e) => setFormData({ ...formData, pollinatorCrop: e.target.value })}
                    placeholder="授粉作物名称"
                    className={deepInputClass}
                  />
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">授粉花朵数</Label>
                  <Input
                    type="number"
                    value={formData.flowerCount || ''}
                    onChange={(e) => setFormData({ ...formData, flowerCount: Number(e.target.value) })}
                    className={deepInputClass}
                  />
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">坐果数</Label>
                  <Input
                    type="number"
                    value={formData.fruitSetCount || ''}
                    onChange={(e) => setFormData({ ...formData, fruitSetCount: Number(e.target.value) })}
                    className={deepInputClass}
                  />
                </div>
              </>
            )}

            {/* === 采收阶段字段（育种+留种） === */}
            {(isBreeding || isSeedSaving) && (
              <>
                <div>
                  <Label className="text-gray-600 text-xs">采收种子数</Label>
                  <Input
                    type="number"
                    value={formData.harvestSeedCount || ''}
                    onChange={(e) => setFormData({ ...formData, harvestSeedCount: Number(e.target.value) })}
                    className={deepInputClass}
                  />
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">种子重量(g)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.seedWeight || ''}
                    onChange={(e) => setFormData({ ...formData, seedWeight: Number(e.target.value) })}
                    className={deepInputClass}
                  />
                </div>
              </>
            )}

            {/* === 无性繁殖字段 === */}
            {isAsexual && (
              <>
                <div>
                  <Label className="text-gray-600 text-xs">采收苗数</Label>
                  <Input
                    type="number"
                    value={formData.harvestPlantCount || ''}
                    onChange={(e) => setFormData({ ...formData, harvestPlantCount: Number(e.target.value) })}
                    className={deepInputClass}
                  />
                </div>
              </>
            )}

            {/* === 质检阶段字段 === */}
            {isBreeding || isSeedSaving ? (
              <>
                <div>
                  <Label className="text-gray-600 text-xs">发芽率(%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.germinationRate || ''}
                    onChange={(e) => setFormData({ ...formData, germinationRate: Number(e.target.value) })}
                    className={deepInputClass}
                  />
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">净度(%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.purity || ''}
                    onChange={(e) => setFormData({ ...formData, purity: Number(e.target.value) })}
                    className={deepInputClass}
                  />
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">水分(%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.moisture || ''}
                    onChange={(e) => setFormData({ ...formData, moisture: Number(e.target.value) })}
                    className={deepInputClass}
                  />
                </div>
              </>
            ) : isAsexual ? (
              <>
                <div>
                  <Label className="text-gray-600 text-xs">成活率(%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.survivalRate || ''}
                    onChange={(e) => setFormData({ ...formData, survivalRate: Number(e.target.value) })}
                    className={deepInputClass}
                  />
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">生根率(%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.rootedRate || ''}
                    onChange={(e) => setFormData({ ...formData, rootedRate: Number(e.target.value) })}
                    className={deepInputClass}
                  />
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">嫁接成活率(%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.graftSuccessRate || ''}
                    onChange={(e) => setFormData({ ...formData, graftSuccessRate: Number(e.target.value) })}
                    className={deepInputClass}
                  />
                </div>
              </>
            ) : null}

            {/* 异常描述 - 占两列 */}
            <div className="col-span-2">
              <Label className="text-gray-600 text-xs flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-500" /> 异常描述
              </Label>
              <Input
                type="text"
                value={formData.abnormality || ''}
                onChange={(e) => setFormData({ ...formData, abnormality: e.target.value })}
                placeholder="记录异常情况（如有）"
                className={deepInputClass}
              />
            </div>

            {/* 备注 - 占两列 */}
            <div className="col-span-2">
              <Label className="text-gray-600 text-xs">备注</Label>
              <TextArea
                value={formData.remarks || ''}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={2}
                className={deepInputClass}
                placeholder="补充说明"
              />
            </div>
          </div>
        </div>

        {/* 下部：历史记录时间线 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            操作记录 ({records.length})
          </h4>
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">加载中...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">暂无过程记录</div>
          ) : (
            <div className="relative pl-6 border-l-2 border-gray-200 space-y-4 ml-2">
              {records.map((rec) => (
                <div key={rec.id} className="relative">
                  <div className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                  <div className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STAGE_COLORS[rec.stage] || 'bg-gray-100 text-gray-600'}`}>
                        {STAGE_LABELS[rec.stage] || rec.stage}
                      </span>
                      <span className="text-xs text-gray-400">
                        {rec.recordDate ? (typeof rec.recordDate === 'string' ? rec.recordDate.replace('T', ' ') : rec.recordDate) : ''}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 space-y-0.5">
                      {rec.temperature !== undefined && <span className="mr-3">🌡 {rec.temperature}℃</span>}
                      {rec.humidity !== undefined && <span className="mr-3">💧 {rec.humidity}%</span>}
                      {rec.pollinationType && <span className="mr-3">授粉: {rec.pollinationType}</span>}
                      {rec.flowerCount !== undefined && rec.flowerCount > 0 && <span className="mr-3">花: {rec.flowerCount}</span>}
                      {rec.fruitSetCount !== undefined && rec.fruitSetCount > 0 && <span className="mr-3">果: {rec.fruitSetCount}</span>}
                      {rec.harvestSeedCount !== undefined && rec.harvestSeedCount > 0 && <span className="mr-3">种子: {rec.harvestSeedCount}</span>}
                      {rec.harvestPlantCount !== undefined && rec.harvestPlantCount > 0 && <span className="mr-3">苗: {rec.harvestPlantCount}</span>}
                      {rec.germinationRate !== undefined && rec.germinationRate > 0 && <span className="mr-3">发芽率: {rec.germinationRate}%</span>}
                      {rec.survivalRate !== undefined && rec.survivalRate > 0 && <span className="mr-3">成活率: {rec.survivalRate}%</span>}
                    </div>
                    {rec.operator && <div className="text-xs text-gray-400 mt-1">操作人: {rec.operator}</div>}
                    {rec.abnormality && (
                      <div className="text-xs text-amber-600 mt-1 bg-amber-50 px-2 py-1 rounded">
                        ⚠ {rec.abnormality}
                      </div>
                    )}
                    {rec.remarks && <div className="text-xs text-gray-500 mt-1">{rec.remarks}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </UnifiedModal>
  );
}
