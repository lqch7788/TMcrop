import { useState } from 'react'
import { Search, Plus, Download, Eye, Edit, Trash2, Percent, TrendingUp, TrendingDown, Sprout, DollarSign } from 'lucide-react'

const InputOutputAnalysis = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('view')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [cropFilter, setCropFilter] = useState('全部')

  // 投入产出分析数据
  const analysisData = [
    { id: '1', crop: '番茄', area: 50, unitCost: 1130, unitPrice: 3.5, yield: 5000, totalInput: 56500, totalOutput: 175000, profit: 118500, outputRatio: 3.10, ranking: 1, analyst: '分析师刘明', analysisDate: '2026-03-01' },
    { id: '2', crop: '草莓', area: 25, unitCost: 2890, unitPrice: 25, yield: 1500, totalInput: 72250, totalOutput: 375000, profit: 302750, outputRatio: 5.19, ranking: 2, analyst: '分析师刘明', analysisDate: '2026-03-01' },
    { id: '3', crop: '葡萄', area: 60, unitCost: 2550, unitPrice: 15, yield: 2000, totalInput: 153000, totalOutput: 300000, profit: 147000, outputRatio: 1.96, ranking: 5, analyst: '分析师王芳', analysisDate: '2026-03-02' },
    { id: '4', crop: '黄瓜', area: 40, unitCost: 1130, unitPrice: 2, yield: 4500, totalInput: 45200, totalOutput: 90000, profit: 44800, outputRatio: 1.99, ranking: 4, analyst: '分析师刘明', analysisDate: '2026-03-03' },
    { id: '5', crop: '茄子', area: 35, unitCost: 1128, unitPrice: 3, yield: 3500, totalInput: 39500, totalOutput: 105000, profit: 65500, outputRatio: 2.66, ranking: 3, analyst: '分析师王芳', analysisDate: '2026-03-04' },
    { id: '6', crop: '辣椒', area: 45, unitCost: 1131, unitPrice: 8, yield: 2500, totalInput: 50900, totalOutput: 200000, profit: 149100, outputRatio: 3.93, ranking: 1, analyst: '分析师刘明', analysisDate: '2026-03-05' },
    { id: '7', crop: '西瓜', area: 55, unitCost: 1134, unitPrice: 4, yield: 4000, totalInput: 62400, totalOutput: 160000, profit: 97600, outputRatio: 2.56, ranking: 3, analyst: '分析师王芳', analysisDate: '2026-03-06' },
    { id: '8', crop: '叶菜类', area: 30, unitCost: 1120, unitPrice: 5, yield: 2000, totalInput: 33600, totalOutput: 100000, profit: 66400, outputRatio: 2.98, ranking: 2, analyst: '分析师刘明', analysisDate: '2026-03-07' },
    { id: '9', crop: '苹果', area: 80, unitCost: 2320, unitPrice: 6, yield: 3000, totalInput: 185600, totalOutput: 180000, profit: -5600, outputRatio: 0.97, ranking: 6, analyst: '分析师王芳', analysisDate: '2026-03-08' },
    { id: '10', crop: '梨', area: 65, unitCost: 2320, unitPrice: 5.5, yield: 2800, totalInput: 150800, totalOutput: 154000, profit: 3200, outputRatio: 1.02, ranking: 5, analyst: '分析师刘明', analysisDate: '2026-03-09' },
    { id: '11', crop: '樱桃', area: 20, unitCost: 3500, unitPrice: 35, yield: 800, totalInput: 70000, totalOutput: 280000, profit: 210000, outputRatio: 4.00, ranking: 1, analyst: '分析师王芳', analysisDate: '2026-03-10' },
    { id: '12', crop: '蓝莓', area: 15, unitCost: 4200, unitPrice: 40, yield: 600, totalInput: 63000, totalOutput: 240000, profit: 177000, outputRatio: 3.81, ranking: 2, analyst: '分析师刘明', analysisDate: '2026-03-11' }
  ]

  const crops = ['全部', '番茄', '草莓', '葡萄', '黄瓜', '茄子', '辣椒', '西瓜', '叶菜类', '苹果', '梨', '樱桃', '蓝莓']

  const filteredData = analysisData.filter(item => {
    const matchesCrop = cropFilter === '全部' || item.crop === cropFilter
    const matchesSearch = !searchKeyword ||
      item.crop.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      item.analyst.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchesCrop && matchesSearch
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 0 }).format(value)
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

  // 计算统计
  const totalInput = filteredData.reduce((sum, item) => sum + item.totalInput, 0)
  const totalOutput = filteredData.reduce((sum, item) => sum + item.totalOutput, 0)
  const totalProfit = filteredData.reduce((sum, item) => sum + item.profit, 0)
  const avgRatio = filteredData.length > 0 ? (totalOutput / totalInput).toFixed(2) : 0

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">投入产出分析</h1>
          <p className="text-gray-500 mt-1">分析各作物投入产出效益</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> 导出分析报告
          </button>
          <button
            onClick={() => { setModalType('add'); setShowModal(true); }}
            className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 新增分析记录
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <p className="text-blue-100 text-sm">总投入(元)</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalInput)}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
          <p className="text-green-100 text-sm">总产出(元)</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalOutput)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <p className="text-purple-100 text-sm">总利润(元)</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalProfit)}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
          <p className="text-orange-100 text-sm">平均产出比</p>
          <p className="text-2xl font-bold mt-1">1:{avgRatio}</p>
        </div>
        <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl p-4 text-white">
          <p className="text-pink-100 text-sm">分析作物数</p>
          <p className="text-2xl font-bold mt-1">{filteredData.length}</p>
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">作物：</span>
            <div className="flex gap-2 flex-wrap">
              {crops.map(crop => (
                <button
                  key={crop}
                  onClick={() => setCropFilter(crop)}
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
          <div className="relative min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索作物或分析师..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">作物</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">面积(亩)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">亩成本(元)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">售价(元/kg)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">亩产量(kg)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">总投入(元)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">总产值(元)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">利润(元)</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">产出比</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">效益排名</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredData.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Sprout className="w-4 h-4 text-[#2B5D3A]" />
                    <span className="text-sm font-medium text-gray-800">{item.crop}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-600">{item.area}</td>
                <td className="px-4 py-3 text-sm text-right text-orange-600">{formatCurrency(item.unitCost)}</td>
                <td className="px-4 py-3 text-sm text-right text-green-600">{item.unitPrice}</td>
                <td className="px-4 py-3 text-sm text-right text-blue-600">{item.yield}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-600">{formatCurrency(item.totalInput)}</td>
                <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">{formatCurrency(item.totalOutput)}</td>
                <td className="px-4 py-3 text-sm text-right">
                  <span className={`font-bold ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(item.profit)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                    item.outputRatio >= 3 ? 'bg-green-100 text-green-700' :
                    item.outputRatio >= 2 ? 'bg-blue-100 text-blue-700' :
                    item.outputRatio >= 1 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {item.outputRatio >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    1:{item.outputRatio.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                    item.ranking === 1 ? 'bg-yellow-400 text-white' :
                    item.ranking === 2 ? 'bg-gray-300 text-gray-700' :
                    item.ranking === 3 ? 'bg-orange-400 text-white' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {item.ranking}
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
            <Percent className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无投入产出分析数据</p>
          </div>
        )}
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500">共 {filteredData.length} 条记录</p>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50" disabled>
            上一页
          </button>
          <button className="px-3 py-1 bg-[#2B5D3A] text-white rounded text-sm">1</button>
          <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50">
            下一页
          </button>
        </div>
      </div>

      {/* 弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-gray-800">
                {modalType === 'add' ? '新增分析记录' : modalType === 'edit' ? '编辑分析记录' : '投入产出详情'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {modalType === 'view' && selectedItem ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-2xl font-bold">{selectedItem.crop}</h4>
                        <p className="text-green-100 mt-1">投入产出分析</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-200 text-sm">投入产出比</p>
                        <p className="text-3xl font-bold">1:{selectedItem.outputRatio.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">种植面积</p>
                      <p className="text-xl font-bold text-blue-600">{selectedItem.area} 亩</p>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">亩成本</p>
                      <p className="text-xl font-bold text-orange-600">{formatCurrency(selectedItem.unitCost)}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">销售单价</p>
                      <p className="text-xl font-bold text-green-600">{selectedItem.unitPrice} 元/kg</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">亩产量</p>
                      <p className="text-xl font-bold text-purple-600">{selectedItem.yield} kg</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">总投入</p>
                      <p className="text-2xl font-bold text-gray-800">{formatCurrency(selectedItem.totalInput)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">总产值</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedItem.totalOutput)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">利润</p>
                      <p className={`text-2xl font-bold ${selectedItem.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(selectedItem.profit)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-2">效益评级</p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={`text-xl ${i < selectedItem.ranking ? 'text-yellow-400' : 'text-gray-300'}`}>
                            ★
                          </span>
                        ))}
                      </div>
                      <span className={`px-3 py-1 rounded text-sm font-medium ${
                        selectedItem.ranking === 1 ? 'bg-yellow-100 text-yellow-700' :
                        selectedItem.ranking <= 3 ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {selectedItem.ranking === 1 ? '最优' : selectedItem.ranking <= 3 ? '优秀' : '一般'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t border-gray-200">
                    <span>分析师：{selectedItem.analyst}</span>
                    <span>分析日期：{selectedItem.analysisDate}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">作物名称 <span className="text-red-500">*</span></label>
                      <select
                        defaultValue={selectedItem?.crop || ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="">请选择作物</option>
                        {crops.filter(c => c !== '全部').map(crop => (
                          <option key={crop} value={crop}>{crop}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">种植面积(亩) <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.area || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">亩成本(元)</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.unitCost || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">销售单价(元/kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        defaultValue={selectedItem?.unitPrice || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">亩产量(kg)</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.yield || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">分析师</label>
                      <input
                        type="text"
                        defaultValue={selectedItem?.analyst || ''}
                        placeholder="请输入分析师"
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

export default InputOutputAnalysis
