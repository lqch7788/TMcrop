import { useState } from 'react'
import { Search, Plus, Download, Megaphone, Edit, Trash2, Eye, Send, Clock, CheckCircle, XCircle, FileText, Settings, ArrowRight, AlertTriangle, Copy, Tag, ChevronLeft, ChevronRight } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'

const Announcement = () => {
  const { toast } = useToast()
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view' | 'send'>('view')
  const [selectedNotice, setSelectedNotice] = useState<any>(null)
  const [typeFilter, setTypeFilter] = useState('全部')
  const [activeTab, setActiveTab] = useState('list')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [exportFormat, setExportFormat] = useState('excel')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const notices = [
    { id: '1', code: 'N20260401', title: '关于2026年春季种植计划的通知', type: '生产公告', category: '生产计划', priority: '高', status: '已发布', sender: '生产管理部', date: '2026-04-15', deadline: '2026-05-15', readCount: 156, recipients: '全体基地', content: '为确保2026年春季种植工作顺利开展，现将种植计划通知如下...' },
    { id: '2', code: 'N20260402', title: '温室环境控制标准更新', type: '生产公告', category: '技术标准', priority: '高', status: '已发布', sender: '技术部', date: '2026-04-18', deadline: '2026-05-01', readCount: 142, recipients: '温室管理人员', content: '根据最新研究成果，现对温室环境控制标准进行更新...' },
    { id: '3', code: 'N20260403', title: '劳动节放假安排通知', type: '行政公告', category: '行政通知', priority: '中', status: '已发布', sender: '行政人事部', date: '2026-04-20', deadline: '2026-05-10', readCount: 234, recipients: '全体员工', content: '根据国家法定节假日安排，现将劳动节放假事宜通知如下...' },
    { id: '4', code: 'N20260404', title: '新员工入职培训通知', type: '行政公告', category: '培训通知', priority: '中', status: '审批中', sender: '行政人事部', date: '2026-04-22', deadline: '2026-05-05', readCount: 0, recipients: '新入职员工', content: '欢迎新员工加入公司，现将入职培训安排通知如下...' },
    { id: '5', code: 'N20260405', title: '农药使用安全规范', type: '生产公告', category: '安全规范', priority: '高', status: '已发布', sender: '安全生产部', date: '2026-04-25', deadline: '2026-06-01', readCount: 128, recipients: '生产人员', content: '为确保农药使用安全，特制定本规范...' },
    { id: '6', code: 'N20260406', title: '办公设备采购通知', type: '行政公告', category: '采购通知', priority: '低', status: '草稿', sender: '行政部', date: '2026-04-28', deadline: '2026-05-15', readCount: 0, recipients: '各部门负责人', content: '根据公司需求，现计划采购一批办公设备...' },
    { id: '7', code: 'N20260501', title: '采收标准更新通知', type: '生产公告', category: '技术标准', priority: '高', status: '已发布', sender: '质量管理部', date: '2026-05-01', deadline: '2026-05-15', readCount: 98, recipients: '采收人员', content: '为提高产品质量，现对采收标准进行更新...' },
    { id: '8', code: 'N20260502', title: '安全生产月活动通知', type: '行政公告', category: '活动通知', priority: '中', status: '已发布', sender: '安全生产部', date: '2026-05-05', deadline: '2026-06-05', readCount: 187, recipients: '全体员工', content: '为提高全员安全意识，现将安全生产月活动安排通知如下...' },
    { id: '9', code: 'N20260503', title: '灌溉系统维护通知', type: '生产公告', category: '设备维护', priority: '中', status: '审批中', sender: '设备管理部', date: '2026-05-08', deadline: '2026-05-20', readCount: 0, recipients: '设备维护人员', content: '为确保灌溉系统正常运行，现将维护计划通知如下...' },
    { id: '10', code: 'N20260504', title: '考勤管理制度修订', type: '行政公告', category: '制度修订', priority: '高', status: '已发布', sender: '行政人事部', date: '2026-05-10', deadline: '2026-06-01', readCount: 210, recipients: '全体员工', content: '为规范考勤管理，现对考勤管理制度进行修订...' },
  ]

  const templates = [
    { id: '1', code: 'T001', name: '生产计划通知模板', type: '生产公告', category: '生产计划', usageCount: 45, status: '启用' },
    { id: '2', code: 'T002', name: '技术标准更新模板', type: '生产公告', category: '技术标准', usageCount: 38, status: '启用' },
    { id: '3', code: 'T003', name: '行政通知模板', type: '行政公告', category: '行政通知', usageCount: 56, status: '启用' },
    { id: '4', code: 'T004', name: '培训通知模板', type: '行政公告', category: '培训通知', usageCount: 28, status: '启用' },
    { id: '5', code: 'T005', name: '安全规范模板', type: '生产公告', category: '安全规范', usageCount: 22, status: '启用' },
    { id: '6', code: 'T006', name: '活动通知模板', type: '行政公告', category: '活动通知', usageCount: 18, status: '启用' },
  ]

  const approvalWorkflows = [
    { id: '1', code: 'W001', name: '生产公告审批流程', type: '生产公告', steps: 3, status: '启用' },
    { id: '2', code: 'W002', name: '行政公告审批流程', type: '行政公告', steps: 2, status: '启用' },
    { id: '3', code: 'W003', name: '高优先级公告审批流程', type: '全部', steps: 4, status: '启用' },
    { id: '4', code: 'W004', name: '紧急公告审批流程', type: '全部', steps: 1, status: '启用' },
  ]

  const noticeTypes = [
    { name: '生产公告', count: 6, color: 'from-blue-500 to-blue-600', icon: '🌱' },
    { name: '行政公告', count: 4, color: 'from-purple-500 to-purple-600', icon: '📋' },
  ]

  const categories = ['全部', '生产计划', '技术标准', '行政通知', '培训通知', '安全规范', '采购通知', '设备维护', '活动通知', '制度修订']

  const filteredNotices = notices.filter(n => {
    const matchesType = typeFilter === '全部' || n.type === typeFilter
    const matchesSearch = !searchKeyword || n.title.toLowerCase().includes(searchKeyword.toLowerCase()) || n.code.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchesType && matchesSearch
  })

  const totalPages = Math.ceil(filteredNotices.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedNotices = filteredNotices.slice(startIndex, startIndex + pageSize)

  const getStatusColor = (status: string) => {
    switch (status) {
      case '已发布': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case '审批中': return 'bg-amber-50 text-amber-700 border-amber-200'
      case '草稿': return 'bg-gray-50 text-gray-600 border-gray-200'
      default: return 'bg-gray-50 text-gray-600 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case '高': return 'bg-red-50 text-red-700 border-red-200'
      case '中': return 'bg-amber-50 text-amber-700 border-amber-200'
      case '低': return 'bg-green-50 text-green-700 border-green-200'
      default: return 'bg-gray-50 text-gray-600 border-gray-200'
    }
  }

  const handleView = (item: any) => {
    setSelectedNotice(item)
    setModalType('view')
    setShowModal(true)
  }

  const handleEdit = (item: any) => {
    setSelectedNotice(item)
    setModalType('edit')
    setShowModal(true)
  }

  const handleDelete = (item: any) => {
    setDeleteItem(item)
    setShowDeleteModal(true)
  }

  const handleSend = (item: any) => {
    setSelectedNotice(item)
    setModalType('send')
    setShowModal(true)
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
    if (selectedIds.length === paginatedNotices.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(paginatedNotices.map(n => n.id))
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const toggleExpandRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id)
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
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">公告管理</h1>
              <p className="text-gray-500">管理和发布各类生产与行政公告</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
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
              <Plus className="w-4 h-4" />发布公告
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg mb-6 shadow-sm">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => { setActiveTab('list'); setCurrentPage(1); }}
            className={`px-6 py-3 text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'list' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Megaphone className="w-4 h-4" />公告列表
          </button>
          <button
            onClick={() => setActiveTab('type')}
            className={`px-6 py-3 text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'type' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Tag className="w-4 h-4" />类型管理
          </button>
          <button
            onClick={() => setActiveTab('approval')}
            className={`px-6 py-3 text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'approval' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Settings className="w-4 h-4" />审批流程
          </button>
          <button
            onClick={() => setActiveTab('template')}
            className={`px-6 py-3 text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'template' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <FileText className="w-4 h-4" />公告模板
          </button>
        </div>
      </div>

      {activeTab === 'list' && (
        <div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">类型：</span>
                <div className="flex flex-wrap gap-2">
                  {['全部', '生产公告', '行政公告'].map(type => (
                    <button
                      key={type}
                      onClick={() => { setTypeFilter(type); setCurrentPage(1); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        typeFilter === type
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                          : 'bg-gray-50 text-gray-600 hover:bg-blue-50 border border-gray-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索公告标题或编号..."
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
                  <th className="px-3 py-3 text-left text-sm font-semibold w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === paginatedNotices.length && paginatedNotices.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-sm font-semibold w-10"></th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">公告编号</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">公告标题</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">类型</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">优先级</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">状态</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">发布日期</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">阅读数</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {paginatedNotices.map((notice) => (
                  <>
                    <tr
                      key={notice.id}
                      className={`hover:bg-blue-50 transition-all duration-300 ${selectedIds.includes(notice.id) ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(notice.id)}
                          onChange={() => handleToggleSelect(notice.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => toggleExpandRow(notice.id)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          {expandedRow === notice.id ? (
                            <ChevronLeft className="w-4 h-4 rotate-90" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 font-mono">{notice.code}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Megaphone className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-900">{notice.title}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200`}>
                          {notice.type}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(notice.priority)}`}>
                          {notice.priority}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(notice.status)}`}>
                          {notice.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">{notice.date}</td>
                      <td className="px-3 py-3 text-sm text-gray-600 font-mono">{notice.readCount}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleView(notice)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-all duration-300"
                            title="查看"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {notice.status === '草稿' && (
                            <button
                              onClick={() => handleSend(notice)}
                              className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-100 rounded transition-all duration-300"
                              title="发送"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(notice)}
                            className="p-1.5 text-gray-500 hover:text-blue-700 hover:bg-blue-100 rounded transition-all duration-300"
                            title="编辑"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(notice)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded transition-all duration-300"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRow === notice.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={10} className="px-6 py-4">
                          <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                              <Megaphone className="w-4 h-4 text-blue-600" />
                              公告详情
                            </h4>
                            <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                              <div>
                                <span className="text-gray-500">发布部门：</span>
                                <span className="text-gray-900 font-medium">{notice.sender}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">接收对象：</span>
                                <span className="text-gray-900 font-medium">{notice.recipients}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">截止日期：</span>
                                <span className="text-gray-900 font-medium">{notice.deadline}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">分类：</span>
                                <span className="text-gray-900 font-medium">{notice.category}</span>
                              </div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <p className="text-sm text-gray-700">{notice.content}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            {filteredNotices.length === 0 && (
              <div className="text-center py-12">
                <Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">暂无数据</p>
              </div>
            )}
          </div>

          {filteredNotices.length > 0 && (
            <div className="mt-4 flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  共 <span className="text-blue-600 font-medium">{filteredNotices.length}</span> 条记录
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

      {activeTab === 'type' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {noticeTypes.map((type, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:border-blue-300 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{type.icon}</span>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{type.name}</h3>
                      <p className="text-sm text-gray-500">{type.count} 条公告</p>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 text-xs bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:opacity-90 transition-opacity">
                    管理
                  </button>
                </div>
                <div className="space-y-2">
                  {notices.filter(n => n.type === type.name).slice(0, 3).map(n => (
                    <div key={n.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700 truncate flex-1">{n.title}</span>
                      <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${getStatusColor(n.status)}`}>
                        {n.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue-600" />公告分类管理
              </h3>
              <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
                <Plus className="w-4 h-4" />新增分类
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <tr>
                    <th className="px-3 py-3 text-left text-sm font-semibold">分类名称</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">所属类型</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">公告数量</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">状态</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {categories.filter(c => c !== '全部').map((cat, index) => {
                    const count = notices.filter(n => n.category === cat).length
                    const type = cat === '行政通知' || cat === '培训通知' || cat === '采购通知' || cat === '活动通知' || cat === '制度修订' ? '行政公告' : '生产公告'
                    return (
                      <tr key={index} className="hover:bg-blue-50 transition-all duration-300">
                        <td className="px-3 py-3 text-sm font-medium text-gray-900">{cat}</td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200`}>
                            {type}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 font-mono">{count}</td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-1 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">启用</span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <button className="text-blue-600 hover:underline text-sm">编辑</button>
                            <button className="text-red-600 hover:underline text-sm">删除</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'approval' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />审批流程配置
              </h3>
              <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
                <Plus className="w-4 h-4" />新增流程
              </button>
            </div>
            <div className="space-y-4">
              {approvalWorkflows.map((workflow) => (
                <div key={workflow.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Settings className="w-5 h-5 text-blue-600" />
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{workflow.name}</h4>
                        <span className="text-xs text-gray-500">{workflow.code}</span>
                      </div>
                    </div>
                    <span className="px-2 py-1 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{workflow.status}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    {Array.from({ length: workflow.steps }).map((_, i) => (
                      <div key={i} className="flex items-center">
                        <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-200">
                          {i === 0 ? '起草人' : i === workflow.steps - 1 ? '审批人' : '审核人'}
                        </div>
                        {i < workflow.steps - 1 && <ArrowRight className="w-4 h-4 text-gray-400 mx-1" />}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>审批步骤：{workflow.steps} 步</span>
                    <div className="flex items-center gap-2">
                      <button className="text-blue-600 hover:underline">编辑</button>
                      <button className="text-red-600 hover:underline">删除</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />待审批公告
            </h3>
            <div className="space-y-3">
              {notices.filter(n => n.status === '审批中').map(notice => (
                <div key={notice.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{notice.title}</p>
                      <p className="text-xs text-gray-500">{notice.sender} · {notice.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />通过
                    </button>
                    <button className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1">
                      <XCircle className="w-3 h-3" />驳回
                    </button>
                  </div>
                </div>
              ))}
              {notices.filter(n => n.status === '审批中').length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="text-gray-500">暂无待审批公告</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'template' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />公告模板库
              </h3>
              <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
                <Plus className="w-4 h-4" />新增模板
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all duration-300 cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{template.name}</h4>
                        <span className="text-xs text-gray-500">{template.code}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${template.status === '启用' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
                      {template.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {template.type} · {template.category}
                    </span>
                    <span>使用 {template.usageCount} 次</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="flex-1 px-3 py-1.5 text-xs bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1">
                      <Copy className="w-3 h-3" />使用模板
                    </button>
                    <button className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                      <Edit className="w-3 h-3" />
                    </button>
                    <button className="px-3 py-1.5 text-xs border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
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
                {modalType === 'add' && <><Plus className="w-5 h-5" /> 发布公告</>}
                {modalType === 'edit' && <><Edit className="w-5 h-5" /> 编辑公告</>}
                {modalType === 'view' && <><Eye className="w-5 h-5" /> 公告详情</>}
                {modalType === 'send' && <><Send className="w-5 h-5" /> 发布公告</>}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white transition-colors text-2xl leading-none">
                &times;
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {modalType === 'view' && selectedNotice && (
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-3 mb-4">
                      <Megaphone className="w-10 h-10 text-blue-600" />
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">{selectedNotice.title}</h4>
                        <span className="text-sm text-gray-500 font-mono">{selectedNotice.code}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">类型</p>
                        <p className="text-sm font-medium text-gray-900">{selectedNotice.type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">优先级</p>
                        <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(selectedNotice.priority)}`}>{selectedNotice.priority}</span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">发布部门</p>
                        <p className="text-sm font-medium text-gray-900">{selectedNotice.sender}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">发布日期</p>
                        <p className="text-sm font-medium text-gray-900">{selectedNotice.date}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">接收对象</p>
                        <p className="text-sm font-medium text-gray-900">{selectedNotice.recipients}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">阅读数</p>
                        <p className="text-sm font-medium text-gray-900 font-mono">{selectedNotice.readCount}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 mb-2">公告内容</p>
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="text-sm text-gray-700">{selectedNotice.content}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {(modalType === 'add' || modalType === 'edit' || modalType === 'send') && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">公告标题 <span className="text-red-500">*</span></label>
                    <input type="text" defaultValue={selectedNotice?.title || ''} placeholder="请输入公告标题" className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">公告类型 <span className="text-red-500">*</span></label>
                      <select defaultValue={selectedNotice?.type || '生产公告'} className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 transition-colors">
                        <option value="生产公告">生产公告</option>
                        <option value="行政公告">行政公告</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">优先级 <span className="text-red-500">*</span></label>
                      <select defaultValue={selectedNotice?.priority || '中'} className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 transition-colors">
                        <option value="高">高</option>
                        <option value="中">中</option>
                        <option value="低">低</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">接收对象</label>
                      <input type="text" defaultValue={selectedNotice?.recipients || ''} placeholder="请输入接收对象" className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">截止日期</label>
                      <input type="date" defaultValue={selectedNotice?.deadline || ''} className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">公告内容 <span className="text-red-500">*</span></label>
                    <textarea rows={6} defaultValue={selectedNotice?.content || ''} placeholder="请输入公告内容" className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none" />
                  </div>
                  {(modalType === 'add' || modalType === 'send') && (
                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <p className="text-sm text-amber-700">发布公告后将立即推送给所有接收对象，请确认内容无误</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-all duration-300">取消</button>
              <button onClick={() => { setShowModal(false); toast.success(modalType === 'send' ? '发布成功' : '保存成功') }} className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                {modalType === 'send' ? '确认发布' : '保存'}
              </button>
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
              <p className="text-gray-600 mb-1">确定要删除公告「{deleteItem.title}」吗？</p>
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
              <p className="text-gray-700 mb-2">确认导出 <span className="text-blue-600 font-medium">{selectedIds.length > 0 ? selectedIds.length : filteredNotices.length}</span> 条数据</p>
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

export default Announcement
