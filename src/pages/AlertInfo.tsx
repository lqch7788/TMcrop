import { useState } from 'react';
import { AlertTriangle, Thermometer, Droplets, Wind, Bug, Info, CheckCircle, XCircle } from 'lucide-react';
import { Pagination } from '@/components/ui';

const alertData = [
  { id: 'A001', type: '温度', level: 'warning', title: '温度偏高预警', message: '1号温室-A区当前温度32°C，超过28°C阈值', time: '2026-03-14 10:25', status: '待处理' },
  { id: 'A002', type: '设备', level: 'error', title: '设备离线告警', message: '灌溉水泵1号已离线超过1小时', time: '2026-03-14 09:15', status: '处理中' },
  { id: 'A003', type: '湿度', level: 'info', title: '湿度提醒', message: '2号温室-B区湿度65%，低于适宜湿度', time: '2026-03-14 08:30', status: '已处理' },
  { id: 'A004', type: '病虫害', level: 'warning', title: '病虫害预警', message: '检测到黄瓜叶片有轻微白粉病斑', time: '2026-03-13 16:00', status: '已处理' },
];

export default function AlertInfo() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const totalPages = Math.ceil(alertData.length / pageSize);
  const paginatedData = alertData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const getLevelStyle = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-50 border-red-200 text-red-700';
      case 'warning': return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'info': return <Info className="w-5 h-5 text-blue-500" />;
      default: return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">预警信息中心</h1>
            <p className="text-gray-500">实时监控各类异常告警信息</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-500" /></div><div><p className="text-2xl font-bold text-gray-900">3</p><p className="text-xs text-gray-500">紧急告警</p></div></div></div>
        <div className="bg-white rounded-xl p-4 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><Thermometer className="w-5 h-5 text-amber-500" /></div><div><p className="text-2xl font-bold text-gray-900">8</p><p className="text-xs text-gray-500">警告</p></div></div></div>
        <div className="bg-white rounded-xl p-4 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Info className="w-5 h-5 text-blue-500" /></div><div><p className="text-2xl font-bold text-gray-900">12</p><p className="text-xs text-gray-500">提示</p></div></div></div>
        <div className="bg-white rounded-xl p-4 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-green-500" /></div><div><p className="text-2xl font-bold text-gray-900">45</p><p className="text-xs text-gray-500">已处理</p></div></div></div>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100"><h3 className="text-lg font-semibold text-gray-900">告警列表</h3></div>
        <div className="divide-y divide-gray-100">
          {paginatedData.map((alert) => (
            <div key={alert.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getLevelStyle(alert.level)}`}>
                  {getLevelIcon(alert.level)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">{alert.title}</h4>
                    <span className="text-sm text-gray-500">{alert.time}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getLevelStyle(alert.level)}`}>{alert.type}</span>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${alert.status==='待处理'?'bg-red-100 text-red-700':alert.status==='处理中'?'bg-amber-100 text-amber-700':'bg-green-100 text-green-700'}`}>{alert.status}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* 分页组件 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">共 {alertData.length} 条记录</div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            pageSizeOptions={[5, 10, 20, 50]}
            showPageSize
          />
        </div>
      </div>
    </div>
  );
}
