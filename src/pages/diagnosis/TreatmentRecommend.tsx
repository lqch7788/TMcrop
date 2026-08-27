import { useState } from 'react'
import { Search, Plus, Download, Edit, Trash2, Eye, Heart, Droplets, Clock, Calendar, CheckCircle, Stethoscope } from 'lucide-react'

// 防治推荐数据
const treatmentData = [
  { id: '1', recommendNo: 'TR2024032601', disease: '早疫病', crop: '番茄', severity: '中等', medicine: '多菌灵', dosage: '800倍液', method: '叶面喷施', frequency: '每7天一次', effect: '良好', validDays: 30, expert: '张建国', publishDate: '2024-03-20', status: '推荐' },
  { id: '2', recommendNo: 'TR2024032602', disease: '白粉病', crop: '黄瓜', severity: '严重', medicine: '粉锈宁', dosage: '1000倍液', method: '叶面喷施', frequency: '每5天一次', effect: '显著', validDays: 25, expert: '李秀英', publishDate: '2024-03-18', status: '推荐' },
  { id: '3', recommendNo: 'TR2024032603', disease: '蚜虫', crop: '辣椒', severity: '轻微', medicine: '吡虫啉', dosage: '2000倍液', method: '叶面喷施', frequency: '每10天一次', effect: '良好', validDays: 20, expert: '王志强', publishDate: '2024-03-15', status: '推荐' },
  { id: '4', recommendNo: 'TR2024032604', disease: '红蜘蛛', crop: '茄子', severity: '中等', medicine: '哒螨灵', dosage: '1500倍液', method: '叶面喷施', frequency: '每7天一次', effect: '良好', validDays: 28, expert: '赵红梅', publishDate: '2024-03-12', status: '推荐' },
  { id: '5', recommendNo: 'TR2024032505', disease: '灰霉病', crop: '草莓', severity: '严重', medicine: '速克灵', dosage: '1000倍液', method: '喷雾处理', frequency: '每6天一次', effect: '显著', validDays: 22, expert: '陈伟明', publishDate: '2024-03-10', status: '推荐' },
  { id: '6', recommendNo: 'TR2024032506', disease: '潜叶蝇', crop: '生菜', severity: '轻微', medicine: '阿维菌素', dosage: '3000倍液', method: '叶面喷施', frequency: '每14天一次', effect: '一般', validDays: 35, expert: '周小燕', publishDate: '2024-03-08', status: '不推荐' },
  { id: '7', recommendNo: 'TR2024032507', disease: '枯萎病', crop: '西瓜', severity: '严重', medicine: '甲基托布津', dosage: '600倍液', method: '灌根', frequency: '每10天一次', effect: '显著', validDays: 30, expert: '吴海峰', publishDate: '2024-03-05', status: '推荐' },
  { id: '8', recommendNo: 'TR2024032508', disease: '霜霉病', crop: '葡萄', severity: '中等', medicine: '甲霜灵', dosage: '800倍液', method: '叶面喷施', frequency: '每7天一次', effect: '良好', validDays: 25, expert: '郑晓丽', publishDate: '2024-03-02', status: '推荐' },
  { id: '9', recommendNo: 'TR2024032509', disease: '病毒病', crop: '番茄', severity: '严重', medicine: '病毒A', dosage: '500倍液', method: '叶面喷施', frequency: '每5天一次', effect: '一般', validDays: 20, expert: '张建国', publishDate: '2024-02-28', status: '不推荐' },
  { id: '10', recommendNo: 'TR2024032510', disease: '瓜绢螟', crop: '黄瓜', severity: '中等', medicine: 'Bt制剂', dosage: '1000倍液', method: '叶面喷施', frequency: '每7天一次', effect: '良好', validDays: 15, expert: '李秀英', publishDate: '2024-02-25', status: '推荐' },
]

const diseases = ['早疫病', '白粉病', '蚜虫', '红蜘蛛', '灰霉病', '潜叶蝇', '枯萎病', '霜霉病', '病毒病', '瓜绢螟']
const crops = ['番茄', '黄瓜', '辣椒', '茄子', '草莓', '生菜', '西瓜', '葡萄']
const severities = ['轻微', '中等', '严重']
const experts = ['张建国', '李秀英', '王志强', '赵红梅', '陈伟明', '周小燕', '吴海峰', '郑晓丽']
const medicines = ['多菌灵', '粉锈宁', '吡虫啉', '哒螨灵', '速克灵', '阿维菌素', '甲基托布津', '甲霜灵', '病毒A', 'Bt制剂']
const methods = ['叶面喷施', '灌根', '喷雾处理', '土壤处理']
const frequencies = ['每5天一次', '每6天一次', '每7天一次', '每10天一次', '每14天一次']

