/**
 * TAB 4: 种植记录管理（基地空间架构 V1.0）
 * 种植季记录 CRUD + 结束种植季 + 历史查询
 */
import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, Loader2, Leaf, CalendarCheck, History } from 'lucide-react';
import { Button } from '@/components/ui';
import { usePlantingRecordStore } from '../../stores/usePlantingRecordStore';
import { useGreenhouseStore } from '../../stores/useGreenhouseStore';
import { useDictionaryStore, getDictItems } from '../../stores/useDictionaryStore';
import type { PlantingRecord } from '../../services/apiPlantingRecordService';

const PAGE_SIZE = 10;

export default function PlantingRecordTab() {
  const { records, loading, error, loadRecords, addRecord, editRecord, endSeason, removeRecord } = usePlantingRecordStore();
  const { greenhouses, loadGreenhouses } = useGreenhouseStore();
  const { loadDictionaries } = useDictionaryStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [facilityFilter, setFacilityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // 弹窗状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<PlantingRecord | null>(null);
  const [currentRecord, setCurrentRecord] = useState<PlantingRecord | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    loadRecords();
    loadGreenhouses();
    loadDictionaries();
  }, [loadRecords, loadGreenhouses, loadDictionaries]);

  const facilityOptions = greenhouses.filter((g) => g.status === 'active');
  const statusOptions = getDictItems('planting_season_status');

  // 筛选
  const filtered = records.filter((r) => {
    const matchSearch = (r.seasonCode || '').toLowerCase().includes(searchTerm.toLowerCase())
      || (r.cropName || '').toLowerCase().includes(searchTerm.toLowerCase())
      || (r.varietyName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchFacility = !facilityFilter || r.facilityOid === facilityFilter;
    const matchStatus = !statusFilter || r.status === statusFilter;
    const matchActive = !showOnlyActive || r.status === 'planting';
    return matchSearch && matchFacility && matchStatus && (showOnlyActive ? matchActive : true);
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  /** 打开创建弹窗 */
  const handleOpenCreate = () => {
    setCurrentRecord(null);
    setFormData({ status: 'planting', start_date: new Date().toISOString().slice(0, 10) });
    setShowCreateModal(true);
  };

  /** 保存创建 */
  const handleSaveCreate = async () => {
    if (!formData.facility_oid || !formData.crop_name) {
      alert('请选择设施和填写作物名称');
      return;
    }
    try {
      await addRecord({
        facility_oid: formData.facility_oid,
        block_oid: formData.block_oid || '',
        crop_variety_oid: formData.crop_variety_oid || '',
        crop_name: formData.crop_name,
        variety_name: formData.variety_name || '',
        start_date: formData.start_date,
        notes: formData.notes || '',
      });
      setShowCreateModal(false);
    } catch (err) {
      alert('创建失败');
    }
  };

  /** 打开编辑弹窗 */
  const handleOpenEdit = (r: PlantingRecord) => {
    setCurrentRecord(r);
    setFormData({
      crop_name: r.cropName,
      variety_name: r.varietyName,
      start_date: r.startDate?.slice(0, 10),
      notes: r.notes || '',
    });
    setShowEditModal(true);
  };

  /** 保存编辑 */
  const handleSaveEdit = async () => {
    if (!currentRecord) return;
    try {
      await editRecord(currentRecord.oid, formData);
      setShowEditModal(false);
    } catch (err) {
      alert('更新失败');
    }
  };

  /** 打开结束种植季弹窗 */
  const handleOpenEnd = (r: PlantingRecord) => {
    setCurrentRecord(r);
    setFormData({
      end_date: new Date().toISOString().slice(0, 10),
      yield_amount: '',
      yield_unit: 'kg',
      quality_grade: '',
      notes: '',
    });
    setShowEndModal(true);
  };

  /** 结束种植季 */
  const handleEndSeason = async () => {
    if (!currentRecord || !formData.end_date) {
      alert('请填写结束日期');
      return;
    }
    try {
      await endSeason(currentRecord.oid, {
        end_date: formData.end_date,
        yield_amount: Number(formData.yield_amount) || 0,
        yield_unit: formData.yield_unit || 'kg',
        quality_grade: formData.quality_grade || '',
        notes: formData.notes || '',
      });
      setShowEndModal(false);
    } catch (err) {
      alert('结束种植季失败');
    }
  };

  /** 删除确认 */
  const handleDeleteConfirm = async () => {
    if (!showDeleteConfirm) return;
    try {
      await removeRecord(showDeleteConfirm.oid);
      setShowDeleteConfirm(null);
    } catch (err) {
      alert('删除失败');
    }
  };

  /** 获取设施名称 */
  const getFacilityName = (oid: string) => {
    return facilityOptions.find((g) => g.oid === oid)?.name || oid;
  };

  return (
    <div>
      {/* 工具栏 */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="搜索种植季/作物..." value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <select value={facilityFilter} onChange={(e) => { setFacilityFilter(e.target.value); setCurrentPage(1); }}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg">
          <option value="">全部设施</option>
          {facilityOptions.map((g) => <option key={g.oid} value={g.oid}>{g.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg">
          <option value="">全部状态</option>
          {statusOptions.map((opt) => <option key={opt.dictCode} value={opt.dictCode}>{opt.dictLabel}</option>)}
        </select>
        {/* 切换活跃/全部 */}
        <button
          onClick={() => setShowOnlyActive(!showOnlyActive)}
          className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border transition-colors ${showOnlyActive ? 'bg-blue-50 border-blue-300 text-blue-600' : 'border-gray-300 text-gray-600'}`}
        >
          {showOnlyActive ? <Leaf className="w-4 h-4" /> : <History className="w-4 h-4" />}
          {showOnlyActive ? '种植中' : '全部历史'}
        </button>
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-1" />新增种植季
        </Button>
      </div>

      {/* 表格 */}
      {loading && <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>}
      {error && <div className="text-center py-8 text-red-500 text-sm">{error}</div>}
      {!loading && !error && (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">种植季编码</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">所属设施</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">作物品种</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">开始日期</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">结束日期</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">状态</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">产量(kg)</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">品质</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300 bg-white">
                {paginated.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">
                    <Leaf className="w-8 h-8 mx-auto mb-2 text-gray-300" />暂无种植记录
                  </td></tr>
                ) : (
                  paginated.map((r) => (
                    <tr key={r.oid} className="hover:bg-blue-100 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-600 whitespace-nowrap">{r.seasonCode}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{getFacilityName(r.facilityOid)}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {r.cropName}{r.varietyName ? ` · ${r.varietyName}` : ''}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{r.startDate?.slice(0, 10) || '-'}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{r.endDate?.slice(0, 10) || '-'}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${
                          r.status === 'planting' ? 'bg-blue-100 text-blue-700' :
                          r.status === 'harvested' ? 'bg-green-100 text-green-700' :
                          r.status === 'fallow' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {statusOptions.find(s => s.dictCode === r.status)?.dictLabel || r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right whitespace-nowrap">{r.yieldAmount ?? '-'}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">{r.qualityGrade || '-'}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {r.status === 'planting' && (
                            <button onClick={() => handleOpenEnd(r)} className="p-1.5 hover:bg-green-50 text-green-500 rounded" title="结束种植季">
                              <CalendarCheck className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => handleOpenEdit(r)} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded" title="编辑">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setShowDeleteConfirm(r)} className="p-1.5 hover:bg-red-50 text-red-500 rounded" title="删除">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span>每页 {PAGE_SIZE} 条</span><span>|</span><span>共 {filtered.length} 条</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                <span className="px-2">{currentPage} / {Math.max(totalPages, 1)}</span>
                <Button variant="ghost" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 创建弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/40" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-3 flex items-center justify-between">
              <h3 className="text-white font-semibold">新增种植季</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-white/80 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-3">
              <label className="text-xs font-medium text-gray-600">选择设施<span className="text-red-500">*</span>
                <select value={formData.facility_oid || ''} onChange={(e) => setFormData({ ...formData, facility_oid: e.target.value })}
                  className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
                  <option value="">请选择设施</option>
                  {facilityOptions.map((g) => <option key={g.oid} value={g.oid}>{g.name}</option>)}
                </select>
              </label>
              <label className="text-xs font-medium text-gray-600">作物名称<span className="text-red-500">*</span>
                <input value={formData.crop_name || ''} onChange={(e) => setFormData({ ...formData, crop_name: e.target.value })}
                  className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
              </label>
              <label className="text-xs font-medium text-gray-600">品种名称
                <input value={formData.variety_name || ''} onChange={(e) => setFormData({ ...formData, variety_name: e.target.value })}
                  className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
              </label>
              <label className="text-xs font-medium text-gray-600">开始日期
                <input type="date" value={formData.start_date || ''} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
              </label>
              <label className="text-xs font-medium text-gray-600">备注
                <textarea value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2}
                  className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded resize-none" />
              </label>
              <p className="text-xs text-gray-400">种植季编码将自动生成（格式：2026S001）</p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
              <Button size="sm" variant="secondary" onClick={() => setShowCreateModal(false)}>取消</Button>
              <Button size="sm" onClick={handleSaveCreate}>创建种植季</Button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑弹窗 */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/40" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-3 flex items-center justify-between">
              <h3 className="text-white font-semibold">编辑种植记录</h3>
              <button onClick={() => setShowEditModal(false)} className="text-white/80 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-3">
              <label className="text-xs font-medium text-gray-600">作物名称
                <input value={formData.crop_name || ''} onChange={(e) => setFormData({ ...formData, crop_name: e.target.value })}
                  className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
              </label>
              <label className="text-xs font-medium text-gray-600">品种名称
                <input value={formData.variety_name || ''} onChange={(e) => setFormData({ ...formData, variety_name: e.target.value })}
                  className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
              </label>
              <label className="text-xs font-medium text-gray-600">开始日期
                <input type="date" value={formData.start_date || ''} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
              </label>
              <label className="text-xs font-medium text-gray-600">备注
                <textarea value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2}
                  className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded resize-none" />
              </label>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
              <Button size="sm" variant="secondary" onClick={() => setShowEditModal(false)}>取消</Button>
              <Button size="sm" onClick={handleSaveEdit}>保存</Button>
            </div>
          </div>
        </div>
      )}

      {/* 结束种植季弹窗 */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/40" onClick={() => setShowEndModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-3 flex items-center justify-between">
              <h3 className="text-white font-semibold">结束种植季</h3>
              <button onClick={() => setShowEndModal(false)} className="text-white/80 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-600">
                结束种植季「<span className="font-semibold text-blue-600">{currentRecord?.seasonCode}</span>」
              </p>
              <label className="text-xs font-medium text-gray-600">结束日期<span className="text-red-500">*</span>
                <input type="date" value={formData.end_date || ''} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-medium text-gray-600">产量
                  <input type="number" value={formData.yield_amount || ''} onChange={(e) => setFormData({ ...formData, yield_amount: e.target.value })}
                    className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
                </label>
                <label className="text-xs font-medium text-gray-600">单位
                  <select value={formData.yield_unit || 'kg'} onChange={(e) => setFormData({ ...formData, yield_unit: e.target.value })}
                    className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
                    <option value="kg">千克</option><option value="ton">吨</option><option value="jin">斤</option>
                  </select>
                </label>
              </div>
              <label className="text-xs font-medium text-gray-600">品质等级
                <select value={formData.quality_grade || ''} onChange={(e) => setFormData({ ...formData, quality_grade: e.target.value })}
                  className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
                  <option value="">请选择</option>
                  <option value="A">A级</option><option value="B">B级</option><option value="C">C级</option>
                </select>
              </label>
              <label className="text-xs font-medium text-gray-600">备注
                <textarea value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2}
                  className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded resize-none" />
              </label>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
              <Button size="sm" variant="secondary" onClick={() => setShowEndModal(false)}>取消</Button>
              <Button size="sm" onClick={handleEndSeason}>确认结束</Button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDeleteConfirm(null)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-2">确认删除</h3>
            <p className="text-sm text-gray-600 mb-4">确定要删除种植季「{showDeleteConfirm.seasonCode}」吗？</p>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setShowDeleteConfirm(null)}>取消</Button>
              <Button size="sm" variant="destructive" onClick={handleDeleteConfirm}>确认删除</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
