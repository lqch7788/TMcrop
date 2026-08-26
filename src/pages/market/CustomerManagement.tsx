import { useState } from 'react'
import { Search, Plus, Download, Eye, Edit, Trash2, Users, Building, ShoppingBag, Monitor, Store, User, Utensils } from 'lucide-react'

const CustomerManagement = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('view')
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [typeFilter, setTypeFilter] = useState('全部')

  // 客户数据 - 10条真实数据
  const customers = [
    { id: '1', code: 'C2026001', name: '北京物美超市', type: '超市', contact: '张经理', phone: '138-0012-3456', address: '北京市朝阳区建国路88号', creditLevel: 'AAA', totalAmount: 158000, orderCount: 28, lastOrder: '2026-03-20', status: '正常' },
    { id: '2', code: 'C2026002', name: '上海永辉超市', type: '超市', contact: '李总监', phone: '139-8876-5432', address: '上海市浦东新区世纪大道1000号', creditLevel: 'AA', totalAmount: 98000, orderCount: 19, lastOrder: '2026-03-19', status: '正常' },
    { id: '3', code: 'C2026003', name: '广州江南市场', type: '农贸市场', contact: '王老板', phone: '136-7654-3210', address: '广州市白云区增槎路江南市场A区', creditLevel: 'A', totalAmount: 76000, orderCount: 15, lastOrder: '2026-03-18', status: '正常' },
    { id: '4', code: 'C2026004', name: '京东生鲜', type: '电商', contact: '刘采购', phone: '135-9988-7766', address: '北京市亦庄经济开发区京东总部', creditLevel: 'AAA', totalAmount: 235000, orderCount: 42, lastOrder: '2026-03-17', status: '正常' },
    { id: '5', code: 'C2026005', name: '盒马鲜生', type: '超市', contact: '陈主管', phone: '158-2233-4455', address: '上海市长宁区遵义路100号南丰城', creditLevel: 'AAA', totalAmount: 189000, orderCount: 35, lastOrder: '2026-03-16', status: '正常' },
    { id: '6', code: 'C2026006', name: '深圳华润万家', type: '超市', contact: '赵经理', phone: '137-5544-3322', address: '深圳市南山区华润大厦', creditLevel: 'AA', totalAmount: 67000, orderCount: 12, lastOrder: '2026-03-15', status: '正常' },
    { id: '7', code: 'C2026007', name: '老王蔬菜批发', type: '批发商', contact: '王建国', phone: '136-1122-3344', address: '武汉市洪山区白沙洲农副产品大市场', creditLevel: 'A', totalAmount: 89000, orderCount: 22, lastOrder: '2026-03-14', status: '正常' },
    { id: '8', code: 'C2026008', name: '小李水果店', type: '个体', contact: '李明', phone: '135-5566-7788', address: '成都市锦江区红星路四段76号', creditLevel: 'BB', totalAmount: 23000, orderCount: 8, lastOrder: '2026-03-12', status: '暂停' },
    { id: '9', code: 'C2026009', name: '杭州外国语学校食堂', type: '食堂', contact: '周师傅', phone: '189-6677-8899', address: '杭州市西湖区余杭塘路18号', creditLevel: 'AA', totalAmount: 45000, orderCount: 10, lastOrder: '2026-03-10', status: '正常' },
    { id: '10', code: 'C2026010', name: '美团优选', type: '电商', contact: '吴小姐', phone: '150-7788-9900', address: '北京市海淀区中关村软件园二期', creditLevel: 'AAA', totalAmount: 312000, orderCount: 56, lastOrder: '2026-03-09', status: '正常' },
  ]

  const customerTypes = ['全部', '批发商', '超市', '电商', '农贸市场', '个体', '食堂']

  const getTypeIcon = (type: string) => {
    switch (type) {
      case '超市': return <Building className="w-4 h-4" />
      case '批发商': return <ShoppingBag className="w-4 h-4" />
      case '电商': return <Monitor className="w-4 h-4" />
      case '农贸市场': return <Store className="w-4 h-4" />
      case '个体': return <User className="w-4 h-4" />
      case '食堂': return <Utensils className="w-4 h-4" />
      default: return <Users className="w-4 h-4" />
    }
  }

  const getCreditBadge = (level: string) => {
    switch (level) {
      case 'AAA': return { bg: 'bg-green-100', text: 'text-green-700' }
      case 'AA': return { bg: 'bg-blue-100', text: 'text-blue-700' }
      case 'A': return { bg: 'bg-gray-100', text: 'text-gray-700' }
      case 'BB': return { bg: 'bg-yellow-100', text: 'text-yellow-700' }
      default: return { bg: 'bg-gray-100', text: 'text-gray-600' }
    }
  }

  const filteredCustomers = customers.filter(customer => {
    const matchesType = typeFilter === '全部' || customer.type === typeFilter
    const matchesSearch = !searchKeyword ||
      customer.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      customer.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      customer.contact.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchesType && matchesSearch
  })

  const handleView = (item: any) => {
    setSelectedCustomer(item)
    setModalType('view')
    setShowModal(true)
  }

  const handleEdit = (item: any) => {
    setSelectedCustomer(item)
    setModalType('edit')
    setShowModal(true)
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">客户管理</h1>
          <p className="text-gray-500 mt-1">管理客户信息与信用等级</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> 导出
          </button>
          <button
            onClick={() => { setModalType('add'); setShowModal(true); }}
            className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 新增客户
          </button>
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">客户类型：</span>
            <div className="flex gap-2">
              {customerTypes.map(type => (
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
              placeholder="搜索客户名称、编号或联系人..."
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">客户编号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">客户名称</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">类型</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">联系人</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">联系电话</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">信用等级</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">累计交易(元)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">订单数</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">最近订单</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredCustomers.map((customer) => {
              const creditBadge = getCreditBadge(customer.creditLevel)
              return (
                <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{customer.code}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#2B5D3A]" />
                      <span className="text-sm font-medium text-gray-800">{customer.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      {getTypeIcon(customer.type)}
                      {customer.type}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800">{customer.contact}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{customer.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${creditBadge.bg} ${creditBadge.text}`}>
                      {customer.creditLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-[#2B5D3A]">¥{customer.totalAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{customer.orderCount}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{customer.lastOrder}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      customer.status === '正常' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {customer.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleView(customer)} className="p-1.5 text-gray-400 hover:text-[#2B5D3A] hover:bg-[#2B5D3A]/10 rounded transition-colors" title="查看">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(customer)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="编辑">
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

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无数据</p>
          </div>
        )}
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500">共 {filteredCustomers.length} 条记录</p>
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
                {modalType === 'add' ? '新增客户' : modalType === 'edit' ? '编辑客户' : '客户详情'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {modalType === 'view' && selectedCustomer ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-2xl font-bold">{selectedCustomer.name}</h4>
                        <p className="text-emerald-100 mt-1">客户编号：{selectedCustomer.code}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 text-sm font-medium rounded-full bg-white/20`}>
                          {selectedCustomer.type}
                        </span>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full bg-white/20`}>
                          信用：{selectedCustomer.creditLevel}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">联系人</p>
                      <p className="text-lg font-bold text-gray-800">{selectedCustomer.contact}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">联系电话</p>
                      <p className="text-lg font-bold text-gray-800">{selectedCustomer.phone}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 col-span-2">
                      <p className="text-sm text-gray-500 mb-1">地址</p>
                      <p className="text-lg font-bold text-gray-800">{selectedCustomer.address}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">累计交易金额</p>
                      <p className="text-lg font-bold text-[#2B5D3A]">¥{selectedCustomer.totalAmount.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">订单总数</p>
                      <p className="text-lg font-bold text-gray-800">{selectedCustomer.orderCount} 笔</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t border-gray-200">
                    <span>最近订单：{selectedCustomer.lastOrder}</span>
                    <span>状态：{selectedCustomer.status}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">客户编号 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        defaultValue={selectedCustomer?.code || 'C2026011'}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">客户名称 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        defaultValue={selectedCustomer?.name || ''}
                        placeholder="请输入客户名称"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">客户类型 <span className="text-red-500">*</span></label>
                      <select
                        defaultValue={selectedCustomer?.type || '批发商'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="批发商">批发商</option>
                        <option value="超市">超市</option>
                        <option value="电商">电商</option>
                        <option value="农贸市场">农贸市场</option>
                        <option value="个体">个体</option>
                        <option value="食堂">食堂</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">信用等级</label>
                      <select
                        defaultValue={selectedCustomer?.creditLevel || 'A'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="AAA">AAA</option>
                        <option value="AA">AA</option>
                        <option value="A">A</option>
                        <option value="BB">BB</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">联系人 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        defaultValue={selectedCustomer?.contact || ''}
                        placeholder="请输入联系人"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">联系电话 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        defaultValue={selectedCustomer?.phone || ''}
                        placeholder="请输入联系电话"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">地址 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      defaultValue={selectedCustomer?.address || ''}
                      placeholder="请输入详细地址"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                    <select
                      defaultValue={selectedCustomer?.status || '正常'}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                    >
                      <option value="正常">正常</option>
                      <option value="暂停">暂停</option>
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

export default CustomerManagement
