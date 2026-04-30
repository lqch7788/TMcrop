import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Plus, Edit2, Trash2, ChevronDown, ChevronUp, ChevronLeft } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  code: string;
  leader: string;
  members: string[];
  department: string;
  status: 'active' | 'inactive';
  description: string;
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

const STORAGE_KEY = 'team_management_data';

const DEFAULT_TEAMS: Team[] = [
  { id: '1', name: 'A区种植班', code: 'TEAM-A001', leader: '张三', members: ['李四', '王五', '赵六'], department: '生产部', status: 'active', description: '负责A区温室种植工作', createdAt: '2024-01-10' },
  { id: '2', name: 'B区种植班', code: 'TEAM-B001', leader: '钱七', members: ['孙八', '周九'], department: '生产部', status: 'active', description: '负责B区温室种植工作', createdAt: '2024-01-15' },
  { id: '3', name: '设备维护班', code: 'TEAM-M001', leader: '郑十', members: ['吴十一', '王十二'], department: '设备部', status: 'active', description: '负责园区设备维护', createdAt: '2024-02-01' },
  { id: '4', name: '仓储管理班', code: 'TEAM-W001', leader: '陈十三', members: ['刘十四'], department: '仓储部', status: 'active', description: '负责仓库物资管理', createdAt: '2024-02-10' },
];

const DEFAULT_SHIFTS: Shift[] = [
  { id: '1', name: '早班', code: 'SHIFT-M', startTime: '06:00', endTime: '14:00', teams: ['1', '2'], status: 'active' },
  { id: '2', name: '中班', code: 'SHIFT-A', startTime: '14:00', endTime: '22:00', teams: ['3'], status: 'active' },
  { id: '3', name: '晚班', code: 'SHIFT-N', startTime: '22:00', endTime: '06:00', teams: [], status: 'inactive' },
];

