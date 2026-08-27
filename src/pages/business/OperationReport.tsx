import { useState, useEffect } from 'react'
import { Search, Plus, Download, Eye, Edit, Trash2, FileText, Calendar, TrendingUp, BarChart3, PieChart, CheckCircle, Clock, AlertCircle } from 'lucide-react'

const OperationReport = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('view')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [reportTypeFilter, setReportTypeFilter] = useState('全部')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // 经营报表数据
  const reportData = [
    { id: '1', reportNo: 'OR20260301', reportName: '2026年3月份经营简报', reportType: '月度简报', period: '2026-03', totalArea: 535, totalOutput: 35800, totalIncome: 265000, totalCost: 188000, profit: 77000, costRatio: 71.0, yieldRate: 98.5, recorder: '运营部李经理', createDate: '2026-03-25', status: '已发布' },
    { id: '2', reportNo: 'OR20260201', reportName: '2026年2月份经营简报', reportType: '月度简报', period: '2026-02', totalArea: 520, totalOutput: 34200, totalIncome: 210000, totalCost: 155000, profit: 55000, costRatio: 73.8, yieldRate: 97.8, recorder: '运营部李经理', createDate: '2026-02-28', status: '已发布' },
    { id: '3', reportNo: 'OR20260101', reportName: '2026年1月份经营简报', reportType: '月度简报', period: '2026-01', totalArea: 510, totalOutput: 33500, totalIncome: 185000, totalCost: 142000, profit: 43000, costRatio: 76.8, yieldRate: 97.2, recorder: '运营部李经理', createDate: '2026-01-31', status: '已发布' },
    { id: '4', reportNo: 'OR2026Q1', reportName: '2026年第一季度经营报告', reportType: '季度报告', period: '2026-Q1', totalArea: 535, totalOutput: 103500, totalIncome: 660000, totalCost: 485000, profit: 175000, costRatio: 73.5, yieldRate: 97.8, recorder: '运营部王总监', createDate: '2026-04-05', status: '已发布' },
    { id: '5', reportNo: 'OR20260310', reportName: '番茄专项分析报告', reportType: '专项报告', period: '2026-03', totalArea: 50, totalOutput: 25000, totalIncome: 87500, totalCost: 56500, profit: 31000, costRatio: 64.6, yieldRate: 99.2, recorder: '分析师刘明', createDate: '2026-03-15', status: '已发布' },
    { id: '6', reportNo: 'OR20260311', reportName: '草莓专项分析报告', reportType: '专项报告', period: '2026-03', totalArea: 25, totalOutput: 3750, totalIncome: 93750, totalCost: 72250, profit: 21500, costRatio: 77.1, yieldRate: 98.5, recorder: '分析师王芳', createDate: '2026-03-16', status: '已发布' },
    { id: '7', reportNo: 'OR20260312', reportName: '葡萄专项分析报告', reportType: '专项报告', period: '2026-03', totalArea: 60, totalOutput: 12000, totalIncome: 180000, totalCost: 153000, profit: 27000, costRatio: 85.0, yieldRate: 96.8, recorder: '分析师刘明', createDate: '2026-03-17', status: '已发布' },
    { id: '8', reportNo: 'OR2025Q4', reportName: '2025年第四季度经营报告', reportType: '季度报告', period: '2025-Q4', totalArea: 500, totalOutput: 98500, totalIncome: 620000, totalCost: 465000, profit: 155000, costRatio: 75.0, yieldRate: 97.5, recorder: '运营部王总监', createDate: '2026-01-10', status: '已发布' },
    { id: '9', reportNo: 'OR2025Y', reportName: '2025年度经营报告', reportType: '年度报告', period: '2025年', totalArea: 500, totalOutput: 380000, totalIncome: 2350000, totalCost: 1780000, profit: 570000, costRatio: 75.7, yieldRate: 97.2, recorder: '运营部王总监', createDate: '2026-01-20', status: '已发布' },
    { id: '10', reportNo: 'OR20260320', reportName: '投入产出效益分析报告', reportType: '专项报告', period: '2026-03', totalArea: 535, totalOutput: 35800, totalIncome: 1331000, totalCost: 970000, profit: 361000, costRatio: 72.9, yieldRate: 98.2, recorder: '分析师刘明', createDate: '2026-03-20', status: '草稿' },
    { id: '11', reportNo: 'OR20260321', reportName: '成本构成分析报告', reportType: '专项报告', period: '2026-03', totalArea: 535, totalOutput: 35800, totalIncome: 1331000, totalCost: 970000, profit: 361000, costRatio: 72.9, yieldRate: 98.2, recorder: '分析师王芳', createDate: '2026-03-21', status: '待审批' },
    { id: '12', reportNo: 'OR20260322', reportName: '销售渠道分析报告', reportType: '专项报告', period: '2026-03', totalArea: 535, totalOutput: 35800, totalIncome: 265000, totalCost: 188000, profit: 77000, costRatio: 71.0, yieldRate: 98.5, recorder: '运营部李经理', createDate: '2026-03-22', status: '待审批' }
  ]

  const reportTypes = ['全部', '月度简报', '季度报告', '年度报告', '专项报告']
  const statuses = ['已发布', '待审批', '草稿']

  const filteredData = reportData.filter(item => {
    const matchesType = reportTypeFilter === '全部' || item.reportType === reportTypeFilter
    const matchesSearch = !searchKeyword ||
      item.reportName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      item.reportNo.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchesType && matchesSearch
  })

  // 筛选条件变化时重置分页到第 1 页
  useEffect(() => {
    setCurrentPage(1)
  }, [reportTypeFilter, searchKeyword])

  // 分页派生
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize))
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 0 }).format(value)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '已发布':
        return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> }
      case '待审批':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Clock className="w-3 h-3" /> }
      case '草稿':
        return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <AlertCircle className="w-3 h-3" /> }
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Clock className="w-3 h-3" /> }
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case '月度简报':
        return <Calendar className="w-4 h-4 text-blue-500" />
      case '季度报告':
        return <BarChart3 className="w-4 h-4 text-purple-500" />
      case '年度报告':
        return <PieChart className="w-4 h-4 text-orange-500" />
      case '专项报告':
        return <FileText className="w-4 h-4 text-green-500" />
      default:
        return <FileText className="w-4 h-4 text-gray-500" />
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

  // 计算统计
  const publishedCount = reportData.filter(r => r.status === '已发布').length
  const pendingCount = reportData.filter(r => r.status === '待审批').length
  const draftCount = reportData.filter(r => r.status === '草稿').length

  return (
    <div className="pt-0 px-6 pb-6">
      {/* 页面标题 - 带大图标卡 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">经营报表</h1>
              <p className="text-gray-500 mt-1">查看和管理经营统计报表</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> 导出报表
          </button>
          <button
            onClick={() => { setModalType('add'); setShowModal(true); }}
            className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 新建报表
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <p className="text-blue-100 text-sm">报表总数</p>
          <p className="text-2xl font-bold mt-1">{reportData.length}</p>
          <p className="text-blue-200 text-xs mt-1">全部类型</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
          <p className="text-green-100 text-sm">已发布</p>
          <p className="text-2xl font-bold mt-1">{publishedCount}</p>
          <p className="text-green-200 text-xs mt-1">可直接查看</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-4 text-white">
          <p className="text-yellow-100 text-sm">待审批</p>
          <p className="text-2xl font-bold mt-1">{pendingCount}</p>
          <p className="text-yellow-200 text-xs mt-1">审核中</p>
        </div>
        <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl p-4 text-white">
          <p className="text-gray-100 text-sm">草稿</p>
          <p className="text-2xl font-bold mt-1">{draftCount}</p>
          <p className="text-gray-200 text-xs mt-1">未完成</p>
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">报表类型：</span>
            <div className="flex gap-2">
              {reportTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setReportTypeFilter(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    reportTypeFilter === type
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
              placeholder="搜索报表名称或编号..."
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">报表编号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">报表名称</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">类型</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">面积(亩)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">产量(kg)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">收入(元)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">成本(元)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">利润(元)</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedData.map((item) => {
              const statusBadge = getStatusBadge(item.status)
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{item.reportNo}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#2B5D3A]" />
                      <span className="text-sm font-medium text-gray-800">{item.reportName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(item.reportType)}
                      <span className="text-sm text-gray-600">{item.reportType}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">{item.totalArea}</td>
                  <td className="px-4 py-3 text-sm text-right text-blue-600">{item.totalOutput.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">{formatCurrency(item.totalIncome)}</td>
                  <td className="px-4 py-3 text-sm text-right text-orange-600">{formatCurrency(item.totalCost)}</td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-purple-600">{formatCurrency(item.profit)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                      {statusBadge.icon}
                      {item.status}
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
              )
            })}
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无经营报表</p>
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
                {modalType === 'add' ? '新建报表' : modalType === 'edit' ? '编辑报表' : '报表详情'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {modalType === 'view' && selectedItem ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-[#2B5D3A] to-[#3d7a52] rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-2xl font-bold">{selectedItem.reportName}</h4>
                        <p className="text-green-100 mt-1">报表编号：{selectedItem.reportNo}</p>
                      </div>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                        selectedItem.status === '已发布' ? 'bg-white/20 text-white' :
                        selectedItem.status === '待审批' ? 'bg-yellow-400 text-yellow-800' :
                        'bg-gray-300 text-gray-700'
                      }`}>
                        {selectedItem.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-blue-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {getTypeIcon(selectedItem.reportType)}
                        <span className="text-sm text-gray-500">报表类型</span>
                      </div>
                      <p className="text-xl font-bold text-blue-600">{selectedItem.reportType}</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5 text-purple-600" />
                        <span className="text-sm text-gray-500">统计周期</span>
                      </div>
                      <p className="text-xl font-bold text-purple-600">{selectedItem.period}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-gray-500 mb-1">种植面积</p>
                      <p className="text-2xl font-bold text-gray-800">{selectedItem.totalArea} 亩</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-gray-500 mb-1">总产量</p>
                      <p className="text-2xl font-bold text-blue-600">{selectedItem.totalOutput.toLocaleString()} kg</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-gray-500 mb-1">良品率</p>
                      <p className="text-2xl font-bold text-green-600">{selectedItem.yieldRate}%</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-gray-500 mb-1">成本率</p>
                      <p className="text-2xl font-bold text-orange-600">{selectedItem.costRatio}%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">总收入</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedItem.totalIncome)}</p>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">总成本</p>
                      <p className="text-2xl font-bold text-orange-600">{formatCurrency(selectedItem.totalCost)}</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">净利润</p>
                      <p className="text-2xl font-bold text-purple-600">{formatCurrency(selectedItem.profit)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t border-gray-200">
                    <span>编制人：{selectedItem.recorder}</span>
                    <span>创建时间：{selectedItem.createDate}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">报表编号</label>
                      <input
                        type="text"
                        defaultValue={selectedItem?.reportNo || 'OR' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '01'}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">报表类型 <span className="text-red-500">*</span></label>
                      <select
                        defaultValue={selectedItem?.reportType || ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="">请选择类型</option>
                        <option value="月度简报">月度简报</option>
                        <option value="季度报告">季度报告</option>
                        <option value="年度报告">年度报告</option>
                        <option value="专项报告">专项报告</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">报表名称 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      defaultValue={selectedItem?.reportName || ''}
                      placeholder="请输入报表名称"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">总面积(亩)</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.totalArea || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">总产量(kg)</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.totalOutput || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">良品率(%)</label>
                      <input
                        type="number"
                        step="0.1"
                        defaultValue={selectedItem?.yieldRate || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">净利润(元)</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.profit || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                      <select
                        defaultValue={selectedItem?.status || '草稿'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="草稿">草稿</option>
                        <option value="待审批">待审批</option>
                        <option value="已发布">已发布</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">编制人</label>
                      <input
                        type="text"
                        defaultValue={selectedItem?.recorder || ''}
                        placeholder="请输入编制人"
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
    </div>
  )
}

export default OperationReport
