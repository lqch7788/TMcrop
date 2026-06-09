/**
 * 作物生长配置可视化编辑器 — V3.0 Phase 6b
 *
 * 替代原始 JSON 编辑，提供结构化界面：
 * - 作物Tab切换（番茄/黄瓜/辣椒 + 新增）
 * - 阶段时间线 + 任务表格
 * - 虫害规则表格
 * 数据读写: useSystemConfigStore (cfg-133/134/135)
 */

import { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, Save, RotateCcw, ChevronDown, ChevronRight, AlertTriangle, Edit2, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { useSystemConfigStore } from '@/stores/useSystemConfigStore';
import { showAlert, showConfirm } from '@/lib/dialogService';
import type { CropGrowthConfig, CropStageEntry, CropTaskItem, PestAlertRule } from '@/stores/useCropGrowthConfigStore';

// ==================== 默认值 ====================

const DEFAULT_STAGES: CropStageEntry[] = [
  { stage: 'seedling', startDay: 1, endDay: 30, tasks: [] },
  { stage: 'vegetative', startDay: 31, endDay: 75, tasks: [] },
  { stage: 'flowering', startDay: 76, endDay: 105, tasks: [] },
  { stage: 'fruiting', startDay: 106, endDay: 145, tasks: [] },
  { stage: 'harvest', startDay: 146, endDay: 165, tasks: [] },
];

const DEFAULT_TASK: CropTaskItem = {
  type: '', typeName: '', frequency: 7, priority: 'medium',
  skillRequired: [], estimatedHours: 1, description: '',
};

const DEFAULT_RULE: PestAlertRule = {
  id: '', name: '', symptom: [], cropType: [],
  severity: 'medium', suggestion: '', priority: 'medium',
};

const STAGE_LABELS: Record<string, string> = {
  seedling: '幼苗期', vegetative: '营养生长期', flowering: '开花期', fruiting: '结果期', harvest: '采收期',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-gray-100 text-gray-600',
};

/** 农事任务类型 — 中文标签到英文代码的映射 */
const TASK_TYPE_OPTIONS: { code: string; label: string }[] = [
  { code: 'irrigation', label: '灌溉' },
  { code: 'fertilization', label: '施肥' },
  { code: 'spraying', label: '喷药/病虫防治' },
  { code: 'weeding', label: '除草' },
  { code: 'pruning', label: '修剪/整枝' },
  { code: 'tillage', label: '翻耕/松土' },
  { code: 'inspection', label: '巡查' },
  { code: 'harvesting', label: '采收' },
  { code: 'transplanting', label: '移栽' },
  { code: 'sowing', label: '播种' },
  { code: 'mulching', label: '覆膜' },
  { code: 'pollination', label: '授粉' },
  { code: 'training', label: '绑蔓/吊蔓' },
  { code: 'cleaning', label: '清理残株' },
  { code: 'disinfection', label: '消毒' },
  { code: 'sampling', label: '取样检测' },
  { code: 'other', label: '其他任务' },
];

// ==================== 组件 ====================

export default function CropGrowthConfigPanel() {
  const configs = useSystemConfigStore((s) => s.configs);
  const updateConfig = useSystemConfigStore((s) => s.updateConfig);
  const loadConfigs = useSystemConfigStore((s) => s.loadConfigs);

  // 从 Store 读取作物配置
  const cropConfigs = useMemo<CropGrowthConfig[]>(() => {
    const entry = configs.find(c => c.configKey === 'crop.growth.crop-configs' && c.isActive);
    if (entry?.configValue) {
      try { return JSON.parse(entry.configValue); } catch { /* fallthrough */ }
    }
    return [];
  }, [configs]);

  // 从 Store 读取虫害规则
  const pestRules = useMemo<PestAlertRule[]>(() => {
    const entry = configs.find(c => c.configKey === 'crop.pest.alert-rules' && c.isActive);
    if (entry?.configValue) {
      try { return JSON.parse(entry.configValue); } catch { /* fallthrough */ }
    }
    return [];
  }, [configs]);

  // 从 Store 读取阶段天数默认值
  const stageDays = useMemo<Record<string, number>>(() => {
    const entry = configs.find(c => c.configKey === 'crop.growth.stage-days' && c.isActive);
    if (entry?.configValue) {
      try { return JSON.parse(entry.configValue); } catch { /* fallthrough */ }
    }
    return { seedling: 30, vegetative: 45, flowering: 30, fruiting: 40, harvest: 20 };
  }, [configs]);

  // 找到 config id 用于保存
  const cropConfigId = useMemo(() => {
    const e = configs.find(c => c.configKey === 'crop.growth.crop-configs');
    return e?.id;
  }, [configs]);

  const pestConfigId = useMemo(() => {
    const e = configs.find(c => c.configKey === 'crop.pest.alert-rules');
    return e?.id;
  }, [configs]);

  const stageDaysConfigId = useMemo(() => {
    const e = configs.find(c => c.configKey === 'crop.growth.stage-days');
    return e?.id;
  }, [configs]);

  // 当前选中的作物索引
  const [activeCropIdx, setActiveCropIdx] = useState(0);
  // 编辑中的作物配置（深拷贝）
  const [editingConfigs, setEditingConfigs] = useState<CropGrowthConfig[]>([]);
  // 编辑中的虫害规则
  const [editingRules, setEditingRules] = useState<PestAlertRule[]>([]);
  // 编辑中的阶段天数
  const [editingStageDays, setEditingStageDays] = useState<Record<string, number>>({});
  // 当前面板: 'crops' | 'pests' | 'stages'
  const [activePanel, setActivePanel] = useState<'crops' | 'pests' | 'stages'>('crops');
  // 折叠的阶段
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(new Set());
  // 保存状态
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  // 编辑模式开关
  const [isEditing, setIsEditing] = useState(false);

  // 初始化编辑数据（必须在 enterEditMode/cancelEdit 之前定义）
  const initData = useCallback(() => {
    setEditingConfigs(JSON.parse(JSON.stringify(cropConfigs)));
    setEditingRules(JSON.parse(JSON.stringify(pestRules)));
    setEditingStageDays({ ...stageDays });
    setDirty(false);
  }, [cropConfigs, pestRules, stageDays]);

  // 进入编辑模式
  const enterEditMode = useCallback(() => {
    setIsEditing(true);
    initData();
  }, [initData]);

  // 取消编辑 — 恢复原始数据并退出
  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setDirty(false);
    initData();
  }, [initData]);

  // 首次加载
  if (editingConfigs.length === 0 && cropConfigs.length > 0) {
    initData();
  }

  const activeCrop = editingConfigs[activeCropIdx];

  // ========== 保存 ==========
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (cropConfigId) {
        await updateConfig(cropConfigId, {
          configValue: JSON.stringify(editingConfigs),
        });
      }
      if (pestConfigId) {
        await updateConfig(pestConfigId, {
          configValue: JSON.stringify(editingRules),
        });
      }
      if (stageDaysConfigId) {
        await updateConfig(stageDaysConfigId, {
          configValue: JSON.stringify(editingStageDays),
        });
      }
      setDirty(false);
      setIsEditing(false);
      // 触发 Store 重新加载 + CustomEvent 通知
      setTimeout(() => loadConfigs(), 500);
    } catch (err) {
      // logger.error('保存作物生长配置失败:', err);
    } finally {
      setSaving(false);
    }
  }, [cropConfigId, pestConfigId, stageDaysConfigId, editingConfigs, editingRules, editingStageDays, updateConfig, loadConfigs]);

  // ========== 作物编辑 ==========

  const updateCrop = (idx: number, field: string, value: unknown) => {
    setEditingConfigs(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
    setDirty(true);
  };

  const updateStage = (cropIdx: number, stageIdx: number, field: string, value: unknown) => {
    setEditingConfigs(prev => {
      const next = [...prev];
      const stages = [...next[cropIdx].stages];
      stages[stageIdx] = { ...stages[stageIdx], [field]: value };
      next[cropIdx] = { ...next[cropIdx], stages };
      return next;
    });
    setDirty(true);
  };

  const updateTask = (cropIdx: number, stageIdx: number, taskIdx: number, field: string, value: unknown) => {
    setEditingConfigs(prev => {
      const next = [...prev];
      const stages = [...next[cropIdx].stages];
      const tasks = [...stages[stageIdx].tasks];
      tasks[taskIdx] = { ...tasks[taskIdx], [field]: value };
      stages[stageIdx] = { ...stages[stageIdx], tasks };
      next[cropIdx] = { ...next[cropIdx], stages };
      return next;
    });
    setDirty(true);
  };

  const addTask = (cropIdx: number, stageIdx: number) => {
    setEditingConfigs(prev => {
      const next = [...prev];
      const stages = [...next[cropIdx].stages];
      stages[stageIdx] = { ...stages[stageIdx], tasks: [...stages[stageIdx].tasks, { ...DEFAULT_TASK }] };
      next[cropIdx] = { ...next[cropIdx], stages };
      return next;
    });
    setDirty(true);
  };

  const removeTask = (cropIdx: number, stageIdx: number, taskIdx: number) => {
    setEditingConfigs(prev => {
      const next = [...prev];
      const stages = [...next[cropIdx].stages];
      stages[stageIdx] = { ...stages[stageIdx], tasks: stages[stageIdx].tasks.filter((_, i) => i !== taskIdx) };
      next[cropIdx] = { ...next[cropIdx], stages };
      return next;
    });
    setDirty(true);
  };

  const addCrop = () => {
    const name = prompt('请输入新作物名称：');
    if (!name) return;
    if (editingConfigs.some(c => c.name === name)) {
      showAlert('该作物已存在');
      return;
    }
    setEditingConfigs(prev => [...prev, { name, stages: JSON.parse(JSON.stringify(DEFAULT_STAGES)) }]);
    setActiveCropIdx(editingConfigs.length);
    setDirty(true);
  };

  const removeCrop = async (idx: number) => {
    const ok = await showConfirm(`确定删除作物"${editingConfigs[idx].name}"的全部配置？`);
    if (!ok) return;
    setEditingConfigs(prev => prev.filter((_, i) => i !== idx));
    setActiveCropIdx(Math.max(0, idx - 1));
    setDirty(true);
  };

  // ========== 虫害规则编辑 ==========

  const updateRule = (idx: number, field: string, value: unknown) => {
    setEditingRules(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
    setDirty(true);
  };

  const addRule = () => {
    setEditingRules(prev => [...prev, { ...DEFAULT_RULE, id: `pest_${Date.now()}` }]);
    setDirty(true);
  };

  const removeRule = (idx: number) => {
    setEditingRules(prev => prev.filter((_, i) => i !== idx));
    setDirty(true);
  };

  // ========== 阶段天数编辑 ==========

  const updateStageDay = (stage: string, value: number) => {
    setEditingStageDays(prev => ({ ...prev, [stage]: value }));
    setDirty(true);
  };

  const toggleStage = (stage: string) => {
    setCollapsedStages(prev => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage);
      else next.add(stage);
      return next;
    });
  };

  // ========== 渲染 ==========

  if (!activeCrop && editingConfigs.length === 0 && cropConfigs.length > 0) {
    return <div className="p-8 text-center text-gray-400">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActivePanel('crops')}
            className={`px-3 py-1.5 rounded-lg text-base font-medium transition-colors ${activePanel === 'crops' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            生长配置
          </button>
          <button
            onClick={() => setActivePanel('pests')}
            className={`px-3 py-1.5 rounded-lg text-base font-medium transition-colors ${activePanel === 'pests' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            虫害规则 ({editingRules.length})
          </button>
          <button
            onClick={() => setActivePanel('stages')}
            className={`px-3 py-1.5 rounded-lg text-base font-medium transition-colors ${activePanel === 'stages' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            阶段天数
          </button>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              {dirty && <span className="text-sm text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> 有未保存的修改</span>}
              <Button size="sm" variant="secondary" onClick={initData} disabled={!dirty}>
                <RotateCcw className="w-3.5 h-3.5" />
                重置
              </Button>
              <Button size="sm" variant="secondary" onClick={cancelEdit}>
                <X className="w-3.5 h-3.5" />
                取消
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
                <Save className="w-3.5 h-3.5" />
                {saving ? '保存中...' : '保存'}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={enterEditMode}>
              <Edit2 className="w-3.5 h-3.5" />
              编辑
            </Button>
          )}
        </div>
      </div>

      {/* ========== 生长配置面板 ========== */}
      {activePanel === 'crops' && (
        <div className="bg-white rounded-lg border">
          {/* 作物Tab */}
          <div className="flex items-center border-b px-3 py-2 gap-1 overflow-x-auto">
            {editingConfigs.map((crop, idx) => (
              <div key={crop.name} className="flex items-center">
                <button
                  onClick={() => setActiveCropIdx(idx)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${idx === activeCropIdx ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-gray-100 text-gray-600'}`}
                >
                  {crop.name}
                </button>
                {isEditing && editingConfigs.length > 1 && (
                  <button onClick={() => removeCrop(idx)} className="p-0.5 text-red-400 hover:text-red-600">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {isEditing && (
            <button onClick={addCrop} className="px-2 py-1.5 rounded-lg text-sm text-emerald-600 hover:bg-emerald-50 font-medium whitespace-nowrap">
              <Plus className="w-4 h-4 inline" /> 添加作物
            </button>
            )}
          </div>

          {/* 阶段列表 */}
          <div className="divide-y">
            {activeCrop?.stages.map((stage, stageIdx) => {
              const isCollapsed = collapsedStages.has(stage.stage);
              return (
                <div key={stage.stage}>
                  {/* 阶段头部 */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={() => toggleStage(stage.stage)}>
                    {isCollapsed ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    <span className="font-medium text-gray-800 text-base">{STAGE_LABELS[stage.stage] || stage.stage}</span>
                    <span className="text-sm text-gray-400">第</span>
                    <input
                      type="number"
                      value={stage.startDay}
                      onChange={e => updateStage(activeCropIdx, stageIdx, 'startDay', Number(e.target.value))}
                      onClick={e => e.stopPropagation()}
                      className="w-20 px-2 py-1 text-sm border border-gray-400 rounded text-center"
                      min={1}
                      disabled={!isEditing}
                    />
                    <span className="text-sm text-gray-400">~</span>
                    <input
                      type="number"
                      value={stage.endDay}
                      onChange={e => updateStage(activeCropIdx, stageIdx, 'endDay', Number(e.target.value))}
                      onClick={e => e.stopPropagation()}
                      className="w-20 px-2 py-1 text-sm border border-gray-400 rounded text-center"
                      min={1}
                      disabled={!isEditing}
                    />
                    <span className="text-sm text-gray-400">天</span>
                    <span className="text-sm text-gray-400 ml-auto">{stage.tasks.length} 个任务</span>
                  </div>

                  {/* 任务表格 */}
                  {!isCollapsed && (
                    <div className="px-4 pb-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                            <th className="py-2 font-medium w-[180px]">类型</th>
                            <th className="py-2 font-medium w-[200px]">名称</th>
                            <th className="py-2 font-medium w-[140px]">频率(天)</th>
                            <th className="py-2 font-medium w-[140px]">工时(h)</th>
                            <th className="py-2 font-medium w-[140px]">优先级</th>
                            <th className="py-2 font-medium w-[240px]">技能要求</th>
                            <th className="py-2 font-medium">说明</th>
                            <th className="py-2 font-medium w-[40px]"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {stage.tasks.map((task, taskIdx) => (
                            <tr key={taskIdx} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-1.5 pr-2">
                                <select
                                  value={task.type}
                                  onChange={e => updateTask(activeCropIdx, stageIdx, taskIdx, 'type', e.target.value)}
                                  className="w-full px-1.5 py-1 border border-gray-400 rounded text-sm"
                                  disabled={!isEditing}
                                >
                                  <option value="">选择...</option>
                                  {TASK_TYPE_OPTIONS.map(opt => (
                                    <option key={opt.code} value={opt.code}>{opt.label}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-1.5 pr-2">
                                <input
                                  value={task.typeName}
                                  onChange={e => updateTask(activeCropIdx, stageIdx, taskIdx, 'typeName', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-400 rounded text-sm"
                                  placeholder="如灌溉"
                                  disabled={!isEditing}
                                />
                              </td>
                              <td className="py-1.5 pr-2">
                                <input
                                  type="number"
                                  value={task.frequency}
                                  onChange={e => updateTask(activeCropIdx, stageIdx, taskIdx, 'frequency', Number(e.target.value))}
                                  className="w-full px-2 py-1 border border-gray-400 rounded text-sm text-center"
                                  min={1}
                                  disabled={!isEditing}
                                />
                              </td>
                              <td className="py-1.5 pr-2">
                                <input
                                  type="number"
                                  value={task.estimatedHours}
                                  onChange={e => updateTask(activeCropIdx, stageIdx, taskIdx, 'estimatedHours', Number(e.target.value))}
                                  className="w-full px-2 py-1 border border-gray-400 rounded text-sm text-center"
                                  min={0.5}
                                  step={0.5}
                                  disabled={!isEditing}
                                />
                              </td>
                              <td className="py-1.5 pr-2">
                                <select
                                  value={task.priority}
                                  onChange={e => updateTask(activeCropIdx, stageIdx, taskIdx, 'priority', e.target.value)}
                                  className="w-full px-1.5 py-1 border border-gray-400 rounded text-sm"
                                  disabled={!isEditing}
                                >
                                  <option value="high">高</option>
                                  <option value="medium">中</option>
                                  <option value="low">低</option>
                                </select>
                              </td>
                              <td className="py-1.5 pr-2">
                                <input
                                  value={task.skillRequired.join(', ')}
                                  onChange={e => updateTask(activeCropIdx, stageIdx, taskIdx, 'skillRequired', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                  className="w-full px-2 py-1 border border-gray-400 rounded text-sm min-w-[210px]"
                                  placeholder="用逗号分隔"
                                  title={task.skillRequired.join(', ')}
                                  disabled={!isEditing}
                                />
                              </td>
                              <td className="py-1.5 pr-2">
                                <input
                                  value={task.description}
                                  onChange={e => updateTask(activeCropIdx, stageIdx, taskIdx, 'description', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-400 rounded text-sm"
                                  placeholder="任务说明"
                                  disabled={!isEditing}
                                />
                              </td>
                              <td className="py-1.5">
                                {isEditing && (
                                <button onClick={() => removeTask(activeCropIdx, stageIdx, taskIdx)} className="text-red-400 hover:text-red-600">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {isEditing && (
                      <button onClick={() => addTask(activeCropIdx, stageIdx)} className="mt-2 text-sm text-emerald-600 hover:text-emerald-800 font-medium">
                        <Plus className="w-3.5 h-3.5 inline" /> 添加任务
                      </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========== 虫害规则面板 ========== */}
      {activePanel === 'pests' && (
        <div className="bg-white rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <th className="py-2.5 px-3 font-medium w-[120px]">规则ID</th>
                  <th className="py-2.5 px-3 font-medium w-[140px]">名称</th>
                  <th className="py-2.5 px-3 font-medium w-[180px]">症状关键词</th>
                  <th className="py-2.5 px-3 font-medium w-[150px]">适用作物</th>
                  <th className="py-2.5 px-3 font-medium w-[90px]">严重度</th>
                  <th className="py-2.5 px-3 font-medium w-[90px]">优先级</th>
                  <th className="py-2.5 px-3 font-medium">处理建议</th>
                  <th className="py-2.5 px-3 font-medium w-[40px]"></th>
                </tr>
              </thead>
              <tbody>
                {editingRules.map((rule, idx) => (
                  <tr key={rule.id || idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-1.5 px-3">
                      <input value={rule.id} onChange={e => updateRule(idx, 'id', e.target.value)} className="w-full px-2 py-1 border border-gray-400 rounded text-sm font-mono" disabled={!isEditing} />
                    </td>
                    <td className="py-1.5 px-3">
                      <input value={rule.name} onChange={e => updateRule(idx, 'name', e.target.value)} className="w-full px-2 py-1 border border-gray-400 rounded text-sm" disabled={!isEditing} />
                    </td>
                    <td className="py-1.5 px-3">
                      <input value={rule.symptom.join(', ')} onChange={e => updateRule(idx, 'symptom', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className="w-full px-2 py-1 border border-gray-400 rounded text-sm" placeholder="逗号分隔" disabled={!isEditing} />
                    </td>
                    <td className="py-1.5 px-3">
                      <input value={rule.cropType.join(', ')} onChange={e => updateRule(idx, 'cropType', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className="w-full px-2 py-1 border border-gray-400 rounded text-sm" placeholder="逗号分隔" disabled={!isEditing} />
                    </td>
                    <td className="py-1.5 px-3">
                      <select value={rule.severity} onChange={e => updateRule(idx, 'severity', e.target.value)} className="w-full px-1.5 py-1 border border-gray-400 rounded text-sm" disabled={!isEditing}>
                        <option value="high">高</option>
                        <option value="medium">中</option>
                        <option value="low">低</option>
                      </select>
                    </td>
                    <td className="py-1.5 px-3">
                      <select value={rule.priority} onChange={e => updateRule(idx, 'priority', e.target.value)} className="w-full px-1.5 py-1 border border-gray-400 rounded text-sm" disabled={!isEditing}>
                        <option value="high">高</option>
                        <option value="medium">中</option>
                        <option value="low">低</option>
                      </select>
                    </td>
                    <td className="py-1.5 px-3">
                      <input value={rule.suggestion} onChange={e => updateRule(idx, 'suggestion', e.target.value)} className="w-full px-2 py-1 border border-gray-400 rounded text-sm" disabled={!isEditing} />
                    </td>
                    <td className="py-1.5 px-3">
                      {isEditing && (
                      <button onClick={() => removeRule(idx)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t bg-gray-50">
            {isEditing && (
            <button onClick={addRule} className="text-sm text-emerald-600 hover:text-emerald-800 font-medium">
              <Plus className="w-3.5 h-3.5 inline" /> 添加虫害规则
            </button>
            )}
          </div>
        </div>
      )}

      {/* ========== 阶段天数面板 ========== */}
      {activePanel === 'stages' && (
        <div className="bg-white rounded-lg border">
          <div className="p-6">
            <p className="text-sm text-gray-500 mb-5">
              各生长阶段的默认天数，用于预测任务时间线。各作物可在"生长配置"中覆盖。
            </p>
            <div className="grid grid-cols-5 gap-4">
              {[
                { key: 'seedling', label: '幼苗期' },
                { key: 'vegetative', label: '营养生长期' },
                { key: 'flowering', label: '开花期' },
                { key: 'fruiting', label: '结果期' },
                { key: 'harvest', label: '采收期' },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 text-center">{label}</label>
                  <div className="flex items-center gap-1.5 justify-center">
                    <input
                      type="number"
                      value={editingStageDays[key] ?? 0}
                      onChange={e => updateStageDay(key, Number(e.target.value))}
                      className="w-20 px-3 py-2 text-base border border-gray-400 rounded-lg text-center"
                      min={1}
                      disabled={!isEditing}
                    />
                    <span className="text-sm text-gray-400">天</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
