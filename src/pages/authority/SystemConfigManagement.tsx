/**
 * 系统配置管理页面
 * V5.0 系统设置重构
 * 系统配置CRUD管理
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Search,
  RefreshCw,
  X,
  Save,
  Sliders,
} from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';
import {
  SystemConfig,
  getSystemConfigs,
  saveSystemConfigs,
} from '../../services/dictionaryService';
import { showConfirm } from '@/lib/dialogService';

export default function SystemConfigManagement() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Partial<SystemConfig> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSystemConfigs();
      setConfigs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 过滤配置
  const filteredConfigs = configs.filter(
    (config) =>
      config.configKey?.includes(searchTerm) ||
      config.description?.includes(searchTerm) ||
      config.configValue?.includes(searchTerm)
  );

  // 分页
  const totalPages = Math.ceil(filteredConfigs.length / pageSize);
  const paginatedConfigs = filteredConfigs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // 获取类型标签颜色
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'string':
        return 'bg-blue-100 text-blue-700';
      case 'number':
        return 'bg-green-100 text-green-700';
      case 'boolean':
        return 'bg-purple-100 text-purple-700';
      case 'json':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingConfig({
      configKey: '',
      configValue: '',
      configType: 'string',
      description: '',
    });
    setShowModal(true);
  };

  // 打开编辑弹窗
  const handleEdit = (config: SystemConfig) => {
    setEditingConfig({ ...config });
    setShowModal(true);
  };

  // 保存
  const handleSave = async () => {
    if (!editingConfig) return;
    try {
      setLoading(true);
      await saveSystemConfigs({
        inserted: editingConfig.id ? [] : [editingConfig as SystemConfig],
        updated: editingConfig.id ? [editingConfig as SystemConfig] : [],
        deleted: [],
      });
      setShowModal(false);
      setEditingConfig(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除
  const handleDelete = async (config: SystemConfig) => {
    if (!await showConfirm(`确定要删除配置项"${config.configKey}"吗？`)) return;
    try {
      setLoading(true);
      await saveSystemConfigs({
        inserted: [],
        updated: [],
        deleted: [config.id!],
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex items-center gap-3">
          <a
            href="/settings"
            className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center hover:from-gray-200 hover:to-gray-300 transition-colors"
            title="返回系统设置"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </a>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center">
            <Sliders className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">系统配置</h1>
            <p className="text-gray-500">管理系统配置参数</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center">
              <Settings className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{configs.length}</p>
              <p className="text-xs text-gray-500">配置项总数</p>
            </div>
          </div>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索配置键或描述..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData()}
              className="h-10 px-4 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              刷新
            </button>
            <button
              onClick={handleAdd}
              className="h-10 px-4 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:shadow-lg transition-shadow"
            >
              <Plus className="w-4 h-4" />
              新增配置
            </button>
          </div>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-slate-500 to-gray-600 text-white">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">配置键</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">配置值</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">类型</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">描述</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedConfigs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    暂无配置数据
                  </td>
                </tr>
              ) : (
                paginatedConfigs.map((config) => (
                  <tr key={config.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900 font-mono font-medium">{config.configKey}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{config.configValue || '-'}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeBadgeColor(config.configType || 'string')}`}>
                        {config.configType || 'string'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{config.description || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(config)}
                          className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(config)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              showPageSize={false}
            />
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* 弹窗 */}
      {showModal && editingConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingConfig.id ? '编辑配置' : '新增配置'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  配置键 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingConfig.configKey || ''}
                  onChange={(e) => setEditingConfig({ ...editingConfig, configKey: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 font-mono"
                  placeholder="例如：SYSTEM_NAME"
                  disabled={!!editingConfig.id}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  配置值 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingConfig.configValue || ''}
                  onChange={(e) => setEditingConfig({ ...editingConfig, configValue: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="例如：种植管理系统"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  配置类型 <span className="text-red-500">*</span>
                </label>
                <select
                  value={editingConfig.configType || 'string'}
                  onChange={(e) => setEditingConfig({ ...editingConfig, configType: e.target.value as SystemConfig['configType'] })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="string">字符串 (string)</option>
                  <option value="number">数字 (number)</option>
                  <option value="boolean">布尔值 (boolean)</option>
                  <option value="json">JSON</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={editingConfig.description || ''}
                  onChange={(e) => setEditingConfig({ ...editingConfig, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none"
                  rows={3}
                  placeholder="请输入配置项的描述说明..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !editingConfig.configKey || !editingConfig.configValue}
                className="px-4 py-2 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
