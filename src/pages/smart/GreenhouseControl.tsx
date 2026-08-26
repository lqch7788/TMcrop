/**
 * 温室控制 — 表格 UI 与订单管理（market/OrderManagement）保持一致
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Thermometer, Plus, Search, Edit2, Trash2, Download, Home, AlertCircle, Calendar,
  CheckCircle, AlertTriangle, Clock,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';

interface GreenhouseDevice {
  id: string; deviceCode: string; deviceName: string; greenhouse: string; base: string;
  temperature: number; humidity: number; co2: number; light: number;
  status: string; operator: string; updateTime: string;
}

const initialData: GreenhouseDevice[] = [
  { id: '1', deviceCode: 'GH-CTL-001', deviceName: '1号温室环控器', greenhouse: '1号温室', base: '北京基地1号', temperature: 25.2, humidity: 68, co2: 420, light: 45000, status: '运行中', operator: '张建国', updateTime: '2026-03-26 08:30' },
  { id: '2', deviceCode: 'GH-CTL-002', deviceName: '2号温室环控器', greenhouse: '2号温室', base: '北京基地2号', temperature: 24.8, humidity: 65, co2: 415, light: 42000, status: '运行中', operator: '李秀英', updateTime: '2026-03-26 08:30' },
  { id: '3', deviceCode: 'GH-CTL-003', deviceName: '3号温室环控器', greenhouse: '3号温室', base: '山东寿光基地', temperature: 26.5, humidity: 72, co2: 438, light: 48000, status: '运行中', operator: '王志强', updateTime: '2026-03-26 08:29' },
  { id: '4', deviceCode: 'GH-CTL-004', deviceName: '4号温室环控器', greenhouse: '4号温室', base: '河南新乡基地', temperature: 35.2, humidity: 85, co2: 520, light: 52000, status: '告警', operator: '赵红梅', updateTime: '2026-03-26 08:28' },
  { id: '5', deviceCode: 'GH-CTL-005', deviceName: '5号温室环控器', greenhouse: '5号温室', base: '江苏南京基地', temperature: 23.5, humidity: 62, co2: 408, light: 38000, status: '运行中', operator: '陈伟明', updateTime: '2026-03-26 08:30' },
  { id: '6', deviceCode: 'GH-CTL-006', deviceName: '6号温室环控器', greenhouse: '6号温室', base: '山东青岛基地', temperature: 24.2, humidity: 70, co2: 425, light: 44000, status: '运行中', operator: '周小燕', updateTime: '2026-03-26 08:30' },
  { id: '7', deviceCode: 'GH-CTL-007', deviceName: '7号温室环控器', greenhouse: '7号温室', base: '云南昆明基地', temperature: 22.8, humidity: 75, co2: 412, light: 36000, status: '待机', operator: '吴海峰', updateTime: '2026-03-26 08:25' },
  { id: '8', deviceCode: 'GH-CTL-008', deviceName: '8号温室环控器', greenhouse: '8号温室', base: '云南大理基地', temperature: 21.5, humidity: 78, co2: 405, light: 32000, status: '运行中', operator: '郑晓丽', updateTime: '2026-03-26 08:30' },
  { id: '9', deviceCode: 'GH-CTL-009', deviceName: '9号温室环控器', greenhouse: '9号温室', base: '北京基地1号', temperature: 25.8, humidity: 66, co2: 422, light: 46000, status: '运行中', operator: '刘国庆', updateTime: '2026-03-26 08:30' },
  { id: '10', deviceCode: 'GH-CTL-010', deviceName: '10号温室环控器', greenhouse: '10号温室', base: '北京基地2号', temperature: 24.5, humidity: 63, co2: 418, light: 43000, status: '离线', operator: '孙立冬', updateTime: '2026-03-26 07:00' },
];

const bases = ['北京基地1号', '北京基地2号', '山东寿光基地', '河南新乡基地', '江苏南京基地', '山东青岛基地', '云南昆明基地', '云南大理基地'];
const greenhouses = ['1号温室', '2号温室', '3号温室', '4号温室', '5号温室', '6号温室', '7号温室', '8号温室', '9号温室', '10号温室'];
const operators = ['张建国', '李秀英', '王志强', '赵红梅', '陈伟明', '周小燕', '吴海峰', '郑晓丽', '刘国庆', '孙立冬'];
const statuses = ['运行中', '待机', '告警', '离线'];

export default function GreenhouseControl() {
  const navigate = useNavigate();
  const [data, setData] = useState<GreenhouseDevice[]>(initialData);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBase, setSearchBase] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit' | 'delete'>('add');
  const [selectedItem, setSelectedItem] = useState<GreenhouseDevice | null>(null);
  const [formData, setFormData] = useState<Partial<GreenhouseDevice>>({});

  const filteredData = data.filter(item => {
    const matchSearch = searchTerm === '' ||
      item.deviceCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.greenhouse.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch && (searchBase === '' || item.base === searchBase) && (searchStatus === '' || item.status === searchStatus);
  });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenModal = (type: 'add' | 'edit' | 'delete', item?: GreenhouseDevice) => {
    setModalType(type); setSelectedItem(item || null);
    setFormData(type === 'edit' && item ? item : {});
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (modalType === 'add') {
      setData([...data, { ...formData as GreenhouseDevice, id: String(data.length + 1), updateTime: new Date().toLocaleString('zh-CN') }]);
    } else if (modalType === 'edit' && selectedItem) {
      setData(data.map(item => item.id === selectedItem.id ? { ...item, ...formData } : item));
    } else if (modalType === 'delete' && selectedItem) {
      setData(data.filter(item => item.id !== selectedItem.id));
    }
    setIsModalOpen(false);
  };

  const handleExport = () => {
    const headers = ['设备编号', '设备名称', '温室', '基地', '温度(°C)', '湿度(%)', 'CO₂(ppm)', '光照(Lux)', '状态', '操作员', '更新时间'];
    const rows = filteredData.map(item => [item.deviceCode, item.deviceName, item.greenhouse, item.base, item.temperature, item.humidity, item.co2, item.light, item.status, item.operator, item.updateTime]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = '温室控制设备数据.csv'; link.click();
  };

  // 状态徽章：与订单管理风格一致（带 icon）
  const getStatusBadge = (status: string) => {
    switch (status) {
      case '运行中': return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" />, label: '运行中' };
      case '告警': return { bg: 'bg-red-100', text: 'text-red-700', icon: <AlertTriangle className="w-3 h-3" />, label: '告警' };
      case '待机': return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Clock className="w-3 h-3" />, label: '待机' };
      case '离线': return { bg: 'bg-gray-100', text: 'text-gray-500', icon: <Clock className="w-3 h-3" />, label: '离线' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Clock className="w-3 h-3" />, label: status };
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">温室控制</h1>
          <p className="text-gray-500 mt-1">温室环境监测与设备控制</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> 导出
          </button>
          <button
            onClick={() => handleOpenModal('add')}
            className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 新增设备
          </button>
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-600">状态：</span>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => { setSearchStatus(''); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  searchStatus === ''
                    ? 'bg-[#2B5D3A] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                全部状态
              </button>
              {statuses.map(s => (
                <button
                  key={s}
                  onClick={() => { setSearchStatus(s); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    searchStatus === s
                      ? 'bg-[#2B5D3A] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={searchBase}
              onChange={(e) => { setSearchBase(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
            >
              <option value="">全部基地</option>
              {bases.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <div className="relative min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索设备编号、名称..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">设备编号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">设备名称</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">温室</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">基地</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">温度(°C)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">湿度(%)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">CO₂(ppm)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">光照(Lux)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作员</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">更新时间</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedData.map((item) => {
              const badge = getStatusBadge(item.status);
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{item.deviceCode}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.deviceName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.greenhouse}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.base}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{item.temperature}°C</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{item.humidity}%</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{item.co2}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{item.light.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
                      {badge.icon}
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.operator}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.updateTime}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleOpenModal('edit', item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="编辑">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleOpenModal('delete', item)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="删除">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无数据</p>
          </div>
        )}
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">共 {filteredData.length} 条记录</p>
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={
        modalType === 'add' ? '新增温室控制器' : modalType === 'edit' ? '编辑温室控制器' : '删除确认'
      } size={modalType === 'delete' ? 'sm' : 'lg'}>
        {modalType === 'delete' ? (
          <div className="text-center py-4">
            <p className="text-gray-600 mb-6">确定要删除设备 "{selectedItem?.deviceName}" 吗？此操作不可撤销。</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">取消</button>
              <button onClick={handleSave} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">删除</button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">设备编号</label>
              <input type="text" value={formData.deviceCode || ''} onChange={(e) => setFormData({ ...formData, deviceCode: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="如: GH-CTL-011" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">设备名称</label>
              <input type="text" value={formData.deviceName || ''} onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="如: 11号温室环控器" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">温室</label>
              <select value={formData.greenhouse || ''} onChange={(e) => setFormData({ ...formData, greenhouse: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">请选择温室</option>
                {greenhouses.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">基地</label>
              <select value={formData.base || ''} onChange={(e) => setFormData({ ...formData, base: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">请选择基地</option>
                {bases.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">目标温度(°C)</label>
              <input type="number" value={formData.temperature || ''} onChange={(e) => setFormData({ ...formData, temperature: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="15-40" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">目标湿度(%)</label>
              <input type="number" value={formData.humidity || ''} onChange={(e) => setFormData({ ...formData, humidity: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="30-95" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CO₂浓度(ppm)</label>
              <input type="number" value={formData.co2 || ''} onChange={(e) => setFormData({ ...formData, co2: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="350-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">光照强度(Lux)</label>
              <input type="number" value={formData.light || ''} onChange={(e) => setFormData({ ...formData, light: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="20000-60000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <select value={formData.status || ''} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">请选择状态</option>
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">操作员</label>
              <select value={formData.operator || ''} onChange={(e) => setFormData({ ...formData, operator: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">请选择操作员</option>
                {operators.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="col-span-2 flex justify-end gap-3 mt-4">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">取消</button>
              <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                {modalType === 'add' ? '新增' : '保存'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}