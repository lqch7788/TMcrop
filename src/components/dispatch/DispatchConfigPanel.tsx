/**
 * 派工配置管理面板组件
 * 用于配置权重、阈值、动态调整规则
 */

import React, { useState } from 'react';
import { Settings, Save, RotateCcw, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui';
import type { DispatchConfig, DispatchWeights, DynamicWeightAdjustment } from '../../types/dispatch';

// 默认配置
const DEFAULT_CONFIG: DispatchConfig = {
  weights: {
    skillMatch: 0.30,
    location: 0.20,
    currentLoad: 0.20,
    historicalPerformance: 0.15,
    urgency: 0.10,
    batchFamiliarity: 0.03,
    growthStageMatch: 0.02,
  },
  thresholds: {
    confidenceHigh: 80,
    confidenceMedium: 60,
    maxTasksPerWorker: 2,
    overdueDays: 2,
  },
  dynamicAdjustments: {
    urgentTask: { performance: 0.25, load: 0.15 },
    largeArea: { skillMatch: 0.45, load: 0.15 },
    pestControl: { skillMatch: 0.50, load: 0.15 },
  },
};

interface DispatchConfigPanelProps {
  initialConfig?: DispatchConfig;
  onSave?: (config: DispatchConfig) => void;
}

export const DispatchConfigPanel: React.FC<DispatchConfigPanelProps> = ({
  initialConfig,
  onSave,
}) => {
  const [config, setConfig] = useState<DispatchConfig>(initialConfig || DEFAULT_CONFIG);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['weights']));
  const [hasChanges, setHasChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // 切换展开状态
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // 更新权重配置
  const updateWeight = (key: keyof DispatchWeights, value: number) => {
    setConfig(prev => ({
      ...prev,
      weights: { ...prev.weights, [key]: value },
    }));
    setHasChanges(true);
  };

  // 更新阈值配置
  const updateThreshold = (key: keyof DispatchConfig['thresholds'], value: number) => {
    setConfig(prev => ({
      ...prev,
      thresholds: { ...prev.thresholds, [key]: value },
    }));
    setHasChanges(true);
  };

  // 更新动态调整配置
  const updateDynamicAdjustment = (
    type: 'urgentTask' | 'largeArea' | 'pestControl',
    field: keyof DynamicWeightAdjustment,
    value: number
  ) => {
    setConfig(prev => ({
      ...prev,
      dynamicAdjustments: {
        ...prev.dynamicAdjustments,
        [type]: { ...prev.dynamicAdjustments[type], [field]: value },
      },
    }));
    setHasChanges(true);
  };

  // 重置配置
  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    setHasChanges(true);
  };

  // 保存配置
  const handleSave = () => {
    if (onSave) {
      onSave(config);
    }
    setHasChanges(false);
    setSaveMessage('配置已保存');
    setTimeout(() => setSaveMessage(null), 2000);
  };

  // 权重标签映射
  const weightLabels: Record<keyof DispatchWeights, { label: string; desc: string }> = {
    skillMatch: { label: '技能匹配度', desc: '任务所需技能与员工技能的匹配程度' },
    location: { label: '地理位置', desc: '员工位置与任务工作区的距离' },
    currentLoad: { label: '当前负荷', desc: '员工当前任务负荷情况' },
    historicalPerformance: { label: '历史表现', desc: '员工历史任务完成情况' },
    urgency: { label: '紧急程度', desc: '根据任务优先级计算' },
    batchFamiliarity: { label: '批次熟悉度', desc: '员工对该批次的熟悉程度' },
    growthStageMatch: { label: '生长周期适配', desc: '员工对作物生长阶段的了解' },
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* 头部 */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">派工配置中心</h3>
          {hasChanges && (
            <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
              有未保存的更改
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saveMessage && (
            <span className="flex items-center gap-1 text-green-600 text-sm">
              <Check className="w-4 h-4" />
              {saveMessage}
            </span>
          )}
          <Button variant="warning" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
            重置
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges}>
            <Save className="w-4 h-4" />
            保存配置
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
        {/* 权重配置 */}
        <ConfigSection
          title="因素权重配置"
          subtitle="调整各因素在派工决策中的占比"
          expanded={expandedSections.has('weights')}
          onToggle={() => toggleSection('weights')}
        >
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(weightLabels) as Array<keyof DispatchWeights>).map(key => (
              <div key={key} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{weightLabels[key].label}</span>
                  <span className="text-lg font-bold text-emerald-600">
                    {Math.round(config.weights[key] * 100)}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-2">{weightLabels[key].desc}</p>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(config.weights[key] * 100)}
                  onChange={e => updateWeight(key, parseInt(e.target.value) / 100)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            ))}
          </div>
          {/* 权重之和 */}
          <div className="mt-3 p-2 bg-blue-50 rounded-lg flex items-center justify-between">
            <span className="text-sm text-blue-700">权重之和</span>
            <span className={`font-bold ${Math.abs(1 - Object.values(config.weights).reduce((a, b) => a + b, 0)) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.round(Object.values(config.weights).reduce((a, b) => a + b, 0) * 100)}%
              {Math.abs(1 - Object.values(config.weights).reduce((a, b) => a + b, 0)) < 0.01 ? ' ✓' : ' (应为100%)'}
            </span>
          </div>
        </ConfigSection>

        {/* 阈值配置 */}
        <ConfigSection
          title="阈值配置"
          subtitle="置信度和任务数量限制"
          expanded={expandedSections.has('thresholds')}
          onToggle={() => toggleSection('thresholds')}
        >
          <div className="space-y-3">
            <ThresholdItem
              label="高置信度阈值"
              desc="评分 >= 此值时显示高置信度"
              value={config.thresholds.confidenceHigh}
              min={50}
              max={100}
              suffix="分"
              onChange={v => updateThreshold('confidenceHigh', v)}
            />
            <ThresholdItem
              label="中置信度阈值"
              desc="评分 >= 此值时显示中置信度"
              value={config.thresholds.confidenceMedium}
              min={30}
              max={80}
              suffix="分"
              onChange={v => updateThreshold('confidenceMedium', v)}
            />
            <ThresholdItem
              label="每人最大任务数"
              desc="员工同时进行的最大任务数"
              value={config.thresholds.maxTasksPerWorker}
              min={1}
              max={10}
              suffix="个"
              onChange={v => updateThreshold('maxTasksPerWorker', v)}
            />
            <ThresholdItem
              label="超期天数阈值"
              desc="超过此天数视为超期任务"
              value={config.thresholds.overdueDays}
              min={1}
              max={7}
              suffix="天"
              onChange={v => updateThreshold('overdueDays', v)}
            />
          </div>
        </ConfigSection>

        {/* 动态调整配置 */}
        <ConfigSection
          title="动态权重调整"
          subtitle="特殊任务场景下的权重调整规则"
          expanded={expandedSections.has('dynamic')}
          onToggle={() => toggleSection('dynamic')}
        >
          <div className="space-y-4">
            <DynamicAdjustmentItem
              title="紧急任务"
              desc="优先级为紧急的任务"
              color="red"
              config={config.dynamicAdjustments.urgentTask}
              onUpdate={(field, value) => updateDynamicAdjustment('urgentTask', field, value)}
            />
            <DynamicAdjustmentItem
              title="大面积任务"
              desc="预计工时超过8小时的任务"
              color="blue"
              config={config.dynamicAdjustments.largeArea}
              onUpdate={(field, value) => updateDynamicAdjustment('largeArea', field, value)}
            />
            <DynamicAdjustmentItem
              title="病虫害任务"
              desc="病虫防治相关任务"
              color="orange"
              config={config.dynamicAdjustments.pestControl}
              onUpdate={(field, value) => updateDynamicAdjustment('pestControl', field, value)}
            />
          </div>
        </ConfigSection>
      </div>
    </div>
  );
};

// 配置区块组件
interface ConfigSectionProps {
  title: string;
  subtitle: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function ConfigSection({ title, subtitle, expanded, onToggle, children }: ConfigSectionProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="text-left">
          <div className="font-medium text-gray-900">{title}</div>
          <div className="text-xs text-gray-500">{subtitle}</div>
        </div>
        {expanded ? (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-500" />
        )}
      </button>
      {expanded && <div className="p-4 bg-white">{children}</div>}
    </div>
  );
}

// 阈值项组件
interface ThresholdItemProps {
  label: string;
  desc: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
}

function ThresholdItem({ label, desc, value, min, max, suffix, onChange }: ThresholdItemProps) {
  return (
    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <div className="font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-500">{desc}</div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={e => onChange(parseInt(e.target.value) || min)}
          className="w-16 px-2 py-1 border border-gray-400 rounded text-center font-medium"
        />
        <span className="text-sm text-gray-500 w-8">{suffix}</span>
      </div>
    </div>
  );
}

// 动态调整项组件
interface DynamicAdjustmentItemProps {
  title: string;
  desc: string;
  color: 'red' | 'blue' | 'orange';
  config: DynamicWeightAdjustment;
  onUpdate: (field: keyof DynamicWeightAdjustment, value: number) => void;
}

function DynamicAdjustmentItem({ title, desc, color, config, onUpdate }: DynamicAdjustmentItemProps) {
  const colorClasses = {
    red: 'bg-red-50 border-red-200',
    blue: 'bg-blue-50 border-blue-200',
    orange: 'bg-orange-50 border-orange-200',
  };

  const badgeClasses = {
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    orange: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${badgeClasses[color]}`}>
          {title}
        </span>
        <span className="text-xs text-gray-500">{desc}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {config.performance !== undefined && (
          <div>
            <div className="text-xs text-gray-600 mb-1">表现权重</div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(config.performance * 100)}
                onChange={e => onUpdate('performance', parseInt(e.target.value) / 100)}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm font-medium w-10 text-right">
                {Math.round(config.performance * 100)}%
              </span>
            </div>
          </div>
        )}
        {config.skillMatch !== undefined && (
          <div>
            <div className="text-xs text-gray-600 mb-1">技能权重</div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(config.skillMatch * 100)}
                onChange={e => onUpdate('skillMatch', parseInt(e.target.value) / 100)}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm font-medium w-10 text-right">
                {Math.round(config.skillMatch * 100)}%
              </span>
            </div>
          </div>
        )}
        {config.load !== undefined && (
          <div>
            <div className="text-xs text-gray-600 mb-1">负荷权重</div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(config.load * 100)}
                onChange={e => onUpdate('load', parseInt(e.target.value) / 100)}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm font-medium w-10 text-right">
                {Math.round(config.load * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DispatchConfigPanel;
