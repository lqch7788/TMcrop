/**
 * 历史数据 — 表格 UI 与订单管理（market/OrderManagement）保持一致
 * 2026-08-28：复刻预警信息中心导出功能（复选框模式 + 列表右上方按钮组 + 弹窗选格式）
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database, Search, Home, Download, XCircle, TrendingUp, Clock, Calendar,
} from 'lucide-react';
import { ExportFormatModal } from '@/components/common/ExportFormatModal';
import { exportCsv, exportXlsx, exportWord } from '@/services/exporters';
import { todayLocal } from '@/lib/dateUtils';
import { useIotHistoryStore, type IotHistory, type HistoryDataType } from '@/stores';

const statistics = { totalRecords: 12580, todayRecords: 3256, avgRecordsPerDay: 2850, dataSize: '2.8GB' };

// 数据类型 pill 筛选（包含"全部"）
const dataTypes: Array<HistoryDataType | '全部'> = ['全部', '温湿度', '土壤', '气象', '能耗'];

export default function HistoryData() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [dataTypeFilter, setDataTypeFilter] = useState<HistoryDataType | '全部'>('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  // 2026-08-28：导出复选框模式（与预警信息中心 100% 一致）
  const [exportMode, setExportMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv' | 'word'>('excel');

  // 2026-08-29：从 Store 读 IoT 历史数据
  const records = useIotHistoryStore((s) => s.records);
  const fetchHistory = useIotHistoryStore((s) => s.fetchHistory);
  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const filteredData = records.filter((item: IotHistory) => {
    const matchSearch = item.sensorName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      item.sensorCode.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      item.recordCode.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchType = dataTypeFilter === '全部' || item.dataType === dataTypeFilter;
    return matchSearch && matchType;
  });

  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredData.length / pageSize);

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
   * 历史数据行字段不固定（温湿度/土壤/气象/能耗），按实际存在的字段写出
   */
  const handleExportConfirm = useCallback(async () => {
    const headers = ['记录ID', '传感器ID', '传感器名称', '数据类型', '温度(°C)', '湿度(%)', 'CO₂(ppm)', '土壤湿度(%)', '土壤温度(°C)', 'pH', 'EC(dS/m)', '风速(km/h)', '功率(kW)', '电压(V)', '电流(A)', '时间戳'];
    const selected = filteredData.filter(d => selectedIds.includes(d.id));
    const rows = selected.map(d => ({
      '记录ID': d.id,
      '传感器ID': d.sensorId,
      '传感器名称': d.sensorName,
      '数据类型': d.dataType,
      '温度(°C)': d.temp ?? '',
      '湿度(%)': d.humidity ?? '',
      'CO₂(ppm)': d.co2 ?? '',
      '土壤湿度(%)': d.soilMoisture ?? '',
      '土壤温度(°C)': d.soilTemp ?? '',
      'pH': d.ph ?? '',
      'EC(dS/m)': d.ec ?? '',
      '风速(km/h)': d.windSpeed ?? '',
      '功率(kW)': d.power ?? '',
      '电压(V)': d.voltage ?? '',
      '电流(A)': d.current ?? '',
      '时间戳': d.timestamp,
    }));
    const filename = `历史数据_${todayLocal()}`;
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

  // 数据类型徽章（带颜色）
  const getDataTypeBadge = (type: string) => {
    switch (type) {
      case '温湿度': return 'bg-blue-100 text-blue-700';
      case '土壤': return 'bg-amber-100 text-amber-700';
      case '气象': return 'bg-cyan-100 text-cyan-700';
      case '能耗': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="pt-0 px-6 pb-6">
      {/* 页面标题 - 带大图标卡（与订单管理设计标准一致） */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">历史数据</h1>
              <p className="text-gray-500 mt-1">监测历史数据查询</p>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { Icon: Database, bg: 'bg-blue-100', text: 'text-blue-600', label: '总记录数', value: statistics.totalRecords.toLocaleString(), valColor: 'text-gray-800' },
          { Icon: Clock, bg: 'bg-green-100', text: 'text-green-600', label: '今日记录', value: statistics.todayRecords.toLocaleString(), valColor: 'text-green-600' },
          { Icon: TrendingUp, bg: 'bg-cyan-100', text: 'text-cyan-600', label: '日均记录', value: statistics.avgRecordsPerDay.toLocaleString(), valColor: 'text-cyan-600' },
          { Icon: Database, bg: 'bg-indigo-100', text: 'text-indigo-600', label: '数据总量', value: statistics.dataSize, valColor: 'text-indigo-600' },
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
            <span className="text-sm text-gray-600">数据类型：</span>
            <div className="flex gap-2 flex-wrap">
              {dataTypes.map(type => (
                <button
                  key={type}
                  onClick={() => { setDataTypeFilter(type); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    dataTypeFilter === type
                      ? 'bg-[#2B5D3A] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索传感器名称或ID..."
              value={searchKeyword}
              onChange={(e) => { setSearchKeyword(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
            />
          </div>
        </div>
      </div>

      {/* 2026-08-28：列表右上方单独一行 — 标题 + 导出按钮（与预警信息中心 100% 一致） */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-800">历史数据列表</h3>
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">记录ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">传感器</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">数据类型</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">温度(°C)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">湿度(%)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">CO₂/其他</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">时间戳</th>
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
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-800">{item.sensorName}</div>
                  <div className="text-xs text-gray-500">{item.sensorId}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getDataTypeBadge(item.dataType)}`}>
                    {item.dataType}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.tempDisplay ?? '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.humidityDisplay ?? '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.otherDisplay}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{item.timestamp}</td>
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
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(page => (
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
