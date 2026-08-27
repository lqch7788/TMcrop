import { useState } from 'react'
import { Search, Plus, Download, TrendingUp, Eye, Edit, Trash2, Calendar, Wheat } from 'lucide-react'

const YieldPrediction = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('view')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [baseFilter, setBaseFilter] = useState('全部')
  const [cropFilter, setCropFilter] = useState('全部')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const bases = ['全部', '北京基地1号', '北京基地2号', '山东寿光基地', '河南新乡基地', '江苏南京基地', '山东青岛基地', '云南昆明基地', '云南大理基地']
  const crops = ['全部', '番茄', '黄瓜', '辣椒', '生菜', '茄子', '草莓', '西瓜', '葡萄']

  const predictions = [
    { id: '1', predictNo: 'YP20240301', crop: '番茄', base: '北京基地1号', plantingArea: 50, predictYield: 45000, unitYield: 900, predictDate: '2024-03-15', harvestPeriod: '2024-06-15', confidence: 95.8, status: '已确认' },
    { id: '2', predictNo: 'YP20240302', crop: '黄瓜', base: '山东寿光基地', plantingArea: 80, predictYield: 96000, unitYield: 1200, predictDate: '2024-03-14', harvestPeriod: '2024-05-20', confidence: 93.5, status: '待确认' },
    { id: '3', predictNo: 'YP20240303', crop: '辣椒', base: '河南新乡基地', plantingArea: 60, predictYield: 36000, unitYield: 600, predictDate: '2024-03-13', harvestPeriod: '2024-06-01', confidence: 91.2, status: '已确认' },
    { id: '4', predictNo: 'YP20240304', crop: '生菜', base: '江苏南京基地', plantingArea: 40, predictYield: 24000, unitYield: 600, predictDate: '2024-03-12', harvestPeriod: '2024-04-25', confidence: 94.6, status: '已确认' },
    { id: '5', predictNo: 'YP20240305', crop: '茄子', base: '云南昆明基地', plantingArea: 45, predictYield: 40500, unitYield: 900, predictDate: '2024-03-11', harvestPeriod: '2024-05-30', confidence: 92.8, status: '待确认' },
    { id: '6', predictNo: 'YP20240306', crop: '草莓', base: '北京基地2号', plantingArea: 30, predictYield: 12000, unitYield: 400, predictDate: '2024-03-10', harvestPeriod: '2024-04-15', confidence: 96.1, status: '已确认' },
    { id: '7', predictNo: 'YP20240307', crop: '西瓜', base: '山东青岛基地', plantingArea: 100, predictYield: 150000, unitYield: 1500, predictDate: '2024-03-09', harvestPeriod: '2024-06-20', confidence: 93.9, status: '已确认' },
    { id: '8', predictNo: 'YP20240308', crop: '葡萄', base: '云南大理基地', plantingArea: 70, predictYield: 49000, unitYield: 700, predictDate: '2024-03-08', harvestPeriod: '2024-07-15', confidence: 91.5, status: '待确认' },
    { id: '9', predictNo: 'YP20240309', crop: '番茄', base: '北京基地2号', plantingArea: 55, predictYield: 49500, unitYield: 900, predictDate: '2024-03-07', harvestPeriod: '2024-06-18', confidence: 94.2, status: '已确认' },
    { id: '10', predictNo: 'YP20240310', crop: '黄瓜', base: '江苏南京基地', plantingArea: 65, predictYield: 78000, unitYield: 1200, predictDate: '2024-03-06', harvestPeriod: '2024-05-25', confidence: 92.7, status: '已确认' },
    { id: '11', predictNo: 'YP20240311', crop: '辣椒', base: '云南昆明基地', plantingArea: 50, predictYield: 30000, unitYield: 600, predictDate: '2024-03-05', harvestPeriod: '2024-06-05', confidence: 90.8, status: '待确认' },
    { id: '12', predictNo: 'YP20240312', crop: '生菜', base: '山东寿光基地', plantingArea: 35, predictYield: 21000, unitYield: 600, predictDate: '2024-03-04', harvestPeriod: '2024-04-28', confidence: 95.3, status: '已确认' },
  ]

  const filteredData = predictions.filter(d => {
    const matchesBase = baseFilter === '全部' || d.base === baseFilter
    const matchesCrop = cropFilter === '全部' || d.crop === cropFilter
    const matchesSearch = !searchKeyword ||
      d.predictNo.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      d.crop.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchesBase && matchesCrop && matchesSearch
  })

  // 分页派生
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize))
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleView = (item: any) => {
    setSelectedItem(item)
    setModalType('view')
    setShowModal(true)
  }

  const handleEdit = (item: any) => {
    setSelectedItem(item)
    setModalType('edit')
    setShowModal(true)
  }

  return (
    <div className="pt-0 px-6 pb-6">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Wheat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">产量预测</h1>
              <p className="text-gray-500 mt-1">基于AI模型的产量预测分析</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" /> 导出
            </button>
            <button
              onClick={() => { setModalType('add'); setShowModal(true); }}
              className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> 新增预测
            </button>
          </div>
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">基地：</span>
              <div className="flex gap-2 flex-wrap">
                {bases.slice(0, 5).map(base => (
                  <button
                    key={base}
                    onClick={() => { setBaseFilter(base); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      baseFilter === base
                        ? 'bg-[#2B5D3A] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {base}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">作物：</span>
              <div className="flex gap-2 flex-wrap">
                {crops.slice(0, 5).map(crop => (
                  <button
                    key={crop}
                    onClick={() => { setCropFilter(crop); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      cropFilter === crop
                        ? 'bg-[#2B5D3A] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {crop}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索预测编号或作物..."
              value={searchKeyword}
              onChange={(e) => { setSearchKeyword(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
            />
          </div>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">预测编号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">作物</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">基地</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">种植面积(亩)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">预测产量(kg)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">单位产量(kg/亩)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">预测日期</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">采收期</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">置信度</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedData.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-600 font-mono">{item.predictNo}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#2B5D3A]" />
                    <span className="text-sm font-medium text-gray-800">{item.crop}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.base}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.plantingArea}</td>
                <td className="px-4 py-3 text-sm font-medium text-[#2B5D3A]">{item.predictYield.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.unitYield}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.predictDate}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.harvestPeriod}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    item.confidence >= 95 ? 'bg-green-100 text-green-700' :
                    item.confidence >= 92 ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {item.confidence}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleView(item)}
                      className="p-1.5 text-gray-400 hover:text-[#2B5D3A] hover:bg-[#2B5D3A]/10 rounded transition-colors"
                      title="查看"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="编辑"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无数据</p>
          </div>
        )}
      </div>

      {/* 分页 */}
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
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            上一页
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button key={page} onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded text-sm ${
                currentPage === page ? 'bg-[#2B5D3A] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>{page}</button>
          ))}
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
            className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            下一页
          </button>
        </div>
      </div>

      {/* 弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-gray-800">
                {modalType === 'add' ? '新增产量预测' : modalType === 'edit' ? '编辑产量预测' : '预测详情'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {modalType === 'view' && selectedItem ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-2xl font-bold">{selectedItem.crop}产量预测</h4>
                        <p className="text-emerald-100 mt-1">预测编号：{selectedItem.predictNo}</p>
                      </div>
                      <span className="px-3 py-1 text-sm font-medium rounded-full bg-white/20 text-white">
                        {selectedItem.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">基地</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.base}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">种植面积</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.plantingArea} 亩</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">预测产量</p>
                      <p className="text-lg font-bold text-[#2B5D3A]">{selectedItem.predictYield.toLocaleString()} kg</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">单位产量</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.unitYield} kg/亩</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">预测日期</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.predictDate}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">预计采收期</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.harvestPeriod}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">预测置信度</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-green-500 h-4 rounded-full transition-all"
                          style={{ width: `${selectedItem.confidence}%` }}
                        ></div>
                      </div>
                      <span className="text-lg font-bold text-green-600">{selectedItem.confidence}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">预测编号</label>
                      <input
                        type="text"
                        defaultValue={selectedItem?.predictNo || 'YP20240313'}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">作物 <span className="text-red-500">*</span></label>
                      <select
                        defaultValue={selectedItem?.crop || '番茄'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        {crops.filter(c => c !== '全部').map(crop => (
                          <option key={crop} value={crop}>{crop}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">基地 <span className="text-red-500">*</span></label>
                      <select
                        defaultValue={selectedItem?.base || '北京基地1号'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        {bases.filter(b => b !== '全部').map(base => (
                          <option key={base} value={base}>{base}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">种植面积(亩)</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.plantingArea || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">预测产量(kg)</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.predictYield || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">采收期</label>
                      <input
                        type="date"
                        defaultValue={selectedItem?.harvestPeriod || ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm hover:bg-[#245038] transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default YieldPrediction
