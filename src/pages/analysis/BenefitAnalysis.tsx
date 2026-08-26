import { useState } from 'react'
import { Search, Plus, Download, TrendingUp, Eye, Edit, Trash2, DollarSign, Percent } from 'lucide-react'

const BenefitAnalysis = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('view')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [baseFilter, setBaseFilter] = useState('全部')

  const bases = ['全部', '北京基地1号', '北京基地2号', '山东寿光基地', '河南新乡基地', '江苏南京基地', '山东青岛基地', '云南昆明基地', '云南大理基地']

  const benefitData = [
    { id: '1', benefitNo: 'BA20240301', period: '2024-03', base: '北京基地1号', crop: '番茄', yield: 45000, unitPrice: 3.5, revenue: 157500, cost: 70000, profit: 87500, profitRate: 55.6, compareLastMonth: 8.5, compareLastYear: 12.3 },
    { id: '2', benefitNo: 'BA20240302', period: '2024-03', base: '山东寿光基地', crop: '黄瓜', yield: 96000, unitPrice: 2.2, revenue: 211200, cost: 65000, profit: 146200, profitRate: 69.2, compareLastMonth: 5.2, compareLastYear: 15.8 },
    { id: '3', benefitNo: 'BA20240303', period: '2024-03', base: '河南新乡基地', crop: '辣椒', yield: 36000, unitPrice: 4.5, revenue: 162000, cost: 60000, profit: 102000, profitRate: 63.0, compareLastMonth: -2.1, compareLastYear: 8.6 },
    { id: '4', benefitNo: 'BA20240304', period: '2024-03', base: '江苏南京基地', crop: '生菜', yield: 24000, unitPrice: 3.0, revenue: 72000, cost: 46000, profit: 26000, profitRate: 36.1, compareLastMonth: 3.8, compareLastYear: -5.2 },
    { id: '5', benefitNo: 'BA20240305', period: '2024-03', base: '云南昆明基地', crop: '茄子', yield: 40500, unitPrice: 2.8, revenue: 113400, cost: 53000, profit: 60400, profitRate: 53.3, compareLastMonth: 6.5, compareLastYear: 10.2 },
    { id: '6', benefitNo: 'BA20240306', period: '2024-03', base: '北京基地2号', crop: '草莓', yield: 12000, unitPrice: 15.0, revenue: 180000, cost: 95000, profit: 85000, profitRate: 47.2, compareLastMonth: -8.3, compareLastYear: 5.6 },
    { id: '7', benefitNo: 'BA20240307', period: '2024-03', base: '山东青岛基地', crop: '西瓜', yield: 150000, unitPrice: 1.5, revenue: 225000, cost: 61000, profit: 164000, profitRate: 72.9, compareLastMonth: 12.5, compareLastYear: 18.9 },
    { id: '8', benefitNo: 'BA20240308', period: '2024-03', base: '云南大理基地', crop: '葡萄', yield: 49000, unitPrice: 6.0, revenue: 294000, cost: 81000, profit: 213000, profitRate: 72.4, compareLastMonth: 4.2, compareLastYear: 9.8 },
    { id: '9', benefitNo: 'BA20240309', period: '2024-02', base: '北京基地1号', crop: '番茄', yield: 45000, unitPrice: 3.2, revenue: 144000, cost: 67000, profit: 77000, profitRate: 53.5, compareLastMonth: 0, compareLastYear: 10.5 },
    { id: '10', benefitNo: 'BA20240310', period: '2024-02', base: '山东寿光基地', crop: '黄瓜', yield: 95000, unitPrice: 2.0, revenue: 190000, cost: 61800, profit: 128200, profitRate: 67.5, compareLastMonth: 0, compareLastYear: 12.3 },
    { id: '11', benefitNo: 'BA20240311', period: '2024-02', base: '河南新乡基地', crop: '辣椒', yield: 36000, unitPrice: 4.2, revenue: 151200, cost: 57800, profit: 93400, profitRate: 61.8, compareLastMonth: 0, compareLastYear: 6.8 },
    { id: '12', benefitNo: 'BA20240312', period: '2024-02', base: '江苏南京基地', crop: '生菜', yield: 24000, unitPrice: 2.8, revenue: 67200, cost: 44100, profit: 23100, profitRate: 34.4, compareLastMonth: 0, compareLastYear: -8.5 },
  ]

  const filteredData = benefitData.filter(d => {
    const matchesBase = baseFilter === '全部' || d.base === baseFilter
    const matchesSearch = !searchKeyword ||
      d.benefitNo.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      d.crop.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchesBase && matchesSearch
  })

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
          <h1 className="text-2xl font-bold text-gray-800">效益分析</h1>
          <p className="text-gray-500 mt-1">农业生产效益综合评估</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> 导出
          </button>
          <button
            onClick={() => { setModalType('add'); setShowModal(true); }}
            className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 新增记录
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm">本月总收入</p>
              <p className="text-3xl font-bold mt-1">1,355,100</p>
            </div>
            <DollarSign className="w-10 h-10 text-emerald-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">本月总利润</p>
              <p className="text-3xl font-bold mt-1">951,100</p>
            </div>
            <TrendingUp className="w-10 h-10 text-blue-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">平均利润率</p>
              <p className="text-3xl font-bold mt-1">60.1%</p>
            </div>
            <Percent className="w-10 h-10 text-purple-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">环比增长</p>
              <p className="text-3xl font-bold mt-1">+3.6%</p>
            </div>
            <TrendingUp className="w-10 h-10 text-orange-200" />
          </div>
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">基地：</span>
            <div className="flex gap-2 flex-wrap">
              {bases.map(base => (
                <button
                  key={base}
                  onClick={() => setBaseFilter(base)}
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
          <div className="relative min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索记录编号或作物..."
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">记录编号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">周期</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">基地</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">作物</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">产量(kg)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">单价(元)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">收入(元)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">成本(元)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">利润(元)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">利润率</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredData.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-600 font-mono">{item.benefitNo}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.period}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.base}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#2B5D3A]" />
                    <span className="text-sm font-medium text-gray-800">{item.crop}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.yield.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.unitPrice}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.revenue.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.cost.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm font-medium text-green-600">{item.profit.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                    item.profitRate >= 60 ? 'bg-green-100 text-green-700' :
                    item.profitRate >= 40 ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {item.profitRate}%
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
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-gray-800">
                {modalType === 'add' ? '新增效益记录' : modalType === 'edit' ? '编辑效益记录' : '效益详情'}
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
                        <h4 className="text-2xl font-bold">{selectedItem.base} - {selectedItem.crop}</h4>
                        <p className="text-emerald-100 mt-1">记录编号：{selectedItem.benefitNo}</p>
                      </div>
                      <span className="px-3 py-1 text-sm font-medium rounded-full bg-white/20 text-white">
                        {selectedItem.period}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">产量</p>
                      <p className="text-xl font-bold text-gray-800">{selectedItem.yield.toLocaleString()} kg</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">单价</p>
                      <p className="text-xl font-bold text-gray-800">{selectedItem.unitPrice} 元/kg</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">收入</p>
                      <p className="text-xl font-bold text-blue-600">{selectedItem.revenue.toLocaleString()} 元</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">成本</p>
                      <p className="text-xl font-bold text-gray-800">{selectedItem.cost.toLocaleString()} 元</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm">利润</p>
                        <p className="text-4xl font-bold mt-1">{selectedItem.profit.toLocaleString()} 元</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-100 text-sm">利润率</p>
                        <p className="text-3xl font-bold mt-1">{selectedItem.profitRate}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">环比</p>
                      <p className={`text-lg font-bold ${selectedItem.compareLastMonth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedItem.compareLastMonth >= 0 ? '+' : ''}{selectedItem.compareLastMonth}%
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">同比</p>
                      <p className={`text-lg font-bold ${selectedItem.compareLastYear >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedItem.compareLastYear >= 0 ? '+' : ''}{selectedItem.compareLastYear}%
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">记录编号</label>
                      <input
                        type="text"
                        defaultValue={selectedItem?.benefitNo || 'BA20240313'}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">周期</label>
                      <input
                        type="month"
                        defaultValue={selectedItem?.period || '2024-03'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">基地</label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">产量(kg)</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.yield || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">单价(元/kg)</label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">收入(元)</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.revenue || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">成本(元)</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.cost || ''}
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

export default BenefitAnalysis
