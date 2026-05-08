/**
 * 人事管理聚合页面组件
 */
import { useState } from 'react';
import { Users, Plus, Edit, Eye, ChevronLeft, ChevronRight, Pencil, Trash2, Download, ClipboardCheck } from 'lucide-react';
import { PositionBatchEditModal, PositionDeleteWarningModal, PositionExportFormatModal, PositionFormModal } from '../position/modals';
import { useAuthPermission } from '../../../hooks/usePermission';
import { Button } from '@/components/ui/button';

interface Position {
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


export function PersonnelManagementPage() {
  const [positions, setPositions] = useState<Position[]>(initialPositions);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const totalPages = Math.ceil(positions.length / pageSize);

  // 权限检查 - 已取消，所有人可使用所有功能
  // const { can } = useAuthPermission();
  const canCreate = true;
  const canEdit = true;
  const canDelete = true;
  const canExport = true;

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

  const paginatedPositions = positions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 批量选择操作
  const handleSelectAll = () => {
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
      setPositions(prev => prev.map(p => p.id === editingPosition.id ? { ...p, ...data } : p));
    } else {
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
        alert('请先选择要编辑的记录');
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
        alert('请先选择要删除的记录');
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
        alert('请先选择要导出的数据');
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
      {/* 头部 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">员工信息</h1>
            <p className="text-xs text-gray-500">员工信息管理与组织架构</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{positions.length}</p>
              <p className="text-xs text-gray-500">职务总数</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <span className="text-green-600 text-lg">✓</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{positions.filter(p => p.status === '启用').length}</p>
              <p className="text-xs text-gray-500">启用中</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <span className="text-amber-600 text-lg">!</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{positions.reduce((sum, p) => sum + p.staffCount, 0)}</p>
              <p className="text-xs text-gray-500">在职人数</p>
            </div>
          </div>
        </div>
      </div>

      {/* 职务列表表格 */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">职务列表</h3>
          <div className="flex gap-2">
            {(batchEditMode || batchDeleteMode || exportMode) ? (
              <>
                {batchEditMode && (
                  <>
                    <Button
                      variant="blue"
                      size="sm"
                      onClick={handleBatchEditClick}
                      disabled={selectedRows.length === 0}
                    >
                      <Pencil className="w-4 h-4" />
                      批量编辑
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleCancelBatch}
                    >
                      取消
                    </Button>
                  </>
                )}
                {batchDeleteMode && (
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBatchDeleteClick}
                      disabled={selectedRows.length === 0}
                    >
                      <Trash2 className="w-4 h-4" />
                      确认删除
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
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
                      onClick={handleBatchExportClick}
                      disabled={selectedRows.length === 0}
                    >
                      <Download className="w-4 h-4" />
                      确认导出
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleCancelBatch}
                    >
                      取消
                    </Button>
                  </>
                )}
              </>
            ) : (
              <>
                {canCreate && (
                  <Button size="sm" onClick={handleAdd}>
                    <Plus className="w-4 h-4" />
                    新增
                  </Button>
                )}
                {canEdit && (
                  <Button variant="blue" size="sm" onClick={handleBatchEditClick}>
                    <Pencil className="w-4 h-4" />
                    编辑
                  </Button>
                )}
                {canDelete && (
                  <Button variant="destructive" size="sm" onClick={handleBatchDeleteClick}>
                    <Trash2 className="w-4 h-4" />
                    删除
                  </Button>
                )}
                {canExport && (
                  <Button size="sm" onClick={handleBatchExportClick}>
                    <Download className="w-4 h-4" />
                    导出
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        {(batchEditMode || batchDeleteMode || exportMode) && (
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
              {selectedRows.length === paginatedPositions.length ? '全不选' : '全选'}
            </Button>
            <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                {(batchEditMode || batchDeleteMode || exportMode) && (
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === paginatedPositions.length && paginatedPositions.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">职务编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">职务名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">所属部门</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">职务级别</th>
                <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">基本工资(元)</th>
                <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">岗位人数</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">职责描述</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
                {!(batchEditMode || batchDeleteMode || exportMode) && (
                  <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-300">
              {paginatedPositions.map((pos) => (
                <tr key={pos.id} className="hover:bg-blue-100 transition-colors">
                  {(batchEditMode || batchDeleteMode || exportMode) && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(pos.id.toString())}
                        onChange={() => handleSelectRow(pos.id.toString())}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{pos.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{pos.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{pos.dept}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{pos.level}</td>
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap">{pos.salary}</td>
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap">{pos.staffCount}人</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate whitespace-nowrap">{pos.description}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      pos.statusClass === 'normal' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {pos.status}
                    </span>
                  </td>
                  {!(batchEditMode || batchDeleteMode || exportMode) && (
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(pos)}
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="查看">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* 分页 */}
        <div className="flex items-center justify-between mt-4 px-4 pb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>每页</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value={10}>10条</option>
              <option value={20}>20条</option>
              <option value={50}>50条</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {[...Array(totalPages)].map((_, i) => (
              <Button
                key={i + 1}
                variant={currentPage === i + 1 ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

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

export default PersonnelManagementPage;