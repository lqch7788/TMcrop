/**
 * 从 V1.3 100% 一致复制
 */
import { useState } from 'react';
import { Video, Power, Wifi, AlertCircle, ChevronLeft, ChevronRight, Camera, Monitor } from 'lucide-react';

const deviceData = [
  { id: 'V001', name: '温室1号球机', type: '球机', location: '1号温室-A区', status: '运行中', online: true, lastUpdate: '2026-03-14 10:30', channel: 1 },
  { id: 'V002', name: '温室1号枪机', type: '枪机', location: '1号温室-B区', status: '运行中', online: true, lastUpdate: '2026-03-14 10:28', channel: 2 },
  { id: 'V003', name: '温室2号球机', type: '球机', location: '2号温室', status: '待机', online: true, lastUpdate: '2026-03-14 10:30', channel: 3 },
  { id: 'V004', name: '大棚1号枪机', type: '枪机', location: '1号大棚', status: '离线', online: false, lastUpdate: '2026-03-14 09:15', channel: 4 },
  { id: 'V005', name: '大棚2号球机', type: '球机', location: '2号大棚', status: '运行中', online: true, lastUpdate: '2026-03-14 10:29', channel: 5 },
  { id: 'V006', name: '办公区球机', type: '球机', location: '办公楼', status: '运行中', online: true, lastUpdate: '2026-03-14 10:30', channel: 6 },
  { id: 'V007', name: '仓库枪机', type: '枪机', location: '仓库', status: '告警', online: true, lastUpdate: '2026-03-14 10:25', channel: 7 },
  { id: 'V008', name: '大门口球机', type: '球机', location: '大门口', status: '运行中', online: true, lastUpdate: '2026-03-14 10:30', channel: 8 },
];

export default function VideoMonitor() {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(deviceData.length / pageSize);
  const paginatedData = deviceData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const runningCount = deviceData.filter(d => d.status === '运行中').length;
  const standbyCount = deviceData.filter(d => d.status === '待机').length;
  const offlineCount = deviceData.filter(d => d.status === '离线').length;
  const alertCount = deviceData.filter(d => d.status === '告警').length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Video className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">视频监控中心</h1>
            <p className="text-gray-500">实时监控全场视频设备运行状态</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Power className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{runningCount}</p>
              <p className="text-xs text-gray-500">运行中</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{standbyCount}</p>
              <p className="text-xs text-gray-500">待机</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{offlineCount}</p>
              <p className="text-xs text-gray-500">离线</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{alertCount}</p>
              <p className="text-xs text-gray-500">告警</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">视频设备列表</h3>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2">
              <Camera className="w-4 h-4" />添加设备
            </button>
            <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm flex items-center gap-2">
              <Monitor className="w-4 h-4" />预览全部
            </button>
          </div>
        </div>
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">设备ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">设备名称</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">设备类型</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">安装位置</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">通道号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">运行状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">在线状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">最后更新</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedData.map((device) => (
              <tr key={device.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{device.id}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{device.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{device.type}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{device.location}</td>
                <td className="px-4 py-3 text-sm text-gray-600">CH-{device.channel}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${device.status === '运行中' ? 'bg-green-100 text-green-700' : device.status === '待机' ? 'bg-gray-100 text-gray-700' : device.status === '告警' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>{device.status}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${device.online ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{device.online ? '在线' : '离线'}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{device.lastUpdate}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
          <div className="text-sm text-gray-500">共 {deviceData.length} 条记录，第 {currentPage}/{totalPages} 页</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
            {[...Array(totalPages)].map((_, i) => (
              <button key={i + 1} onClick={() => setCurrentPage(i + 1)} className={`w-9 h-9 rounded-lg text-sm ${currentPage === i + 1 ? 'bg-emerald-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{i + 1}</button>
            ))}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
