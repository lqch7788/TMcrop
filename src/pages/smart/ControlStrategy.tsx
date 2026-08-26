/**
 * 控制策略 — 表格 UI 与订单管理（market/OrderManagement）保持一致
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ListTodo, Power, Clock, Search, Play, Pause, Home, Plus, Edit, Trash2, Copy,
  CheckCircle, Calendar,
} from 'lucide-react';

const controlStrategies = [
  { id: 'strat-1', name: '大棚恒温策略', type: '温度控制', priority: '高', devices: ['通风机', '加热器', '遮阳帘'], schedule: '全天自动', status: 'active', triggers: 245 },
  { id: 'strat-2', name: '智能灌溉策略', type: '水分控制', priority: '高', devices: ['灌溉系统'], schedule: '定时(06:00, 18:00)', status: 'active', triggers: 89 },
  { id: 'strat-3', name: '节能通风策略', type: '环境控制', priority: '中', devices: ['通风机'], schedule: '条件触发', status: 'active', triggers: 156 },
  { id: 'strat-4', name: '施肥计划策略', type: '营养控制', priority: '中', devices: ['施肥系统'], schedule: '每周一/四', status: 'paused', triggers: 34 },
  { id: 'strat-5', name: '补光策略', type: '光照控制', priority: '低', devices: ['补光灯'], schedule: '16:00-20:00', status: 'active', triggers: 67 },
  { id: 'strat-6', name: 'CO2补充策略', type: '环境控制', priority: '中', devices: ['CO2发生器'], schedule: '08:00-16:00', status: 'active', triggers: 112 },
];

const statistics = { totalStrategies: 6, activeStrategies: 5, pausedStrategies: 1, totalTriggers: 703 };

// 状态筛选（带"全部"）
const statuses = ['全部', '运行中', '已暂停'];

export default function ControlStrategy() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);

  const filtered = controlStrategies.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchKeyword.toLowerCase()) || s.type.toLowerCase().includes(searchKeyword.toLowerCase());
    const statusLabel = s.status === 'active' ? '运行中' : '已暂停';
    const matchStatus = statusFilter === '全部' || statusLabel === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 状态徽章：与订单管理风格一致
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" />, label: '运行中' };
      case 'paused':
        return { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Pause className="w-3 h-3" />, label: '已暂停' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Clock className="w-3 h-3" />, label: '未知' };
    }
  };

  // 优先级徽章
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case '高': return 'bg-red-100 text-red-700';
      case '中': return 'bg-amber-100 text-amber-700';
      case '低': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">控制策略</h1>
          <p className="text-gray-500 mt-1">控制策略配置与管理</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 新增策略
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Home className="w-4 h-4" /> 返回主页
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { Icon: ListTodo, text: 'text-indigo-600', bg: 'bg-indigo-100', label: '控制策略', value: statistics.totalStrategies, vc: 'text-gray-800' },
          { Icon: Power, text: 'text-green-600', bg: 'bg-green-100', label: '运行中', value: statistics.activeStrategies, vc: 'text-green-600' },
          { Icon: Pause, text: 'text-amber-600', bg: 'bg-amber-100', label: '已暂停', value: statistics.pausedStrategies, vc: 'text-amber-600' },
          { Icon: Clock, text: 'text-cyan-600', bg: 'bg-cyan-100', label: '累计触发', value: statistics.totalTriggers, vc: 'text-cyan-600' },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}>
                <c.Icon className={`w-5 h-5 ${c.text}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{c.label}</p>
                <p className={`text-xl font-bold ${c.vc}`}>{c.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">状态：</span>
            <div className="flex gap-2">
              {statuses.map(status => (
                <button
                  key={status}
                  onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === status
                      ? 'bg-[#2B5D3A] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索策略名称或类型..."
              value={searchKeyword}
              onChange={(e) => { setSearchKeyword(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
            />
          </div>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">策略名称</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">类型</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">优先级</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">控制设备</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">执行计划</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">触发次数</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">状态</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedData.map(s => {
              const badge = getStatusBadge(s.status);
              return (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{s.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.type}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getPriorityBadge(s.priority)}`}>
                      {s.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div className="flex flex-wrap gap-1">
                      {s.devices.map((d, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{d}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.schedule}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.triggers}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
                      {badge.icon}
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => alert(`${s.status === 'active' ? '暂停' : '启动'}控制策略 ${s.id}`)}
                        className="p-1.5 text-gray-400 hover:text-[#2B5D3A] hover:bg-[#2B5D3A]/10 rounded transition-colors"
                        title={s.status === 'active' ? '暂停' : '启动'}
                      >
                        {s.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="复制"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无数据</p>
          </div>
        )}
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">共 {filtered.length} 条记录</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">每页</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
            >
              <option value={10}>10 条</option>
              <option value={20}>20 条</option>
              <option value={50}>50 条</option>
              <option value={100}>100 条</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            上一页
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded text-sm ${
                currentPage === page
                  ? 'bg-[#2B5D3A] text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      </div>

      {/* 新增策略弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg mx-4 shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-gray-800">新增控制策略</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">策略名称</label>
                <input type="text" placeholder="请输入策略名称" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">策略类型</label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]">
                    <option value="">请选择</option><option value="temp">温度控制</option><option value="humidity">水分控制</option><option value="light">光照控制</option><option value="env">环境控制</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">优先级</label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]">
                    <option value="">请选择</option><option value="high">高</option><option value="medium">中</option><option value="low">低</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">执行计划</label>
                <input type="text" placeholder="如：全天自动、定时(06:00)" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]" />
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
            <div className="px-6 py-4 border-t border-slate-200 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm transition-colors">取消</button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm hover:bg-[#245038] transition-colors">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
