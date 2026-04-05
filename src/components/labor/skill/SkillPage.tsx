import React, { useState } from 'react';
import { Plus, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSkill } from './hooks/useSkill';
import { SkillTable } from './SkillTable';
import { SkillFiltersComponent } from './SkillFilters';
import { SkillFormModal } from './SkillFormModal';
import { SkillDetailModal } from './SkillDetailModal';
import { SkillFormData, StaffSkill } from './types';

// 导出技能档案
const handleExport = () => {
  const headers = ['工号', '姓名', '部门', '技能标签', '证书数量', '最近培训', '状态'];
  const rows = staffSkills.map(skill => [
    skill.staffId,
    skill.staffName,
    skill.department,
    skill.skillTags.join('; '),
    skill.certificates.length.toString(),
    skill.lastTrainingDate || '-',
    skill.status
  ]);
  const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `技能档案_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

// 导入技能档案（模拟）
const handleImport = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv';
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      alert(`已选择文件: ${file.name}\n导入功能开发中...`);
    }
  };
  input.click();
};

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

  return (
    <div className="p-6 space-y-4">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">技能档案管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理员工的技能证书和培训记录</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleImport}>
            <Upload className="w-4 h-4" />
            导入
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="w-4 h-4" />
            导出
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" />
            新建档案
          </Button>
        </div>
      </div>

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
      <SkillTable data={staffSkills} onViewDetail={handleViewDetail} onEdit={handleEdit} />

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
    </div>
  );
}

export default SkillPage;
