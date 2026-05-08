// 供应商管理主页面组件
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from './PageHeader';
import SupplierFilters, { filterSuppliers } from './SupplierFilters';
import SupplierTable from './SupplierTable';
import ActionToolbar from './ActionToolbar';
import SupplierDetailModal from './SupplierDetailModal';
import SupplierEditModal from './SupplierEditModal';
import SupplierAddModal from './SupplierAddModal';
import SupplierBatchEditModal from './SupplierBatchEditModal';
import SupplierExportModal from './SupplierExportModal';
import SupplierCodeGenerator from './SupplierCodeGenerator';
import { DeleteWarningDialog, BatchDeleteConfirmDialog } from './DeleteDialogs';
import { Supplier, SupplierFiltersState } from './types';
import { suppliers as initialSuppliers, getSupplierTypeName } from './data';
import { Button } from '../../components/ui/button';

export default function SupplierManagementPage() {
  const navigate = useNavigate();

  // 状态定义
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [filters, setFilters] = useState<SupplierFiltersState>({
    code: '',
    name: '',
    contact: '',
    type: '全部',
    status: '全部',
    supplierAttribute: '全部',
    organization: '全部'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');

  // 弹窗状态
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showCodeGen, setShowCodeGen] = useState(false);

  // 当前选中的供应商
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [generatedCode, setGeneratedCode] = useState('');

  // 筛选后的供应商
  const filteredSuppliers = useMemo(() => filterSuppliers(suppliers, filters), [suppliers, filters]);

  // 筛选变化处理
  const handleFilterChange = (key: keyof SupplierFiltersState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({ code: '', name: '', contact: '', type: '全部', status: '全部', supplierAttribute: '全部', organization: '全部' });
    setCurrentPage(1);
  };

  // 工具栏操作
  const handleAdd = () => {
    setShowCodeGen(true);
  };

  const handleBatchEdit = () => {
    if (selectedRows.length === 0) {
      alert('请先选择要编辑的供应商');
      return;
    }
    setBatchEditMode(true);
    setDeleteMode(false);
    setExportMode(false);
    setShowBatchEditModal(true);
  };

  const handleDelete = () => {
    if (selectedRows.length === 0) {
      alert('请先选择要删除的供应商');
      return;
    }
    setBatchEditMode(false);
    setDeleteMode(true);
    setExportMode(false);
    setShowBatchDeleteConfirm(true);
  };

  const handleExport = () => {
    setBatchEditMode(false);
    setDeleteMode(false);
    setExportMode(true);
    setSelectedRows([]);
  };

  // 批量操作确认
  const handleConfirmBatchEdit = () => {
    setBatchEditMode(false);
    setShowBatchEditModal(false);
    setSelectedRows([]);
  };

  const handleCancelBatchEdit = () => {
    setBatchEditMode(false);
    setShowBatchEditModal(false);
    setSelectedRows([]);
  };

  const handleCancelDelete = () => {
    setDeleteMode(false);
    setShowBatchDeleteConfirm(false);
    setSelectedRows([]);
  };

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  const handleConfirmExport = () => {
    setShowExportModal(true);
  };

  // 表格操作
  const handleSelectAll = () => {
    if (selectedRows.length === filteredSuppliers.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredSuppliers.map(s => s.id));
    }
  };

  const handleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const handleView = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailModal(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowEditModal(true);
  };

  const handleDeleteSingle = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDeleteWarning(true);
  };

  // 保存操作
  const handleSaveEdit = (updatedSupplier: Supplier) => {
    setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
    setShowEditModal(false);
  };

  const handleSaveAdd = (newSupplier: Supplier) => {
    setSuppliers(prev => [...prev, newSupplier]);
    setShowAddModal(false);
  };

  const handleSaveBatchEdit = (updates: Record<number, Partial<Supplier>>) => {
    setSuppliers(prev => prev.map(s => {
      if (updates[s.id]) {
        return { ...s, ...updates[s.id] };
      }
      return s;
    }));
    setSelectedRows([]);
    setBatchEditMode(false);
  };

  const handleConfirmDelete = () => {
    if (selectedSupplier) {
      setSuppliers(prev => prev.filter(s => s.id !== selectedSupplier.id));
      setSelectedSupplier(null);
    }
    setShowDeleteWarning(false);
  };

  const handleConfirmBatchDelete = () => {
    setSuppliers(prev => prev.filter(s => !selectedRows.includes(s.id)));
    setSelectedRows([]);
    setShowBatchDeleteConfirm(false);
  };

  // 导出操作
  const handleDoExport = () => {
    const selectedData = selectedRows.length > 0
      ? suppliers.filter(s => selectedRows.includes(s.id))
      : filteredSuppliers;

    const headers = ['供应商编号', '所属组织', '供应商名称', '供应物资类型', '供应商属性', '联系人', '移动电话', '工作电话', '传真号码', '国家', '省份', '城市', '详细地址', '状态', '开户行', '银行卡号', '创建时间', '备注'];
    const exportData = selectedData.map(row => ({
      '供应商编号': row.code,
      '所属组织': row.organization,
      '供应商名称': row.name,
      '供应物资类型': getSupplierTypeName(row.supplierType),
      '供应商属性': row.supplierAttribute,
      '联系人': row.contact,
      '移动电话': row.mobilePhone,
      '工作电话': row.workPhone || '',
      '传真号码': row.fax || '',
      '国家': row.country,
      '省份': row.province,
      '城市': row.city,
      '详细地址': row.address,
      '状态': row.status,
      '开户行': row.bankName || '',
      '银行卡号': row.bankCardNumber || '',
      '创建时间': row.createDate,
      '备注': row.remarks || ''
    }));

    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      content = headers.join(',') + '\n' + exportData.map(row =>
        headers.map(h => `"${row[h] || ''}"`).join(',')
      ).join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      const bankCardIndex = headers.indexOf('银行卡号');
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map((h, i) => {
        const value = row[h] || '';
        if (i === bankCardIndex && value) {
          return `<td style="mso-number-format:\\@">${value}</td>`;
        }
        return `<td>${value}</td>`;
      }).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      const bankCardIndex = headers.indexOf('银行卡号');
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers.map(h => `<th>${h}</th>`).join('')}${exportData.map(row => `<tr>${headers.map((h, i) => {
        const value = row[h] || '';
        if (i === bankCardIndex && value) {
          return `<td style="mso-number-format:\\@">${value}</td>`;
        }
        return `<td>${value}</td>`;
      }).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/msword;charset=utf-8';
      extension = 'doc';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `供应商数据_${new Date().toISOString().split('T')[0]}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setShowExportModal(false);
    setExportMode(false);
    setSelectedRows([]);
  };

  // 编码生成
  const handleCodeGenerated = (code: string) => {
    setGeneratedCode(code);
    setShowAddModal(true);
  };

  return (
    <div className="space-y-4 p-6">
      {/* 页头 */}
      <PageHeader />

      {/* 筛选 */}
      <SupplierFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* 工具栏 */}
      <ActionToolbar
        batchEditMode={batchEditMode}
        deleteMode={deleteMode}
        exportMode={exportMode}
        selectedRows={selectedRows}
        onBatchEdit={handleBatchEdit}
        onDelete={handleDelete}
        onExport={handleExport}
        onAdd={handleAdd}
        onConfirmBatchEdit={handleConfirmBatchEdit}
        onCancelBatchEdit={handleCancelBatchEdit}
        onConfirmDelete={() => setShowBatchDeleteConfirm(true)}
        onCancelDelete={handleCancelDelete}
        onConfirmExport={handleConfirmExport}
        onCancelExport={handleCancelExport}
      />

      {/* 表格 */}
      <SupplierTable
        suppliers={filteredSuppliers}
        currentPage={currentPage}
        pageSize={pageSize}
        selectedRows={selectedRows}
        exportMode={exportMode}
        batchEditMode={batchEditMode}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDeleteSingle}
      />

      {/* 编码生成器侧边栏 */}
      {showCodeGen && (
        <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowCodeGen(false)} />
      )}
      {showCodeGen && (
        <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">供应商编码生成</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowCodeGen(false)}>
              ✕
            </Button>
          </div>
          <SupplierCodeGenerator onCodeGenerated={handleCodeGenerated} />
        </div>
      )}

      {/* 弹窗 */}
      <SupplierDetailModal
        isOpen={showDetailModal}
        supplier={selectedSupplier}
        onClose={() => setShowDetailModal(false)}
      />

      <SupplierEditModal
        isOpen={showEditModal}
        supplier={selectedSupplier}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveEdit}
      />

      <SupplierAddModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleSaveAdd}
        generatedCode={generatedCode}
      />

      <SupplierBatchEditModal
        isOpen={showBatchEditModal}
        suppliers={suppliers}
        selectedIds={selectedRows}
        onClose={() => setShowBatchEditModal(false)}
        onSave={handleSaveBatchEdit}
      />

      <SupplierExportModal
        isOpen={showExportModal}
        exportFormat={exportFormat}
        selectedCount={selectedRows.length || filteredSuppliers.length}
        onClose={() => setShowExportModal(false)}
        onFormatChange={setExportFormat}
        onExport={handleDoExport}
      />

      <DeleteWarningDialog
        isOpen={showDeleteWarning}
        onClose={() => setShowDeleteWarning(false)}
        onConfirm={handleConfirmDelete}
      />

      <BatchDeleteConfirmDialog
        isOpen={showBatchDeleteConfirm}
        count={selectedRows.length}
        onClose={() => setShowBatchDeleteConfirm(false)}
        onConfirm={handleConfirmBatchDelete}
      />
    </div>
  );
}
