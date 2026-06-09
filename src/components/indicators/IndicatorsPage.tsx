import { useState, useRef, useEffect } from 'react';
import { Check, CheckCircle, Clock, DollarSign, Edit2, Eye, Plus, RotateCcw, Search, Send, Sprout, Target, Users, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Pagination } from '@/components/ui';

export interface Indicator {
  id: number;
  code: string;
  type: string;
  content: string;
  target: string;
  current: string;
  rate: number;
  publisher: string;
  publishDate: string;
  status: string;
  statusClass: string;
  region: string;
}

const indicators: Indicator[] = [
  { id: 1, code: 'M001', type: '产量目标', content: '年度番茄产量目标', target: '800吨', current: '2024年春', rate: 65, publisher: '张建华', publishDate: '2024-01-01', status: '进行中', statusClass: 'normal', region: '1号棚' },
  { id: 2, code: 'M002', type: '产值目标', content: '年度总产值目标', target: '300万元', current: '2024年', rate: 70, publisher: '张建华', publishDate: '2024-01-01', status: '进行中', statusClass: 'normal', region: '弘智耘种植园' },
  { id: 3, code: 'M003', type: '质量目标', content: '优质品率目标', target: '98%', current: '2024年春', rate: 100, publisher: '张建华', publishDate: '2024-01-01', status: '已完成', statusClass: 'info', region: '2号棚' },
  { id: 4, code: 'M004', type: '成本目标', content: '生产成本控制在预算范围内', target: '≤200万元', current: '2024年', rate: 92, publisher: '张建华', publishDate: '2024-01-15', status: '进行中', statusClass: 'normal', region: '弘智耘种植园' },
  { id: 5, code: 'M005', type: '进度目标', content: '按季节完成各批次种植', target: '4批次/年', current: '2024年春', rate: 75, publisher: '李建国', publishDate: '2024-01-01', status: '进行中', statusClass: 'normal', region: '3号棚' },
  { id: 6, code: 'M006', type: '环保目标', content: '农药使用量减少', target: '≤500L', current: '2024年夏', rate: 84, publisher: '王建华', publishDate: '2024-02-01', status: '进行中', statusClass: 'normal', region: '4号棚' },
  { id: 7, code: 'M007', type: '安全目标', content: '安全生产零事故', target: '0事故', current: '2024年', rate: 100, publisher: '张建华', publishDate: '2024-01-01', status: '进行中', statusClass: 'info', region: '弘智耘种植园' },
  { id: 8, code: 'M008', type: '创新目标', content: '新技术应用数量', target: '5项', current: '2024年', rate: 60, publisher: '李建国', publishDate: '2024-03-01', status: '进行中', statusClass: 'warning', region: '5号棚' },
];

