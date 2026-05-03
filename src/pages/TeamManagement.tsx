/**
 * 班组管理页面
 * 功能：班组和班次的新增、编辑、删除、查询
 * 使用 API 替代 localStorage
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Plus, Edit2, Trash2, ChevronDown, ChevronUp, ChevronLeft, Loader2, AlertTriangle } from 'lucide-react';

interface Team {
  id: string;
  oid: string;
  teamCode: string;
  teamName: string;
  departmentOid: string;
  departmentName: string;
  leaderName: string;
  shiftType: string;
  memberCount: number;
  description: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface Shift {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  teams: string[];
  status: 'active' | 'inactive';
}

const API_BASE = '/api/basic-data/teams';

export default function TeamManagement() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [newTeam, setNewTeam] = useState<Partial<Team>>({ status: 'active' });
  const [newShift, setNewShift] = useState<Partial<Shift>>({ status: 'active', teams: [] });
  const [expandedTeams, setExpandedTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'teams' | 'shifts'>('teams');

  // 加载班组数据
  const loadTeams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(API_BASE);
      const result = await response.json();
      if (result.success) {
        setTeams(result.data || []);
      } else {
        setError('获取班组数据失败');
      }
    } catch (err) {
      console.error('加载班组数据失败:', err);
      setError('加载班组数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const filteredTeams = teams.filter(t =>
    t.teamName?.includes(searchTerm) || t.teamCode?.includes(searchTerm) || t.leaderName?.includes(searchTerm)
  );

  const handleSaveTeam = async () => {
    if (!newTeam.teamName || !newTeam.teamCode) {
      alert('请填写班组名称和编码');
      return;
    }
    try {
      if (editingTeam) {
        const response = await fetch(`${API_BASE}/${editingTeam.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamName: newTeam.teamName,
            teamCode: newTeam.teamCode,
            departmentOid: newTeam.departmentOid,
            leaderName: newTeam.leaderName,
            shiftType: newTeam.shiftType,
            memberCount: newTeam.memberCount,
            description: newTeam.description,
          }),
        });
        const result = await response.json();
        if (result.success) {
          await loadTeams();
          setShowTeamModal(false);
          setEditingTeam(null);
          setNewTeam({ status: 'active' });
        } else {
          alert(result.error || '更新失败');
        }
      } else {
        const response = await fetch(API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamName: newTeam.teamName,
            teamCode: newTeam.teamCode,
            departmentOid: newTeam.departmentOid,
            leaderName: newTeam.leaderName,
            shiftType: newTeam.shiftType,
            memberCount: newTeam.memberCount,
            description: newTeam.description,
          }),
        });
        const result = await response.json();
        if (result.success) {
          await loadTeams();
          setShowTeamModal(false);
          setNewTeam({ status: 'active' });
        } else {
          alert(result.error || '创建失败');
        }
      }
    } catch (err) {
      console.error('保存班组失败:', err);
      alert('保存班组失败');
    }
  };

  const deleteTeam = async (id: string) => {
    if (!confirm('确定删除该班组吗？')) return;
    try {
      const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        await loadTeams();
      } else {
        alert(result.error || '删除失败');
      }
    } catch (err) {
      console.error('删除班组失败:', err);
      alert('删除班组失败');
    }
  };

  const editTeam = (team: Team) => {
    setEditingTeam(team);
    setNewTeam(team);
    setShowTeamModal(true);
  };

  const toggleExpandTeam = (id: string) => {
    setExpandedTeams(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <h2 className="text-xl font-bold text-gray-900">班组管理</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'teams' as const, label: '班组管理', icon: Users },
          { id: 'shifts' as const, label: '班次管理', icon: ChevronDown },
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

      {/* 班组管理 */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setEditingTeam(null); setNewTeam({ status: 'active' }); setShowTeamModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              新增班组
            </button>
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
                  <div>
                    <p className="text-gray-500">班长</p>
                    <p className="text-gray-900 font-medium">{team.leaderName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">部门</p>
                    <p className="text-gray-900 font-medium">{team.departmentName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">成员数</p>
                    <p className="text-gray-900 font-medium">{team.memberCount || 0}人</p>
                  </div>
                  <div>
                    <p className="text-gray-500">创建时间</p>
                    <p className="text-gray-900 font-medium">{team.createdAt?.split('T')[0] || '-'}</p>
                  </div>
                </div>
                {team.description && (
                  <p className="text-xs text-gray-500 mb-3">{team.description}</p>
                )}
                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button onClick={() => editTeam(team)} className="p-1.5 hover:bg-gray-100 rounded">
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </button>
                  <button onClick={() => deleteTeam(team.id)} className="p-1.5 hover:bg-red-50 rounded">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 班次管理 - 当前为本地状态，仅做UI展示 */}
      {activeTab === 'shifts' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center text-gray-500">
            <p>班次管理功能开发中</p>
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
                  <input
                    type="text"
                    value={newTeam.teamName || ''}
                    onChange={(e) => setNewTeam({ ...newTeam, teamName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">班组编码</label>
                  <input
                    type="text"
                    value={newTeam.teamCode || ''}
                    onChange={(e) => setNewTeam({ ...newTeam, teamCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">班长</label>
                  <input
                    type="text"
                    value={newTeam.leaderName || ''}
                    onChange={(e) => setNewTeam({ ...newTeam, leaderName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
                  <input
                    type="text"
                    value={newTeam.departmentOid || ''}
                    onChange={(e) => setNewTeam({ ...newTeam, departmentOid: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">班次类型</label>
                  <input
                    type="text"
                    value={newTeam.shiftType || ''}
                    onChange={(e) => setNewTeam({ ...newTeam, shiftType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="如：早班/中班/晚班"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">成员数量</label>
                  <input
                    type="number"
                    value={newTeam.memberCount || 0}
                    onChange={(e) => setNewTeam({ ...newTeam, memberCount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={newTeam.description || ''}
                  onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => { setShowTeamModal(false); setEditingTeam(null); setNewTeam({ status: 'active' }); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">取消</button>
              <button onClick={handleSaveTeam} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
