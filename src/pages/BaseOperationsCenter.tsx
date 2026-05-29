/**
 * 基地运营中心页面
 * 按基地维度管理：设施管理 + 区域划分 + 种植记录
 */
import { useState, useEffect } from 'react';
import { ArrowLeft, Leaf, CalendarCheck, History, Search, Plus, Edit2, Trash2, Loader2, MapPin, Building2, Layers } from 'lucide-react';
import { Button } from '@/components/ui';
import { Pagination } from '@/components/ui/Pagination';
import { usePlantingRecordStore } from '@/stores/usePlantingRecordStore';
import { useGreenhouseStore } from '@/stores/useGreenhouseStore';
import { useZoneStore } from '@/stores/useZoneStore';
import { useBaseStore } from '@/stores/useBaseStore';
import { useDictionaryStore, getDictItems } from '@/stores/useDictionaryStore';
import type { PlantingRecord } from '@/services/apiPlantingRecordService';
import type { Greenhouse, Zone } from '@/services/apiBasicDataService';
import { showAlert } from '@/lib/dialogService';

const PAGE_SIZE = 10;

// TAB 配置
const TABS = [
  { key: 'facility', label: '设施管理' },
  { key: 'zone', label: '区域划分' },
  { key: 'planting', label: '种植记录' },
] as const;

