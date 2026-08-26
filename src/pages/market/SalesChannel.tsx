import { useState, useEffect } from 'react'
import { Search, Plus, Download, Eye, Edit, Trash2, Globe, Store, ShoppingBag, Monitor, Building, PieChart, RefreshCw, AlertCircle } from 'lucide-react'
import { getChannels, Channel } from '@/services/marketApiService'

const SalesChannel = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('view')
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [typeFilter, setTypeFilter] = useState('全部')
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // 销售渠道数据 - 从 API 加载
  useEffect(() => {
    let cancelled = false
    const loadChannels = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getChannels()
        if (!cancelled) {
          setChannels(data)
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : '加载销售渠道数据失败'
          setError(message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    loadChannels()
    return () => {
      cancelled = true
    }
  }, [])

  const channelTypes = ['全部', '超市', '电商', '批发商', '个体', '食堂']
  const regions = ['全部', '华北', '华东', '华南', '华中', '全国']

  const getTypeIcon = (type: string) => {
    switch (type) {
      case '超市': return <Building className="w-4 h-4" />
      case '批发商': return <ShoppingBag className="w-4 h-4" />
      case '电商': return <Globe className="w-4 h-4" />
      case '个体': return <Store className="w-4 h-4" />
      case '食堂': return <PieChart className="w-4 h-4" />
      default: return <Monitor className="w-4 h-4" />
    }
  }

  const filteredChannels = channels.filter(channel => {
    const matchesType = typeFilter === '全部' || channel.type === typeFilter
    const matchesSearch = !searchKeyword ||
      channel.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      channel.code.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchesType && matchesSearch
  })

  const totalPages = Math.max(1, Math.ceil(filteredChannels.length / pageSize))
  const paginatedChannels = filteredChannels.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // 渠道销售占比统计
  const channelStats = [
    { type: '超市', amount: 1260000, percentage: 32.5, color: 'bg-emerald-500' },
    { type: '电商', amount: 1750000, percentage: 45.2, color: 'bg-blue-500' },
    { type: '批发商', amount: 180000, percentage: 4.6, color: 'bg-yellow-500' },
    { type: '个体', amount: 68000, percentage: 1.8, color: 'bg-purple-500' },
    { type: '食堂', amount: 95000, percentage: 2.5, color: 'bg-orange-500' },
  ]

  const handleView = (item: Channel) => {
    setSelectedChannel(item)
    setModalType('view')
    setShowModal(true)
  }

  const handleEdit = (item: Channel) => {
    setSelectedChannel(item)
    setModalType('edit')
    setShowModal(true)
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">销售渠道</h1>
          <p className="text-gray-500 mt-1">管理各类销售渠道与合作伙伴</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> 导出
          </button>
          <button
            onClick={() => { setModalType('add'); setShowModal(true); }}
            className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 新增渠道
          </button>
        </div>
      </div>

      {/* 渠道销售占比 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-[#2B5D3A]" />
          渠道销售占比分析
        </h2>
        <div className="grid grid-cols-5 gap-4">
          {channelStats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="relative inline-flex items-center justify-center w-20 h-20 mb-2">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r="35" stroke="#f3f4f6" strokeWidth="6" fill="none" />
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    stroke={stat.color.replace('bg-', '')}
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${stat.percentage * 2.2} 220`}
                    className={stat.color}
                  />
                </svg>
                <span className="absolute text-sm font-bold text-gray-800">{stat.percentage}%</span>
              </div>
              <p className="text-sm font-medium text-gray-800">{stat.type}</p>
              <p className="text-xs text-gray-500">¥{(stat.amount / 10000).toFixed(0)}万</p>
            </div>
          ))}
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">渠道类型：</span>
            <div className="flex gap-2">
              {channelTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
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
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索渠道名称或编号..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
            />
          </div>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading && (
          <div className="text-center py-12">
            <RefreshCw className="w-12 h-12 text-gray-300 mx-auto mb-4 animate-spin" />
            <p className="text-gray-500">加载中...</p>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
            <p className="text-red-600">加载失败：{error}</p>
            <p className="text-gray-400 text-sm mt-2">请检查网络或后端服务后重试</p>
          </div>
        )}

        {!loading && !error && (
          <>
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">渠道编号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">渠道名称</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">类型</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">区域</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">联系人</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">联系电话</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">主营产品</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">月销售额</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">订单数</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedChannels.map((channel) => (
              <tr key={channel.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-600 font-mono">{channel.code}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-[#2B5D3A]" />
                    <span className="text-sm font-medium text-gray-800">{channel.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    {getTypeIcon(channel.type)}
                    {channel.type}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{channel.region}</td>
                <td className="px-4 py-3 text-sm text-gray-800">{channel.contact}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{channel.phone}</td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">{channel.products}</td>
                <td className="px-4 py-3 text-sm font-bold text-[#2B5D3A]">¥{(channel.monthlySales / 10000).toFixed(0)}万</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{channel.orderCount}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    channel.status === '合作中' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {channel.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleView(channel)} className="p-1.5 text-gray-400 hover:text-[#2B5D3A] hover:bg-[#2B5D3A]/10 rounded transition-colors" title="查看">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleEdit(channel)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="编辑">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="删除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
          </>
        )}

        {paginatedChannels.length === 0 && !loading && !error && (
          <div className="text-center py-12">
            <Store className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无数据</p>
          </div>
        )}
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-500">共 {filteredChannels.length} 条记录</p>
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

      {/* 弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-gray-800">
                {modalType === 'add' ? '新增渠道' : modalType === 'edit' ? '编辑渠道' : '渠道详情'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {modalType === 'view' && selectedChannel ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-2xl font-bold">{selectedChannel.name}</h4>
                        <p className="text-emerald-100 mt-1">渠道编号：{selectedChannel.code}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 text-sm font-medium rounded-full bg-white/20">
                          {selectedChannel.type}
                        </span>
                        <span className="px-3 py-1 text-sm font-medium rounded-full bg-white/20">
                          {selectedChannel.region}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">联系人</p>
                      <p className="text-lg font-bold text-gray-800">{selectedChannel.contact}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">联系电话</p>
                      <p className="text-lg font-bold text-gray-800">{selectedChannel.phone}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 col-span-2">
                      <p className="text-sm text-gray-500 mb-1">主营产品</p>
                      <p className="text-lg font-bold text-gray-800">{selectedChannel.products}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">月销售额</p>
                      <p className="text-lg font-bold text-[#2B5D3A]">¥{selectedChannel.monthlySales.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">订单总数</p>
                      <p className="text-lg font-bold text-gray-800">{selectedChannel.orderCount} 笔</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t border-gray-200">
                    <span>合作状态：{selectedChannel.status}</span>
                    <span>入驻时间：{selectedChannel.joinDate}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">渠道编号 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        defaultValue={selectedChannel?.code || 'CH011'}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">渠道名称 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        defaultValue={selectedChannel?.name || ''}
                        placeholder="请输入渠道名称"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">渠道类型 <span className="text-red-500">*</span></label>
                      <select
                        defaultValue={selectedChannel?.type || '超市'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="超市">超市</option>
                        <option value="电商">电商</option>
                        <option value="批发商">批发商</option>
                        <option value="个体">个体</option>
                        <option value="食堂">食堂</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">所在区域 <span className="text-red-500">*</span></label>
                      <select
                        defaultValue={selectedChannel?.region || '华北'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="华北">华北</option>
                        <option value="华东">华东</option>
                        <option value="华南">华南</option>
                        <option value="华中">华中</option>
                        <option value="全国">全国</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">联系人 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        defaultValue={selectedChannel?.contact || ''}
                        placeholder="请输入联系人"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">联系电话 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        defaultValue={selectedChannel?.phone || ''}
                        placeholder="请输入联系电话"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">主营产品</label>
                    <input
                      type="text"
                      defaultValue={selectedChannel?.products || ''}
                      placeholder="请输入主营产品"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">合作状态</label>
                    <select
                      defaultValue={selectedChannel?.status || '合作中'}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                    >
                      <option value="合作中">合作中</option>
                      <option value="暂停">暂停</option>
                      <option value="终止">终止</option>
                    </select>
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

export default SalesChannel
