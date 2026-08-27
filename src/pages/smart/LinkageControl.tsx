/**
 * 联动控制 — 表格 UI 与订单管理（market/OrderManagement）保持一致
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Link2, Power, Search, Play, Pause, Home, Plus, Edit, Trash2, CheckCircle, Calendar,
} from 'lucide-react';

const linkageStrategies = [
  { id: 'link-1', name: '温湿度联动通风', trigger: '温度 > 30°C', action: '开启通风机', device: '通风机-1号', status: 'enabled', lastTrigger: '2025-01-15 14:30:00' },
  { id: 'link-2', name: '土壤湿度联动灌溉', trigger: '湿度 < 40%', action: '开启灌溉', device: '灌溉系统-1号区', status: 'enabled', lastTrigger: '2025-01-15 10:00:00' },
  { id: 'link-3', name: '光照联动遮阳', trigger: '光照 > 80000 lux', action: '开启遮阳帘', device: '遮阳帘-1号', status: 'enabled', lastTrigger: '2025-01-15 12:00:00' },
  { id: 'link-4', name: 'CO2联动通风', trigger: 'CO2 > 800ppm', action: '开启通风机', device: '通风机-2号', status: 'disabled', lastTrigger: '2025-01-14 16:00:00' },
  { id: 'link-5', name: '雨量联动防雨', trigger: '降雨传感器触发', action: '关闭天窗', device: '天窗控制器', status: 'enabled', lastTrigger: '2025-01-10 08:00:00' },
  { id: 'link-6', name: 'PM2.5联动净化', trigger: 'PM2.5 > 150μg/m³', action: '开启空气净化', device: '空气净化器-1号', status: 'enabled', lastTrigger: '2025-01-15 08:30:00' },
];

const statistics = { totalStrategies: 6, enabledStrategies: 5, disabledStrategies: 1, activeToday: 3, totalTriggers: 127 };

// 状态筛选（带"全部"）
const statuses = ['全部', '已启用', '已禁用'];

export default function LinkageControl() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);

  const filtered = linkageStrategies.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchKeyword.toLowerCase()) || s.trigger.toLowerCase().includes(searchKeyword.toLowerCase());
    const statusLabel = s.status === 'enabled' ? '已启用' : '已禁用';
    const matchStatus = statusFilter === '全部' || statusLabel === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 状态徽章：与订单管理风格一致
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enabled': return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" />, label: '已启用' };
      case 'disabled': return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Pause className="w-3 h-3" />, label: '已禁用' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Pause className="w-3 h-3" />, label: '未知' };
    }
  };

  return (
    <div className="pt-0 px-6 pb-6">
      {/* 页面标题 — 大图标卡（与订单管理风格一致） */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Link2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">联动控制</h1>
              <p className="text-gray-500 mt-1">设备联动策略管理</p>
            </div>
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
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { Icon: Link2, bg: 'bg-indigo-100', text: 'text-indigo-600', label: '联动策略', value: statistics.totalStrategies, vc: 'text-gray-800' },
          { Icon: Power, bg: 'bg-green-100', text: 'text-green-600', label: '已启用', value: statistics.enabledStrategies, vc: 'text-green-600' },
          { Icon: Link2, bg: 'bg-amber-100', text: 'text-amber-600', label: '今日触发', value: statistics.activeToday, vc: 'text-amber-600' },
          { Icon: Power, bg: 'bg-cyan-100', text: 'text-cyan-600', label: '累计触发', value: statistics.totalTriggers, vc: 'text-cyan-600' },
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
              placeholder="搜索联动策略..."
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">触发条件</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">执行动作</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">关联设备</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">最后触发</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedData.map(s => {
              const badge = getStatusBadge(s.status);
              return (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{s.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                      {s.trigger}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.action}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.device}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
                      {badge.icon}
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{s.lastTrigger}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => alert(`${s.status === 'enabled' ? '禁用' : '启用'}联动策略 ${s.id}`)}
                        className="p-1.5 text-gray-400 hover:text-[#2B5D3A] hover:bg-[#2B5D3A]/10 rounded transition-colors"
                        title={s.status === 'enabled' ? '禁用' : '启用'}
                      >
                        {s.status === 'enabled' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
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
              <h3 className="font-semibold text-gray-800">新增联动策略</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">策略名称</label>
                <input type="text" placeholder="请输入策略名称" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">触发条件</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]">
                  <option value="">请选择触发条件</option>
                  <option value="temp">温度阈值</option><option value="humidity">湿度阈值</option>
                  <option value="light">光照强度</option><option value="co2">CO2浓度</option><option value="soil">土壤湿度</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">执行动作</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]">
                  <option value="">请选择执行动作</option>
                  <option value="irrigation">开启灌溉</option><option value="ventilation">开启通风</option>
                  <option value="shade">开启遮阳</option><option value="fertigation">开启施肥</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">关联设备</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]">
                  <option value="">请选择关联设备</option>
                  <option value="device1">灌溉系统-1号区</option><option value="device2">通风机-1号</option><option value="device3">遮阳帘-1号</option>
                </select>
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
