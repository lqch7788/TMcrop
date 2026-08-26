import { useState } from 'react'
import { Search, Download, TrendingUp, TrendingDown, Minus, Eye, Edit, RefreshCw, Bell, BellOff } from 'lucide-react'

const PriceMonitoring = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedPrice, setSelectedPrice] = useState<any>(null)
  const [categoryFilter, setCategoryFilter] = useState('全部')

  // 价格监测数据 - 10条真实数据
  const priceData = [
    { id: '1', cropName: '番茄', category: '茄果类', market: '北京新发地', unit: '元/kg', currentPrice: 6.5, yesterdayPrice: 6.2, weekPrice: 6.0, monthPrice: 5.8, trend: 'up', changeRate: '+4.84%', alertStatus: '正常' },
    { id: '2', cropName: '黄瓜', category: '瓜类', market: '上海江桥', unit: '元/kg', currentPrice: 4.2, yesterdayPrice: 4.5, weekPrice: 4.8, monthPrice: 5.0, trend: 'down', changeRate: '-6.67%', alertStatus: '正常' },
    { id: '3', cropName: '辣椒', category: '茄果类', market: '广州江南', unit: '元/kg', currentPrice: 8.5, yesterdayPrice: 8.0, weekPrice: 7.5, monthPrice: 7.2, trend: 'up', changeRate: '+6.25%', alertStatus: '预警' },
    { id: '4', cropName: '茄子', category: '茄果类', market: '武汉白沙洲', unit: '元/kg', currentPrice: 5.8, yesterdayPrice: 5.8, weekPrice: 5.5, monthPrice: 5.3, trend: 'stable', changeRate: '0.00%', alertStatus: '正常' },
    { id: '5', cropName: '生菜', category: '叶菜类', market: '成都雨润', unit: '元/kg', currentPrice: 4.5, yesterdayPrice: 4.0, weekPrice: 3.8, monthPrice: 3.5, trend: 'up', changeRate: '+12.50%', alertStatus: '预警' },
    { id: '6', cropName: '草莓', category: '浆果类', market: '杭州勾庄', unit: '元/kg', currentPrice: 22.0, yesterdayPrice: 23.0, weekPrice: 25.0, monthPrice: 28.0, trend: 'down', changeRate: '-4.35%', alertStatus: '正常' },
    { id: '7', cropName: '西瓜', category: '瓜类', market: '深圳海吉星', unit: '元/kg', currentPrice: 4.8, yesterdayPrice: 5.0, weekPrice: 5.2, monthPrice: 5.5, trend: 'down', changeRate: '-4.00%', alertStatus: '正常' },
    { id: '8', cropName: '葡萄', category: '浆果类', market: '郑州万邦', unit: '元/kg', currentPrice: 12.0, yesterdayPrice: 11.5, weekPrice: 11.0, monthPrice: 10.5, trend: 'up', changeRate: '+4.35%', alertStatus: '正常' },
    { id: '9', cropName: '白菜', category: '叶菜类', market: '南京众彩', unit: '元/kg', currentPrice: 2.5, yesterdayPrice: 2.8, weekPrice: 3.0, monthPrice: 3.2, trend: 'down', changeRate: '-10.71%', alertStatus: '正常' },
    { id: '10', cropName: '樱桃番茄', category: '茄果类', market: '西安欣桥', unit: '元/kg', currentPrice: 14.0, yesterdayPrice: 13.5, weekPrice: 13.0, monthPrice: 12.5, trend: 'up', changeRate: '+3.70%', alertStatus: '正常' },
  ]

  const categories = ['全部', '茄果类', '瓜类', '叶菜类', '浆果类']

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-red-500" />
      case 'down': return <TrendingDown className="w-4 h-4 text-green-500" />
      default: return <Minus className="w-4 h-4 text-gray-400" />
    }
  }

  const getTrendBg = (trend: string) => {
    switch (trend) {
      case 'up': return 'bg-red-50'
      case 'down': return 'bg-green-50'
      default: return 'bg-gray-50'
    }
  }

  const filteredData = priceData.filter(item => {
    const matchesCategory = categoryFilter === '全部' || item.category === categoryFilter
    const matchesSearch = !searchKeyword ||
      item.cropName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      item.market.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleView = (item: any) => {
    setSelectedPrice(item)
    setShowModal(true)
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">价格监测</h1>
          <p className="text-gray-500 mt-1">实时监控各批发市场农产品价格走势</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> 刷新
          </button>
          <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> 导出
          </button>
        </div>
      </div>

      {/* 价格走势概览 */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-red-600">+4.2%</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">涨价品种</p>
          <p className="text-sm text-gray-500 mt-1">6 个品类</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white">
              <TrendingDown className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-green-600">-3.8%</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">降价品种</p>
          <p className="text-sm text-gray-500 mt-1">3 个品类</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white">
              <Minus className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-gray-500">0.0%</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">价格稳定</p>
          <p className="text-sm text-gray-500 mt-1">1 个品类</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center text-white">
              <Bell className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-yellow-600">预警中</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">价格预警</p>
          <p className="text-sm text-gray-500 mt-1">2 个品类</p>
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">品类：</span>
            <div className="flex gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    categoryFilter === cat
                      ? 'bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0] text-white shadow-lg shadow-blue-500/20'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索品种名称或市场..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
            />
          </div>
        </div>
      </div>

      {/* 价格数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">品种名称</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">品类</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">批发市场</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">昨日价格</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">今日价格</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">周均价</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">月均价</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">涨跌</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">预警状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filteredData.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#2B5D3A]" />
                    <span className="text-sm font-medium text-gray-800">{item.cropName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.market}</td>
                <td className="px-4 py-3 text-sm text-gray-600">¥{item.yesterdayPrice}/{item.unit}</td>
                <td className="px-4 py-3 text-sm font-bold text-gray-800">¥{item.currentPrice}/{item.unit}</td>
                <td className="px-4 py-3 text-sm text-gray-600">¥{item.weekPrice}/{item.unit}</td>
                <td className="px-4 py-3 text-sm text-gray-600">¥{item.monthPrice}/{item.unit}</td>
                <td className="px-4 py-3">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded ${getTrendBg(item.trend)}`}>
                    {getTrendIcon(item.trend)}
                    <span className={`text-xs font-medium ${
                      item.trend === 'up' ? 'text-red-600' : item.trend === 'down' ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {item.changeRate}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                    item.alertStatus === '预警' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {item.alertStatus === '预警' ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                    {item.alertStatus}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleView(item)} className="p-1.5 text-gray-400 hover:text-[#2B5D3A] hover:bg-[#2B5D3A]/10 rounded transition-colors" title="查看详情">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="编辑">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="删除">
                      <Bell className="w-4 h-4" />
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
          <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50" disabled>上一页</button>
          <button className="px-3 py-1 bg-[#2B5D3A] text-white rounded text-sm">1</button>
          <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50">下一页</button>
        </div>
      </div>

      {/* 价格详情弹窗 */}
      {showModal && selectedPrice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-gray-800">价格详情 - {selectedPrice.cropName}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-3xl font-bold">¥{selectedPrice.currentPrice}</h4>
                      <p className="text-emerald-100 mt-1">元/{selectedPrice.unit}</p>
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                      selectedPrice.trend === 'up' ? 'bg-red-500/30' : selectedPrice.trend === 'down' ? 'bg-green-500/30' : 'bg-gray-500/30'
                    }`}>
                      {getTrendIcon(selectedPrice.trend)}
                      <span className="font-medium">{selectedPrice.changeRate}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-500 mb-1">昨日价格</p>
                    <p className="text-xl font-bold text-gray-800">¥{selectedPrice.yesterdayPrice}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-500 mb-1">周均价</p>
                    <p className="text-xl font-bold text-gray-800">¥{selectedPrice.weekPrice}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-500 mb-1">月均价</p>
                    <p className="text-xl font-bold text-gray-800">¥{selectedPrice.monthPrice}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-500 mb-1">预警状态</p>
                    <p className={`text-xl font-bold ${
                      selectedPrice.alertStatus === '预警' ? 'text-yellow-600' : 'text-green-600'
                    }`}>{selectedPrice.alertStatus}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm text-gray-500 mb-3">价格走势</h4>
                  <div className="flex items-end justify-between h-32 px-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 bg-blue-400 rounded-t" style={{ height: `${(selectedPrice.monthPrice / selectedPrice.currentPrice) * 80}px` }}></div>
                      <span className="text-xs text-gray-500 mt-1">月均</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-10 bg-blue-500 rounded-t" style={{ height: `${(selectedPrice.weekPrice / selectedPrice.currentPrice) * 80}px` }}></div>
                      <span className="text-xs text-gray-500 mt-1">周均</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-10 bg-blue-600 rounded-t" style={{ height: `${(selectedPrice.yesterdayPrice / selectedPrice.currentPrice) * 80}px` }}></div>
                      <span className="text-xs text-gray-500 mt-1">昨日</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-10 bg-[#2B5D3A] rounded-t" style={{ height: `${(selectedPrice.currentPrice / selectedPrice.currentPrice) * 80}px` }}></div>
                      <span className="text-xs text-gray-500 mt-1">今日</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">品种名称</p>
                    <p className="font-medium text-gray-800">{selectedPrice.cropName}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">所属品类</p>
                    <p className="font-medium text-gray-800">{selectedPrice.category}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 col-span-2">
                    <p className="text-sm text-gray-500 mb-1">批发市场</p>
                    <p className="font-medium text-gray-800">{selectedPrice.market}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm transition-colors"
              >
                关闭
              </button>
              <button className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm hover:bg-[#245038] transition-colors flex items-center gap-2">
                <Bell className="w-4 h-4" /> 设置价格预警
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PriceMonitoring
