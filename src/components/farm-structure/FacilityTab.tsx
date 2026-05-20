/**
 * TAB 2: 设施管理（基地空间架构 V1.0）
 * 温室/大棚/拱棚等设施的 CRUD，支持按基地筛选
 */
import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui';
import { useGreenhouseStore } from '../../stores';
import { useBaseStore } from '../../stores/useBaseStore';
import { useDictionaryStore, getDictItems } from '../../stores/useDictionaryStore';
import type { Greenhouse } from '../../services/apiBasicDataService';
import { showAlert } from '@/lib/dialogService';

const PAGE_SIZE = 10;

export default function FacilityTab() {
  const { greenhouses, loading, error, loadGreenhouses, addGreenhouse, editGreenhouse, removeGreenhouse } = useGreenhouseStore();
  const { bases, loadBases } = useBaseStore();
  const { loadDictionaries } = useDictionaryStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [baseFilter, setBaseFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Greenhouse | null>(null);
  const [formData, setFormData] = useState<Partial<Greenhouse>>({ status: 'active' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Greenhouse | null>(null);

  useEffect(() => {
    loadGreenhouses();
    loadBases();
    loadDictionaries();
  }, [loadGreenhouses, loadBases, loadDictionaries]);

  const facilityTypeOptions = getDictItems('greenhouse_type');
  const baseOptions = bases;

  const filtered = greenhouses.filter((gh) => {
    const matchSearch = (gh.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      || (gh.code || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchBase = !baseFilter || gh.baseOid === baseFilter;
    const matchType = !typeFilter || gh.greenhouseType === typeFilter;
    return matchSearch && matchBase && matchType;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ status: 'active' });
    setShowModal(true);
  };

  const handleEdit = (gh: Greenhouse) => {
    setEditingItem(gh);
    setFormData({ ...gh });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code) {
      await showAlert('请填写设施名称和编码');
      return;
    }
    try {
      if (editingItem) {
        await editGreenhouse(editingItem.id, formData);
      } else {
        await addGreenhouse(formData);
      }
      setShowModal(false);
      setEditingItem(null);
    } catch (err) {
      await showAlert('保存失败');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!showDeleteConfirm) return;
    try {
      await removeGreenhouse(showDeleteConfirm.id);
      setShowDeleteConfirm(null);
    } catch (err) {
      await showAlert('删除失败');
    }
  };

  return (
    <div>
      {/* 工具栏 */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="搜索设施名称/编码..." value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        {/* 基地筛选 */}
        <select value={baseFilter} onChange={(e) => { setBaseFilter(e.target.value); setCurrentPage(1); }}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="">全部基地</option>
          {baseOptions.map((b) => (
            <option key={b.oid} value={b.oid}>{b.name}</option>
          ))}
        </select>
        {/* 设施类型筛选 */}
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="">全部类型</option>
          {facilityTypeOptions.map((opt) => (
            <option key={opt.dictCode} value={opt.dictCode}>{opt.dictLabel}</option>
          ))}
        </select>
        <Button size="sm" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-1" />新增设施
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
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">设施编码</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">设施名称</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">设施类型</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">所属基地</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">面积(亩)</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">当前位置</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">当前作物</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">状态</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300 bg-white">
                {paginated.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">
                    <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />暂无设施数据
                  </td></tr>
                ) : (
                  paginated.map((gh) => (
                    <tr key={gh.oid} className="hover:bg-blue-100 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono whitespace-nowrap">{gh.code || '-'}</td>
                      <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">{gh.name}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{gh.greenhouseType || '-'}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{gh.baseName || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right whitespace-nowrap">{gh.area || 0}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{gh.location || '-'}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{gh.crop || '-'}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${gh.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {gh.status === 'active' ? '活跃' : '停用'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleEdit(gh)} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded" title="编辑">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setShowDeleteConfirm(gh)} className="p-1.5 hover:bg-red-50 text-red-500 rounded" title="删除">
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
                <Button variant="ghost" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                <span className="px-2">{currentPage} / {Math.max(totalPages, 1)}</span>
                <Button variant="ghost" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 新增/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/40" onClick={() => { setShowModal(false); setEditingItem(null); }}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()} style={{ minWidth: 640, minHeight: 400 }}>
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-3 flex items-center justify-between">
              <h3 className="text-white font-semibold">{editingItem ? '编辑设施' : '新增设施'}</h3>
              <button onClick={() => { setShowModal(false); setEditingItem(null); }} className="text-white/80 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-medium text-gray-600">设施名称<span className="text-red-500">*</span>
                  <input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                </label>
                <label className="text-xs font-medium text-gray-600">设施编码<span className="text-red-500">*</span>
                  <input value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                </label>
                <label className="text-xs font-medium text-gray-600">设施类型
                  <select value={formData.greenhouseType || ''} onChange={(e) => setFormData({ ...formData, greenhouseType: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
                    <option value="">请选择</option>
                    {facilityTypeOptions.map((opt) => (
                      <option key={opt.dictCode} value={opt.dictCode}>{opt.dictLabel}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-gray-600">所属基地
                  <select value={formData.baseOid || ''} onChange={(e) => { const b = baseOptions.find(x => x.oid === e.target.value); setFormData({ ...formData, baseOid: e.target.value, baseName: b?.name || '' }); }} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
                    <option value="">请选择</option>
                    {baseOptions.map((b) => <option key={b.oid} value={b.oid}>{b.name}</option>)}
                  </select>
                </label>
                <label className="text-xs font-medium text-gray-600">面积(亩)
                  <input type="number" value={formData.area || ''} onChange={(e) => setFormData({ ...formData, area: Number(e.target.value) })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
                </label>
                <label className="text-xs font-medium text-gray-600">位置
                  <input value={formData.location || ''} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
                </label>
                <label className="text-xs font-medium text-gray-600">当前作物
                  <input value={formData.crop || ''} onChange={(e) => setFormData({ ...formData, crop: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded bg-blue-50" />
                </label>
                <label className="text-xs font-medium text-gray-600">状态
                  <select value={formData.status || 'active'} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
                    <option value="active">活跃</option><option value="inactive">停用</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
              <Button size="sm" variant="secondary" onClick={() => { setShowModal(false); setEditingItem(null); }}>取消</Button>
              <Button size="sm" onClick={handleSave}>保存</Button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDeleteConfirm(null)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-2">确认删除</h3>
            <p className="text-sm text-gray-600 mb-4">确定要删除设施「{showDeleteConfirm.name}」吗？</p>
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
