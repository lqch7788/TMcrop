/**
 * 消费者查询 — 从 V1.3 100% 一致复制
 */
import { useState } from 'react';
import { Search, QrCode, Package, Leaf, Factory, Truck, CheckCircle, MapPin } from 'lucide-react';

const queryHistoryData = [
  { id: '1', traceCode: 'TY20260301001', product: '番茄', variety: '千禧樱桃番茄', queryTime: '2026-03-25 14:30:25', queryCount: 5 },
  { id: '2', traceCode: 'JG20260325001', product: '番茄', variety: '千禧樱桃番茄', queryTime: '2026-03-25 15:42:18', queryCount: 3 },
  { id: '3', traceCode: 'LT20260325001', product: '番茄', variety: '红颜草莓', queryTime: '2026-03-25 16:20:05', queryCount: 8 },
];

const traceDetailData = {
  traceCode: 'TY20260301001',
  product: '番茄',
  variety: '千禧樱桃番茄',
  batch: 'P20260301001',
  farm: '北京基地1号',
  plantDate: '2026-03-01',
  harvestDate: '2026-06-15',
  status: '采收中',
  processingInfo: {
    processCode: 'JG20260325001',
    factory: '北京加工中心1号',
    processType: '分拣包装',
    processDate: '2026-03-25',
  },
  circulationInfo: [
    { logisticsCode: 'LT20260325001', from: '北京加工中心1号', to: '北京配送中心', sendDate: '2026-03-25', receiveDate: '2026-03-25', status: '已送达' },
  ],
};

export default function ConsumerQuery() {
  const [searchInput, setSearchInput] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.ceil(queryHistoryData.length / pageSize);
  const paginatedHistory = queryHistoryData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSearch = () => {
    if (!searchInput.trim()) return;
    if (searchInput.includes('TY') || searchInput.includes('JG') || searchInput.includes('LT')) {
      setSearchResult({ found: true });
      setShowDetail(true);
    } else {
      setSearchResult({ found: false });
    }
  };

  return (
    <div className="pt-0 px-6 pb-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">消费者查询</h1>
              <p className="text-gray-500 mt-1">扫描二维码或输入追溯码查询农产品信息</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center">
            <QrCode className="w-16 h-16 text-gray-400" />
          </div>
        </div>
        <div className="flex gap-3 max-w-xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="请输入追溯码（如：TY20260301001）" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]" />
          </div>
          <button onClick={handleSearch} className="px-6 py-3 bg-[#2B5D3A] text-white rounded-lg font-medium hover:bg-[#245038] transition-colors">查询</button>
        </div>
      </div>

      {searchResult && !searchResult.found && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <QrCode className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">未找到相关追溯信息，请确认追溯码是否正确</p>
        </div>
      )}

      {showDetail && searchResult?.found && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-[#2B5D3A] to-blue-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2"><QrCode className="w-5 h-5" /><span className="text-sm">追溯码</span></div>
                <h3 className="text-2xl font-bold font-mono">{traceDetailData.traceCode}</h3>
                <p className="text-emerald-100 mt-1">批次号：{traceDetailData.batch}</p>
              </div>
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-white/20">{traceDetailData.status}</span>
            </div>
          </div>
          <div className="p-6">
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3 mb-3"><Package className="w-5 h-5 text-[#2B5D3A]" /><span className="font-medium text-gray-800">基本信息</span></div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-500">产品名称</p><p className="font-medium text-gray-800">{traceDetailData.product}</p></div>
                <div><p className="text-sm text-gray-500">产品品种</p><p className="font-medium text-gray-800">{traceDetailData.variety}</p></div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3 mb-3"><Leaf className="w-5 h-5 text-green-500" /><span className="font-medium text-gray-800">种植信息</span></div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-500">种植基地</p><p className="font-medium text-gray-800">{traceDetailData.farm}</p></div>
                <div><p className="text-sm text-gray-500">定植日期</p><p className="font-medium text-gray-800">{traceDetailData.plantDate}</p></div>
                <div><p className="text-sm text-gray-500">预计采收</p><p className="font-medium text-gray-800">{traceDetailData.harvestDate}</p></div>
                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-sm text-green-600">已通过有机认证</span></div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3 mb-3"><Factory className="w-5 h-5 text-orange-500" /><span className="font-medium text-gray-800">加工信息</span></div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-500">加工单号</p><p className="font-medium text-blue-600 font-mono">{traceDetailData.processingInfo.processCode}</p></div>
                <div><p className="text-sm text-gray-500">加工厂</p><p className="font-medium text-gray-800">{traceDetailData.processingInfo.factory}</p></div>
                <div><p className="text-sm text-gray-500">加工类型</p><p className="font-medium text-gray-800">{traceDetailData.processingInfo.processType}</p></div>
                <div><p className="text-sm text-gray-500">加工日期</p><p className="font-medium text-gray-800">{traceDetailData.processingInfo.processDate}</p></div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3 mb-3"><Truck className="w-5 h-5 text-blue-500" /><span className="font-medium text-gray-800">流通信息</span></div>
              {traceDetailData.circulationInfo.map((item, index) => (
                <div key={index} className="border-b border-gray-200 pb-3 mb-3 last:border-0 last:pb-0 last:mb-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-600 font-mono">{item.logisticsCode}</span>
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">{item.status}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-3 h-3" /><span>{item.from}</span><span className="mx-2">→</span><span>{item.to}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-1"><span>发货：{item.sendDate}</span><span>收货：{item.receiveDate}</span></div>
                </div>
              ))}
            </div>
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
              <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-5 h-5 text-emerald-500" /><span className="font-medium text-emerald-700">质量保障</span></div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><p className="text-2xl font-bold text-emerald-600">98%</p><p className="text-xs text-gray-500">产品合格率</p></div>
                <div><p className="text-2xl font-bold text-emerald-600">0</p><p className="text-xs text-gray-500">农药残留超标</p></div>
                <div><p className="text-2xl font-bold text-emerald-600">全程</p><p className="text-xs text-gray-500">冷链追溯</p></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-medium text-gray-800 mb-4">查询历史</h3>
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">追溯码</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">产品</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">品种</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">查询时间</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">查询次数</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedHistory.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-mono text-blue-600">{item.traceCode}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.product}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.variety}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.queryTime}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.queryCount}次</td>
              </tr>
            ))}
          </tbody>
        </table>
        {paginatedHistory.length === 0 && (
          <div className="text-center py-12"><QrCode className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">暂无数据</p></div>
        )}
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">共 {queryHistoryData.length} 条记录</p>
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
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">上一页</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button key={page} onClick={() => setCurrentPage(page)} className={`px-3 py-1 rounded text-sm ${currentPage === page ? 'bg-[#2B5D3A] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{page}</button>
          ))}
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">下一页</button>
        </div>
      </div>
    </div>
  );
}