/**
 * 设备管理页面
 * 功能：设备信息的新增、编辑、删除、查询
 * 使用 API 替代 localStorage
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Monitor, Search, Plus, Edit2, Trash2, Wifi, WifiOff, Settings, ChevronLeft, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';

interface Device {
  id: string;
  oid: string;
  deviceCode: string;
  deviceName: string;
  deviceType: string;
  manufacturer: string;
  serialNumber: string;
  greenhouseOid: string;
  greenhouseName: string;
  location: string;
  installDate: string;
  status: string;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  description: string;
  createdAt: string;
}

const API_BASE = '/api/basic-data/devices';

// 获取认证头
const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const DEVICE_TYPES = ['传感器', '摄像头', '控制器', '气象站', '灌溉设备', '施肥设备', '其他'];

export default function DeviceManagement() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [newDevice, setNewDevice] = useState<Partial<Device>>({ status: 'online' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载设备数据
  const loadDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(API_BASE, { headers: getAuthHeaders() });
      const result = await response.json();
      if (result.success) {
        setDevices(result.data || []);
      } else {
        setError('获取设备数据失败');
      }
    } catch (err) {
      console.error('加载设备数据失败:', err);
      setError('加载设备数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const filteredDevices = devices.filter(d => {
    const matchSearch = d.deviceName?.includes(searchTerm) || d.deviceCode?.includes(searchTerm) || d.location?.includes(searchTerm);
    const matchType = filterType === 'all' || d.deviceType === filterType;
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const handleSaveDevice = async () => {
    if (!newDevice.deviceName || !newDevice.deviceCode) {
      alert('请填写设备名称和编码');
      return;
    }
    try {
      if (editingDevice) {
        const response = await fetch(`${API_BASE}/${editingDevice.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            deviceName: newDevice.deviceName,
            deviceCode: newDevice.deviceCode,
            deviceType: newDevice.deviceType,
            manufacturer: newDevice.manufacturer,
            serialNumber: newDevice.serialNumber,
            greenhouseOid: newDevice.greenhouseOid,
            location: newDevice.location,
            installDate: newDevice.installDate,
            status: newDevice.status,
            description: newDevice.description,
          }),
        });
        const result = await response.json();
        if (result.success) {
          await loadDevices();
          setShowModal(false);
          setEditingDevice(null);
          setNewDevice({ status: 'online' });
        } else {
          alert(result.error || '更新失败');
        }
      } else {
        const response = await fetch(API_BASE, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            deviceName: newDevice.deviceName,
            deviceCode: newDevice.deviceCode,
            deviceType: newDevice.deviceType,
            manufacturer: newDevice.manufacturer,
            serialNumber: newDevice.serialNumber,
            greenhouseOid: newDevice.greenhouseOid,
            location: newDevice.location,
            installDate: newDevice.installDate,
            description: newDevice.description,
          }),
        });
        const result = await response.json();
        if (result.success) {
          await loadDevices();
          setShowModal(false);
          setNewDevice({ status: 'online' });
        } else {
          alert(result.error || '创建失败');
        }
      }
    } catch (err) {
      console.error('保存设备失败:', err);
      alert('保存设备失败');
    }
  };

  const deleteDevice = async (id: string) => {
    if (!confirm('确定删除该设备吗？')) return;
    try {
      const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      const result = await response.json();
      if (result.success) {
        await loadDevices();
      } else {
        alert(result.error || '删除失败');
      }
    } catch (err) {
      console.error('删除设备失败:', err);
      alert('删除设备失败');
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
          <h2 className="text-xl font-bold text-gray-900">设备管理</h2>
        </div>
        <Button
          variant="default"
          onClick={() => { setEditingDevice(null); setNewDevice({ status: 'online' }); setShowModal(true); }}
        >
          <Plus className="w-4 h-4" />
          新增设备
        </Button>
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
                  <h3 className="font-semibold text-gray-900 text-sm">{device.deviceName}</h3>
                  <p className="text-xs text-gray-500">{device.deviceCode}</p>
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
                <span className="text-gray-900">{device.deviceType || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">位置</span>
                <span className="text-gray-900">{device.location || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">温室</span>
                <span className="text-gray-900">{device.greenhouseName || '-'}</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
              <Button size="icon" variant="ghost" onClick={() => editDevice(device)}>
                <Edit2 className="w-4 h-4 text-gray-600" />
              </Button>
              <Button size="icon" variant="destructive" onClick={() => deleteDevice(device.id)}>
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
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
                  value={newDevice.deviceName || ''}
                  onChange={(e) => setNewDevice({ ...newDevice, deviceName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">设备编码</label>
                  <input
                    type="text"
                    value={newDevice.deviceCode || ''}
                    onChange={(e) => setNewDevice({ ...newDevice, deviceCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">设备类型</label>
                  <select
                    value={newDevice.deviceType || ''}
                    onChange={(e) => setNewDevice({ ...newDevice, deviceType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">请选择</option>
                    {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">厂商</label>
                  <input
                    type="text"
                    value={newDevice.manufacturer || ''}
                    onChange={(e) => setNewDevice({ ...newDevice, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">序列号</label>
                  <input
                    type="text"
                    value={newDevice.serialNumber || ''}
                    onChange={(e) => setNewDevice({ ...newDevice, serialNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
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
                  value={newDevice.status || 'online'}
                  onChange={(e) => setNewDevice({ ...newDevice, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="online">在线</option>
                  <option value="offline">离线</option>
                  <option value="maintenance">维护中</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => { setShowModal(false); setEditingDevice(null); setNewDevice({ status: 'online' }); }}>取消</Button>
              <Button variant="default" onClick={handleSaveDevice}>保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