export default function TeamManagement() {
  const [activeTab, setActiveTab] = useState<'teams' | 'shifts'>('teams');
  const [teams, setTeams] = useState<Team[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [newTeam, setNewTeam] = useState<Partial<Team>>({ status: 'active', members: [] });
  const [newShift, setNewShift] = useState<Partial<Shift>>({ status: 'active', teams: [] });
  const [expandedTeams, setExpandedTeams] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      setTeams(data.teams || DEFAULT_TEAMS);
      setShifts(data.shifts || DEFAULT_SHIFTS);
    } else {
      setTeams(DEFAULT_TEAMS);
      setShifts(DEFAULT_SHIFTS);
    }
  }, []);

  useEffect(() => {
    if (teams.length > 0 || shifts.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ teams, shifts }));
    }
  }, [teams, shifts]);

  const filteredTeams = teams.filter(t =>
    t.name.includes(searchTerm) || t.code.includes(searchTerm) || t.leader.includes(searchTerm)
  );

  const filteredShifts = shifts.filter(s =>
    s.name.includes(searchTerm) || s.code.includes(searchTerm)
  );

  const handleSaveTeam = () => {
    if (editingTeam) {
      setTeams(teams.map(t => t.id === editingTeam.id ? { ...t, ...newTeam } as Team : t));
    } else {
      setTeams([...teams, { ...newTeam, id: Date.now().toString(), createdAt: new Date().toISOString().split('T')[0], members: newTeam.members || [] } as Team]);
    }
    setShowTeamModal(false);
    setEditingTeam(null);
    setNewTeam({ status: 'active', members: [] });
  };

  const handleSaveShift = () => {
    if (editingShift) {
      setShifts(shifts.map(s => s.id === editingShift.id ? { ...s, ...newShift } as Shift : s));
    } else {
      setShifts([...shifts, { ...newShift, id: Date.now().toString(), teams: newShift.teams || [] } as Shift]);
    }
    setShowShiftModal(false);
    setEditingShift(null);
    setNewShift({ status: 'active', teams: [] });
  };

  const deleteTeam = (id: string) => {
    if (confirm('确定删除该班组吗？')) {
      setTeams(teams.filter(t => t.id !== id));
    }
  };

  const deleteShift = (id: string) => {
    if (confirm('确定删除该班次吗？')) {
      setShifts(shifts.filter(s => s.id !== id));
    }
  };

  const editTeam = (team: Team) => {
    setEditingTeam(team);
    setNewTeam(team);
    setShowTeamModal(true);
  };

  const editShift = (shift: Shift) => {
    setEditingShift(shift);
    setNewShift(shift);
    setShowShiftModal(true);
  };

  const toggleExpandTeam = (id: string) => {
    setExpandedTeams(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

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
              onClick={() => { setEditingTeam(null); setNewTeam({ status: 'active', members: [] }); setShowTeamModal(true); }}
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
                      <h3 className="font-semibold text-gray-900">{team.name}</h3>
                      <p className="text-xs text-gray-500">{team.code}</p>
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
                    <p className="text-gray-900 font-medium">{team.leader}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">部门</p>
                    <p className="text-gray-900 font-medium">{team.department}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">成员数</p>
                    <p className="text-gray-900 font-medium">{team.members.length}人</p>
                  </div>
                  <div>
                    <p className="text-gray-500">创建时间</p>
                    <p className="text-gray-900 font-medium">{team.createdAt}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleExpandTeam(team.id)}
                  className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
                >
                  {expandedTeams.includes(team.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  查看成员 ({team.members.length})
                </button>
                {expandedTeams.includes(team.id) && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex flex-wrap gap-2">
                      {team.members.map((member, i) => (
                        <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">{member}</span>
                      ))}
                    </div>
                  </div>
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

      {/* 班次管理 */}
      {activeTab === 'shifts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setEditingShift(null); setNewShift({ status: 'active', teams: [] }); setShowShiftModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              新增班次
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">班次</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">编码</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">开始时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">结束时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">关联班组</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredShifts.map(shift => {
                  const relatedTeams = teams.filter(t => shift.teams.includes(t.id));
                  return (
                    <tr key={shift.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{shift.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{shift.code}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{shift.startTime}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{shift.endTime}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {relatedTeams.map(t => (
                            <span key={t.id} className="px-2 py-1 bg-emerald-50 text-emerald-600 text-xs rounded">{t.name}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          shift.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {shift.status === 'active' ? '启用' : '停用'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => editShift(shift)} className="p-1.5 hover:bg-gray-100 rounded">
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                          <button onClick={() => deleteShift(shift.id)} className="p-1.5 hover:bg-red-50 rounded">
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                  <input
                    type="text"
                    value={newTeam.name || ''}
                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">班组编码</label>
                  <input
                    type="text"
                    value={newTeam.code || ''}
                    onChange={(e) => setNewTeam({ ...newTeam, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">班长</label>
                  <input
                    type="text"
                    value={newTeam.leader || ''}
                    onChange={(e) => setNewTeam({ ...newTeam, leader: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">所属部门</label>
                  <input
                    type="text"
                    value={newTeam.department || ''}
                    onChange={(e) => setNewTeam({ ...newTeam, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">成员列表（逗号分隔）</label>
                <input
                  type="text"
                  value={(newTeam.members || []).join(', ')}
                  onChange={(e) => setNewTeam({ ...newTeam, members: e.target.value.split(',').map(m => m.trim()).filter(Boolean) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
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
              <button onClick={() => setShowTeamModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">取消</button>
              <button onClick={handleSaveTeam} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 班次编辑弹窗 */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingShift ? '编辑班次' : '新增班次'}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">班次名称</label>
                  <input
                    type="text"
                    value={newShift.name || ''}
                    onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">班次编码</label>
                  <input
                    type="text"
                    value={newShift.code || ''}
                    onChange={(e) => setNewShift({ ...newShift, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
                  <input
                    type="time"
                    value={newShift.startTime || ''}
                    onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
                  <input
                    type="time"
                    value={newShift.endTime || ''}
                    onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">关联班组</label>
                <div className="grid grid-cols-2 gap-2">
                  {teams.map(team => (
                    <label key={team.id} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={(newShift.teams || []).includes(team.id)}
                        onChange={(e) => {
                          const teamsList = e.target.checked
                            ? [...(newShift.teams || []), team.id]
                            : (newShift.teams || []).filter(t => t !== team.id);
                          setNewShift({ ...newShift, teams: teamsList });
                        }}
                        className="rounded"
                      />
                      {team.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowShiftModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">取消</button>
              <button onClick={handleSaveShift} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
