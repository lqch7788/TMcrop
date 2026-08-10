/**
 * 班组分配表格组件
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Edit2, Eye, Plus, RotateCcw, Save, Trash2, UserPlus, Users, X } from 'lucide-react';
import { useTeam } from './hooks/useTeam';
import { TeamAssignModal } from './TeamAssignModal';
import { TeamDetailModal } from './TeamDetailModal';
import type { Team } from './types';
import { Button } from '@/components/ui';
import { UnifiedModal } from '@/components/ui';
import { Label } from '@/components/ui';
import { showConfirm, showAlert } from '@/lib/dialogService';
import { Pagination } from '@/components/ui';
import { Input } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { useAuthStore } from '@/stores/useAuthStore';

interface TeamTableProps {
  // 权限控制props
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function TeamTable({
  canCreate = true,
  canEdit = true,
  canDelete = true,
}: TeamTableProps) {
  const navigate = useNavigate();
  const {
    teams,
    unassignedWorkers,
    filters,
    pagination,
    setFilters,
    setPage,
    setPageSize,
    createTeam,
    updateTeam,
    deleteTeam,
    assignWorkers,
    filteredTeams,
  } = useTeam();

  // 批量选择状态
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailTeam, setDetailTeam] = useState<Team | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    leaderName: '',
    description: '',
    workZone: '',
  });

  // P0-3 修复：当前用户从认证 Store 读取（V2.1 铁律：组件不直接读写 localStorage）
  const currentUser = useAuthStore((s) => s.currentUser);

  // ★ Task 15：跳到排班页 + 预填班组/日期/班次（url-deep-link-modal-pattern）
  const handleBatchSchedule = (team: Team) => {
    const today = new Date().toISOString().slice(0, 10);
    navigate(
      `/schedule?teamId=${encodeURIComponent(team.id)}` +
        `&prefillDate=${today}` +
        `&prefillShift=${encodeURIComponent('早班')}`,
    );
  };

  // 打开分配弹窗
  const openAssignModal = (team: Team) => {
    setSelectedTeam(team);
    setIsAssignModalOpen(true);
  };

  // 打开详情弹窗
  const openDetailModal = (team: Team) => {
    setDetailTeam(team);
    setIsDetailModalOpen(true);
  };

  // 打开新建班组弹窗
  const openCreateModal = () => {
    setEditingTeam(null);
    setFormData({ name: '', leaderName: '', description: '', workZone: '' });
    setIsFormOpen(true);
  };

  // 打开编辑弹窗
  const openEditModal = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      leaderName: team.leaderName,
      description: team.description || '',
      workZone: team.workZone || '',
    });
    setIsFormOpen(true);
  };

  // 处理分配（操作人取当前登录用户，realName 优先）
  const handleAssign = (teamId: string, workerIds: string[]) => {
    assignWorkers(teamId, workerIds, currentUser?.oid || '', currentUser?.realName || currentUser?.username || '');
  };

  // 处理创建/编辑
  const handleSubmit = () => {
    if (editingTeam) {
      updateTeam(editingTeam.id, {
        ...formData,
        leaderName: formData.leaderName,
      });
    } else {
      createTeam({
        ...formData,
        leaderId: 'new',
        leaderName: formData.leaderName,
      });
    }
    setIsFormOpen(false);
  };

  // 处理删除
  const handleDelete = async (team: Team) => {
    if (await showConfirm(`确定删除班组 "${team.name}" 吗？`)) {
      deleteTeam(team.id);
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRows.length === 0) {
      showAlert('请先选择要删除的班组');
      return;
    }
    if (await showConfirm(`确定删除选中的 ${selectedRows.length} 个班组吗？`)) {
      selectedRows.forEach(id => deleteTeam(id));
      setSelectedRows([]);
      setBatchDeleteMode(false);
    }
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedRows.length === teams.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(teams.map(t => t.id));
    }
  };

  // 选择/取消选择一行
  const handleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // 取消批量操作
  const handleCancelBatch = () => {
    setBatchDeleteMode(false);
    setSelectedRows([]);
  };

  // 计算分页数据
  const paginatedData = teams;

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">班组分配</h1>
            <p className="text-sm text-gray-500">管理临时工班组分配</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 - 紧凑型淡彩色 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">班组数量</p>
              <p className="text-lg font-bold text-gray-800">{teams.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">总人数</p>
              <p className="text-lg font-bold text-gray-800">
                {teams.reduce((sum, team) => sum + team.memberCount, 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">未分配</p>
              <p className="text-lg font-bold text-gray-800">{unassignedWorkers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选栏 - 多字段搜索 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 whitespace-nowrap">班组名称:</span>
            <Input
              type="text"
              placeholder="请输入"
              value={filters.name}
              onChange={(e) => setFilters({ ...filters, name: e.target.value })}
              className="w-[140px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 whitespace-nowrap">负责人:</span>
            <Input
              type="text"
              placeholder="请输入"
              value={filters.leaderName}
              onChange={(e) => setFilters({ ...filters, leaderName: e.target.value })}
              className="w-[140px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 whitespace-nowrap">作业区域:</span>
            <Input
              type="text"
              placeholder="请输入"
              value={filters.workZone}
              onChange={(e) => setFilters({ ...filters, workZone: e.target.value })}
              className="w-[140px]"
            />
          </div>
          <div className="flex gap-2 ml-auto">
            <Button
              size="sm"
              variant="warning"
              onClick={() => setFilters({ name: '', leaderName: '', workZone: '' })}
            >
              <RotateCcw className="w-4 h-4" />
              重置
            </Button>
          </div>
        </div>
      </div>

      {/* 班组列表表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* 表格标题栏 */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">班组分配记录表</h3>
          <div className="flex gap-2">
            {batchDeleteMode ? (
              <>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBatchDelete}
                  disabled={selectedRows.length === 0}
                >
                  <Trash2 className="w-4 h-4" />
                  确认删除{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
                </Button>
                <Button size="sm" variant="secondary" onClick={handleCancelBatch}>
                  <X className="w-4 h-4" /> 取消
                </Button>
              </>
            ) : (
              <>
                {canDelete && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setBatchDeleteMode(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                    批量删除
                  </Button>
                )}
                {canCreate && (
                  <Button size="sm" onClick={openCreateModal}>
                    <Plus className="w-4 h-4" />
                    新建班组
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <TableRow>
                {batchDeleteMode && (
                  <TableHead className="px-4 py-3 text-sm font-semibold w-12 text-white">
                    <Checkbox
                      checked={selectedRows.length === teams.length && teams.length > 0}
                      onCheckedChange={handleSelectAll}
                      className="border-white rounded"
                    />
                  </TableHead>
                )}
                <TableHead className="px-4 py-3 text-sm font-semibold text-white">班组名称</TableHead>
                <TableHead className="px-4 py-3 text-sm font-semibold text-white">负责人</TableHead>
                <TableHead className="px-4 py-3 text-sm font-semibold text-white">作业区域</TableHead>
                <TableHead className="px-4 py-3 text-sm font-semibold text-white">成员数量</TableHead>
                <TableHead className="px-4 py-3 text-sm font-semibold text-white">描述</TableHead>
                <TableHead className="px-4 py-3 text-sm font-semibold text-white">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white divide-y divide-gray-300">
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={batchDeleteMode ? 7 : 6} className="px-4 py-8 text-center text-gray-500">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((team) => (
                  <TableRow key={team.id} className="hover:bg-emerald-50 transition-colors">
                    {batchDeleteMode && (
                      <TableCell className="px-4 py-3">
                        <Checkbox
                          checked={selectedRows.includes(team.id)}
                          onCheckedChange={() => handleSelectRow(team.id)}
                          className="rounded"
                        />
                      </TableCell>
                    )}
                    <TableCell className="px-4 py-3">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => openDetailModal(team)}
                        title="点击查看详情"
                      >
                        {team.name}
                      </Button>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-900">
                      {team.leaderName}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600">
                      {team.workZone || '-'}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {team.memberCount}人
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                      {team.description || '-'}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDetailModal(team)}
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openAssignModal(team)}
                          title="分配工人"
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(team)}
                            title="编辑"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(team)}
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        {/* ★ Task 15：为该班组批量排班（跳到排班页 + 预填日期/班次） */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleBatchSchedule(team)}
                          title="为该班组批量排班"
                        >
                          <Calendar className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            共 {filteredTeams.length} 条记录
          </div>
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={Math.ceil(pagination.total / pagination.pageSize) || 1}
            onPageChange={setPage}
            pageSize={pagination.pageSize}
            onPageSizeChange={setPageSize}
            showPageSize={true}
          />
        </div>
      </div>

      {/* 分配弹窗 */}
      <TeamAssignModal
        team={selectedTeam}
        unassignedWorkers={unassignedWorkers}
        open={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onAssign={handleAssign}
      />

      {/* 班组详情弹窗 */}
      <TeamDetailModal
        open={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        team={detailTeam}
      />

      {/* 新建/编辑班组弹窗 */}
      <UnifiedModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingTeam ? '编辑班组' : '新建班组'}
        size="xl"
        showFooter={true}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsFormOpen(false)}><X className="w-4 h-4" /> 取消</Button>
            <Button onClick={handleSubmit}><Save className="w-4 h-4" /> 保存</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">班组名称</Label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入班组名称"
            />
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">负责人</Label>
            <Input
              type="text"
              value={formData.leaderName}
              onChange={(e) => setFormData({ ...formData, leaderName: e.target.value })}
              placeholder="请输入负责人姓名"
            />
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">作业区域</Label>
            <Input
              type="text"
              value={formData.workZone}
              onChange={(e) => setFormData({ ...formData, workZone: e.target.value })}
              placeholder="请输入作业区域"
            />
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">描述</Label>
            <TextArea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="请输入描述"
            />
          </div>
        </div>
      </UnifiedModal>
    </div>
  );
}