const TreatmentRecommend = () => {
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view' | 'delete'>('view')
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [severityFilter, setSeverityFilter] = useState('全部')
  const [statusFilter, setStatusFilter] = useState('全部')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [formData, setFormData] = useState({
    disease: '', crop: '', severity: '', medicine: '', dosage: '', method: '', frequency: '', effect: '', validDays: '', expert: ''
  })

  const handleAdd = () => {
    setModalType('add')
    setFormData({ disease: '', crop: '', severity: '', medicine: '', dosage: '', method: '', frequency: '', effect: '', validDays: '', expert: '' })
    setShowModal(true)
  }

  const handleEdit = (record: any) => {
    setSelectedRecord(record)
    setModalType('edit')
    setFormData({
      disease: record.disease,
      crop: record.crop,
      severity: record.severity,
      medicine: record.medicine,
      dosage: record.dosage,
      method: record.method,
      frequency: record.frequency,
      effect: record.effect,
      validDays: record.validDays.toString(),
      expert: record.expert
    })
    setShowModal(true)
  }

  const handleView = (record: any) => {
    setSelectedRecord(record)
    setModalType('view')
    setShowModal(true)
  }

  const handleDelete = (record: any) => {
    setSelectedRecord(record)
    setModalType('delete')
    setShowModal(true)
  }

  const handleExport = () => {
    console.log('导出数据')
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case '轻微': return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> }
      case '中等': return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Clock className="w-3 h-3" /> }
      case '严重': return { bg: 'bg-red-100', text: 'text-red-700', icon: <Clock className="w-3 h-3" /> }
      default: return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Clock className="w-3 h-3" /> }
    }
  }

  const getEffectBadge = (effect: string) => {
    switch (effect) {
      case '显著': return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> }
      case '良好': return { bg: 'bg-blue-100', text: 'text-blue-700', icon: <CheckCircle className="w-3 h-3" /> }
      case '一般': return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Clock className="w-3 h-3" /> }
      default: return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Clock className="w-3 h-3" /> }
    }
  }

  // 按搜索关键字 + 严重程度 + 推荐状态 筛选
  const filteredData = treatmentData.filter(item => {
    const matchesSeverity = severityFilter === '全部' || item.severity === severityFilter
    const matchesStatus = statusFilter === '全部' || item.status === statusFilter
    const kw = searchKeyword.toLowerCase()
    const matchesSearch = !searchKeyword ||
      item.recommendNo.toLowerCase().includes(kw) ||
      item.disease.toLowerCase().includes(kw) ||
      item.crop.toLowerCase().includes(kw) ||
      item.medicine.toLowerCase().includes(kw)
    return matchesSeverity && matchesStatus && matchesSearch
  })

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize))
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="pt-0 px-6 pb-6">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">防治推荐</h1>
              <p className="text-gray-500 mt-1">科学防治方案及药剂推荐</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> 导出
            </button>
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> 新增推荐
            </button>
          </div>
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">严重程度：</span>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => { setSeverityFilter('全部'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    severityFilter === '全部'
                      ? 'bg-[#2B5D3A] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  全部
                </button>
                {severities.map(s => (
                  <button
                    key={s}
                    onClick={() => { setSeverityFilter(s); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      severityFilter === s
                        ? 'bg-[#2B5D3A] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">推荐状态：</span>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => { setStatusFilter('全部'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === '全部'
                      ? 'bg-[#2B5D3A] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  全部
                </button>
                <button
                  onClick={() => { setStatusFilter('推荐'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === '推荐'
                      ? 'bg-[#2B5D3A] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  推荐
                </button>
                <button
                  onClick={() => { setStatusFilter('不推荐'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === '不推荐'
                      ? 'bg-[#2B5D3A] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  不推荐
                </button>
              </div>
            </div>
          </div>
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索编号、病害、作物或药剂..."
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">推荐编号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">病虫害</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">作物</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">严重程度</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">推荐药剂</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">用法用量</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">使用频率</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">防效</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">有效期</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedData.map((record) => {
              const severityBadge = getSeverityBadge(record.severity)
              const effectBadge = getEffectBadge(record.effect)
              return (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{record.recommendNo}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{record.disease}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.crop}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${severityBadge.bg} ${severityBadge.text}`}>
                      {severityBadge.icon}
                      {record.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-gray-800">{record.medicine}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.dosage}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.frequency}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${effectBadge.bg} ${effectBadge.text}`}>
                      {effectBadge.icon}
                      {record.effect}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.validDays}天</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleView(record)} className="p-1.5 text-gray-400 hover:text-[#2B5D3A] hover:bg-[#2B5D3A]/10 rounded transition-colors" title="查看">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(record)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="编辑">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(record)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="删除">
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
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
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
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[80vh] overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
            {/* 弹窗头部 */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-gray-800">
                {modalType === 'add' ? '新增推荐' : modalType === 'edit' ? '编辑推荐' : modalType === 'view' ? '推荐详情' : '删除确认'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {modalType === 'view' && selectedRecord ? (
                <div className="space-y-6">
                  {/* 推荐信息卡片 */}
                  <div className="bg-gradient-to-r from-red-500 to-pink-600 rounded-xl p-6 text-white">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <Heart className="w-8 h-8" />
                          <span className="text-xl font-bold">{selectedRecord.disease}</span>
                        </div>
                        <p className="text-red-100">{selectedRecord.crop} - {selectedRecord.severity}程度</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        selectedRecord.status === '推荐' ? 'bg-white/20 text-white' : 'bg-yellow-400 text-yellow-800'
                      }`}>
                        {selectedRecord.status}
                      </span>
                    </div>
                  </div>

                  {/* 药剂信息 */}
                  <div className="bg-blue-50 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Droplets className="w-8 h-8 text-blue-600" />
                      <div>
                        <h4 className="text-lg font-bold text-gray-800">{selectedRecord.medicine}</h4>
                        <p className="text-blue-600 text-sm">{selectedRecord.dosage}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-3">
                        <p className="text-xs text-gray-500">使用方法</p>
                        <p className="text-sm font-medium text-gray-800">{selectedRecord.method}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <p className="text-xs text-gray-500">使用频率</p>
                        <p className="text-sm font-medium text-gray-800">{selectedRecord.frequency}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <p className="text-xs text-gray-500">预计防效</p>
                        <p className="text-sm font-medium text-green-600">{selectedRecord.effect}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <p className="text-xs text-gray-500">有效期</p>
                        <p className="text-sm font-medium text-gray-800">{selectedRecord.validDays}天</p>
                      </div>
                    </div>
                  </div>

                  {/* 专家信息 */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="font-medium text-gray-800 mb-4">推荐专家</h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#2B5D3A] rounded-full flex items-center justify-center text-white font-bold">
                          {selectedRecord.expert.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{selectedRecord.expert}</p>
                          <p className="text-sm text-gray-500">农业病虫害专家</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">推荐日期</p>
                        <p className="text-sm font-medium text-gray-800">{selectedRecord.publishDate}</p>
                      </div>
                    </div>
                  </div>

                  {/* 注意事项 */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-3">注意事项</h4>
                    <div className="bg-yellow-50 rounded-lg p-4 text-sm text-yellow-800 space-y-2">
                      <p>1. 药剂应轮换使用，避免产生抗药性</p>
                      <p>2. 施药时间建议在晴天上午10点前或下午4点后</p>
                      <p>3. 施药后注意安全间隔期，确保农产品质量安全</p>
                      <p>4. 孕妇和儿童应避免接触农药</p>
                    </div>
                  </div>
                </div>
              ) : modalType === 'delete' ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-8 h-8 text-red-600" />
                  </div>
                  <p className="text-gray-600 mb-2">确定要删除这条推荐记录吗？</p>
                  <p className="text-gray-400 text-sm">推荐编号：{selectedRecord?.recommendNo}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">病虫害名称</label>
                      <select
                        value={formData.disease}
                        onChange={(e) => setFormData({...formData, disease: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="">请选择病虫害</option>
                        {diseases.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">作物名称</label>
                      <select
                        value={formData.crop}
                        onChange={(e) => setFormData({...formData, crop: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="">请选择作物</option>
                        {crops.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">严重程度</label>
                      <select
                        value={formData.severity}
                        onChange={(e) => setFormData({...formData, severity: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="">请选择程度</option>
                        {severities.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">推荐药剂</label>
                      <select
                        value={formData.medicine}
                        onChange={(e) => setFormData({...formData, medicine: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="">请选择药剂</option>
                        {medicines.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">用法用量</label>
                      <input
                        type="text"
                        placeholder="如：800倍液"
                        value={formData.dosage}
                        onChange={(e) => setFormData({...formData, dosage: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">使用方法</label>
                      <select
                        value={formData.method}
                        onChange={(e) => setFormData({...formData, method: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="">请选择方法</option>
                        {methods.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">使用频率</label>
                      <select
                        value={formData.frequency}
                        onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="">请选择频率</option>
                        {frequencies.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">有效期(天)</label>
                      <input
                        type="number"
                        placeholder="如：30"
                        value={formData.validDays}
                        onChange={(e) => setFormData({...formData, validDays: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">防效评估</label>
                      <select
                        value={formData.effect}
                        onChange={(e) => setFormData({...formData, effect: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="">请选择</option>
                        <option value="显著">显著</option>
                        <option value="良好">良好</option>
                        <option value="一般">一般</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">推荐专家</label>
                      <select
                        value={formData.expert}
                        onChange={(e) => setFormData({...formData, expert: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="">请选择专家</option>
                        {experts.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 弹窗底部 */}
            <div className="px-6 py-4 border-t border-slate-200 bg-gray-50 flex items-center justify-end gap-3">
              {modalType === 'view' ? (
                <>
                  <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm transition-colors">
                    关闭
                  </button>
                  <button onClick={() => { setModalType('edit'); setFormData(selectedRecord) }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                    编辑
                  </button>
                </>
              ) : modalType === 'delete' ? (
                <>
                  <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm transition-colors">
                    取消
                  </button>
                  <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors">
                    确认删除
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm transition-colors">
                    取消
                  </button>
                  <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm hover:bg-[#245038] transition-colors">
                    保存
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TreatmentRecommend
