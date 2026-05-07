import { useState } from 'react'
import { Search, Plus, Download, TrendingUp, TrendingDown, Minus, BarChart3, Edit, Trash2, Eye, Target, Settings, PieChart, Award, ChevronLeft, ChevronRight } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useToast } from '../contexts/ToastContext'

const Indicators = () => {
  const { toast } = useToast()
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view' | 'analyze' | 'evaluate'>('view')
  const [selectedIndex, setSelectedIndex] = useState<any>(null)
  const [categoryFilter, setCategoryFilter] = useState('全部')
  const [activeTab, setActiveTab] = useState('list')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [exportFormat, setExportFormat] = useState('excel')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const indicators = [
    { id: '1', code: 'KPI001', name: '月产量完成率', category: '生产指标', unit: '%', target: 95, actual: 92.5, trend: 'up', frequency: '月度', source: '自动采集', warning: 90, weight: 15 },
    { id: '2', code: 'KPI002', name: '温室利用率', category: '资源指标', unit: '%', target: 90, actual: 88.3, trend: 'down', frequency: '月度', source: '自动采集', warning: 85, weight: 10 },
    { id: '3', code: 'KPI003', name: '种苗成活率', category: '质量指标', unit: '%', target: 98, actual: 97.2, trend: 'up', frequency: '季度', source: '自动采集', warning: 95, weight: 12 },
    { id: '4', code: 'KPI004', name: '病虫害发生率', category: '质量指标', unit: '%', target: 5, actual: 3.8, trend: 'down', frequency: '月度', source: '自动采集', warning: 8, weight: 10 },
    { id: '5', code: 'KPI005', name: '采收损耗率', category: '质量指标', unit: '%', target: 3, actual: 2.5, trend: 'down', frequency: '月度', source: '人工录入', warning: 5, weight: 8 },
    { id: '6', code: 'KPI006', name: '人工成本占比', category: '成本指标', unit: '%', target: 25, actual: 26.2, trend: 'up', frequency: '月度', source: '自动采集', warning: 28, weight: 10 },
    { id: '7', code: 'KPI007', name: '肥料利用率', category: '效率指标', unit: '%', target: 85, actual: 82.1, trend: 'up', frequency: '季度', source: '人工录入', warning: 80, weight: 8 },
    { id: '8', code: 'KPI008', name: '亩均产值', category: '效益指标', unit: '万元/亩', target: 3.5, actual: 3.2, trend: 'up', frequency: '年度', source: '人工录入', warning: 3.0, weight: 15 },
    { id: '9', code: 'KPI009', name: '客户满意度', category: '服务指标', unit: '分', target: 90, actual: 92, trend: 'up', frequency: '季度', source: '人工录入', warning: 85, weight: 10 },
    { id: '10', code: 'KPI010', name: '设备完好率', category: '设备指标', unit: '%', target: 95, actual: 94.5, trend: 'down', frequency: '月度', source: '自动采集', warning: 90, weight: 8 },
    { id: '11', code: 'KPI011', name: '水资源利用率', category: '效率指标', unit: '%', target: 80, actual: 78.5, trend: 'up', frequency: '月度', source: '自动采集', warning: 75, weight: 8 },
    { id: '12', code: 'KPI012', name: '农残检测合格率', category: '质量指标', unit: '%', target: 100, actual: 99.8, trend: 'stable', frequency: '批次', source: '人工录入', warning: 98, weight: 12 },
    { id: '13', code: 'KPI013', name: '新品研发周期', category: '效率指标', unit: '天', target: 60, actual: 55, trend: 'down', frequency: '年度', source: '人工录入', warning: 70, weight: 6 },
    { id: '14', code: 'KPI014', name: '能源消耗强度', category: '成本指标', unit: 'kWh/亩', target: 800, actual: 850, trend: 'up', frequency: '月度', source: '自动采集', warning: 900, weight: 8 },
    { id: '15', code: 'KPI015', name: '员工培训完成率', category: '服务指标', unit: '%', target: 95, actual: 93, trend: 'up', frequency: '季度', source: '人工录入', warning: 90, weight: 5 },
    { id: '16', code: 'KPI016', name: '安全事故发生率', category: '安全指标', unit: '次', target: 0, actual: 1, trend: 'up', frequency: '月度', source: '人工录入', warning: 2, weight: 15 },
  ]

  const evaluationData = [
    { id: '1', name: '基地一', productionScore: 92, qualityScore: 95, costScore: 88, efficiencyScore: 90, totalScore: 91.25, rank: 1 },
    { id: '2', name: '基地二', productionScore: 88, qualityScore: 92, costScore: 85, efficiencyScore: 87, totalScore: 88.0, rank: 2 },
    { id: '3', name: '基地三', productionScore: 85, qualityScore: 90, costScore: 90, efficiencyScore: 85, totalScore: 87.5, rank: 3 },
    { id: '4', name: '基地四', productionScore: 90, qualityScore: 88, costScore: 82, efficiencyScore: 88, totalScore: 87.0, rank: 4 },
    { id: '5', name: '基地五', productionScore: 82, qualityScore: 85, costScore: 88, efficiencyScore: 86, totalScore: 85.25, rank: 5 },
    { id: '6', name: '基地六', productionScore: 80, qualityScore: 88, costScore: 85, efficiencyScore: 84, totalScore: 84.25, rank: 6 },
    { id: '7', name: '基地七', productionScore: 78, qualityScore: 82, costScore: 86, efficiencyScore: 82, totalScore: 82.0, rank: 7 },
    { id: '8', name: '基地八', productionScore: 75, qualityScore: 80, costScore: 84, efficiencyScore: 80, totalScore: 79.75, rank: 8 },
  ]

  const analyzeData = [
    { month: '1月', target: 100, actual: 95, 达成率: 95 },
    { month: '2月', target: 105, actual: 102, 达成率: 97.1 },
    { month: '3月', target: 110, actual: 108, 达成率: 98.2 },
    { month: '4月', target: 115, actual: 112, 达成率: 97.4 },
    { month: '5月', target: 120, actual: 118, 达成率: 98.3 },
    { month: '6月', target: 125, actual: 122, 达成率: 97.6 },
  ]

  const categorySummary = [
    { name: '生产指标', count: 3, avgAchievement: 95.2, color: '#06b6d4' },
    { name: '质量指标', count: 4, avgAchievement: 96.5, color: '#7C3AED' },
    { name: '成本指标', count: 2, avgAchievement: 92.0, color: '#22c55e' },
    { name: '效率指标', count: 3, avgAchievement: 93.8, color: '#f59e0b' },
    { name: '服务指标', count: 2, avgAchievement: 94.5, color: '#ec4899' },
    { name: '设备指标', count: 1, avgAchievement: 99.5, color: '#0891b2' },
  ]

  const categories = ['全部', '生产指标', '资源指标', '质量指标', '成本指标', '效率指标', '效益指标', '服务指标', '设备指标', '安全指标']

  const filteredIndicators = indicators.filter(ind => {
    const matchesCategory = categoryFilter === '全部' || ind.category === categoryFilter
    const matchesSearch = !searchKeyword || ind.name.toLowerCase().includes(searchKeyword.toLowerCase()) || ind.code.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const totalPages = Math.ceil(filteredIndicators.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedIndicators = filteredIndicators.slice(startIndex, startIndex + pageSize)

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-emerald-600" />
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />
      default: return <Minus className="w-4 h-4 text-gray-400" />
    }
  }

  const getProgressColor = (actual: number, target: number) => {
    const ratio = actual / target
    if (ratio >= 1) return 'bg-emerald-500'
    if (ratio >= 0.95) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const getAchievementColor = (actual: number, target: number) => {
    const ratio = (actual / target) * 100
    if (ratio >= 100) return 'text-emerald-600'
    if (ratio >= 95) return 'text-amber-600'
    return 'text-red-600'
  }

  const handleView = (item: any) => {
    setSelectedIndex(item)
    setModalType('view')
    setShowModal(true)
  }

  const handleAnalyze = (item: any) => {
    setSelectedIndex(item)
    setModalType('analyze')
    setShowModal(true)
  }

  const handleEdit = (item: any) => {
    setSelectedIndex(item)
    setModalType('edit')
    setShowModal(true)
  }

  const handleDelete = (item: any) => {
    setDeleteItem(item)
    setShowDeleteModal(true)
  }

  const handleExport = () => {
    setShowExportModal(true)
  }

  const handleDeleteConfirm = () => {
    setShowDeleteModal(false)
    setDeleteItem(null)
    toast.success('删除成功')
  }

  const handleExportConfirm = () => {
    setShowExportModal(false)
    setSelectedIds([])
    toast.success('导出成功')
  }

  const handleSelectAll = () => {
    if (selectedIds.length === paginatedIndicators.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(paginatedIndicators.map(ind => ind.id))
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setCurrentPage(1)
  }

  const renderPagination = () => {
    const pages = []
    const maxVisible = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    const endPage = Math.min(totalPages, startPage + maxVisible - 1)
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1)
    }
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-300 ${
            i === currentPage
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium'
              : 'bg-white text-gray-700 hover:bg-blue-50 border border-gray-300'
          }`}
        >
          {i}
        </button>
      )
    }
    return pages
  }

  return (
    <div className="p-6 bg-[#F2F6FA] min-h-screen">
      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">指标数据</h1>
              <p className="text-gray-500">管理各类生产管理指标</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setModalType('evaluate'); setShowModal(true) }}
              className="px-4 py-2 border border-purple-300 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-50 transition-all duration-300 flex items-center gap-2"
            >
              <Award className="w-4 h-4" />考核评价
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 border border-blue-300 text-gray-700 rounded-lg text-sm font-medium hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />导出{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
            </button>
            <button
              onClick={() => { setModalType('add'); setShowModal(true) }}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />新增指标
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg mb-6 shadow-sm">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-6 py-3 text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'list' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <BarChart3 className="w-4 h-4" />指标列表
          </button>
          <button
            onClick={() => setActiveTab('category')}
            className={`px-6 py-3 text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'category' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <PieChart className="w-4 h-4" />分类管理
          </button>
          <button
            onClick={() => setActiveTab('analyze')}
            className={`px-6 py-3 text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'analyze' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Target className="w-4 h-4" />达成分析
          </button>
          <button
            onClick={() => setActiveTab('evaluate')}
            className={`px-6 py-3 text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'evaluate' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Award className="w-4 h-4" />考核评价
          </button>
        </div>
      </div>

      {activeTab === 'list' && (
        <div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">类别：</span>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => { setCategoryFilter(cat); setCurrentPage(1); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        categoryFilter === cat
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                          : 'bg-gray-50 text-gray-600 hover:bg-blue-50 border border-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索指标名称或编码..."
                    value={searchKeyword}
                    onChange={(e) => { setSearchKeyword(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <tr>
                  <th className="px-3 py-3 text-left text-sm font-semibold w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === paginatedIndicators.length && paginatedIndicators.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">指标编码</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">指标名称</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">类别</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">采集方式</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">目标值</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">实际值</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">达成率</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">趋势</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {paginatedIndicators.map((ind) => (
                  <tr
                    key={ind.id}
                    className={`hover:bg-blue-50 transition-all duration-300 ${selectedIds.includes(ind.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(ind.id)}
                        onChange={() => handleToggleSelect(ind.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 font-mono">{ind.code}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-900">{ind.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full border border-blue-200">{ind.category}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${ind.source === '自动采集' ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-amber-100 text-amber-800 border border-amber-300'}`}>
                        {ind.source}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 font-mono">{ind.target}{ind.unit}</td>
                    <td className="px-3 py-3 text-sm text-gray-900 font-medium font-mono">{ind.actual}{ind.unit}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getProgressColor(ind.actual, ind.target)} rounded-full`}
                            style={{ width: `${Math.min((ind.actual / ind.target) * 100, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium font-mono ${getAchievementColor(ind.actual, ind.target)}`}>
                          {((ind.actual / ind.target) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        {getTrendIcon(ind.trend)}
                        <span className="text-xs text-gray-500">
                          {ind.trend === 'up' ? '上升' : ind.trend === 'down' ? '下降' : '持平'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleView(ind)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-all duration-300"
                          title="查看"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAnalyze(ind)}
                          className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-100 rounded transition-all duration-300"
                          title="分析"
                        >
                          <Target className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(ind)}
                          className="p-1.5 text-gray-500 hover:text-blue-700 hover:bg-blue-100 rounded transition-all duration-300"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(ind)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded transition-all duration-300"
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
            {filteredIndicators.length === 0 && (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">暂无数据</p>
              </div>
            )}
          </div>

          {filteredIndicators.length > 0 && (
            <div className="mt-4 flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  共 <span className="text-blue-600 font-medium">{filteredIndicators.length}</span> 条记录
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">每页</span>
                  <select
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-sm text-gray-600">条</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1.5 text-sm text-gray-600 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 rotate-180" />
                  <ChevronLeft className="w-4 h-4 rotate-180 -ml-2" />
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1.5 text-sm text-gray-600 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {renderPagination()}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1.5 text-sm text-gray-600 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1.5 text-sm text-gray-600 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                  <ChevronRight className="w-4 h-4 -ml-2" />
                </button>
                <span className="text-sm text-gray-600 ml-2">
                  第 <span className="text-blue-600 font-medium">{currentPage}</span> / {totalPages} 页
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'category' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-blue-600" />指标分类汇总
              </h3>
              <div className="space-y-3">
                {categorySummary.map((cat, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                      <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full border border-blue-200">{cat.count}个</span>
                    </div>
                    <span className="text-sm font-medium text-blue-600 font-mono">平均达成 {cat.avgAchievement}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">指标分布</h3>
              <ResponsiveContainer width="100%" height={250}>
                <RePieChart>
                  <Pie data={categorySummary} cx="50%" cy="50%" outerRadius={100} dataKey="count" nameKey="name" label={({name, count}) => `${name}: ${count}`}>
                    {categorySummary.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />指标定义配置
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <tr>
                    <th className="px-3 py-3 text-left text-sm font-semibold">编码</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">名称</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">计量单位</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">目标值</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">预警值</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">权重</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {indicators.slice(0, 10).map(ind => (
                    <tr key={ind.id} className="hover:bg-blue-50 transition-all duration-300">
                      <td className="px-3 py-3 text-sm font-mono text-gray-600">{ind.code}</td>
                      <td className="px-3 py-3 text-sm font-medium text-gray-900">{ind.name}</td>
                      <td className="px-3 py-3 text-sm text-gray-700">{ind.unit}</td>
                      <td className="px-3 py-3 text-sm text-gray-700 font-mono">{ind.target}</td>
                      <td className="px-3 py-3 text-sm text-amber-600 font-mono">{ind.warning}</td>
                      <td className="px-3 py-3 text-sm text-gray-700 font-mono">{ind.weight}%</td>
                      <td className="px-3 py-3">
                        <button className="text-blue-600 hover:underline text-sm">配置</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analyze' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">月度达成率趋势</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyzeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" fontSize={12} stroke="#6b7280" />
                  <YAxis fontSize={12} domain={[90, 100]} stroke="#6b7280" />
                  <Tooltip formatter={(value: any) => `${value}%`} />
                  <Legend />
                  <Line type="monotone" dataKey="达成率" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">目标值与实际值对比</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyzeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" fontSize={12} stroke="#6b7280" />
                  <YAxis fontSize={12} stroke="#6b7280" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="target" name="目标值" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="实际值" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">达成情况明细</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <tr>
                    <th className="px-3 py-3 text-left text-sm font-semibold">月份</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">目标值</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">实际值</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">差距</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">达成率</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {analyzeData.map((item, index) => (
                    <tr key={index} className="hover:bg-blue-50 transition-all duration-300">
                      <td className="px-3 py-3 text-sm font-medium text-gray-900">{item.month}</td>
                      <td className="px-3 py-3 text-sm text-gray-700 font-mono">{item.target}</td>
                      <td className="px-3 py-3 text-sm text-gray-900 font-medium font-mono">{item.actual}</td>
                      <td className="px-3 py-3 text-sm text-gray-700 font-mono">{item.actual - item.target > 0 ? '+' : ''}{item.actual - item.target}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${item.达成率 >= 98 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : item.达成率 >= 95 ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
                          {item.达成率}%
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${item.达成率 >= 98 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : item.达成率 >= 95 ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
                          {item.达成率 >= 98 ? '优秀' : item.达成率 >= 95 ? '良好' : '待改进'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'evaluate' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />基地考核排名
              </h3>
              <div className="space-y-3">
                {evaluationData.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-300">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' : index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' : index === 2 ? 'bg-gradient-to-br from-amber-500 to-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                      {item.rank}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{item.name}</span>
                        <span className="text-sm font-bold text-blue-600 font-mono">{item.totalScore}分</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span>生产 {item.productionScore}</span>
                        <span>质量 {item.qualityScore}</span>
                        <span>成本 {item.costScore}</span>
                        <span>效率 {item.efficiencyScore}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">综合评分分布</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={evaluationData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" domain={[70, 100]} fontSize={12} stroke="#6b7280" />
                  <YAxis type="category" dataKey="name" fontSize={12} width={60} stroke="#6b7280" />
                  <Tooltip />
                  <Bar dataKey="totalScore" name="总分" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">评价明细表</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <tr>
                    <th className="px-3 py-3 text-left text-sm font-semibold">排名</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">基地</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">生产指标</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">质量指标</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">成本指标</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">效率指标</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">综合得分</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">评价等级</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {evaluationData.map(item => (
                    <tr key={item.id} className="hover:bg-blue-50 transition-all duration-300">
                      <td className="px-3 py-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${item.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' : item.rank === 2 ? 'bg-gray-400' : item.rank === 3 ? 'bg-amber-500' : 'bg-blue-100 text-blue-600'}`}>
                          {item.rank}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                      <td className="px-3 py-3 text-sm text-gray-700 font-mono">{item.productionScore}</td>
                      <td className="px-3 py-3 text-sm text-gray-700 font-mono">{item.qualityScore}</td>
                      <td className="px-3 py-3 text-sm text-gray-700 font-mono">{item.costScore}</td>
                      <td className="px-3 py-3 text-sm text-gray-700 font-mono">{item.efficiencyScore}</td>
                      <td className="px-3 py-3 text-sm font-bold text-blue-600 font-mono">{item.totalScore}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${item.totalScore >= 90 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : item.totalScore >= 85 ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-gray-100 text-gray-700 border border-gray-300'}`}>
                          {item.totalScore >= 90 ? '优秀' : item.totalScore >= 85 ? '良好' : '合格'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 弹窗 - V1.1风格 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                {modalType === 'add' && <><Plus className="w-5 h-5" /> 新增指标</>}
                {modalType === 'edit' && <><Edit className="w-5 h-5" /> 编辑指标</>}
                {modalType === 'view' && <><Eye className="w-5 h-5" /> 指标详情</>}
                {modalType === 'analyze' && <><Target className="w-5 h-5" /> 达成分析</>}
                {modalType === 'evaluate' && <><Award className="w-5 h-5" /> 考核评价</>}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white transition-colors text-2xl leading-none">
                &times;
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {modalType === 'view' && selectedIndex && (
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-3 mb-4">
                      <BarChart3 className="w-10 h-10 text-blue-600" />
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">{selectedIndex.name}</h4>
                        <span className="text-sm text-gray-500 font-mono">{selectedIndex.code}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">类别</p>
                        <p className="text-sm font-medium text-gray-900">{selectedIndex.category}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">采集方式</p>
                        <p className="text-sm font-medium text-gray-900">{selectedIndex.source}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">目标值</p>
                        <p className="text-lg font-bold text-blue-600 font-mono">{selectedIndex.target}{selectedIndex.unit}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">实际值</p>
                        <p className="text-lg font-bold text-gray-900 font-mono">{selectedIndex.actual}{selectedIndex.unit}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 mb-2">达成率</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getProgressColor(selectedIndex.actual, selectedIndex.target)} rounded-full`}
                            style={{ width: `${Math.min((selectedIndex.actual / selectedIndex.target) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 font-mono">
                          {((selectedIndex.actual / selectedIndex.target) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {modalType === 'analyze' && selectedIndex && (
                <div className="space-y-4">
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center gap-3 mb-4">
                      <Target className="w-10 h-10 text-purple-600" />
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">{selectedIndex.name}</h4>
                        <span className="text-sm text-gray-500 font-mono">{selectedIndex.code}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500">目标值</p>
                        <p className="text-xl font-bold text-blue-600 font-mono">{selectedIndex.target}{selectedIndex.unit}</p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500">实际值</p>
                        <p className="text-xl font-bold text-emerald-600 font-mono">{selectedIndex.actual}{selectedIndex.unit}</p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500">达成率</p>
                        <p className="text-xl font-bold text-purple-600 font-mono">{((selectedIndex.actual / selectedIndex.target) * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {modalType === 'evaluate' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-3 mb-4">
                      <Award className="w-10 h-10 text-blue-600" />
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">本季度考核评价</h4>
                        <span className="text-sm text-gray-500">2026年Q2</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500">参评基地</p>
                        <p className="text-xl font-bold text-blue-600 font-mono">8</p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500">优秀</p>
                        <p className="text-xl font-bold text-emerald-600 font-mono">3</p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500">良好</p>
                        <p className="text-xl font-bold text-blue-600 font-mono">4</p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500">合格</p>
                        <p className="text-xl font-bold text-amber-600 font-mono">1</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {(modalType === 'add' || modalType === 'edit') && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">指标编码 <span className="text-red-500">*</span></label>
                    <input type="text" defaultValue={selectedIndex?.code || 'KPI017'} className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">指标名称 <span className="text-red-500">*</span></label>
                    <input type="text" defaultValue={selectedIndex?.name || ''} placeholder="请输入指标名称" className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">类别</label>
                      <select defaultValue={selectedIndex?.category || '生产指标'} className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 transition-colors">
                        {categories.filter(c => c !== '全部').map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">数据采集方式</label>
                      <select defaultValue={selectedIndex?.source || '自动采集'} className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 transition-colors">
                        <option value="自动采集">自动采集</option>
                        <option value="人工录入">人工录入</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-all duration-300">取消</button>
              <button onClick={() => { setShowModal(false); toast.success('保存成功') }} className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">保存</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && deleteItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg w-full max-w-md shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
              <p className="text-gray-600 mb-1">确定要删除指标「{deleteItem.name}」吗？</p>
              <p className="text-gray-400 text-sm mb-6">删除后无法恢复</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all duration-300">取消</button>
                <button onClick={handleDeleteConfirm} className="px-6 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-all duration-300">确认删除</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Download className="w-5 h-5" /> 导出数据
              </h3>
              <button onClick={() => setShowExportModal(false)} className="text-white/80 hover:text-white transition-colors text-2xl leading-none">
                &times;
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-2">确认导出 <span className="text-blue-600 font-medium">{selectedIds.length > 0 ? selectedIds.length : filteredIndicators.length}</span> 条数据</p>
              <p className="text-gray-500 text-sm mb-4">选择导出格式：</p>
              <div className="flex justify-center gap-3 mb-6">
                <button
                  onClick={() => setExportFormat('excel')}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${exportFormat === 'excel' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300'}`}
                >
                  Excel (.xlsx)
                </button>
                <button
                  onClick={() => setExportFormat('csv')}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${exportFormat === 'csv' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300'}`}
                >
                  CSV (.csv)
                </button>
                <button
                  onClick={() => setExportFormat('word')}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${exportFormat === 'word' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300'}`}
                >
                  Word (.docx)
                </button>
              </div>
              <div className="flex justify-center gap-3">
                <button onClick={() => setShowExportModal(false)} className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all duration-300">取消</button>
                <button onClick={handleExportConfirm} className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">确认导出</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Indicators
