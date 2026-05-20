import { FileText, Search, AlertTriangle, Plus, ChevronLeft, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import { useContract } from './hooks/useContract';
import { ContractFormModal } from './ContractFormModal';
import { ContractRemindModal } from './ContractRemindModal';
import { ContractBatchEditModal } from './ContractBatchEditModal';
import { Label, Modal, UnifiedModal, Checkbox, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import type { Contract, ContractFormData, ContractStatus } from './types';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

// 导出格式弹窗 - 使用 UnifiedModal 包装
interface ExportFormatModalProps {
  isOpen: boolean;
  exportFormat: string;
  selectedCount: number;
  onFormatChange: (format: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

function ExportFormatModal({ isOpen, exportFormat, selectedCount, onFormatChange, onClose, onConfirm }: ExportFormatModalProps) {
  const exportFormats = [
    { value: 'excel', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
    { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
    { value: 'word', label: 'Word (.docx)', desc: '适用于文档编辑和分享' },
  ];

  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title="选择导出格式" size="md" showFooter={false}>
      <p className="text-sm text-gray-500 mb-4">已选择 {selectedCount} 条数据</p>
      <div className="space-y-3">
        {exportFormats.map((format) => (
          <Label
            key={format.value}
            onClick={() => onFormatChange(format.value)}
            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
              exportFormat === format.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${exportFormat === format.value ? 'border-emerald-600' : 'border-gray-300'}`}>
              {exportFormat === format.value && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{format.label}</p>
              <p className="text-xs text-gray-500">{format.desc}</p>
            </div>
          </Label>
        ))}
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <Button variant="secondary" onClick={onClose}>取消</Button>
        <Button onClick={onConfirm}>导出</Button>
      </div>
    </UnifiedModal>
  );
}

// 删除确认弹窗 - 使用 UnifiedModal 包装
interface DeleteWarningModalProps {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteWarningModal({ isOpen, selectedCount, onClose, onConfirm }: DeleteWarningModalProps) {
  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title="删除合同警告" size="sm" showFooter={false}>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <Trash2 className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">删除合同警告</h3>
        </div>
      </div>
      <div className="text-sm text-gray-600 space-y-3 mb-6">
        <p>确定要删除选中的 <strong>{selectedCount}</strong> 个合同吗？</p>
        <p>此操作 <strong className="text-red-600">无法恢复</strong>，删除后数据将永久丢失。</p>
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onClose}>取消</Button>
        <Button variant="destructive" onClick={onConfirm}>确认删除</Button>
      </div>
    </UnifiedModal>
  );
}

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

  // 批量操作状态
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [isRemindOpen, setIsRemindOpen] = useState(false);

  // 批量编辑状态
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [editedRecordIds, setEditedRecordIds] = useState<string[]>([]);
  const [editedRecords, setEditedRecords] = useState<Record<string, Partial<Contract>>>({});
  const [selectedRecordId, setSelectedRecordId] = useState('');

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

  // 批量选择操作
  const handleSelectAll = () => {
    if (selectedRows.length === contracts.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(contracts.map(c => c.id));
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // 批量删除
  const handleBatchDelete = () => {
    setShowDeleteWarning(true);
  };

  const handleDeleteConfirm = () => {
    selectedRows.forEach(id => deleteContract(id));
    setSelectedRows([]);
    setShowDeleteWarning(false);
    setBatchDeleteMode(false);
  };

  // 导出
  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  const handleConfirmExport = () => {
    if (selectedRows.length === 0) {
      alert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  };

  const handleDoExport = () => {
    const selectedData = contracts.filter(c => selectedRows.includes(c.id));
    const headers = ['合同编号', '员工姓名', '身份证号', '合同类型', '开始日期', '结束日期', '状态'];
    const exportData = selectedData.map(row => ({
      '合同编号': row.contractCode,
      '员工姓名': row.staffName,
      '身份证号': row.idCard,
      '合同类型': row.contractType,
      '开始日期': row.startDate,
      '结束日期': row.endDate,
      '状态': getComputedStatus(row),
    }));

    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      content = headers.join(',') + '\n' + exportData.map(row =>
        headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
      ).join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h as keyof typeof row] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers.map(h => `<th>${h}</th>`).join('')}${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h as keyof typeof row] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `合同记录_${new Date().toISOString().slice(0, 10)}.${extension}`;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    setExportMode(false);
    setSelectedRows([]);
    setShowExportModal(false);
  };

  // 取消批量操作
  const handleCancelBatch = () => {
    setBatchEditMode(false);
    setBatchDeleteMode(false);
    setExportMode(false);
    setSelectedRows([]);
    setEditedRecordIds([]);
    setEditedRecords({});
    setSelectedRecordId('');
  };

  const allSelected = selectedRows.length === contracts.length && contracts.length > 0;

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">合同管理</h1>
              <p className="text-xs text-gray-500">劳动合同模板、签订存档、到期提醒</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="warning"
              size="sm"
              onClick={() => setIsRemindOpen(true)}
            >
              <AlertTriangle className="w-4 h-4" />
              到期提醒 ({expiringContracts.length})
            </Button>
            <Button size="sm" onClick={openCreateModal}>
              <Plus className="w-4 h-4" />
              新建合同
            </Button>
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
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {/* 表格标题栏 */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">合同记录</h3>
          <div className="flex gap-2">
            {(batchEditMode || batchDeleteMode || exportMode) ? (
              <>
                {batchEditMode && (
                  <>
                    <Button
                      size="sm"
                      variant="blue"
                      onClick={() => setShowBatchEditModal(true)}
                      disabled={selectedRows.length === 0}
                    >
                      <Edit2 className="w-4 h-4" />
                      批量编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleCancelBatch}
                    >
                      取消
                    </Button>
                  </>
                )}
                {batchDeleteMode && (
                  <>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleBatchDelete}
                      disabled={selectedRows.length === 0}
                    >
                      <Trash2 className="w-4 h-4" />
                      确认删除
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleCancelBatch}
                    >
                      取消
                    </Button>
                  </>
                )}
                {exportMode && (
                  <>
                    <Button
                      size="sm"
                      onClick={handleConfirmExport}
                      disabled={selectedRows.length === 0}
                    >
                      确认导出
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleCancelExport}
                    >
                      取消
                    </Button>
                  </>
                )}
              </>
            ) : (
              <>
                <Button size="sm" onClick={openCreateModal}>
                  <Plus className="w-4 h-4" />
                  新增
                </Button>
                <Button size="sm" variant="blue" onClick={() => setBatchEditMode(true)}>
                  <Edit2 className="w-4 h-4" />
                  编辑
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setBatchDeleteMode(true)}>
                  <Trash2 className="w-4 h-4" />
                  删除
                </Button>
                <Button size="sm" onClick={handleExportClick}>
                  导出
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <TableRow>
              {(exportMode || batchEditMode || batchDeleteMode) && (
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => handleSelectAll()}
                  />
                </TableHead>
              )}
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">合同编号</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">员工姓名</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">合同类型</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">合同期限</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white divide-y divide-gray-300">
            {contracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  暂无合同数据
                </TableCell>
              </TableRow>
            ) : (
              contracts.map((contract) => {
                const computedStatus = getComputedStatus(contract);
                return (
                  <TableRow key={contract.id} className="hover:bg-blue-100 transition-colors">
                    {(exportMode || batchEditMode || batchDeleteMode) && (
                      <TableCell className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedRows.includes(contract.id)}
                          onCheckedChange={() => handleSelectRow(contract.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{contract.contractCode}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <p className="text-gray-900">{contract.staffName}</p>
                      <p className="text-sm text-gray-500">{contract.idCard}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-gray-600">{contract.contractType}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <p className="text-gray-900">{contract.startDate}</p>
                      <p className="text-sm text-gray-500">至 {contract.endDate}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusConfig[computedStatus].bgColor} ${statusConfig[computedStatus].color}`}>
                        {computedStatus}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditModal(contract)}
                        >
                          编辑
                        </Button>
                        {computedStatus !== '已终止' && computedStatus !== '已到期' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleTerminate(contract)}
                          >
                            终止
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(contract)}
                        >
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          </Table>
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
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setPage(Math.max(1, pagination.currentPage - 1))}
              disabled={pagination.currentPage === 1}
            >
              &lt;
            </Button>
            <span className="text-sm font-medium text-emerald-600">{pagination.currentPage}/{Math.ceil(pagination.total / pagination.pageSize)}</span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setPage(Math.min(Math.ceil(pagination.total / pagination.pageSize), pagination.currentPage + 1))}
              disabled={pagination.currentPage >= Math.ceil(pagination.total / pagination.pageSize)}
            >
              &gt;
            </Button>
          </div>
        </div>
      </div>

      {/* 新建/编辑弹窗 */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingContract ? '编辑合同' : '新建合同'}
        size="lg"
        showFooter={false}
      >
        <ContractFormModal
          formData={formData}
          onChange={updateFormField}
          errors={formErrors}
          onSubmit={handleSubmit}
          onCancel={() => setIsFormOpen(false)}
          isEdit={!!editingContract}
        />
      </Modal>

      {/* 到期提醒弹窗 */}
      <ContractRemindModal
        expiringContracts={expiringContracts}
        open={isRemindOpen}
        onClose={() => setIsRemindOpen(false)}
      />

      {/* 删除确认弹窗 */}
      <DeleteWarningModal
        isOpen={showDeleteWarning}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteWarning(false)}
        onConfirm={handleDeleteConfirm}
      />

      {/* 导出格式选择弹窗 */}
      <ExportFormatModal
        isOpen={showExportModal}
        exportFormat={exportFormat}
        selectedCount={selectedRows.length}
        onFormatChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleDoExport}
      />

      {/* 批量编辑弹窗 */}
      <ContractBatchEditModal
        isOpen={showBatchEditModal}
        selectedRows={selectedRows}
        records={contracts}
        editedRecordIds={editedRecordIds}
        editedRecords={editedRecords}
        selectedRecordId={selectedRecordId}
        onSelectedRecordIdChange={setSelectedRecordId}
        onEditedRecordsChange={setEditedRecords}
        onEditedRecordIdsChange={setEditedRecordIds}
        onClose={() => setShowBatchEditModal(false)}
        onConfirm={() => {
          setShowBatchEditModal(false);
          handleCancelBatch();
        }}
        onConfirmNext={() => {
          if (selectedRecordId && !editedRecordIds.includes(selectedRecordId)) {
            setEditedRecordIds([...editedRecordIds, selectedRecordId]);
          }
          const currentIndex = selectedRows.findIndex(r => r === selectedRecordId);
          const nextRecord = selectedRows[currentIndex + 1];
          if (nextRecord) {
            setSelectedRecordId(nextRecord);
          } else {
            setShowBatchEditModal(false);
            handleCancelBatch();
          }
        }}
      />
    </div>
  );
}
