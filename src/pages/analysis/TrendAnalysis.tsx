import { useState } from 'react'
import { Search, Plus, Download, TrendingUp, Eye, Edit, Trash2, Calendar } from 'lucide-react'

const TrendAnalysis = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('view')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [trendFilter, setTrendFilter] = useState('全部')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const trendTypes = ['全部', '产量趋势', '价格趋势', '环境趋势', '生长趋势', '成本趋势']

  const trends = [
    { id: '1', trendNo: 'TA20240301', trendName: '2024年番茄产量月度趋势', trendType: '产量趋势', base: '北京基地1号', crop: '番茄', period: '2024-01至2024-12', dataPoints: 365, direction: '上升', changeRate: 12.5, analyst: '张伟', createDate: '2024-03-20' },
    { id: '2', trendNo: 'TA20240302', trendName: '黄瓜市场价格走势分析', trendType: '价格趋势', base: '山东寿光基地', crop: '黄瓜', period: '2024-01至2024-06', dataPoints: 180, direction: '下降', changeRate: -5.8, analyst: '李娜', createDate: '2024-03-19' },
    { id: '3', trendNo: 'TA20240303', trendName: '大棚温度变化趋势', trendType: '环境趋势', base: '河南新乡基地', crop: '辣椒', period: '2024-01至2024-03', dataPoints: 90, direction: '平稳', changeRate: 0.3, analyst: '王强', createDate: '2024-03-18' },
    { id: '4', trendNo: 'TA20240304', trendName: '生菜生长速度分析', trendType: '生长趋势', base: '江苏南京基地', crop: '生菜', period: '2024-02至2024-04', dataPoints: 60, direction: '上升', changeRate: 8.2, analyst: '赵敏', createDate: '2024-03-17' },
    { id: '5', trendNo: 'TA20240305', trendName: '茄子产量预测趋势', trendType: '产量趋势', base: '云南昆明基地', crop: '茄子', period: '2024-01至2024-06', dataPoints: 150, direction: '上升', changeRate: 15.6, analyst: '张伟', createDate: '2024-03-16' },
    { id: '6', trendNo: 'TA20240306', trendName: '草莓价格波动分析', trendType: '价格趋势', base: '北京基地2号', crop: '草莓', period: '2024-01至2024-04', dataPoints: 120, direction: '下降', changeRate: -8.3, analyst: '李娜', createDate: '2024-03-15' },
    { id: '7', trendNo: 'TA20240307', trendName: '土壤湿度变化趋势', trendType: '环境趋势', base: '山东青岛基地', crop: '西瓜', period: '2024-01至2024-03', dataPoints: 90, direction: '平稳', changeRate: 1.2, analyst: '王强', createDate: '2024-03-14' },
    { id: '8', trendNo: 'TA20240308', trendName: '葡萄糖度变化趋势', trendType: '生长趋势', base: '云南大理基地', crop: '葡萄', period: '2024-05至2024-08', dataPoints: 120, direction: '上升', changeRate: 10.5, analyst: '赵敏', createDate: '2024-03-13' },
    { id: '9', trendNo: 'TA20240309', trendName: '番茄种植成本趋势', trendType: '成本趋势', base: '北京基地1号', crop: '番茄', period: '2024-01至2024-06', dataPoints: 180, direction: '上升', changeRate: 6.8, analyst: '张伟', createDate: '2024-03-12' },
    { id: '10', trendNo: 'TA20240310', trendName: '黄瓜产量同比增长分析', trendType: '产量趋势', base: '山东寿光基地', crop: '黄瓜', period: '2023-01至2024-03', dataPoints: 420, direction: '上升', changeRate: 18.3, analyst: '李娜', createDate: '2024-03-11' },
    { id: '11', trendNo: 'TA20240311', trendName: '辣椒市场价格预测', trendType: '价格趋势', base: '河南新乡基地', crop: '辣椒', period: '2024-03至2024-06', dataPoints: 90, direction: '上升', changeRate: 7.2, analyst: '王强', createDate: '2024-03-10' },
    { id: '12', trendNo: 'TA20240312', trendName: '生菜用水量趋势', trendType: '环境趋势', base: '江苏南京基地', crop: '生菜', period: '2024-01至2024-03', dataPoints: 90, direction: '下降', changeRate: -3.5, analyst: '赵敏', createDate: '2024-03-09' },
  ]

  const filteredData = trends.filter(t => {
    const matchesType = trendFilter === '全部' || t.trendType === trendFilter
    const matchesSearch = !searchKeyword ||
      t.trendName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      t.trendNo.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchesType && matchesSearch
  })

  // 分页派生
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize))
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const getDirectionBadge = (direction: string) => {
    switch (direction) {
      case '上升': return { bg: 'bg-green-100', text: 'text-green-700', icon: '↑' }
      case '下降': return { bg: 'bg-red-100', text: 'text-red-700', icon: '↓' }
      case '平稳': return { bg: 'bg-blue-100', text: 'text-blue-700', icon: '→' }
      default: return { bg: 'bg-gray-100', text: 'text-gray-600', icon: '→' }
    }
  }

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
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">趋势分析</h1>
          <p className="text-gray-500 mt-1">农业生产趋势监测与分析</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> 导出
          </button>
          <button
            onClick={() => { setModalType('add'); setShowModal(true); }}
            className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 新增分析
          </button>
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">趋势类型：</span>
            <div className="flex gap-2 flex-wrap">
              {trendTypes.map(type => (
                <button
                  key={type}
                  onClick={() => { setTrendFilter(type); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    trendFilter === type
                      ? 'bg-[#2B5D3A] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索趋势名称或编号..."
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">趋势编号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">趋势名称</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">类型</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">基地</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">作物</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">周期</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">数据点</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">趋势</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">变化率</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedData.map((item) => {
              const directionBadge = getDirectionBadge(item.direction)
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{item.trendNo}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#2B5D3A]" />
                      <span className="text-sm font-medium text-gray-800">{item.trendName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.trendType}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.base}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.crop}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.period}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.dataPoints}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${directionBadge.bg} ${directionBadge.text}`}>
                      {directionBadge.icon} {item.direction}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-sm font-medium ${item.changeRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {item.changeRate >= 0 ? '+' : ''}{item.changeRate}%
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
              )
            })}
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
                {modalType === 'add' ? '新增趋势分析' : modalType === 'edit' ? '编辑趋势分析' : '趋势详情'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {modalType === 'view' && selectedItem ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-2xl font-bold">{selectedItem.trendName}</h4>
                        <p className="text-blue-100 mt-1">趋势编号：{selectedItem.trendNo}</p>
                      </div>
                      <span className="px-3 py-1 text-sm font-medium rounded-full bg-white/20 text-white">
                        {selectedItem.trendType}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">基地</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.base}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">作物</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.crop}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">分析周期</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.period}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">数据点</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.dataPoints}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">趋势方向</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.direction}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">变化率</p>
                      <p className={`text-lg font-bold ${selectedItem.changeRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedItem.changeRate >= 0 ? '+' : ''}{selectedItem.changeRate}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t border-gray-200">
                    <span>分析员：{selectedItem.analyst}</span>
                    <span>创建时间：{selectedItem.createDate}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">趋势编号</label>
                      <input
                        type="text"
                        defaultValue={selectedItem?.trendNo || 'TA20240313'}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">趋势类型</label>
                      <select
                        defaultValue={selectedItem?.trendType || '产量趋势'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        {trendTypes.filter(t => t !== '全部').map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">趋势名称 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      defaultValue={selectedItem?.trendName || ''}
                      placeholder="请输入趋势名称"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">基地</label>
                      <select
                        defaultValue={selectedItem?.base || '北京基地1号'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="北京基地1号">北京基地1号</option>
                        <option value="北京基地2号">北京基地2号</option>
                        <option value="山东寿光基地">山东寿光基地</option>
                        <option value="河南新乡基地">河南新乡基地</option>
                        <option value="江苏南京基地">江苏南京基地</option>
                        <option value="山东青岛基地">山东青岛基地</option>
                        <option value="云南昆明基地">云南昆明基地</option>
                        <option value="云南大理基地">云南大理基地</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">作物</label>
                      <select
                        defaultValue={selectedItem?.crop || '番茄'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="番茄">番茄</option>
                        <option value="黄瓜">黄瓜</option>
                        <option value="辣椒">辣椒</option>
                        <option value="生菜">生菜</option>
                        <option value="茄子">茄子</option>
                        <option value="草莓">草莓</option>
                        <option value="西瓜">西瓜</option>
                        <option value="葡萄">葡萄</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">分析周期</label>
                      <input
                        type="text"
                        defaultValue={selectedItem?.period || ''}
                        placeholder="如：2024-01至2024-06"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">数据点数量</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.dataPoints || ''}
                        placeholder="0"
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

export default TrendAnalysis
