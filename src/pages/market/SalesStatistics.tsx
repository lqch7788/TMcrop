/**
 * 销售统计页面 - 展示产品销售数据分析、统计概览
 */
import { useState, useEffect } from 'react'
import {
  Search,
  Download,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Eye,
  Edit,
  Trash2,
  Plus,
} from 'lucide-react'
import { useToast } from '@/components/ui'
import { getStatistics, Statistic } from '@/services/marketApiService'

// 趋势图标组件
const TrendIcon = ({ trend }: { trend?: string }) => {
  if (trend === '上涨') {
    return <TrendingUp className="w-3 h-3" />
  }
  if (trend === '下跌') {
    return <TrendingDown className="w-3 h-3" />
  }
  return <BarChart3 className="w-3 h-3" />
}

// 类别徽章样式映射（统一原生 inline-flex）
const categoryColors: Record<string, string> = {
  '茄果类': 'bg-red-100 text-red-700',
  '瓜菜类': 'bg-green-100 text-green-700',
  '叶菜类': 'bg-yellow-100 text-yellow-700',
  '浆果类': 'bg-blue-100 text-blue-700',
}

// 趋势徽章样式映射
const trendColors: Record<string, string> = {
  '上涨': 'bg-red-100 text-red-700',
  '下跌': 'bg-green-100 text-green-700',
  '平稳': 'bg-blue-100 text-blue-700',
}

/**
 * 销售统计页面
 */
