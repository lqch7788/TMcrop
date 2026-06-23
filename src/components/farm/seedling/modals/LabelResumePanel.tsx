/**
 * 标签履历面板 — 右侧履历时间线展示
 * 从 SeedlingLabelManageModal 右侧面板提取
 * 空状态 / loading / LabelResumeTimeline 三态切换
 */
import React from 'react';
import { Tag } from 'lucide-react';
import { LabelResumeTimeline } from '@/components/ui';
import type { LabelResumeEntry } from '@/components/ui/LabelResumeTimeline';
import type { PlantLabel, PlantLabelResume } from '@/stores/usePlantLabelStore';

interface LabelResumePanelProps {
  selectedLabel: PlantLabel | undefined;
  resumes: PlantLabelResume[];
  loading: boolean;
}

export function LabelResumePanel({ selectedLabel, resumes, loading }: LabelResumePanelProps) {
  // 未选择标签
  if (!selectedLabel) {
    return (
      <div className="py-12 text-center text-gray-400">
        <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>请在左侧选择一个标签查看履历</p>
      </div>
    );
  }

  // 加载中
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 映射 PlantLabelResume[] → LabelResumeEntry[]
  const entries: LabelResumeEntry[] = resumes.map((r) => ({
    id: r.id,
    operationType: r.operationType,
    fromAreaName: r.fromAreaName || undefined,
    toAreaName: r.toAreaName || undefined,
    operationDate: r.operationDate,
    markName: r.markName || undefined,
    markColor: r.markColor || undefined,
    operatorName: r.operatorName || undefined,
    imageBase64: r.imageBase64 || undefined,
  }));

  return (
    <LabelResumeTimeline
      entries={entries}
      currentLabel={selectedLabel.labelNumber}
      currentMark={undefined}
    />
  );
}

export default LabelResumePanel;
