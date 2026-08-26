import { useState } from 'react'
import { Search, Plus, Download, Eye, Edit, Trash2, BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react'

const MarketSituation = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('view')
  const [selectedMarket, setSelectedMarket] = useState<any>(null)
  const [regionFilter, setRegionFilter] = useState('全部')

  // 市场行情数据 - 10条真实数据
  const marketData = [
    { id: '1', marketName: '北京新发地市场', region: '华北', avgPrice: 6.5, volume: 2500, trend: '上涨', trendIcon: 'up', topProduct: '番茄、黄瓜', updateTime: '2026-03-25', status: '正常' },
    { id: '2', marketName: '上海江桥市场', region: '华东', avgPrice: 7.2, volume: 3200, trend: '上涨', trendIcon: 'up', topProduct: '辣椒、茄子', updateTime: '2026-03-25', status: '正常' },
    { id: '3', marketName: '广州江南市场', region: '华南', avgPrice: 8.5, volume: 4100, trend: '平稳', trendIcon: 'stable', topProduct: '生菜、草莓', updateTime: '2026-03-25', status: '正常' },
    { id: '4', marketName: '武汉白沙洲市场', region: '华中', avgPrice: 5.8, volume: 2800, trend: '下跌', trendIcon: 'down', topProduct: '叶菜类', updateTime: '2026-03-25', status: '正常' },
    { id: '5', marketName: '成都雨润市场', region: '西南', avgPrice: 7.8, volume: 1900, trend: '上涨', trendIcon: 'up', topProduct: '樱桃番茄、葡萄', updateTime: '2026-03-25', status: '正常' },
    { id: '6', marketName: '郑州万邦市场', region: '华中', avgPrice: 6.2, volume: 3500, trend: '下跌', trendIcon: 'down', topProduct: '西瓜、哈密瓜', updateTime: '2026-03-25', status: '正常' },
    { id: '7', marketName: '南京众彩市场', region: '华东', avgPrice: 7.5, volume: 2100, trend: '平稳', trendIcon: 'stable', topProduct: '葡萄、草莓', updateTime: '2026-03-25', status: '正常' },
    { id: '8', marketName: '深圳海吉星市场', region: '华南', avgPrice: 9.2, volume: 4500, trend: '上涨', trendIcon: 'up', topProduct: '樱桃番茄、蓝莓', updateTime: '2026-03-25', status: '正常' },
    { id: '9', marketName: '长沙海吉星市场', region: '华中', avgPrice: 5.5, volume: 2300, trend: '平稳', trendIcon: 'stable', topProduct: '菠菜、生菜', updateTime: '2026-03-25', status: '正常' },
    { id: '10', marketName: '重庆双福市场', region: '西南', avgPrice: 6.8, volume: 2600, trend: '上涨', trendIcon: 'up', topProduct: '辣椒、番茄', updateTime: '2026-03-25', status: '正常' },
  ]

  const regions = ['全部', '华北', '华东', '华南', '华中', '西南', '西北', '东北']

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case '上涨': return <TrendingUp className="w-4 h-4 text-red-500" />
      case '下跌': return <TrendingDown className="w-4 h-4 text-green-500" />
      default: return <Minus className="w-4 h-4 text-blue-500" />
    }
  }

  const getTrendBg = (trend: string) => {
    switch (trend) {
      case '上涨': return 'bg-red-50'
      case '下跌': return 'bg-green-50'
      default: return 'bg-blue-50'
    }
  }

  const trendColors: Record<string, string> = {
    '上涨': 'bg-red-100 text-red-700',
    '下跌': 'bg-green-100 text-green-700',
    '平稳': 'bg-blue-100 text-blue-700',
  }

  const statusColors: Record<string, string> = {
    '正常': 'bg-green-100 text-green-700',
    '预警': 'bg-yellow-100 text-yellow-700',
    '暂停': 'bg-gray-100 text-gray-700',
  }

  const filteredData = marketData.filter(m => {
    const matchesRegion = regionFilter === '全部' || m.region === regionFilter
    const matchesSearch = !searchKeyword ||
      m.marketName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      m.topProduct.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchesRegion && matchesSearch
  })

  const handleView = (item: any) => {
    setSelectedMarket(item)
    setModalType('view')
    setShowModal(true)
  }

  const handleEdit = (item: any) => {
    setSelectedMarket(item)
    setModalType('edit')
    setShowModal(true)
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">市场行情</h1>
          <p className="text-gray-500 mt-1">全国农产品市场行情概览</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> 导出
          </button>
          <button
            onClick={() => { setModalType('add'); setShowModal(true); }}
            className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 添加市场
          </button>
        </div>
      </div>

      {/* 市场概览统计 */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">6</p>
          <p className="text-sm text-gray-500 mt-1">价格上涨市场</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">2</p>
          <p className="text-sm text-gray-500 mt-1">价格下跌市场</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white">
              <Minus className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">2</p>
          <p className="text-sm text-gray-500 mt-1">价格平稳市场</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2B5D3A] to-green-600 flex items-center justify-center text-white">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">10</p>
          <p className="text-sm text-gray-500 mt-1">监测市场总数</p>
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">区域：</span>
            <div className="flex gap-2 flex-wrap">
              {regions.map(region => (
                <button
                  key={region}
                  onClick={() => setRegionFilter(region)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    regionFilter === region
                      ? 'bg-[#2B5D3A] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {region}
                </button>
              ))}
            </div>
          </div>
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索市场名称或产品..."
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">市场编号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">市场名称</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">区域</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">均价(元/kg)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">成交量(吨)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">走势</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">热门产品</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">更新时间</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredData.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#2B5D3A]" />
                    <span className="text-sm font-medium text-gray-800">{item.id}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.marketName}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">{item.region}</span>
                </td>
                <td className="px-4 py-3 text-sm font-bold text-gray-800">¥{item.avgPrice}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.volume.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded ${getTrendBg(item.trend)}`}>
                    {getTrendIcon(item.trend)}
                    <span className={`text-xs font-medium ${
                      item.trend === '上涨' ? 'text-red-600' : item.trend === '下跌' ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      {item.trend}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate">{item.topProduct}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[item.status]}`}>{item.status}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{item.updateTime}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleView(item)} className="p-1.5 text-gray-400 hover:text-[#2B5D3A] hover:bg-[#2B5D3A]/10 rounded transition-colors" title="查看">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="编辑">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="删除">
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
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无数据</p>
          </div>
        )}
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500">共 {filteredData.length} 条记录</p>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50" disabled>上一页</button>
          <button className="px-3 py-1 bg-[#2B5D3A] text-white rounded text-sm">1</button>
          <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50">下一页</button>
        </div>
      </div>

      {/* 弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-gray-800">
                {modalType === 'add' ? '添加市场' : modalType === 'edit' ? '编辑市场' : '市场详情'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {modalType === 'view' && selectedMarket ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-2xl font-bold">{selectedMarket.marketName}</h4>
                        <p className="text-emerald-100 mt-1">市场编号：{selectedMarket.id}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 text-sm font-medium rounded-full bg-white/20">
                          {selectedMarket.region}
                        </span>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full bg-white/20`}>
                          {selectedMarket.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">均价</p>
                      <p className="text-lg font-bold text-[#2B5D3A]">¥{selectedMarket.avgPrice}/kg</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">成交量</p>
                      <p className="text-lg font-bold text-gray-800">{selectedMarket.volume.toLocaleString()} 吨</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">市场走势</p>
                      <div className={`inline-flex items-center gap-1 ${getTrendBg(selectedMarket.trend)} px-2 py-1 rounded`}>
                        {getTrendIcon(selectedMarket.trend)}
                        <span className="text-sm font-medium">{selectedMarket.trend}</span>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">热门产品</p>
                      <p className="text-lg font-bold text-gray-800">{selectedMarket.topProduct}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t border-gray-200">
                    <span>更新时间：{selectedMarket.updateTime}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">市场名称 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        defaultValue={selectedMarket?.marketName || ''}
                        placeholder="请输入市场名称"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">所在区域 <span className="text-red-500">*</span></label>
                      <select
                        defaultValue={selectedMarket?.region || '华北'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="华北">华北</option>
                        <option value="华东">华东</option>
                        <option value="华南">华南</option>
                        <option value="华中">华中</option>
                        <option value="西南">西南</option>
                        <option value="西北">西北</option>
                        <option value="东北">东北</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">均价(元/kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        defaultValue={selectedMarket?.avgPrice || ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">成交量(吨)</label>
                      <input
                        type="number"
                        defaultValue={selectedMarket?.volume || ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">市场走势</label>
                      <select
                        defaultValue={selectedMarket?.trend || '平稳'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="上涨">上涨</option>
                        <option value="下跌">下跌</option>
                        <option value="平稳">平稳</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                      <select
                        defaultValue={selectedMarket?.status || '正常'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="正常">正常</option>
                        <option value="预警">预警</option>
                        <option value="暂停">暂停</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">热门产品</label>
                    <input
                      type="text"
                      defaultValue={selectedMarket?.topProduct || ''}
                      placeholder="如：番茄、黄瓜"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                    />
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

export default MarketSituation
