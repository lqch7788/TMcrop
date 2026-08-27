import { useState } from 'react'
import { Search, Plus, Download, Activity, Eye, Edit, Trash2, Thermometer, Droplets, Sun, Wind, Cloud } from 'lucide-react'

const EnvironmentAnalysis = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('view')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [baseFilter, setBaseFilter] = useState('全部')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const bases = ['全部', '北京基地1号', '北京基地2号', '山东寿光基地', '河南新乡基地', '江苏南京基地', '山东青岛基地', '云南昆明基地', '云南大理基地']

  const envData = [
    { id: '1', recordNo: 'EA20240301', base: '北京基地1号', greenhouse: '1号温室', crop: '番茄', temperature: 25.5, humidity: 65, lightIntensity: 45000, co2: 420, airQuality: '优', recordDate: '2024-03-20', analyst: '张伟' },
    { id: '2', recordNo: 'EA20240302', base: '山东寿光基地', greenhouse: '2号温室', crop: '黄瓜', temperature: 23.8, humidity: 72, lightIntensity: 38000, co2: 450, airQuality: '优', recordDate: '2024-03-19', analyst: '李娜' },
    { id: '3', recordNo: 'EA20240303', base: '河南新乡基地', greenhouse: '1号温室', crop: '辣椒', temperature: 26.2, humidity: 58, lightIntensity: 52000, co2: 400, airQuality: '良', recordDate: '2024-03-18', analyst: '王强' },
    { id: '4', recordNo: 'EA20240304', base: '江苏南京基地', greenhouse: '3号温室', crop: '生菜', temperature: 20.5, humidity: 75, lightIntensity: 35000, co2: 480, airQuality: '优', recordDate: '2024-03-17', analyst: '赵敏' },
    { id: '5', recordNo: 'EA20240305', base: '云南昆明基地', greenhouse: '1号温室', crop: '茄子', temperature: 24.0, humidity: 68, lightIntensity: 42000, co2: 410, airQuality: '优', recordDate: '2024-03-16', analyst: '张伟' },
    { id: '6', recordNo: 'EA20240306', base: '北京基地2号', greenhouse: '2号温室', crop: '草莓', temperature: 22.5, humidity: 70, lightIntensity: 32000, co2: 460, airQuality: '良', recordDate: '2024-03-15', analyst: '李娜' },
    { id: '7', recordNo: 'EA20240307', base: '山东青岛基地', greenhouse: '1号温室', crop: '西瓜', temperature: 27.8, humidity: 55, lightIntensity: 58000, co2: 380, airQuality: '优', recordDate: '2024-03-14', analyst: '王强' },
    { id: '8', recordNo: 'EA20240308', base: '云南大理基地', greenhouse: '2号温室', crop: '葡萄', temperature: 23.2, humidity: 62, lightIntensity: 48000, co2: 430, airQuality: '优', recordDate: '2024-03-13', analyst: '赵敏' },
    { id: '9', recordNo: 'EA20240309', base: '北京基地1号', greenhouse: '2号温室', crop: '番茄', temperature: 25.8, humidity: 63, lightIntensity: 46000, co2: 415, airQuality: '优', recordDate: '2024-03-12', analyst: '张伟' },
    { id: '10', recordNo: 'EA20240310', base: '山东寿光基地', greenhouse: '3号温室', crop: '黄瓜', temperature: 24.0, humidity: 70, lightIntensity: 40000, co2: 440, airQuality: '优', recordDate: '2024-03-11', analyst: '李娜' },
    { id: '11', recordNo: 'EA20240311', base: '河南新乡基地', greenhouse: '2号温室', crop: '辣椒', temperature: 26.5, humidity: 56, lightIntensity: 51000, co2: 395, airQuality: '良', recordDate: '2024-03-10', analyst: '王强' },
    { id: '12', recordNo: 'EA20240312', base: '江苏南京基地', greenhouse: '1号温室', crop: '生菜', temperature: 21.0, humidity: 73, lightIntensity: 36000, co2: 470, airQuality: '优', recordDate: '2024-03-09', analyst: '赵敏' },
  ]

  const filteredData = envData.filter(d => {
    const matchesBase = baseFilter === '全部' || d.base === baseFilter
    const matchesSearch = !searchKeyword ||
      d.recordNo.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      d.crop.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchesBase && matchesSearch
  })

  // 分页派生
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize))
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const getAirQualityBadge = (quality: string) => {
    switch (quality) {
      case '优': return { bg: 'bg-green-100', text: 'text-green-700' }
      case '良': return { bg: 'bg-blue-100', text: 'text-blue-700' }
      case '中': return { bg: 'bg-yellow-100', text: 'text-yellow-700' }
      case '差': return { bg: 'bg-red-100', text: 'text-red-700' }
      default: return { bg: 'bg-gray-100', text: 'text-gray-600' }
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
              <Cloud className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">环境分析</h1>
              <p className="text-gray-500 mt-1">生长环境数据监测与分析</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" /> 导出
            </button>
            <button
              onClick={() => { setModalType('add'); setShowModal(true); }}
              className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> 新增记录
            </button>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="bg-gradient-to-br from-red-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">平均温度</p>
              <p className="text-3xl font-bold mt-1">24.6°C</p>
            </div>
            <Thermometer className="w-10 h-10 text-red-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">平均湿度</p>
              <p className="text-3xl font-bold mt-1">65.2%</p>
            </div>
            <Droplets className="w-10 h-10 text-blue-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm">平均光照</p>
              <p className="text-3xl font-bold mt-1">43,000</p>
            </div>
            <Sun className="w-10 h-10 text-yellow-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">CO2浓度</p>
              <p className="text-3xl font-bold mt-1">427</p>
            </div>
            <Wind className="w-10 h-10 text-green-200" />
          </div>
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">基地：</span>
            <div className="flex gap-2 flex-wrap">
              {bases.map(base => (
                <button
                  key={base}
                  onClick={() => { setBaseFilter(base); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    baseFilter === base
                      ? 'bg-[#2B5D3A] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {base}
                </button>
              ))}
            </div>
          </div>
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索记录编号或作物..."
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">记录编号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">基地</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">温室</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">作物</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">温度(°C)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">湿度(%)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">光照(lux)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">CO2(ppm)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">空气质量</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedData.map((item) => {
              const qualityBadge = getAirQualityBadge(item.airQuality)
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{item.recordNo}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.base}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.greenhouse}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#2B5D3A]" />
                      <span className="text-sm font-medium text-gray-800">{item.crop}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-orange-600">{item.temperature}</td>
                  <td className="px-4 py-3 text-sm font-medium text-blue-600">{item.humidity}</td>
                  <td className="px-4 py-3 text-sm font-medium text-amber-600">{item.lightIntensity.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.co2}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${qualityBadge.bg} ${qualityBadge.text}`}>
                      {item.airQuality}
                    </span>
                  </td>
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
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
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
                {modalType === 'add' ? '新增环境记录' : modalType === 'edit' ? '编辑环境记录' : '环境详情'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {modalType === 'view' && selectedItem ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-2xl font-bold">{selectedItem.greenhouse}环境监测</h4>
                        <p className="text-cyan-100 mt-1">记录编号：{selectedItem.recordNo}</p>
                      </div>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                        selectedItem.airQuality === '优' ? 'bg-green-400/30 text-white' :
                        selectedItem.airQuality === '良' ? 'bg-blue-400/30 text-white' :
                        'bg-yellow-400/30 text-white'
                      }`}>
                        空气质量：{selectedItem.airQuality}
                      </span>
                    </div>
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
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-red-50 rounded-xl p-4 text-center">
                      <Thermometer className="w-6 h-6 text-red-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-red-600">{selectedItem.temperature}°C</p>
                      <p className="text-xs text-gray-500 mt-1">温度</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 text-center">
                      <Droplets className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-blue-600">{selectedItem.humidity}%</p>
                      <p className="text-xs text-gray-500 mt-1">湿度</p>
                    </div>
                    <div className="bg-yellow-50 rounded-xl p-4 text-center">
                      <Sun className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-yellow-600">{selectedItem.lightIntensity.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">光照</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 text-center">
                      <Wind className="w-6 h-6 text-green-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-green-600">{selectedItem.co2}</p>
                      <p className="text-xs text-gray-500 mt-1">CO2(ppm)</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t border-gray-200">
                    <span>分析员：{selectedItem.analyst}</span>
                    <span>记录时间：{selectedItem.recordDate}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">记录编号</label>
                      <input
                        type="text"
                        defaultValue={selectedItem?.recordNo || 'EA20240313'}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">基地</label>
                      <select
                        defaultValue={selectedItem?.base || '北京基地1号'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        {bases.filter(b => b !== '全部').map(base => (
                          <option key={base} value={base}>{base}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">温室</label>
                      <input
                        type="text"
                        defaultValue={selectedItem?.greenhouse || ''}
                        placeholder="如：1号温室"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
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
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">温度(°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        defaultValue={selectedItem?.temperature || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">湿度(%)</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.humidity || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">光照(lux)</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.lightIntensity || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">CO2(ppm)</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.co2 || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
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

export default EnvironmentAnalysis
