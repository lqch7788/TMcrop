import { FileText, Search, AlertTriangle, Plus } from 'lucide-react';
import { useContract } from './hooks/useContract';
import { ContractFormModal } from './ContractFormModal';
import { ContractRemindModal } from './ContractRemindModal';
import type { Contract, ContractFormData, ContractStatus } from './types';
import { useState } from 'react';

const statusConfig: Record<ContractStatus, { color: string; bgColor: string }> = {
  '生效中': { color: 'text-green-700', bgColor: 'bg-green-100' },
  '即将到期': { color: 'text-amber-700', bgColor: 'bg-amber-100' },
  '已到期': { color: 'text-red-700', bgColor: 'bg-red-100' },
  '已终止': { color: 'text-gray-700', bgColor: 'bg-gray-100' },
};

export function ContractTable() {
  const {
    contracts,
    filters,
    pagination,
    setFilters,
    setPage,
    setPageSize,
    createContract,
    updateContract,
    terminateContract,
    deleteContract,
    getExpiringContracts,
  } = useContract();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [isRemindOpen, setIsRemindOpen] = useState(false);

  const [formData, setFormData] = useState<ContractFormData>({
    staffName: '',
    idCard: '',
    contractType: '' as any,
    startDate: '',
    endDate: '',
    monthlySalary: undefined,
    dailyWage: undefined,
    hourlyWage: undefined,
    signingDate: '',
    remarks: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // 计算合同状态
  const getComputedStatus = (contract: Contract): ContractStatus => {
    const today = new Date();
    const endDate = new Date(contract.endDate);
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (contract.status === '已终止') return '已终止';
    if (daysUntilExpiry < 0) return '已到期';
    if (daysUntilExpiry <= 30) return '即将到期';
    return '生效中';
  };

  // 打开新建弹窗
  const openCreateModal = () => {
    setEditingContract(null);
    setFormData({
      staffName: '',
      idCard: '',
      contractType: '' as any,
      startDate: '',
      endDate: '',
      monthlySalary: undefined,
      dailyWage: undefined,
      hourlyWage: undefined,
      signingDate: '',
      remarks: '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  // 打开编辑弹窗
  const openEditModal = (contract: Contract) => {
    setEditingContract(contract);
    setFormData({
      staffName: contract.staffName,
      idCard: contract.idCard,
      contractType: contract.contractType,
      startDate: contract.startDate,
      endDate: contract.endDate,
      monthlySalary: contract.monthlySalary,
      dailyWage: contract.dailyWage,
      hourlyWage: contract.hourlyWage,
      signingDate: contract.signingDate || '',
      remarks: contract.remarks || '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  // 更新表单字段
  const updateFormField = (field: keyof ContractFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // 验证表单
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.staffName.trim()) errors.staffName = '请输入员工姓名';
    if (!formData.idCard.trim()) errors.idCard = '请输入身份证号';
    if (!formData.contractType) errors.contractType = '请选择合同类型';
    if (!formData.startDate) errors.startDate = '请选择开始日期';
    if (!formData.endDate) errors.endDate = '请选择结束日期';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 提交表单
  const handleSubmit = () => {
    if (!validateForm()) return;
    if (editingContract) {
      updateContract(editingContract.id, formData);
    } else {
      createContract(formData);
    }
    setIsFormOpen(false);
  };

  // 终止合同
  const handleTerminate = (contract: Contract) => {
    const reason = window.prompt('请输入终止原因：');
    if (reason) {
      terminateContract(contract.id, reason);
    }
  };

  // 删除合同
  const handleDelete = (contract: Contract) => {
    if (window.confirm(`确定删除合同 "${contract.contractCode}" 吗？`)) {
      deleteContract(contract.id);
    }
  };

  // 统计各状态数量
  const expiringContracts = getExpiringContracts(30);
  const statusCounts = {
    生效中: contracts.filter((c) => getComputedStatus(c) === '生效中').length,
    即将到期: expiringContracts.length,
    已到期: contracts.filter((c) => getComputedStatus(c) === '已到期').length,
    已终止: contracts.filter((c) => getComputedStatus(c) === '已终止').length,
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">合同管理</h1>
              <p className="text-gray-500">劳动合同模板、签订存档、到期提醒</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsRemindOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors font-medium"
            >
              <AlertTriangle className="w-5 h-5" />
              到期提醒 ({expiringContracts.length})
            </button>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              新建合同
            </button>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索员工姓名、身份证号、合同编号..."
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
            <option value="生效中">生效中</option>
            <option value="即将到期">即将到期</option>
            <option value="已到期">已到期</option>
            <option value="已终止">已终止</option>
          </select>
          <select
            value={filters.contractType}
            onChange={(e) => setFilters({ ...filters, contractType: e.target.value as any })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">全部类型</option>
            <option value="劳动合同">劳动合同</option>
            <option value="实习协议">实习协议</option>
            <option value="劳务合同">劳务合同</option>
          </select>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">生效中</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{statusCounts.生效中}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">即将到期</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{statusCounts.即将到期}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">已到期</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{statusCounts.已到期}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">已终止</p>
          <p className="text-2xl font-bold text-gray-600 mt-1">{statusCounts.已终止}</p>
        </div>
      </div>

      {/* 合同表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">合同编号</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">员工姓名</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">合同类型</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">合同期限</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">状态</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {contracts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  暂无合同数据
                </td>
              </tr>
            ) : (
              contracts.map((contract) => {
                const computedStatus = getComputedStatus(contract);
                return (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{contract.contractCode}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900">{contract.staffName}</p>
                      <p className="text-sm text-gray-500">{contract.idCard}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{contract.contractType}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900">{contract.startDate}</p>
                      <p className="text-sm text-gray-500">至 {contract.endDate}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusConfig[computedStatus].bgColor} ${statusConfig[computedStatus].color}`}>
                        {computedStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(contract)}
                          className="px-3 py-1 text-sm text-emerald-600 hover:bg-emerald-50 rounded"
                        >
                          编辑
                        </button>
                        {computedStatus !== '已终止' && computedStatus !== '已到期' && (
                          <button
                            onClick={() => handleTerminate(contract)}
                            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                          >
                            终止
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(contract)}
                          className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* 分页 */}
        <div className="px-4 py-3 border-t flex items-center justify-between">
          <div className="text-sm text-gray-500">
            共 {pagination.total} 条，第 {pagination.currentPage} / {Math.ceil(pagination.total / pagination.pageSize)} 页
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              上一页
            </button>
            <button
              onClick={() => setPage(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= Math.ceil(pagination.total / pagination.pageSize)}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      </div>

      {/* 新建/编辑弹窗 */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editingContract ? '编辑合同' : '新建合同'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                ✕
              </button>
            </div>
            <div className="p-4">
              <ContractFormModal
                formData={formData}
                onChange={updateFormField}
                errors={formErrors}
                onSubmit={handleSubmit}
                onCancel={() => setIsFormOpen(false)}
                isEdit={!!editingContract}
              />
            </div>
          </div>
        </div>
      )}

      {/* 到期提醒弹窗 */}
      <ContractRemindModal
        expiringContracts={expiringContracts}
        open={isRemindOpen}
        onClose={() => setIsRemindOpen(false)}
      />
    </div>
  );
}
