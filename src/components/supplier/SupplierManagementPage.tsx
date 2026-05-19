import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Download, ChevronDown, ChevronRight } from 'lucide-react';
import PageHeader from './PageHeader';
import SupplierFilters, { filterSuppliers } from './SupplierFilters';
import SupplierTable from './SupplierTable';
import SupplierDetailModal from './SupplierDetailModal';
import SupplierEditModal from './SupplierEditModal';
import SupplierAddModal from './SupplierAddModal';
import SupplierBatchEditModal from './SupplierBatchEditModal';
import SupplierExportModal from './SupplierExportModal';
import SupplierCodeGenerator from './SupplierCodeGenerator';
import { DeleteWarningDialog, BatchDeleteConfirmDialog } from './DeleteDialogs';
import { Supplier, SupplierFiltersState } from './types';
import { getSupplierTypeName } from './data';
import { Button } from '../../components/ui/button';
import { useSupplierStore } from '../../stores';

export default function SupplierManagementPage() {
  const navigate = useNavigate();

  // 数据从 Zustand Store 获取
  const {
    items: suppliers,
    isLoading,
    loadItems,
    addItem: storeAddItem,
    updateItem: storeUpdateItem,
    deleteItem: storeDeleteItem,
    deleteItems: storeDeleteItems,
  } = useSupplierStore();

  // 初始化加载
  useEffect(() => { loadItems(); }, [loadItems]);

  // 本地 UI 状态
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

  // 当前选中的供应商
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // 批量编辑状态（逐条编辑+累积保存模式，参照物料入库）
  const [batchEditedSuppliers, setBatchEditedSuppliers] = useState<Record<number, Partial<Supplier>>>({});
  const [currentBatchEditIndex, setCurrentBatchEditIndex] = useState(0);

  // 编码生成器状态（内联展开，参照物料入库）
  const [codeGenExpanded, setCodeGenExpanded] = useState(false);
  const [codeGen, setCodeGen] = useState({ bigCategory: '', midCategory: '', generatedCode: '' });
  const [codeGenError, setCodeGenError] = useState('');
  const [codeGenSuccess, setCodeGenSuccess] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

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
    setShowAddModal(true);
  };

  const handleBatchEdit = () => {
    if (selectedRows.length === 0) {
      alert('请先选择要编辑的供应商');
      return;
    }
    setBatchEditMode(true);
    setDeleteMode(false);
    setExportMode(false);
    setBatchEditedSuppliers({});
    setCurrentBatchEditIndex(0);
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

  // 批量编辑处理（逐条编辑+累积保存，参照物料入库模式）
  const handleSupplierSelect = (index: number) => {
    setCurrentBatchEditIndex(index);
  };

  const handleBatchFieldChange = (supplierId: number, field: string, value: string) => {
    setBatchEditedSuppliers(prev => ({
      ...prev,
      [supplierId]: { ...(prev[supplierId] || {}), [field]: value },
    }));
  };

  const handleBatchNext = () => {
    if (currentBatchEditIndex < selectedRows.length - 1) {
      setCurrentBatchEditIndex(prev => prev + 1);
    }
  };

  const handleSaveAllBatch = async () => {
    const entries = Object.entries(batchEditedSuppliers);
    if (entries.length === 0) {
      alert('没有需要保存的修改');
      return;
    }
    let successCount = 0;
    for (const [idStr, updates] of entries) {
      const id = Number(idStr);
      const result = await storeUpdateItem(id, updates);
      if (result) successCount++;
    }
    await loadItems();
    setBatchEditedSuppliers({});
    setCurrentBatchEditIndex(0);
    setSelectedRows([]);
    setBatchEditMode(false);
    setShowBatchEditModal(false);
    if (successCount < entries.length) {
      alert(`批量编辑完成：成功 ${successCount}/${entries.length} 项`);
    }
  };

  const handleCancelBatchEdit = () => {
    setBatchEditMode(false);
    setShowBatchEditModal(false);
    setSelectedRows([]);
    setBatchEditedSuppliers({});
    setCurrentBatchEditIndex(0);
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
  const handleSaveEdit = async (updatedSupplier: Supplier) => {
    const result = await storeUpdateItem(updatedSupplier.id, updatedSupplier);
    if (result) {
      await loadItems();
      setShowEditModal(false);
    } else {
      alert('编辑失败，请重试');
    }
  };

  const handleSaveAdd = async (newSupplier: Supplier) => {
    const result = await storeAddItem(newSupplier);
    if (result) {
      await loadItems();
      setShowAddModal(false);
    } else {
      alert('添加失败，请检查网络连接或联系管理员');
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedSupplier) {
      const result = await storeDeleteItem(selectedSupplier.id);
      if (result) {
        await loadItems();
      } else {
        alert('删除失败，请重试');
      }
      setSelectedSupplier(null);
    }
    setShowDeleteWarning(false);
  };

  const handleConfirmBatchDelete = async () => {
    const result = await storeDeleteItems(selectedRows);
    if (result) {
      await loadItems();
      setSelectedRows([]);
    } else {
      alert('批量删除部分失败，请检查网络连接');
      await loadItems();
      setSelectedRows([]);
    }
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
  const handleGenerateCode = useCallback(() => {
    setCodeGenError('');
    setCodeGenSuccess('');
    if (!codeGen.bigCategory || !codeGen.midCategory) {
      setCodeGenError('请选择供应商大类和供应商中类');
      return;
    }
    const serialNum = String(Math.floor(Math.random() * 99) + 1).padStart(3, '0');
    const code = `SU_${codeGen.bigCategory}${codeGen.midCategory}${serialNum}`;
    setCodeGen(prev => ({ ...prev, generatedCode: code }));
    setCodeGenSuccess('编码生成成功！');
  }, [codeGen.bigCategory, codeGen.midCategory]);

  const handleCopyCode = useCallback(() => {
    if (codeGen.generatedCode) {
      navigator.clipboard.writeText(codeGen.generatedCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [codeGen.generatedCode]);

  const handleResetCodeGen = useCallback(() => {
    setCodeGen({ bigCategory: '', midCategory: '', generatedCode: '' });
    setCodeGenError('');
    setCodeGenSuccess('');
  }, []);

  const handleCodeGenChange = useCallback((field: 'bigCategory' | 'midCategory', value: string) => {
    setCodeGen(prev => {
      const newState = { ...prev, [field]: value };
      if (field === 'bigCategory') {
        newState.midCategory = '';
        newState.generatedCode = '';
      } else if (field === 'midCategory') {
        newState.generatedCode = '';
      }
      return newState;
    });
    setCodeGenError('');
    setCodeGenSuccess('');
  }, []);

  const isAllSelected = filteredSuppliers.length > 0 && selectedRows.length === filteredSuppliers.length;
  const hasActiveMode = batchEditMode || deleteMode || exportMode;

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <PageHeader />

      {/* 编码规则按钮 + 编码生成器（参照物料入库样式） */}
      <div className="flex items-center gap-4">
        <div className="h-6 w-px bg-gray-500"></div>
        <Button
          size="sm"
          onClick={() => navigate('/supplier-code-rule')}
        >
          编码规则 &gt;&gt;
        </Button>
        <span className="text-base font-bold text-blue-600">供应商编码生成</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCodeGenExpanded(!codeGenExpanded)}
          title={codeGenExpanded ? '收起' : '展开'}
        >
          {codeGenExpanded ? (
            <ChevronDown className="w-6 h-6 text-gray-600 font-bold" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-600 font-bold" />
          )}
        </Button>
      </div>

      {/* 编码规则生成器 */}
      {codeGenExpanded && (
        <SupplierCodeGenerator
          expanded={codeGenExpanded}
          onToggleExpand={() => setCodeGenExpanded(!codeGenExpanded)}
          codeGen={codeGen}
          onCodeGenChange={handleCodeGenChange}
          onGenerate={handleGenerateCode}
          onCopy={handleCopyCode}
          onReset={handleResetCodeGen}
          error={codeGenError}
          success={codeGenSuccess}
          copySuccess={copySuccess}
        />
      )}

      {/* 筛选 */}
      <SupplierFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* 表格区域 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* 工具栏 - 集成在表格卡片内 */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          {/* 标题和选择信息 */}
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">供应商列表</h3>
            {hasActiveMode && (
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {isAllSelected ? '全不选' : '全选'}
                </Button>
                <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            {/* 正常模式 */}
            {!hasActiveMode ? (
              <>
                <Button size="sm" onClick={handleAdd}>
                  <Plus className="w-4 h-4" />
                  新增
                </Button>
                <Button size="sm" variant="blue" onClick={() => setBatchEditMode(true)}>
                  <Pencil className="w-4 h-4" />
                  编辑
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setDeleteMode(true)}>
                  <Trash2 className="w-4 h-4" />
                  删除
                </Button>
                <Button size="sm" onClick={() => setExportMode(true)}>
                  <Download className="w-4 h-4" />
                  导出
                </Button>
              </>
            ) : (
              <>
                {/* 编辑模式 */}
                {batchEditMode && (
                  <>
                    <Button size="sm" variant="blue" onClick={handleBatchEdit}>
                      确认编辑{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleCancelBatchEdit}>
                      取消
                    </Button>
                  </>
                )}
                {/* 删除模式 */}
                {deleteMode && (
                  <>
                    <Button size="sm" variant="destructive" onClick={handleDelete}>
                      确认删除{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleCancelDelete}>
                      取消
                    </Button>
                  </>
                )}
                {/* 导出模式 */}
                {exportMode && (
                  <>
                    <Button size="sm" onClick={handleConfirmExport}>
                      <Download className="w-4 h-4" />
                      确认导出{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleCancelExport}>
                      取消选择
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* 表格 */}
        <SupplierTable
          suppliers={filteredSuppliers}
          currentPage={currentPage}
          pageSize={pageSize}
          selectedRows={selectedRows}
          exportMode={exportMode}
          batchEditMode={batchEditMode}
          deleteMode={deleteMode}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          onSelectAll={handleSelectAll}
          onSelectRow={handleSelectRow}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDeleteSingle}
        />
      </div>

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
        generatedCode={codeGen.generatedCode}
      />

      <SupplierBatchEditModal
        isOpen={showBatchEditModal}
        selectedSuppliers={suppliers.filter(s => selectedRows.includes(s.id))}
        batchEditedSuppliers={batchEditedSuppliers}
        currentBatchEditIndex={currentBatchEditIndex}
        onClose={handleCancelBatchEdit}
        onSupplierSelect={handleSupplierSelect}
        onFieldChange={handleBatchFieldChange}
        onNext={handleBatchNext}
        onSaveAll={handleSaveAllBatch}
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
        supplierNames={suppliers.filter(s => selectedRows.includes(s.id)).map(s => s.name)}
        onClose={() => setShowBatchDeleteConfirm(false)}
        onConfirm={handleConfirmBatchDelete}
      />
    </div>
  );
}
