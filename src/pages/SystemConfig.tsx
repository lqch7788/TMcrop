/**
 * 系统参数配置页面
 * 功能：系统配置的新增、编辑、删除、查询、导出
 * 架构：组件 → useSystemConfigStore (Zustand) → API
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Settings, Plus, Edit, Trash2, Save, X, ChevronLeft, Loader2,
  AlertTriangle, Download,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { useSystemConfigStore } from '../stores';
import type { SystemConfig } from '../services/apiBasicDataService';

// 默认配置作为 API 返回空时的后备
const DEFAULT_CONFIGS: SystemConfig[] = [
  { id: '1', configKey: 'system_name', configValue: '智慧种植生产管理系统', configType: 'string', category: 'system', description: '系统显示名称', isActive: true, createdAt: '', updatedAt: '' },
  { id: '2', configKey: 'system_version', configValue: 'V1.2.0', configType: 'string', category: 'system', description: '当前系统版本', isActive: true, createdAt: '', updatedAt: '' },
  { id: '3', configKey: 'demo_mode', configValue: 'true', configType: 'boolean', category: 'demo', description: '是否启用演示模式', isActive: true, createdAt: '', updatedAt: '' },
  { id: '4', configKey: 'show_tutorial', configValue: 'true', configType: 'boolean', category: 'demo', description: '是否显示新手引导', isActive: true, createdAt: '', updatedAt: '' },
  { id: '5', configKey: 'theme_color', configValue: 'emerald', configType: 'string', category: 'ui', description: '系统主题色', isActive: true, createdAt: '', updatedAt: '' },
  { id: '6', configKey: 'auto_save_interval', configValue: '5000', configType: 'number', category: 'system', description: '自动保存间隔（毫秒）', isActive: true, createdAt: '', updatedAt: '' },
  { id: '7', configKey: 'page_size', configValue: '10', configType: 'number', category: 'ui', description: '列表默认分页大小', isActive: true, createdAt: '', updatedAt: '' },
  { id: '8', configKey: 'enable_notifications', configValue: 'true', configType: 'boolean', category: 'feature', description: '是否启用系统通知', isActive: true, createdAt: '', updatedAt: '' },
  { id: '9', configKey: 'data_retention_days', configValue: '365', configType: 'number', category: 'system', description: '本地数据保留天数', isActive: true, createdAt: '', updatedAt: '' },
  { id: '10', configKey: 'enable_export', configValue: 'true', configType: 'boolean', category: 'feature', description: '是否启用数据导出功能', isActive: true, createdAt: '', updatedAt: '' },
];

// 弹窗最小尺寸
const MODAL_MIN_WIDTH = 480;
const MODAL_MIN_HEIGHT = 360;

export default function SystemConfig() {
  const { configs, loading, error, loadConfigs, addConfig, updateConfig, removeConfig } = useSystemConfigStore();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // 新增弹窗状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [newConfig, setNewConfig] = useState<Partial<SystemConfig>>({});

  // 弹窗拖拽/缩放/最大化
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, left: 0, top: 0 });
  const [resizeDir, setResizeDir] = useState('');
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0, left: 0, top: 0 });

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  // 使用 store 数据，空时回退到默认配置
  const displayConfigs = configs.length > 0 ? configs : DEFAULT_CONFIGS;

  const filteredConfigs = activeCategory === 'all'
    ? displayConfigs
    : displayConfigs.filter(c => c.category === activeCategory);

  // ========== 行内编辑 ==========

  const handleStartEdit = (config: SystemConfig) => {
    setEditingId(config.id);
    setEditValue(config.configValue);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updateConfig(id, { configValue: editValue });
      setEditingId(null);
      setEditValue('');
    } catch (err) {
      console.error('更新配置失败:', err);
      alert('更新配置失败');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleDeleteConfig = async (id: string) => {
    if (!confirm('确定要删除这个配置项吗？')) return;
    try {
      await removeConfig(id);
    } catch (err) {
      console.error('删除配置失败:', err);
      alert('删除配置失败');
    }
  };

  // ========== 新增弹窗 ==========

  const openAddModal = () => {
    setNewConfig({});
    setIsMaximized(false);
    setShowAddModal(true);
  };

  const handleAddConfig = async () => {
    if (!newConfig.configKey) {
      alert('请填写配置键');
      return;
    }
    try {
      await addConfig({
        configKey: newConfig.configKey,
        configValue: newConfig.configValue || '',
        configType: newConfig.configType || 'string',
        category: newConfig.category || 'system',
        description: newConfig.description || '',
      });
      setNewConfig({});
      setShowAddModal(false);
    } catch (err) {
      console.error('创建配置失败:', err);
      alert('创建配置失败');
    }
  };

  // ========== 弹窗拖拽 ==========

  const handleDragStart = (e: React.MouseEvent) => {
    if (isMaximized) return;
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    setIsDragging(true);
    const dialog = document.getElementById('config-add-dialog');
    if (dialog) {
      const rect = dialog.getBoundingClientRect();
      setDragStart({ x: e.clientX, y: e.clientY, left: rect.left, top: rect.top });
    }
  };

  // ========== 弹窗缩放 ==========

  const handleResizeStart = (e: React.MouseEvent, dir: string) => {
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
  };

  // 拖动+缩放鼠标事件
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

  // ========== 最大化/还原 ==========

  const toggleMaximize = () => {
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
    setIsMaximized(!isMaximized);
  };

  // ========== 渲染辅助 ==========

  const categories = [
    { value: 'all', label: '全部' },
    { value: 'system', label: '系统设置' },
    { value: 'ui', label: '界面设置' },
    { value: 'feature', label: '功能设置' },
    { value: 'demo', label: '演示设置' },
  ];

  // 类型标签徽章
  const getTypeBadge = (type: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      string: { bg: 'bg-blue-100', text: 'text-blue-700', label: '文本' },
      number: { bg: 'bg-green-100', text: 'text-green-700', label: '数字' },
      boolean: { bg: 'bg-purple-100', text: 'text-purple-700', label: '布尔' },
    };
    const style = map[type] || map.string;
    return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${style.bg} ${style.text}`}>{style.label}</span>;
  };

  // 导出配置为CSV
  const handleExport = () => {
    const csv = ['配置键,配置值,类型,分类,描述,状态']
      .concat(displayConfigs.map(c =>
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
  };

  const renderValue = (config: SystemConfig) => {
    if (editingId === config.id) {
      if (config.configType === 'boolean') {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="true">是</option>
            <option value="false">否</option>
          </select>
        );
      }
      return (
        <input
          type={config.configType === 'number' ? 'number' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

    return <span className="text-sm text-gray-900">{config.configValue}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    );
  }

  if (error) {
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
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">系统参数配置</h1>
            <p className="text-gray-500">管理系统名称、主题、功能开关等参数</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleExport}>
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
      <div className="flex items-center gap-2 border-b border-gray-200">
        {categories.map(cat => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeCategory === cat.value
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 配置列表 */}
      <div className="bg-white rounded-lg shadow divide-y divide-gray-200 max-w-2xl">
        {filteredConfigs.map(config => (
          <div key={config.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900">{config.configKey}</span>
                  {getTypeBadge(config.configType)}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    config.category === 'system' ? 'bg-blue-100 text-blue-800' :
                    config.category === 'ui' ? 'bg-purple-100 text-purple-800' :
                    config.category === 'feature' ? 'bg-green-100 text-green-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {categories.find(c => c.value === config.category)?.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{config.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="min-w-[120px]">
                  {renderValue(config)}
                </div>
                <div className="flex items-center gap-1">
                  {editingId === config.id ? (
                    <>
                      <button onClick={() => handleSaveEdit(config.id)} className="p-1 text-green-600 hover:text-green-800">
                        <Save className="w-4 h-4" />
                      </button>
                      <button onClick={handleCancelEdit} className="p-1 text-gray-600 hover:text-gray-800">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleStartEdit(config)} className="p-1 text-blue-500 hover:text-blue-700">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteConfig(config.id)} className="p-1 text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

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
                {/* 最大化/还原 */}
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
                {/* 关闭 */}
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
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="如：system_name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">配置值 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newConfig.configValue || ''}
                    onChange={(e) => setNewConfig({ ...newConfig, configValue: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="配置值"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                  <select
                    value={newConfig.configType || 'string'}
                    onChange={(e) => setNewConfig({ ...newConfig, configType: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="string">文本</option>
                    <option value="number">数字</option>
                    <option value="boolean">布尔</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                  <select
                    value={newConfig.category || 'system'}
                    onChange={(e) => setNewConfig({ ...newConfig, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="system">系统设置</option>
                    <option value="ui">界面设置</option>
                    <option value="feature">功能设置</option>
                    <option value="demo">演示设置</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">描述说明</label>
                <textarea
                  value={newConfig.description || ''}
                  onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
                {/* 四角 */}
                <div className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize hover:bg-emerald-400/40 rounded-sm z-10" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
                <div className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize hover:bg-emerald-400/40 rounded-sm z-10" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
                <div className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize hover:bg-emerald-400/40 rounded-sm z-10" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
                <div className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize hover:bg-emerald-400/40 rounded-sm z-10" onMouseDown={(e) => handleResizeStart(e, 'se')} />
                {/* 四边 */}
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
