import { useState } from 'react'
import { Search, Plus, Download, Brain, Eye, Edit, Trash2, Settings, Play } from 'lucide-react'

const AnalysisModel = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('view')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [modelFilter, setModelFilter] = useState('全部')

  const modelTypes = ['全部', '病虫害识别', '长势评估', '环境预测', '灌溉优化', '采收预测', '品质分级', '市场预测', '成本分析', '其他']

  const models = [
    { id: '1', modelNo: 'AM2024001', modelName: '番茄病虫害识别模型', modelType: '病虫害识别', version: 'v2.1', accuracy: 96.5, status: '运行中', base: '北京基地1号', updateDate: '2024-03-15', description: '基于深度学习的番茄病虫害图像识别模型' },
    { id: '2', modelNo: 'AM2024002', modelName: '黄瓜长势评估模型', modelType: '长势评估', version: 'v1.8', accuracy: 94.2, status: '运行中', base: '山东寿光基地', updateDate: '2024-03-14', description: '通过图像分析评估黄瓜生长状态和健康度' },
    { id: '3', modelNo: 'AM2024003', modelName: '环境预测模型', modelType: '环境预测', version: 'v3.0', accuracy: 92.8, status: '运行中', base: '河南新乡基地', updateDate: '2024-03-13', description: '预测未来7天的温度、湿度、光照等环境参数' },
    { id: '4', modelNo: 'AM2024004', modelName: '灌溉优化模型', modelType: '灌溉优化', version: 'v2.5', accuracy: 95.1, status: '运行中', base: '江苏南京基地', updateDate: '2024-03-12', description: '根据土壤湿度和天气预报优化灌溉策略' },
    { id: '5', modelNo: 'AM2024005', modelName: '辣椒采收预测模型', modelType: '采收预测', version: 'v1.5', accuracy: 93.6, status: '运行中', base: '云南昆明基地', updateDate: '2024-03-11', description: '预测辣椒最佳采收时间节点' },
    { id: '6', modelNo: 'AM2024006', modelName: '生菜品质分级模型', modelType: '品质分级', version: 'v2.2', accuracy: 94.8, status: '运行中', base: '北京基地2号', updateDate: '2024-03-10', description: '对生菜进行品质等级自动划分' },
    { id: '7', modelNo: 'AM2024007', modelName: '草莓市场预测模型', modelType: '市场预测', version: 'v1.3', accuracy: 91.5, status: '运行中', base: '山东青岛基地', updateDate: '2024-03-09', description: '预测草莓市场价格走势和需求变化' },
    { id: '8', modelNo: 'AM2024008', modelName: '葡萄成本分析模型', modelType: '成本分析', version: 'v2.0', accuracy: 93.2, status: '运行中', base: '云南大理基地', updateDate: '2024-03-08', description: '分析葡萄种植成本构成和优化空间' },
    { id: '9', modelNo: 'AM2024009', modelName: '茄子产量预测模型', modelType: '采收预测', version: 'v1.7', accuracy: 94.5, status: '优化中', base: '河南新乡基地', updateDate: '2024-03-07', description: '基于历史数据预测茄子产量' },
    { id: '10', modelNo: 'AM2024010', modelName: '西瓜品质识别模型', modelType: '品质分级', version: 'v2.3', accuracy: 95.8, status: '运行中', base: '山东青岛基地', updateDate: '2024-03-06', description: '通过图像识别判断西瓜成熟度和品质' },
  ]

  const filteredModels = models.filter(m => {
    const matchesType = modelFilter === '全部' || m.modelType === modelType
    const matchesSearch = !searchKeyword ||
      m.modelName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      m.modelNo.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchesType && matchesSearch
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '运行中': return { bg: 'bg-green-100', text: 'text-green-700' }
      case '优化中': return { bg: 'bg-yellow-100', text: 'text-yellow-700' }
      case '已停用': return { bg: 'bg-gray-100', text: 'text-gray-600' }
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
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">分析模型</h1>
          <p className="text-gray-500 mt-1">AI分析模型配置与管理系统</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> 导出
          </button>
          <button
            onClick={() => { setModalType('add'); setShowModal(true); }}
            className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 新增模型
          </button>
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">模型类型：</span>
            <div className="flex gap-2 flex-wrap">
              {modelTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setModelFilter(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    modelFilter === type
                      ? 'bg-[#2B5D3A] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div className="relative min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索模型名称或编号..."
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">模型编号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">模型名称</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">类型</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">版本</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">准确率</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">适用基地</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredModels.map((model) => {
              const statusBadge = getStatusBadge(model.status)
              return (
                <tr key={model.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{model.modelNo}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-[#2B5D3A]" />
                      <span className="text-sm font-medium text-gray-800">{model.modelName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{model.modelType}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{model.version}</td>
                  <td className="px-4 py-3 text-sm font-medium text-green-600">{model.accuracy}%</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                      {model.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{model.base}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleView(model)}
                        className="p-1.5 text-gray-400 hover:text-[#2B5D3A] hover:bg-[#2B5D3A]/10 rounded transition-colors"
                        title="查看"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(model)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                        title="配置"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="运行"
                      >
                        <Play className="w-4 h-4" />
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

        {filteredModels.length === 0 && (
          <div className="text-center py-12">
            <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无数据</p>
          </div>
        )}
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500">共 {filteredModels.length} 条记录</p>
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
                {modalType === 'add' ? '新增分析模型' : modalType === 'edit' ? '编辑分析模型' : '模型详情'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {modalType === 'view' && selectedItem ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-2xl font-bold">{selectedItem.modelName}</h4>
                        <p className="text-purple-100 mt-1">模型编号：{selectedItem.modelNo}</p>
                      </div>
                      <span className="px-3 py-1 text-sm font-medium rounded-full bg-white/20 text-white">
                        {selectedItem.modelType}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">版本</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.version}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">准确率</p>
                      <p className="text-lg font-bold text-green-600">{selectedItem.accuracy}%</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">状态</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.status}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">适用基地</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.base}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-2">模型描述</p>
                    <p className="text-gray-700">{selectedItem.description}</p>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t border-gray-200">
                    <span>更新时间：{selectedItem.updateDate}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">模型编号</label>
                      <input
                        type="text"
                        defaultValue={selectedItem?.modelNo || 'AM2024011'}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">模型类型</label>
                      <select
                        defaultValue={selectedItem?.modelType || '病虫害识别'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="病虫害识别">病虫害识别</option>
                        <option value="长势评估">长势评估</option>
                        <option value="环境预测">环境预测</option>
                        <option value="灌溉优化">灌溉优化</option>
                        <option value="采收预测">采收预测</option>
                        <option value="品质分级">品质分级</option>
                        <option value="市场预测">市场预测</option>
                        <option value="成本分析">成本分析</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">模型名称 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      defaultValue={selectedItem?.modelName || ''}
                      placeholder="请输入模型名称"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">版本</label>
                      <input
                        type="text"
                        defaultValue={selectedItem?.version || 'v1.0'}
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                      <select
                        defaultValue={selectedItem?.status || '运行中'}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="运行中">运行中</option>
                        <option value="优化中">优化中</option>
                        <option value="已停用">已停用</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">适用基地</label>
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
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">模型描述</label>
                    <textarea
                      defaultValue={selectedItem?.description || ''}
                      placeholder="请输入模型描述..."
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

export default AnalysisModel
