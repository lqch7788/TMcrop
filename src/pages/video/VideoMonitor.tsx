/**
 * 视频监控中心 — Tab 结构：
 *   - Tab 1: 视频预览总览（视频墙 + PTZ 控制 + 布局切换 1/4/6/9）
 *   - Tab 2: 设备列表（与 DeviceMonitor 表格 100% 一致）
 * 2026-08-29：接入 API（iot_cameras 表，替换原 mockData）
 */
import { useState, useEffect } from 'react';
import {
  Search, Plus, Download, Video, Power, Wifi, XCircle, CheckCircle, AlertCircle,
  Camera, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Maximize2, Repeat, LayoutGrid, Grid2X2, Grid3X3, VideoOff, Monitor,
} from 'lucide-react';
import { useIotCameraStore, type IotCamera } from '@/stores';

// 顶部基地选项
const bases = [
  { id: 'strawberry', name: '宁波小港草莓大棚' },
  { id: 'vegetable', name: '蔬菜大棚' },
];

// 状态筛选
const statusFilters = ['全部', '运行中', '待机', '告警', '离线'];

/**
 * 视频窗（黑色背景 + 红色文字 + 右上角关闭）
 */
function VideoCell({ device, onClose }: { device: IotCamera; onClose: () => void }) {
  const hasEnv = device.crop !== '-';
  const isOffline = !device.isOnline;
  return (
    <div className="relative bg-black overflow-hidden h-full w-full">
      <button
        onClick={onClose}
        className="absolute top-1 right-1 z-10 w-6 h-6 rounded-full bg-white/80 hover:bg-white text-gray-700 flex items-center justify-center shadow"
        title="关闭"
      >
        <XCircle className="w-4 h-4" />
      </button>

      {isOffline ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
          <VideoOff className="w-16 h-16" />
          <p className="text-sm mt-2">摄像头未连接</p>
        </div>
      ) : (
        <>
          <div className="absolute inset-0 p-3 text-[11px] leading-relaxed text-red-500 font-mono overflow-hidden">
            <p>区域名称：{device.location}</p>
            <p>设备名称：{device.deviceName}</p>
            {hasEnv && (
              <>
                <p>种植作物：{device.crop}{device.variety && device.variety !== '-' && `（${device.variety}）`}</p>
                <p>生长期：{device.stage}</p>
                <p>空气温湿度：{device.airTemp}°C/{device.airHumi}%</p>
                <p>土壤温湿度：{device.soilTemp}°C/{device.soilHumi}%</p>
                <p>室内光照度：{device.light}lx</p>
              </>
            )}
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/40 text-white text-sm px-3 py-1 rounded">
              The media could not be loaded
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * 视频墙网格（1/4/6/9 宫格切换）
 */
function VideoWall({ devices, layout, onClose }: { devices: IotCamera[]; layout: 1 | 4 | 6 | 9; onClose: (id: string) => void }) {
  const gridClass: Record<1 | 4 | 6 | 9, string> = {
    1: 'grid-cols-1 grid-rows-1',
    4: 'grid-cols-2 grid-rows-2',
    6: 'grid-cols-3 grid-rows-2',
    9: 'grid-cols-3 grid-rows-3',
  };
  const shown = devices.slice(0, layout);
  return (
    <div className={`grid gap-px bg-slate-200 ${gridClass[layout]} flex-1 min-h-0`}>
      {shown.map(d => (
        <VideoCell key={d.id} device={d} onClose={() => onClose(d.id)} />
      ))}
    </div>
  );
}

/**
 * PTZ 云台控制面板
 */
function PTZPanel() {
  const handlePTZ = (dir: string) => alert(`PTZ 控制：${dir}`);
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4">
      <div className="flex items-center gap-4">
        <div className="relative w-32 h-32 flex-shrink-0">
          <button onClick={() => handlePTZ('上')} className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 bg-white border border-slate-200 rounded shadow hover:bg-gray-50 flex items-center justify-center">
            <ChevronUp className="w-4 h-4 text-gray-700" />
          </button>
          <button onClick={() => handlePTZ('左')} className="absolute top-1/2 left-0 -translate-y-1/2 w-8 h-8 bg-white border border-slate-200 rounded shadow hover:bg-gray-50 flex items-center justify-center">
            <ChevronLeft className="w-4 h-4 text-gray-700" />
          </button>
          <button onClick={() => handlePTZ('自动')} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-blue-500 border border-blue-500 rounded-full shadow hover:bg-blue-600 flex items-center justify-center text-white text-xs font-medium">
            自动
          </button>
          <button onClick={() => handlePTZ('右')} className="absolute top-1/2 right-0 -translate-y-1/2 w-8 h-8 bg-white border border-slate-200 rounded shadow hover:bg-gray-50 flex items-center justify-center">
            <ChevronRight className="w-4 h-4 text-gray-700" />
          </button>
          <button onClick={() => handlePTZ('下')} className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-8 bg-white border border-slate-200 rounded shadow hover:bg-gray-50 flex items-center justify-center">
            <ChevronDown className="w-4 h-4 text-gray-700" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 flex-1">
          <button onClick={() => handlePTZ('放大')} className="flex flex-col items-center justify-center py-2 px-3 bg-white border border-slate-200 rounded shadow hover:bg-gray-50">
            <ZoomIn className="w-5 h-5 text-gray-700" />
            <span className="text-[10px] text-gray-500 mt-0.5">放大</span>
          </button>
          <button onClick={() => handlePTZ('缩小')} className="flex flex-col items-center justify-center py-2 px-3 bg-white border border-slate-200 rounded shadow hover:bg-gray-50">
            <ZoomOut className="w-5 h-5 text-gray-700" />
            <span className="text-[10px] text-gray-500 mt-0.5">缩小</span>
          </button>
          <button onClick={() => handlePTZ('聚焦+')} className="flex flex-col items-center justify-center py-2 px-3 bg-white border border-slate-200 rounded shadow hover:bg-gray-50">
            <ZoomIn className="w-5 h-5 text-gray-700" />
            <span className="text-[10px] text-gray-500 mt-0.5">聚焦+</span>
          </button>
          <button onClick={() => handlePTZ('聚焦-')} className="flex flex-col items-center justify-center py-2 px-3 bg-white border border-slate-200 rounded shadow hover:bg-gray-50">
            <ZoomOut className="w-5 h-5 text-gray-700" />
            <span className="text-[10px] text-gray-500 mt-0.5">聚焦-</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 显示模式面板（1/4/6/9 宫格 + 全屏 + 自动巡航）
 */
function LayoutPanel({ layout, onChange }: { layout: 1 | 4 | 6 | 9; onChange: (l: 1 | 4 | 6 | 9) => void }) {
  const layouts: Array<{ key: 1 | 4 | 6 | 9; icon: any; label: string }> = [
    { key: 1, icon: LayoutGrid, label: '一宫格' },
    { key: 4, icon: Grid2X2, label: '四宫格' },
    { key: 6, icon: Grid3X3, label: '六宫格' },
    { key: 9, icon: Grid3X3, label: '九宫格' },
  ];
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button onClick={() => alert('全屏模式')} className="flex flex-col items-center justify-center py-3 bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-lg shadow-sm hover:from-blue-50 hover:to-blue-100">
          <Maximize2 className="w-6 h-6 text-blue-600" />
          <span className="text-xs text-gray-700 mt-1">全屏</span>
        </button>
        <button onClick={() => alert('自动巡航')} className="flex flex-col items-center justify-center py-3 bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-lg shadow-sm hover:from-blue-50 hover:to-blue-100">
          <Repeat className="w-6 h-6 text-blue-600" />
          <span className="text-xs text-gray-700 mt-1">自动巡航</span>
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {layouts.map(l => {
          const Icon = l.icon;
          const active = layout === l.key;
          return (
            <button
              key={l.key}
              onClick={() => onChange(l.key)}
              className={`flex flex-col items-center justify-center py-2 border rounded-lg transition-colors ${
                active ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-7 h-7 ${active ? 'text-blue-500' : 'text-slate-400'}`} />
              <span className={`text-[10px] mt-1 ${active ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                {l.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 状态徽章
 */
function getRunStatusBadge(status: string) {
  switch (status) {
    case '运行中': return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> };
    case '待机': return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Power className="w-3 h-3" /> };
    case '告警': return { bg: 'bg-orange-100', text: 'text-orange-700', icon: <AlertCircle className="w-3 h-3" /> };
    case '离线': return { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-3 h-3" /> };
    default: return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Power className="w-3 h-3" /> };
  }
}

function getOnlineBadge(online: boolean) {
  return online
    ? { bg: 'bg-green-100', text: 'text-green-700', icon: <Wifi className="w-3 h-3" />, label: '在线' }
    : { bg: 'bg-red-100', text: 'text-red-700', icon: <Wifi className="w-3 h-3" />, label: '离线' };
}


export default function VideoMonitor() {
  const [activeTab, setActiveTab] = useState('preview');
  const [activeBase, setActiveBase] = useState(bases[0].id);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [layout, setLayout] = useState(6);
  const [closedIds, setClosedIds] = useState([]);

  // 2026-08-29：从 Store 读 IoT 摄像头列表
  const cameras = useIotCameraStore((s) => s.cameras);
  const fetchCameras = useIotCameraStore((s) => s.fetchCameras);
  useEffect(() => { fetchCameras(); }, [fetchCameras]);

  const visibleDevices = cameras.filter(d => !closedIds.includes(d.id));

  const filteredDevices = visibleDevices.filter(device => {
    const matchSearch = !searchKeyword ||
      device.id.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      device.deviceName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      device.location.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchStatus = statusFilter === '全部' || CAMERA_STATUS_LABEL[device.status] === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredDevices.length / pageSize));
  const paginatedDevices = filteredDevices.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const videoWallDevices = filteredDevices.slice(0, layout);

  const handleCloseVideo = (id) => {
    setClosedIds(prev => [...prev, id]);
  };

  const stats = [
    { icon: <Power className="w-5 h-5 text-green-600" />, bg: "bg-green-100", label: "运行中", value: visibleDevices.filter(d => d.status === "运行中").length },
    { icon: <Wifi className='w-5 h-5 text-gray-600' />, bg: 'bg-gray-100', label: '待机', value: visibleDevices.filter(d => d.status === '待机').length },
    { icon: <XCircle className='w-5 h-5 text-red-600' />, bg: 'bg-red-100', label: '离线', value: visibleDevices.filter(d => d.status === '离线').length },
    { icon: <AlertCircle className='w-5 h-5 text-orange-600' />, bg: 'bg-orange-100', label: '告警', value: visibleDevices.filter(d => d.status === '告警').length },
  ];

  return (
    <div className="pt-0 px-6 pb-6 space-y-4 flex flex-col">
      {/* 大图标卡 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Video className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">视频监控中心</h1>
              <p className="text-gray-500 mt-1">实时监控全场视频设备运行状态</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" /> 导出
            </button>
            <button className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" /> 添加设备
            </button>
          </div>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-5 py-2 text-sm font-medium rounded-t-lg flex items-center gap-2 transition-colors ${activeTab === 'preview' ? 'bg-[#2B5D3A] text-white' : 'text-gray-600 hover:text-gray-800'}`}
          >
            <Video className="w-4 h-4" /> 视频预览
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-5 py-2 text-sm font-medium rounded-t-lg flex items-center gap-2 transition-colors ${activeTab === 'list' ? 'bg-[#2B5D3A] text-white' : 'text-gray-600 hover:text-gray-800'}`}
          >
            <Monitor className="w-4 h-4" /> 设备列表
          </button>
        </div>
      </div>

      {/* Tab 内容：视频预览 */}
      {activeTab === 'preview' && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-4 py-3 flex items-center gap-4">
            <h2 className="text-base font-bold text-gray-800 whitespace-nowrap">大棚位置：</h2>
            <select
              value={activeBase}
              onChange={(e) => setActiveBase(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
            >
              {bases.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <p className="text-sm text-gray-500 ml-2">共 {videoWallDevices.length} 个摄像头（{layout} 宫格显示）</p>
          </div>

          <div className="flex gap-4" style={{ minHeight: '540px' }}>
            <div className="flex-1 flex flex-col min-h-0">
              <VideoWall devices={videoWallDevices} layout={layout} onClose={handleCloseVideo} />
            </div>
            <div className="w-72 flex flex-col gap-4">
              <PTZPanel />
              <LayoutPanel layout={layout} onChange={setLayout} />
            </div>
          </div>
        </>
      )}

      {/* Tab 内容：设备列表 */}
      {activeTab === 'list' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((card, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                    {card.icon}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{card.label}</p>
                    <p className="text-xl font-bold text-gray-800">{card.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">状态：</span>
                <div className="flex gap-2 flex-wrap">
                  {statusFilters.map(status => (
                    <button
                      key={status}
                      onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === status ? 'bg-[#2B5D3A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
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
                  placeholder="搜索设备ID、名称或位置..."
                  value={searchKeyword}
                  onChange={(e) => { setSearchKeyword(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">设备ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">设备名称</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">通道号</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">安装位置</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">运行状态</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">在线状态</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">最后更新</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedDevices.map(device => {
                  const runBadge = getRunStatusBadge(device.status);
                  const onlineBadge = getOnlineBadge(device.isOnline);
                  return (
                    <tr key={device.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">{device.id}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{device.deviceName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">CH-{device.channel}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{device.location}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${runBadge.bg} ${runBadge.text}`}>
                          {runBadge.icon}
                          {runBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${onlineBadge.bg} ${onlineBadge.text}`}>
                          {onlineBadge.icon}
                          {onlineBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{device.lastUpdate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredDevices.length === 0 && (
              <div className="text-center py-12">
                <Camera className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">暂无数据</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-500">共 {filteredDevices.length} 条记录</p>
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
                  className={`px-3 py-1 rounded text-sm ${currentPage === page ? 'bg-[#2B5D3A] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
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
        </>
      )}
    </div>
  );
}
