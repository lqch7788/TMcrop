import { useState } from 'react'
import { Search, Plus, Download, DollarSign, Eye, Edit, Trash2, TrendingUp } from 'lucide-react'

const CostAnalysis = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('view')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [baseFilter, setBaseFilter] = useState('全部')

  const bases = ['全部', '北京基地1号', '北京基地2号', '山东寿光基地', '河南新乡基地', '江苏南京基地', '山东青岛基地', '云南昆明基地', '云南大理基地']

  const costData = [
    { id: '1', costNo: 'CA20240301', period: '2024-03', base: '北京基地1号', crop: '番茄', seedCost: 4500, fertilizerCost: 12000, pesticideCost: 8000, laborCost: 25000, energyCost: 15000, otherCost: 5500, totalCost: 70000, unitCost: 1.56, costRatio: 28.5 },
    { id: '2', costNo: 'CA20240302', period: '2024-03', base: '山东寿光基地', crop: '黄瓜', seedCost: 3800, fertilizerCost: 10500, pesticideCost: 6500, laborCost: 22000, energyCost: 18000, otherCost: 4200, totalCost: 65000, unitCost: 0.68, costRatio: 26.2 },
    { id: '3', costNo: 'CA20240303', period: '2024-03', base: '河南新乡基地', crop: '辣椒', seedCost: 5200, fertilizerCost: 9800, pesticideCost: 9200, laborCost: 20000, energyCost: 12000, otherCost: 3800, totalCost: 60000, unitCost: 1.67, costRatio: 25.8 },
    { id: '4', costNo: 'CA20240304', period: '2024-03', base: '江苏南京基地', crop: '生菜', seedCost: 2800, fertilizerCost: 7500, pesticideCost: 4500, laborCost: 18000, energyCost: 10000, otherCost: 3200, totalCost: 46000, unitCost: 1.92, costRatio: 30.1 },
    { id: '5', costNo: 'CA20240305', period: '2024-03', base: '云南昆明基地', crop: '茄子', seedCost: 3500, fertilizerCost: 8800, pesticideCost: 7000, laborCost: 19000, energyCost: 11000, otherCost: 3700, totalCost: 53000, unitCost: 1.31, costRatio: 27.4 },
    { id: '6', costNo: 'CA20240306', period: '2024-03', base: '北京基地2号', crop: '草莓', seedCost: 8000, fertilizerCost: 15000, pesticideCost: 11000, laborCost: 35000, energyCost: 20000, otherCost: 6000, totalCost: 95000, unitCost: 7.92, costRatio: 35.2 },
    { id: '7', costNo: 'CA20240307', period: '2024-03', base: '山东青岛基地', crop: '西瓜', seedCost: 4200, fertilizerCost: 11000, pesticideCost: 7500, laborCost: 21000, energyCost: 13000, otherCost: 4300, totalCost: 61000, unitCost: 0.41, costRatio: 24.8 },
    { id: '8', costNo: 'CA20240308', period: '2024-03', base: '云南大理基地', crop: '葡萄', seedCost: 6000, fertilizerCost: 14000, pesticideCost: 10000, laborCost: 30000, energyCost: 16000, otherCost: 5000, totalCost: 81000, unitCost: 1.65, costRatio: 31.5 },
    { id: '9', costNo: 'CA20240309', period: '2024-02', base: '北京基地1号', crop: '番茄', seedCost: 4200, fertilizerCost: 11500, pesticideCost: 7800, laborCost: 24000, energyCost: 14500, otherCost: 5000, totalCost: 67000, unitCost: 1.49, costRatio: 27.8 },
    { id: '10', costNo: 'CA20240310', period: '2024-02', base: '山东寿光基地', crop: '黄瓜', seedCost: 3600, fertilizerCost: 10000, pesticideCost: 6200, laborCost: 21000, energyCost: 17000, otherCost: 4000, totalCost: 61800, unitCost: 0.65, costRatio: 25.5 },
    { id: '11', costNo: 'CA20240311', period: '2024-02', base: '河南新乡基地', crop: '辣椒', seedCost: 5000, fertilizerCost: 9500, pesticideCost: 8800, laborCost: 19500, energyCost: 11500, otherCost: 3500, totalCost: 57800, unitCost: 1.61, costRatio: 25.2 },
    { id: '12', costNo: 'CA20240312', period: '2024-02', base: '江苏南京基地', crop: '生菜', seedCost: 2600, fertilizerCost: 7200, pesticideCost: 4300, laborCost: 17500, energyCost: 9500, otherCost: 3000, totalCost: 44100, unitCost: 1.84, costRatio: 29.5 },
  ]

  const filteredData = costData.filter(d => {
    const matchesBase = baseFilter === '全部' || d.base === baseFilter
    const matchesSearch = !searchKeyword ||
      d.costNo.toLowerCase().includes(searchKeyword.toLowerCase()) ||
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
          <h1 className="text-2xl font-bold text-gray-800">成本分析</h1>
          <p className="text-gray-500 mt-1">农业生产成本统计与分析</p>
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
              <p className="text-emerald-100 text-sm">本月总成本</p>
              <p className="text-3xl font-bold mt-1">583万</p>
            </div>
            <DollarSign className="w-10 h-10 text-emerald-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">平均单位成本</p>
              <p className="text-3xl font-bold mt-1">2.08</p>
            </div>
            <TrendingUp className="w-10 h-10 text-blue-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">成本同比</p>
              <p className="text-3xl font-bold mt-1">-3.2%</p>
            </div>
            <TrendingUp className="w-10 h-10 text-purple-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">人工成本占比</p>
              <p className="text-3xl font-bold mt-1">36.8%</p>
            </div>
            <DollarSign className="w-10 h-10 text-orange-200" />
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">种子费</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">肥料费</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">农药费</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">人工费</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">能源费</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">总成本</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredData.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-600 font-mono">{item.costNo}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.period}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.base}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#2B5D3A]" />
                    <span className="text-sm font-medium text-gray-800">{item.crop}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.seedCost.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.fertilizerCost.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.pesticideCost.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.laborCost.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.energyCost.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm font-medium text-[#2B5D3A]">{item.totalCost.toLocaleString()}</td>
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
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
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
                {modalType === 'add' ? '新增成本记录' : modalType === 'edit' ? '编辑成本记录' : '成本详情'}
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
                        <p className="text-emerald-100 mt-1">记录编号：{selectedItem.costNo}</p>
                      </div>
                      <span className="px-3 py-1 text-sm font-medium rounded-full bg-white/20 text-white">
                        {selectedItem.period}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">种子费</p>
                      <p className="text-xl font-bold text-gray-800">{selectedItem.seedCost.toLocaleString()} 元</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">肥料费</p>
                      <p className="text-xl font-bold text-gray-800">{selectedItem.fertilizerCost.toLocaleString()} 元</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">农药费</p>
                      <p className="text-xl font-bold text-gray-800">{selectedItem.pesticideCost.toLocaleString()} 元</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">人工费</p>
                      <p className="text-xl font-bold text-gray-800">{selectedItem.laborCost.toLocaleString()} 元</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">能源费</p>
                      <p className="text-xl font-bold text-gray-800">{selectedItem.energyCost.toLocaleString()} 元</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">其他费用</p>
                      <p className="text-xl font-bold text-gray-800">{selectedItem.otherCost.toLocaleString()} 元</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-[#2B5D3A] to-green-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-emerald-100 text-sm">总成本</p>
                        <p className="text-4xl font-bold mt-1">{selectedItem.totalCost.toLocaleString()} 元</p>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-100 text-sm">单位成本</p>
                        <p className="text-2xl font-bold mt-1">{selectedItem.unitCost} 元/kg</p>
                        <p className="text-sm mt-1">成本占比 {selectedItem.costRatio}%</p>
                      </div>
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
                        defaultValue={selectedItem?.costNo || 'CA20240313'}
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
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">种子费</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.seedCost || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">肥料费</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.fertilizerCost || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">农药费</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.pesticideCost || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">人工费</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.laborCost || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">能源费</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.energyCost || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">其他费用</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.otherCost || ''}
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

export default CostAnalysis
