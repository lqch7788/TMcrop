/**
 * 数据备份恢复页面
 * 功能：备份记录管理、备份策略配置、数据恢复
 * 架构：组件 → enhancedApiClient → /api/backup API
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Database, Clock, CheckCircle, XCircle, Download, Upload, Trash2, Play,
  Pause, Settings, Search, ChevronLeft, ChevronRight, AlertCircle,
  Server, Plus, Loader2,
} from 'lucide-react';
import { enhancedApiClient } from '../../lib/apiClient';
import { showAlert, showConfirm } from '../../lib/dialogService';

interface BackupRecord {
  id: string;
  name: string;
  type: 'full' | 'incremental';
  size: string;
  status: 'success' | 'failed' | 'in_progress';
  mode: 'auto' | 'manual';
  startTime: string;
  endTime: string;
  duration: string;
  filePath: string;
  remark: string;
}

interface BackupStrategy {
  id: string;
  name: string;
  type: 'full' | 'incremental';
  schedule: string;
  retention: number;
  status: 'active' | 'paused';
  lastRun: string;
  nextRun: string;
  target: string;
}

const BackupRecovery: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'record' | 'strategy'>('record');
  const [records, setRecords] = useState<BackupRecord[]>([]);
  const [strategies, setStrategies] = useState<BackupStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [backingUp, setBackingUp] = useState(false);
  const pageSize = 10;

  // 表单数据
  const [strategyForm, setStrategyForm] = useState({
    name: '',
    type: 'full' as 'full' | 'incremental',
    schedule: '',
    retention: 7,
    target: '全部数据库',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, strRes] = await Promise.all([
        enhancedApiClient.get('/backup/records'),
        enhancedApiClient.get('/backup/strategies'),
      ]);
      setRecords(recRes.data || []);
      setStrategies(strRes.data || []);
    } catch (err) {
      console.error('获取备份数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 创建备份
  const handleCreateBackup = async () => {
    setBackingUp(true);
    try {
      await enhancedApiClient.post('/backup/create', { remark: '手动备份' });
      await fetchData();
    } catch (err) {
      console.error('备份失败:', err);
      await showAlert('备份失败，请检查服务器');
    } finally {
      setBackingUp(false);
    }
  };

  // 删除备份
  const handleDeleteBackup = async (record: BackupRecord) => {
    if (!await showConfirm(`确定删除备份 "${record.name}" 吗？`)) return;
    try {
      const filename = record.filePath.split(/[/\\]/).pop();
      if (filename) {
        await enhancedApiClient.delete(`/backup/${filename}`);
        await fetchData();
      }
    } catch (err) {
      console.error('删除备份失败:', err);
      await showAlert('删除失败');
    }
  };

  // 恢复备份
  const handleRestore = async () => {
    if (!selectedBackup) return;
    if (!await showConfirm('数据恢复将覆盖当前数据库，确定继续？建议先创建当前数据备份。')) return;
    try {
      const filename = selectedBackup.filePath.split(/[/\\]/).pop();
      if (filename) {
        await enhancedApiClient.post(`/backup/restore/${filename}`);
        setShowRestoreModal(false);
        await showAlert('数据恢复成功！服务器将自动重启以加载恢复的数据。');
      }
    } catch (err) {
      console.error('恢复失败:', err);
      await showAlert('数据恢复失败');
    }
  };

  // 新增策略
  const handleAddStrategy = async () => {
    if (!strategyForm.name || !strategyForm.schedule) {
      await showAlert('请填写策略名称和执行周期');
      return;
    }
    try {
      await enhancedApiClient.post('/backup/strategies', strategyForm);
      setShowStrategyModal(false);
      setStrategyForm({ name: '', type: 'full', schedule: '', retention: 7, target: '全部数据库' });
      await fetchData();
    } catch (err) {
      console.error('创建策略失败:', err);
      await showAlert('创建策略失败');
    }
  };

  // 切换策略状态
  const handleToggleStrategy = async (strategy: BackupStrategy) => {
    try {
      await enhancedApiClient.put(`/backup/strategies/${strategy.id}/toggle`);
      await fetchData();
    } catch (err) {
      console.error('切换策略状态失败:', err);
    }
  };

  // 删除策略
  const handleDeleteStrategy = async (strategy: BackupStrategy) => {
    if (!await showConfirm(`确定删除策略 "${strategy.name}" 吗？`)) return;
    try {
      await enhancedApiClient.delete(`/backup/strategies/${strategy.id}`);
      await fetchData();
    } catch (err) {
      console.error('删除策略失败:', err);
      await showAlert('删除失败');
    }
  };

  // 下载备份
  const handleDownload = (record: BackupRecord) => {
    const filename = record.filePath.split(/[/\\]/).pop();
    if (filename) {
      window.open(`/api/backup/download/${filename}`, '_blank');
    }
  };

  // 导出记录
  const handleExportRecords = () => {
    const csv = ['名称,类型,大小,状态,模式,开始时间,耗时,备注']
      .concat(records.map(r =>
        `${r.name},${r.type === 'full' ? '全量' : '增量'},${r.size},${r.status},${r.mode === 'auto' ? '自动' : '手动'},${r.startTime},${r.duration},${r.remark}`
      ))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `备份记录_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredRecords = records.filter(r =>
    r.name.includes(searchKeyword) || r.remark.includes(searchKeyword)
  );
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;

  const successCount = records.filter(r => r.status === 'success').length;
  const failedCount = records.filter(r => r.status === 'failed').length;
  const activeStrategyCount = strategies.filter(s => s.status === 'active').length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-amber-500 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">成功</span>;
      case 'failed': return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">失败</span>;
      case 'in_progress': return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">进行中</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">未知</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
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
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">备份恢复</h1>
              <p className="text-gray-500">管理系统数据备份和恢复操作</p>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { icon: Database, bg: 'bg-emerald-50', iconColor: 'text-emerald-500', value: records.length, label: '备份记录' },
          { icon: CheckCircle, bg: 'bg-green-50', iconColor: 'text-green-500', value: successCount, label: '成功备份' },
          { icon: XCircle, bg: 'bg-red-50', iconColor: 'text-red-500', value: failedCount, label: '失败备份' },
          { icon: Server, bg: 'bg-blue-50', iconColor: 'text-blue-500', value: activeStrategyCount, label: '运行中策略' },
        ].map((card, idx) => (
          <div key={idx} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-500">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab导航 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="flex border-b">
          {[
            { key: 'record', icon: Database, label: '备份记录' },
            { key: 'strategy', icon: Settings, label: '备份策略' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key as any); setCurrentPage(1); }}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-emerald-600 border-b-2 border-emerald-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="搜索备份名称或备注..."
                value={searchKeyword}
                onChange={e => { setSearchKeyword(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
          {activeTab === 'record' && (
            <>
              <button
                onClick={handleCreateBackup}
                disabled={backingUp}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {backingUp ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                {backingUp ? '备份中...' : '立即备份'}
              </button>
              <button
                onClick={handleExportRecords}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Upload size={18} />
                导出记录
              </button>
            </>
          )}
          {activeTab === 'strategy' && (
            <button
              onClick={() => setShowStrategyModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus size={18} />
              新增策略
            </button>
          )}
        </div>
      </div>

      {/* 备份记录表格 */}
      {activeTab === 'record' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600">
              <tr>
                {['备份名称', '类型', '大小', '状态', '模式', '开始时间', '耗时', '操作'].map(h => (
                  <th key={h} className={`px-4 py-3 text-sm font-medium text-white ${h === '操作' ? 'text-center' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300 bg-white">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">暂无备份记录，点击"立即备份"创建第一个备份</td>
                </tr>
              ) : (
                paginatedRecords.map(record => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(record.status)}
                        <div>
                          <p className="text-sm font-bold text-gray-800">{record.name}</p>
                          <p className="text-xs text-gray-500 max-w-xs truncate">{record.remark}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${record.type === 'full' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {record.type === 'full' ? '全量' : '增量'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.size}</td>
                    <td className="px-4 py-3">{getStatusBadge(record.status)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${record.mode === 'auto' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'}`}>
                        {record.mode === 'auto' ? '自动' : '手动'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{record.startTime}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.duration}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => { setSelectedBackup(record); setShowRestoreModal(true); }}
                          disabled={record.status !== 'success'}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="恢复"
                        >
                          <Play size={16} />
                        </button>
                        <button
                          onClick={() => handleDownload(record)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="下载"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(record)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {/* 分页 */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-500">共 {filteredRecords.length} 条记录</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"><ChevronLeft size={16} /></button>
              {[...Array(totalPages)].map((_, i) => (
                <button key={i + 1} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 rounded text-sm ${currentPage === i + 1 ? 'bg-emerald-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{i + 1}</button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      )}

      {/* 备份策略表格 */}
      {activeTab === 'strategy' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600">
              <tr>
                {['策略名称', '备份类型', '执行周期', '保留份数', '备份对象', '上次执行', '下次执行', '状态', '操作'].map(h => (
                  <th key={h} className={`px-4 py-3 text-sm font-medium text-white ${h === '状态' || h === '操作' ? 'text-center' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300 bg-white">
              {strategies.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">暂无备份策略，点击"新增策略"创建</td>
                </tr>
              ) : (
                strategies.map(strategy => (
                  <tr key={strategy.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-bold text-gray-800">{strategy.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${strategy.type === 'full' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {strategy.type === 'full' ? '全量' : '增量'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{strategy.schedule}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{strategy.retention}份</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{strategy.target}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{strategy.lastRun}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{strategy.nextRun}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${strategy.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {strategy.status === 'active' ? '运行中' : '已暂停'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleToggleStrategy(strategy)}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          title={strategy.status === 'active' ? '暂停' : '启动'}
                        >
                          {strategy.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                        <button
                          onClick={() => handleDeleteStrategy(strategy)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 恢复确认模态框 */}
      {showRestoreModal && selectedBackup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">数据恢复确认</h3>
              <button onClick={() => setShowRestoreModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg mb-4">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">警告：此操作将覆盖当前数据</p>
                  <p className="text-sm text-amber-600 mt-1">恢复前会自动创建当前数据的备份</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-gray-500">备份名称：</span><span className="text-gray-800 font-bold">{selectedBackup.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">备份时间：</span><span className="text-gray-800">{selectedBackup.startTime}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">备份大小：</span><span className="text-gray-800">{selectedBackup.size}</span></div>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowRestoreModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">取消</button>
              <button onClick={handleRestore} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">确认恢复</button>
            </div>
          </div>
        </div>
      )}

      {/* 新增策略模态框 */}
      {showStrategyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">新增备份策略</h3>
              <button onClick={() => setShowStrategyModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">策略名称 <span className="text-red-500">*</span></label>
                  <input type="text" value={strategyForm.name} onChange={e => setStrategyForm({ ...strategyForm, name: e.target.value })}
                    placeholder="请输入策略名称" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">备份类型</label>
                    <select value={strategyForm.type} onChange={e => setStrategyForm({ ...strategyForm, type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                      <option value="full">全量备份</option>
                      <option value="incremental">增量备份</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">保留份数</label>
                    <input type="number" value={strategyForm.retention} onChange={e => setStrategyForm({ ...strategyForm, retention: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">执行周期 <span className="text-red-500">*</span></label>
                  <input type="text" value={strategyForm.schedule} onChange={e => setStrategyForm({ ...strategyForm, schedule: e.target.value })}
                    placeholder="如：每天 02:00 或 每周一 01:00" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">备份对象</label>
                  <select value={strategyForm.target} onChange={e => setStrategyForm({ ...strategyForm, target: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="全部数据库">全部数据库</option>
                    <option value="核心业务数据">核心业务数据</option>
                    <option value="配置文件">配置文件</option>
                    <option value="系统日志">系统日志</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowStrategyModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">取消</button>
              <button onClick={handleAddStrategy} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">创建策略</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupRecovery;