export function IndicatorsPage() {
  const [yearFilter] = useState('2024年');
  const [showModal, setShowModal] = useState(false);

  const [currentSearch, setCurrentSearch] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [publisherSearch, setPublisherSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const resetFilters = () => {
    setCurrentSearch('');
    setTypeSearch('');
    setPublisherSearch('');
    setStartDate('');
    setEndDate('');
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setIsDragging(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setModalPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
      }
    };
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleOpenModal = () => {
    setModalPosition({ x: 0, y: 0 });
    setShowModal(true);
  };

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Indicator | null>(null);
  const [editForm, setEditForm] = useState({ change: '', changePerson: '', changeTime: '', changeReason: '' });
  const [editModalPosition, setEditModalPosition] = useState({ x: 0, y: 0 });
  const [editIsDragging, setEditIsDragging] = useState(false);
  const [editDragOffset, setEditDragOffset] = useState({ x: 0, y: 0 });
  const editModalRef = useRef<HTMLDivElement>(null);

  const handleEditClick = (item: Indicator) => {
    setEditingItem(item);
    setEditModalPosition({ x: 0, y: 0 });
    setEditForm({ change: '', changePerson: '', changeTime: '', changeReason: '' });
    setShowEditModal(true);
  };

  const handleEditMouseDown = (e: React.MouseEvent) => {
    if (editModalRef.current) {
      const rect = editModalRef.current.getBoundingClientRect();
      setEditDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setEditIsDragging(true);
    }
  };

  useEffect(() => {
    const handleEditMouseMove = (e: MouseEvent) => {
      if (editIsDragging) {
        setEditModalPosition({ x: e.clientX - editDragOffset.x, y: e.clientY - editDragOffset.y });
      }
    };
    const handleEditMouseUp = () => setEditIsDragging(false);
    if (editIsDragging) {
      document.addEventListener('mousemove', handleEditMouseMove);
      document.addEventListener('mouseup', handleEditMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleEditMouseMove);
      document.removeEventListener('mouseup', handleEditMouseUp);
    };
  }, [editIsDragging, editDragOffset]);

  const handleEditSubmit = () => {
    setShowEditModal(false);
    setEditingItem(null);
  };

  const [newTarget, setNewTarget] = useState({
    code: '', type: '产量目标', content: '', target: '', current: '',
    publisher: '', publishDate: '', status: '进行中', remarks: '', region: ''
  });

  const handleSubmit = () => {
    setShowModal(false);
    setNewTarget({ code: '', type: '产量目标', content: '', target: '', current: '', publisher: '', publishDate: '', status: '进行中', remarks: '', region: '' });
  };

  // Select组件的选项数组
  const regionOptions = ['弘智耘种植园', '1号棚', '2号棚', '3号棚', '4号棚', '5号棚', '6号棚'];
  const typeOptions = ['产量目标', '产值目标', '质量目标', '成本目标', '进度目标', '环保目标', '安全目标', '创新目标', '能耗目标', '技术目标', '服务目标', '培训目标'];
  const statusOptions = ['进行中', '已完成', '已过期'];
  const changeReasonOptions = ['目标调整', '数据更新', '情况变化', '计算错误', '其他原因'];
  const pageSizeOptions = [10, 20, 50];

  return (
    <div className="space-y-6">
      {showModal && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowModal(false)}></div>
          <div ref={modalRef} className="fixed bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto"
            style={{ left: modalPosition.x > 0 ? modalPosition.x : '50%', top: modalPosition.y > 0 ? modalPosition.y : '50%', transform: modalPosition.x <= 0 && modalPosition.y <= 0 ? 'translate(-50%, -50%)' : 'none' }}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100 cursor-move" onMouseDown={handleMouseDown}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">新增目标</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700">目标编号</Label>
                  <Input type="text" value={newTarget.code} onChange={(e) => setNewTarget({ ...newTarget, code: e.target.value })} placeholder="请输入目标编号" />
                </div>
                <div>
                  <Label className="text-gray-700">种植季</Label>
                  <Input type="text" value={newTarget.current} onChange={(e) => setNewTarget({ ...newTarget, current: e.target.value })} placeholder="请输入种植季" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700">区域</Label>
                  <Select value={newTarget.region} onValueChange={(val) => setNewTarget({ ...newTarget, region: val })}>
                    <SelectTrigger><SelectValue placeholder="请选择区域" /></SelectTrigger>
                    <SelectContent>
                      {regionOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-700">目标类型</Label>
                  <Select value={newTarget.type} onValueChange={(val) => setNewTarget({ ...newTarget, type: val })}>
                    <SelectTrigger><SelectValue placeholder="请选择目标类型" /></SelectTrigger>
                    <SelectContent>
                      {typeOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-gray-700">目标内容</Label>
                <TextArea value={newTarget.content} onChange={(e) => setNewTarget({ ...newTarget, content: e.target.value })} placeholder="请输入目标内容" minRows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700">目标值</Label>
                  <Input type="text" value={newTarget.target} onChange={(e) => setNewTarget({ ...newTarget, target: e.target.value })} placeholder="请输入目标值" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700">发布人</Label>
                  <Input type="text" value={newTarget.publisher} onChange={(e) => setNewTarget({ ...newTarget, publisher: e.target.value })} placeholder="请输入发布人" />
                </div>
                <div>
                  <Label className="text-gray-700">发布时间</Label>
                  <Input type="date" value={newTarget.publishDate} onChange={(e) => setNewTarget({ ...newTarget, publishDate: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700">状态</Label>
                  <Select value={newTarget.status} onValueChange={(val) => setNewTarget({ ...newTarget, status: val })}>
                    <SelectTrigger><SelectValue placeholder="请选择状态" /></SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-gray-700">备注</Label>
                <TextArea value={newTarget.remarks} onChange={(e) => setNewTarget({ ...newTarget, remarks: e.target.value })} placeholder="请输入备注信息" minRows={3} />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <Button variant="secondary" size="sm" onClick={() => setShowModal(false)}><X className="w-4 h-4" /> 取消</Button>
              <Button variant="default" size="sm" onClick={handleSubmit}><Check className="w-4 h-4" /> 确定</Button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowEditModal(false)}></div>
          <div ref={editModalRef} className="fixed bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{ left: editModalPosition.x > 0 ? editModalPosition.x : '50%', top: editModalPosition.y > 0 ? editModalPosition.y : '50%', transform: editModalPosition.x <= 0 && editModalPosition.y <= 0 ? 'translate(-50%, -50%)' : 'none' }}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100 cursor-move" onMouseDown={handleEditMouseDown}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                  <Edit2 className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">变更目标</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowEditModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">目标编号：</span><span className="text-gray-900 font-medium">{editingItem.code}</span></div>
                  <div><span className="text-gray-500">区域：</span><span className="text-gray-900 font-medium">{editingItem.region}</span></div>
                  <div><span className="text-gray-500">目标类型：</span><span className="text-gray-900 font-medium">{editingItem.type}</span></div>
                  <div><span className="text-gray-500">目标内容：</span><span className="text-gray-900 font-medium">{editingItem.content}</span></div>
                </div>
              </div>
              <div>
                <Label className="text-gray-700">变更</Label>
                <TextArea value={editForm.change} onChange={(e) => setEditForm({ ...editForm, change: e.target.value })} placeholder="请输入变更内容" minRows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700">变更人</Label>
                  <Input type="text" value={editForm.changePerson} onChange={(e) => setEditForm({ ...editForm, changePerson: e.target.value })} placeholder="请输入变更人" />
                </div>
                <div>
                  <Label className="text-gray-700">变更时间</Label>
                  <Input type="datetime-local" value={editForm.changeTime} onChange={(e) => setEditForm({ ...editForm, changeTime: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-gray-700">变更原因</Label>
                <Select value={editForm.changeReason} onValueChange={(val) => setEditForm({ ...editForm, changeReason: val })}>
                  <SelectTrigger><SelectValue placeholder="请选择变更原因" /></SelectTrigger>
                  <SelectContent>
                    {changeReasonOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <Button variant="secondary" size="sm" onClick={() => setShowEditModal(false)}><X className="w-4 h-4" /> 取消</Button>
              <Button variant="blue" size="sm" onClick={handleEditSubmit}><Send className="w-4 h-4" /> 提交审核</Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">指标列表</h1>
            <p className="text-gray-500">管理目标的列表与发布</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Sprout className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">1280</p><p className="text-xs text-gray-500">年度产量目标(吨)</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-green-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">856</p><p className="text-xs text-gray-500">已完成(吨)</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">67%</p><p className="text-xs text-gray-500">完成率</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center"><DollarSign className="w-5 h-5 text-purple-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">¥256万</p><p className="text-xs text-gray-500">产值目标</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center"><Users className="w-5 h-5 text-cyan-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">98.5%</p><p className="text-xs text-gray-500">优质品率目标</p></div>
          </div>
        </div>
      </div>

      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[120px]">
            <Label className="text-gray-700">种植季</Label>
            <Input type="text" placeholder="搜索种植季" value={currentSearch} onChange={(e) => setCurrentSearch(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[120px]">
            <Label className="text-gray-700">目标类型</Label>
            <Input type="text" placeholder="搜索目标类型" value={typeSearch} onChange={(e) => setTypeSearch(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[120px]">
            <Label className="text-gray-700">发布人</Label>
            <Input type="text" placeholder="搜索发布人" value={publisherSearch} onChange={(e) => setPublisherSearch(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[120px]">
            <Label className="text-gray-700">开始日期</Label>
            <Input type="date" value={startDate || ''} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[120px]">
            <Label className="text-gray-700">结束日期</Label>
            <Input type="date" value={endDate || ''} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="warning" size="sm" onClick={resetFilters}><RotateCcw className="w-4 h-4" />重置</Button>
            <Button variant="default" size="sm"><Search className="w-4 h-4" />搜索</Button>
            <Button variant="default" size="sm" onClick={handleOpenModal}><Plus className="w-4 h-4" />新增</Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100"><h3 className="text-lg font-semibold text-gray-900">管理目标列表</h3></div>
        <div className="overflow-x-auto" style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">目标编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">种植季</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">区域</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">目标类型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">目标内容</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">目标值</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">完成率</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">发布人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">发布时间</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {indicators.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((ind) => (
                <tr key={ind.id} className="hover:bg-blue-100 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{ind.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{ind.current}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{ind.region}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{ind.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate whitespace-nowrap">{ind.content}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{ind.target}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><span className={`text-sm font-medium ${ind.rate >= 100 ? 'text-green-600' : 'text-amber-600'}`}>{ind.rate}%</span></td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{ind.publisher}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{ind.publishDate}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${ind.statusClass === 'normal' ? 'bg-green-100 text-green-700' : ind.statusClass === 'info' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{ind.status}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" title="查看"><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEditClick(ind)} title="编辑"><Edit2 className="w-4 h-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">共 {indicators.length} 条</div>
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(indicators.length / pageSize) || 1}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            pageSizeOptions={pageSizeOptions}
            showPageSize
          />
        </div>
      </div>
    </div>
  );
}
