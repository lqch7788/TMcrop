/**
 * 农事活动管理页面
 * 架构：组件 → useFarmActivityStore (Zustand) → API
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Sprout, Plus, Edit, Trash2, Search, ChevronLeft,
  Calendar, User, MapPin, Clock, CheckCircle, XCircle, AlertCircle, Loader2, AlertTriangle
} from 'lucide-react';
import { Modal, FormField, Input, Textarea } from '../components/ui/Modal';
import { useFarmActivityStore } from '../stores/useFarmActivityStore';
import { useZoneStore, useWorkerStore } from '../stores';
import { showAlert, showConfirm } from '@/lib/dialogService';
import { Pagination } from '@/components/ui';

/** 农事活动数据类型（useFarmActivityStore 内部使用，页面重定义以解耦导入） */
interface FarmActivity {
  id: number;
  activityCode?: string;
  activityName?: string;
  activityType?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  priority?: string;
  branchOid?: string;
  blockOid?: string;
  assigneeIds?: string[];
  description?: string;
}

const ACTIVITY_TYPES: Record<string, { label: string; color: string }> = {
  WATERING: { label: '灌溉', color: 'bg-blue-100 text-blue-700' },
  FERTILIZING: { label: '施肥', color: 'bg-amber-100 text-amber-700' },
  PEST_CONTROL: { label: '病虫害防治', color: 'bg-red-100 text-red-700' },
  HARVESTING: { label: '采收', color: 'bg-purple-100 text-purple-700' },
  WEEDING: { label: '除草', color: 'bg-green-100 text-green-700' },
  PRUNING: { label: '修剪', color: 'bg-orange-100 text-orange-700' },
  INSPECTION: { label: '巡田', color: 'bg-cyan-100 text-cyan-700' },
  SEEDING: { label: '播种', color: 'bg-emerald-100 text-emerald-700' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  active: { label: '待执行', color: 'bg-gray-100 text-gray-600', icon: Clock },
  in_progress: { label: '进行中', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  completed: { label: '已完成', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  HIGH: { label: '高', color: 'text-red-600 bg-red-50' },
  MEDIUM: { label: '中', color: 'text-amber-600 bg-amber-50' },
  LOW: { label: '低', color: 'text-gray-600 bg-gray-50' },
};

export default function FarmActivityManagement() {
  const { activities, loading, error, loadActivities, addActivity, editActivity, removeActivity } = useFarmActivityStore();
  const zones = useZoneStore((s) => s.zones);
  const loadZones = useZoneStore((s) => s.loadZones);
  const workers = useWorkerStore((s) => s.workers);
  const loadWorkers = useWorkerStore((s) => s.loadWorkers);

  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<FarmActivity | null>(null);
  const [formData, setFormData] = useState<Partial<FarmActivity>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadActivities();
    loadZones();
    loadWorkers();
  }, [loadActivities, loadZones, loadWorkers]);

  const zoneOptions = useMemo(() => zones.map(z => ({ value: z.oid, label: z.zoneName })), [zones]);
  const workerOptions = useMemo(() => workers.map(w => ({ value: w.oid || w.id, label: w.name || w.realName })), [workers]);

  const filteredActivities = activities.filter((a: FarmActivity) => {
    const matchSearch = !searchText ||
      (a.activityName || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (a.activityCode || '').toLowerCase().includes(searchText.toLowerCase());
    const matchType = typeFilter === 'all' || a.activityType === typeFilter;
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const totalPages = Math.ceil(filteredActivities.length / pageSize);
  const paginated = filteredActivities.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenModal = (activity?: FarmActivity) => {
    if (activity) {
      setEditingActivity(activity);
      setFormData(activity);
    } else {
      setEditingActivity(null);
      setFormData({ status: 'active', priority: 'MEDIUM', activityType: 'INSPECTION' });
    }
    setErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingActivity(null);
    setFormData({});
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.activityCode?.trim()) newErrors.activityCode = '请输入活动编码';
    if (!formData.activityName?.trim()) newErrors.activityName = '请输入活动名称';
    if (!formData.activityType) newErrors.activityType = '请选择活动类型';
    if (!formData.startTime) newErrors.startTime = '请选择开始时间';
    if (!formData.endTime) newErrors.endTime = '请选择结束时间';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      if (editingActivity) {
        await editActivity(editingActivity.id, formData);
      } else {
        await addActivity(formData);
      }
      handleCloseModal();
    } catch (err) {
      // logger.error('保存农事活动失败:', err);
      await showAlert('保存农事活动失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (await showConfirm('确定要删除该农事活动吗？')) {
      try { await removeActivity(id); } catch (err) { await showAlert('删除失败'); }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
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
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">农事活动管理</h1>
              <p className="text-gray-500">管理农事任务派发、执行和记录</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: '总数', value: activities.length, color: 'bg-green-500' },
          { label: '待执行', value: activities.filter((a: FarmActivity) => a.status === 'active').length, color: 'bg-gray-500' },
          { label: '进行中', value: activities.filter((a: FarmActivity) => a.status === 'in_progress').length, color: 'bg-blue-500' },
          { label: '已完成', value: activities.filter((a: FarmActivity) => a.status === 'completed').length, color: 'bg-emerald-500' },
          { label: '已取消', value: activities.filter((a: FarmActivity) => a.status === 'cancelled').length, color: 'bg-red-500' },
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                <Sprout className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 gap-4 items-center">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索活动名称或编码..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="all">全部类型</option>
              {Object.entries(ACTIVITY_TYPES).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="all">全部状态</option>
              {Object.entries(STATUS_CONFIG).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </div>
          <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> 新增活动
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">活动编码</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">活动名称</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">基地/区块</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">执行时间</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">执行人</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">优先级</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map((activity: FarmActivity) => {
                const typeInfo = ACTIVITY_TYPES[activity.activityType || ''] || { label: activity.activityType || '-', color: 'bg-gray-100 text-gray-600' };
                const statusInfo = STATUS_CONFIG[activity.status || ''] || { label: activity.status || '-', color: 'bg-gray-100 text-gray-600', icon: Clock };
                const priorityInfo = PRIORITY_CONFIG[activity.priority || ''] || { label: activity.priority || '-', color: 'text-gray-600 bg-gray-50' };
                const StatusIcon = statusInfo.icon;
                const branchName = activity.branchOid || '';
                const zoneName = zones.find(z => z.oid === activity.blockOid)?.zoneName || '';
                return (
                  <tr key={activity.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-green-600">{activity.activityCode}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{activity.activityName}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-medium rounded-full ${typeInfo.color}`}>{typeInfo.label}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /><span>{branchName} {zoneName}</span></div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <div className="flex items-center gap-1"><Clock className="w-3 h-3" /><span>{activity.startTime || '-'}</span></div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <div className="flex items-center gap-1"><User className="w-3 h-3" /><span>{Array.isArray(activity.assigneeIds) ? activity.assigneeIds.join('、') : '-'}</span></div>
                    </td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-medium rounded ${priorityInfo.color}`}>{priorityInfo.label}</span></td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 w-fit ${statusInfo.color}`}>
                        <StatusIcon className="w-3 h-3" />{statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleOpenModal(activity)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="编辑"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(activity.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="删除"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-sm text-gray-500">显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredActivities.length)} 条，共 {filteredActivities.length} 条</p>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            pageSizeOptions={[10, 20, 50]}
            showPageSize
          />
        </div>
      </div>

      {showModal && (
        <Modal isOpen={showModal} onClose={handleCloseModal} title={editingActivity ? '编辑农事活动' : '新增农事活动'} onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="活动编码" required error={errors.activityCode}>
                <Input value={formData.activityCode || ''} onChange={(e) => setFormData({ ...formData, activityCode: e.target.value })} placeholder="如：FA202604001" />
              </FormField>
              <FormField label="活动名称" required error={errors.activityName}>
                <Input value={formData.activityName || ''} onChange={(e) => setFormData({ ...formData, activityName: e.target.value })} placeholder="请输入活动名称" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="活动类型" required error={errors.activityType}>
                <select value={formData.activityType || ''} onChange={(e) => setFormData({ ...formData, activityType: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">请选择</option>
                  {Object.entries(ACTIVITY_TYPES).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
                </select>
              </FormField>
              <FormField label="优先级">
                <select value={formData.priority || 'MEDIUM'} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="HIGH">高</option><option value="MEDIUM">中</option><option value="LOW">低</option>
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="所属基地">
                <Input value={formData.branchOid || ''} onChange={(e) => setFormData({ ...formData, branchOid: e.target.value })} placeholder="请输入基地名称" />
              </FormField>
              <FormField label="所属区块">
                <select value={formData.blockOid || ''} onChange={(e) => setFormData({ ...formData, blockOid: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">请选择</option>
                  {zoneOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="开始时间" required error={errors.startTime}>
                <Input type="datetime-local" value={formData.startTime || ''} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} />
              </FormField>
              <FormField label="结束时间" required error={errors.endTime}>
                <Input type="datetime-local" value={formData.endTime || ''} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} />
              </FormField>
            </div>
            <FormField label="备注说明">
              <Textarea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="请输入备注说明（可选）" rows={3} />
            </FormField>
          </div>
        </Modal>
      )}
    </div>
  );
}
