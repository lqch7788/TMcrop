/**
 * 派工模式配置组件
 * 用于切换和管理派工模式（手动/AI辅助/AI自动）
 */

import React, { useState } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Bot,
  User,
  Zap,
  Eye,
  Bell,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useDispatchModeConfig } from '../../hooks/useDispatchModeConfig';
import type { DispatchMode, DispatchModeConfig } from '../../types/dispatch';

// 模式图标映射
const ModeIcon: Record<DispatchMode, React.ReactNode> = {
  manual: <User className="w-5 h-5" />,
  ai_assisted: <Bot className="w-5 h-5" />,
  ai_auto: <Zap className="w-5 h-5" />,
};

// 模式名称映射
const ModeName: Record<DispatchMode, string> = {
  manual: '手动模式',
  ai_assisted: 'AI辅助模式',
  ai_auto: 'AI自动模式',
};

// 模式描述映射
const ModeDescription: Record<DispatchMode, string> = {
  manual: '完全由人工进行任务派发，可手动选择执行人员',
  ai_assisted: 'AI推荐最优执行人员，人工确认后派发',
  ai_auto: 'AI自动分析并派发任务，无需人工干预',
};

interface DispatchModeConfigPanelProps {
  /** 初始配置 */
  initialConfig?: Partial<DispatchModeConfig>;
  /** 配置变更回调 */
  onConfigChange?: (config: DispatchModeConfig) => void;
  /** 是否显示详细配置 */
  showDetailedConfig?: boolean;
  /** 是否为紧凑模式（用于侧边栏等小空间） */
  compact?: boolean;
}

