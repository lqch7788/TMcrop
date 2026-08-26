/**
 * 种植档案 — 从 V1.3 100% 一致复制
 */
import { useState } from 'react';
import { Search, Plus, Download, Package, Eye, Edit, Trash2, CheckCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

const plantingData = [
  { id: '1', traceCode: 'TY20260301001', batch: 'P20260301001', product: '番茄', variety: '千禧樱桃番茄', farm: '北京基地1号', area: '50亩', plantDate: '2026-03-01', harvestDate: '2026-06-15', status: '采收中', yield: '50000kg', worker: '张伟' },
  { id: '2', traceCode: 'TY20260301002', batch: 'P20260301002', product: '黄瓜', variety: '津优绿翠黄瓜', farm: '北京基地2号', area: '30亩', plantDate: '2026-03-05', harvestDate: '2026-05-30', status: '已采收', yield: '30000kg', worker: '李娜' },
  { id: '3', traceCode: 'TY20260301003', batch: 'P20260301003', product: '辣椒', variety: '螺丝椒', farm: '北京基地3号', area: '25亩', plantDate: '2026-03-08', harvestDate: '2026-06-20', status: '生长中', yield: '-', worker: '王强' },
  { id: '4', traceCode: 'TY20260301004', batch: 'P20260301004', product: '茄子', variety: '紫长茄子', farm: '北京基地4号', area: '20亩', plantDate: '2026-03-10', harvestDate: '2026-06-25', status: '生长中', yield: '-', worker: '赵敏' },
  { id: '5', traceCode: 'TY20260301005', batch: 'P20260301005', product: '生菜', variety: '奶油生菜', farm: '北京基地5号', area: '15亩', plantDate: '2026-03-02', harvestDate: '2026-05-15', status: '已采收', yield: '15000kg', worker: '孙华' },
  { id: '6', traceCode: 'TY20260301006', batch: 'P20260301006', product: '菠菜', variety: '大叶菠菜', farm: '北京基地6号', area: '12亩', plantDate: '2026-03-03', harvestDate: '2026-05-20', status: '已采收', yield: '12000kg', worker: '刘洋' },
  { id: '7', traceCode: 'TY20260301007', batch: 'P20260301007', product: '白菜', variety: '北京白菜', farm: '北京基地7号', area: '18亩', plantDate: '2026-03-06', harvestDate: '2026-05-25', status: '已采收', yield: '18000kg', worker: '陈军' },
  { id: '8', traceCode: 'TY20260301008', batch: 'P20260301008', product: '萝卜', variety: '水果萝卜', farm: '北京基地8号', area: '22亩', plantDate: '2026-03-07', harvestDate: '2026-05-28', status: '采收中', yield: '-', worker: '黄丽' },
  { id: '9', traceCode: 'TY20260301009', batch: 'P20260301009', product: '草莓', variety: '红颜草莓', farm: '北京基地9号', area: '10亩', plantDate: '2026-03-09', harvestDate: '2026-05-10', status: '已采收', yield: '8000kg', worker: '周杰' },
  { id: '10', traceCode: 'TY20260301010', batch: 'P20260301010', product: '西瓜', variety: '早春红玉', farm: '北京基地10号', area: '35亩', plantDate: '2026-03-11', harvestDate: '2026-06-30', status: '生长中', yield: '-', worker: '吴涛' },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case '已采收': return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> };
    case '采收中': return { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Clock className="w-3 h-3" /> };
    case '生长中': return { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Clock className="w-3 h-3" /> };
    default: return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Clock className="w-3 h-3" /> };
  }
};

export default function PlantingArchive() {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const filteredData = plantingData.filter(item =>
    !searchKeyword || item.traceCode.includes(searchKeyword) || item.product.includes(searchKeyword) || item.batch.includes(searchKeyword) || item.farm.includes(searchKeyword)
  );
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">种植档案管理</h1>
          <p className="text-gray-500 mt-1">管理农产品种植档案信息</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"><Download className="w-4 h-4" /> 导出</button>
          <button className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"><Plus className="w-4 h-4" /> 新增档案</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            {['全部', '生长中', '采收中', '已采收'].map(status => (
              <button key={status} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${status === '全部' ? 'bg-[#2B5D3A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{status}</button>
            ))}
          </div>
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="搜索溯源码、批次号、产品名称..." value={searchKeyword} onChange={(e) => { setSearchKeyword(e.target.value); setCurrentPage(1); }} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">溯源码</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">批次号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">产品</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">品种</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">种植基地</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">面积</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">定植日期</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">预计采收</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedData.map((item) => {
              const sb = getStatusBadge(item.status);
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-blue-600">{item.traceCode}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{item.batch}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.product}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.variety}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.farm}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.area}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.plantDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.harvestDate}</td>
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
          <div className="text-center py-12"><Package className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">暂无数据</p></div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500">共 {filteredData.length} 条记录，第 {currentPage}/{totalPages || 1} 页</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> 上一页</button>
          {[...Array(totalPages || 1)].map((_, i) => (
            <button key={i + 1} onClick={() => setCurrentPage(i + 1)} className={`w-9 h-9 rounded-lg text-sm ${currentPage === i + 1 ? 'bg-[#2B5D3A] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{i + 1}</button>
          ))}
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1">下一页 <ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}