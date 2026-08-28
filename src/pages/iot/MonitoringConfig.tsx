/**
 * 监测配置 — 表格 UI 与订单管理（market/OrderManagement）保持一致
 * 2026-08-28：复刻预警信息中心导出功能（复选框模式 + 列表右上方按钮组 + 弹窗选格式）
 */
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Home, Download, XCircle, Edit, Trash2, Eye, ToggleLeft, ToggleRight,
  Monitor, AlertCircle, CheckCircle, Calendar,
} from 'lucide-react';
import { ExportFormatModal } from '@/components/common/ExportFormatModal';
import { exportCsv, exportXlsx, exportWord } from '@/services/exporters';
import { todayLocal } from '@/lib/dateUtils';

const monitoringConfig = [
  { id: 'CFG-001', name: '温室环境监测配置', type: '环境监测', sensors: ['温度传感器', '湿度传感器', 'CO2传感器', '光照传感器'], interval: 60, enabled: true, alertEnabled: true, updateTime: '2025-01-10 10:00:00' },
  { id: 'CFG-002', name: '土壤监测配置', type: '土壤监测', sensors: ['土壤湿度传感器', '土壤温度传感器', 'EC传感器', 'pH传感器'], interval: 30, enabled: true, alertEnabled: true, updateTime: '2025-01-10 10:00:00' },
  { id: 'CFG-003', name: '气象站监测配置', type: '气象监测', sensors: ['温度传感器', '湿度传感器', '风速传感器', '气压传感器', '雨量传感器'], interval: 300, enabled: true, alertEnabled: false, updateTime: '2025-01-08 14:00:00' },
  { id: 'CFG-004', name: '能耗监测配置', type: '能耗监测', sensors: ['功率传感器', '电压传感器', '电流传感器'], interval: 60, enabled: true, alertEnabled: true, updateTime: '2025-01-12 09:00:00' },
  { id: 'CFG-005', name: '水培区监测配置', type: '水质监测', sensors: ['水温传感器', '溶解氧传感器', '浊度传感器', 'pH传感器'], interval: 30, enabled: true, alertEnabled: true, updateTime: '2025-01-11 11:00:00' },
  { id: 'CFG-006', name: '灌溉系统监测配置', type: '设备监测', sensors: ['流量传感器', '压力传感器', '液位传感器'], interval: 60, enabled: false, alertEnabled: false, updateTime: '2025-01-05 16:00:00' },
];

const statistics = { totalConfigs: 6, enabledConfigs: 5, disabledConfigs: 1, alertEnabled: 4, alertDisabled: 2 };

// 状态筛选（与表格徽章标签一一对应）
const statuses = ['全部', '已启用', '已禁用'];