const SalesStatistics = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('view')
  const [selectedStat, setSelectedStat] = useState<Statistic | null>(null)
  const [timeFilter, setTimeFilter] = useState('本月')
  const { toast } = useToast()

  // 销售统计数据状态（V2.1 铁律：API 直连，无缓存）
  const [statistics, setStatistics] = useState<Statistic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // 加载销售统计数据
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getStatistics()
        if (!cancelled) {
          setStatistics(data ?? [])
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : '加载销售统计失败'
          setError(msg)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const timeRanges = ['今日', '本周', '本月', '本季', '本年']

  // 筛选数据
  const filteredData = statistics.filter((s) => {
    const matchesSearch =
      !searchKeyword ||
      s.productName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      s.category.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchesSearch
  })

  // 分页派生
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize))
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // 汇总数据
  const totalSales = filteredData.reduce((sum, s) => sum + s.totalSales, 0)
  const totalVolume = filteredData.reduce((sum, s) => sum + s.totalVolume, 0)
  const totalOrders = filteredData.reduce((sum, s) => sum + s.orderCount, 0)
  // 计算每个产品占比（用于"占比"列展示，Statistic 接口未包含 share 字段）
  const calcShare = (sales: number): string => {
    if (totalSales <= 0) return '0.0%'
    return ((sales / totalSales) * 100).toFixed(1) + '%'
  }

  // 操作处理
  const handleView = (item: Statistic) => {
    setSelectedStat(item)
    setModalType('view')
    setShowModal(true)
  }

  const handleEdit = (item: Statistic) => {
    setSelectedStat(item)
    setModalType('edit')
    setShowModal(true)
  }

  const handleDelete = (item: Statistic) => {
    toast.warning(`确定要删除 ${item.productName} 的统计数据吗？`)
  }

  const handleSave = () => {
    setShowModal(false)
    toast.success('数据已成功保存')
  }

  const handleExport = () => {
    toast.success('销售报表已成功导出')
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">销售统计</h1>
          <p className="text-gray-500 mt-1">产品销售数据分析</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> 导出报表
          </button>
          <button
            onClick={() => {
              setSelectedStat(null)
              setModalType('add')
              setShowModal(true)
            }}
            className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 添加统计
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          加载失败：{error}
        </div>
      )}

      {/* 统计概览卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {/* 总销售额 */}
        <div className="bg-gradient-to-br from-[#2B5D3A] to-green-500 rounded-xl shadow-sm p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="bg-white/20 text-white text-xs font-medium px-2 py-1 rounded-full">
              +12.5%
            </span>
          </div>
          <p className="text-2xl font-bold">¥{totalSales.toLocaleString()}</p>
          <p className="text-green-100 text-sm mt-1">总销售额</p>
        </div>

        {/* 总销售量 */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-sm p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="bg-white/20 text-white text-xs font-medium px-2 py-1 rounded-full">
              +8.2%
            </span>
          </div>
          <p className="text-2xl font-bold">{totalVolume.toLocaleString()} kg</p>
          <p className="text-blue-100 text-sm mt-1">总销售量</p>
        </div>

        {/* 订单总数 */}
        <div className="bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl shadow-sm p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <PieChart className="w-5 h-5" />
            </div>
            <span className="bg-white/20 text-white text-xs font-medium px-2 py-1 rounded-full">
              +5.3%
            </span>
          </div>
          <p className="text-2xl font-bold">{totalOrders}</p>
          <p className="text-purple-100 text-sm mt-1">订单总数</p>
        </div>

        {/* 平均单价 */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-sm p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <span className="text-lg font-bold">¥</span>
            </div>
            <span className="bg-white/20 text-white text-xs font-medium px-2 py-1 rounded-full">
              -2.1%
            </span>
          </div>
          <p className="text-2xl font-bold">
            ¥{totalVolume > 0 ? (totalSales / totalVolume).toFixed(2) : '0.00'}
          </p>
          <p className="text-amber-100 text-sm mt-1">平均单价</p>
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">时间范围：</span>
            <div className="flex gap-2">
              {timeRanges.map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeFilter(range)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    timeFilter === range
                      ? 'bg-[#2B5D3A] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索产品名称或类别..."
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">产品名称</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">类别</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">销售额</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">销售量</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">订单数</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">平均单价</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">走势</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">占比</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                  <div className="inline-block w-8 h-8 border-4 border-[#2B5D3A]/30 border-t-[#2B5D3A] rounded-full animate-spin mb-3" />
                  <p>加载中...</p>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                  <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p>暂无数据</p>
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => {
                const share = calcShare(item.totalSales)
                const shareNum = parseFloat(share)
                const catColor = categoryColors[item.category] || 'bg-gray-100 text-gray-600'
                const trColor = trendColors[item.trend ?? '平稳'] || 'bg-gray-100 text-gray-600'
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-[#2B5D3A]" />
                        <span className="text-sm font-medium text-gray-800">{item.productName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${catColor}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-[#2B5D3A] text-right">
                      ¥{item.totalSales.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {item.totalVolume.toLocaleString()} kg
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{item.orderCount}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">¥{item.avgPrice}/kg</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${trColor}`}>
                        <TrendIcon trend={item.trend} />
                        {item.trend ?? '平稳'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-[#2B5D3A] h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(shareNum, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-500">{share}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
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
                          onClick={() => handleDelete(item)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {!loading && !error && paginatedData.length === 0 && (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无数据</p>
          </div>
        )}
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-500">共 {filteredData.length} 条记录</p>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
            className="ml-3 px-2 py-1 border border-gray-200 rounded text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
          >
            <option value={10}>10 条</option>
            <option value={20}>20 条</option>
            <option value={50}>50 条</option>
            <option value={100}>100 条</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            上一页
          </button>
          <button className="px-3 py-1 bg-[#2B5D3A] text-white rounded text-sm">{currentPage}</button>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      </div>

      {/* 弹窗 - 项目绿色渐变标题栏 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-gray-800">
                {modalType === 'add' ? '添加统计' : modalType === 'edit' ? '编辑统计' : '统计详情'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {modalType === 'view' && selectedStat ? (
                /* 查看模式 */
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-[#2B5D3A] to-[#3D8B5F] rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-2xl font-bold">{selectedStat.productName}</h4>
                        <p className="text-green-100 mt-1">统计周期：{timeFilter}</p>
                      </div>
                      <span className="bg-white/20 text-white px-3 py-1 text-sm font-medium rounded-full inline-flex items-center gap-1">
                        <TrendIcon trend={selectedStat.trend} />
                        {selectedStat.trend ?? '平稳'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">销售额</p>
                      <p className="text-lg font-bold text-[#2B5D3A]">¥{selectedStat.totalSales.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">销售量</p>
                      <p className="text-lg font-bold text-gray-800">{selectedStat.totalVolume.toLocaleString()} kg</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">订单数</p>
                      <p className="text-lg font-bold text-gray-800">{selectedStat.orderCount} 笔</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">平均单价</p>
                      <p className="text-lg font-bold text-gray-800">¥{selectedStat.avgPrice}/kg</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">所属类别</p>
                      <p className="text-lg font-bold text-gray-800">{selectedStat.category}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">销售占比</p>
                      <p className="text-lg font-bold text-gray-800">{calcShare(selectedStat.totalSales)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* 编辑/添加模式 */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">产品名称</label>
                      <input
                        type="text"
                        defaultValue={selectedStat?.productName ?? ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">类别</label>
                      <input
                        type="text"
                        defaultValue={selectedStat?.category ?? '茄果类'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">销售额</label>
                      <input
                        type="number"
                        defaultValue={selectedStat?.totalSales ?? ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">销售量</label>
                      <input
                        type="number"
                        defaultValue={selectedStat?.totalVolume ?? ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">订单数</label>
                      <input
                        type="number"
                        defaultValue={selectedStat?.orderCount ?? ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">平均单价</label>
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={selectedStat?.avgPrice ?? ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">走势</label>
                      <select
                        defaultValue={selectedStat?.trend ?? '平稳'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="上涨">上涨</option>
                        <option value="下跌">下跌</option>
                        <option value="平稳">平稳</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">占比</label>
                      <input
                        type="text"
                        defaultValue={selectedStat ? calcShare(selectedStat.totalSales) : ''}
                        placeholder="自动计算"
                        readOnly
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
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
                onClick={handleSave}
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

export default SalesStatistics