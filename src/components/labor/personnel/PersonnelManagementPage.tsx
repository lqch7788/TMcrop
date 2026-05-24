/**
 * 人事管理聚合页面组件（职务管理）
 * 架构：usePositionStore (Zustand Store) 替代 React Query
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Edit, Eye, ChevronLeft, ChevronRight, Pencil, Trash2, Download, ClipboardCheck, Search, RotateCw } from 'lucide-react';
import { showAlert } from '@/lib/dialogService';
import { PositionBatchEditModal, PositionDeleteWarningModal, PositionExportFormatModal, PositionFormModal } from '../position/modals';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { usePositionStore } from '@/stores/usePositionStore';
import type { Position } from '@/services/apiBasicDataService';

// 页面内部使用的职位类型（适配后端 API）
interface PositionItem {
  id: string;
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

// 将后端 Position 转换为页面使用的格式
function adaptPositionToPage(position: Position): PositionItem {
  return {
    id: position.id,
    code: position.code,
    name: position.name,
    dept: position.departmentName || '',
    level: position.level === 1 ? '高层' : position.level === 2 ? '中层' : '基层',
    salary: 0,
    staffCount: 0,
    description: position.description || '',
    status: position.status === 'active' ? '启用' : '停用',
    statusClass: position.status === 'active' ? 'normal' : 'disabled',
  };
}

export function PersonnelManagementPage() {
  // ========== 数据获取（从 Zustand Store）==========
  const {
    positions,
    loading: isLoading,
    loadPositions,
    addPosition,
    editPosition,
    removePosition,
    refreshPositions,
  } = usePositionStore();

  // 初次加载
  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  // 将 Store 数据转换为页面格式
  const pagePositions: PositionItem[] = useMemo(() => {
    return positions.map(adaptPositionToPage);
  }, [positions]);

  // 页面状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const totalPages = Math.ceil(pagePositions.length / pageSize);

  // 筛选状态
  const [filters, setFilters] = useState({
    keyword: '',
    level: '',
    status: '',
  });

  // 权限检查
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
  const [editedRecords, setEditedRecords] = useState<Record<string, Partial<PositionItem>>>({});
  const [selectedRecordId, setSelectedRecordId] = useState('');

  // 弹窗状态
  const [showFormModal, setShowFormModal] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');
  const [editingPosition, setEditingPosition] = useState<PositionItem | null>(null);

  const paginatedPositions = pagePositions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 筛选后的数据
  const filteredPositions = useMemo(() => {
    return pagePositions.filter(pos => {
      if (filters.keyword && !pos.name.includes(filters.keyword) && !pos.code.includes(filters.keyword) && !pos.dept.includes(filters.keyword)) {
        return false;
      }
      if (filters.level && pos.level !== filters.level) {
        return false;
      }
      if (filters.status && pos.status !== filters.status) {
        return false;
      }
      return true;
    });
  }, [pagePositions, filters]);

  // 重置筛选
  const handleResetFilters = () => {
    setFilters({ keyword: '', level: '', status: '' });
    setCurrentPage(1);
  };

  // 搜索
  const handleSearch = () => {
    setCurrentPage(1);
  };

  const paginatedFilteredPositions = filteredPositions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const filteredTotalPages = Math.ceil(filteredPositions.length / pageSize) || 1;

  // 刷新数据
  const refreshData = useCallback(() => {
    refreshPositions();
  }, [refreshPositions]);

  // 批量选择操作
  const handleSelectAll = () => {
    if (selectedRows.length === paginatedFilteredPositions.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedFilteredPositions.map(p => p.id));
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

  const handleEdit = (position: PositionItem) => {
    setEditingPosition(position);
    setShowFormModal(true);
  };

  const handleSave = async (data: Partial<PositionItem>) => {
    try {
      const levelMap: Record<string, number> = { '高层': 1, '中层': 2, '基层': 3 };
      if (editingPosition) {
        // 更新
        await editPosition(editingPosition.id, {
          code: data.code,
          name: data.name,
          departmentName: data.dept,
          level: levelMap[data.level || '基层'] || 3,
          description: data.description,
          status: data.status === '启用' ? 'active' : 'inactive',
        });
      } else {
        // 创建
        await addPosition({
          code: data.code || '',
          name: data.name || '',
          departmentName: data.dept || '',
          level: levelMap[data.level || '基层'] || 3,
          description: data.description || '',
          sortOrder: 0,
        });
      }
    } catch (error) {
      console.error('保存职位失败:', error);
      await showAlert('保存失败，请重试');
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

  const handleConfirmBatchEdit = async () => {
    try {
      const levelMap: Record<string, number> = { '高层': 1, '中层': 2, '基层': 3 };
      for (const id of editedRecordIds) {
        const editedData = editedRecords[id];
        if (editedData) {
          await editPosition(id, {
            code: editedData.code,
            name: editedData.name,
            departmentName: editedData.dept,
            level: levelMap[editedData.level || '基层'] || 3,
            description: editedData.description,
            status: editedData.status === '启用' ? 'active' : 'inactive',
          });
        }
      }
    } catch (error) {
      console.error('批量更新职位失败:', error);
      await showAlert('批量更新失败，请重试');
    }
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

  const handleConfirmBatchDelete = async () => {
    try {
      for (const id of selectedRows) {
        await removePosition(id);
      }
    } catch (error) {
      console.error('批量删除职位失败:', error);
      await showAlert('批量删除失败，请重试');
    }
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
    const selectedData = pagePositions.filter(p => selectedRows.includes(p.id));
    const headers = ['职务编号', '职务名称', '所属部门', '职务级别', '状态'];

    const exportData = selectedData.map(p => ({
      '职务编号': p.code,
      '职务名称': p.name,
      '所属部门': p.dept,
      '职务级别': p.level,
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

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

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
              <p className="text-lg font-bold text-blue-700">{pagePositions.length}</p>
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
              <p className="text-lg font-bold text-green-700">{pagePositions.filter(p => p.status === '启用').length}</p>
              <p className="text-xs text-green-600">启用中</p>
            </div>
          </div>
        </div>
        <div className="bg-amber-50 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <span className="text-amber-600 text-base">!</span>
            </div>
            <div>
              <p className="text-lg font-bold text-amber-700">{pagePositions.reduce((sum, p) => sum + p.staffCount, 0)}</p>
              <p className="text-xs text-amber-600">在职人数</p>
            </div>
          </div>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className={cn('bg-[#F2F6FA] rounded-lg p-3')}>
        <div className="flex flex-wrap gap-3 items-end">
          {/* 搜索框 */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="搜索职务编号、名称、部门..."
                value={filters.keyword}
                onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                className="pl-9"
              />
            </div>
          </div>

          {/* 级别筛选 */}
          <div className="w-[120px]">
            <Select
              value={filters.level || '__all__'}
              onValueChange={(value) => setFilters({ ...filters, level: value === '__all__' ? '' : value })}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="选择级别" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部级别</SelectItem>
                <SelectItem value="高层">高层</SelectItem>
                <SelectItem value="中层">中层</SelectItem>
                <SelectItem value="基层">基层</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 状态筛选 */}
          <div className="w-[120px]">
            <Select
              value={filters.status || '__all__'}
              onValueChange={(value) => setFilters({ ...filters, status: value === '__all__' ? '' : value })}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部状态</SelectItem>
                <SelectItem value="启用">启用</SelectItem>
                <SelectItem value="停用">停用</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 重置和搜索按钮 */}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleResetFilters}>
              <RotateCw className="w-4 h-4" />
              重置
            </Button>
            <Button size="sm" variant="default" onClick={handleSearch}>
              <Search className="w-4 h-4" />
              搜索
            </Button>
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
              {selectedRows.length === paginatedFilteredPositions.length ? '全不选' : '全选'}
            </Button>
            <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
          </div>
        )}
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <TableRow>
                {(batchEditMode || batchDeleteMode || exportMode) && (
                  <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                    <Checkbox
                      checked={selectedRows.length === paginatedFilteredPositions.length && paginatedFilteredPositions.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">职务编号</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">职务名称</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">所属部门</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">职务级别</TableHead>
                <TableHead className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">基本工资(元)</TableHead>
                <TableHead className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">岗位人数</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">职责描述</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</TableHead>
                {!(batchEditMode || batchDeleteMode || exportMode) && (
                  <TableHead className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white divide-y divide-gray-300">
              {paginatedFilteredPositions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                paginatedFilteredPositions.map((pos) => (
                  <TableRow key={pos.id} className="hover:bg-blue-100 transition-colors">
                    {(batchEditMode || batchDeleteMode || exportMode) && (
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <Checkbox
                          checked={selectedRows.includes(pos.id)}
                          onCheckedChange={() => handleSelectRow(pos.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{pos.code}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{pos.name}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{pos.dept}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{pos.level}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-right whitespace-nowrap">-</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-right whitespace-nowrap">-</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate whitespace-nowrap">{pos.description}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        pos.statusClass === 'normal' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {pos.status}
                      </span>
                    </TableCell>
                    {!(batchEditMode || batchDeleteMode || exportMode) && (
                      <TableCell className="px-4 py-3 text-center whitespace-nowrap">
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
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
              onClick={() => setCurrentPage(p => Math.min(filteredTotalPages, p + 1))}
              disabled={currentPage === filteredTotalPages}
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
        records={pagePositions}
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
