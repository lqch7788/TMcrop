import { useState } from 'react'
import { Search, Plus, Download, Calendar, Eye, Edit, Trash2, TrendingUp, TrendingDown, Minus, CheckCircle, Clock } from 'lucide-react'

const GrowthAnalysis = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('view')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [cropFilter, setCropFilter] = useState('全部')
  const [statusFilter, setStatusFilter] = useState('全部')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const analyses = [
    { id: '1', reportNo: 'GA202403001', crop: '番茄', cropArea: 'A区-1号温室', growthStage: '开花期', healthScore: 92, growthTrend: '上升', vsLastWeek: 5.2, vsLastMonth: 12.8, analyzeTime: '2024-03-20 09:00', operator: '张建国', status: '正常', remark: '生长势头良好' },
    { id: '2', reportNo: 'GA202403002', crop: '黄瓜', cropArea: 'B区-2号温室', growthStage: '结果期', healthScore: 85, growthTrend: '稳定', vsLastWeek: 1.2, vsLastMonth: 4.5, analyzeTime: '2024-03-20 09:30', operator: '李秀英', status: '正常', remark: '座果率较高' },
    { id: '3', reportNo: 'GA202403003', crop: '辣椒', cropArea: 'C区-1号温室', growthStage: '幼苗期', healthScore: 78, growthTrend: '下降', vsLastWeek: -3.5, vsLastMonth: -8.2, analyzeTime: '2024-03-20 10:00', operator: '王志强', status: '关注', remark: '缺肥迹象' },
    { id: '4', reportNo: 'GA202403004', crop: '茄子', cropArea: 'A区-2号温室', growthStage: '开花期', healthScore: 88, growthTrend: '上升', vsLastWeek: 4.8, vsLastMonth: 10.5, analyzeTime: '2024-03-20 10:30', operator: '赵红梅', status: '正常', remark: '花芽分化良好' },
    { id: '5', reportNo: 'GA202403005', crop: '草莓', cropArea: 'D区-1号温室', growthStage: '结果期', healthScore: 65, growthTrend: '下降', vsLastWeek: -8.2, vsLastMonth: -15.6, analyzeTime: '2024-03-20 11:00', operator: '陈伟明', status: '预警', remark: '需紧急处理' },
    { id: '6', reportNo: 'GA202403006', crop: '生菜', cropArea: 'E区-1号温室', growthStage: '叶菜期', healthScore: 95, growthTrend: '稳定', vsLastWeek: 0.5, vsLastMonth: 2.1, analyzeTime: '2024-03-20 11:30', operator: '周小燕', status: '正常', remark: '品质优良' },
    { id: '7', reportNo: 'GA202403007', crop: '西瓜', cropArea: 'F区-1号温室', growthStage: '伸蔓期', healthScore: 82, growthTrend: '上升', vsLastWeek: 6.3, vsLastMonth: 18.5, analyzeTime: '2024-03-20 12:00', operator: '吴海峰', status: '正常', remark: '藤蔓生长健壮' },
    { id: '8', reportNo: 'GA202403008', crop: '葡萄', cropArea: 'G区-1号温室', growthStage: '萌芽期', healthScore: 90, growthTrend: '上升', vsLastWeek: 3.8, vsLastMonth: 8.9, analyzeTime: '2024-03-20 12:30', operator: '郑晓丽', status: '正常', remark: '萌芽整齐' },
    { id: '9', reportNo: 'GA202403009', crop: '番茄', cropArea: 'A区-3号温室', growthStage: '结果期', healthScore: 71, growthTrend: '下降', vsLastWeek: -5.6, vsLastMonth: -11.3, analyzeTime: '2024-03-20 13:00', operator: '张建国', status: '关注', remark: '营养供应不足' },
    { id: '10', reportNo: 'GA202403010', crop: '黄瓜', cropArea: 'B区-3号温室', growthStage: '开花期', healthScore: 94, growthTrend: '稳定', vsLastWeek: 2.1, vsLastMonth: 6.7, analyzeTime: '2024-03-20 13:30', operator: '李秀英', status: '正常', remark: '整体长势优秀' },
  ]

  const crops = ['全部', '番茄', '黄瓜', '辣椒', '茄子', '草莓', '生菜', '西瓜', '葡萄']
  const statuses = ['全部', '正常', '关注', '预警']
  const growthStages = ['幼苗期', '伸蔓期', '开花期', '结果期', '叶菜期', '萌芽期']

  const filteredData = analyses.filter(a => {
    const matchesCrop = cropFilter === '全部' || a.crop === cropFilter
    const matchesStatus = statusFilter === '全部' || a.status === statusFilter
    const matchesSearch = !searchKeyword ||
      a.reportNo.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      a.crop.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      a.cropArea.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchesCrop && matchesStatus && matchesSearch
  })

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize))
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case '上升': return <TrendingUp className="w-4 h-4 text-green-500" />
      case '下降': return <TrendingDown className="w-4 h-4 text-red-500" />
      default: return <Minus className="w-4 h-4 text-gray-400" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case '上升': return 'text-green-600'
      case '下降': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '正常': return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> }
      case '关注': return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Clock className="w-3 h-3" /> }
      case '预警': return { bg: 'bg-red-100', text: 'text-red-700', icon: <Clock className="w-3 h-3" /> }
      default: return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Clock className="w-3 h-3" /> }
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
          <h1 className="text-2xl font-bold text-gray-800">长势分析</h1>
          <p className="text-gray-500 mt-1">作物生长状态监测与分析</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> 导出
          </button>
          <button
            onClick={() => { setModalType('add'); setSelectedItem(null); setShowModal(true); }}
            className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 新增分析
          </button>
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">作物类型：</span>
              <div className="flex gap-1">
                {crops.map(crop => (
                  <button
                    key={crop}
                    onClick={() => { setCropFilter(crop); setCurrentPage(1); }}
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
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">状态：</span>
              <div className="flex gap-1">
                {statuses.map(status => (
                  <button
                    key={status}
                    onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      statusFilter === status
                        ? 'bg-[#2B5D3A] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索报告编号、作物或区域..."
              value={searchKeyword}
              onChange={(e) => { setSearchKeyword(e.target.value); setCurrentPage(1); }}
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">报告编号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">作物</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">种植区域</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">生长阶段</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">健康评分</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">周变化</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">月变化</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">分析时间</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作员</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">状态</th>
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
                      <TrendingUp className="w-4 h-4 text-[#2B5D3A]" />
                      <span className="text-sm font-medium text-gray-800">{item.crop}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.cropArea}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.growthStage}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${item.healthScore >= 80 ? 'bg-green-500' : item.healthScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${item.healthScore}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-800">{item.healthScore}分</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {getTrendIcon(item.growthTrend)}
                      <span className={`text-sm font-medium ${getTrendColor(item.growthTrend)}`}>
                        {item.vsLastWeek > 0 ? '+' : ''}{item.vsLastWeek}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {getTrendIcon(item.vsLastMonth >= 0 ? '上升' : '下降')}
                      <span className={`text-sm font-medium ${getTrendColor(item.vsLastMonth >= 0 ? '上升' : '下降')}`}>
                        {item.vsLastMonth > 0 ? '+' : ''}{item.vsLastMonth}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.analyzeTime}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.operator}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                      {statusBadge.icon}
                      {item.status}
                    </span>
                  </td>
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
              )
            })}
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
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">共 {filteredData.length} 条记录</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">每页</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]">
              <option value={10}>10 条</option>
              <option value={20}>20 条</option>
              <option value={50}>50 条</option>
              <option value={100}>100 条</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">上一页</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button key={page} onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded text-sm ${
                currentPage === page ? 'bg-[#2B5D3A] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>{page}</button>
          ))}
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
            className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">下一页</button>
        </div>
      </div>

      {/* 弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-gray-800">
                {modalType === 'add' ? '新增分析报告' : modalType === 'edit' ? '编辑分析报告' : '分析详情'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {modalType === 'view' && selectedItem ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-2xl font-bold">{selectedItem.crop} 长势分析报告</h4>
                        <p className="text-green-100 mt-1">报告编号：{selectedItem.reportNo}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-5xl font-bold">{selectedItem.healthScore}</p>
                        <p className="text-sm text-green-100">健康评分</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">作物类型</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.crop}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">种植区域</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.cropArea}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">生长阶段</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.growthStage}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">生长趋势</p>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(selectedItem.growthTrend)}
                        <span className={`text-lg font-bold ${getTrendColor(selectedItem.growthTrend)}`}>{selectedItem.growthTrend}</span>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">周变化</p>
                      <p className={`text-lg font-bold ${getTrendColor(selectedItem.vsLastWeek >= 0 ? '上升' : '下降')}`}>
                        {selectedItem.vsLastWeek > 0 ? '+' : ''}{selectedItem.vsLastWeek}%
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">月变化</p>
                      <p className={`text-lg font-bold ${getTrendColor(selectedItem.vsLastMonth >= 0 ? '上升' : '下降')}`}>
                        {selectedItem.vsLastMonth > 0 ? '+' : ''}{selectedItem.vsLastMonth}%
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">操作员</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.operator}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">分析时间</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.analyzeTime}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-2">备注说明</p>
                    <p className="text-gray-700">{selectedItem.remark}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">报告编号</label>
                      <input
                        type="text"
                        defaultValue={selectedItem?.reportNo || 'GA202403011'}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">分析时间</label>
                      <input
                        type="datetime-local"
                        defaultValue={selectedItem?.analyzeTime?.replace(' ', 'T') || ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">作物类型 <span className="text-red-500">*</span></label>
                      <select
                        defaultValue={selectedItem?.crop || ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="">请选择作物</option>
                        <option value="番茄">番茄</option>
                        <option value="黄瓜">黄瓜</option>
                        <option value="辣椒">辣椒</option>
                        <option value="茄子">茄子</option>
                        <option value="草莓">草莓</option>
                        <option value="生菜">生菜</option>
                        <option value="西瓜">西瓜</option>
                        <option value="葡萄">葡萄</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">种植区域</label>
                      <input
                        type="text"
                        defaultValue={selectedItem?.cropArea || ''}
                        placeholder="如：A区-1号温室"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">生长阶段</label>
                      <select
                        defaultValue={selectedItem?.growthStage || ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        {growthStages.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">健康评分</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.healthScore || ''}
                        placeholder="0-100"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">周变化 (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        defaultValue={selectedItem?.vsLastWeek || ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">月变化 (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        defaultValue={selectedItem?.vsLastMonth || ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">操作员</label>
                      <select
                        defaultValue={selectedItem?.operator || ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="">请选择操作员</option>
                        <option value="张建国">张建国</option>
                        <option value="李秀英">李秀英</option>
                        <option value="王志强">王志强</option>
                        <option value="赵红梅">赵红梅</option>
                        <option value="陈伟明">陈伟明</option>
                        <option value="周小燕">周小燕</option>
                        <option value="吴海峰">吴海峰</option>
                        <option value="郑晓丽">郑晓丽</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                      <select
                        defaultValue={selectedItem?.status || '正常'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="正常">正常</option>
                        <option value="关注">关注</option>
                        <option value="预警">预警</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">备注说明</label>
                    <textarea
                      defaultValue={selectedItem?.remark || ''}
                      placeholder="请输入备注说明..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A] resize-none"
                    ></textarea>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-gray-50 flex items-center justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm transition-colors">取消</button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm hover:bg-[#245038] transition-colors">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GrowthAnalysis
