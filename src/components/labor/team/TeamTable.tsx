import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Trash2, UserPlus, Settings, ChevronLeft } from 'lucide-react';
import { useTeam } from './hooks/useTeam';
import { TeamAssignModal } from './TeamAssignModal';
import type { Team } from './types';

interface TeamTableProps {
  onBack?: () => void;
  // 权限控制props
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExport?: boolean;
}

export function TeamTable({
  onBack,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  canExport = true,
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
    removeWorker,
  } = useTeam();

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    leaderName: '',
    description: '',
    workZone: '',
  });

  const currentUser = { id: 'u001', name: '张明' };

  // 打开分配弹窗
  const openAssignModal = (team: Team) => {
    setSelectedTeam(team);
    setIsAssignModalOpen(true);
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

  // 处理分配
  const handleAssign = (teamId: string, workerIds: string[]) => {
    assignWorkers(teamId, workerIds, currentUser.id, currentUser.name);
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
  const handleDelete = (team: Team) => {
    if (window.confirm(`确定删除班组 "${team.name}" 吗？`)) {
      deleteTeam(team.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack || (() => navigate(-1))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">班组分配</h1>
              <p className="text-xs text-gray-500">管理临时工班组分配</p>
            </div>
          </div>
          {canCreate && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
            >
              <Plus className="w-4 h-4" />
              新建班组
            </button>
          )}
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索班组名称、负责人、作业区域..."
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">班组数量</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{teams.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">总人数</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {teams.reduce((sum, team) => sum + team.memberCount, 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">未分配</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{unassignedWorkers.length}</p>
        </div>
      </div>

      {/* 班组列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {teams.map((team) => (
          <div key={team.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{team.name}</h3>
                  <p className="text-sm text-gray-500">
                    负责人: {team.leaderName} · {team.workZone || '未设置区域'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openAssignModal(team)}
                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded"
                    title="分配工人"
                  >
                    <UserPlus className="w-5 h-5" />
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => openEditModal(team)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="编辑"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(team)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="删除"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
              {team.description && (
                <p className="text-sm text-gray-600 mt-2">{team.description}</p>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">成员 ({team.memberCount}人)</span>
              </div>
              {team.memberCount > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: team.memberCount }).map((_, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      成员{i + 1}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">暂无成员</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 分页 */}
      <div className="bg-white px-4 py-3 border-t flex items-center justify-between">
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
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-emerald-600">{pagination.currentPage}</span>
          <button
            onClick={() => setPage(Math.min(Math.ceil(pagination.total / pagination.pageSize), pagination.currentPage + 1))}
            disabled={pagination.currentPage >= Math.ceil(pagination.total / pagination.pageSize)}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            &gt;
          </button>
          <button
            onClick={() => setPage(Math.ceil(pagination.total / pagination.pageSize))}
            disabled={pagination.currentPage >= Math.ceil(pagination.total / pagination.pageSize)}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            &gt;&gt;
          </button>
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

      {/* 新建/编辑班组弹窗 */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editingTeam ? '编辑班组' : '新建班组'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">班组名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="请输入班组名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">负责人</label>
                <input
                  type="text"
                  value={formData.leaderName}
                  onChange={(e) => setFormData({ ...formData, leaderName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="请输入负责人姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">作业区域</label>
                <input
                  type="text"
                  value={formData.workZone}
                  onChange={(e) => setFormData({ ...formData, workZone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="请输入作业区域"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={3}
                  placeholder="请输入描述"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
