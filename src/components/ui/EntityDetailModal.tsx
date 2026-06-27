/**
 * EntityDetailModal — 通用详情弹窗包装层（2026-06-27）
 *
 * 用于种源/育苗/种植 3 个 entity 的详情弹窗，统一样式与 Tab 结构：
 * 1. 基本信息（props.basicInfoPanel）
 * 2. 追溯时间线（EntityHistoryTimeline，必选）
 * 3. 额外 Tab（props.extraTabs，可选）
 */

import React, { useState } from 'react';
import { UnifiedModal, Button } from '@/components/ui';
import { Clock } from 'lucide-react';
import { EntityHistoryTimeline } from './EntityHistoryTimeline';

interface ExtraTab {
  key: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

interface EntityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** 基本信息面板（React 节点，按 entity 不同） */
  basicInfoPanel: React.ReactNode;
  /** 实体标识 */
  entity: 'seed-sources' | 'seedlings' | 'plantings';
  /** 实体 ID */
  entityId: string;
  /** 实体编码（用于 material_flow_log 关联） */
  entityCode: string;
  /** 可选附加 Tab */
  extraTabs?: ExtraTab[];
}

export function EntityDetailModal({
  isOpen,
  onClose,
  title,
  basicInfoPanel,
  entity,
  entityId,
  entityCode,
  extraTabs = [],
}: EntityDetailModalProps) {
  const [activeTab, setActiveTab] = useState<string>('info');

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xl"
      showFooter={true}
      onSubmit={() => onClose()}
      submitText="关闭"
      cancelText=""
    >
      {/* Tab 切换 */}
      <div className="flex border-b border-gray-200 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('info')}
          className={`px-4 py-2 text-sm font-medium border-b-2 rounded-none -mb-px hover:bg-transparent ${
            activeTab === 'info'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          基本信息
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium border-b-2 rounded-none -mb-px hover:bg-transparent flex items-center gap-1 ${
            activeTab === 'history'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          追溯时间线
        </Button>
        {extraTabs.map((tab) => (
          <Button
            key={tab.key}
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 rounded-none -mb-px hover:bg-transparent flex items-center gap-1 ${
              activeTab === tab.key
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab 内容 */}
      {activeTab === 'info' && basicInfoPanel}

      {activeTab === 'history' && (
        <div className="py-2">
          <EntityHistoryTimeline
            entity={entity}
            entityId={entityId}
            entityCode={entityCode}
          />
        </div>
      )}

      {extraTabs.map((tab) =>
        activeTab === tab.key ? <div key={tab.key} className="py-2">{tab.content}</div> : null
      )}
    </UnifiedModal>
  );
}

export default EntityDetailModal;
