/**
 * 职务管理页面组件
 */
import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { showAlert } from '@/lib/dialogService';
import { PositionTable } from './PositionTable';
import { PositionBatchEditModal, PositionDeleteWarningModal, PositionExportFormatModal, PositionFormModal } from './modals';
import { Button } from '@/components/ui/button';

export interface Position {
  id: number;
  code: string;
  name: string;
  dept: string;
  level: string;
  salary: number;
  staffCount: number;
  description: string;
  status: string;
  statusClass: string;
}

const initialPositions: Position[] = [
  { id: 1, code: 'J001', name: '总经理', dept: '管理层', level: '高层', salary: 15000, staffCount: 1, description: '公司全面管理', status: '启用', statusClass: 'normal' },
  { id: 2, code: 'J002', name: '技术总监', dept: '技术部', level: '高层', salary: 12000, staffCount: 1, description: '技术研发管理', status: '启用', statusClass: 'normal' },
  { id: 3, code: 'J003', name: '技术员', dept: '技术部', level: '中层', salary: 8000, staffCount: 3, description: '农业生产技术指导', status: '启用', statusClass: 'normal' },
  { id: 4, code: 'J004', name: '生产主管', dept: '生产部', level: '中层', salary: 7000, staffCount: 2, description: '生产作业管理', status: '启用', statusClass: 'normal' },
  { id: 5, code: 'J005', name: '普工', dept: '生产部', level: '基层', salary: 4000, staffCount: 15, description: '日常农事操作', status: '启用', statusClass: 'normal' },
  { id: 6, code: 'J006', name: '仓库管理员', dept: '后勤部', level: '基层', salary: 4500, staffCount: 2, description: '物资出入库管理', status: '启用', statusClass: 'normal' },
];

