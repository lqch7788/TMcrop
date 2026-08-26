import { useState } from 'react'
import { Search, Plus, Download, BarChart3, TrendingUp, ShoppingCart, Users, DollarSign, Eye, Edit, Trash2 } from 'lucide-react'

const MarketSales = () => {
  const [searchKeyword, setSearchKeyword] = useState('')

  // 销售统计数据
  const salesStats = [
    { label: '本月销售额', value: '¥1,258,600', change: '+12.5%', icon: <DollarSign className="w-5 h-5" />, color: 'from-green-500 to-emerald-600' },
    { label: '订单总数', value: '486', change: '+8.2%', icon: <ShoppingCart className="w-5 h-5" />, color: 'from-blue-500 to-indigo-600' },
    { label: '客户数量', value: '128', change: '+5.3%', icon: <Users className="w-5 h-5" />, color: 'from-purple-500 to-violet-600' },
    { label: '平均单价', value: '¥8.6/kg', change: '-2.1%', icon: <TrendingUp className="w-5 h-5" />, color: 'from-orange-500 to-amber-600' },
  ]

  // 销售走势数据
  const salesTrend = [
    { month: '1月', amount: 98, orders: 42 },
    { month: '2月', amount: 105, orders: 48 },
    { month: '3月', amount: 92, orders: 38 },
    { month: '4月', amount: 118, orders: 52 },
    { month: '5月', amount: 125, orders: 56 },
    { month: '6月', amount: 132, orders: 58 },
  ]

  // 近期订单
  const recentOrders = [
    { id: 'SO20260301', customer: '北京物美超市', product: '番茄500kg+黄瓜300kg', amount: 7200, date: '2026-03-20', status: '已完成' },
    { id: 'SO20260302', customer: '上海永辉超市', product: '辣椒400kg+茄子200kg', amount: 5400, date: '2026-03-19', status: '配送中' },
    { id: 'SO20260303', customer: '广州江南市场', product: '生菜300kg+草莓100kg', amount: 5800, date: '2026-03-18', status: '已完成' },
    { id: 'SO20260304', customer: '京东生鲜', product: '樱桃番茄200kg+红椒150kg', amount: 5250, date: '2026-03-17', status: '已完成' },
    { id: 'SO20260305', customer: '盒马鲜生', product: '西瓜500kg+葡萄300kg', amount: 9600, date: '2026-03-16', status: '待发货' },
  ]

  const maxAmount = Math.max(...salesTrend.map(d => d.amount))

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">市场销售中心</h1>
          <p className="text-gray-500 mt-1">实时掌握销售动态与业绩概览</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> 导出报表
          </button>
          <button className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> 新建订单
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        {salesStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center text-white`}>
                {stat.icon}
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                stat.change.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* 销售趋势图表区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#2B5D3A]" />
            销售趋势
          </h2>
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#2B5D3A]"></span> 销售额(万元)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-blue-400"></span> 订单数
            </span>
          </div>
        </div>
        <div className="flex items-end justify-between h-48 px-4">
          {salesTrend.map((item, index) => (
            <div key={index} className="flex flex-col items-center gap-2 flex-1">
              <div className="flex gap-6 w-full justify-center">
                <div className="flex flex-col items-center">
                  <div
                    className="w-12 bg-gradient-to-t from-[#2B5D3A] to-emerald-400 rounded-t-md transition-all hover:opacity-80"
                    style={{ height: `${(item.amount / maxAmount) * 140}px` }}
                  ></div>
                  <span className="text-xs text-gray-600 mt-1">{item.amount}</span>
                </div>
                <div className="flex flex-col items-center">
                  <div
                    className="w-12 bg-gradient-to-t from-blue-400 to-blue-300 rounded-t-md transition-all hover:opacity-80"
                    style={{ height: `${(item.orders / 60) * 140}px` }}
                  ></div>
                  <span className="text-xs text-gray-600 mt-1">{item.orders}</span>
                </div>
              </div>
              <span className="text-xs text-gray-500">{item.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 近期订单列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">近期订单</h2>
          <div className="relative min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索订单号或客户名称..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
            />
          </div>
        </div>
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">订单编号</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">客户名称</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">商品明细</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">订单金额</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">日期</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">状态</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {recentOrders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-600 font-mono">{order.id}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-800">{order.customer}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{order.product}</td>
                <td className="px-6 py-4 text-sm font-bold text-[#2B5D3A]">¥{order.amount.toLocaleString()}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{order.date}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${
                    order.status === '已完成' ? 'bg-green-100 text-green-700' :
                    order.status === '配送中' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 text-gray-400 hover:text-[#2B5D3A] hover:bg-[#2B5D3A]/10 rounded transition-colors" title="查看">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="编辑">
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
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-gray-500">共 {recentOrders.length} 条记录</p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50" disabled>上一页</button>
            <button className="px-3 py-1 bg-[#2B5D3A] text-white rounded text-sm">1</button>
            <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50">下一页</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MarketSales
