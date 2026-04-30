import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Monitor, Search, Plus, Edit2, Trash2, Wifi, WifiOff, Power, Settings, ChevronLeft } from 'lucide-react';

interface Device {
  id: string;
  name: string;
  code: string;
  type: string;
  location: string;
  status: 'online' | 'offline' | 'maintenance';
  lastSeen: string;
  parameters: Record<string, string | number>;
}

const STORAGE_KEY = 'device_management_data';

const DEVICE_TYPES = ['传感器', '摄像头', '控制器', '气象站', '灌溉设备', '施肥设备', '其他'];

const DEFAULT_DEVICES: Device[] = [
  { id: '1', name: '温室1号温度传感器', code: 'TEMP-001', type: '传感器', location: 'A区-温室1', status: 'online', lastSeen: '2024-03-15 10:30', parameters: { '当前温度': '25.6°C', '精度': '±0.5°C' } },
  { id: '2', name: '温室1号湿度传感器', code: 'HUM-001', type: '传感器', location: 'A区-温室1', status: 'online', lastSeen: '2024-03-15 10:29', parameters: { '当前湿度': '65%', '精度': '±3%' } },
  { id: '3', name: 'A区高清摄像头', code: 'CAM-001', type: '摄像头', location: 'A区-入口', status: 'online', lastSeen: '2024-03-15 10:30', parameters: { '分辨率': '1080P', '视角': '120°' } },
  { id: '4', name: '灌溉控制器', code: 'IRR-001', type: '灌溉设备', location: 'A区-灌溉房', status: 'offline', lastSeen: '2024-03-14 18:00', parameters: { '状态': '离线', '模式': '自动' } },
  { id: '5', name: '气象站', code: 'WS-001', type: '气象站', location: '园区入口', status: 'online', lastSeen: '2024-03-15 10:30', parameters: { '风速': '2.3m/s', '气压': '1013hPa' } },
];

export default function DeviceManagement() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [newDevice, setNewDevice] = useState<Partial<Device>>({ status: 'offline', parameters: {} });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setDevices(JSON.parse(saved));
    } else {
      setDevices(DEFAULT_DEVICES);
    }
  }, []);

  useEffect(() => {
    if (devices.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
    }
  }, [devices]);

  const filteredDevices = devices.filter(d => {
    const matchSearch = d.name.includes(searchTerm) || d.code.includes(searchTerm) || d.location.includes(searchTerm);
    const matchType = filterType === 'all' || d.type === filterType;
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const handleSaveDevice = () => {
    if (editingDevice) {
      setDevices(devices.map(d => d.id === editingDevice.id ? { ...d, ...newDevice } as Device : d));
    } else {
      setDevices([...devices, { ...newDevice, id: Date.now().toString(), lastSeen: new Date().toLocaleString('zh-CN') } as Device]);
    }
    setShowModal(false);
    setEditingDevice(null);
    setNewDevice({ status: 'offline', parameters: {} });
  };

  const deleteDevice = (id: string) => {
    if (confirm('确定删除该设备吗？')) {
      setDevices(devices.filter(d => d.id !== id));
    }
  };

  const editDevice = (device: Device) => {
    setEditingDevice(device);
    setNewDevice(device);
    setShowModal(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <Wifi className="w-4 h-4 text-green-600" />;
      case 'offline': return <WifiOff className="w-4 h-4 text-gray-400" />;
      case 'maintenance': return <Settings className="w-4 h-4 text-yellow-600" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = { online: '在线', offline: '离线', maintenance: '维护中' };
    return map[status] || status;
  };

  const stats = {
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
    maintenance: devices.filter(d => d.status === 'maintenance').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <h2 className="text-xl font-bold text-gray-900">设备管理</h2>
        </div>
        <button
          onClick={() => { setEditingDevice(null); setNewDevice({ status: 'offline', parameters: {} }); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          新增设备
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">设备总数</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-green-600">在线设备</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.online}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-400">离线设备</p>
          <p className="text-2xl font-bold text-gray-400 mt-1">{stats.offline}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-yellow-600">维护中</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.maintenance}</p>
        </div>
      </div>

      {/* 过滤 */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索设备..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="all">全部类型</option>
          {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="all">全部状态</option>
          <option value="online">在线</option>
          <option value="offline">离线</option>
          <option value="maintenance">维护中</option>
        </select>
      </div>

      {/* 设备列表 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredDevices.map(device => (
          <div key={device.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  device.status === 'online' ? 'bg-green-50' : device.status === 'offline' ? 'bg-gray-100' : 'bg-yellow-50'
                }`}>
                  <Monitor className={`w-5 h-5 ${
                    device.status === 'online' ? 'text-green-600' : device.status === 'offline' ? 'text-gray-400' : 'text-yellow-600'
                  }`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{device.name}</h3>
                  <p className="text-xs text-gray-500">{device.code}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {getStatusIcon(device.status)}
                <span className="text-xs text-gray-500">{getStatusLabel(device.status)}</span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">类型</span>
                <span className="text-gray-900">{device.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">位置</span>
                <span className="text-gray-900">{device.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">最后在线</span>
                <span className="text-gray-500 text-xs">{device.lastSeen}</span>
              </div>
            </div>
            {Object.keys(device.parameters).length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(device.parameters).slice(0, 3).map(([key, value]) => (
                    <span key={key} className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded">
                      {key}: {value}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
              <button onClick={() => editDevice(device)} className="p-1.5 hover:bg-gray-100 rounded">
                <Edit2 className="w-4 h-4 text-gray-600" />
              </button>
              <button onClick={() => deleteDevice(device.id)} className="p-1.5 hover:bg-red-50 rounded">
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 设备编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingDevice ? '编辑设备' : '新增设备'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">设备名称</label>
                <input
                  type="text"
                  value={newDevice.name || ''}
                  onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">设备编码</label>
                  <input
                    type="text"
                    value={newDevice.code || ''}
                    onChange={(e) => setNewDevice({ ...newDevice, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">设备类型</label>
                  <select
                    value={newDevice.type || ''}
                    onChange={(e) => setNewDevice({ ...newDevice, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">请选择</option>
                    {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">安装位置</label>
                <input
                  type="text"
                  value={newDevice.location || ''}
                  onChange={(e) => setNewDevice({ ...newDevice, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  value={newDevice.status || 'offline'}
                  onChange={(e) => setNewDevice({ ...newDevice, status: e.target.value as Device['status'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="online">在线</option>
                  <option value="offline">离线</option>
                  <option value="maintenance">维护中</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">取消</button>
              <button onClick={handleSaveDevice} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
