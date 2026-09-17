/**
 * 班组分配表格组件
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Edit2, Eye, Plus, RotateCcw, Save, Trash2, UserPlus, Users, X } from 'lucide-react';
import { useTeam } from './hooks/useTeam';
import { TeamAssignModal } from './TeamAssignModal';
import { TeamDetailModal } from './TeamDetailModal';
import type { Team } from './types';
import { Button } from '@/components/ui';
import { UnifiedModal } from '@/components/ui';
import { Label } from '@/components/ui';
import { useTeamManageStore } from '@/stores/useTeamManageStore';
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

  // 2026-09-16：编辑 Modal 同步子资源（任务能力）
  // 2026-09-17：作业区域界面已下线（数据保留在 team_zone_assignments 表，不再读写）
  const syncTeamCapabilities = useTeamManageStore((s) => s.syncTeamCapabilities);

  // 批量选择状态
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailTeam, setDetailTeam] = useState<Team | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  // 2026-09-17：技能标签数据是否已就绪（未就绪时保存跳过同步，避免误清空已有标签）
  const [skillCapsLoaded, setSkillCapsLoaded] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    leaderName: '',
    description: '',
    workZone: '',
    // 2026-09-16：5 个新字段
    capabilityTags: [] as string[],
    dailyCapacityHours: 8,
  });

  // P0-3 修复：当前用户从认证 Store 读取（V2.1 铁律：组件不直接读写 localStorage）
  const currentUser = useAuthStore((s) => s.currentUser);

  // 2026-09-17 修复：Store 操作失败此前只写进 state.error 无人展示（静默失败），改为弹窗提示
  const storeError = useTeamManageStore((s) => s.error);
  useEffect(() => {
    if (storeError) {
      showAlert(`操作失败：${storeError}`);
      useTeamManageStore.setState({ error: null });
    }
  }, [storeError]);

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
    // 2026-09-17：新建场景用户从头选标签，允许同步
    setSkillCapsLoaded(true);
    setFormData({
      name: '', leaderName: '', description: '', workZone: '',
      capabilityTags: [], dailyCapacityHours: 8,
    });
    setIsFormOpen(true);
  };

  // 打开编辑弹窗
  const openEditModal = (team: Team) => {
    setEditingTeam(team);
    // 2026-09-17：技能标签回填改用 team_task_capabilities 数据源（与保存/派工口径一致）
    // 防御：区分「加载完成且为空数组」与「数据未就绪（undefined）」——
    // 后者回填成 [] 再保存会把已有标签全删（syncTeamCapabilities 是全量覆盖）
    const capsLoaded = Array.isArray(team.taskCapabilities);
    setSkillCapsLoaded(capsLoaded);
    const capTags: string[] = capsLoaded ? (team.taskCapabilities as string[]) : [];
    setFormData({
      name: team.name,
      leaderName: team.leaderName,
      description: team.description || '',
      workZone: team.workZone || '',
      capabilityTags: capTags,
      dailyCapacityHours: team.dailyCapacityHours ?? 8,
    });
    setIsFormOpen(true);
  };

  // 处理分配（操作人取当前登录用户，realName 优先；2026-09-17 修复：补传 role，此前角色选择被丢弃）
  const handleAssign = (teamId: string, workerIds: string[], role: string = 'member') => {
    assignWorkers(teamId, workerIds, currentUser?.oid || '', currentUser?.realName || currentUser?.username || '', role);
  };

  // 处理创建/编辑
  const handleSubmit = async () => {
    // 2026-09-16：清理自定义标签（去 custom: 前缀 + 移除 __custom_input__ 内部标记）
    const cleanedTags = (Array.isArray(formData.capabilityTags) ? formData.capabilityTags : [])
      .filter((t: string) => t !== '__custom_input__')
      .map((t: string) => t.startsWith('custom:') ? t.replace('custom:', '').trim() : t)
      .filter((t: string) => t.length > 0);

    let teamId: string;
    if (editingTeam) {
      teamId = editingTeam.id;
      await updateTeam(teamId, {
        ...formData,
        capabilityTags: cleanedTags,
        leaderName: formData.leaderName,
      });
    } else {
      const newTeam = await createTeam({
        ...formData,
        capabilityTags: cleanedTags,
        leaderId: 'new',
        leaderName: formData.leaderName,
      });
      teamId = newTeam?.id ?? '';
    }

    // 2026-09-16：同步子资源（任务能力）
    // 2026-09-17：作业区域界面已下线，只同步技能标签；失败时显式提示（Fail Loud）
    // 防御：编辑场景下若技能标签数据未就绪，跳过同步（避免用空数组覆盖掉已有标签）
    if (teamId && skillCapsLoaded) {
      try {
        await syncTeamCapabilities(teamId, cleanedTags);
      } catch (err) {
        console.error('同步技能标签失败:', err);
        await showAlert('班组信息已保存，但技能标签同步失败。请重试或联系管理员。');
      }
    }

    setIsFormOpen(false);
  };

  // 处理删除
  const handleDelete = async (team: Team) => {
    if (await showConfirm(`确定删除班组 "${team.name}" 吗？`)) {
      await deleteTeam(team.id); // 2026-09-17：等待完成（此前不等待，失败也无从感知）
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRows.length === 0) {
      showAlert('请先选择要删除的班组');
      return;
    }
    if (await showConfirm(`确定删除选中的 ${selectedRows.length} 个班组吗？`)) {
      // 2026-09-17 修复：等待全部删除完成（此前 forEach 不等待，UI 先清空选择、删除结果无从确认）
      await Promise.all(selectedRows.map((id) => deleteTeam(id)));
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
          {/* 2026-09-17：移除"作业区域"筛选项（对应列已下线） */}
          <div className="flex gap-2 ml-auto">
            <Button
              size="sm"
              variant="warning"
              onClick={() => setFilters({ name: '', leaderName: '' })}
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
                {/* 2026-09-16：调换顺序 — 新建班组移到批量删除前面 */}
                {canCreate && (
                  <Button size="sm" onClick={openCreateModal}>
                    <Plus className="w-4 h-4" />
                    新建班组
                  </Button>
                )}
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
                {/* 2026-09-17：移除"作业区域"列 —— 该功能经核实空转（唯一消费方未激活 +
                    与任务空间维度断层），界面下线，数据保留在 team_zone_assignments 表 */}
                <TableHead className="px-4 py-3 text-sm font-semibold text-white">成员数量</TableHead>
                {/* 2026-09-17：新增"成员"列，显示具体成员姓名 */}
                <TableHead className="px-4 py-3 text-sm font-semibold text-white">成员</TableHead>
                <TableHead className="px-4 py-3 text-sm font-semibold text-white">日产能</TableHead>
                <TableHead className="px-4 py-3 text-sm font-semibold text-white">技能标签</TableHead>
                <TableHead className="px-4 py-3 text-sm font-semibold text-white">描述</TableHead>
                <TableHead className="px-4 py-3 text-sm font-semibold text-white">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white divide-y divide-gray-300">
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={batchDeleteMode ? 8 : 7} className="px-4 py-8 text-center text-gray-500">
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
                    <TableCell className="px-4 py-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {team.memberCount}人
                      </span>
                    </TableCell>
                    {/* 2026-09-17：成员姓名列（超过 3 个折叠显示） */}
                    <TableCell className="px-4 py-3">
                      {team.memberNames && team.memberNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {team.memberNames.slice(0, 3).map((n, i) => (
                            <span key={`${n}-${i}`} className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                              {n}
                            </span>
                          ))}
                          {team.memberNames.length > 3 && (
                            <span className="text-xs text-gray-500">+{team.memberNames.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </TableCell>
                    {/* 2026-09-15：日产能上限（h/天） */}
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded">
                        {team.dailyCapacityHours ?? 8}h/天
                      </span>
                    </TableCell>
                    {/* 2026-09-15：技能标签 chips
                        2026-09-17：数据源改用 team_task_capabilities（与派工消费口径一致），
                        不再读 teams.capability_tags 字段（两套语义重复的遗留） */}
                    <TableCell className="px-4 py-3">
                      {team.taskCapabilities && team.taskCapabilities.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {team.taskCapabilities.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                          {team.taskCapabilities.length > 3 && (
                            <span className="text-xs text-gray-500">+{team.taskCapabilities.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
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
          {/* 2026-09-17：移除"作业区域"文本框 —— 作业区域统一用下方多选控件（关联表），
              原 teams.work_zone 文本字段与关联表语义重复，是两套并存的历史遗留 */}
          {/* 2026-09-16：4 个新字段（技能标签 chip 多选 + 产能 + 半径） */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              技能标签
              <span className="ml-2 text-xs text-gray-400">（点击 chip 选择，预设外可点「其他」输入自定义）</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {['采收', '施肥', '打药', '巡检', '灌溉', '运输', '修剪', '清园'].map((preset) => {
                const currentTags = Array.isArray(formData.capabilityTags) ? formData.capabilityTags : [];
                const selected = currentTags.includes(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      // 2026-09-17 修复：必须用函数式更新。此前 `{...formData}` 展开的是闭包里的旧值，
                      // 连续快速点击多个 chip 时后面的点击会覆盖前面的选择（用户反馈"勾选后保存丢失"）。
                      setFormData((prev) => {
                        const cur = Array.isArray(prev.capabilityTags) ? prev.capabilityTags : [];
                        const next = cur.includes(preset)
                          ? cur.filter((s: string) => s !== preset)
                          : [...cur, preset];
                        return { ...prev, capabilityTags: next };
                      });
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                      selected
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-700'
                        : 'bg-white border-gray-300 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50'
                    }`}
                  >
                    {selected ? '✓ ' : '+ '}{preset}
                  </button>
                );
              })}
              {/* 其他 - 2026-09-16：点击展开自定义输入 */}
              {/* 2026-09-16 修复：判断「__custom_input__ 标记 OR 已有 custom: 前缀项」才显示 input（避免输入首字符导致卸载） */}
              {(Array.isArray(formData.capabilityTags) && formData.capabilityTags.some((t: string) => t === '__custom_input__' || t.startsWith('custom:'))) ? (
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 border border-emerald-400 rounded-full">
                  <input
                    autoFocus
                    type="text"
                    placeholder="输入自定义标签"
                    value={formData.capabilityTags?.find((t: string) => t.startsWith('custom:'))?.replace('custom:', '') || ''}
                    onChange={(e) => {
                      // 2026-09-17：函数式更新（同 chip 修复，避免与其他字段编辑互相覆盖）
                      const val = e.target.value;
                      setFormData((prev) => {
                        const cur = Array.isArray(prev.capabilityTags) ? prev.capabilityTags : [];
                        const filtered = cur.filter((t: string) => !t.startsWith('custom:') && t !== '__custom_input__');
                        return {
                          ...prev,
                          capabilityTags: val ? [...filtered, `custom:${val.trim()}`] : [...filtered, '__custom_input__'],
                        };
                      });
                    }}
                    onBlur={() => {
                      // 失焦时如果输入框为空，移除「其他」状态
                      setFormData((prev) => {
                        const cur = Array.isArray(prev.capabilityTags) ? prev.capabilityTags : [];
                        const hasValue = cur.some((t: string) => t.startsWith('custom:') && t.replace('custom:', '').trim());
                        if (hasValue) return prev;
                        return { ...prev, capabilityTags: cur.filter((t: string) => t !== '__custom_input__') };
                      });
                    }}
                    className="w-32 text-xs border-none bg-transparent outline-none"
                    style={{ minWidth: '120px' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      // 2026-09-17：函数式更新
                      setFormData((prev) => {
                        const cur = Array.isArray(prev.capabilityTags) ? prev.capabilityTags : [];
                        return { ...prev, capabilityTags: cur.filter((t: string) => t !== '__custom_input__') };
                      });
                    }}
                    className="text-emerald-700 hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    // 2026-09-17：函数式更新
                    setFormData((prev) => {
                      const cur = Array.isArray(prev.capabilityTags) ? prev.capabilityTags : [];
                      return { ...prev, capabilityTags: [...cur, '__custom_input__'] };
                    });
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-full border border-dashed border-gray-400 text-gray-500 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50"
                >
                  + 其他
                </button>
              )}
            </div>
            {Array.isArray(formData.capabilityTags) && formData.capabilityTags.filter((t: string) => t !== '__custom_input__').length > 0 && (
              <div className="text-xs text-gray-500 mt-2">
                已选 {formData.capabilityTags.filter((t: string) => t !== '__custom_input__').length} 个：{
                  formData.capabilityTags
                    .filter((t: string) => t !== '__custom_input__')
                    .map((t: string) => t.startsWith('custom:') ? `「${t.replace('custom:', '')}」` : t)
                    .join('、')
                }
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">日产能上限 <span className="text-xs text-gray-400">（小时/天）</span></Label>
              <Input
                type="number"
                value={formData.dailyCapacityHours ?? 8}
                onChange={(e) => setFormData({ ...formData, dailyCapacityHours: parseInt(e.target.value) || 8 })}
              />
            </div>
          </div>
          {/* 2026-09-17：移除「周产能上限」和「作业半径」（全项目无下游消费的死字段）；
              同时移除「作业区域」多选控件 —— 该功能经核实空转（唯一消费方未激活 +
              与任务空间维度断层），界面下线，数据保留在 team_zone_assignments 表 */}
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
