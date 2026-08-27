import { useState, useEffect } from 'react'
import { Search, Plus, Download, Eye, Edit, Trash2, LineChart, TrendingUp, DollarSign, PieChart, BarChart3, CheckCircle, AlertCircle } from 'lucide-react'

const FinancialAnalysis = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('view')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [periodFilter, setPeriodFilter] = useState('2026年')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // 财务分析数据
  const financialData = [
    { id: '1', period: '2026-01', totalIncome: 185000, totalCost: 142000, grossProfit: 43000, netProfit: 32000, grossMargin: 23.2, netMargin: 17.3, assetReturn: 1.8, debtRatio: 35.2, recorder: '财务部张会计' },
    { id: '2', period: '2026-02', totalIncome: 210000, totalCost: 155000, grossProfit: 55000, netProfit: 42000, grossMargin: 26.2, netMargin: 20.0, assetReturn: 2.3, debtRatio: 34.8, recorder: '财务部张会计' },
    { id: '3', period: '2026-03', totalIncome: 198000, totalCost: 148000, grossProfit: 50000, netProfit: 38000, grossMargin: 25.3, netMargin: 19.2, assetReturn: 2.1, debtRatio: 35.5, recorder: '财务部李会计' },
    { id: '4', period: '2026-Q1', totalIncome: 593000, totalCost: 445000, grossProfit: 148000, netProfit: 112000, grossMargin: 25.0, netMargin: 18.9, assetReturn: 6.2, debtRatio: 35.2, recorder: '财务部张会计' },
    { id: '5', period: '2026-04', totalIncome: 225000, totalCost: 162000, grossProfit: 63000, netProfit: 48000, grossMargin: 28.0, netMargin: 21.3, assetReturn: 2.7, debtRatio: 34.5, recorder: '财务部李会计' },
    { id: '6', period: '2026-05', totalIncome: 248000, totalCost: 175000, grossProfit: 73000, netProfit: 55000, grossMargin: 29.4, netMargin: 22.2, assetReturn: 3.1, debtRatio: 33.8, recorder: '财务部张会计' },
    { id: '7', period: '2026-06', totalIncome: 265000, totalCost: 188000, grossProfit: 77000, netProfit: 58000, grossMargin: 29.1, netMargin: 21.9, assetReturn: 3.2, debtRatio: 33.2, recorder: '财务部李会计' },
    { id: '8', period: '2026-Q2', totalIncome: 738000, totalCost: 525000, grossProfit: 213000, netProfit: 161000, grossMargin: 28.9, netMargin: 21.8, assetReturn: 9.0, debtRatio: 33.8, recorder: '财务部张会计' },
    { id: '9', period: '2026-H1', totalIncome: 1331000, totalCost: 970000, grossProfit: 361000, netProfit: 273000, grossMargin: 27.1, netMargin: 20.5, assetReturn: 15.2, debtRatio: 34.5, recorder: '财务部张会计' },
    { id: '10', period: '2025-H1', totalIncome: 1185000, totalCost: 895000, grossProfit: 290000, netProfit: 215000, grossMargin: 24.5, netMargin: 18.1, assetReturn: 12.8, debtRatio: 36.8, recorder: '财务部王会计' },
    { id: '11', period: '2025年', totalIncome: 2350000, totalCost: 1780000, grossProfit: 570000, netProfit: 425000, grossMargin: 24.3, netMargin: 18.1, assetReturn: 25.5, debtRatio: 37.2, recorder: '财务部王会计' }
  ]

  const periods = ['全部', '2026年', '2026-Q1', '2026-Q2', '2026-H1', '2025年', '2025-H1']

  const filteredData = financialData.filter(item => {
    const matchesPeriod = periodFilter === '全部' || item.period.includes(periodFilter)
    const matchesSearch = !searchKeyword ||
      item.period.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      item.recorder.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchesPeriod && matchesSearch
  })

  // 筛选条件变化时重置分页到第 1 页
  useEffect(() => {
    setCurrentPage(1)
  }, [periodFilter, searchKeyword])

  // 分页派生
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize))
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

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

  // 计算汇总
  const latestData = filteredData[0] || financialData[0]
  const lastYearData = financialData.find(d => d.period === '2025-H1')
  const YoYGrowth = latestData && lastYearData
    ? ((latestData.netMargin - lastYearData.netMargin) / lastYearData.netMargin * 100).toFixed(1)
    : '0'

  return (
    <div className="pt-0 px-6 pb-6">
      {/* 页面标题 - 带大图标卡 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">财务分析</h1>
              <p className="text-gray-500 mt-1">财务状况和盈利能力分析</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> 导出报告
          </button>
          <button
            onClick={() => { setModalType('add'); setShowModal(true); }}
            className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 新增分析记录
          </button>
        </div>
      </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <p className="text-blue-100 text-sm">毛利率</p>
          <p className="text-2xl font-bold mt-1">{latestData?.grossMargin || 0}%</p>
          <p className="text-blue-200 text-xs mt-1">毛利润/总收入</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
          <p className="text-green-100 text-sm">净利率</p>
          <p className="text-2xl font-bold mt-1">{latestData?.netMargin || 0}%</p>
          <p className="text-green-200 text-xs mt-1">净利润/总收入</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <p className="text-purple-100 text-sm">资产回报率</p>
          <p className="text-2xl font-bold mt-1">{latestData?.assetReturn || 0}%</p>
          <p className="text-purple-200 text-xs mt-1">净利润/总资产</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
          <p className="text-orange-100 text-sm">资产负债率</p>
          <p className="text-2xl font-bold mt-1">{latestData?.debtRatio || 0}%</p>
          <p className="text-orange-200 text-xs mt-1">总负债/总资产</p>
        </div>
        <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl p-4 text-white">
          <p className="text-pink-100 text-sm">同比变化</p>
          <p className="text-2xl font-bold mt-1">+{YoYGrowth}%</p>
          <p className="text-pink-200 text-xs mt-1">较去年同周期</p>
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">周期：</span>
            <div className="flex gap-2">
              {periods.map(period => (
                <button
                  key={period}
                  onClick={() => setPeriodFilter(period)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    periodFilter === period
                      ? 'bg-[#2B5D3A] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索周期或记录人..."
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">周期</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">总收入(元)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">总成本(元)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">毛利润(元)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">净利润(元)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">毛利率</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">净利率</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">资产回报率</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">资产负债率</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedData.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <LineChart className="w-4 h-4 text-[#2B5D3A]" />
                    <span className="text-sm font-medium text-gray-800">{item.period}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">{formatCurrency(item.totalIncome)}</td>
                <td className="px-4 py-3 text-sm text-right text-orange-600">{formatCurrency(item.totalCost)}</td>
                <td className="px-4 py-3 text-sm text-right text-blue-600 font-medium">{formatCurrency(item.grossProfit)}</td>
                <td className="px-4 py-3 text-sm text-right text-purple-600 font-bold">{formatCurrency(item.netProfit)}</td>
                <td className="px-4 py-3 text-sm text-right">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                    item.grossMargin >= 25 ? 'bg-green-100 text-green-700' :
                    item.grossMargin >= 20 ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {item.grossMargin >= 25 ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {item.grossMargin}%
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                    item.netMargin >= 20 ? 'bg-green-100 text-green-700' :
                    item.netMargin >= 15 ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {item.netMargin >= 20 ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {item.netMargin}%
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-600">{item.assetReturn}%</td>
                <td className="px-4 py-3 text-sm text-right text-gray-600">{item.debtRatio}%</td>
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
            <PieChart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无财务分析数据</p>
          </div>
        )}
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">共 {filteredData.length} 条记录</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">每页</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
              className="border border-gray-200 rounded text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
            >
              <option value={10}>10 条</option>
              <option value={20}>20 条</option>
              <option value={50}>50 条</option>
              <option value={100}>100 条</option>
            </select>
            <span className="text-sm text-gray-500">条</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <span className="px-3 py-1 bg-[#2B5D3A] text-white rounded text-sm">
            第 {currentPage} / {totalPages} 页
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
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
                {modalType === 'add' ? '新增分析记录' : modalType === 'edit' ? '编辑分析记录' : '财务分析详情'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {modalType === 'view' && selectedItem ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-2xl font-bold">{selectedItem.period} 财务分析</h4>
                        <p className="text-purple-100 mt-1">净利润：{formatCurrency(selectedItem.netProfit)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-purple-200 text-sm">净利率</p>
                        <p className="text-3xl font-bold">{selectedItem.netMargin}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-green-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">总收入</p>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(selectedItem.totalIncome)}</p>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">总成本</p>
                      <p className="text-xl font-bold text-orange-600">{formatCurrency(selectedItem.totalCost)}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">毛利润</p>
                      <p className="text-xl font-bold text-blue-600">{formatCurrency(selectedItem.grossProfit)}</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">净利润</p>
                      <p className="text-xl font-bold text-purple-600">{formatCurrency(selectedItem.netProfit)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-gray-500 mb-1">毛利率</p>
                      <p className="text-2xl font-bold text-green-600">{selectedItem.grossMargin}%</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-gray-500 mb-1">净利率</p>
                      <p className="text-2xl font-bold text-blue-600">{selectedItem.netMargin}%</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-gray-500 mb-1">资产回报率</p>
                      <p className="text-2xl font-bold text-purple-600">{selectedItem.assetReturn}%</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-2">财务健康度</p>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span>资产负债率</span>
                          <span className="font-medium">{selectedItem.debtRatio}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${100 - selectedItem.debtRatio}%` }} />
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded text-sm font-medium ${
                        selectedItem.debtRatio < 40 ? 'bg-green-100 text-green-700' :
                        selectedItem.debtRatio < 50 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {selectedItem.debtRatio < 40 ? '优秀' : selectedItem.debtRatio < 50 ? '良好' : '一般'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t border-gray-200">
                    <span>记录人：{selectedItem.recorder}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">统计周期 <span className="text-red-500">*</span></label>
                      <input
                        type="month"
                        defaultValue={selectedItem?.period?.includes('-') ? selectedItem.period : ''}
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">总收入(元)</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.totalIncome || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">总成本(元)</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.totalCost || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">毛利润(元)</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.grossProfit || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">净利润(元)</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.netProfit || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">毛利率(%)</label>
                      <input
                        type="number"
                        step="0.1"
                        defaultValue={selectedItem?.grossMargin || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">净利率(%)</label>
                      <input
                        type="number"
                        step="0.1"
                        defaultValue={selectedItem?.netMargin || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">资产回报率(%)</label>
                      <input
                        type="number"
                        step="0.1"
                        defaultValue={selectedItem?.assetReturn || ''}
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

export default FinancialAnalysis
