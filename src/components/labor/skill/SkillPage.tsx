import React, { useState } from 'react';
import { Plus, Download, Upload, Award, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { useSkill } from './hooks/useSkill';
import { SkillTable } from './SkillTable';
import { SkillFiltersComponent } from './SkillFilters';
import { SkillFormModal } from './SkillFormModal';
import { SkillDetailModal } from './SkillDetailModal';
import { SkillBatchEditModal } from './SkillBatchEditModal';
import { SkillFormData, StaffSkill } from './types';
import { Label } from '@/components/ui/label';
import { showAlert, showConfirm } from '@/lib/dialogService';

// 导出格式弹窗
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

  const footer = (
    <div className="flex justify-end gap-3">
      <Button variant="secondary" onClick={onClose}>取消</Button>
      <Button onClick={onConfirm}>导出</Button>
    </div>
  );

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="选择导出格式"
      size="md"
      showFooter={true}
      footer={footer}
    >
      <p className="text-sm text-gray-500 mb-4">已选择 {selectedCount} 条数据</p>
      <div className="space-y-3">
        {exportFormats.map((format) => (
          <Label
            key={format.value}
            onClick={() => onFormatChange(format.value)}
            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
              exportFormat === format.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${exportFormat === format.value ? 'border-emerald-600' : 'border-gray-400'}`}>
              {exportFormat === format.value && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{format.label}</p>
              <p className="text-xs text-gray-500">{format.desc}</p>
            </div>
          </Label>
        ))}
      </div>
    </UnifiedModal>
  );
}

// 删除确认弹窗
interface DeleteWarningModalProps {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteWarningModal({ isOpen, selectedCount, onClose, onConfirm }: DeleteWarningModalProps) {
  const footer = (
    <div className="flex gap-3">
      <Button variant="secondary" onClick={onClose}>取消</Button>
      <Button variant="destructive" onClick={onConfirm}>确认删除</Button>
    </div>
  );

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="删除技能档案警告"
      size="md"
      showFooter={true}
      footer={footer}
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <Trash2 className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">删除技能档案警告</h3>
        </div>
      </div>
      <div className="text-sm text-gray-600 space-y-3">
        <p>确定要删除选中的 <strong>{selectedCount}</strong> 个技能档案吗？</p>
        <p>此操作 <strong className="text-red-600">无法恢复</strong>，删除后数据将永久丢失。</p>
      </div>
    </UnifiedModal>
  );
}

export function SkillPage() {
  const {
    staffSkills,
    skillFilters,
    setSkillFilters,
    resetSkillFilters,
    addStaffSkill,
    updateStaffSkill,
    deleteStaffSkill,
    allSkillTags,
    trainingRecords,
  } = useSkill();

  // 批量操作状态
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [editedRecordIds, setEditedRecordIds] = useState<string[]>([]);
  const [editedRecords, setEditedRecords] = useState<Record<string, Partial<StaffSkill>>>({});
  const [selectedRecordId, setSelectedRecordId] = useState('');

  // 弹窗状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<StaffSkill | null>(null);

  // 打开详情弹窗
  const handleViewDetail = (skill: StaffSkill) => {
    setSelectedSkill(skill);
    setShowDetailModal(true);
  };

  // 打开编辑弹窗
  const handleEdit = (skill: StaffSkill) => {
    setSelectedSkill(skill);
    setShowEditModal(true);
  };

  // 删除技能档案
  const handleDelete = async (skill: StaffSkill) => {
    if (await showConfirm(`确定要删除技能档案 "${skill.staffName}" 吗？`)) {
      deleteStaffSkill(skill.id);
    }
  };

  // 关闭所有弹窗
  const handleCloseModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDetailModal(false);
    setSelectedSkill(null);
  };

  // 提交新增
  const handleAdd = (data: SkillFormData) => {
    addStaffSkill(data);
  };

  // 提交编辑
  const handleUpdate = (data: SkillFormData) => {
    if (selectedSkill) {
      updateStaffSkill(selectedSkill.id, data);
    }
  };

  // 批量选择操作
  const handleSelectAll = () => {
    if (selectedRows.length === staffSkills.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(staffSkills.map(s => s.id));
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
    selectedRows.forEach(id => deleteStaffSkill(id));
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
      showAlert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  };

  const handleDoExport = () => {
    const selectedData = staffSkills.filter(s => selectedRows.includes(s.id));
    const headers = ['工号', '姓名', '部门', '技能标签', '证书数量', '状态'];
    const exportData = selectedData.map(row => ({
      '工号': row.staffId,
      '姓名': row.staffName,
      '部门': row.department,
      '技能标签': row.skills.map(s => s.tag).join('; '),
      '证书数量': row.certificationCount,
      '状态': row.status,
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

    const fileName = `技能档案_${new Date().toISOString().slice(0, 10)}.${extension}`;
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

  return (
    <div className="space-y-6">
      {/* 筛选栏 */}
      <SkillFiltersComponent
        filters={skillFilters}
        onChange={setSkillFilters}
        onReset={resetSkillFilters}
        allSkillTags={allSkillTags}
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-gray-200 rounded-xl">
          <div className="text-sm text-gray-500">员工总数</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{staffSkills.length}</div>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-xl">
          <div className="text-sm text-gray-500">正常状态</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {staffSkills.filter((s) => s.status === '正常').length}
          </div>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-xl">
          <div className="text-sm text-gray-500">即将过期</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">
            {staffSkills.filter((s) => s.status === '即将过期').length}
          </div>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-xl">
          <div className="text-sm text-gray-500">已过期</div>
          <div className="text-2xl font-bold text-red-600 mt-1">
            {staffSkills.filter((s) => s.status === '已过期').length}
          </div>
        </div>
      </div>

      {/* 表格 */}
      <SkillTable
        data={staffSkills}
        showCheckbox={exportMode || batchEditMode || batchDeleteMode}
        exportMode={exportMode}
        batchEditMode={batchEditMode}
        batchDeleteMode={batchDeleteMode}
        selectedRows={selectedRows}
        onViewDetail={handleViewDetail}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onBatchEditClick={batchEditMode ? () => setShowBatchEditModal(true) : () => setBatchEditMode(true)}
        onBatchDeleteClick={batchDeleteMode ? handleBatchDelete : () => setBatchDeleteMode(true)}
        onBatchExportClick={exportMode ? handleConfirmExport : () => setExportMode(true)}
        onCancelBatch={handleCancelBatch}
        onAddClick={exportMode || batchEditMode || batchDeleteMode ? undefined : () => setShowAddModal(true)}
      />

      {/* 新建弹窗 */}
      <SkillFormModal
        isOpen={showAddModal}
        onClose={handleCloseModals}
        onSubmit={handleAdd}
        title="新建员工技能档案"
      />

      {/* 编辑弹窗 */}
      <SkillFormModal
        isOpen={showEditModal}
        onClose={handleCloseModals}
        onSubmit={handleUpdate}
        title="编辑员工技能档案"
        editingSkill={selectedSkill}
      />

      {/* 详情弹窗 */}
      <SkillDetailModal
        isOpen={showDetailModal}
        onClose={handleCloseModals}
        skill={selectedSkill}
        trainingRecords={trainingRecords}
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
      <SkillBatchEditModal
        isOpen={showBatchEditModal}
        selectedRows={selectedRows}
        records={staffSkills}
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

export default SkillPage;
