/**
 * 从 V1.3 100% 一致复制
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, Home, ArrowLeft, Plus, Edit, Trash2, Eye, ToggleLeft, ToggleRight, Monitor, AlertCircle } from 'lucide-react';

const monitoringConfig = [
  { id: 'CFG-001', name: '温室环境监测配置', type: '环境监测', sensors: ['温度传感器', '湿度传感器', 'CO2传感器', '光照传感器'], interval: 60, enabled: true, alertEnabled: true, updateTime: '2025-01-10 10:00:00' },
  { id: 'CFG-002', name: '土壤监测配置', type: '土壤监测', sensors: ['土壤湿度传感器', '土壤温度传感器', 'EC传感器', 'pH传感器'], interval: 30, enabled: true, alertEnabled: true, updateTime: '2025-01-10 10:00:00' },
  { id: 'CFG-003', name: '气象站监测配置', type: '气象监测', sensors: ['温度传感器', '湿度传感器', '风速传感器', '气压传感器', '雨量传感器'], interval: 300, enabled: true, alertEnabled: false, updateTime: '2025-01-08 14:00:00' },
  { id: 'CFG-004', name: '能耗监测配置', type: '能耗监测', sensors: ['功率传感器', '电压传感器', '电流传感器'], interval: 60, enabled: true, alertEnabled: true, updateTime: '2025-01-12 09:00:00' },
  { id: 'CFG-005', name: '水培区监测配置', type: '水质监测', sensors: ['水温传感器', '溶解氧传感器', '浊度传感器', 'pH传感器'], interval: 30, enabled: true, alertEnabled: true, updateTime: '2025-01-11 11:00:00' },
  { id: 'CFG-006', name: '灌溉系统监测配置', type: '设备监测', sensors: ['流量传感器', '压力传感器', '液位传感器'], interval: 60, enabled: false, alertEnabled: false, updateTime: '2025-01-05 16:00:00' },
];

const statistics = { totalConfigs: 6, enabledConfigs: 5, disabledConfigs: 1, alertEnabled: 4, alertDisabled: 2 };

export default function MonitoringConfig() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('add');

  const filteredData = monitoringConfig.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchKeyword.toLowerCase()) || item.type.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchStatus = statusFilter === 'all' || (statusFilter === 'enabled' && item.enabled) || (statusFilter === 'disabled' && !item.enabled);
    return matchSearch && matchStatus;
  });

  const handleToggle = (id: string) => alert(`切换监测配置 ${id} 状态`);
  const handleEdit = () => { setModalType('edit'); setShowModal(true); };
  const handleView = () => { setModalType('view'); setShowModal(true); };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/iot-monitor')} className="p-2 text-gray-600 hover:text-[#6366F1] hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">监测配置</h1>
            <p className="text-gray-500 mt-1">监测设备配置</p>
          </div>
        </div>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-[#6366F1] hover:bg-gray-50 rounded-lg transition-colors">
          <Home className="w-5 h-5" /><span className="text-sm font-medium">返回主页</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { Icon: Monitor, bg: 'bg-blue-100', text: 'text-blue-600', label: '配置总数', value: statistics.totalConfigs, valColor: 'text-gray-800' },
          { Icon: ToggleRight, bg: 'bg-green-100', text: 'text-green-600', label: '已启用', value: statistics.enabledConfigs, valColor: 'text-green-600' },
          { Icon: ToggleLeft, bg: 'bg-gray-100', text: 'text-gray-600', label: '已禁用', value: statistics.disabledConfigs, valColor: 'text-gray-600' },
          { Icon: AlertCircle, bg: 'bg-amber-100', text: 'text-amber-600', label: '告警启用', value: statistics.alertEnabled, valColor: 'text-amber-600' },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.Icon className={`w-5 h-5 ${card.text}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className={`text-xl font-bold ${card.valColor}`}>{card.value}</p>
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
              <input type="text" placeholder="搜索配置名称..." value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent" />
            </div>
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent">
            <option value="all">全部状态</option><option value="enabled">已启用</option><option value="disabled">已禁用</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"><RefreshCw size={16} />刷新</button>
          <button onClick={() => { setModalType('add'); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-[#6366F1] text-white rounded-lg hover:bg-[#4F46E5] transition-colors"><Plus size={16} />新增配置</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">配置ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">配置名称</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">类型</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">关联传感器</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">采集间隔(秒)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">告警</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">更新时间</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredData.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.id}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.type}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  <div className="flex flex-wrap gap-1">
                    {item.sensors.slice(0, 3).map((sensor, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{sensor}</span>
                    ))}
                    {item.sensors.length > 3 && (<span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-xs">+{item.sensors.length - 3}</span>)}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.interval}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleToggle(item.id)} className={`flex items-center gap-1 ${item.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                    {item.enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                    <span className="text-xs">{item.enabled ? '启用' : '禁用'}</span>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.alertEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {item.alertEnabled ? '已启用' : '已禁用'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{item.updateTime}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={handleView} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="查看"><Eye size={16} /></button>
                    <button onClick={handleEdit} className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="编辑"><Edit size={16} /></button>
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
              <h3 className="text-lg font-semibold text-gray-800">
                {modalType === 'add' ? '新增监测配置' : modalType === 'edit' ? '编辑监测配置' : '配置详情'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">配置名称</label>
                <input type="text" placeholder="请输入配置名称" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">监测类型</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent">
                  <option value="">请选择</option><option value="env">环境监测</option><option value="soil">土壤监测</option>
                  <option value="weather">气象监测</option><option value="energy">能耗监测</option><option value="water">水质监测</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">采集间隔(秒)</label>
                <input type="number" placeholder="请输入采集间隔" defaultValue={60} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">关联传感器</label>
                <div className="flex flex-wrap gap-2">
                  {['温度传感器', '湿度传感器', 'CO2传感器', '光照传感器', '土壤湿度传感器', '土壤温度传感器'].map(sensor => (
                    <label key={sensor} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" className="rounded" /><span className="text-sm">{sensor}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">取消</button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-[#6366F1] text-white rounded-lg hover:bg-[#4F46E5] transition-colors">{modalType === 'view' ? '关闭' : '保存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
