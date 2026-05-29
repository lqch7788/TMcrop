/**
 * TAB 3: 区块划分管理（基地空间架构 V1.0）
 * 区块(Zones) + 地块(Blocks) 两级管理
 */
import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Loader2, MapPin, Layers } from 'lucide-react';
import { Button } from '@/components/ui';
import { Pagination } from '@/components/ui/Pagination';
import { useZoneStore } from '../../stores/useZoneStore';
import { useBlockStore } from '../../stores/useBlockStore';
import { useGreenhouseStore } from '../../stores/useGreenhouseStore';
import { useDictionaryStore, getDictItems } from '../../stores/useDictionaryStore';
import type { Zone, Block } from '../../services/apiBasicDataService';
import { showAlert } from '@/lib/dialogService';

// 区块类型选项（来自系统字典）
const ZONE_TYPES = [
  { value: 'greenhouse', label: '温室大棚' },
  { value: 'plastic_house', label: '塑料大棚' },
  { value: 'glass_house', label: '玻璃温室' },
  { value: 'solar_greenhouse', label: '日光温室' },
  { value: 'open_field', label: '露天种植区' },
  { value: 'other', label: '其他' },
];

const getZoneTypeName = (type: string) => {
  const found = ZONE_TYPES.find(z => z.value === type);
  return found ? found.label : type || '-';
};

const PAGE_SIZE = 10;