export default function MonitoringConfig() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('add');
  // 2026-08-28：导出复选框模式（与预警信息中心 100% 一致）
  const [exportMode, setExportMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv' | 'word'>('excel');

  const filteredData = monitoringConfig.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchKeyword.toLowerCase()) || item.type.toLowerCase().includes(searchKeyword.toLowerCase());
    const statusLabel = item.enabled ? '已启用' : '已禁用';
    const matchStatus = statusFilter === '全部' || statusLabel === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleToggle = (id: string) => alert(`切换监测配置 ${id} 状态`);
  const handleEdit = () => { setModalType('edit'); setShowModal(true); };
  const handleView = () => { setModalType('view'); setShowModal(true); };

  /**
   * 进入导出模式（点击"导出"按钮）— 与预警信息中心 100% 一致
   */
  const handleEnterExportMode = useCallback(() => {
    setExportMode(true);
    setSelectedIds(filteredData.map(d => d.id));
  }, [filteredData]);

  /** 取消导出模式 + 清空选择 */
  const handleCancelExport = useCallback(() => {
    setExportMode(false);
    setSelectedIds([]);
  }, []);

  /** 单条复选框切换 */
  const toggleSelectOne = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  /** 当前页全选/全不选 */
  const toggleSelectPage = useCallback(() => {
    const pageIds = paginatedData.map(d => d.id);
    const allSelected = pageIds.every(id => selectedIds.includes(id));
    setSelectedIds(prev =>
      allSelected
        ? prev.filter(id => !pageIds.includes(id))
        : Array.from(new Set([...prev, ...pageIds]))
    );
  }, [paginatedData, selectedIds]);

  /**
   * 确认导出（弹窗中点"导出"）— 与预警信息中心 100% 一致
   */
  const handleExportConfirm = useCallback(async () => {
    const headers = ['配置ID', '配置名称', '类型', '关联传感器', '采集间隔(秒)', '状态', '告警', '更新时间'];
    const selected = filteredData.filter(d => selectedIds.includes(d.id));
    const rows = selected.map(d => ({
      '配置ID': d.id,
      '配置名称': d.name,
      '类型': d.type,
      '关联传感器': d.sensors.join('、'),
      '采集间隔(秒)': d.interval,
      '状态': d.enabled ? '已启用' : '已禁用',
      '告警': d.alertEnabled ? '已启用' : '已禁用',
      '更新时间': d.updateTime,
    }));
    const filename = `监测配置_${todayLocal()}`;
    if (exportFormat === 'csv') {
      await exportCsv({ filename: `${filename}.csv`, headers, rows });
    } else if (exportFormat === 'word') {
      await exportWord({ filename: `${filename}.doc`, headers, rows });
    } else {
      await exportXlsx({ filename: `${filename}.xls`, headers, rows });
    }
    setShowExportModal(false);
    handleCancelExport();
  }, [filteredData, exportFormat, selectedIds, handleCancelExport]);

  return (
    <div className="pt-0 px-6 pb-6">
      {/* 页面标题 - 带大图标卡（与订单管理设计标准一致） */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">监测配置</h1>
              <p className="text-gray-500 mt-1">监测设备配置</p>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { Icon: Monitor, bg: 'bg-blue-100', text: 'text-blue-600', label: '配置总数', value: statistics.totalConfigs, valColor: 'text-gray-800' },
          { Icon: ToggleRight, bg: 'bg-green-100', text: 'text-green-600', label: '已启用', value: statistics.enabledConfigs, valColor: 'text-green-600' },
          { Icon: ToggleLeft, bg: 'bg-gray-100', text: 'text-gray-600', label: '已禁用', value: statistics.disabledConfigs, valColor: 'text-gray-600' },
          { Icon: AlertCircle, bg: 'bg-amber-100', text: 'text-amber-600', label: '告警启用', value: statistics.alertEnabled, valColor: 'text-amber-600' },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.Icon className={`w-5 h-5 ${card.text}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className={`text-xl font-bold ${card.valColor}`}>{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">状态：</span>
            <div className="flex gap-2">
              {statuses.map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === status
                      ? 'bg-[#2B5D3A] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索配置名称或类型..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
            />
          </div>
        </div>
      </div>

      {/* 2026-08-28：列表右上方单独一行 — 标题 + 导出按钮（与预警信息中心 100% 一致） */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-800">监测配置列表</h3>
        <div className="flex items-center gap-3">
          {!exportMode ? (
            <button
              onClick={handleEnterExportMode}
              disabled={filteredData.length === 0}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowExportModal(true)}
                disabled={selectedIds.length === 0}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                确认导出
              </button>
              <button
                onClick={handleCancelExport}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                取消选择
              </button>
            </>
          )}
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
            <tr>
              {/* 2026-08-28：导出模式下显示复选框列（与预警信息中心一致） */}
              {exportMode && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider w-10">
                  <input
                    type="checkbox"
                    checked={paginatedData.length > 0 && paginatedData.every(d => selectedIds.includes(d.id))}
                    onChange={toggleSelectPage}
                    aria-label="全选当前页"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">配置ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">配置名称</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">类型</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">关联传感器</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">采集间隔(秒)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">告警</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">更新时间</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedData.map(item => (
              <tr
                key={item.id}
                className={`hover:bg-gray-50 transition-colors ${exportMode && selectedIds.includes(item.id) ? 'bg-blue-50/50' : ''}`}
              >
                {/* 2026-08-28：导出模式下显示行复选框 */}
                {exportMode && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelectOne(item.id)}
                      aria-label={`选择 ${item.id}`}
                    />
                  </td>
                )}
                <td className="px-4 py-3 text-sm text-gray-600 font-mono">{item.id}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.type}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  <div className="flex flex-wrap gap-1">
                    {item.sensors.slice(0, 3).map((sensor, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{sensor}</span>
                    ))}
                    {item.sensors.length > 3 && (<span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-xs">+{item.sensors.length - 3}</span>)}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.interval}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleToggle(item.id)} className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${item.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {item.enabled ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
                    {item.enabled ? '已启用' : '已禁用'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${item.alertEnabled ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                    {item.alertEnabled ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {item.alertEnabled ? '已启用' : '已禁用'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{item.updateTime}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={handleView} className="p-1.5 text-gray-400 hover:text-[#2B5D3A] hover:bg-[#2B5D3A]/10 rounded transition-colors" title="查看">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={handleEdit} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="编辑">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="删除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无数据</p>
          </div>
        )}
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">共 {filteredData.length} 条记录</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">每页</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
            >
              <option value={10}>10 条</option>
              <option value={20}>20 条</option>
              <option value={50}>50 条</option>
              <option value={100}>100 条</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            上一页
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded text-sm ${
                currentPage === page
                  ? 'bg-[#2B5D3A] text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      </div>

      {/* 新增/编辑/查看弹窗（保留原有业务逻辑） */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg mx-4 shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-gray-800">
                {modalType === 'add' ? '新增监测配置' : modalType === 'edit' ? '编辑监测配置' : '配置详情'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">配置名称</label>
                <input type="text" placeholder="请输入配置名称" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">监测类型</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]">
                  <option value="">请选择</option>
                  <option value="env">环境监测</option>
                  <option value="soil">土壤监测</option>
                  <option value="weather">气象监测</option>
                  <option value="energy">能耗监测</option>
                  <option value="water">水质监测</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">采集间隔(秒)</label>
                <input type="number" placeholder="请输入采集间隔" defaultValue={60} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">关联传感器</label>
                <div className="flex flex-wrap gap-2">
                  {['温度传感器', '湿度传感器', 'CO2传感器', '光照传感器', '土壤湿度传感器', '土壤温度传感器'].map(sensor => (
                    <label key={sensor} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" className="rounded" /><span className="text-sm">{sensor}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm transition-colors">取消</button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm hover:bg-[#245038] transition-colors">{modalType === 'view' ? '关闭' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 2026-08-28：导出格式选择弹窗（与预警信息中心一致） */}
      <ExportFormatModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        selectedCount={selectedIds.length}
        exportFormat={exportFormat}
        onFormatChange={(f) => setExportFormat(f as 'excel' | 'csv' | 'word')}
        onConfirm={handleExportConfirm}
      />
    </div>
  );
}
