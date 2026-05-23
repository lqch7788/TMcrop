/**
 * 系统参数配置页面 — V2.1 架构标准
 * 功能：系统配置的增删改查、分类筛选、折叠树状表格、导出
 * 数据流：组件 → useSystemConfigStore → enhancedApiClient → 后端 API
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Settings, Plus, Edit, Trash2, Save, X, ArrowLeft, Loader2,
  AlertTriangle, Download, Eye, CheckCircle, UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { useSystemConfigStore } from '../stores';
import type { SystemConfig } from '../stores';
import CropGrowthConfigPanel from '../components/farm/crop-growth/CropGrowthConfigPanel';
import { showAlert, showConfirm } from '../lib/dialogService';

// ==================== TAB 分类配置 ====================
const CATEGORY_TABS = [
  { value: 'system', label: '系统设置' },
  { value: 'ui', label: '界面设置' },
  { value: 'feature', label: '功能设置' },
  { value: 'demo', label: '演示设置' },
  { value: 'task', label: '农事任务' },
  { value: 'approval', label: '审批流程' },
  { value: 'business', label: '业务参数' },
  { value: 'crop', label: '生长引擎' },
] as const;

// 弹窗最小尺寸
const MODAL_MIN_WIDTH = 480;
const MODAL_MIN_HEIGHT = 360;

// ==================== 辅助函数 ====================

/** 类型标签徽章 */
function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    string: { bg: 'bg-blue-100', text: 'text-blue-700', label: '文本' },
    number: { bg: 'bg-green-100', text: 'text-green-700', label: '数字' },
    boolean: { bg: 'bg-purple-100', text: 'text-purple-700', label: '布尔' },
    json: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'JSON' },
  };
  const s = map[type] || map.string;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

/** 分类标签徽章 */
function CategoryBadge({ category }: { category: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    system: { bg: 'bg-slate-100', text: 'text-slate-700', label: '系统设置' },
    ui: { bg: 'bg-sky-100', text: 'text-sky-700', label: '界面设置' },
    feature: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: '功能设置' },
    demo: { bg: 'bg-amber-100', text: 'text-amber-700', label: '演示设置' },
    task: { bg: 'bg-orange-100', text: 'text-orange-700', label: '农事任务' },
    approval: { bg: 'bg-violet-100', text: 'text-violet-700', label: '审批流程' },
    business: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '业务参数' },
    crop: { bg: 'bg-teal-100', text: 'text-teal-700', label: '生长引擎' },
  };
  const s = map[category];
  if (!s) return null;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