export default function BlockTab() {
  const { zones, loading: zonesLoading, loadZones, addZone, editZone, removeZone } = useZoneStore();
  const { blocks, loading: blocksLoading, loadBlocks, addBlock, editBlock, removeBlock } = useBlockStore();
  const { greenhouses, loadGreenhouses } = useGreenhouseStore();
  const { loadDictionaries } = useDictionaryStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [facilityFilter, setFacilityFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeLayer, setActiveLayer] = useState<'zone' | 'block'>('zone');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Zone | Block | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({ status: 'active' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ oid: string; name: string } | null>(null);

  useEffect(() => { loadZones(); loadBlocks(); loadGreenhouses(); loadDictionaries(); }, [loadZones, loadBlocks, loadGreenhouses, loadDictionaries]);

  const blockTypeOptions = getDictItems('block_type');
  const facilityOptions = greenhouses.filter((g) => g.status === 'active');

  const filteredZones = zones.filter((z) => {
    const matchSearch = (z.zoneName || '').toLowerCase().includes(searchTerm.toLowerCase())
      || (z.zoneCode || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchFacility = !facilityFilter || z.greenhouseOid === facilityFilter;
    return matchSearch && matchFacility;
  });

  const totalPages = Math.ceil((activeLayer === 'zone' ? filteredZones.length : blocks.length) / PAGE_SIZE);

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ status: 'active' });
    setShowModal(true);
  };

  const handleEdit = (item: Zone | Block) => {
    setEditingItem(item);
    setFormData({ ...item });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (activeLayer === 'zone') {
        if (!formData.zoneName) { await showAlert('请填写区块名称'); return; }
        if (editingItem && 'zoneCode' in editingItem) {
          await editZone((editingItem as Zone).id, formData);
        } else {
          await addZone(formData);
        }
      } else {
        if (!formData.blockName) { await showAlert('请填写地块名称'); return; }
        if (editingItem && 'blockCode' in editingItem) {
          await editBlock((editingItem as Block).id, formData);
        } else {
          await addBlock(formData);
        }
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
      if (activeLayer === 'zone') {
        await removeZone(showDeleteConfirm.oid);
      } else {
        await removeBlock(showDeleteConfirm.oid);
      }
      setShowDeleteConfirm(null);
    } catch (err) {
      await showAlert('删除失败');
    }
  };

  const isLoading = zonesLoading || blocksLoading;

  return (
    <div>
      {/* 工具栏 */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="搜索名称/编码..." value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        {/* 层级切换 */}
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => { setActiveLayer('zone'); setCurrentPage(1); }}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${activeLayer === 'zone' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-600'}`}>
            区块 ({zones.length})
          </button>
          <button onClick={() => { setActiveLayer('block'); setCurrentPage(1); }}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${activeLayer === 'block' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-600'}`}>
            地块 ({blocks.length})
          </button>
        </div>

        {activeLayer === 'zone' && (
          <select value={facilityFilter} onChange={(e) => { setFacilityFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-1.5 text-sm border border-gray-400 rounded-lg">
            <option value="">全部设施</option>
            {facilityOptions.map((g) => <option key={g.oid} value={g.oid}>{g.name}</option>)}
          </select>
        )}

        <Button size="sm" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-1" />新增{activeLayer === 'zone' ? '区块' : '地块'}
        </Button>
      </div>

      {/* 表格 */}
      {isLoading && <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>}
      {!isLoading && (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                {activeLayer === 'zone' ? (
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">区块编码</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">区块名称</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">所属设施</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">区域类型</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">所属基地</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">面积(亩)</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">状态</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">地块编码</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">地块名称</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">所属区块</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">地块类型</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">面积(亩)</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">状态</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-gray-300 bg-white">
                {activeLayer === 'zone' ? (
                  filteredZones.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                      <Layers className="w-8 h-8 mx-auto mb-2 text-gray-300" />暂无区块数据
                    </td></tr>
                  ) : (
                    filteredZones.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((z) => (
                      <tr key={z.oid} className="hover:bg-blue-100 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono whitespace-nowrap">{z.zoneCode || '-'}</td>
                        <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">{z.zoneName}</td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">{facilityOptions.find((g) => g.oid === z.greenhouseOid)?.name || '-'}</td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">{getZoneTypeName(z.zoneType || '')}</td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">{z.baseName || '-'}</td>
                        <td className="px-4 py-3 text-sm text-right whitespace-nowrap">{z.area || 0}</td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${z.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {z.status === 'active' ? '活跃' : '停用'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleEdit(z)} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded" title="编辑"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => setShowDeleteConfirm({ oid: z.oid, name: z.zoneName })} className="p-1.5 hover:bg-red-50 text-red-500 rounded" title="删除"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )
                ) : (
                  blocks.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                      <Layers className="w-8 h-8 mx-auto mb-2 text-gray-300" />暂无地块数据
                    </td></tr>
                  ) : (
                    blocks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((b) => (
                      <tr key={b.oid} className="hover:bg-blue-100 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono whitespace-nowrap">{b.blockCode || '-'}</td>
                        <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">{b.blockName}</td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">{b.zoneName || '-'}</td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">{b.blockType || '-'}</td>
                        <td className="px-4 py-3 text-sm text-right whitespace-nowrap">{b.area || 0}</td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${b.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {b.status === 'active' ? '活跃' : '停用'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleEdit(b)} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded" title="编辑"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => setShowDeleteConfirm({ oid: b.oid, name: b.blockName })} className="p-1.5 hover:bg-red-50 text-red-500 rounded" title="删除"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>

          {((activeLayer === 'zone' ? filteredZones.length : blocks.length) > 0) && (
            <div className="flex items-center justify-between mt-3 px-4 py-3 border-t border-gray-100">
              <div className="text-sm text-gray-500">共 {activeLayer === 'zone' ? filteredZones.length : blocks.length} 条</div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageSize={PAGE_SIZE}
                onPageSizeChange={() => {}}
                pageSizeOptions={[10, 20, 50]}
                showPageSize={false}
              />
            </div>
          )}
        </>
      )}

      {/* 新增/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/40" onClick={() => { setShowModal(false); setEditingItem(null); }}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()} style={{ minWidth: 540, minHeight: 350 }}>
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-3 flex items-center justify-between">
              <h3 className="text-white font-semibold">
                {editingItem ? '编辑' : '新增'}{activeLayer === 'zone' ? '区块' : '地块'}
              </h3>
              <button onClick={() => { setShowModal(false); setEditingItem(null); }} className="text-white/80 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-[55vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {activeLayer === 'zone' ? (
                  <>
                    <label className="text-xs font-medium text-gray-600">区块名称<span className="text-red-500">*</span>
                      <input value={formData.zoneName || ''} onChange={(e) => setFormData({ ...formData, zoneName: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded" />
                    </label>
                    <label className="text-xs font-medium text-gray-600">区块编码
                      <input value={formData.zoneCode || ''} onChange={(e) => setFormData({ ...formData, zoneCode: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded" />
                    </label>
                    <label className="text-xs font-medium text-gray-600">所属设施
                      <select value={formData.greenhouseOid || ''} onChange={(e) => { const g = facilityOptions.find(x => x.oid === e.target.value); setFormData({ ...formData, greenhouseOid: e.target.value, baseOid: g?.baseOid || '', baseName: g?.baseName || '' }); }} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded">
                        <option value="">请选择</option>
                        {facilityOptions.map((g) => <option key={g.oid} value={g.oid}>{g.name}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-medium text-gray-600">区域类型
                      <select value={formData.zoneType || ''} onChange={(e) => setFormData({ ...formData, zoneType: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded">
                        <option value="">请选择</option>
                        {ZONE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-medium text-gray-600">面积(亩)
                      <input type="number" value={formData.area || ''} onChange={(e) => setFormData({ ...formData, area: Number(e.target.value) })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded" />
                    </label>
                    <label className="text-xs font-medium text-gray-600">排序
                      <input type="number" value={formData.sortOrder || 0} onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded" />
                    </label>
                    <label className="text-xs font-medium text-gray-600 col-span-2">备注
                      <input value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded" />
                    </label>
                  </>
                ) : (
                  <>
                    <label className="text-xs font-medium text-gray-600">地块名称<span className="text-red-500">*</span>
                      <input value={formData.blockName || ''} onChange={(e) => setFormData({ ...formData, blockName: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded" />
                    </label>
                    <label className="text-xs font-medium text-gray-600">地块编码
                      <input value={formData.blockCode || ''} onChange={(e) => setFormData({ ...formData, blockCode: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded" />
                    </label>
                    <label className="text-xs font-medium text-gray-600">所属区块
                      <select value={formData.zoneOid || ''} onChange={(e) => { const z = zones.find(x => x.oid === e.target.value); setFormData({ ...formData, zoneOid: e.target.value, zoneName: z?.zoneName || '', zoneCode: z?.zoneCode || '' }); }} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded">
                        <option value="">请选择</option>
                        {zones.filter(z => z.status === 'active').map((z) => <option key={z.oid} value={z.oid}>{z.zoneName}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-medium text-gray-600">地块类型
                      <select value={formData.blockType || ''} onChange={(e) => setFormData({ ...formData, blockType: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded">
                        <option value="">请选择</option>
                        {blockTypeOptions.map((opt) => <option key={opt.dictCode} value={opt.dictCode}>{opt.dictLabel}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-medium text-gray-600">面积(亩)
                      <input type="number" value={formData.area || ''} onChange={(e) => setFormData({ ...formData, area: Number(e.target.value) })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded" />
                    </label>
                  </>
                )}
                <label className="text-xs font-medium text-gray-600">状态
                  <select value={formData.status || 'active'} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded">
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
            <p className="text-sm text-gray-600 mb-4">确定要删除「{showDeleteConfirm.name}」吗？</p>
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
