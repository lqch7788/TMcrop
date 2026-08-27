import { useState } from 'react'
import { Search, Plus, Download, Edit, Trash2, Eye, BookOpen, FileText, Video, Image, Calendar, CheckCircle, Clock } from 'lucide-react'

// 知识库数据
const knowledgeData = [
  { id: '1', docNo: 'KB2024032601', title: '番茄早疫病识别与防治', category: '病害防治', crops: '番茄', author: '张建国', publishDate: '2024-03-20', views: 1256, status: '已发布' },
  { id: '2', docNo: 'KB2024032602', title: '黄瓜白粉病综合管理方案', category: '病害防治', crops: '黄瓜', author: '李秀英', publishDate: '2024-03-18', views: 980, status: '已发布' },
  { id: '3', docNo: 'KB2024032603', title: '辣椒蚜虫生物防治技术', category: '虫害防治', crops: '辣椒', author: '王志强', publishDate: '2024-03-15', views: 756, status: '已发布' },
  { id: '4', docNo: 'KB2024032504', title: '茄子红蜘蛛发生规律及防控', category: '虫害防治', crops: '茄子', author: '赵红梅', publishDate: '2024-03-12', views: 623, status: '已发布' },
  { id: '5', docNo: 'KB2024032505', title: '草莓灰霉病预防与管理', category: '病害防治', crops: '草莓', author: '陈伟明', publishDate: '2024-03-10', views: 892, status: '已发布' },
  { id: '6', docNo: 'KB2024032506', title: '生菜潜叶蝇防治手册', category: '虫害防治', crops: '生菜', author: '周小燕', publishDate: '2024-03-08', views: 445, status: '已发布' },
  { id: '7', docNo: 'KB2024032507', title: '西瓜枯萎病病原分析与轮作技术', category: '病害防治', crops: '西瓜', author: '吴海峰', publishDate: '2024-03-05', views: 567, status: '草稿' },
  { id: '8', docNo: 'KB2024032508', title: '葡萄霜霉病预警与应急处理', category: '病害防治', crops: '葡萄', author: '郑晓丽', publishDate: '2024-03-02', views: 734, status: '已发布' },
  { id: '9', docNo: 'KB2024032509', title: '番茄病毒病传播途径及阻断技术', category: '病害防治', crops: '番茄', author: '张建国', publishDate: '2024-02-28', views: 456, status: '已发布' },
  { id: '10', docNo: 'KB2024032510', title: '黄瓜瓜绢螟生态防治方法', category: '虫害防治', crops: '黄瓜', author: '李秀英', publishDate: '2024-02-25', views: 389, status: '已发布' },
]

const categories = ['病害防治', '虫害防治', '栽培技术', '水肥管理', '修剪技术']
const crops = ['番茄', '黄瓜', '辣椒', '茄子', '草莓', '生菜', '西瓜', '葡萄', '通用']
const persons = ['张建国', '李秀英', '王志强', '赵红梅', '陈伟明', '周小燕', '吴海峰', '郑晓丽']

