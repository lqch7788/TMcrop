/**
 * 加工档案 — 从 V1.3 100% 一致复制
 */
import { useState } from 'react';
import { Search, Plus, Download, Factory, Eye, Edit, Trash2, CheckCircle, Clock } from 'lucide-react';

const processingData = [
  { id: '1', processCode: 'JG20260325001', traceCode: 'TY20260301001', product: '番茄', variety: '千禧樱桃番茄', factory: '北京加工中心1号', processType: '分拣包装', processDate: '2026-03-25', quantity: '5000kg', status: '已完成', operator: '张伟' },
  { id: '2', processCode: 'JG20260325002', traceCode: 'TY20260301002', product: '黄瓜', variety: '津优绿翠黄瓜', factory: '北京加工中心2号', processType: '清洗分级', processDate: '2026-03-25', quantity: '3000kg', status: '已完成', operator: '李娜' },
  { id: '3', processCode: 'JG20260325003', traceCode: 'TY20260301005', product: '生菜', variety: '奶油生菜', factory: '北京加工中心1号', processType: '净菜加工', processDate: '2026-03-26', quantity: '1500kg', status: '进行中', operator: '王强' },
  { id: '4', processCode: 'JG20260325004', traceCode: 'TY20260301006', product: '菠菜', variety: '大叶菠菜', factory: '北京加工中心2号', processType: '速冻加工', processDate: '2026-03-26', quantity: '1200kg', status: '进行中', operator: '赵敏' },
  { id: '5', processCode: 'JG20260325005', traceCode: 'TY20260301007', product: '白菜', variety: '北京白菜', factory: '北京加工中心1号', processType: '分拣包装', processDate: '2026-03-24', quantity: '1800kg', status: '已完成', operator: '孙华' },
  { id: '6', processCode: 'JG20260325006', traceCode: 'TY20260301008', product: '萝卜', variety: '水果萝卜', factory: '北京加工中心3号', processType: '清洗分级', processDate: '2026-03-24', quantity: '2200kg', status: '已完成', operator: '刘洋' },
  { id: '7', processCode: 'JG20260325007', traceCode: 'TY20260301009', product: '草莓', variety: '红颜草莓', factory: '北京加工中心1号', processType: '冷链保鲜', processDate: '2026-03-23', quantity: '800kg', status: '已完成', operator: '陈军' },
  { id: '8', processCode: 'JG20260325008', traceCode: 'TY20260301003', product: '辣椒', variety: '螺丝椒', factory: '北京加工中心2号', processType: '烘干加工', processDate: '2026-03-27', quantity: '1000kg', status: '待处理', operator: '黄丽' },
  { id: '9', processCode: 'JG20260325009', traceCode: 'TY20260301004', product: '茄子', variety: '紫长茄子', factory: '北京加工中心3号', processType: '切片速冻', processDate: '2026-03-27', quantity: '800kg', status: '待处理', operator: '周杰' },
  { id: '10', processCode: 'JG20260325010', traceCode: 'TY20260301010', product: '西瓜', variety: '早春红玉', factory: '北京加工中心1号', processType: '鲜切加工', processDate: '2026-03-28', quantity: '2000kg', status: '待处理', operator: '吴涛' },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case '已完成': return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> };
    case '进行中': return { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Clock className="w-3 h-3" /> };
    case '待处理': return { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Clock className="w-3 h-3" /> };
    default: return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Clock className="w-3 h-3" /> };
  }
};

export default function ProcessingArchive() {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredData = processingData.filter(item =>
    !searchKeyword || item.processCode.includes(searchKeyword) || item.product.includes(searchKeyword) || item.batch?.includes(searchKeyword) || item.factory.includes(searchKeyword)
  );
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">加工档案管理</h1>
          <p className="text-gray-500 mt-1">管理农产品加工档案信息</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"><Download className="w-4 h-4" /> 导出</button>
          <button className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"><Plus className="w-4 h-4" /> 新增档案</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            {['全部', '待处理', '进行中', '已完成'].map(status => (
              <button key={status} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${status === '全部' ? 'bg-[#2B5D3A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{status}</button>
            ))}
          </div>
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="搜索加工单号、产品名称..." value={searchKeyword} onChange={(e) => { setSearchKeyword(e.target.value); setCurrentPage(1); }} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">加工单号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">溯源码</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">产品</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">品种</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">加工工厂</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">加工类型</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">加工日期</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">数量</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedData.map((item) => {
              const sb = getStatusBadge(item.status);
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-blue-600">{item.processCode}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{item.traceCode}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.product}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.variety}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.factory}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.processType}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.processDate}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.quantity}</td>
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
          <div className="text-center py-12"><Factory className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">暂无数据</p></div>
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