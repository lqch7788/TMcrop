/**
 * 流通追溯 — 从 V1.3 100% 一致复制
 */
import { useState } from 'react';
import { Search, Plus, Download, Truck, Eye, Edit, Trash2, CheckCircle, Clock } from 'lucide-react';

const circulationData = [
  { id: '1', logisticsCode: 'LT20260325001', processCode: 'JG20260325001', product: '番茄', variety: '千禧樱桃番茄', batch: 'P20260301001', fromAddress: '北京加工中心1号', toAddress: '北京配送中心', transportType: '冷链运输', sendDate: '2026-03-25', receiveDate: '2026-03-25', status: '已送达', operator: '张伟' },
  { id: '2', logisticsCode: 'LT20260325002', processCode: 'JG20260325002', product: '黄瓜', variety: '津优绿翠黄瓜', batch: 'P20260301002', fromAddress: '北京加工中心2号', toAddress: '北京超市华联店', transportType: '冷链运输', sendDate: '2026-03-25', receiveDate: '2026-03-26', status: '运输中', operator: '李娜' },
  { id: '3', logisticsCode: 'LT20260325003', processCode: 'JG20260325003', product: '生菜', variety: '奶油生菜', batch: 'P20260301005', fromAddress: '北京加工中心1号', toAddress: '北京新发地批发市场', transportType: '普通运输', sendDate: '2026-03-26', receiveDate: '-', status: '运输中', operator: '王强' },
  { id: '4', logisticsCode: 'LT20260325004', processCode: 'JG20260325005', product: '白菜', variety: '北京白菜', batch: 'P20260301007', fromAddress: '北京加工中心1号', toAddress: '天津配送中心', transportType: '冷链运输', sendDate: '2026-03-24', receiveDate: '2026-03-24', status: '已送达', operator: '赵敏' },
  { id: '5', logisticsCode: 'LT20260325005', processCode: 'JG20260325006', product: '萝卜', variety: '水果萝卜', batch: 'P20260301008', fromAddress: '北京加工中心3号', toAddress: '北京物美超市', transportType: '普通运输', sendDate: '2026-03-24', receiveDate: '2026-03-25', status: '已送达', operator: '孙华' },
  { id: '6', logisticsCode: 'LT20260325006', processCode: 'JG20260325007', product: '草莓', variety: '红颜草莓', batch: 'P20260301009', fromAddress: '北京加工中心1号', toAddress: '北京盒马鲜生', transportType: '冷链保鲜', sendDate: '2026-03-23', receiveDate: '2026-03-23', status: '已送达', operator: '刘洋' },
  { id: '7', logisticsCode: 'LT20260325007', processCode: 'JG20260325008', product: '辣椒', variety: '螺丝椒', batch: 'P20260301003', fromAddress: '北京加工中心2号', toAddress: '北京永辉超市', transportType: '冷链运输', sendDate: '2026-03-27', receiveDate: '-', status: '待发货', operator: '陈军' },
  { id: '8', logisticsCode: 'LT20260325008', processCode: 'JG20260325009', product: '茄子', variety: '紫长茄子', batch: 'P20260301004', fromAddress: '北京加工中心3号', toAddress: '河北保定配送中心', transportType: '普通运输', sendDate: '2026-03-27', receiveDate: '-', status: '待发货', operator: '黄丽' },
  { id: '9', logisticsCode: 'LT20260325009', processCode: 'JG20260325004', product: '菠菜', variety: '大叶菠菜', batch: 'P20260301006', fromAddress: '北京加工中心2号', toAddress: '北京家乐福超市', transportType: '冷链运输', sendDate: '2026-03-26', receiveDate: '2026-03-27', status: '已送达', operator: '周杰' },
  { id: '10', logisticsCode: 'LT20260325010', processCode: 'JG20260325010', product: '西瓜', variety: '早春红玉', batch: 'P20260301010', fromAddress: '北京加工中心1号', toAddress: '北京山姆会员店', transportType: '冷链保鲜', sendDate: '2026-03-28', receiveDate: '-', status: '待发货', operator: '吴涛' },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case '已送达': return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> };
    case '运输中': return { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Truck className="w-3 h-3" /> };
    case '待发货': return { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Clock className="w-3 h-3" /> };
    default: return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Clock className="w-3 h-3" /> };
  }
};

export default function CirculationTrace() {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredData = circulationData.filter(item =>
    !searchKeyword || item.logisticsCode.includes(searchKeyword) || item.product.includes(searchKeyword) || item.batch.includes(searchKeyword) || item.fromAddress.includes(searchKeyword) || item.toAddress.includes(searchKeyword)
  );
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="pt-0 px-6 pb-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">流通追溯管理</h1>
              <p className="text-gray-500 mt-1">管理农产品流通追溯信息</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"><Download className="w-4 h-4" /> 导出</button>
            <button className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"><Plus className="w-4 h-4" /> 新增记录</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            {['全部', '待发货', '运输中', '已送达'].map(status => (
              <button key={status} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${status === '全部' ? 'bg-[#2B5D3A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{status}</button>
            ))}
          </div>
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="搜索物流单号、产品名称..." value={searchKeyword} onChange={(e) => { setSearchKeyword(e.target.value); setCurrentPage(1); }} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">物流单号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">加工单号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">产品</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">品种</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">发货地</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">收货地</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">运输方式</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">发货日期</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedData.map((item) => {
              const sb = getStatusBadge(item.status);
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-blue-600">{item.logisticsCode}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{item.processCode}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.product}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.variety}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">{item.fromAddress}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">{item.toAddress}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.transportType}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.sendDate}</td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${sb.bg} ${sb.text}`}>{sb.icon}{item.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 text-gray-400 hover:text-[#2B5D3A] hover:bg-[#2B5D3A]/10 rounded transition-colors" title="查看"><Eye className="w-4 h-4" /></button>
                      <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="编辑"><Edit className="w-4 h-4" /></button>
                      <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="删除"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {paginatedData.length === 0 && (
          <div className="text-center py-12"><Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">暂无数据</p></div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
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