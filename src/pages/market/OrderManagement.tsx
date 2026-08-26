import { useState } from 'react'
import { Search, Plus, Download, Eye, Edit, Trash2, Calendar, CheckCircle, Clock, XCircle, Truck } from 'lucide-react'

const OrderManagement = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('view')
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState('全部')

  // 订单数据 - 10条真实数据
  const orders = [
    { id: '1', orderNo: 'SO20260301', customer: '北京物美超市', contact: '张经理', phone: '138-0012-3456', product: '番茄500kg+黄瓜300kg', quantity: 800, unitPrice: 9, amount: 7200, status: '已完成', createDate: '2026-03-20', deliveryDate: '2026-03-21', remark: '番茄A级品，黄瓜新鲜' },
    { id: '2', orderNo: 'SO20260302', customer: '上海永辉超市', contact: '李总监', phone: '139-8876-5432', product: '辣椒400kg+茄子200kg', quantity: 600, unitPrice: 9, amount: 5400, status: '配送中', createDate: '2026-03-19', deliveryDate: '2026-03-22', remark: '辣椒微辣，茄子优品' },
    { id: '3', orderNo: 'SO20260303', customer: '广州江南市场', contact: '王老板', phone: '136-7654-3210', product: '生菜300kg+草莓100kg', quantity: 400, unitPrice: 14.5, amount: 5800, status: '已完成', createDate: '2026-03-18', deliveryDate: '2026-03-19', remark: '生菜有机认证' },
    { id: '4', orderNo: 'SO20260304', customer: '京东生鲜', contact: '刘采购', phone: '135-9988-7766', product: '樱桃番茄200kg+红椒150kg', quantity: 350, unitPrice: 15, amount: 5250, status: '已完成', createDate: '2026-03-17', deliveryDate: '2026-03-18', remark: '京东专供包装' },
    { id: '5', orderNo: 'SO20260305', customer: '盒马鲜生', contact: '陈主管', phone: '158-2233-4455', product: '西瓜500kg+葡萄300kg', quantity: 800, unitPrice: 12, amount: 9600, status: '待发货', createDate: '2026-03-16', deliveryDate: '2026-03-23', remark: '西瓜冰镇后口感更佳' },
    { id: '6', orderNo: 'SO20260306', customer: '深圳华润万家', contact: '赵经理', phone: '137-5544-3322', product: '白菜300kg+萝卜200kg', quantity: 500, unitPrice: 5, amount: 2500, status: '待审核', createDate: '2026-03-15', deliveryDate: '-', remark: '批量采购优惠' },
    { id: '7', orderNo: 'SO20260307', customer: '成都伊藤洋华堂', contact: '周部长', phone: '189-6677-8899', product: '菠菜250kg+芹菜200kg', quantity: 450, unitPrice: 8, amount: 3600, status: '已完成', createDate: '2026-03-14', deliveryDate: '2026-03-15', remark: '新鲜直供' },
    { id: '8', orderNo: 'SO20260308', customer: '杭州世纪联华', contact: '吴小姐', phone: '136-1122-3344', product: '番茄400kg+黄瓜400kg+辣椒200kg', quantity: 1000, unitPrice: 8.5, amount: 8500, status: '配送中', createDate: '2026-03-13', deliveryDate: '2026-03-21', remark: '周三固定配送' },
    { id: '9', orderNo: 'SO20260309', customer: '武汉中百仓储', contact: '冯经理', phone: '133-4455-6677', product: '生菜500kg+草莓200kg', quantity: 700, unitPrice: 13, amount: 9100, status: '已取消', createDate: '2026-03-12', deliveryDate: '-', remark: '客户取消订单' },
    { id: '10', orderNo: 'SO20260310', customer: '南京苏果超市', contact: '郑主管', phone: '150-7788-9900', product: '西瓜600kg+葡萄400kg', quantity: 1000, unitPrice: 11, amount: 11000, status: '待发货', createDate: '2026-03-11', deliveryDate: '2026-03-24', remark: '周末促销备货' },
  ]

  const statuses = ['全部', '待审核', '待发货', '配送中', '已完成', '已取消']

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === '全部' || order.status === statusFilter
    const matchesSearch = !searchKeyword ||
      order.orderNo.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      order.product.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '已完成': return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> }
      case '配送中': return { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Truck className="w-3 h-3" /> }
      case '待发货': return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Clock className="w-3 h-3" /> }
      case '待审核': return { bg: 'bg-purple-100', text: 'text-purple-700', icon: <Clock className="w-3 h-3" /> }
      case '已取消': return { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-3 h-3" /> }
      default: return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Clock className="w-3 h-3" /> }
    }
  }

  const handleView = (item: any) => {
    setSelectedOrder(item)
    setModalType('view')
    setShowModal(true)
  }

  const handleEdit = (item: any) => {
    setSelectedOrder(item)
    setModalType('edit')
    setShowModal(true)
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">订单管理</h1>
          <p className="text-gray-500 mt-1">管理所有销售订单信息</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> 导出
          </button>
          <button
            onClick={() => { setModalType('add'); setShowModal(true); }}
            className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 新增订单
          </button>
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
              placeholder="搜索订单号、客户名称或商品..."
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">订单编号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">客户名称</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">联系人和电话</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">商品明细</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">数量(kg)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">单价</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">金额(元)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">创建日期</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredOrders.map((order) => {
              const statusBadge = getStatusBadge(order.status)
              return (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{order.orderNo}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#2B5D3A]" />
                      <span className="text-sm font-medium text-gray-800">{order.customer}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-800">{order.contact}</div>
                    <div className="text-xs text-gray-500">{order.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">{order.product}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{order.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">¥{order.unitPrice}/kg</td>
                  <td className="px-4 py-3 text-sm font-bold text-[#2B5D3A]">¥{order.amount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                      {statusBadge.icon}
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{order.createDate}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleView(order)} className="p-1.5 text-gray-400 hover:text-[#2B5D3A] hover:bg-[#2B5D3A]/10 rounded transition-colors" title="查看">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(order)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="编辑">
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

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无数据</p>
          </div>
        )}
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500">共 {filteredOrders.length} 条记录</p>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50" disabled>上一页</button>
          <button className="px-3 py-1 bg-[#2B5D3A] text-white rounded text-sm">1</button>
          <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50">下一页</button>
        </div>
      </div>

      {/* 弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-gray-800">
                {modalType === 'add' ? '新增订单' : modalType === 'edit' ? '编辑订单' : '订单详情'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {modalType === 'view' && selectedOrder ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-2xl font-bold">{selectedOrder.orderNo}</h4>
                        <p className="text-emerald-100 mt-1">{selectedOrder.customer}</p>
                      </div>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full bg-white/20`}>
                        {selectedOrder.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">联系人</p>
                      <p className="text-lg font-bold text-gray-800">{selectedOrder.contact}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">联系电话</p>
                      <p className="text-lg font-bold text-gray-800">{selectedOrder.phone}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">商品明细</p>
                      <p className="text-lg font-bold text-gray-800">{selectedOrder.product}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">订单数量</p>
                      <p className="text-lg font-bold text-[#2B5D3A]">{selectedOrder.quantity} kg</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">订单金额</p>
                      <p className="text-lg font-bold text-[#2B5D3A]">¥{selectedOrder.amount.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">交货日期</p>
                      <p className="text-lg font-bold text-gray-800">{selectedOrder.deliveryDate}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-2">备注说明</p>
                    <p className="text-gray-700">{selectedOrder.remark}</p>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t border-gray-200">
                    <span>创建日期：{selectedOrder.createDate}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">订单编号 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        defaultValue={selectedOrder?.orderNo || 'SO20260311'}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">客户名称 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        defaultValue={selectedOrder?.customer || ''}
                        placeholder="请输入客户名称"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">联系人 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        defaultValue={selectedOrder?.contact || ''}
                        placeholder="请输入联系人"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">联系电话 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        defaultValue={selectedOrder?.phone || ''}
                        placeholder="请输入联系电话"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">商品明细 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      defaultValue={selectedOrder?.product || ''}
                      placeholder="如：番茄500kg+黄瓜300kg"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">数量(kg) <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        defaultValue={selectedOrder?.quantity || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">单价(元/kg) <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        defaultValue={selectedOrder?.unitPrice || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">金额(元)</label>
                      <input
                        type="number"
                        defaultValue={selectedOrder?.amount || ''}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">交货日期</label>
                      <input
                        type="date"
                        defaultValue={selectedOrder?.deliveryDate !== '-' ? selectedOrder?.deliveryDate : ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                      <select
                        defaultValue={selectedOrder?.status || '待审核'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="待审核">待审核</option>
                        <option value="待发货">待发货</option>
                        <option value="配送中">配送中</option>
                        <option value="已完成">已完成</option>
                        <option value="已取消">已取消</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">备注说明</label>
                    <textarea
                      defaultValue={selectedOrder?.remark || ''}
                      placeholder="请输入备注说明..."
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

export default OrderManagement
