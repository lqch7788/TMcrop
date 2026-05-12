/**
 * 系统参数配置页面
 * 功能：系统配置的新增、编辑、删除、查询
 * 使用 API 替代 localStorage
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Settings, Plus, Edit, Trash2, Save, X, ChevronLeft, Loader2, AlertTriangle } from 'lucide-react';
import {
  getSystemConfigs,
  createSystemConfig,
  updateSystemConfig,
  deleteSystemConfig,
  SystemConfig as SystemConfigType,
} from '../services/apiBasicDataService';

const DEFAULT_CONFIGS: SystemConfigType[] = [
  { id: '1', configKey: 'system_name', configValue: '智慧种植生产管理系统', configType: 'string', category: 'system', description: '系统显示名称', isActive: 1, createdAt: '', updatedAt: '' },
  { id: '2', configKey: 'system_version', configValue: 'V1.2.0', configType: 'string', category: 'system', description: '当前系统版本', isActive: 1, createdAt: '', updatedAt: '' },
  { id: '3', configKey: 'demo_mode', configValue: 'true', configType: 'boolean', category: 'demo', description: '是否启用演示模式', isActive: 1, createdAt: '', updatedAt: '' },
  { id: '4', configKey: 'show_tutorial', configValue: 'true', configType: 'boolean', category: 'demo', description: '是否显示新手引导', isActive: 1, createdAt: '', updatedAt: '' },
  { id: '5', configKey: 'theme_color', configValue: 'emerald', configType: 'string', category: 'ui', description: '系统主题色', isActive: 1, createdAt: '', updatedAt: '' },
  { id: '6', configKey: 'auto_save_interval', configValue: '5000', configType: 'number', category: 'system', description: '自动保存间隔（毫秒）', isActive: 1, createdAt: '', updatedAt: '' },
  { id: '7', configKey: 'page_size', configValue: '10', configType: 'number', category: 'ui', description: '列表默认分页大小', isActive: 1, createdAt: '', updatedAt: '' },
  { id: '8', configKey: 'enable_notifications', configValue: 'true', configType: 'boolean', category: 'feature', description: '是否启用系统通知', isActive: 1, createdAt: '', updatedAt: '' },
  { id: '9', configKey: 'data_retention_days', configValue: '365', configType: 'number', category: 'system', description: '本地数据保留天数', isActive: 1, createdAt: '', updatedAt: '' },
  { id: '10', configKey: 'enable_export', configValue: 'true', configType: 'boolean', category: 'feature', description: '是否启用数据导出功能', isActive: 1, createdAt: '', updatedAt: '' },
];

export default function SystemConfig() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newConfig, setNewConfig] = useState<Partial<SystemConfig>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载系统配置
  const loadConfigs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSystemConfigs();
      // 如果API返回空数据，使用默认配置
      setConfigs(data && data.length > 0 ? data : DEFAULT_CONFIGS);
    } catch (err) {
      console.error('加载系统配置失败:', err);
      setConfigs(DEFAULT_CONFIGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const filteredConfigs = activeCategory === 'all'
    ? configs
    : configs.filter(c => c.category === activeCategory);

  const handleStartEdit = (config: SystemConfig) => {
    setEditingId(config.id);
    setEditValue(config.configValue);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updateSystemConfig(id, { configValue: editValue });
      await loadConfigs();
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

  const handleAddConfig = async () => {
    if (!newConfig.configKey) {
      alert('请填写配置键');
      return;
    }
    try {
      await createSystemConfig({
        configKey: newConfig.configKey,
        configValue: newConfig.configValue || '',
        configType: newConfig.configType || 'string',
        category: newConfig.category || 'system',
        description: newConfig.description || '',
      });
      await loadConfigs();
      setNewConfig({});
      setShowAddForm(false);
    } catch (err) {
      console.error('创建配置失败:', err);
      alert('创建配置失败');
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!confirm('确定要删除这个配置项吗？')) return;
    try {
      await deleteSystemConfig(id);
      await loadConfigs();
    } catch (err) {
      console.error('删除配置失败:', err);
      alert('删除配置失败');
    }
  };

  const handleResetDefaults = () => {
    if (confirm('确定要恢复默认配置吗？这将丢失所有自定义配置。')) {
      setConfigs(DEFAULT_CONFIGS);
    }
  };

  const categories = [
    { value: 'all', label: '全部' },
    { value: 'system', label: '系统设置' },
    { value: 'ui', label: '界面设置' },
    { value: 'feature', label: '功能设置' },
    { value: 'demo', label: '演示设置' },
  ];

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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">系统参数配置</h1>
            <p className="text-gray-500">管理系统名称、主题、功能开关等参数</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDefaults}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            恢复默认
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            新增配置
          </button>
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
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 新增配置表单 */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">新增配置项</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">配置键</label>
              <input
                type="text"
                value={newConfig.configKey || ''}
                onChange={(e) => setNewConfig({ ...newConfig, configKey: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="如：system_name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">配置名称</label>
              <input
                type="text"
                value={newConfig.configValue || ''}
                onChange={(e) => setNewConfig({ ...newConfig, configValue: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="配置值"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
              <select
                value={newConfig.configType || 'string'}
                onChange={(e) => setNewConfig({ ...newConfig, configType: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="system">系统设置</option>
                <option value="ui">界面设置</option>
                <option value="feature">功能设置</option>
                <option value="demo">演示设置</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-4">
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewConfig({});
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleAddConfig}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              添加
            </button>
          </div>
        </div>
      )}

      {/* 配置列表 */}
      <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
        {filteredConfigs.map(config => (
          <div key={config.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{config.configKey}</span>
                  <code className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{config.configKey}</code>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
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
                      <button
                        onClick={() => handleSaveEdit(config.id)}
                        className="p-1 text-green-600 hover:text-green-800"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1 text-gray-600 hover:text-gray-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleStartEdit(config)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteConfig(config.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
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
    </div>
  );
}