export default function SystemConfig() {
  // ========== 1. 从 Store 获取数据和方法 ==========
  const configs = useSystemConfigStore((s) => s.configs);
  const loading = useSystemConfigStore((s) => s.loading);
  const error = useSystemConfigStore((s) => s.error);
  const loadConfigs = useSystemConfigStore((s) => s.loadConfigs);
  const addConfig = useSystemConfigStore((s) => s.addConfig);
  const updateConfig = useSystemConfigStore((s) => s.updateConfig);
  const removeConfig = useSystemConfigStore((s) => s.removeConfig);

  // ========== 2. 组件挂载时加载数据 ==========
  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  // ========== 3. 本地 UI 状态 ==========
  const [activeCategory, setActiveCategory] = useState<string>('system');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const PAGE_SIZE = 10;

  // 新增弹窗
  const [showAddModal, setShowAddModal] = useState(false);
  const [newConfig, setNewConfig] = useState<Partial<SystemConfig>>({});

  // 弹窗拖拽/缩放/最大化
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, left: 0, top: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDir, setResizeDir] = useState('');
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0, left: 0, top: 0 });

  // ========== 4. 筛选 + 分组 ==========
  const filteredConfigs = useMemo(() => {
    return configs.filter((c) => c.category === activeCategory);
  }, [configs, activeCategory]);

  // 按分类分组
  const groupedConfigs = useMemo(() => {
    const tabOrder = CATEGORY_TABS.map(t => t.value);
    const groups: { category: string; items: SystemConfig[] }[] = [];
    for (const cat of tabOrder) {
      const items = filteredConfigs.filter(c => c.category === cat);
      if (items.length > 0) {
        groups.push({ category: cat, items });
      }
    }
    return groups;
  }, [filteredConfigs]);

  // ========== 5. CRUD 操作回调 ==========

  const handleStartEdit = useCallback((config: SystemConfig) => {
    setEditingId(config.id);
    setEditValue(config.configValue);
  }, []);

  const handleSaveEdit = useCallback(async (id: string) => {
    try {
      await updateConfig(id, { configValue: editValue });
      setEditingId(null);
      setEditValue('');
    } catch (err) {
      console.error('更新配置失败:', err);
      showAlert('更新配置失败');
    }
  }, [updateConfig, editValue]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditValue('');
  }, []);

  const handleDeleteConfig = useCallback(async (id: string) => {
    const ok = await showConfirm('确定要删除这个配置项吗？');
    if (!ok) return;
    try {
      await removeConfig(id);
    } catch (err) {
      console.error('删除配置失败:', err);
      showAlert('删除配置失败');
    }
  }, [removeConfig]);

  const handleAddConfig = useCallback(async () => {
    if (!newConfig.configKey) {
      showAlert('请填写配置键');
      return;
    }
    try {
      const result = await addConfig({
        configKey: newConfig.configKey,
        configValue: newConfig.configValue || '',
        configType: newConfig.configType || 'string',
        category: newConfig.category || 'system',
        description: newConfig.description || '',
      });
      if (result) {
        setNewConfig({});
        setShowAddModal(false);
      }
    } catch (err) {
      console.error('创建配置失败:', err);
      showAlert('创建配置失败');
    }
  }, [newConfig, addConfig]);

  const openAddModal = useCallback(() => {
    setNewConfig({});
    setIsMaximized(false);
    setShowAddModal(true);
  }, []);

  // ========== 6. 导出 CSV ==========

  const handleExport = useCallback(() => {
    const csv = ['配置键,配置值,类型,分类,描述,状态']
      .concat(configs.map((c) =>
        `${c.configKey},"${c.configValue}",${c.configType},${c.category},"${c.description}",${c.isActive ? '启用' : '禁用'}`
      ))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `系统配置_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [configs]);

  // ========== 7. 弹窗拖拽/缩放事件 ==========

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (isMaximized) return;
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    setIsDragging(true);
    const dialog = document.getElementById('config-add-dialog');
    if (dialog) {
      const rect = dialog.getBoundingClientRect();
      setDragStart({ x: e.clientX, y: e.clientY, left: rect.left, top: rect.top });
    }
  }, [isMaximized]);

  const handleResizeStart = useCallback((e: React.MouseEvent, dir: string) => {
    if (isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDir(dir);
    const dialog = document.getElementById('config-add-dialog');
    if (dialog) {
      const rect = dialog.getBoundingClientRect();
      setResizeStart({ x: e.clientX, y: e.clientY, w: rect.width, h: rect.height, left: rect.left, top: rect.top });
    }
  }, [isMaximized]);

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        const dialog = document.getElementById('config-add-dialog');
        if (dialog) {
          dialog.style.position = 'fixed';
          dialog.style.left = `${dragStart.left + deltaX}px`;
          dialog.style.top = `${dragStart.top + deltaY}px`;
          dialog.style.margin = '0';
        }
      }
      if (isResizing) {
        const dx = e.clientX - resizeStart.x;
        const dy = e.clientY - resizeStart.y;
        let newW = resizeStart.w;
        let newH = resizeStart.h;
        let newLeft = resizeStart.left;
        let newTop = resizeStart.top;
        if (resizeDir.includes('e')) newW = Math.max(MODAL_MIN_WIDTH, resizeStart.w + dx);
        if (resizeDir.includes('s')) newH = Math.max(MODAL_MIN_HEIGHT, resizeStart.h + dy);
        if (resizeDir.includes('w')) {
          newW = Math.max(MODAL_MIN_WIDTH, resizeStart.w - dx);
          newLeft = resizeStart.left + (resizeStart.w - newW);
        }
        if (resizeDir.includes('n')) {
          newH = Math.max(MODAL_MIN_HEIGHT, resizeStart.h - dy);
          newTop = resizeStart.top + (resizeStart.h - newH);
        }
        const dialog = document.getElementById('config-add-dialog');
        if (dialog) {
          dialog.style.position = 'fixed';
          dialog.style.width = `${newW}px`;
          dialog.style.height = `${newH}px`;
          dialog.style.maxWidth = 'none';
          dialog.style.maxHeight = 'none';
          dialog.style.left = `${newLeft}px`;
          dialog.style.top = `${newTop}px`;
          dialog.style.margin = '0';
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDir('');
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, resizeDir]);

  const toggleMaximize = useCallback(() => {
    const dialog = document.getElementById('config-add-dialog');
    if (!isMaximized && dialog) {
      dialog.style.width = '100vw';
      dialog.style.height = '100vh';
      dialog.style.maxWidth = 'none';
      dialog.style.maxHeight = 'none';
      dialog.style.borderRadius = '0';
      dialog.style.left = '0';
      dialog.style.top = '0';
    } else if (dialog) {
      dialog.style.width = '';
      dialog.style.height = '';
      dialog.style.maxWidth = '';
      dialog.style.maxHeight = '';
      dialog.style.borderRadius = '';
      dialog.style.left = '';
      dialog.style.top = '';
    }
    setIsMaximized((v) => !v);
  }, [isMaximized]);

  // ========== 8. 渲染 ==========

  /** 渲染单个配置行（全部/单个TAB共用） */
  const singleConfigRow = (config: SystemConfig, indented = false) => (
    <div key={config.id} className={`px-4 py-3 hover:bg-blue-100 transition-colors ${indented ? 'pl-14' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 text-sm truncate">
              {config.description || config.configKey}
            </span>
            <TypeBadge type={config.configType} />
            {activeCategory === 'all' && <CategoryBadge category={config.category} />}
          </div>
          <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">{config.configKey}</p>
        </div>
        <div className="flex items-center gap-4 ml-4 min-w-0">
          <div className="flex-1 min-w-0">
            {renderValue(config)}
          </div>
          <div className="flex items-center gap-1">
            {editingId === config.id ? (
              <>
                <button onClick={() => handleSaveEdit(config.id)} className="p-1 text-green-600 hover:text-green-800" title="保存">
                  <Save className="w-4 h-4" />
                </button>
                <button onClick={handleCancelEdit} className="p-1 text-gray-600 hover:text-gray-800" title="取消">
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => handleStartEdit(config)} className="p-1 text-blue-500 hover:text-blue-700" title="编辑">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeleteConfig(config.id)} className="p-1 text-red-500 hover:text-red-700" title="删除">
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  /** 渲染单个配置行的值区域 */
  const renderValue = (config: SystemConfig) => {
    if (editingId === config.id) {
      if (config.configType === 'boolean') {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="true">是</option>
            <option value="false">否</option>
          </select>
        );
      }
      // ★ 委托规则列表（JSON）专用表格编辑界面
      if (config.configType === 'json' && config.configKey === 'approval.delegation.rules') {
        return <DelegationRulesEditor config={config} editValue={editValue} setEditValue={setEditValue} />;
      }
      // ★ 其他JSON类型用 textarea 编辑（大文本）
      if (config.configType === 'json') {
        return (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={6}
            className="w-full min-w-[300px] px-3 py-1.5 text-xs font-mono border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        );
      }
      return (
        <input
          type={config.configType === 'number' ? 'number' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      );
    }

    if (config.configType === 'boolean') {
      return (
        <span className={`text-sm font-medium ${config.configValue === 'true' ? 'text-green-600' : 'text-gray-500'}`}>
          {config.configValue === 'true' ? '是' : '否'}
        </span>
      );
    }

    // ★ JSON类型：截断预览 + 点击展开
    if (config.configType === 'json') {
      // 委托规则列表特殊处理：显示为表格预览
      if (config.configKey === 'approval.delegation.rules') {
        return <DelegationRulesPreview config={config} onEdit={() => {
          setEditValue(config.configValue);
          setEditingId(config.id);
        }} />;
      }
      const maxLen = 150;
      const preview = config.configValue.length > maxLen
        ? config.configValue.substring(0, maxLen) + '…'
        : config.configValue;
      return (
        <code
          className="text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded max-w-[350px] truncate block cursor-pointer hover:bg-blue-50 hover:text-blue-700 border border-gray-200"
          title="点击展开查看/编辑完整JSON"
          onClick={() => {
            setEditValue(config.configValue);
            setEditingId(config.id);
          }}
        >
          {preview}
        </code>
      );
    }

    return <span className="text-sm text-gray-900">{config.configValue}</span>;
  };

  // 加载态
  if (loading && configs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    );
  }

  // 错误态
  if (error && configs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <AlertTriangle className="w-8 h-8 text-red-500" />
        <span className="ml-2 text-red-600">{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <a
            href="/settings"
            className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center hover:from-gray-200 hover:to-gray-300 transition-colors"
            title="返回系统设置"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </a>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">系统参数配置</h1>
            <p className="text-gray-500">管理系统运行参数、阈值、开关等配置项</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleExport} disabled={configs.length === 0}>
            <Download className="w-4 h-4" />
            导出
          </Button>
          <Button size="sm" onClick={openAddModal}>
            <Plus className="w-4 h-4" />
            新增配置
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
        {CATEGORY_TABS.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`px-4 py-2 rounded-t-lg text-base font-bold transition-colors whitespace-nowrap ${
              activeCategory === cat.value
                ? 'bg-green-600 text-white'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 配置内容 */}
      {activeCategory === 'crop' ? (
        /* ===== 生长引擎 TAB：可视化编辑器 ===== */
        <CropGrowthConfigPanel />
      ) : groupedConfigs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center max-w-2xl">
          <Settings className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            "{CATEGORY_TABS.find(t => t.value === activeCategory)?.label}"分类下暂无配置
          </p>
        </div>
      ) : (
        /* ===== 单个分类 TAB：平铺列表 + 滑块滚动 ===== */
        <div className="bg-white rounded-lg shadow max-w-4xl">
          <div className="divide-y divide-gray-300 max-h-[520px] overflow-y-auto">
            {groupedConfigs[0].items.map((config) => singleConfigRow(config))}
          </div>
          {groupedConfigs[0].items.length > PAGE_SIZE && (
            <div className="px-4 py-2 text-center text-xs text-gray-400 border-t border-gray-100 bg-gray-50 rounded-b-lg">
              共 {groupedConfigs[0].items.length} 条，滚动查看更多
            </div>
          )}
        </div>
      )}

      {/* 新增配置弹窗 — 可拖拽/缩放/最大化 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            id="config-add-dialog"
            className="bg-white rounded-xl w-full max-w-xl shadow-xl flex flex-col relative"
          >
            {/* 标题栏 — 渐变绿 + 可拖动 */}
            <div
              className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-500 to-emerald-600 flex-shrink-0 rounded-t-xl cursor-move select-none"
              onMouseDown={handleDragStart}
            >
              <h3 className="text-lg font-semibold text-white">新增系统配置</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleMaximize}
                  className="text-white hover:bg-white/20 p-1.5 rounded transition-colors"
                  title={isMaximized ? '还原' : '最大化'}
                >
                  {isMaximized ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v2m0 4v2a2 2 0 002 2h2m8 0h2a2 2 0 002-2v-2m0-4V6a2 2 0 00-2-2h-2" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => { setShowAddModal(false); setNewConfig({}); }}
                  className="text-white hover:bg-white/20 p-1.5 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 表单内容 */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">配置键 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newConfig.configKey || ''}
                    onChange={(e) => setNewConfig({ ...newConfig, configKey: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="如：task_accept_warning_hours"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">配置值 <span className="text-red-500">*</span></label>
                  {newConfig.configType === 'json' ? (
                    <textarea
                      value={newConfig.configValue || ''}
                      onChange={(e) => setNewConfig({ ...newConfig, configValue: e.target.value })}
                      rows={5}
                      className="w-full px-3 py-2 text-xs font-mono border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder='JSON格式，如：{"key": "value"}'
                    />
                  ) : (
                    <input
                      type="text"
                      value={newConfig.configValue || ''}
                      onChange={(e) => setNewConfig({ ...newConfig, configValue: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="配置值"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                  <select
                    value={newConfig.configType || 'string'}
                    onChange={(e) => setNewConfig({ ...newConfig, configType: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="string">文本</option>
                    <option value="number">数字</option>
                    <option value="boolean">布尔</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                  <select
                    value={newConfig.category || 'system'}
                    onChange={(e) => setNewConfig({ ...newConfig, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {CATEGORY_TABS.filter(t => t.value !== 'all').map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">描述说明</label>
                <textarea
                  value={newConfig.description || ''}
                  onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="参数用途说明"
                />
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <Button size="sm" variant="secondary" onClick={() => { setShowAddModal(false); setNewConfig({}); }}>
                取消
              </Button>
              <Button size="sm" onClick={handleAddConfig}>
                添加
              </Button>
            </div>

            {/* 缩放拖拽手柄（最大化时隐藏） */}
            {!isMaximized && (
              <>
                <div className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize hover:bg-emerald-400/40 rounded-sm z-10" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
                <div className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize hover:bg-emerald-400/40 rounded-sm z-10" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
                <div className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize hover:bg-emerald-400/40 rounded-sm z-10" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
                <div className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize hover:bg-emerald-400/40 rounded-sm z-10" onMouseDown={(e) => handleResizeStart(e, 'se')} />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1.5 cursor-n-resize hover:bg-emerald-400/40 rounded z-10" onMouseDown={(e) => handleResizeStart(e, 'n')} />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1.5 cursor-s-resize hover:bg-emerald-400/40 rounded z-10" onMouseDown={(e) => handleResizeStart(e, 's')} />
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 cursor-w-resize hover:bg-emerald-400/40 rounded z-10" onMouseDown={(e) => handleResizeStart(e, 'w')} />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-12 cursor-e-resize hover:bg-emerald-400/40 rounded z-10" onMouseDown={(e) => handleResizeStart(e, 'e')} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 委托规则列表（JSON）专用组件 ====================

/** 委托规则数据结构 */
interface DelegationRule {
  fromRole: string;
  toRole: string;
  enabled: boolean;
  remark: string;
}

/** 角色选项 */
const ROLE_OPTIONS = [
  { value: 'manager', label: '经理' },
  { value: 'department_head', label: '部门主管' },
  { value: 'director', label: '总监' },
  { value: 'hr', label: '人事专员' },
  { value: 'hr_manager', label: '人事经理' },
  { value: 'finance', label: '财务' },
  { value: 'admin', label: '系统管理员' },
];

/** 委托规则预览组件（非编辑状态） */
function DelegationRulesPreview({ config, onEdit }: { config: SystemConfig; onEdit: () => void }) {
  let rules: DelegationRule[] = [];
  try {
    rules = JSON.parse(config.configValue || '[]');
  } catch { rules = []; }

  if (rules.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">暂无规则</span>
        <button onClick={onEdit} className="text-xs text-emerald-600 hover:text-emerald-800 underline">
          点击添加
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {/* 表格形式预览 */}
      <div className="bg-gray-50 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium text-gray-600">状态</th>
              <th className="px-2 py-1.5 text-left font-medium text-gray-600">委托角色</th>
              <th className="px-2 py-1.5 text-left font-medium text-gray-600">接收角色</th>
              <th className="px-2 py-1.5 text-left font-medium text-gray-600">说明</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rules.slice(0, 3).map((rule, idx) => (
              <tr key={idx} className={!rule.enabled ? 'opacity-50' : ''}>
                <td className="px-2 py-1.5">
                  {rule.enabled ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <span className="w-3.5 h-3.5 inline-block text-gray-300">○</span>
                  )}
                </td>
                <td className="px-2 py-1.5 text-gray-700">
                  {ROLE_OPTIONS.find(r => r.value === rule.fromRole)?.label || rule.fromRole}
                </td>
                <td className="px-2 py-1.5 text-gray-700">
                  {ROLE_OPTIONS.find(r => r.value === rule.toRole)?.label || rule.toRole}
                </td>
                <td className="px-2 py-1.5 text-gray-500 truncate max-w-[200px]">{rule.remark}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rules.length > 3 && (
        <p className="text-xs text-gray-400">...还有 {rules.length - 3} 条规则</p>
      )}
      <button
        onClick={onEdit}
        className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 mt-1"
      >
        <Edit className="w-3 h-3" />
        编辑规则
      </button>
    </div>
  );
}

/** 委托规则编辑器组件（编辑状态） */
function DelegationRulesEditor({
  config,
  editValue,
  setEditValue,
}: {
  config: SystemConfig;
  editValue: string;
  setEditValue: (val: string) => void;
}) {
  let rules: DelegationRule[] = [];
  try {
    rules = JSON.parse(editValue || '[]');
  } catch { rules = []; }

  const updateRule = (index: number, updates: Partial<DelegationRule>) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates };
    setEditValue(JSON.stringify(newRules, null, 2));
  };

  const addRule = () => {
    const newRule: DelegationRule = {
      fromRole: 'manager',
      toRole: 'department_head',
      enabled: true,
      remark: '',
    };
    setEditValue(JSON.stringify([...rules, newRule], null, 2));
  };

  const deleteRule = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index);
    setEditValue(JSON.stringify(newRules, null, 2));
  };

  return (
    <div className="w-full max-w-2xl space-y-3">
      {/* 表头 */}
      <div className="bg-emerald-50 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-emerald-100">
              <th className="px-2 py-2 text-left font-semibold text-emerald-800 w-10">状态</th>
              <th className="px-2 py-2 text-left font-semibold text-emerald-800 w-36">委托角色</th>
              <th className="px-2 py-2 text-left font-semibold text-emerald-800 w-36">接收角色</th>
              <th className="px-2 py-2 text-left font-semibold text-emerald-800">说明</th>
              <th className="px-2 py-2 text-center font-semibold text-emerald-800 w-16">操作</th>
            </tr>
          </thead>
        </table>
      </div>

      {/* 规则列表 */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {rules.map((rule, idx) => (
          <div key={idx} className={`flex items-center gap-2 p-2 rounded-lg border ${rule.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-400'}`}>
            {/* 启用开关 */}
            <button
              onClick={() => updateRule(idx, { enabled: !rule.enabled })}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                rule.enabled ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
              title={rule.enabled ? '已启用' : '已禁用'}
            >
              {rule.enabled ? <CheckCircle className="w-4 h-4" /> : <span className="w-4 h-4 inline-block border-2 border-current rounded-full" />}
            </button>

            {/* 委托角色 */}
            <select
              value={rule.fromRole}
              onChange={(e) => updateRule(idx, { fromRole: e.target.value })}
              className="w-36 px-2 py-1.5 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {ROLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* 箭头 */}
            <div className="flex items-center text-gray-400">
              <UserCheck className="w-4 h-4" />
            </div>

            {/* 接收角色 */}
            <select
              value={rule.toRole}
              onChange={(e) => updateRule(idx, { toRole: e.target.value })}
              className="w-36 px-2 py-1.5 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {ROLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* 说明 */}
            <input
              type="text"
              value={rule.remark}
              onChange={(e) => updateRule(idx, { remark: e.target.value })}
              placeholder="规则说明..."
              className="flex-1 px-2 py-1.5 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            {/* 删除按钮 */}
            <button
              onClick={() => deleteRule(idx)}
              className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="删除规则"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* 添加按钮 */}
      <button
        onClick={addRule}
        className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        添加委托规则
      </button>

      {/* JSON预览（可折叠） */}
      <details className="mt-2">
        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
          查看原始JSON
        </summary>
        <pre className="mt-1 p-2 text-xs bg-gray-100 rounded overflow-x-auto max-h-40">
          {editValue}
        </pre>
      </details>
    </div>
  );
}
