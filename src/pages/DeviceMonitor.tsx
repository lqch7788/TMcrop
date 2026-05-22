import { useState } from 'react';
import { FileText, Power, Wifi, AlertCircle, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';

const deviceData = [
  { id: 'D001', name: '温室1号通风扇', type: '通风设备', location: '1号温室-A区', status: '运行中', online: true, lastUpdate: '2026-03-14 10:30' },
  { id: 'D002', name: '温室1号遮阳网', type: '遮阳设备', location: '1号温室-A区', status: '待机', online: true, lastUpdate: '2026-03-14 10:28' },
  { id: 'D003', name: '温室2号加热器', type: '温控设备', location: '2号温室', status: '运行中', online: true, lastUpdate: '2026-03-14 10:30' },
  { id: 'D004', name: '灌溉水泵1号', type: '灌溉设备', location: '1号温室', status: '离线', online: false, lastUpdate: '2026-03-14 09:15' },
  { id: 'D005', name: 'CO₂发生器', type: '环控设备', location: '1号温室-B区', status: '运行中', online: true, lastUpdate: '2026-03-14 10:29' },
];

export default function DeviceMonitor() {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(deviceData.length / pageSize);
  const paginatedData = deviceData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">设备监控中心</h1>
            <p className="text-gray-500">实时监控温室各类设备运行状态</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><Power className="w-5 h-5 text-green-500" /></div><div><p className="text-2xl font-bold text-gray-900">28</p><p className="text-xs text-gray-500">运行中</p></div></div></div>
        <div className="bg-white rounded-xl p-4 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center"><Wifi className="w-5 h-5 text-gray-500" /></div><div><p className="text-2xl font-bold text-gray-900">12</p><p className="text-xs text-gray-500">待机</p></div></div></div>
        <div className="bg-white rounded-xl p-4 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><XCircle className="w-5 h-5 text-red-500" /></div><div><p className="text-2xl font-bold text-gray-900">3</p><p className="text-xs text-gray-500">离线</p></div></div></div>
        <div className="bg-white rounded-xl p-4 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><AlertCircle className="w-5 h-5 text-blue-500" /></div><div><p className="text-2xl font-bold text-gray-900">2</p><p className="text-xs text-gray-500">告警</p></div></div></div>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">设备列表</h3>
          <Button variant="default">添加设备</Button>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">设备ID</th><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">设备名称</th><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">设备类型</th><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">安装位置</th><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">运行状态</th><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">在线状态</th><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">最后更新</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.map((device) => (
              <tr key={device.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{device.id}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{device.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{device.type}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{device.location}</td>
                <td className="px-4 py-3"><span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${device.status==='运行中'?'bg-green-100 text-green-700':device.status==='待机'?'bg-gray-100 text-gray-700':'bg-red-100 text-red-700'}`}>{device.status}</span></td>
                <td className="px-4 py-3"><span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${device.online?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{device.online?'在线':'离线'}</span></td>
                <td className="px-4 py-3 text-sm text-gray-500">{device.lastUpdate}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* 分页组件 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            共 {deviceData.length} 条记录，第 {currentPage}/{totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {[...Array(totalPages)].map((_, i) => (
              <Button
                key={i + 1}
                variant={currentPage === i + 1 ? 'default' : 'ghost'}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </Button>
            ))}
            <Button variant="ghost" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