const KnowledgeBase = () => {
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view' | 'delete'>('view')
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('全部')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [formData, setFormData] = useState({
    title: '', category: '', crops: '', author: '', content: '', tags: ''
  })

  const handleAdd = () => {
    setModalType('add')
    setFormData({ title: '', category: '', crops: '', author: '', content: '', tags: '' })
    setShowModal(true)
  }

  const handleEdit = (record: any) => {
    setSelectedRecord(record)
    setModalType('edit')
    setFormData({
      title: record.title,
      category: record.category,
      crops: record.crops,
      author: record.author,
      content: '',
      tags: ''
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

  const knowledgeStatuses = ['全部', '已发布', '草稿']

  // 按搜索关键字 + 状态筛选
  const filteredData = knowledgeData.filter(item => {
    const matchesStatus = statusFilter === '全部' || item.status === statusFilter
    const kw = searchKeyword.toLowerCase()
    const matchesSearch = !searchKeyword ||
      item.docNo.toLowerCase().includes(kw) ||
      item.title.toLowerCase().includes(kw) ||
      item.category.toLowerCase().includes(kw) ||
      item.crops.toLowerCase().includes(kw) ||
      item.author.toLowerCase().includes(kw)
    return matchesStatus && matchesSearch
  })

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize))
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '已发布': return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> }
      case '草稿': return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Clock className="w-3 h-3" /> }
      default: return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Clock className="w-3 h-3" /> }
    }
  }

  const getCategoryBadge = (category: string) => {
    if (category === '病害防治') return { bg: 'bg-red-100', text: 'text-red-700' }
    if (category === '虫害防治') return { bg: 'bg-green-100', text: 'text-green-700' }
    return { bg: 'bg-blue-100', text: 'text-blue-700' }
  }

  return (
    <div className="pt-0 px-6 pb-6">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">知识库</h1>
              <p className="text-gray-500 mt-1">农业病虫害知识百科大全</p>
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
              <Plus className="w-4 h-4" /> 新增知识
            </button>
          </div>
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">状态：</span>
            <div className="flex gap-2 flex-wrap">
              {knowledgeStatuses.map(status => (
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
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索编号、标题、分类、作物或作者..."
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">文档编号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">标题</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">分类</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">适用作物</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">作者</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">发布日期</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">浏览量</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedData.map((record) => {
              const statusBadge = getStatusBadge(record.status)
              const categoryBadge = getCategoryBadge(record.category)
              return (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{record.docNo}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-gray-800 hover:text-[#2B5D3A] cursor-pointer">{record.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${categoryBadge.bg} ${categoryBadge.text}`}>
                      {record.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.crops}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.author}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.publishDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.views}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                      {statusBadge.icon}
                      {record.status}
                    </span>
                  </td>
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
                {modalType === 'add' ? '新增知识' : modalType === 'edit' ? '编辑知识' : modalType === 'view' ? '知识详情' : '删除确认'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {modalType === 'view' && selectedRecord ? (
                <div className="space-y-6">
                  {/* 标题区域 */}
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-xl font-bold mb-2">{selectedRecord.title}</h2>
                        <div className="flex items-center gap-4 text-blue-100 text-sm">
                          <span>{selectedRecord.category}</span>
                          <span>|</span>
                          <span>适用作物：{selectedRecord.crops}</span>
                          <span>|</span>
                          <span>作者：{selectedRecord.author}</span>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                        {selectedRecord.status}
                      </span>
                    </div>
                  </div>

                  {/* 附件预览 */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-3">相关附件</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="border border-gray-200 rounded-lg p-4 text-center hover:border-[#2B5D3A] cursor-pointer transition-colors">
                        <FileText className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">防治方案.pdf</p>
                      </div>
                      <div className="border border-gray-200 rounded-lg p-4 text-center hover:border-[#2B5D3A] cursor-pointer transition-colors">
                        <Image className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">病害图片.jpg</p>
                      </div>
                      <div className="border border-gray-200 rounded-lg p-4 text-center hover:border-[#2B5D3A] cursor-pointer transition-colors">
                        <Video className="w-8 h-8 text-red-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">防治视频.mp4</p>
                      </div>
                    </div>
                  </div>

                  {/* 知识内容 */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-3">知识内容</h4>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed">
                      <p className="mb-3"><strong>一、病原特征</strong></p>
                      <p className="mb-3">该病害主要由真菌引起，在高温高湿环境下易发生。病原菌可随种子、土壤及病残体越冬，通过气流、雨水及农事操作传播。</p>
                      <p className="mb-3"><strong>二、发病症状</strong></p>
                      <p className="mb-3">发病初期叶片出现淡黄色小点，后逐渐扩大形成褐色病斑，病斑上有同心轮纹。严重时叶片枯黄脱落，影响作物产量和品质。</p>
                      <p className="mb-3"><strong>三、防治方法</strong></p>
                      <p>1. 农业防治：选用抗病品种，合理轮作，加强田间管理<br/>
                      2. 物理防治：及时清除病残体，保持田园清洁<br/>
                      3. 化学防治：在发病初期使用针对性药剂进行喷雾防治</p>
                    </div>
                  </div>
                </div>
              ) : modalType === 'delete' ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-8 h-8 text-red-600" />
                  </div>
                  <p className="text-gray-600 mb-2">确定要删除这条知识吗？</p>
                  <p className="text-gray-400 text-sm">文档编号：{selectedRecord?.docNo}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">知识标题</label>
                    <input
                      type="text"
                      placeholder="请输入知识标题"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">知识分类</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="">请选择分类</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">适用作物</label>
                      <select
                        value={formData.crops}
                        onChange={(e) => setFormData({...formData, crops: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="">请选择作物</option>
                        {crops.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">作者</label>
                    <select
                      value={formData.author}
                      onChange={(e) => setFormData({...formData, author: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                    >
                      <option value="">请选择作者</option>
                      {persons.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">知识内容</label>
                    <textarea
                      rows={6}
                      placeholder="请输入知识详细内容..."
                      value={formData.content}
                      onChange={(e) => setFormData({...formData, content: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A] resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">标签（多个用逗号分隔）</label>
                    <input
                      type="text"
                      placeholder="如：番茄,病害,防治"
                      value={formData.tags}
                      onChange={(e) => setFormData({...formData, tags: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">上传附件</label>
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-[#2B5D3A] transition-colors cursor-pointer">
                      <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">点击上传或拖拽文件到此处</p>
                      <p className="text-xs text-gray-400 mt-1">支持 PDF、Word、图片、视频格式</p>
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

export default KnowledgeBase
