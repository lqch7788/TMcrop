/**
 * 农事活动管理页面
 * 功能：农事活动的新增、编辑、删除、查询、派工
 * 作为系统设置的子页面
 */

import { useState } from 'react';
import {
  Sprout, Plus, Edit, Trash2, Search, ChevronLeft, ChevronRight,
  Calendar, User, MapPin, Clock, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import { Modal, FormField, Input, Select, Textarea } from '../components/ui/Modal';

// 农事活动类型
type ActivityType = 'SEEDING' | 'WATERING' | 'FERTILIZING' | 'PEST_CONTROL' | 'HARVESTING' | 'WEEDING' | 'PRUNING' | 'INSPECTION';
type ActivityStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

// 农事活动数据
interface FarmActivity {
  id: string;
  code: string;
  name: string;
  type: ActivityType;
  branchId: string;
  branchName: string;
  blockId: string;
  blockName: string;
  planId?: string;
  planName?: string;
  startTime: string;
  endTime: string;
  status: ActivityStatus;
  priority: Priority;
  assigneeIds: string[];
  assigneeNames: string[];
  description?: string;
  actualDuration?: number;
}

// 活动类型映射
const activityTypeMap: Record<ActivityType, { label: string; color: string }> = {
  SEEDING: { label: '播种', color: 'bg-emerald-100 text-emerald-700' },
  WATERING: { label: '灌溉', color: 'bg-blue-100 text-blue-700' },
  FERTILIZING: { label: '施肥', color: 'bg-amber-100 text-amber-700' },
  PEST_CONTROL: { label: '病虫害防治', color: 'bg-red-100 text-red-700' },
  HARVESTING: { label: '采收', color: 'bg-purple-100 text-purple-700' },
  WEEDING: { label: '除草', color: 'bg-green-100 text-green-700' },
  PRUNING: { label: '修剪', color: 'bg-orange-100 text-orange-700' },
  INSPECTION: { label: '巡田', color: 'bg-cyan-100 text-cyan-700' },
};

// 状态映射
const statusMap: Record<ActivityStatus, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: '待执行', color: 'bg-gray-100 text-gray-600', icon: Clock },
  IN_PROGRESS: { label: '进行中', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  COMPLETED: { label: '已完成', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  CANCELLED: { label: '已取消', color: 'bg-red-100 text-red-700', icon: XCircle },
};

// 优先级映射
const priorityMap: Record<Priority, { label: string; color: string }> = {
  HIGH: { label: '高', color: 'text-red-600 bg-red-50' },
  MEDIUM: { label: '中', color: 'text-amber-600 bg-amber-50' },
  LOW: { label: '低', color: 'text-gray-600 bg-gray-50' },
};

// 活动类型选项
const activityTypeOptions = Object.entries(activityTypeMap).map(([value, { label }]) => ({ value, label }));
// 基地选项
const branchOptions = [
  { value: '1', label: '一号种植基地' },
  { value: '2', label: '二号种植基地' },
  { value: '3', label: '三号种植基地' },
];
// 区块选项
const blockOptions = [
  { value: '1', label: 'A区-1号区块' },
  { value: '2', label: 'A区-2号区块' },
  { value: '3', label: 'B区-1号区块' },
  { value: '4', label: 'B区-2号区块' },
  { value: '5', label: 'C区-1号区块' },
];
// 员工选项
const employeeOptions = [
  { value: 'U006', label: '陈小芳' },
  { value: 'U007', label: '周志强' },
  { value: 'U008', label: '吴美丽' },
  { value: 'U009', label: '郑胜利' },
  { value: 'U011', label: '马超' },
];

// 模拟数据
const mockActivities: FarmActivity[] = [
  { id: '1', code: 'FA202404001', name: '番茄地块浇水', type: 'WATERING', branchId: '1', branchName: '一号种植基地', blockId: '1', blockName: 'A区-1号区块', startTime: '2024-04-15 08:00', endTime: '2024-04-15 10:00', status: 'PENDING', priority: 'MEDIUM', assigneeIds: ['U006'], assigneeNames: ['陈小芳'], description: '根据土壤湿度情况进行灌溉' },
  { id: '2', code: 'FA202404002', name: '黄瓜地块施肥', type: 'FERTILIZING', branchId: '1', branchName: '一号种植基地', blockId: '2', blockName: 'A区-2号区块', startTime: '2024-04-14 14:00', endTime: '2024-04-14 17:00', status: 'COMPLETED', priority: 'HIGH', assigneeIds: ['U007', 'U008'], assigneeNames: ['周志强', '吴美丽'], actualDuration: 3 },
  { id: '3', code: 'FA202404003', name: '生菜地块采收', type: 'HARVESTING', branchId: '2', branchName: '二号种植基地', blockId: '3', blockName: 'B区-1号区块', startTime: '2024-04-16 06:00', endTime: '2024-04-16 12:00', status: 'IN_PROGRESS', priority: 'HIGH', assigneeIds: ['U008', 'U009', 'U011'], assigneeNames: ['吴美丽', '郑胜利', '马超'] },
  { id: '4', code: 'FA202404004', name: '草莓地块巡田', type: 'INSPECTION', branchId: '3', branchName: '三号种植基地', blockId: '5', blockName: 'C区-1号区块', startTime: '2024-04-15 09:00', endTime: '2024-04-15 11:00', status: 'PENDING', priority: 'LOW', assigneeIds: ['U004'], assigneeNames: ['赵文静'] },
];

export default function FarmActivityManagement() {
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activities, setActivities] = useState<FarmActivity[]>(mockActivities);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<FarmActivity | null>(null);
  const [formData, setFormData] = useState<Partial<FarmActivity>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredActivities = activities.filter(activity => {
    const matchSearch = !searchText ||
      activity.name.toLowerCase().includes(searchText.toLowerCase()) ||
      activity.code.toLowerCase().includes(searchText.toLowerCase());
    const matchType = typeFilter === 'all' || activity.type === typeFilter;
    const matchStatus = statusFilter === 'all' || activity.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const totalPages = Math.ceil(filteredActivities.length / pageSize);
  const paginatedActivities = filteredActivities.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleOpenModal = (activity?: FarmActivity) => {
    if (activity) {
      setEditingActivity(activity);
      setFormData(activity);
    } else {
      setEditingActivity(null);
      setFormData({ status: 'PENDING', priority: 'MEDIUM', type: 'INSPECTION' });
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
    if (!formData.code?.trim()) newErrors.code = '请输入活动编码';
    if (!formData.name?.trim()) newErrors.name = '请输入活动名称';
    if (!formData.type) newErrors.type = '请选择活动类型';
    if (!formData.branchId) newErrors.branchId = '请选择所属基地';
    if (!formData.blockId) newErrors.blockId = '请选择所属区块';
    if (!formData.startTime) newErrors.startTime = '请选择开始时间';
    if (!formData.endTime) newErrors.endTime = '请选择结束时间';
    if (formData.assigneeIds?.length === 0) newErrors.assignees = '请选择执行人员';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const branch = branchOptions.find(b => b.value === formData.branchId);
    const block = blockOptions.find(b => b.value === formData.blockId);
    const employees = employeeOptions.filter(e => formData.assigneeIds?.includes(e.value));

    if (editingActivity) {
      setActivities(activities.map(a =>
        a.id === editingActivity.id ? {
          ...a, ...formData,
          branchName: branch?.label || a.branchName,
          blockName: block?.label || a.blockName,
          assigneeNames: employees.map(e => e.label)
        } as FarmActivity : a
      ));
    } else {
      const newActivity: FarmActivity = {
        id: String(activities.length + 1),
        code: formData.code!,
        name: formData.name!,
        type: formData.type as ActivityType,
        branchId: formData.branchId!,
        branchName: branch?.label || '',
        blockId: formData.blockId!,
        blockName: block?.label || '',
        startTime: formData.startTime!,
        endTime: formData.endTime!,
        status: (formData.status as ActivityStatus) || 'PENDING',
        priority: (formData.priority as Priority) || 'MEDIUM',
        assigneeIds: formData.assigneeIds || [],
        assigneeNames: employees.map(e => e.label),
        description: formData.description,
      };
      setActivities([newActivity, ...activities]);
    }
    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除该农事活动吗？')) {
      setActivities(activities.filter(a => a.id !== id));
    }
  };

  const handleStatusChange = (id: string, newStatus: ActivityStatus) => {
    setActivities(activities.map(a =>
      a.id === id ? { ...a, status: newStatus } : a
    ));
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <Sprout className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">农事活动管理</h1>
            <p className="text-gray-500">管理农事任务派发、执行和记录</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: '总数', value: activities.length, color: 'bg-green-500' },
          { label: '待执行', value: activities.filter(a => a.status === 'PENDING').length, color: 'bg-gray-500' },
          { label: '进行中', value: activities.filter(a => a.status === 'IN_PROGRESS').length, color: 'bg-blue-500' },
          { label: '已完成', value: activities.filter(a => a.status === 'COMPLETED').length, color: 'bg-emerald-500' },
          { label: '已取消', value: activities.filter(a => a.status === 'CANCELLED').length, color: 'bg-red-500' },
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

      {/* 筛选和操作栏 */}
      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 gap-4 items-center">
            {/* 搜索框 */}
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

            {/* 类型筛选 */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">全部类型</option>
              {activityTypeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* 状态筛选 */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">全部状态</option>
              <option value="PENDING">待执行</option>
              <option value="IN_PROGRESS">进行中</option>
              <option value="COMPLETED">已完成</option>
              <option value="CANCELLED">已取消</option>
            </select>
          </div>

          {/* 新增按钮 */}
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增活动
          </button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">活动编码</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">活动名称</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">所属基地/区块</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">执行时间</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">执行人</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">优先级</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedActivities.map((activity) => {
                const typeInfo = activityTypeMap[activity.type];
                const statusInfo = statusMap[activity.status];
                const priorityInfo = priorityMap[activity.priority];
                const StatusIcon = statusInfo.icon;
                return (
                  <tr key={activity.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-green-600">{activity.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{activity.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{activity.blockName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{activity.startTime}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{activity.assigneeNames.join('、')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${priorityInfo.color}`}>
                        {priorityInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 w-fit ${statusInfo.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(activity)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(activity.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredActivities.length)} 条，共 {filteredActivities.length} 条
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-sm font-medium">{currentPage} / {totalPages || 1}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={editingActivity ? '编辑农事活动' : '新增农事活动'}
          onConfirm={handleSubmit}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="活动编码" required error={errors.code}>
                <Input
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="如：FA202404001"
                />
              </FormField>
              <FormField label="活动名称" required error={errors.name}>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入活动名称"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="活动类型" required error={errors.type}>
                <select
                  value={formData.type || ''}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as ActivityType })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">请选择活动类型</option>
                  {activityTypeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="优先级">
                <select
                  value={formData.priority || 'MEDIUM'}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="HIGH">高</option>
                  <option value="MEDIUM">中</option>
                  <option value="LOW">低</option>
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="所属基地" required error={errors.branchId}>
                <select
                  value={formData.branchId || ''}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">请选择所属基地</option>
                  {branchOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="所属区块" required error={errors.blockId}>
                <select
                  value={formData.blockId || ''}
                  onChange={(e) => setFormData({ ...formData, blockId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">请选择所属区块</option>
                  {blockOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="开始时间" required error={errors.startTime}>
                <Input
                  type="datetime-local"
                  value={formData.startTime || ''}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </FormField>
              <FormField label="结束时间" required error={errors.endTime}>
                <Input
                  type="datetime-local"
                  value={formData.endTime || ''}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </FormField>
            </div>

            <FormField label="执行人员" required error={errors.assignees}>
              <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                {employeeOptions.map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.assigneeIds?.includes(opt.value) || false}
                      onChange={(e) => {
                        const currentIds = formData.assigneeIds || [];
                        const newIds = e.target.checked
                          ? [...currentIds, opt.value]
                          : currentIds.filter(id => id !== opt.value);
                        setFormData({ ...formData, assigneeIds: newIds });
                      }}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </FormField>

            <FormField label="备注说明">
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="请输入备注说明（可选）"
                rows={3}
              />
            </FormField>
          </div>
        </Modal>
      )}
    </div>
  );
}
