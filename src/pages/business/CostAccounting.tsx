import { useState } from 'react'
import { Search, Plus, Download, Eye, Edit, Trash2, Wallet, Sprout, Users, Zap, Package } from 'lucide-react'

const CostAccounting = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('view')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [cropFilter, setCropFilter] = useState('全部')

  // 成本核算数据（基于提供的成本参考数据）
  const costData = [
    { id: '1', crop: '番茄', area: 50, seedCost: 3500, fertilizerCost: 12000, pesticideCost: 8000, laborCost: 25000, energyCost: 5000, otherCost: 3000, totalCost: 56500, costPerMu: 1130, recordDate: '2026-01-15', recorder: '张技术员' },
    { id: '2', crop: '草莓', area: 25, seedCost: 8750, fertilizerCost: 15000, pesticideCost: 6000, laborCost: 30000, energyCost: 8000, otherCost: 4500, totalCost: 72250, costPerMu: 2890, recordDate: '2026-01-18', recorder: '李技术员' },
    { id: '3', crop: '葡萄', area: 60, seedCost: 21000, fertilizerCost: 36000, pesticideCost: 12000, laborCost: 60000, energyCost: 15000, otherCost: 9000, totalCost: 153000, costPerMu: 2550, recordDate: '2026-01-20', recorder: '王技术员' },
    { id: '4', crop: '黄瓜', area: 40, seedCost: 2800, fertilizerCost: 9600, pesticideCost: 6400, laborCost: 20000, energyCost: 4000, otherCost: 2400, totalCost: 45200, costPerMu: 1130, recordDate: '2026-02-05', recorder: '张技术员' },
    { id: '5', crop: '茄子', area: 35, seedCost: 2400, fertilizerCost: 8400, pesticideCost: 5600, laborCost: 17500, energyCost: 3500, otherCost: 2100, totalCost: 39500, costPerMu: 1128, recordDate: '2026-02-10', recorder: '李技术员' },
    { id: '6', crop: '辣椒', area: 45, seedCost: 3200, fertilizerCost: 10800, pesticideCost: 7200, laborCost: 22500, energyCost: 4500, otherCost: 2700, totalCost: 50900, costPerMu: 1131, recordDate: '2026-02-15', recorder: '王技术员' },
    { id: '7', crop: '西瓜', area: 55, seedCost: 4100, fertilizerCost: 13200, pesticideCost: 8800, laborCost: 27500, energyCost: 5500, otherCost: 3300, totalCost: 62400, costPerMu: 1134, recordDate: '2026-02-20', recorder: '张技术员' },
    { id: '8', crop: '叶菜类', area: 30, seedCost: 1800, fertilizerCost: 7200, pesticideCost: 4800, laborCost: 15000, energyCost: 3000, otherCost: 1800, totalCost: 33600, costPerMu: 1120, recordDate: '2026-03-01', recorder: '李技术员' },
    { id: '9', crop: '苹果', area: 80, seedCost: 16000, fertilizerCost: 48000, pesticideCost: 16000, laborCost: 80000, energyCost: 16000, otherCost: 9600, totalCost: 185600, costPerMu: 2320, recordDate: '2026-03-05', recorder: '王技术员' },
    { id: '10', crop: '梨', area: 65, seedCost: 13000, fertilizerCost: 39000, pesticideCost: 13000, laborCost: 65000, energyCost: 13000, otherCost: 7800, totalCost: 150800, costPerMu: 2320, recordDate: '2026-03-10', recorder: '张技术员' }
  ]

  const crops = ['全部', '番茄', '草莓', '葡萄', '黄瓜', '茄子', '辣椒', '西瓜', '叶菜类', '苹果', '梨']

  const filteredData = costData.filter(item => {
    const matchesCrop = cropFilter === '全部' || item.crop === cropFilter
    const matchesSearch = !searchKeyword ||
      item.crop.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      item.recorder.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchesCrop && matchesSearch
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 0 }).format(value)
  }

  const getCostIcon = (type: string) => {
    switch (type) {
      case 'seed': return <Sprout className="w-4 h-4 text-green-600" />
      case 'fertilizer': return <Package className="w-4 h-4 text-blue-600" />
      case 'pesticide': return <Package className="w-4 h-4 text-red-600" />
      case 'labor': return <Users className="w-4 h-4 text-purple-600" />
      case 'energy': return <Zap className="w-4 h-4 text-yellow-600" />
      case 'other': return <Wallet className="w-4 h-4 text-gray-600" />
      default: return null
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
          <h1 className="text-2xl font-bold text-gray-800">成本核算</h1>
          <p className="text-gray-500 mt-1">记录和分析各作物种植成本</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> 导出
          </button>
          <button
            onClick={() => { setModalType('add'); setShowModal(true); }}
            className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 新增成本记录
          </button>
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
              placeholder="搜索作物或记录人..."
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
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">种子(元)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">肥料(元)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">农药(元)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">人工(元)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">能源(元)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">其他(元)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">总成本(元)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">亩成本(元)</th>
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
                <td className="px-4 py-3 text-sm text-right text-green-600">{formatCurrency(item.seedCost)}</td>
                <td className="px-4 py-3 text-sm text-right text-blue-600">{formatCurrency(item.fertilizerCost)}</td>
                <td className="px-4 py-3 text-sm text-right text-red-600">{formatCurrency(item.pesticideCost)}</td>
                <td className="px-4 py-3 text-sm text-right text-purple-600">{formatCurrency(item.laborCost)}</td>
                <td className="px-4 py-3 text-sm text-right text-yellow-600">{formatCurrency(item.energyCost)}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-600">{formatCurrency(item.otherCost)}</td>
                <td className="px-4 py-3 text-sm text-right font-bold text-gray-800">{formatCurrency(item.totalCost)}</td>
                <td className="px-4 py-3 text-sm text-right font-bold text-[#2B5D3A]">{formatCurrency(item.costPerMu)}</td>
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
            <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无成本数据</p>
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
                {modalType === 'add' ? '新增成本记录' : modalType === 'edit' ? '编辑成本记录' : '成本详情'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {modalType === 'view' && selectedItem ? (
                <div className="space-y-6">
                  {/* 概览卡片 */}
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-2xl font-bold">{selectedItem.crop}</h4>
                        <p className="text-blue-100 mt-1">种植面积：{selectedItem.area} 亩</p>
                      </div>
                      <div className="text-right">
                        <p className="text-blue-200 text-sm">总成本</p>
                        <p className="text-3xl font-bold">{formatCurrency(selectedItem.totalCost)}</p>
                      </div>
                    </div>
                  </div>

                  {/* 成本构成 */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sprout className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-gray-500">种子成本</span>
                      </div>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(selectedItem.seedCost)}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        <span className="text-sm text-gray-500">肥料成本</span>
                      </div>
                      <p className="text-xl font-bold text-blue-600">{formatCurrency(selectedItem.fertilizerCost)}</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-5 h-5 text-red-600" />
                        <span className="text-sm text-gray-500">农药成本</span>
                      </div>
                      <p className="text-xl font-bold text-red-600">{formatCurrency(selectedItem.pesticideCost)}</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-5 h-5 text-purple-600" />
                        <span className="text-sm text-gray-500">人工成本</span>
                      </div>
                      <p className="text-xl font-bold text-purple-600">{formatCurrency(selectedItem.laborCost)}</p>
                    </div>
                    <div className="bg-yellow-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-5 h-5 text-yellow-600" />
                        <span className="text-sm text-gray-500">能源成本</span>
                      </div>
                      <p className="text-xl font-bold text-yellow-600">{formatCurrency(selectedItem.energyCost)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet className="w-5 h-5 text-gray-600" />
                        <span className="text-sm text-gray-500">其他成本</span>
                      </div>
                      <p className="text-xl font-bold text-gray-600">{formatCurrency(selectedItem.otherCost)}</p>
                    </div>
                  </div>

                  {/* 成本分析 */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h5 className="font-medium text-gray-800 mb-3">成本分析</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">亩均成本</p>
                        <p className="text-2xl font-bold text-[#2B5D3A]">{formatCurrency(selectedItem.costPerMu)} / 亩</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">成本占比</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {((selectedItem.totalCost / costData.reduce((sum, d) => sum + d.totalCost, 0)) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t border-gray-200">
                    <span>记录人：{selectedItem.recorder}</span>
                    <span>记录时间：{selectedItem.recordDate}</span>
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
                        <option value="番茄">番茄</option>
                        <option value="草莓">草莓</option>
                        <option value="葡萄">葡萄</option>
                        <option value="黄瓜">黄瓜</option>
                        <option value="茄子">茄子</option>
                        <option value="辣椒">辣椒</option>
                        <option value="西瓜">西瓜</option>
                        <option value="叶菜类">叶菜类</option>
                        <option value="苹果">苹果</option>
                        <option value="梨">梨</option>
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
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">种子成本(元)</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.seedCost || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">肥料成本(元)</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.fertilizerCost || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">农药成本(元)</label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">人工成本(元)</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.laborCost || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">能源成本(元)</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.energyCost || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">其他成本(元)</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.otherCost || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">记录日期</label>
                      <input
                        type="date"
                        defaultValue={selectedItem?.recordDate || ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">记录人</label>
                      <input
                        type="text"
                        defaultValue={selectedItem?.recorder || ''}
                        placeholder="请输入记录人"
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

export default CostAccounting
