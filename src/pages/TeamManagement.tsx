/**
 * 班组管理页面
 * 功能：班组和班次的新增、编辑、删除、查询
 * 数据流：组件 → useTeamStore/useShiftStore → API → SQLite
 */
import { useState, useEffect } from 'react';
import { Users, Search, Plus, Edit2, Trash2, ChevronLeft, Loader2, AlertTriangle, Clock, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
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

  const filteredTeams = teams.filter(t =>
    t.teamName?.includes(searchTerm) || t.teamCode?.includes(searchTerm) || t.leaderName?.includes(searchTerm)
  );

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

      {/* 班组管理 TAB */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="default" onClick={() => { setEditingTeam(null); setNewTeam({ status: 'active' }); setShowTeamModal(true); }}>
              <Plus className="w-4 h-4" />
              新增班组
            </Button>
          </div>
          <div className="grid gap-4">
            {filteredTeams.map(team => (
              <div key={team.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <Users className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{team.teamName}</h3>
                      <p className="text-xs text-gray-500">{team.teamCode}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    team.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {team.status === 'active' ? '启用' : '停用'}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                  <div><p className="text-gray-500">班长</p><p className="text-gray-900 font-medium">{team.leaderName || '-'}</p></div>
                  <div><p className="text-gray-500">部门</p><p className="text-gray-900 font-medium">{team.departmentName || '-'}</p></div>
                  <div><p className="text-gray-500">成员数</p><p className="text-gray-900 font-medium">{team.memberCount || 0}人</p></div>
                  <div><p className="text-gray-500">创建时间</p><p className="text-gray-900 font-medium">{team.createdAt?.split('T')[0] || '-'}</p></div>
                </div>
                {team.description && <p className="text-xs text-gray-500 mb-3">{team.description}</p>}
                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                  <Button size="icon" variant="ghost" onClick={() => editTeam(team)}>
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </Button>
                  <Button size="icon" variant="destructive" onClick={() => handleDeleteTeam(team.id)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 班次管理 TAB */}
      {activeTab === 'shifts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="default" onClick={() => { setEditingShift(null); setNewShift({ status: 'active', shiftType: '早班' }); setShowShiftModal(true); }}>
              <Plus className="w-4 h-4" />
              新增班次
            </Button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">班次编码</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">班次名称</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">开始时间</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">结束时间</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shifts.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">暂无班次数据</td></tr>
                ) : (
                  shifts.map(shift => (
                    <tr key={shift.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-blue-600">{shift.shiftCode}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{shift.shiftName}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{shift.startTime}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{shift.endTime}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${shiftTypeColors[shift.shiftType || ''] || 'bg-gray-100 text-gray-600'}`}>
                          {shift.shiftType || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          shift.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {shift.status === 'active' ? '启用' : '停用'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => editShift(shift)} className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="编辑">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteShift(shift.id)} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors" title="删除">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">班组编码</label>
                  <input type="text" value={newTeam.teamCode || ''} onChange={(e) => setNewTeam({ ...newTeam, teamCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">班长</label>
                  <input type="text" value={newTeam.leaderName || ''} onChange={(e) => setNewTeam({ ...newTeam, leaderName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
                  <input type="text" value={newTeam.departmentOid || ''} onChange={(e) => setNewTeam({ ...newTeam, departmentOid: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">班次类型</label>
                  <input type="text" value={newTeam.shiftType || ''} onChange={(e) => setNewTeam({ ...newTeam, shiftType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="如：早班/中班/晚班" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">成员数量</label>
                  <input type="number" value={newTeam.memberCount || 0} onChange={(e) => setNewTeam({ ...newTeam, memberCount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea value={newTeam.description || ''} onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={2} />
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="如：SH001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">班次名称 *</label>
                  <input type="text" value={newShift.shiftName || ''} onChange={(e) => setNewShift({ ...newShift, shiftName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="如：早班" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">开始时间 *</label>
                  <input type="time" value={newShift.startTime || ''} onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">结束时间 *</label>
                  <input type="time" value={newShift.endTime || ''} onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">班次类型</label>
                  <select value={newShift.shiftType || '早班'} onChange={(e) => setNewShift({ ...newShift, shiftType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="早班">早班</option>
                    <option value="中班">中班</option>
                    <option value="晚班">晚班</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                  <select value={newShift.status || 'active'} onChange={(e) => setNewShift({ ...newShift, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="active">启用</option>
                    <option value="inactive">停用</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea value={newShift.description || ''} onChange={(e) => setNewShift({ ...newShift, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={2} placeholder="如：早班 06:00-14:00" />
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
