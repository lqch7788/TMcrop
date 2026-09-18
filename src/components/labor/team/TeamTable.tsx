/**
 * 班组分配表格组件
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Edit2, Eye, Plus, RotateCcw, Save, Trash2, UserPlus, Users, X } from 'lucide-react';
import { useTeam } from './hooks/useTeam';
import { TeamAssignModal } from './TeamAssignModal';
import { TeamDetailModal } from './TeamDetailModal';
import { SkillTagEditor } from './SkillTagEditor';
import { StatCard } from './StatCard';
import { FiltersBar } from './FiltersBar';
import { ToolbarHeader } from './ToolbarHeader';
import { TeamFormFields } from './TeamFormFields';
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

  // 2026-09-18 修复 M-4：表单初始化工厂（创建/编辑复用同一初始化逻辑，
  //   避免加字段时漏改一处）
  const initFormData = (team?: Team | null) => ({
    name: team?.name ?? '',
    leaderName: team?.leaderName ?? '',
    description: team?.description ?? '',
    workZone: team?.workZone ?? '',
    capabilityTags: Array.isArray(team?.taskCapabilities) ? (team!.taskCapabilities as string[]) : [],
    dailyCapacityHours: team?.dailyCapacityHours ?? 8,
  });

  // 打开新建班组弹窗
  const openCreateModal = () => {
    setEditingTeam(null);
    setSkillCapsLoaded(true); // 新建场景标签按"已加载"处理
    setFormData(initFormData(null));
    setIsFormOpen(true);
  };

  // 打开编辑弹窗
  const openEditModal = (team: Team) => {
    setEditingTeam(team);
    // 2026-09-17：技能标签回填改用 team_task_capabilities 数据源（与保存/派工口径一致）
    // 防御：区分「加载完成且为空数组」与「数据未就绪（undefined）」——
    // 后者回填成 [] 再保存会把已有标签全删（syncTeamCapabilities 是全量覆盖）
    setSkillCapsLoaded(Array.isArray(team.taskCapabilities));
    setFormData(initFormData(team));
    setIsFormOpen(true);
  };

  // 处理分配（操作人取当前登录用户，realName 优先；2026-09-18 修复 C-9：传 workerRoles 替代单一 role）
  const handleAssign = (teamId: string, workerIds: string[], workerRoles: Record<string, string>) => {
    assignWorkers(teamId, workerIds, currentUser?.oid || '', currentUser?.realName || currentUser?.username || '', workerRoles);
  };

  // 2026-09-18 修复 C-15/C-16：防止双击重复提交 + 必填校验
  const [submitting, setSubmitting] = useState(false);

  // 处理创建/编辑
  const handleSubmit = async () => {
    // 2026-09-18 修复 C-15：必填校验
    const name = formData.name.trim();
    const leaderName = formData.leaderName.trim();
    if (!name || !leaderName) {
      await showAlert('班组名称和负责人为必填项');
      return;
    }
    // 2026-09-18 修复 C-16：防双击
    if (submitting) return;
    setSubmitting(true);

    // 2026-09-16：清理自定义标签（去 custom: 前缀 + 移除 __custom_input__ 内部标记）
    const cleanedTags = (Array.isArray(formData.capabilityTags) ? formData.capabilityTags : [])
      .filter((t: string) => t !== '__custom_input__')
      .map((t: string) => t.startsWith('custom:') ? t.replace('custom:', '').trim() : t)
      .filter((t: string) => t.length > 0);

    try {
      let teamId: string;
      if (editingTeam) {
        teamId = editingTeam.id;
        await updateTeam(teamId, {
          name,
          leaderName,
          description: formData.description,
          dailyCapacityHours: formData.dailyCapacityHours,
        });
      } else {
        // 2026-09-18 修复 C-10：store.createTeam 现在真正返回 Promise<Team | undefined>
        // （hook 之前用 useCallback 包一层吞掉 Promise，await 拿到 undefined → teamId 永远空）
        const newTeam = await createTeam({
          name,
          leaderName,
          description: formData.description,
          dailyCapacityHours: formData.dailyCapacityHours,
        });
        teamId = newTeam?.id ?? '';
      }

      // 2026-09-16：同步子资源（任务能力）
      // 2026-09-17：作业区域界面已下线，只同步技能标签；失败时显式提示（Fail Loud）
      // 2026-09-18 修复 C-11：store.write 操作现在会 throw，try/catch 显式提示用户
      if (teamId && skillCapsLoaded) {
        try {
          await syncTeamCapabilities(teamId, cleanedTags);
        } catch (err) {
          console.error('同步技能标签失败:', err);
          await showAlert('班组信息已保存，但技能标签同步失败。请重试或联系管理员。');
          setSubmitting(false);
          return;
        }
      }
      setIsFormOpen(false);
    } catch (err) {
      // 2026-09-18 修复 C-11：store 失败时弹窗，Modal 保持打开让用户重试
      console.error('保存班组失败:', err);
      await showAlert(`保存失败：${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setSubmitting(false);
    }
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

  // 全选/取消全选（2026-09-18 修复 M-15：useTeam 返回的 teams 是分页后的，
  //   与过滤后的全集长度不一致会漏选。用 filteredTeams 才是当前可见的全集）
  const handleSelectAll = () => {
    if (selectedRows.length === filteredTeams.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredTeams.map(t => t.id));
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
        {/* 2026-09-18 修复 M-5：3 张统计卡片抽到 StatCard 组件 */}
        <StatCard icon={Users} label="班组数量" value={filteredTeams.length} color="emerald" />
        <StatCard
          icon={Users}
          label="总人数"
          value={teams.reduce((sum, team) => sum + team.memberCount, 0)}
          color="blue"
        />
        <StatCard icon={UserPlus} label="未分配" value={unassignedWorkers.length} color="amber" />
      </div>

      {/* 2026-09-18 修复 M-1：筛选栏/工具栏抽到独立组件 */}
      <FiltersBar
        filters={filters}
        onChange={setFilters}
      />

      {/* 班组列表表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <ToolbarHeader
          batchDeleteMode={batchDeleteMode}
          selectedCount={selectedRows.length}
          canCreate={canCreate}
          canDelete={canDelete}
          onEnterBatchDelete={() => setBatchDeleteMode(true)}
          onConfirmBatchDelete={handleBatchDelete}
          onCancelBatchDelete={handleCancelBatch}
          onCreate={openCreateModal}
        />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <TableRow>
                {batchDeleteMode && (
                  <TableHead className="px-4 py-3 text-sm font-semibold w-12 text-white">
                    <Checkbox
                      checked={selectedRows.length === filteredTeams.length && filteredTeams.length > 0}
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
              {teams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={batchDeleteMode ? 8 : 7} className="px-4 py-8 text-center text-gray-500">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                teams.map((team) => (
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
                        {/* 2026-09-18 修复 M-11：图标按钮加 aria-label（title 仅作 tooltip） */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDetailModal(team)}
                          title="查看详情"
                          aria-label="查看班组详情"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openAssignModal(team)}
                          title="分配工人"
                          aria-label="分配工人"
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(team)}
                            title="编辑"
                            aria-label="编辑班组"
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
                            aria-label="删除班组"
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
                          aria-label="为该班组批量排班"
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
            <Button onClick={handleSubmit} disabled={submitting}>
              <Save className="w-4 h-4" /> {submitting ? '保存中...' : '保存'}
            </Button>
          </div>
        }
      >
        {/* 2026-09-18 修复 M-1：表单内层字段抽到 TeamFormFields 组件 */}
        <TeamFormFields
          value={{
            name: formData.name,
            leaderName: formData.leaderName,
            description: formData.description,
            capabilityTags: formData.capabilityTags || [],
            dailyCapacityHours: formData.dailyCapacityHours ?? 8,
          }}
          onChange={(next) => setFormData((prev) => ({ ...prev, ...next }))}
        />
      </UnifiedModal>
    </div>
  );
}
