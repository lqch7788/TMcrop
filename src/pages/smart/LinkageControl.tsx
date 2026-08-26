/**
 * 联动控制 — 从 V1.3 100% 一致复制，path 适配 V1.1
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, Power, Search, Play, Pause, RefreshCw, Home, ArrowLeft, Settings, Plus, Edit, Trash2 } from 'lucide-react';

const linkageStrategies = [
  { id: 'link-1', name: '温湿度联动通风', trigger: '温度 > 30°C', action: '开启通风机', device: '通风机-1号', status: 'enabled', lastTrigger: '2025-01-15 14:30:00' },
  { id: 'link-2', name: '土壤湿度联动灌溉', trigger: '湿度 < 40%', action: '开启灌溉', device: '灌溉系统-1号区', status: 'enabled', lastTrigger: '2025-01-15 10:00:00' },
  { id: 'link-3', name: '光照联动遮阳', trigger: '光照 > 80000 lux', action: '开启遮阳帘', device: '遮阳帘-1号', status: 'enabled', lastTrigger: '2025-01-15 12:00:00' },
  { id: 'link-4', name: 'CO2联动通风', trigger: 'CO2 > 800ppm', action: '开启通风机', device: '通风机-2号', status: 'disabled', lastTrigger: '2025-01-14 16:00:00' },
  { id: 'link-5', name: '雨量联动防雨', trigger: '降雨传感器触发', action: '关闭天窗', device: '天窗控制器', status: 'enabled', lastTrigger: '2025-01-10 08:00:00' },
  { id: 'link-6', name: 'PM2.5联动净化', trigger: 'PM2.5 > 150μg/m³', action: '开启空气净化', device: '空气净化器-1号', status: 'enabled', lastTrigger: '2025-01-15 08:30:00' },
];

const statistics = { totalStrategies: 6, enabledStrategies: 5, disabledStrategies: 1, activeToday: 3, totalTriggers: 127 };

export default function LinkageControl() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);

  const filtered = linkageStrategies.filter(s =>
    (s.name.toLowerCase().includes(searchKeyword.toLowerCase()) || s.trigger.toLowerCase().includes(searchKeyword.toLowerCase())) &&
    (statusFilter === 'all' || s.status === statusFilter)
  );

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      enabled: { bg: 'bg-green-100', text: 'text-green-700', label: '已启用' },
      disabled: { bg: 'bg-gray-100', text: 'text-gray-700', label: '已禁用' },
    };
    const { bg, text, label } = map[status];
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>{label}</span>;
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/smart-center')} className="p-2 text-gray-600 hover:text-[#6366F1] hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">联动控制</h1>
            <p className="text-gray-500 mt-1">设备联动策略管理</p>
          </div>
        </div>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-[#6366F1] hover:bg-gray-50 rounded-lg transition-colors">
          <Home className="w-5 h-5" /><span className="text-sm font-medium">返回主页</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { Icon: Link2, bg: 'bg-indigo-100', text: 'text-indigo-600', label: '联动策略', value: statistics.totalStrategies, vc: 'text-gray-800' },
          { Icon: Power, bg: 'bg-green-100', text: 'text-green-600', label: '已启用', value: statistics.enabledStrategies, vc: 'text-green-600' },
          { Icon: Link2, bg: 'bg-amber-100', text: 'text-amber-600', label: '今日触发', value: statistics.activeToday, vc: 'text-amber-600' },
          { Icon: Settings, bg: 'bg-cyan-100', text: 'text-cyan-600', label: '累计触发', value: statistics.totalTriggers, vc: 'text-cyan-600' },
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
              <input type="text" placeholder="搜索联动策略..." value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent" />
            </div>
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent">
            <option value="all">全部状态</option><option value="enabled">已启用</option><option value="disabled">已禁用</option>
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
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">触发条件</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">执行动作</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">关联设备</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">最后触发</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{s.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">{s.trigger}</span></td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.action}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.device}</td>
                <td className="px-4 py-3">{getStatusBadge(s.status)}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{s.lastTrigger}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => alert(`${s.status === 'enabled' ? '禁用' : '启用'}联动策略 ${s.id}`)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title={s.status === 'enabled' ? '禁用' : '启用'}>
                      {s.status === 'enabled' ? <Pause size={16} /> : <Play size={16} />}
                    </button>
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
              <h3 className="text-lg font-semibold text-gray-800">新增联动策略</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">策略名称</label>
                <input type="text" placeholder="请输入策略名称" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">触发条件</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent">
                  <option value="">请选择触发条件</option>
                  <option value="temp">温度阈值</option><option value="humidity">湿度阈值</option>
                  <option value="light">光照强度</option><option value="co2">CO2浓度</option><option value="soil">土壤湿度</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">执行动作</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent">
                  <option value="">请选择执行动作</option>
                  <option value="irrigation">开启灌溉</option><option value="ventilation">开启通风</option>
                  <option value="shade">开启遮阳</option><option value="fertigation">开启施肥</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">关联设备</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent">
                  <option value="">请选择关联设备</option>
                  <option value="device1">灌溉系统-1号区</option><option value="device2">通风机-1号</option><option value="device3">遮阳帘-1号</option>
                </select>
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