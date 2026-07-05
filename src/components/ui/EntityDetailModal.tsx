/**
 * EntityDetailModal — 通用详情弹窗包装层（2026-06-27）
 *
 * 用于种源/育苗/种植 3 个 entity 的详情弹窗，统一样式与 Tab 结构：
 * 1. 基本信息（props.basicInfoPanel）
 * 2. 追溯时间线（EntityHistoryTimeline，必选）
 * 3. 额外 Tab（props.extraTabs，可选）
 *
 * 2026-06-27：原 entitySourceType prop 改为 typeColumn，3 个 entity 各自传：
 * - 种源：{ label: '种源类型', value: '种子' }
 * - 育苗：{ label: '种苗类型', value: '穴盘苗' }
 * - 种植：{ label: '成品类型', value: '果实' }
 */

import React, { useState } from 'react';
import { UnifiedModal, Button } from '@/components/ui';
import { Clock } from 'lucide-react';
import { EntityHistoryTimeline, type TypeColumnConfig } from './EntityHistoryTimeline';

interface ExtraTab {
  key: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  /** 悬停提示 — 解释该 tab 的作用 */
  tooltip?: string;
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
  /**
   * 实体类型列配置（2026-06-27）
   * - 种源：{ label: '种源类型', value: fmtSourceType(record.sourceType) }
   * - 育苗：{ label: '种苗类型', value: fmtSeedlingForm(record.seedlingForm) }
   * - 种植：{ label: '成品类型', value: fmtHarvestForm(record.harvestForm) }
   * 不传则详情弹窗的追溯时间线表格不显示"类型"列
   */
  typeColumn?: TypeColumnConfig;
  /** 可选附加 Tab */
  extraTabs?: ExtraTab[];
  /**
   * 弹窗大小（2026-07-05 新增）
   * - 默认 'xl'（max-w-4xl ≈ 896px）
   * - 种源详情用 'xxxl'（max-w-6xl ≈ 1152px，+约 28%）让"使用记录" Tab 能完整展示字段
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl' | 'full';
}

export function EntityDetailModal({
  isOpen,
  onClose,
  title,
  basicInfoPanel,
  entity,
  entityId,
  entityCode,
  typeColumn,
  extraTabs = [],
  size = 'xl',
}: EntityDetailModalProps) {
  const [activeTab, setActiveTab] = useState<string>('info');

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
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
            {tab.tooltip && (
              <span className="text-gray-400 cursor-help ml-0.5" title={tab.tooltip}>ⓘ</span>
            )}
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
            typeColumn={typeColumn}
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
