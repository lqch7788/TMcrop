import { useState } from 'react'
import { Search, Plus, Download, BarChart3, Eye, Edit, Trash2, Calendar, Filter } from 'lucide-react'

const DataAnalysis = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('view')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [baseFilter, setBaseFilter] = useState('全部')

  const bases = ['全部', '北京基地1号', '北京基地2号', '山东寿光基地', '河南新乡基地', '江苏南京基地', '山东青岛基地', '云南昆明基地', '云南大理基地']

  const dataAnalysis = [
    { id: '1', reportNo: 'DA20240301', reportName: '2024年3月番茄产量分析', base: '北京基地1号', crop: '番茄', analysisType: '产量分析', dataVolume: 15680, accuracy: 95.8, analyst: '张伟', createDate: '2024-03-20' },
    { id: '2', reportNo: 'DA20240302', reportName: '黄瓜生长周期数据分析', base: '山东寿光基地', crop: '黄瓜', analysisType: '生长分析', dataVolume: 12350, accuracy: 93.2, analyst: '李娜', createDate: '2024-03-19' },
    { id: '3', reportNo: 'DA20240303', reportName: '辣椒环境因子相关性分析', base: '河南新乡基地', crop: '辣椒', analysisType: '环境分析', dataVolume: 9800, accuracy: 91.5, analyst: '王强', createDate: '2024-03-18' },
    { id: '4', reportNo: 'DA20240304', reportName: '生菜品质影响因素分析', base: '江苏南京基地', crop: '生菜', analysisType: '品质分析', dataVolume: 7650, accuracy: 94.1, analyst: '赵敏', createDate: '2024-03-17' },
    { id: '5', reportNo: 'DA20240305', reportName: '茄子病虫害预警分析', base: '云南昆明基地', crop: '茄子', analysisType: '病虫害分析', dataVolume: 11200, accuracy: 96.3, analyst: '张伟', createDate: '2024-03-16' },
    { id: '6', reportNo: 'DA20240306', reportName: '草莓成熟度预测分析', base: '北京基地2号', crop: '草莓', analysisType: '成熟度分析', dataVolume: 8900, accuracy: 92.7, analyst: '李娜', createDate: '2024-03-15' },
    { id: '7', reportNo: 'DA20240307', reportName: '西瓜灌溉量优化分析', base: '山东青岛基地', crop: '西瓜', analysisType: '灌溉分析', dataVolume: 10500, accuracy: 94.5, analyst: '王强', createDate: '2024-03-14' },
    { id: '8', reportNo: 'DA20240308', reportName: '葡萄糖度等级分析', base: '云南大理基地', crop: '葡萄', analysisType: '品质分析', dataVolume: 8200, accuracy: 93.8, analyst: '赵敏', createDate: '2024-03-13' },
    { id: '9', reportNo: 'DA20240309', reportName: '番茄市场行情分析', base: '北京基地1号', crop: '番茄', analysisType: '市场分析', dataVolume: 15000, accuracy: 89.5, analyst: '张伟', createDate: '2024-03-12' },
    { id: '10', reportNo: 'DA20240310', reportName: '黄瓜采摘时机分析', base: '山东寿光基地', crop: '黄瓜', analysisType: '采收分析', dataVolume: 13400, accuracy: 95.1, analyst: '李娜', createDate: '2024-03-11' },
    { id: '11', reportNo: 'DA20240311', reportName: '辣椒产量预测对比分析', base: '河南新乡基地', crop: '辣椒', analysisType: '预测分析', dataVolume: 10800, accuracy: 94.2, analyst: '王强', createDate: '2024-03-10' },
    { id: '12', reportNo: 'DA20240312', reportName: '生菜生长环境优化分析', base: '江苏南京基地', crop: '生菜', analysisType: '环境优化', dataVolume: 9200, accuracy: 96.0, analyst: '赵敏', createDate: '2024-03-09' },
  ]

  const filteredData = dataAnalysis.filter(d => {
    const matchesBase = baseFilter === '全部' || d.base === baseFilter
    const matchesSearch = !searchKeyword ||
      d.reportName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      d.reportNo.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchesBase && matchesSearch
  })

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
          <h1 className="text-2xl font-bold text-gray-800">数据分析</h1>
          <p className="text-gray-500 mt-1">多维度农业数据分析与报告</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> 导出
          </button>
          <button
            onClick={() => { setModalType('add'); setShowModal(true); }}
            className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 新增分析
          </button>
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
                  onClick={() => setBaseFilter(base)}
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
          <div className="relative min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索报告名称或编号..."
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">报告编号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">报告名称</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">基地</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">作物</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">分析类型</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">数据量</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">准确率</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">分析员</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredData.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-600 font-mono">{item.reportNo}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#2B5D3A]" />
                    <span className="text-sm font-medium text-gray-800">{item.reportName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.base}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.crop}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.analysisType}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.dataVolume.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm font-medium text-green-600">{item.accuracy}%</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.analyst}</td>
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
            ))}
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无数据</p>
          </div>
        )}
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500">共 {filteredData.length} 条记录</p>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50" disabled>
            上一页
          </button>
          <button className="px-3 py-1 bg-[#2B5D3A] text-white rounded text-sm">1</button>
          <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50">
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
                {modalType === 'add' ? '新增数据分析' : modalType === 'edit' ? '编辑数据分析' : '分析详情'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {modalType === 'view' && selectedItem ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-2xl font-bold">{selectedItem.reportName}</h4>
                        <p className="text-emerald-100 mt-1">报告编号：{selectedItem.reportNo}</p>
                      </div>
                      <span className="px-3 py-1 text-sm font-medium rounded-full bg-white/20 text-white">
                        {selectedItem.analysisType}
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
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">数据量</p>
                      <p className="text-lg font-bold text-[#2B5D3A]">{selectedItem.dataVolume.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">准确率</p>
                      <p className="text-lg font-bold text-green-600">{selectedItem.accuracy}%</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t border-gray-200">
                    <span>分析员：{selectedItem.analyst}</span>
                    <span>创建时间：{selectedItem.createDate}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">报告编号</label>
                      <input
                        type="text"
                        defaultValue={selectedItem?.reportNo || 'DA20240313'}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">分析类型</label>
                      <select
                        defaultValue={selectedItem?.analysisType || '产量分析'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="产量分析">产量分析</option>
                        <option value="生长分析">生长分析</option>
                        <option value="环境分析">环境分析</option>
                        <option value="品质分析">品质分析</option>
                        <option value="病虫害分析">病虫害分析</option>
                        <option value="市场分析">市场分析</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">报告名称 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      defaultValue={selectedItem?.reportName || ''}
                      placeholder="请输入报告名称"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">基地 <span className="text-red-500">*</span></label>
                      <select
                        defaultValue={selectedItem?.base || '北京基地1号'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        {bases.filter(b => b !== '全部').map(base => (
                          <option key={base} value={base}>{base}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">作物 <span className="text-red-500">*</span></label>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">数据量</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.dataVolume || ''}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">准确率</label>
                      <input
                        type="number"
                        step="0.1"
                        defaultValue={selectedItem?.accuracy || ''}
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

export default DataAnalysis
