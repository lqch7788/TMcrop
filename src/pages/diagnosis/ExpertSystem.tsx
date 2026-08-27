import { useState } from 'react'
import { Search, Plus, Download, Calendar, Eye, Edit, Trash2, Stethoscope, User, CheckCircle, Clock, Users } from 'lucide-react'

const ExpertSystem = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('view')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [typeFilter, setTypeFilter] = useState('全部')
  const [statusFilter, setStatusFilter] = useState('全部')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const experts = [
    { id: '1', caseNo: 'ES202403001', title: '番茄叶片发黄诊断', crop: '番茄', disease: '早疫病', expertName: '张建国', expertLevel: '高级农艺师', caseType: '病害诊断', patientDesc: '叶片出现黄褐色斑点，逐渐扩大', aiResult: '疑似早疫病', expertResult: '确认早疫病，建议使用代森锰锌', status: '已完成', submitTime: '2024-03-20 09:00', completeTime: '2024-03-20 09:30' },
    { id: '2', caseNo: 'ES202403002', title: '黄瓜白粉病治疗方案', crop: '黄瓜', disease: '白粉病', expertName: '李秀英', expertLevel: '植保专家', caseType: '治疗方案', patientDesc: '叶片表面覆盖白色粉末状物质', aiResult: '白粉病', expertResult: '使用多菌灵溶液喷雾，每7天一次', status: '已完成', submitTime: '2024-03-20 10:00', completeTime: '2024-03-20 10:20' },
    { id: '3', caseNo: 'ES202403003', title: '辣椒病毒病咨询', crop: '辣椒', disease: '病毒病', expertName: '王志强', expertLevel: '高级农艺师', caseType: '病害诊断', patientDesc: '叶片出现花叶、皱缩症状', aiResult: '病毒病待确认', expertResult: '确认为黄瓜花叶病毒，建议拔除病株', status: '已完成', submitTime: '2024-03-20 11:00', completeTime: '2024-03-20 11:45' },
    { id: '4', caseNo: 'ES202403004', title: '茄子红蜘蛛防治', crop: '茄子', disease: '红蜘蛛', expertName: '赵红梅', expertLevel: '主治医师', caseType: '虫害防治', patientDesc: '叶片背面有红色小虫，叶片变红', aiResult: '红蜘蛛', expertResult: '使用阿维菌素喷雾，注意喷施叶背', status: '处理中', submitTime: '2024-03-20 14:00', completeTime: '-' },
    { id: '5', caseNo: 'ES202403005', title: '草莓灰霉病诊断', crop: '草莓', disease: '灰霉病', expertName: '陈伟明', expertLevel: '植保专家', caseType: '病害诊断', patientDesc: '果实表面出现灰色霉层，腐烂', aiResult: '灰霉病', expertResult: '使用嘧霉胺喷雾，加强通风', status: '已完成', submitTime: '2024-03-20 14:30', completeTime: '2024-03-20 15:00' },
    { id: '6', caseNo: 'ES202403006', title: '生菜潜叶蝇防治', crop: '生菜', disease: '潜叶蝇', expertName: '周小燕', expertLevel: '高级农艺师', caseType: '虫害防治', patientDesc: '叶片出现隧道状斑纹', aiResult: '潜叶蝇', expertResult: '使用黄板诱杀成虫，喷施灭蝇胺', status: '已完成', submitTime: '2024-03-20 15:00', completeTime: '2024-03-20 15:30' },
    { id: '7', caseNo: 'ES202403007', title: '西瓜枯萎病诊断', crop: '西瓜', disease: '枯萎病', expertName: '吴海峰', expertLevel: '植保专家', caseType: '病害诊断', patientDesc: '植株萎蔫，茎部维管束褐变', aiResult: '枯萎病', expertResult: '枯萎病无法治愈，建议轮作', status: '已完成', submitTime: '2024-03-20 15:30', completeTime: '2024-03-20 16:00' },
    { id: '8', caseNo: 'ES202403008', title: '葡萄霜霉病咨询', crop: '葡萄', disease: '霜霉病', expertName: '郑晓丽', expertLevel: '高级农艺师', caseType: '病害诊断', patientDesc: '叶片正面出现黄色病斑，背面有白色霉层', aiResult: '霜霉病', expertResult: '使用烯酰吗啉喷雾，每10天一次', status: '已完成', submitTime: '2024-03-20 16:00', completeTime: '2024-03-20 16:30' },
    { id: '9', caseNo: 'ES202403009', title: '黄瓜瓜绢螟防治', crop: '黄瓜', disease: '瓜绢螟', expertName: '张建国', expertLevel: '高级农艺师', caseType: '虫害防治', patientDesc: '叶片被咬成缺刻，有绿色虫粪', aiResult: '瓜绢螟', expertResult: '在幼虫期使用氯虫苯甲酰胺', status: '处理中', submitTime: '2024-03-20 16:30', completeTime: '-' },
    { id: '10', caseNo: 'ES202403010', title: '番茄Ty病毒咨询', crop: '番茄', disease: '病毒病', expertName: '李秀英', expertLevel: '植保专家', caseType: '病害诊断', patientDesc: '植株生长缓慢，叶片卷曲发黄', aiResult: '疑似Ty病毒', expertResult: '确认为番茄黄化曲叶病毒，需隔离', status: '已完成', submitTime: '2024-03-20 17:00', completeTime: '2024-03-20 17:30' },
  ]

  const types = ['全部', '病害诊断', '治疗方案', '虫害防治']
  const statuses = ['全部', '处理中', '已完成']
  const expertLevels = ['高级农艺师', '植保专家', '主治医师']

  const filteredData = experts.filter(e => {
    const matchesType = typeFilter === '全部' || e.caseType === typeFilter
    const matchesStatus = statusFilter === '全部' || e.status === statusFilter
    const matchesSearch = !searchKeyword ||
      e.caseNo.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      e.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      e.crop.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      e.expertName.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchesType && matchesStatus && matchesSearch
  })

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize))
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '已完成': return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> }
      case '处理中': return { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Clock className="w-3 h-3" /> }
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
    <div className="pt-0 px-6 pb-6">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">专家系统</h1>
              <p className="text-gray-500 mt-1">农业专家在线诊断与咨询</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" /> 导出
            </button>
            <button
              onClick={() => { setModalType('add'); setSelectedItem(null); setShowModal(true); }}
              className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"
            >
            <Plus className="w-4 h-4" /> 新增咨询
          </button>
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">咨询类型：</span>
              <div className="flex gap-1">
                {types.map(type => (
                  <button
                    key={type}
                    onClick={() => { setTypeFilter(type); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      typeFilter === type
                        ? 'bg-[#2B5D3A] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type}
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
              placeholder="搜索案例编号、标题、作物或专家..."
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">案例编号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">案例标题</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">作物</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">病害名称</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">咨询类型</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">专家</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">AI诊断</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">专家结论</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedData.map((item) => {
              const statusBadge = getStatusBadge(item.status)
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{item.caseNo}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-gray-800">{item.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.crop}</td>
                  <td className="px-4 py-3 text-sm text-gray-800 font-medium">{item.disease}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.caseType}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.expertName}</p>
                        <p className="text-xs text-gray-500">{item.expertLevel}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.aiResult}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">{item.expertResult}</td>
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
            <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-4" />
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
                {modalType === 'add' ? '新增咨询案例' : modalType === 'edit' ? '编辑咨询案例' : '案例详情'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {modalType === 'view' && selectedItem ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-2xl font-bold">{selectedItem.title}</h4>
                        <p className="text-blue-100 mt-1">案例编号：{selectedItem.caseNo}</p>
                      </div>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                        selectedItem.status === '已完成' ? 'bg-white/20 text-white' : 'bg-white/20 text-white'
                      }`}>
                        {selectedItem.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">作物类型</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.crop}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">病害名称</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.disease}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">咨询类型</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.caseType}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">咨询专家</p>
                      <div>
                        <p className="text-lg font-bold text-gray-800">{selectedItem.expertName}</p>
                        <p className="text-sm text-gray-500">{selectedItem.expertLevel}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-blue-600 font-medium mb-2">农户描述</p>
                    <p className="text-gray-700">{selectedItem.patientDesc}</p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-2">AI诊断结果</p>
                    <p className="text-gray-700">{selectedItem.aiResult}</p>
                  </div>

                  <div className="bg-green-50 rounded-xl p-4">
                    <p className="text-sm text-green-600 font-medium mb-2">专家结论</p>
                    <p className="text-gray-700">{selectedItem.expertResult}</p>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t border-gray-200">
                    <span>提交时间：{selectedItem.submitTime}</span>
                    <span>完成时间：{selectedItem.completeTime}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">案例标题 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      defaultValue={selectedItem?.title || ''}
                      placeholder="请输入案例标题"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                    />
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">病害名称</label>
                      <select
                        defaultValue={selectedItem?.disease || ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="">请选择病害</option>
                        <option value="早疫病">早疫病</option>
                        <option value="白粉病">白粉病</option>
                        <option value="蚜虫">蚜虫</option>
                        <option value="红蜘蛛">红蜘蛛</option>
                        <option value="灰霉病">灰霉病</option>
                        <option value="潜叶蝇">潜叶蝇</option>
                        <option value="枯萎病">枯萎病</option>
                        <option value="霜霉病">霜霉病</option>
                        <option value="病毒病">病毒病</option>
                        <option value="瓜绢螟">瓜绢螟</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">咨询类型</label>
                      <select
                        defaultValue={selectedItem?.caseType || '病害诊断'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="病害诊断">病害诊断</option>
                        <option value="治疗方案">治疗方案</option>
                        <option value="虫害防治">虫害防治</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">咨询专家</label>
                      <select
                        defaultValue={selectedItem?.expertName || ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="">请选择专家</option>
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
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">农户描述</label>
                    <textarea
                      defaultValue={selectedItem?.patientDesc || ''}
                      placeholder="请输入农户描述的症状..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A] resize-none"
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">AI诊断结果</label>
                    <input
                      type="text"
                      defaultValue={selectedItem?.aiResult || ''}
                      placeholder="AI诊断结果"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">专家结论</label>
                    <textarea
                      defaultValue={selectedItem?.expertResult || ''}
                      placeholder="请输入专家结论..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A] resize-none"
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                    <select
                      defaultValue={selectedItem?.status || '处理中'}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                    >
                      <option value="处理中">处理中</option>
                      <option value="已完成">已完成</option>
                    </select>
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
    </div>
  )
}

export default ExpertSystem