export const DispatchModeConfigPanel: React.FC<DispatchModeConfigPanelProps> = ({
  onConfigChange,
  showDetailedConfig = true,
  compact = false,
}) => {
  const {
    config,
    mode,
    modeDisplayName,
    modeDescription,
    setMode,
    updateManualConfig,
    updateAIAssistedConfig,
    updateAIAutoConfig,
    setAllowModeSwitch,
    resetConfig,
    isMode,
    isModeEnabled,
  } = useDispatchModeConfig();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['manual']));
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

  // 处理模式切换
  const handleModeChange = (newMode: DispatchMode) => {
    if (!config.allowModeSwitch) return;
    setMode(newMode);
    setHasChanges(true);
    onConfigChange?.({ ...config, mode: newMode });
  };

  // 处理AI辅助配置更新
  const handleAIAssistedUpdate = (
    field: keyof DispatchModeConfig['ai_assisted'],
    value: boolean | number
  ) => {
    updateAIAssistedConfig({ [field]: value });
    setHasChanges(true);
  };

  // 处理AI自动配置更新
  const handleAIAutoUpdate = (
    field: keyof DispatchModeConfig['ai_auto'],
    value: boolean | number
  ) => {
    updateAIAutoConfig({ [field]: value });
    setHasChanges(true);
  };

  // 保存配置
  const handleSave = () => {
    onConfigChange?.(config);
    setHasChanges(false);
    setSaveMessage('配置已保存');
    setTimeout(() => setSaveMessage(null), 2000);
  };

  // 重置配置
  const handleReset = () => {
    resetConfig();
    setHasChanges(true);
  };

  if (compact) {
    // 紧凑模式：仅显示当前模式和切换按钮
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {ModeIcon[mode]}
            <div>
              <div className="font-medium text-gray-900 text-sm">{modeDisplayName}</div>
              <div className="text-xs text-gray-500">{modeDescription}</div>
            </div>
          </div>
          <ModeSelector
            currentMode={mode}
            onModeChange={handleModeChange}
            disabled={!config.allowModeSwitch}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* 头部 */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">派工模式配置</h3>
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
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            重置
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              hasChanges
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Save className="w-3 h-3" />
            保存配置
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
        {/* 模式切换区域 */}
        <div className="space-y-3">
          <div className="font-medium text-gray-900">当前模式</div>
          <div className="grid grid-cols-3 gap-3">
            {(['manual', 'ai_assisted', 'ai_auto'] as DispatchMode[]).map(modeKey => (
              <ModeCard
                key={modeKey}
                mode={modeKey}
                selected={isMode(modeKey)}
                enabled={isModeEnabled(modeKey)}
                onSelect={() => handleModeChange(modeKey)}
                disabled={!config.allowModeSwitch}
              />
            ))}
          </div>
          {!config.allowModeSwitch && (
            <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg text-amber-700 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>当前不允许切换模式，请联系管理员</span>
            </div>
          )}
        </div>

        {/* 允许模式切换开关 */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <div className="font-medium text-gray-900">允许模式切换</div>
            <div className="text-xs text-gray-500">允许用户在不同派工模式之间切换</div>
          </div>
          <ToggleSwitch
            checked={config.allowModeSwitch}
            onChange={setAllowModeSwitch}
          />
        </div>

        {showDetailedConfig && (
          <>
            {/* 手动模式配置 */}
            <ConfigSection
              title="手动模式"
              icon={<User className="w-4 h-4" />}
              expanded={expandedSections.has('manual')}
              onToggle={() => toggleSection('manual')}
            >
              <div className="space-y-3">
                <ToggleItem
                  label="启用手动模式"
                  description="允许手动派发任务"
                  checked={config.manual.enabled}
                  onChange={updateManualConfig}
                />
              </div>
            </ConfigSection>

            {/* AI辅助模式配置 */}
            <ConfigSection
              title="AI辅助模式"
              icon={<Bot className="w-4 h-4" />}
              expanded={expandedSections.has('ai_assisted')}
              onToggle={() => toggleSection('ai_assisted')}
            >
              <div className="space-y-3">
                <ToggleItem
                  label="启用AI辅助模式"
                  description="允许AI推荐执行人员"
                  checked={config.ai_assisted.enabled}
                  onChange={(v) => handleAIAssistedUpdate('enabled', v)}
                />
                <ToggleItem
                  label="创建时显示推荐"
                  description="创建任务时自动显示AI推荐"
                  checked={config.ai_assisted.showRecommendationOnCreate}
                  onChange={(v) => handleAIAssistedUpdate('showRecommendationOnCreate', v)}
                  disabled={!config.ai_assisted.enabled}
                />
                <ToggleItem
                  label="默认选择最优工人"
                  description="自动选择评分最高的执行人员"
                  checked={config.ai_assisted.defaultSelectTopWorker}
                  onChange={(v) => handleAIAssistedUpdate('defaultSelectTopWorker', v)}
                  disabled={!config.ai_assisted.enabled}
                />
                <ToggleItem
                  label="需要确认"
                  description="派发前需要人工确认"
                  checked={config.ai_assisted.requireConfirmation}
                  onChange={(v) => handleAIAssistedUpdate('requireConfirmation', v)}
                  disabled={!config.ai_assisted.enabled}
                />
              </div>
            </ConfigSection>

            {/* AI自动模式配置 */}
            <ConfigSection
              title="AI自动模式"
              icon={<Zap className="w-4 h-4" />}
              expanded={expandedSections.has('ai_auto')}
              onToggle={() => toggleSection('ai_auto')}
            >
              <div className="space-y-3">
                <ToggleItem
                  label="启用AI自动模式"
                  description="允许AI自动派发任务"
                  checked={config.ai_auto.enabled}
                  onChange={(v) => handleAIAutoUpdate('enabled', v)}
                />
                <ToggleItem
                  label="自动预测任务"
                  description="自动分析并预测需要派发的任务"
                  checked={config.ai_auto.autoPredictTasks}
                  onChange={(v) => handleAIAutoUpdate('autoPredictTasks', v)}
                  disabled={!config.ai_auto.enabled}
                />
                <ToggleItem
                  label="自动推荐工人"
                  description="自动为任务推荐执行人员"
                  checked={config.ai_auto.autoRecommendWorkers}
                  onChange={(v) => handleAIAutoUpdate('autoRecommendWorkers', v)}
                  disabled={!config.ai_auto.enabled}
                />
                <ToggleItem
                  label="批量确认"
                  description="派发前需要批量确认"
                  checked={config.ai_auto.requireBatchConfirmation}
                  onChange={(v) => handleAIAutoUpdate('requireBatchConfirmation', v)}
                  disabled={!config.ai_auto.enabled}
                />
                <ToggleItem
                  label="通知工人"
                  description="派发后自动通知执行人员"
                  checked={config.ai_auto.notifyWorkers}
                  onChange={(v) => handleAIAutoUpdate('notifyWorkers', v)}
                  disabled={!config.ai_auto.enabled}
                />
                <ThresholdItem
                  label="置信度阈值"
                  description="只有评分超过此阈值才会自动派发"
                  value={config.ai_auto.confidenceThreshold}
                  min={50}
                  max={100}
                  suffix="%"
                  onChange={(v) => handleAIAutoUpdate('confidenceThreshold', v)}
                  disabled={!config.ai_auto.enabled}
                />
              </div>
            </ConfigSection>
          </>
        )}
      </div>
    </div>
  );
};

