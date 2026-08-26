import { useState, useEffect } from 'react'
import { Search, Plus, Download, Eye, Edit, Trash2, DollarSign, TrendingUp, Calendar, Building, CheckCircle, Clock } from 'lucide-react'

const IncomeManagement = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('view')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState('全部')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // 收入管理数据
  const incomeData = [
    { id: '1', orderNo: 'IN20260301001', crop: '番茄', buyer: '永辉超市', quantity: 5000, unitPrice: 3.5, totalAmount: 17500, paymentStatus: '已收款', salesDate: '2026-03-01', salesperson: '赵销售', channel: '超市渠道', remark: 'A级品质' },
    { id: '2', orderNo: 'IN20260302002', crop: '草莓', buyer: '盒马鲜生', quantity: 2000, unitPrice: 25, totalAmount: 50000, paymentStatus: '已收款', salesDate: '2026-03-02', salesperson: '钱销售', channel: '电商渠道', remark: '特级品质' },
    { id: '3', orderNo: 'IN20260303003', crop: '葡萄', buyer: '百果园', quantity: 3000, unitPrice: 15, totalAmount: 45000, paymentStatus: '待收款', salesDate: '2026-03-03', salesperson: '孙销售', channel: '专卖店', remark: '阳光玫瑰' },
    { id: '4', orderNo: 'IN20260304004', crop: '黄瓜', buyer: '美菜网', quantity: 4000, unitPrice: 2, totalAmount: 8000, paymentStatus: '已收款', salesDate: '2026-03-04', salesperson: '赵销售', channel: '电商渠道', remark: '' },
    { id: '5', orderNo: 'IN20260305005', crop: '茄子', buyer: '大润发', quantity: 3500, unitPrice: 3, totalAmount: 10500, paymentStatus: '已收款', salesDate: '2026-03-05', salesperson: '钱销售', channel: '超市渠道', remark: '' },
    { id: '6', orderNo: 'IN20260306006', crop: '辣椒', buyer: '海底捞', quantity: 2500, unitPrice: 8, totalAmount: 20000, paymentStatus: '待收款', salesDate: '2026-03-06', salesperson: '孙销售', channel: '餐饮渠道', remark: '朝天椒' },
    { id: '7', orderNo: 'IN20260307007', crop: '西瓜', buyer: '沃尔玛', quantity: 6000, unitPrice: 4, totalAmount: 24000, paymentStatus: '已收款', salesDate: '2026-03-07', salesperson: '赵销售', channel: '超市渠道', remark: '麒麟瓜' },
    { id: '8', orderNo: 'IN20260308008', crop: '叶菜类', buyer: '叮咚买菜', quantity: 1500, unitPrice: 5, totalAmount: 7500, paymentStatus: '已收款', salesDate: '2026-03-08', salesperson: '钱销售', channel: '电商渠道', remark: '青菜+菠菜' },
    { id: '9', orderNo: 'IN20260309009', crop: '苹果', buyer: '水果地带', quantity: 4500, unitPrice: 6, totalAmount: 27000, paymentStatus: '已收款', salesDate: '2026-03-09', salesperson: '孙销售', channel: '专卖店', remark: '红富士' },
    { id: '10', orderNo: 'IN20260310010', crop: '梨', buyer: '华润万家', quantity: 3800, unitPrice: 5.5, totalAmount: 20900, paymentStatus: '待收款', salesDate: '2026-03-10', salesperson: '赵销售', channel: '超市渠道', remark: '皇冠梨' },
    { id: '11', orderNo: 'IN20260311011', crop: '番茄', buyer: '家乐福', quantity: 4200, unitPrice: 3.5, totalAmount: 14700, paymentStatus: '已收款', salesDate: '2026-03-11', salesperson: '钱销售', channel: '超市渠道', remark: '' },
    { id: '12', orderNo: 'IN20260312012', crop: '草莓', buyer: '山姆会员店', quantity: 1800, unitPrice: 28, totalAmount: 50400, paymentStatus: '已收款', salesDate: '2026-03-12', salesperson: '孙销售', channel: '会员店', remark: '香野草莓' }
  ]

  const statuses = ['全部', '已收款', '待收款']
  const channels = ['全部', '超市渠道', '电商渠道', '专卖店', '餐饮渠道', '会员店']

  const filteredData = incomeData.filter(item => {
    const matchesStatus = statusFilter === '全部' || item.paymentStatus === statusFilter
    const matchesSearch = !searchKeyword ||
      item.crop.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      item.buyer.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      item.orderNo.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchesStatus && matchesSearch
  })

  // 筛选条件变化时重置分页到第 1 页
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, searchKeyword])

  // 分页派生
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize))
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 0 }).format(value)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '已收款':
        return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> }
      case '待收款':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Clock className="w-3 h-3" /> }
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Clock className="w-3 h-3" /> }
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
  const totalIncome = filteredData.reduce((sum, item) => sum + item.totalAmount, 0)
  const collected = filteredData.filter(i => i.paymentStatus === '已收款').reduce((sum, i) => sum + i.totalAmount, 0)
  const pending = filteredData.filter(i => i.paymentStatus === '待收款').reduce((sum, i) => sum + i.totalAmount, 0)

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">收入管理</h1>
          <p className="text-gray-500 mt-1">管理销售收入和收款状态</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> 导出
          </button>
          <button
            onClick={() => { setModalType('add'); setShowModal(true); }}
            className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 新增销售记录
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
          <p className="text-green-100 text-sm">总销售收入</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <p className="text-blue-100 text-sm">已收款</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(collected)}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
          <p className="text-orange-100 text-sm">待收款</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(pending)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <p className="text-purple-100 text-sm">收款率</p>
          <p className="text-2xl font-bold mt-1">{totalIncome > 0 ? ((collected / totalIncome) * 100).toFixed(1) : 0}%</p>
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">状态：</span>
            <div className="flex gap-2">
              {statuses.map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
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
              placeholder="搜索作物、买家或单号..."
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">单号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">作物</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">买家</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">数量(kg)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">单价(元)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">金额(元)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">收款状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">销售渠道</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">销售日期</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedData.map((item) => {
              const statusBadge = getStatusBadge(item.paymentStatus)
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{item.orderNo}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#2B5D3A]" />
                      <span className="text-sm font-medium text-gray-800">{item.crop}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{item.buyer}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">{item.quantity.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-green-600">{item.unitPrice}</td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-gray-800">{formatCurrency(item.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                      {statusBadge.icon}
                      {item.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.channel}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.salesDate}</td>
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
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无收入记录</p>
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
                {modalType === 'add' ? '新增销售记录' : modalType === 'edit' ? '编辑销售记录' : '销售详情'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {modalType === 'view' && selectedItem ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-2xl font-bold">{selectedItem.crop}</h4>
                        <p className="text-green-100 mt-1">订单号：{selectedItem.orderNo}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-200 text-sm">销售金额</p>
                        <p className="text-3xl font-bold">{formatCurrency(selectedItem.totalAmount)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">买家</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.buyer}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">销售渠道</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.channel}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">销售数量</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.quantity.toLocaleString()} kg</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">单价</p>
                      <p className="text-lg font-bold text-green-600">{selectedItem.unitPrice} 元/kg</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">销售日期</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.salesDate}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">收款状态</p>
                      <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(selectedItem.paymentStatus).bg} ${getStatusBadge(selectedItem.paymentStatus).text}`}>
                        {selectedItem.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {selectedItem.remark && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-2">备注说明</p>
                      <p className="text-gray-700">{selectedItem.remark}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t border-gray-200">
                    <span>业务员：{selectedItem.salesperson}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">订单号</label>
                      <input
                        type="text"
                        defaultValue={selectedItem?.orderNo || 'IN' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '001'}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">作物名称 <span className="text-red-500">*</span></label>
                      <select
                        defaultValue={selectedItem?.crop || ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="">请选择作物</option>
                        <option value="番茄">番茄</option>
                        <option value="草莓">草莓</option>
                        <option value="葡萄">葡萄</option>
                        <option value="黄瓜">黄瓜</option>
                        <option value="茄子">茄子</option>
                        <option value="辣椒">辣椒</option>
                        <option value="西瓜">西瓜</option>
                        <option value="叶菜类">叶菜类</option>
                        <option value="苹果">苹果</option>
                        <option value="梨">梨</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">买家 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        defaultValue={selectedItem?.buyer || ''}
                        placeholder="请输入买家名称"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">销售渠道</label>
                      <select
                        defaultValue={selectedItem?.channel || ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="">请选择渠道</option>
                        <option value="超市渠道">超市渠道</option>
                        <option value="电商渠道">电商渠道</option>
                        <option value="专卖店">专卖店</option>
                        <option value="餐饮渠道">餐饮渠道</option>
                        <option value="会员店">会员店</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">数量(kg) <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.quantity || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">单价(元/kg) <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        step="0.1"
                        defaultValue={selectedItem?.unitPrice || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">收款状态</label>
                      <select
                        defaultValue={selectedItem?.paymentStatus || '待收款'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="待收款">待收款</option>
                        <option value="已收款">已收款</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">销售日期</label>
                      <input
                        type="date"
                        defaultValue={selectedItem?.salesDate || ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">业务员</label>
                      <input
                        type="text"
                        defaultValue={selectedItem?.salesperson || ''}
                        placeholder="请输入业务员"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">备注说明</label>
                    <textarea
                      defaultValue={selectedItem?.remark || ''}
                      placeholder="请输入备注..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A] resize-none"
                    ></textarea>
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

export default IncomeManagement