export default function BaseOperationsCenter() {
  const [activeTab, setActiveTab] = useState<'facility' | 'zone' | 'planting'>('facility');
  const [selectedBaseOid, setSelectedBaseOid] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // 数据加载
  const { records, loading: recordsLoading, loadRecords, addRecord, editRecord, endSeason, removeRecord } = usePlantingRecordStore();
  const { greenhouses, loading: ghLoading, loadGreenhouses, addGreenhouse, editGreenhouse, removeGreenhouse } = useGreenhouseStore();
  const { zones, loading: zoneLoading, loadZones, addZone, editZone, removeZone } = useZoneStore();
  const { bases, loadBases } = useBaseStore();
  const { loadDictionaries } = useDictionaryStore();

  useEffect(() => {
    loadBases();
    loadGreenhouses();
    loadZones();
    loadRecords();
    loadDictionaries();
  }, [loadBases, loadGreenhouses, loadZones, loadRecords, loadDictionaries]);

  const baseName = bases.find((b) => b.oid === selectedBaseOid)?.name || '全部基地';

  return (
    <div className="space-y-4">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <a href="/settings" className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center hover:from-gray-200 hover:to-gray-300 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </a>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">基地运营中心</h1>
              <p className="text-gray-500">按基地管理设施、区域与种植记录</p>
            </div>
          </div>
        </div>
      </div>

      {/* 基地选择器 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-600">当前基地：</label>
          <select
            value={selectedBaseOid}
            onChange={(e) => { setSelectedBaseOid(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-w-[200px]"
          >
            <option value="">全部基地</option>
            {bases.map((b) => (
              <option key={b.oid} value={b.oid}>{b.name}</option>
            ))}
          </select>
          <span className="text-sm text-gray-500">
            {selectedBaseOid ? `正在管理: ${baseName}` : '正在查看全部基地'}
          </span>
        </div>
      </div>

      {/* TAB 切换栏 */}
      <div className="flex gap-0 border-b border-gray-200 bg-white rounded-t-xl">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
            className={`
              px-6 py-3 text-base font-bold border-b-2 transition-all duration-200 rounded-t-md
              ${activeTab === tab.key
                ? 'border-green-600 text-green-700 bg-green-50 shadow-sm'
                : 'border-transparent text-gray-500 hover:text-green-600 hover:bg-green-50/50'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 内容 */}
      <div className="min-h-[500px]">
        {activeTab === 'facility' && (
          <FacilityTab
            greenhouses={greenhouses.filter(g => !selectedBaseOid || g.baseOid === selectedBaseOid)}
            bases={bases}
            loading={ghLoading}
            onAdd={addGreenhouse}
            onEdit={editGreenhouse}
            onRemove={removeGreenhouse}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        )}
        {activeTab === 'zone' && (
          <ZoneTab
            zones={zones.filter(z => {
              if (!selectedBaseOid) return true;
              const gh = greenhouses.find(g => g.oid === z.greenhouseOid);
              return gh?.baseOid === selectedBaseOid;
            })}
            greenhouses={greenhouses.filter(g => !selectedBaseOid || g.baseOid === selectedBaseOid)}
            loading={zoneLoading}
            onAdd={addZone}
            onEdit={editZone}
            onRemove={removeZone}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        )}
        {activeTab === 'planting' && (
          <PlantingTab
            records={records.filter(r => {
              if (!selectedBaseOid) return true;
              const gh = greenhouses.find(g => g.oid === r.facilityOid);
              return gh?.baseOid === selectedBaseOid;
            })}
            greenhouses={greenhouses.filter(g => !selectedBaseOid || g.baseOid === selectedBaseOid)}
            loading={recordsLoading}
            onAdd={addRecord}
            onEdit={editRecord}
            onEnd={endSeason}
            onRemove={removeRecord}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        )}
      </div>
    </div>
  );
}

/* ==================== 设施管理子组件 ==================== */
function FacilityTab({
  greenhouses, bases, loading, onAdd, onEdit, onRemove, searchTerm, setSearchTerm
}: {
  greenhouses: Greenhouse[];
  bases: any[];
  loading: boolean;
  onAdd: any;
  onEdit: any;
  onRemove: any;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Greenhouse | null>(null);
  const [formData, setFormData] = useState<Partial<Greenhouse>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<Greenhouse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { loadDictionaries } = useDictionaryStore();
  const facilityTypes = getDictItems('greenhouse_type');

  const filtered = greenhouses.filter(gh =>
    (gh.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (gh.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleAdd = () => { setEditing(null); setFormData({ status: 'active' }); setShowModal(true); };
  const handleEdit = (gh: Greenhouse) => { setEditing(gh); setFormData({ ...gh }); setShowModal(true); };
  const handleSave = async () => {
    if (!formData.name || !formData.code) { await showAlert('请填写名称和编码'); return; }
    try {
      if (editing) await onEdit(editing.id, formData);
      else await onAdd(formData);
      setShowModal(false);
    } catch { await showAlert('保存失败'); }
  };
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try { await onRemove(deleteConfirm.id); setDeleteConfirm(null); } catch { await showAlert('删除失败'); }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="搜索设施..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-400 rounded-lg" />
        </div>
        <Button size="sm" onClick={handleAdd}><Plus className="w-4 h-4 mr-1" />新增设施</Button>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-green-500" /></div> : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">编码</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">类型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">所属基地</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">面积(亩)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">当前作物</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">状态</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {paginated.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400"><MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />暂无设施</td></tr>
              ) : paginated.map(gh => (
                <tr key={gh.oid} className="hover:bg-green-50">
                  <td className="px-4 py-3 text-sm font-mono">{gh.code || '-'}</td>
                  <td className="px-4 py-3 text-sm font-medium">{gh.name}</td>
                  <td className="px-4 py-3 text-sm">{gh.greenhouseType || '-'}</td>
                  <td className="px-4 py-3 text-sm">{gh.baseName || '-'}</td>
                  <td className="px-4 py-3 text-sm text-right">{gh.area || 0}</td>
                  <td className="px-4 py-3 text-sm">{gh.crop || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${gh.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {gh.status === 'active' ? '活跃' : '停用'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => handleEdit(gh)} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteConfirm(gh)} className="p-1.5 hover:bg-red-50 text-red-500 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && <div className="flex justify-between mt-3 px-4">
        <div className="text-sm text-gray-500">共 {filtered.length} 条</div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} pageSize={PAGE_SIZE}
          onPageSizeChange={() => {}} pageSizeOptions={[10, 20, 50]} showPageSize={false} />
      </div>}

      {/* 新增/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-3 flex justify-between">
              <h3 className="text-white font-semibold">{editing ? '编辑设施' : '新增设施'}</h3>
              <button onClick={() => setShowModal(false)} className="text-white/80"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-medium text-gray-600">名称<span className="text-red-500">*</span>
                  <input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded" />
                </label>
                <label className="text-xs font-medium text-gray-600">编码<span className="text-red-500">*</span>
                  <input value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded" />
                </label>
                <label className="text-xs font-medium text-gray-600">类型
                  <select value={formData.greenhouseType || ''} onChange={e => setFormData({ ...formData, greenhouseType: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded">
                    <option value="">请选择</option>
                    {facilityTypes.map(o => <option key={o.dictCode} value={o.dictCode}>{o.dictLabel}</option>)}
                  </select>
                </label>
                <label className="text-xs font-medium text-gray-600">所属基地
                  <select value={formData.baseOid || ''} onChange={e => setFormData({ ...formData, baseOid: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded">
                    <option value="">请选择</option>
                    {bases.map(b => <option key={b.oid} value={b.oid}>{b.name}</option>)}
                  </select>
                </label>
                <label className="text-xs font-medium text-gray-600">面积(亩)
                  <input type="number" value={formData.area || ''} onChange={e => setFormData({ ...formData, area: Number(e.target.value) })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded" />
                </label>
                <label className="text-xs font-medium text-gray-600">当前作物
                  <input value={formData.crop || ''} onChange={e => setFormData({ ...formData, crop: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded bg-green-50" />
                </label>
              </div>
              <label className="text-xs font-medium text-gray-600">位置
                <input value={formData.location || ''} onChange={e => setFormData({ ...formData, location: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded" />
              </label>
              <label className="text-xs font-medium text-gray-600">状态
                <select value={formData.status || 'active'} onChange={e => setFormData({ ...formData, status: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded">
                  <option value="active">活跃</option><option value="inactive">停用</option>
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t bg-gray-50">
              <Button size="sm" variant="secondary" onClick={() => setShowModal(false)}>取消</Button>
              <Button size="sm" onClick={handleSave}>保存</Button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-lg p-6 w-96" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-2">确认删除</h3>
            <p className="text-sm text-gray-600 mb-4">确定删除「{deleteConfirm.name}」？</p>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setDeleteConfirm(null)}>取消</Button>
              <Button size="sm" variant="destructive" onClick={handleDelete}>删除</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== 区域划分子组件 ==================== */
function ZoneTab({
  zones, greenhouses, loading, onAdd, onEdit, onRemove, searchTerm, setSearchTerm
}: {
  zones: Zone[];
  greenhouses: Greenhouse[];
  loading: boolean;
  onAdd: any;
  onEdit: any;
  onRemove: any;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Zone | null>(null);
  const [formData, setFormData] = useState<Partial<Zone>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<Zone | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const zoneTypes = [
    { value: 'greenhouse', label: '温室大棚' },
    { value: 'plastic_house', label: '塑料大棚' },
    { value: 'glass_house', label: '玻璃温室' },
    { value: 'solar_greenhouse', label: '日光温室' },
    { value: 'open_field', label: '露天种植区' },
    { value: 'other', label: '其他' },
  ];

  const filtered = zones.filter(z =>
    (z.zoneName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (z.zoneCode || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleAdd = () => { setEditing(null); setFormData({ status: 'active' }); setShowModal(true); };
  const handleEdit = (z: Zone) => { setEditing(z); setFormData({ ...z }); setShowModal(true); };
  const handleSave = async () => {
    if (!formData.zoneName) { await showAlert('请填写名称'); return; }
    try {
      if (editing) await onEdit(editing.id, formData);
      else await onAdd(formData);
      setShowModal(false);
    } catch { await showAlert('保存失败'); }
  };
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try { await onRemove(deleteConfirm.oid); setDeleteConfirm(null); } catch { await showAlert('删除失败'); }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="搜索区域..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-400 rounded-lg" />
        </div>
        <Button size="sm" onClick={handleAdd}><Plus className="w-4 h-4 mr-1" />新增区域</Button>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-green-500" /></div> : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">编码</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">所属温室</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">区域类型</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">面积(亩)</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">状态</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {paginated.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400"><Layers className="w-8 h-8 mx-auto mb-2 text-gray-300" />暂无区域</td></tr>
              ) : paginated.map(z => (
                <tr key={z.oid} className="hover:bg-green-50">
                  <td className="px-4 py-3 text-sm font-mono">{z.zoneCode || '-'}</td>
                  <td className="px-4 py-3 text-sm font-medium">{z.zoneName}</td>
                  <td className="px-4 py-3 text-sm">{greenhouses.find(g => g.oid === z.greenhouseOid)?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{z.zoneType ? zoneTypes.find(t => t.value === z.zoneType)?.label : '-'}</td>
                  <td className="px-4 py-3 text-sm text-right">{z.area || 0}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${z.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {z.status === 'active' ? '活跃' : '停用'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => handleEdit(z)} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteConfirm(z)} className="p-1.5 hover:bg-red-50 text-red-500 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && <div className="flex justify-between mt-3 px-4">
        <div className="text-sm text-gray-500">共 {filtered.length} 条</div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} pageSize={PAGE_SIZE}
          onPageSizeChange={() => {}} pageSizeOptions={[10, 20, 50]} showPageSize={false} />
      </div>}

      {/* 弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-3 flex justify-between">
              <h3 className="text-white font-semibold">{editing ? '编辑区域' : '新增区域'}</h3>
              <button onClick={() => setShowModal(false)} className="text-white/80"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-medium text-gray-600">名称<span className="text-red-500">*</span>
                  <input value={formData.zoneName || ''} onChange={e => setFormData({ ...formData, zoneName: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded" />
                </label>
                <label className="text-xs font-medium text-gray-600">编码
                  <input value={formData.zoneCode || ''} onChange={e => setFormData({ ...formData, zoneCode: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded" />
                </label>
                <label className="text-xs font-medium text-gray-600">所属温室
                  <select value={formData.greenhouseOid || ''} onChange={e => setFormData({ ...formData, greenhouseOid: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded">
                    <option value="">请选择</option>
                    {greenhouses.map(g => <option key={g.oid} value={g.oid}>{g.name}</option>)}
                  </select>
                </label>
                <label className="text-xs font-medium text-gray-600">区域类型
                  <select value={formData.zoneType || ''} onChange={e => setFormData({ ...formData, zoneType: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded">
                    <option value="">请选择</option>
                    {zoneTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </label>
                <label className="text-xs font-medium text-gray-600">面积(亩)
                  <input type="number" value={formData.area || ''} onChange={e => setFormData({ ...formData, area: Number(e.target.value) })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded" />
                </label>
                <label className="text-xs font-medium text-gray-600">排序
                  <input type="number" value={formData.sortOrder || 0} onChange={e => setFormData({ ...formData, sortOrder: Number(e.target.value) })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded" />
                </label>
              </div>
              <label className="text-xs font-medium text-gray-600">备注
                <input value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded" />
              </label>
              <label className="text-xs font-medium text-gray-600">状态
                <select value={formData.status || 'active'} onChange={e => setFormData({ ...formData, status: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded">
                  <option value="active">活跃</option><option value="inactive">停用</option>
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t bg-gray-50">
              <Button size="sm" variant="secondary" onClick={() => setShowModal(false)}>取消</Button>
              <Button size="sm" onClick={handleSave}>保存</Button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-lg p-6 w-96" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-2">确认删除</h3>
            <p className="text-sm text-gray-600 mb-4">确定删除「{deleteConfirm.zoneName}」？</p>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setDeleteConfirm(null)}>取消</Button>
              <Button size="sm" variant="destructive" onClick={handleDelete}>删除</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== 种植记录子组件 ==================== */
function PlantingTab({
  records, greenhouses, loading, onAdd, onEdit, onEnd, onRemove, searchTerm, setSearchTerm
}: {
  records: PlantingRecord[];
  greenhouses: Greenhouse[];
  loading: boolean;
  onAdd: any;
  onEdit: any;
  onEnd: any;
  onRemove: any;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<PlantingRecord | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<PlantingRecord | null>(null);
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const { loadDictionaries } = useDictionaryStore();
  const statusOptions = getDictItems('planting_season_status');

  const filtered = records.filter(r => {
    const matchSearch = !searchTerm || (r.seasonCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.cropName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchActive = !showOnlyActive || r.status === 'planting';
    return matchSearch && matchActive;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleAdd = () => { setCurrentRecord(null); setFormData({ status: 'planting', start_date: new Date().toISOString().slice(0, 10) }); setShowCreateModal(true); };
  const handleEdit = (r: PlantingRecord) => { setCurrentRecord(r); setFormData({ crop_name: r.cropName, variety_name: r.varietyName, start_date: r.startDate?.slice(0, 10), notes: r.notes || '' }); setShowEditModal(true); };
  const handleEnd = (r: PlantingRecord) => { setCurrentRecord(r); setFormData({ end_date: new Date().toISOString().slice(0, 10), yield_amount: '', yield_unit: 'kg', quality_grade: '', notes: '' }); setShowEndModal(true); };
  const handleSaveAdd = async () => {
    if (!formData.facility_oid || !formData.crop_name) { await showAlert('请选择设施和填写作物'); return; }
    try { await onAdd({ facility_oid: formData.facility_oid, crop_name: formData.crop_name, variety_name: formData.variety_name || '', start_date: formData.start_date, notes: formData.notes || '' }); setShowCreateModal(false); } catch { await showAlert('创建失败'); }
  };
  const handleSaveEdit = async () => {
    if (!currentRecord) return;
    try { await onEdit(currentRecord.oid, formData); setShowEditModal(false); } catch { await showAlert('更新失败'); }
  };
  const handleSaveEnd = async () => {
    if (!currentRecord || !formData.end_date) { await showAlert('请填写结束日期'); return; }
    try { await onEnd(currentRecord.oid, { end_date: formData.end_date, yield_amount: Number(formData.yield_amount) || 0, yield_unit: formData.yield_unit, quality_grade: formData.quality_grade, notes: formData.notes }); setShowEndModal(false); } catch { await showAlert('结束失败'); }
  };
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try { await onRemove(deleteConfirm.oid); setDeleteConfirm(null); } catch { await showAlert('删除失败'); }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="搜索..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-400 rounded-lg" />
        </div>
        <button onClick={() => setShowOnlyActive(!showOnlyActive)} className={`px-3 py-1.5 text-sm rounded-lg border ${showOnlyActive ? 'bg-green-50 border-green-300 text-green-600' : 'border-gray-400'}`}>
          {showOnlyActive ? '种植中' : '全部'}
        </button>
        <Button size="sm" onClick={handleAdd}><Plus className="w-4 h-4 mr-1" />新增种植季</Button>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-green-500" /></div> : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">编码</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">设施</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">作物</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">开始</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">结束</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">状态</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">产量</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {paginated.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400"><Leaf className="w-8 h-8 mx-auto mb-2 text-gray-300" />暂无种植记录</td></tr>
              ) : paginated.map(r => (
                <tr key={r.oid} className="hover:bg-green-50">
                  <td className="px-4 py-3 text-sm font-mono font-semibold text-green-600">{r.seasonCode}</td>
                  <td className="px-4 py-3 text-sm">{greenhouses.find(g => g.oid === r.facilityOid)?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{r.cropName}{r.varietyName ? ` · ${r.varietyName}` : ''}</td>
                  <td className="px-4 py-3 text-sm">{r.startDate?.slice(0, 10) || '-'}</td>
                  <td className="px-4 py-3 text-sm">{r.endDate?.slice(0, 10) || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${r.status === 'planting' ? 'bg-blue-100 text-blue-700' : r.status === 'harvested' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {statusOptions.find(s => s.dictCode === r.status)?.dictLabel || r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">{r.yieldAmount ?? '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      {r.status === 'planting' && <button onClick={() => handleEnd(r)} className="p-1.5 hover:bg-green-50 text-green-500 rounded" title="结束"><CalendarCheck className="w-4 h-4" /></button>}
                      <button onClick={() => handleEdit(r)} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteConfirm(r)} className="p-1.5 hover:bg-red-50 text-red-500 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && <div className="flex justify-between mt-3 px-4">
        <div className="text-sm text-gray-500">共 {filtered.length} 条</div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} pageSize={PAGE_SIZE}
          onPageSizeChange={() => {}} pageSizeOptions={[10, 20, 50]} showPageSize={false} />
      </div>}

      {/* 创建弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/40" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-3 flex justify-between">
              <h3 className="text-white font-semibold">新增种植季</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-white/80"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-5 space-y-3">
              <label className="text-xs font-medium text-gray-600">设施<span className="text-red-500">*</span>
                <select value={formData.facility_oid || ''} onChange={e => setFormData({ ...formData, facility_oid: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded">
                  <option value="">请选择</option>
                  {greenhouses.map(g => <option key={g.oid} value={g.oid}>{g.name}</option>)}
                </select>
              </label>
              <label className="text-xs font-medium text-gray-600">作物名称<span className="text-red-500">*</span>
                <input value={formData.crop_name || ''} onChange={e => setFormData({ ...formData, crop_name: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded" />
              </label>
              <label className="text-xs font-medium text-gray-600">品种
                <input value={formData.variety_name || ''} onChange={e => setFormData({ ...formData, variety_name: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded" />
              </label>
              <label className="text-xs font-medium text-gray-600">开始日期
                <input type="date" value={formData.start_date || ''} onChange={e => setFormData({ ...formData, start_date: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded" />
              </label>
              <label className="text-xs font-medium text-gray-600">备注
                <textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded resize-none" />
              </label>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t bg-gray-50">
              <Button size="sm" variant="secondary" onClick={() => setShowCreateModal(false)}>取消</Button>
              <Button size="sm" onClick={handleSaveAdd}>创建</Button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑弹窗 */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/40" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-3 flex justify-between">
              <h3 className="text-white font-semibold">编辑种植记录</h3>
              <button onClick={() => setShowEditModal(false)} className="text-white/80"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-5 space-y-3">
              <label className="text-xs font-medium text-gray-600">作物名称
                <input value={formData.crop_name || ''} onChange={e => setFormData({ ...formData, crop_name: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded" />
              </label>
              <label className="text-xs font-medium text-gray-600">品种
                <input value={formData.variety_name || ''} onChange={e => setFormData({ ...formData, variety_name: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded" />
              </label>
              <label className="text-xs font-medium text-gray-600">开始日期
                <input type="date" value={formData.start_date || ''} onChange={e => setFormData({ ...formData, start_date: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded" />
              </label>
              <label className="text-xs font-medium text-gray-600">备注
                <textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded resize-none" />
              </label>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t bg-gray-50">
              <Button size="sm" variant="secondary" onClick={() => setShowEditModal(false)}>取消</Button>
              <Button size="sm" onClick={handleSaveEdit}>保存</Button>
            </div>
          </div>
        </div>
      )}

      {/* 结束弹窗 */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/40" onClick={() => setShowEndModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-3 flex justify-between">
              <h3 className="text-white font-semibold">结束种植季</h3>
              <button onClick={() => setShowEndModal(false)} className="text-white/80"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-600">结束「<span className="font-semibold text-green-600">{currentRecord?.seasonCode}</span>」</p>
              <label className="text-xs font-medium text-gray-600">结束日期<span className="text-red-500">*</span>
                <input type="date" value={formData.end_date || ''} onChange={e => setFormData({ ...formData, end_date: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-medium text-gray-600">产量
                  <input type="number" value={formData.yield_amount || ''} onChange={e => setFormData({ ...formData, yield_amount: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded" />
                </label>
                <label className="text-xs font-medium text-gray-600">单位
                  <select value={formData.yield_unit || 'kg'} onChange={e => setFormData({ ...formData, yield_unit: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded">
                    <option value="kg">千克</option><option value="ton">吨</option><option value="jin">斤</option>
                  </select>
                </label>
              </div>
              <label className="text-xs font-medium text-gray-600">品质
                <select value={formData.quality_grade || ''} onChange={e => setFormData({ ...formData, quality_grade: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded">
                  <option value="">请选择</option>
                  <option value="A">A级</option><option value="B">B级</option><option value="C">C级</option>
                </select>
              </label>
              <label className="text-xs font-medium text-gray-600">备注
                <textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-400 rounded resize-none" />
              </label>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t bg-gray-50">
              <Button size="sm" variant="secondary" onClick={() => setShowEndModal(false)}>取消</Button>
              <Button size="sm" onClick={handleSaveEnd}>确认结束</Button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-lg p-6 w-96" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-2">确认删除</h3>
            <p className="text-sm text-gray-600 mb-4">确定删除「{deleteConfirm.seasonCode}」？</p>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setDeleteConfirm(null)}>取消</Button>
              <Button size="sm" variant="destructive" onClick={handleDelete}>删除</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