export function PositionManagementPage() {
  const [positions, setPositions] = useState<Position[]>(initialPositions);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // 批量操作状态
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // 批量编辑状态
  const [editedRecordIds, setEditedRecordIds] = useState<string[]>([]);
  const [editedRecords, setEditedRecords] = useState<Record<string, Partial<Position>>>({});
  const [selectedRecordId, setSelectedRecordId] = useState('');

  // 弹窗状态
  const [showFormModal, setShowFormModal] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);

  const totalPages = Math.ceil(positions.length / pageSize);

  // 批量选择操作
  const handleSelectAll = () => {
    const paginatedPositions = positions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    if (selectedRows.length === paginatedPositions.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedPositions.map(p => p.id.toString()));
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
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

  // 新增/编辑
  const handleAdd = () => {
    setEditingPosition(null);
    setShowFormModal(true);
  };

  const handleEdit = (position: Position) => {
    setEditingPosition(position);
    setShowFormModal(true);
  };

  const handleSave = (data: Partial<Position>) => {
    if (editingPosition) {
      // 编辑
      setPositions(prev => prev.map(p => p.id === editingPosition.id ? { ...p, ...data } : p));
    } else {
      // 新增
      const newId = Math.max(...positions.map(p => p.id)) + 1;
      const code = 'J' + String(newId).padStart(3, '0');
      setPositions(prev => [...prev, { ...data, id: newId, code, staffCount: 0, statusClass: data.status === '启用' ? 'normal' : 'disabled' } as Position]);
    }
    setShowFormModal(false);
  };

  // 批量编辑
  const handleBatchEditClick = () => {
    if (batchEditMode) {
      if (selectedRows.length === 0) {
        showAlert('请先选择要编辑的记录');
        return;
      }
      setSelectedRecordId(selectedRows[0]);
      setShowBatchEditModal(true);
    } else {
      setBatchEditMode(true);
    }
  };

  const handleConfirmBatchEdit = () => {
    editedRecordIds.forEach(id => {
      const editedData = editedRecords[id];
      if (editedData) {
        setPositions(prev => prev.map(p => p.id.toString() === id ? { ...p, ...editedData } : p));
      }
    });
    setShowBatchEditModal(false);
    handleCancelBatch();
  };

  // 批量删除
  const handleBatchDeleteClick = () => {
    if (batchDeleteMode) {
      if (selectedRows.length === 0) {
        showAlert('请先选择要删除的记录');
        return;
      }
      setShowDeleteWarning(true);
    } else {
      setBatchDeleteMode(true);
    }
  };

  const handleConfirmBatchDelete = () => {
    setPositions(prev => prev.filter(p => !selectedRows.includes(p.id.toString())));
    setShowDeleteWarning(false);
    handleCancelBatch();
  };

  // 导出
  const handleBatchExportClick = () => {
    if (exportMode) {
      if (selectedRows.length === 0) {
        showAlert('请先选择要导出的数据');
        return;
      }
      setShowExportModal(true);
    } else {
      setExportMode(true);
    }
  };

  const handleConfirmExport = () => {
    handleDoExport();
  };

  const handleDoExport = async () => {
    const selectedData = positions.filter(p => selectedRows.includes(p.id.toString()));
    const headers = ['职务编号', '职务名称', '所属部门', '职务级别', '基本工资(元)', '岗位人数', '职责描述', '状态'];

    const exportData = selectedData.map(p => ({
      '职务编号': p.code,
      '职务名称': p.name,
      '所属部门': p.dept,
      '职务级别': p.level,
      '基本工资(元)': p.salary,
      '岗位人数': p.staffCount,
      '职责描述': p.description,
      '状态': p.status,
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

    const fileName = `职务列表_${new Date().toISOString().slice(0, 10)}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{ description: exportFormat.toUpperCase() + ' Files', accept: { [mimeType]: ['.' + extension] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } else {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    setShowExportModal(false);
    handleCancelBatch();
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="bg-blue-50 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-blue-700">{positions.length}</p>
              <p className="text-xs text-blue-600">职务总数</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <span className="text-green-600 text-base">✓</span>
            </div>
            <div>
              <p className="text-lg font-bold text-green-700">{positions.filter(p => p.status === '启用').length}</p>
              <p className="text-xs text-green-600">启用中</p>
            </div>
          </div>
        </div>
      </div>

      {/* 表格 */}
      <PositionTable
        positions={positions}
        currentPage={currentPage}
        pageSize={pageSize}
        total={positions.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        showCheckbox={exportMode || batchEditMode || batchDeleteMode}
        exportMode={exportMode}
        batchEditMode={batchEditMode}
        batchDeleteMode={batchDeleteMode}
        selectedRows={selectedRows}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onAddClick={exportMode || batchEditMode || batchDeleteMode ? undefined : handleAdd}
        onBatchEditClick={handleBatchEditClick}
        onBatchDeleteClick={handleBatchDeleteClick}
        onBatchExportClick={handleBatchExportClick}
        onCancelBatchEdit={handleCancelBatch}
        onCancelBatchDelete={handleCancelBatch}
        onCancelExport={handleCancelBatch}
        onEditPosition={handleEdit}
      />

      {/* 批量操作提示栏 */}
      {(batchEditMode || batchDeleteMode || exportMode) && (
        <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="text-sm text-gray-600">
            已选择 <strong className="text-emerald-600">{selectedRows.length}</strong> 项
            {batchEditMode && '（点击批量编辑进入编辑模式）'}
            {batchDeleteMode && '（确认删除选中的记录）'}
          </div>
          <Button variant="ghost" onClick={handleCancelBatch}>
            取消
          </Button>
        </div>
      )}

      {/* 表单弹窗 */}
      <PositionFormModal
        record={editingPosition}
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSave={handleSave}
      />

      {/* 批量编辑弹窗 */}
      <PositionBatchEditModal
        isOpen={showBatchEditModal}
        selectedRows={selectedRows}
        records={positions}
        editedRecordIds={editedRecordIds}
        editedRecords={editedRecords}
        selectedRecordId={selectedRecordId}
        onSelectedRecordIdChange={setSelectedRecordId}
        onEditedRecordsChange={setEditedRecords}
        onEditedRecordIdsChange={setEditedRecordIds}
        onClose={() => setShowBatchEditModal(false)}
        onConfirm={handleConfirmBatchEdit}
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

      {/* 删除确认弹窗 */}
      <PositionDeleteWarningModal
        isOpen={showDeleteWarning}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteWarning(false)}
        onConfirm={handleConfirmBatchDelete}
      />

      {/* 导出格式选择弹窗 */}
      <PositionExportFormatModal
        isOpen={showExportModal}
        exportFormat={exportFormat}
        selectedCount={selectedRows.length}
        onFormatChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleConfirmExport}
      />
    </div>
  );
}

export default PositionManagementPage;