/**
 * 班组管理页面
 * 功能：班组和班次的新增、编辑、删除、查询
 * 数据流：组件 → useTeamStore/useShiftStore → API → SQLite
 */
import { useState, useEffect, useMemo } from 'react';
import { Users, Search, Plus, Edit2, Trash2, ChevronLeft, Loader2, AlertTriangle, Clock, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Pagination } from '../components/ui/Pagination';
import { useTeamStore, useShiftStore } from '../stores';
import type { Team } from '../services/apiBasicDataService';
import type { Shift } from '../stores';
import { showAlert, showConfirm } from '@/lib/dialogService';

export default function TeamManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [newTeam, setNewTeam] = useState<Partial<Team>>({ status: 'active' });
  const [newShift, setNewShift] = useState<Partial<Shift>>({ status: 'active', shiftType: '早班' });
  const [activeTab, setActiveTab] = useState<'teams' | 'shifts'>('teams');
  const [teamCurrentPage, setTeamCurrentPage] = useState(1);
  const [shiftCurrentPage, setShiftCurrentPage] = useState(1);
  const pageSize = 10;

  // 班组 Store
  const {
    teams, loading, error,
    loadTeams, addTeam, editTeam: storeEditTeam, removeTeam,
  } = useTeamStore();

  // 班次 Store
  const { shifts, loadShifts, addShift, updateShift: storeUpdateShift, removeShift } = useShiftStore();

  useEffect(() => { loadTeams(); }, []);

  // 切换到班次tab时加载数据
  useEffect(() => {
    if (activeTab === 'shifts') loadShifts();
  }, [activeTab, loadShifts]);

  const filteredTeams = useMemo(() => {
    if (!searchTerm) return teams;
    const term = searchTerm.toLowerCase();
    return teams.filter(t =>
      t.teamName?.toLowerCase().includes(term) ||
      t.teamCode?.toLowerCase().includes(term) ||
      t.leaderName?.toLowerCase().includes(term)
    );
  }, [teams, searchTerm]);

  const paginatedTeams = useMemo(() => {
    const start = (teamCurrentPage - 1) * pageSize;
    return filteredTeams.slice(start, start + pageSize);
  }, [filteredTeams, teamCurrentPage]);

  const paginatedShifts = useMemo(() => {
    const start = (shiftCurrentPage - 1) * pageSize;
    return shifts.slice(start, start + pageSize);
  }, [shifts, shiftCurrentPage]);

  // ==================== 班组操作 ====================

  const handleSaveTeam = async () => {
    if (!newTeam.teamName || !newTeam.teamCode) {
      await showAlert('请填写班组名称和编码');
      return;
    }
    try {
      if (editingTeam) {
        await storeEditTeam(editingTeam.id, newTeam);
      } else {
        await addTeam(newTeam);
      }
      setShowTeamModal(false); setEditingTeam(null); setNewTeam({ status: 'active' });
    } catch (err) { console.error('保存班组失败:', err); await showAlert('保存班组失败'); }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!await showConfirm('确定删除该班组吗？')) return;
    try { await removeTeam(id); }
    catch (err) { console.error('删除班组失败:', err); await showAlert('删除班组失败'); }
  };

  const editTeam = (team: Team) => {
    setEditingTeam(team); setNewTeam(team); setShowTeamModal(true);
  };

  // ==================== 班次操作 ====================

  const handleSaveShift = async () => {
    if (!newShift.shiftName || !newShift.shiftCode || !newShift.startTime || !newShift.endTime) {
      await showAlert('请填写班次编码、名称、开始时间和结束时间');
      return;
    }
    try {
      if (editingShift) {
        await storeUpdateShift(editingShift.id, newShift);
      } else {
        await addShift(newShift);
      }
      setShowShiftModal(false); setEditingShift(null);
      setNewShift({ status: 'active', shiftType: '早班' });
    } catch (err) { console.error('保存班次失败:', err); await showAlert('保存班次失败'); }
  };

  const handleDeleteShift = async (id: number) => {
    if (!await showConfirm('确定删除该班次吗？')) return;
    try { await removeShift(id); }
    catch (err) { console.error('删除班次失败:', err); await showAlert('删除班次失败'); }
  };

  const editShift = (shift: Shift) => {
    setEditingShift(shift); setNewShift(shift); setShowShiftModal(true);
  };

  const shiftTypeColors: Record<string, string> = {
    '早班': 'bg-yellow-100 text-yellow-700',
    '中班': 'bg-blue-100 text-blue-700',
    '晚班': 'bg-indigo-100 text-indigo-700',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <AlertTriangle className="w-8 h-8 text-red-500" />
        <span className="ml-2 text-red-600">{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="/settings"
              className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center hover:from-gray-200 hover:to-gray-300 transition-colors"
              title="返回系统设置"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </a>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">班组管理</h1>
              <p className="text-gray-500">班组与班次信息管理</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'teams' as const, label: '班组管理', icon: Users },
          { id: 'shifts' as const, label: '班次管理', icon: Clock },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 班组管理 TAB - 表格形式 */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          {/* 工具栏 */}
          <div className="flex justify-between items-center">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-10"
                placeholder="搜索班组..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setTeamCurrentPage(1); }}
              />
            </div>
            <Button variant="default" onClick={() => { setEditingTeam(null); setNewTeam({ status: 'active' }); setShowTeamModal(true); }}>
              <Plus className="w-4 h-4" />
              新增班组
            </Button>
          </div>

          {/* 表格 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-380px)]">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">班组编码</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">班组名称</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">班长</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">部门</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">成员数</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">创建时间</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {paginatedTeams.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        {searchTerm ? '没有匹配的班组' : '暂无班组数据'}
                      </td>
                    </tr>
                  ) : (
                    paginatedTeams.map(team => (
                      <tr key={team.id} className="hover:bg-emerald-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-blue-600 whitespace-nowrap">{team.teamCode}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium whitespace-nowrap">{team.teamName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{team.leaderName || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{team.departmentName || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{team.memberCount || 0}人</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{team.createdAt?.split('T')[0] || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            team.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {team.status === 'active' ? '启用' : '停用'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Button size="icon" variant="ghost" onClick={() => editTeam(team)} title="编辑">
                              <Edit2 className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDeleteTeam(team.id)} title="删除">
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* 分页 */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <div className="text-sm text-gray-500">共 {filteredTeams.length} 条</div>
              <Pagination
                currentPage={teamCurrentPage}
                totalPages={Math.ceil(filteredTeams.length / pageSize) || 1}
                onPageChange={(page) => setTeamCurrentPage(page)}
                pageSize={pageSize}
                onPageSizeChange={(size) => { setTeamCurrentPage(1); }}
                pageSizeOptions={[10, 20, 50]}
                showPageSize
              />
            </div>
          </div>
        </div>
      )}

      {/* 班次管理 TAB - 表格形式 */}
      {activeTab === 'shifts' && (
        <div className="space-y-4">
          {/* 工具栏 */}
          <div className="flex justify-end">
            <Button variant="default" onClick={() => { setEditingShift(null); setNewShift({ status: 'active', shiftType: '早班' }); setShowShiftModal(true); }}>
              <Plus className="w-4 h-4" />
              新增班次
            </Button>
          </div>

          {/* 表格 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-380px)]">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">班次编码</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">班次名称</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">开始时间</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">结束时间</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">类型</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {paginatedShifts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">暂无班次数据</td>
                    </tr>
                  ) : (
                    paginatedShifts.map(shift => (
                      <tr key={shift.id} className="hover:bg-emerald-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-blue-600 whitespace-nowrap">{shift.shiftCode}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium whitespace-nowrap">{shift.shiftName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{shift.startTime}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{shift.endTime}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${shiftTypeColors[shift.shiftType || ''] || 'bg-gray-100 text-gray-600'}`}>
                            {shift.shiftType || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            shift.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {shift.status === 'active' ? '启用' : '停用'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Button size="icon" variant="ghost" onClick={() => editShift(shift)} title="编辑">
                              <Edit2 className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDeleteShift(shift.id)} title="删除">
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* 分页 */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <div className="text-sm text-gray-500">共 {shifts.length} 条</div>
              <Pagination
                currentPage={shiftCurrentPage}
                totalPages={Math.ceil(shifts.length / pageSize) || 1}
                onPageChange={(page) => setShiftCurrentPage(page)}
                pageSize={pageSize}
                onPageSizeChange={(size) => { setShiftCurrentPage(1); }}
                pageSizeOptions={[10, 20, 50]}
                showPageSize
              />
            </div>
          </div>
        </div>
      )}

      {/* 班组编辑弹窗 */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingTeam ? '编辑班组' : '新增班组'}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">班组名称</label>
                  <input type="text" value={newTeam.teamName || ''} onChange={(e) => setNewTeam({ ...newTeam, teamName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">班组编码</label>
                  <input type="text" value={newTeam.teamCode || ''} onChange={(e) => setNewTeam({ ...newTeam, teamCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">班长</label>
                  <input type="text" value={newTeam.leaderName || ''} onChange={(e) => setNewTeam({ ...newTeam, leaderName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
                  <input type="text" value={newTeam.departmentOid || ''} onChange={(e) => setNewTeam({ ...newTeam, departmentOid: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">班次类型</label>
                  <input type="text" value={newTeam.shiftType || ''} onChange={(e) => setNewTeam({ ...newTeam, shiftType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="如：早班/中班/晚班" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">成员数量</label>
                  <input type="number" value={newTeam.memberCount || 0} onChange={(e) => setNewTeam({ ...newTeam, memberCount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea value={newTeam.description || ''} onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={2} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => { setShowTeamModal(false); setEditingTeam(null); setNewTeam({ status: 'active' }); }}>取消</Button>
              <Button variant="default" onClick={handleSaveTeam}>保存</Button>
            </div>
          </div>
        </div>
      )}

      {/* 班次新增/编辑弹窗 */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingShift ? '编辑班次' : '新增班次'}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">班次编码 *</label>
                  <input type="text" value={newShift.shiftCode || ''} onChange={(e) => setNewShift({ ...newShift, shiftCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="如：SH001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">班次名称 *</label>
                  <input type="text" value={newShift.shiftName || ''} onChange={(e) => setNewShift({ ...newShift, shiftName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="如：早班" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">开始时间 *</label>
                  <input type="time" value={newShift.startTime || ''} onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">结束时间 *</label>
                  <input type="time" value={newShift.endTime || ''} onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">班次类型</label>
                  <select value={newShift.shiftType || '早班'} onChange={(e) => setNewShift({ ...newShift, shiftType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="早班">早班</option>
                    <option value="中班">中班</option>
                    <option value="晚班">晚班</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                  <select value={newShift.status || 'active'} onChange={(e) => setNewShift({ ...newShift, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="active">启用</option>
                    <option value="inactive">停用</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea value={newShift.description || ''} onChange={(e) => setNewShift({ ...newShift, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={2} placeholder="如：早班 06:00-14:00" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => { setShowShiftModal(false); setEditingShift(null); setNewShift({ status: 'active', shiftType: '早班' }); }}>取消</Button>
              <Button variant="default" onClick={handleSaveShift}>保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