// 模式选择器（紧凑下拉）
interface ModeSelectorProps {
  currentMode: DispatchMode;
  onModeChange: (mode: DispatchMode) => void;
  disabled?: boolean;
}

function ModeSelector({ currentMode, onModeChange, disabled }: ModeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
          disabled
            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-white border-gray-400 hover:bg-gray-50'
        }`}
      >
        {ModeIcon[currentMode]}
        <span className="text-sm font-medium">{ModeName[currentMode]}</span>
        <ChevronDown className="w-4 h-4" />
      </button>
      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg border border-gray-200 shadow-lg z-20">
            {(['manual', 'ai_assisted', 'ai_auto'] as DispatchMode[]).map(modeKey => (
              <button
                key={modeKey}
                onClick={() => {
                  onModeChange(modeKey);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                  currentMode === modeKey ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700'
                }`}
              >
                {ModeIcon[modeKey]}
                <span>{ModeName[modeKey]}</span>
                {currentMode === modeKey && <Check className="w-4 h-4 ml-auto" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// 模式卡片
interface ModeCardProps {
  mode: DispatchMode;
  selected: boolean;
  enabled: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

function ModeCard({ mode, selected, enabled, onSelect, disabled }: ModeCardProps) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled || !enabled}
      className={`p-3 rounded-lg border-2 text-left transition-all ${
        selected
          ? 'border-emerald-500 bg-emerald-50'
          : enabled
          ? 'border-gray-200 bg-white hover:border-gray-400'
          : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={selected ? 'text-emerald-600' : 'text-gray-600'}>{ModeIcon[mode]}</span>
        {selected && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
      </div>
      <div className={`font-medium ${selected ? 'text-emerald-700' : 'text-gray-900'}`}>
        {ModeName[mode]}
      </div>
      <div className="text-xs text-gray-500 mt-1 line-clamp-2">
        {ModeDescription[mode]}
      </div>
      {!enabled && (
        <div className="text-xs text-red-500 mt-1">未启用</div>
      )}
    </button>
  );
}

// 配置区块组件
interface ConfigSectionProps {
  title: string;
  icon?: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function ConfigSection({ title, icon, expanded, onToggle, children }: ConfigSectionProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-gray-600">{icon}</span>}
          <span className="font-medium text-gray-900">{title}</span>
        </div>
        {expanded ? (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-500" />
        )}
      </button>
      {expanded && <div className="p-4 bg-white space-y-3">{children}</div>}
    </div>
  );
}

// 开关项组件
interface ToggleItemProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

function ToggleItem({ label, description, checked, onChange, disabled }: ToggleItemProps) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${
      disabled ? 'bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'
    }`}>
      <div className="flex-1">
        <div className={`font-medium ${disabled ? 'text-gray-400' : 'text-gray-900'}`}>
          {label}
        </div>
        {description && (
          <div className={`text-xs ${disabled ? 'text-gray-300' : 'text-gray-500'}`}>
            {description}
          </div>
        )}
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

// 开关组件
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

function ToggleSwitch({ checked, onChange, disabled }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${checked ? 'bg-emerald-500' : 'bg-gray-300'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// 阈值项组件
interface ThresholdItemProps {
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function ThresholdItem({ label, description, value, min, max, suffix, onChange, disabled }: ThresholdItemProps) {
  return (
    <div className={`p-3 rounded-lg ${disabled ? 'bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`font-medium ${disabled ? 'text-gray-400' : 'text-gray-900'}`}>
          {label}
        </span>
        <span className={`font-bold ${disabled ? 'text-gray-400' : 'text-emerald-600'}`}>
          {value}{suffix}
        </span>
      </div>
      {description && (
        <div className={`text-xs mb-2 ${disabled ? 'text-gray-300' : 'text-gray-500'}`}>
          {description}
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        disabled={disabled}
        className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-emerald-500 ${
          disabled ? 'opacity-50' : ''
        }`}
      />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{min}{suffix}</span>
        <span>{max}{suffix}</span>
      </div>
    </div>
  );
}

export default DispatchModeConfigPanel;
