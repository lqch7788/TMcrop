import { useState } from 'react'
import { Search, Plus, Download, Calendar, Eye, Edit, Trash2, Image, Bug, CheckCircle, Clock } from 'lucide-react'

const PestIdentify = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('view')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [pestFilter, setPestFilter] = useState('全部')
  const [cropFilter, setCropFilter] = useState('全部')

  const pests = [
    { id: '1', recordNo: 'PI202403001', crop: '番茄', cropArea: 'A区-1号温室', pestName: '早疫病', pestType: '真菌性病害', confidence: 96.8, image: '叶片发黄', identifyTime: '2024-03-20 09:30', operator: '张建国', result: '已确认', remark: '早期发现，建议立即用药' },
    { id: '2', recordNo: 'PI202403002', crop: '黄瓜', cropArea: 'B区-2号温室', pestName: '白粉病', pestType: '真菌性病害', confidence: 94.5, image: '叶片白粉', identifyTime: '2024-03-20 10:15', operator: '李秀英', result: '已确认', remark: '发现及时，蔓延较快' },
    { id: '3', recordNo: 'PI202403003', crop: '辣椒', cropArea: 'C区-1号温室', pestName: '蚜虫', pestType: '虫害', confidence: 98.2, image: '叶片卷曲', identifyTime: '2024-03-20 11:00', operator: '王志强', result: '已确认', remark: '虫口密度较高' },
    { id: '4', recordNo: 'PI202403004', crop: '茄子', cropArea: 'A区-2号温室', pestName: '红蜘蛛', pestType: '虫害', confidence: 92.7, image: '叶片红斑', identifyTime: '2024-03-20 13:20', operator: '赵红梅', result: '已确认', remark: '局部发生' },
    { id: '5', recordNo: 'PI202403005', crop: '草莓', cropArea: 'D区-1号温室', pestName: '灰霉病', pestType: '真菌性病害', confidence: 95.1, image: '果实腐烂', identifyTime: '2024-03-20 14:00', operator: '陈伟明', result: '待确认', remark: '需专家复核' },
    { id: '6', recordNo: 'PI202403006', crop: '生菜', cropArea: 'E区-1号温室', pestName: '潜叶蝇', pestType: '虫害', confidence: 97.3, image: '叶片隧道', identifyTime: '2024-03-20 14:30', operator: '周小燕', result: '已确认', remark: '危害叶片' },
    { id: '7', recordNo: 'PI202403007', crop: '西瓜', cropArea: 'F区-1号温室', pestName: '枯萎病', pestType: '真菌性病害', confidence: 91.5, image: '茎部褐变', identifyTime: '2024-03-20 15:00', operator: '吴海峰', result: '已确认', remark: '根部已病变' },
    { id: '8', recordNo: 'PI202403008', crop: '葡萄', cropArea: 'G区-1号温室', pestName: '霜霉病', pestType: '真菌性病害', confidence: 93.9, image: '叶片白霜', identifyTime: '2024-03-20 15:30', operator: '郑晓丽', result: '已确认', remark: '气候适宜发病' },
    { id: '9', recordNo: 'PI202403009', crop: '番茄', cropArea: 'A区-3号温室', pestName: '病毒病', pestType: '病毒病', confidence: 89.4, image: '叶片花叶', identifyTime: '2024-03-20 16:00', operator: '张建国', result: '待确认', remark: '需隔离处理' },
    { id: '10', recordNo: 'PI202403010', crop: '黄瓜', cropArea: 'B区-3号温室', pestName: '瓜绢螟', pestType: '虫害', confidence: 96.1, image: '叶片缺刻', identifyTime: '2024-03-20 16:30', operator: '李秀英', result: '已确认', remark: '幼虫期用药效果佳' },
  ]

  const pestTypes = ['全部', '真菌性病害', '虫害', '病毒病', '细菌性病害']
  const crops = ['全部', '番茄', '黄瓜', '辣椒', '茄子', '草莓', '生菜', '西瓜', '葡萄']
  const results = ['全部', '已确认', '待确认', '已排除']

  const filteredData = pests.filter(p => {
    const matchesPest = pestFilter === '全部' || p.pestName === pestFilter
    const matchesCrop = cropFilter === '全部' || p.crop === cropFilter
    const matchesSearch = !searchKeyword ||
      p.recordNo.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      p.pestName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      p.crop.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchesPest && matchesCrop && matchesSearch
  })

  const getResultBadge = (result: string) => {
    switch (result) {
      case '已确认': return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> }
      case '待确认': return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Clock className="w-3 h-3" /> }
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
          <h1 className="text-2xl font-bold text-gray-800">病虫害识别</h1>
          <p className="text-gray-500 mt-1">AI智能识别作物病虫害类型</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> 导出
          </button>
          <button
            onClick={() => { setModalType('add'); setSelectedItem(null); setShowModal(true); }}
            className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 新增识别
          </button>
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">病虫害类型：</span>
              <div className="flex gap-1">
                {pestTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setPestFilter(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      pestFilter === type
                        ? 'bg-[#2B5D3A] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">作物：</span>
              <select
                value={cropFilter}
                onChange={(e) => setCropFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20"
              >
                {crops.map(crop => <option key={crop} value={crop}>{crop}</option>)}
              </select>
            </div>
          </div>
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索记录编号、病害名称或作物..."
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">记录编号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">作物</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">种植区域</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">病虫害名称</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">病虫害类型</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">置信度</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">识别时间</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作员</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">结果</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredData.map((item) => {
              const resultBadge = getResultBadge(item.result)
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{item.recordNo}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Bug className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-gray-800">{item.crop}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.cropArea}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.pestName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.pestType}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
                          style={{ width: `${item.confidence}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-800">{item.confidence}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.identifyTime}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.operator}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${resultBadge.bg} ${resultBadge.text}`}>
                      {resultBadge.icon}
                      {item.result}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleView(item)} className="p-1.5 text-gray-400 hover:text-[#2B5D3A] hover:bg-[#2B5D3A]/10 rounded transition-colors" title="查看">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="编辑">
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

        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <Bug className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无数据</p>
          </div>
        )}
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500">共 {filteredData.length} 条记录</p>
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
                {modalType === 'add' ? '新增识别记录' : modalType === 'edit' ? '编辑识别记录' : '识别详情'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {modalType === 'view' && selectedItem ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-2xl font-bold">{selectedItem.pestName}</h4>
                        <p className="text-red-100 mt-1">记录编号：{selectedItem.recordNo}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-4xl font-bold">{selectedItem.confidence}%</p>
                        <p className="text-sm text-red-100">置信度</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">作物类型</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.crop}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">种植区域</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.cropArea}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">病虫害类型</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.pestType}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">识别结果</p>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${
                        selectedItem.result === '已确认' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {selectedItem.result}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">操作员</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.operator}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">识别时间</p>
                      <p className="text-lg font-bold text-gray-800">{selectedItem.identifyTime}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-2">症状图片</p>
                    <p className="text-gray-700">{selectedItem.image}</p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-2">备注说明</p>
                    <p className="text-gray-700">{selectedItem.remark}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">记录编号</label>
                      <input
                        type="text"
                        defaultValue={selectedItem?.recordNo || 'PI202403011'}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">识别时间</label>
                      <input
                        type="datetime-local"
                        defaultValue={selectedItem?.identifyTime?.replace(' ', 'T') || ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">作物类型 <span className="text-red-500">*</span></label>
                      <select
                        defaultValue={selectedItem?.crop || ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="">请选择作物</option>
                        <option value="番茄">番茄</option>
                        <option value="黄瓜">黄瓜</option>
                        <option value="辣椒">辣椒</option>
                        <option value="茄子">茄子</option>
                        <option value="草莓">草莓</option>
                        <option value="生菜">生菜</option>
                        <option value="西瓜">西瓜</option>
                        <option value="葡萄">葡萄</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">种植区域</label>
                      <input
                        type="text"
                        defaultValue={selectedItem?.cropArea || ''}
                        placeholder="如：A区-1号温室"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">病虫害名称 <span className="text-red-500">*</span></label>
                      <select
                        defaultValue={selectedItem?.pestName || ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="">请选择病虫害</option>
                        <option value="早疫病">早疫病</option>
                        <option value="白粉病">白粉病</option>
                        <option value="蚜虫">蚜虫</option>
                        <option value="红蜘蛛">红蜘蛛</option>
                        <option value="灰霉病">灰霉病</option>
                        <option value="潜叶蝇">潜叶蝇</option>
                        <option value="枯萎病">枯萎病</option>
                        <option value="霜霉病">霜霉病</option>
                        <option value="病毒病">病毒病</option>
                        <option value="瓜绢螟">瓜绢螟</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">病虫害类型</label>
                      <select
                        defaultValue={selectedItem?.pestType || ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="真菌性病害">真菌性病害</option>
                        <option value="虫害">虫害</option>
                        <option value="病毒病">病毒病</option>
                        <option value="细菌性病害">细菌性病害</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">置信度 (%)</label>
                      <input
                        type="number"
                        defaultValue={selectedItem?.confidence || ''}
                        placeholder="0-100"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">操作员</label>
                      <select
                        defaultValue={selectedItem?.operator || ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                      >
                        <option value="">请选择操作员</option>
                        <option value="张建国">张建国</option>
                        <option value="李秀英">李秀英</option>
                        <option value="王志强">王志强</option>
                        <option value="赵红梅">赵红梅</option>
                        <option value="陈伟明">陈伟明</option>
                        <option value="周小燕">周小燕</option>
                        <option value="吴海峰">吴海峰</option>
                        <option value="郑晓丽">郑晓丽</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">识别结果</label>
                    <select
                      defaultValue={selectedItem?.result || '待确认'}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
                    >
                      <option value="已确认">已确认</option>
                      <option value="待确认">待确认</option>
                      <option value="已排除">已排除</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">备注说明</label>
                    <textarea
                      defaultValue={selectedItem?.remark || ''}
                      placeholder="请输入备注说明..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A] resize-none"
                    ></textarea>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-gray-50 flex items-center justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm transition-colors">取消</button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm hover:bg-[#245038] transition-colors">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PestIdentify
