import { useState } from 'react'
import { Search, Plus, Download, Edit, Trash2, Eye, MessageCircle, Send, Phone, User, Clock, Image } from 'lucide-react'

// 在线咨询数据
const consultData = [
  { id: '1', consultNo: 'OC2024032601', user: '张三', crop: '番茄', problem: '叶片出现黄斑', status: '待回复', expert: '张建国', createTime: '2024-03-26 10:30', lastReply: '2024-03-26 10:35', replyCount: 2 },
  { id: '2', consultNo: 'OC2024032602', user: '李四', crop: '黄瓜', problem: '生长缓慢', status: '已回复', expert: '李秀英', createTime: '2024-03-26 09:45', lastReply: '2024-03-26 09:50', replyCount: 3 },
  { id: '3', consultNo: 'OC2024032603', user: '王五', crop: '辣椒', problem: '果实畸形', status: '咨询中', expert: '王志强', createTime: '2024-03-26 09:20', lastReply: '2024-03-26 09:25', replyCount: 5 },
  { id: '4', consultNo: 'OC2024032604', user: '赵六', crop: '茄子', problem: '根部腐烂', status: '已回复', expert: '赵红梅', createTime: '2024-03-25 16:30', lastReply: '2024-03-25 16:40', replyCount: 4 },
  { id: '5', consultNo: 'OC2024032505', user: '孙七', crop: '草莓', problem: '叶片卷曲', status: '待回复', expert: '陈伟明', createTime: '2024-03-25 15:20', lastReply: '', replyCount: 1 },
  { id: '6', consultNo: 'OC2024032506', user: '周八', crop: '生菜', problem: '叶片发白', status: '已回复', expert: '周小燕', createTime: '2024-03-25 14:10', lastReply: '2024-03-25 14:15', replyCount: 2 },
  { id: '7', consultNo: 'OC2024032507', user: '吴九', crop: '西瓜', problem: '藤蔓枯萎', status: '咨询中', expert: '吴海峰', createTime: '2024-03-25 11:45', lastReply: '2024-03-25 11:50', replyCount: 6 },
  { id: '8', consultNo: 'OC2024032508', user: '郑十', crop: '葡萄', problem: '果粒腐烂', status: '已回复', expert: '郑晓丽', createTime: '2024-03-25 10:30', lastReply: '2024-03-25 10:35', replyCount: 3 },
  { id: '9', consultNo: 'OC2024032509', user: '钱一', crop: '番茄', problem: '果实上有斑点', status: '待回复', expert: '张建国', createTime: '2024-03-25 09:15', lastReply: '', replyCount: 1 },
  { id: '10', consultNo: 'OC2024032510', user: '孙二', crop: '黄瓜', problem: '叶片有虫眼', status: '已回复', expert: '李秀英', createTime: '2024-03-25 08:00', lastReply: '2024-03-25 08:10', replyCount: 2 },
]

const crops = ['番茄', '黄瓜', '辣椒', '茄子', '草莓', '生菜', '西瓜', '葡萄']
const experts = ['张建国', '李秀英', '王志强', '赵红梅', '陈伟明', '周小燕', '吴海峰', '郑晓丽']
const consultStatuses = ['待回复', '咨询中', '已回复']

