import { useState } from 'react';
import { UserPlus, Search, Filter, Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useOnboarding } from './hooks/useOnboarding';
import { OnboardingForm } from './OnboardingForm';
import type { OnboardingRecord, OnboardingFormData, OnboardingStatus } from './types';

const statusConfig = {
  '待入职': { color: 'bg-amber-100 text-amber-700', icon: Clock },
  '办理中': { color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  '已入职': { color: 'bg-green-100 text-green-700', icon: CheckCircle },
};

export function OnboardingPage() {
  const {
    data,
    filters,
    pagination,
    setFilters,
    setPage,
    setPageSize,
    createOnboarding,
    updateStatus,
    deleteOnboarding,
  } = useOnboarding();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OnboardingRecord | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<OnboardingRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [formData, setFormData] = useState<OnboardingFormData>({
    name: '',
    idCard: '',
    phone: '',
    position: '',
    department: '',
    contractType: '' as any,
    dailyWage: undefined,
    hourlyWage: undefined,
    joinDate: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // 当前用户模拟
  const currentUser = { id: 'u001', name: '张明' };

  // 打开新建弹窗
  const openCreateModal = () => {
    setEditingRecord(null);
    setFormData({
      name: '',
      idCard: '',
      phone: '',
      position: '',
      department: '',
      contractType: '' as any,
      dailyWage: undefined,
      hourlyWage: undefined,
      joinDate: '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  // 打开详情弹窗
  const openDetailModal = (record: OnboardingRecord) => {
    setSelectedRecord(record);
    setIsDetailOpen(true);
  };

  // 更新表单字段
  const updateFormField = (field: keyof OnboardingFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // 验证表单
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = '请输入姓名';
    if (!formData.idCard.trim()) errors.idCard = '请输入身份证号';
    if (!formData.phone.trim()) errors.phone = '请输入联系电话';
    if (!formData.position.trim()) errors.position = '请输入岗位';
    if (!formData.department.trim()) errors.department = '请输入部门';
    if (!formData.contractType) errors.contractType = '请选择合同类型';
    if (!formData.joinDate) errors.joinDate = '请选择入职日期';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 提交表单
  const handleSubmit = () => {
    if (!validateForm()) return;
    createOnboarding(formData, currentUser.id, currentUser.name);
    setIsFormOpen(false);
  };

  // 更新办理进度
  const handleProgress = (record: OnboardingRecord, newStatus: OnboardingStatus) => {
    if (newStatus === '办理中' && record.status === '待入职') {
      updateStatus(record.id, '办理中', currentUser.id, currentUser.name);
    } else if (newStatus === '已入职') {
      if (window.confirm('确定要完成入职办理吗？这将创建员工档案。')) {
        updateStatus(record.id, '已入职', currentUser.id, currentUser.name);
      }
    }
  };

  // 统计各状态数量
  const statusCounts = {
    待入职: data.filter((r) => r.status === '待入职').length,
    办理中: data.filter((r) => r.status === '办理中').length,
    已入职: data.filter((r) => r.status === '已入职').length,
  };

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">入职办理</h1>
              <p className="text-xs text-gray-500">招聘→入职闭环管理</p>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
          >
            <UserPlus className="w-4 h-4" />
            办理入职
          </button>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索姓名、身份证号、手机号..."
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">全部状态</option>
            <option value="待入职">待入职</option>
            <option value="办理中">办理中</option>
            <option value="已入职">已入职</option>
          </select>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">待入职</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{statusCounts.待入职}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">办理中</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{statusCounts.办理中}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已入职</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{statusCounts.已入职}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {/* 表格标题栏 */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">入职记录</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">姓名</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">岗位</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">合同类型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">入职日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-300">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                data.map((record) => {
                  const StatusIcon = statusConfig[record.status].icon;
                  return (
                    <tr key={record.id} className="hover:bg-blue-100 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <p className="font-medium text-gray-900">{record.name}</p>
                          <p className="text-sm text-gray-500">{record.phone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-gray-900">{record.position}</p>
                        <p className="text-sm text-gray-500">{record.department}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{record.contractType}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{record.joinDate}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[record.status].color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {record.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openDetailModal(record)}
                            className="px-3 py-1 text-sm text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            详情
                          </button>
                          {record.status === '待入职' && (
                            <button
                              onClick={() => handleProgress(record, '办理中')}
                              className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                            >
                              开始办理
                            </button>
                          )}
                          {record.status === '办理中' && (
                            <button
                              onClick={() => handleProgress(record, '已入职')}
                              className="px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded"
                            >
                              完成入职
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between mt-4 px-4 pb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>每页</span>
            <select
              value={pagination.pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value={10}>10条</option>
              <option value={20}>20条</option>
              <option value={50}>50条</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>共 {pagination.total} 条</span>
            <button
              onClick={() => setPage(Math.max(1, pagination.currentPage - 1))}
              disabled={pagination.currentPage === 1}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &lt;
            </button>
            <span className="text-sm font-medium text-emerald-600">{pagination.currentPage}/{Math.ceil(pagination.total / pagination.pageSize)}</span>
            <button
              onClick={() => setPage(Math.min(Math.ceil(pagination.total / pagination.pageSize), pagination.currentPage + 1))}
              disabled={pagination.currentPage >= Math.ceil(pagination.total / pagination.pageSize)}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* 新建/编辑弹窗 */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editingRecord ? '编辑入职' : '办理入职'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                ✕
              </button>
            </div>
            <div className="p-4">
              <OnboardingForm
                formData={formData}
                onChange={updateFormField}
                errors={formErrors}
                onSubmit={handleSubmit}
                onCancel={() => setIsFormOpen(false)}
                isEdit={!!editingRecord}
              />
            </div>
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
      {isDetailOpen && selectedRecord && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">入职详情</h2>
              <button onClick={() => setIsDetailOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                ✕
              </button>
            </div>
            <div className="p-4 space-y-6">
              {/* 基本信息 */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">基本信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">姓名</p>
                    <p className="font-medium">{selectedRecord.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">身份证号</p>
                    <p className="font-medium">{selectedRecord.idCard}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">联系电话</p>
                    <p className="font-medium">{selectedRecord.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">入职日期</p>
                    <p className="font-medium">{selectedRecord.joinDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">岗位</p>
                    <p className="font-medium">{selectedRecord.position}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">部门</p>
                    <p className="font-medium">{selectedRecord.department}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">合同类型</p>
                    <p className="font-medium">{selectedRecord.contractType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">状态</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[selectedRecord.status].color}`}>
                      {selectedRecord.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* 办理进度 */}
              {selectedRecord.progress && selectedRecord.progress.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">办理进度</h3>
                  <div className="space-y-3">
                    {selectedRecord.progress.map((step, index) => (
                      <div key={step.step} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          step.status === 'completed' ? 'bg-green-100 text-green-600' :
                          step.status === 'processing' ? 'bg-blue-100 text-blue-600' :
                          'bg-gray-100 text-gray-400'
                        }`}>
                          {step.status === 'completed' ? '✓' : step.step}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{step.name}</p>
                          {step.completedAt && (
                            <p className="text-sm text-gray-500">完成时间: {step.completedAt}</p>
                          )}
                        </div>
                        <span className={`text-xs ${
                          step.status === 'completed' ? 'text-green-600' :
                          step.status === 'processing' ? 'text-blue-600' :
                          'text-gray-400'
                        }`}>
                          {step.status === 'completed' ? '已完成' :
                           step.status === 'processing' ? '进行中' : '待处理'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
