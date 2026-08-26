import { useState } from 'react'
import { Search, Plus, Download, Lightbulb, Eye, Edit, Trash2, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

const DecisionSupport = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('view')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [priorityFilter, setPriorityFilter] = useState('全部')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const priorities = ['全部', '高', '中', '低']

  const decisions = [
    { id: '1', decisionNo: 'DS20240301', title: '番茄灌溉策略优化建议', content: '根据未来一周天气预报，建议调整灌溉频率，在高温天气增加灌溉次数', crop: '番茄', base: '北京基地1号', priority: '高', status: '已采纳', benefit: '预计节水15%，产量提升5%', creator: '张伟', createDate: '2024-03-20' },
    { id: '2', decisionNo: 'DS20240302', title: '黄瓜施肥方案调整', content: '当前土壤检测显示氮含量偏低，建议追加氮肥用量10%', crop: '黄瓜', base: '山东寿光基地', priority: '中', status: '待审核', benefit: '预计产量提升8%', creator: '李娜', createDate: '2024-03-19' },
    { id: '3', decisionNo: 'DS20240303', title: '辣椒病虫害预防措施', content: '监测到周边区域出现蚜虫迹象，建议提前喷洒预防性农药', crop: '辣椒', base: '河南新乡基地', priority: '高', status: '已采纳', benefit: '预计减少损失20%', creator: '王强', createDate: '2024-03-18' },
    { id: '4', decisionNo: 'DS20240304', title: '生菜采收时机建议', content: '根据生长模型预测，未来3天为最佳采收期，建议立即安排采收', crop: '生菜', base: '江苏南京基地', priority: '高', status: '已采纳', benefit: '品质等级提升一级', creator: '赵敏', createDate: '2024-03-17' },
    { id: '5', decisionNo: 'DS20240305', title: '茄子温室温度调控', content: '夜间温度持续偏低，建议启用加热设备，保持室温不低于15℃', crop: '茄子', base: '云南昆明基地', priority: '中', status: '待审核', benefit: '避免冻害损失', creator: '张伟', createDate: '2024-03-16' },
    { id: '6', decisionNo: 'DS20240306', title: '草莓补光方案优化', content: '冬季光照不足，建议增加补光灯照射时长至每天14小时', crop: '草莓', base: '北京基地2号', priority: '中', status: '已采纳', benefit: '预计产量提升12%', creator: '李娜', createDate: '2024-03-15' },
    { id: '7', decisionNo: 'DS20240307', title: '西瓜蔓枯病预防', content: '检测到湿度过高信号，建议加强通风并喷洒防护剂', crop: '西瓜', base: '山东青岛基地', priority: '高', status: '已采纳', benefit: '预计减少损失25%', creator: '王强', createDate: '2024-03-14' },
    { id: '8', decisionNo: 'DS20240308', title: '葡萄架式改造建议', content: '当前架式影响通风，建议改造为高宽架模式', crop: '葡萄', base: '云南大理基地', priority: '低', status: '待审核', benefit: '长期提升品质', creator: '赵敏', createDate: '2024-03-13' },
    { id: '9', decisionNo: 'DS20240309', title: '番茄剪枝时机建议', content: '植株生长过旺，建议在本周内完成侧枝修剪', crop: '番茄', base: '北京基地1号', priority: '中', status: '已采纳', benefit: '通风改善，病害减少', creator: '张伟', createDate: '2024-03-12' },
    { id: '10', decisionNo: 'DS20240310', title: '黄瓜市场价格分析建议', content: '根据市场趋势预测，下月价格将上涨，建议适当延迟销售', crop: '黄瓜', base: '山东寿光基地', priority: '中', status: '已采纳', benefit: '预计增收10%', creator: '李娜', createDate: '2024-03-11' },
    { id: '11', decisionNo: 'DS20240311', title: '辣椒定植密度调整', content: '建议降低定植密度至每亩2800株，改善通风条件', crop: '辣椒', base: '河南新乡基地', priority: '低', status: '待审核', benefit: '减少病害发生', creator: '王强', createDate: '2024-03-10' },
    { id: '12', decisionNo: 'DS20240312', title: '生菜浇水时间优化', content: '建议将浇水时间从中午调整至清晨，减少蒸腾损失', crop: '生菜', base: '江苏南京基地', priority: '低', status: '已采纳', benefit: '预计节水10%', creator: '赵敏', createDate: '2024-03-09' },
  ]

  const filteredData = decisions.filter(d => {
    const matchesPriority = priorityFilter === '全部' || d.priority === priorityFilter
    const matchesSearch = !searchKeyword ||
      d.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      d.decisionNo.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchesPriority && matchesSearch
  })

  // 分页派生
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize))
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case '高': return { bg: 'bg-red-100', text: 'text-red-700' }
      case '中': return { bg: 'bg-yellow-100', text: 'text-yellow-700' }
      case '低': return { bg: 'bg-green-100', text: 'text-green-700' }
      default: return { bg: 'bg-gray-100', text: 'text-gray-600' }
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '已采纳': return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> }
      case '待审核': return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Clock className="w-3 h-3" /> }
      case '已拒绝': return { bg: 'bg-red-100', text: 'text-red-700', icon: <AlertTriangle className="w-3 h-3" /> }
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
          <h1 className="text-2xl font-bold text-gray-800">决策支持</h1>
          <p className="text-gray-500 mt-1">智能决策建议与推荐系统</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> 导出
          </button>
          <button
            onClick={() => { setModalType('add'); setShowModal(true); }}
            className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 新增决策
          </button>
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">优先级：</span>
            <div className="flex gap-2">
              {priorities.map(priority => (
                <button
                  key={priority}
                  onClick={() => { setPriorityFilter(priority); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    priorityFilter === priority
                      ? 'bg-[#2B5D3A] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {priority}
                </button>
              ))}
            </div>
          </div>
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索决策标题或编号..."
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">决策编号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">决策标题</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">作物</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">基地</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">优先级</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">预期效益</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedData.map((item) => {
              const priorityBadge = getPriorityBadge(item.priority)
              const statusBadge = getStatusBadge(item.status)
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{item.decisionNo}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium text-gray-800">{item.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.crop}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.base}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${priorityBadge.bg} ${priorityBadge.text}`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                      {statusBadge.icon}
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.benefit}</td>
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
            <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-4" />
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
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
            >
              <option value={10}>10 条</option>
              <option value={20}>20 条</option>
              <option value={50}>50 条</option>
              <option value={100}>100 条</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            上一页
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button key={page} onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded text-sm ${
                currentPage === page ? 'bg-[#2B5D3A] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>{page}</button>
          ))}
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
            className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            下一页
          </button>
        </div>
      </div>

      {/* 弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-gray-800">
                {modalType === 'add' ? '新增决策建议' : modalType === 'edit' ? '编辑决策建议' : '决策详情'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {modalType === 'view' && selectedItem ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-2xl font-bold">{selectedItem.title}</h4>
                        <p className="text-amber-100 mt-1">决策编号：{selectedItem.decisionNo}</p>
                      </div>
                      <span className="px-3 py-1 text-sm font-medium rounded-full bg-white/20 text-white">
                        {selectedItem.priority}优先级
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-2">决策内容</p>
                    <p className="text-gray-700">{selectedItem.content}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">基地</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.base}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">作物</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.crop}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">状态</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.status}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">预期效益</p>
                      <p className="text-lg font-bold text-green-600">{selectedItem.benefit}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t border-gray-200">
                    <span>创建人：{selectedItem.creator}</span>
                    <span>创建时间：{selectedItem.createDate}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">决策编号</label>
                      <input
                        type="text"
                        defaultValue={selectedItem?.decisionNo || 'DS20240313'}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
                      <select
                        defaultValue={selectedItem?.priority || '中'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="高">高</option>
                        <option value="中">中</option>
                        <option value="低">低</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">决策标题 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      defaultValue={selectedItem?.title || ''}
                      placeholder="请输入决策标题"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">决策内容 <span className="text-red-500">*</span></label>
                    <textarea
                      defaultValue={selectedItem?.content || ''}
                      placeholder="请输入决策内容..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A] resize-none"
                    ></textarea>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">基地</label>
                      <select
                        defaultValue={selectedItem?.base || '北京基地1号'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="北京基地1号">北京基地1号</option>
                        <option value="北京基地2号">北京基地2号</option>
                        <option value="山东寿光基地">山东寿光基地</option>
                        <option value="河南新乡基地">河南新乡基地</option>
                        <option value="江苏南京基地">江苏南京基地</option>
                        <option value="山东青岛基地">山东青岛基地</option>
                        <option value="云南昆明基地">云南昆明基地</option>
                        <option value="云南大理基地">云南大理基地</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">作物</label>
                      <select
                        defaultValue={selectedItem?.crop || '番茄'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="番茄">番茄</option>
                        <option value="黄瓜">黄瓜</option>
                        <option value="辣椒">辣椒</option>
                        <option value="生菜">生菜</option>
                        <option value="茄子">茄子</option>
                        <option value="草莓">草莓</option>
                        <option value="西瓜">西瓜</option>
                        <option value="葡萄">葡萄</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">预期效益</label>
                    <input
                      type="text"
                      defaultValue={selectedItem?.benefit || ''}
                      placeholder="请输入预期效益"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                    />
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

export default DecisionSupport