const OnlineConsult = () => {
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view' | 'delete'>('view')
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [formData, setFormData] = useState({
    user: '', crop: '', problem: '', status: '', expert: ''
  })
  const [messages, setMessages] = useState<any[]>([])

  const handleAdd = () => {
    setModalType('add')
    setFormData({ user: '', crop: '', problem: '', status: '', expert: '' })
    setShowModal(true)
  }

  const handleEdit = (record: any) => {
    setSelectedRecord(record)
    setModalType('edit')
    setFormData({
      user: record.user,
      crop: record.crop,
      problem: record.problem,
      status: record.status,
      expert: record.expert
    })
    setShowModal(true)
  }

  const handleView = (record: any) => {
    setSelectedRecord(record)
    setModalType('view')
    // 模拟对话数据
    setMessages([
      { id: 1, sender: 'user', content: `我家${record.crop}${record.problem}，请问是什么原因？`, time: '10:30' },
      { id: 2, sender: 'expert', content: '您好，根据您描述的症状，可能是由于高温高湿引起的。建议您加强通风透光，控制浇水量。', time: '10:32' },
      { id: 3, sender: 'user', content: '好的，谢谢！那需要用什么药剂吗？', time: '10:35' },
      { id: 4, sender: 'expert', content: '可以喷施多菌灵进行防治，每隔7天喷一次，连续2-3次。注意轮换用药，避免产生抗药性。', time: '10:37' },
    ])
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '待回复': return 'bg-yellow-100 text-yellow-700'
      case '咨询中': return 'bg-blue-100 text-blue-700'
      case '已回复': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">在线咨询</h1>
          <p className="text-gray-500 mt-1">专家一对一在线诊断服务</p>
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
            <Plus className="w-4 h-4" /> 新增咨询
          </button>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">咨询编号</label>
            <input
              type="text"
              placeholder="请输入编号"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">作物名称</label>
            <select className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]">
              <option value="">全部</option>
              {crops.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">咨询状态</label>
            <select className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]">
              <option value="">全部</option>
              {consultStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">咨询专家</label>
            <select className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]">
              <option value="">全部</option>
              {experts.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">咨询日期</label>
            <input
              type="date"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 mt-4">
          <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm transition-colors">
            重置
          </button>
          <button className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm hover:bg-[#245038] transition-colors flex items-center gap-2">
            <Search className="w-4 h-4" /> 搜索
          </button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-slate-200">
                <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">咨询编号</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">咨询用户</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">作物</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">问题描述</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">咨询专家</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">咨询状态</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">创建时间</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">回复次数</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {consultData.map((record) => (
                <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-sm text-gray-800 font-medium">{record.consultNo}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-800">{record.user}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-800">{record.crop}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">{record.problem}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{record.expert}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusBadge(record.status)}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">{record.createTime}</td>
                  <td className="py-3 px-4 text-sm text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {record.replyCount}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleView(record)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="查看">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(record)} className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors" title="编辑">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(record)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="删除">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
            {/* 弹窗头部 */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-gray-800">
                {modalType === 'add' ? '新增咨询' : modalType === 'edit' ? '编辑咨询' : modalType === 'view' ? '咨询详情' : '删除确认'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {modalType === 'view' && selectedRecord ? (
                <div className="flex h-[500px]">
                  {/* 左侧咨询信息 */}
                  <div className="w-72 border-r border-slate-200 pr-6">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 text-white mb-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">{selectedRecord.user}</p>
                          <p className="text-blue-100 text-sm">{selectedRecord.consultNo}</p>
                        </div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3">
                        <p className="text-sm text-blue-100 mb-1">咨询作物</p>
                        <p className="font-medium">{selectedRecord.crop}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">问题描述</label>
                        <p className="text-sm text-gray-800">{selectedRecord.problem}</p>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">咨询专家</label>
                        <p className="text-sm text-gray-800">{selectedRecord.expert}</p>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">咨询状态</label>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusBadge(selectedRecord.status)}`}>
                          {selectedRecord.status}
                        </span>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">创建时间</label>
                        <p className="text-sm text-gray-800">{selectedRecord.createTime}</p>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">最后回复</label>
                        <p className="text-sm text-gray-800">{selectedRecord.lastReply || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* 右侧对话区域 */}
                  <div className="flex-1 pl-6 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-800">对话记录</h4>
                      <span className="text-xs text-gray-500">共 {messages.length} 条消息</span>
                    </div>

                    {/* 消息列表 */}
                    <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                      {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs lg:max-w-md ${msg.sender === 'user' ? 'order-2' : 'order-1'}`}>
                            <div className={`rounded-2xl px-4 py-2 ${
                              msg.sender === 'user'
                                ? 'bg-[#2B5D3A] text-white rounded-br-none'
                                : 'bg-gray-100 text-gray-800 rounded-bl-none'
                            }`}>
                              <p className="text-sm">{msg.content}</p>
                            </div>
                            <p className={`text-xs text-gray-400 mt-1 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                              {msg.time}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 输入框 */}
                    <div className="border-t border-slate-200 pt-4">
                      <div className="flex items-center gap-3">
                        <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                          <Image className="w-5 h-5" />
                        </button>
                        <input
                          type="text"
                          placeholder="输入回复内容..."
                          className="flex-1 px-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                        />
                        <button className="p-2 bg-[#2B5D3A] text-white rounded-full hover:bg-[#245038] transition-colors">
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : modalType === 'delete' ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-8 h-8 text-red-600" />
                  </div>
                  <p className="text-gray-600 mb-2">确定要删除这条咨询记录吗？</p>
                  <p className="text-gray-400 text-sm">咨询编号：{selectedRecord?.consultNo}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">咨询用户</label>
                      <input
                        type="text"
                        placeholder="请输入用户姓名"
                        value={formData.user}
                        onChange={(e) => setFormData({...formData, user: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">问题描述</label>
                    <textarea
                      rows={3}
                      placeholder="请详细描述遇到的问题..."
                      value={formData.problem}
                      onChange={(e) => setFormData({...formData, problem: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A] resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">咨询专家</label>
                      <select
                        value={formData.expert}
                        onChange={(e) => setFormData({...formData, expert: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="">请选择专家</option>
                        {experts.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">咨询状态</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="">请选择状态</option>
                        {consultStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">上传图片</label>
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-[#2B5D3A] transition-colors cursor-pointer">
                      <Image className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">点击上传问题图片</p>
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

export default OnlineConsult
