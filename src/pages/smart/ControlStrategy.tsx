/**
 * 控制策略 — 从 V1.3 100% 一致复制，path 适配 V1.1
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListTodo, Power, Clock, Search, Play, Pause, RefreshCw, Home, ArrowLeft, Settings, Plus, Edit, Trash2, Copy } from 'lucide-react';

const controlStrategies = [
  { id: 'strat-1', name: '大棚恒温策略', type: '温度控制', priority: '高', devices: ['通风机', '加热器', '遮阳帘'], schedule: '全天自动', status: 'active', triggers: 245 },
  { id: 'strat-2', name: '智能灌溉策略', type: '水分控制', priority: '高', devices: ['灌溉系统'], schedule: '定时(06:00, 18:00)', status: 'active', triggers: 89 },
  { id: 'strat-3', name: '节能通风策略', type: '环境控制', priority: '中', devices: ['通风机'], schedule: '条件触发', status: 'active', triggers: 156 },
  { id: 'strat-4', name: '施肥计划策略', type: '营养控制', priority: '中', devices: ['施肥系统'], schedule: '每周一/四', status: 'paused', triggers: 34 },
  { id: 'strat-5', name: '补光策略', type: '光照控制', priority: '低', devices: ['补光灯'], schedule: '16:00-20:00', status: 'active', triggers: 67 },
  { id: 'strat-6', name: 'CO2补充策略', type: '环境控制', priority: '中', devices: ['CO2发生器'], schedule: '08:00-16:00', status: 'active', triggers: 112 },
];

const statistics = { totalStrategies: 6, activeStrategies: 5, pausedStrategies: 1, totalTriggers: 703 };

export default function ControlStrategy() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);

  const filtered = controlStrategies.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchKeyword.toLowerCase()) || s.type.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      active: { bg: 'bg-green-100', text: 'text-green-700', label: '运行中' },
      paused: { bg: 'bg-amber-100', text: 'text-amber-700', label: '已暂停' },
    };
    const { bg, text, label } = map[status];
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>{label}</span>;
  };

  const getPriorityBadge = (priority: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      高: { bg: 'bg-red-100', text: 'text-red-700' },
      中: { bg: 'bg-amber-100', text: 'text-amber-700' },
      低: { bg: 'bg-blue-100', text: 'text-blue-700' },
    };
    const { bg, text } = map[priority];
    return <span className={`px-2 py-1 rounded text-xs font-medium ${bg} ${text}`}>{priority}</span>;
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/smart-center')} className="p-2 text-gray-600 hover:text-[#6366F1] hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">控制策略</h1>
            <p className="text-gray-500 mt-1">控制策略配置与管理</p>
          </div>
        </div>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-[#6366F1] hover:bg-gray-50 rounded-lg transition-colors">
          <Home className="w-5 h-5" /><span className="text-sm font-medium">返回主页</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { Icon: ListTodo, text: 'text-indigo-600', bg: 'bg-indigo-100', label: '控制策略', value: statistics.totalStrategies, vc: 'text-gray-800' },
          { Icon: Power, text: 'text-green-600', bg: 'bg-green-100', label: '运行中', value: statistics.activeStrategies, vc: 'text-green-600' },
          { Icon: Pause, text: 'text-amber-600', bg: 'bg-amber-100', label: '已暂停', value: statistics.pausedStrategies, vc: 'text-amber-600' },
          { Icon: Clock, text: 'text-cyan-600', bg: 'bg-cyan-100', label: '累计触发', value: statistics.totalTriggers, vc: 'text-cyan-600' },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}><c.Icon className={`w-5 h-5 ${c.text}`} /></div>
              <div>
                <p className="text-sm text-gray-500">{c.label}</p>
                <p className={`text-xl font-bold ${c.vc}`}>{c.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="搜索控制策略..." value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent" />
            </div>
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent">
            <option value="all">全部状态</option><option value="active">运行中</option><option value="paused">已暂停</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"><RefreshCw size={16} />刷新</button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#6366F1] text-white rounded-lg hover:bg-[#4F46E5] transition-colors"><Plus size={16} />新增策略</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">策略名称</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">类型</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">优先级</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">控制设备</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">执行计划</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{s.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.type}</td>
                <td className="px-4 py-3">{getPriorityBadge(s.priority)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  <div className="flex flex-wrap gap-1">
                    {s.devices.map((d, idx) => (<span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{d}</span>))}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.schedule}</td>
                <td className="px-4 py-3">{getStatusBadge(s.status)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => alert(`${s.status === 'active' ? '暂停' : '启动'}控制策略 ${s.id}`)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title={s.status === 'active' ? '暂停' : '启动'}>
                      {s.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button className="p-1.5 text-gray-500 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" title="复制"><Copy size={16} /></button>
                    <button className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="编辑"><Edit size={16} /></button>
                    <button className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="删除"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">新增控制策略</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">策略名称</label>
                <input type="text" placeholder="请输入策略名称" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">策略类型</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent">
                    <option value="">请选择</option><option value="temp">温度控制</option><option value="humidity">水分控制</option><option value="light">光照控制</option><option value="env">环境控制</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">优先级</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent">
                    <option value="">请选择</option><option value="high">高</option><option value="medium">中</option><option value="low">低</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">执行计划</label>
                <input type="text" placeholder="如：全天自动、定时(06:00)" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">控制设备</label>
                <div className="flex flex-wrap gap-2">
                  {['通风机', '加热器', '遮阳帘', '灌溉系统', '施肥系统', '补光灯'].map(d => (
                    <label key={d} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" className="rounded" /><span className="text-sm">{d}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">取消</button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-[#6366F1] text-white rounded-lg hover:bg-[#4F46E5] transition-colors">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}