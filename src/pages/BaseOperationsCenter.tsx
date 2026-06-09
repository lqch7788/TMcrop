/**
 * 基地运营中心页面
 * 按基地维度管理：种植区管理 + 区块划分 + 种植记录
 * baseOid 从 URL 参数传入，如 /settings/base-operations?baseOid=xxx
 */
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Building2, CalendarCheck, Check, Edit2, History, Layers, Leaf, Loader2, MapPin, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { Pagination } from '@/components/ui';
import { usePlantingRecordStore } from '@/stores/usePlantingRecordStore';
import { useGreenhouseStore } from '@/stores/useGreenhouseStore';
import { useZoneStore } from '@/stores/useZoneStore';
import { useBaseStore } from '@/stores/useBaseStore';
import { useDictionaryStore, getDictItems } from '@/stores/useDictionaryStore';
import type { PlantingRecord } from '@/services/apiPlantingRecordService';
import type { Greenhouse, Zone } from '@/services/apiBasicDataService';
import { showAlert } from '@/lib/dialogService';
import { Modal } from '@/components/ui';

const PAGE_SIZE = 10;

// TAB 配置
const TABS = [
  { key: 'facility', label: '种植区管理' },
  { key: 'zone', label: '区块划分' },
  { key: 'planting', label: '种植记录' },
] as const;

export default function BaseOperationsCenter() {
  const [searchParams] = useSearchParams();
  // URL 参数优先，否则默认使用宁波北仑基地
  const baseOidFromUrl = searchParams.get('baseOid') || 'base_1780023508412';

  const [activeTab, setActiveTab] = useState<'facility' | 'zone' | 'planting'>('facility');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [baseName, setBaseName] = useState('加载中...');

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

  // 根据 URL 参数获取基地名称
  useEffect(() => {
    if (bases.length > 0) {
      const found = bases.find((b) => b.oid === baseOidFromUrl);
      if (found) {
        setBaseName(found.name);
      } else {
        // 尝试模糊匹配
        const fuzzy = bases.find((b) => b.oid?.includes(baseOidFromUrl) || baseOidFromUrl.includes(b.oid || ''));
        setBaseName(fuzzy?.name || '未知基地');
      }
    }
  }, [baseOidFromUrl, bases]);

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
              <p className="text-gray-500">当前基地：<span className="text-emerald-600 font-semibold">{baseName}</span></p>
            </div>
          </div>
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
            greenhouses={greenhouses.filter(g => !baseOidFromUrl || g.baseOid === baseOidFromUrl)}
            bases={bases}
            baseOid={baseOidFromUrl}
            baseName={baseName}
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
              if (!baseOidFromUrl) return true;
              const gh = greenhouses.find(g => g.oid === z.greenhouseOid);
              return gh?.baseOid === baseOidFromUrl;
            })}
            greenhouses={greenhouses.filter(g => !baseOidFromUrl || g.baseOid === baseOidFromUrl)}
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
              if (!baseOidFromUrl) return true;
              const gh = greenhouses.find(g => g.oid === r.facilityOid);
              return gh?.baseOid === baseOidFromUrl;
            })}
            greenhouses={greenhouses.filter(g => !baseOidFromUrl || g.baseOid === baseOidFromUrl)}
	            zones={zones}
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

/* ==================== 种植区管理子组件 ==================== */
export function FacilityTab({
  greenhouses, bases, baseOid, baseName, loading, onAdd, onEdit, onRemove, searchTerm, setSearchTerm
}: {
  greenhouses: Greenhouse[];
  bases: any[];
  baseOid: string;
  baseName: string;
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

  // 面积单位选项
  const areaUnits = [
    { value: '亩', label: '亩' },
    { value: '平方米', label: '平方米' },
    { value: '公顷', label: '公顷' },
    { value: '个', label: '个' },
    { value: '栋', label: '栋' },
    { value: '座', label: '座' },
  ];

  // 温室类型映射
  const greenhouseTypeMap: Record<string, string> = {
    'glass': '玻璃温室',
    'solar': '日光温室',
    'plastic': '塑料大棚',
    'open': '露天种植区',
    'film_greenhouse': '联动薄膜温室',
    'solar_tunnel': '日光拱棚',
    'tissue_culture': '组培室',
    'breeding_greenhouse': '育种温室',
    'nursery_greenhouse': '驯化育苗温室',
    'other_facility': '其他设施',
    'greenhouse': '温室',
    'tent': '拱棚',
    '普通大棚': '普通大棚',
    '智能大棚': '智能大棚',
  };

  const filtered = greenhouses.filter(gh =>
    (gh.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (gh.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleAdd = () => {
    // 自动设置当前基地
    const currentBase = bases.find(b => b.oid === baseOid);
    setEditing(null);
    setFormData({ status: 'active', baseOid: baseOid, baseName: currentBase?.name || baseName, unit: '亩' });
    setShowModal(true);
  };
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
          <input type="text" placeholder="搜索种植区..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg" />
        </div>
        <Button size="sm" onClick={handleAdd}><Plus className="w-4 h-4 mr-1" />新增种植区</Button>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-green-500" /></div> : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full table-fixed">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/9">编码</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/9">名称</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/9">类型</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/9">面积</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/9">单位</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/9">种植类型</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/9">状态</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/9">备注</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/9">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {paginated.length === 0 ? (
                <tr><td colSpan={9} className="px-3 py-12 text-center text-gray-400"><MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />暂无种植区</td></tr>
              ) : paginated.map(gh => (
                <tr key={gh.oid} className="hover:bg-green-50">
                  <td className="px-2 py-3 text-sm text-center truncate">{gh.code || '-'}</td>
                  <td className="px-2 py-3 text-sm text-center truncate">{gh.name}</td>
                  <td className="px-2 py-3 text-sm text-center truncate">
                    {facilityTypes.find(f => f.dictCode === gh.greenhouseType)?.dictLabel || gh.greenhouseType || '-'}
                  </td>
                  <td className="px-2 py-3 text-sm text-center">{gh.area || 0}</td>
                  <td className="px-2 py-3 text-sm text-center">{gh.unit || '亩'}</td>
                  <td className="px-2 py-3 text-sm text-center">
                    {gh.crop === 'vegetable' ? '蔬菜' :
                     gh.crop === 'grain' ? '粮食' :
                     gh.crop === 'fruit' ? '水果' :
                     gh.crop === 'other' ? '其他' : '-'}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${gh.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {gh.status === 'active' ? '活跃' : '停用'}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-center truncate" title={gh.description || '-'}>
                    {gh.description || '-'}
                  </td>
                  <td className="px-2 py-3 text-center">
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
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? '编辑种植区' : '新增种植区'}
        size="xxl"
        enableDrag
        enableResize
        showFooter
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowModal(false)}><X className="w-4 h-4" /> 取消</Button>
            <Button size="sm" onClick={handleSave}><Save className="w-4 h-4" /> 保存</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs font-medium text-gray-600">编码<span className="text-red-500">*</span>
              <div className="flex gap-1 mt-1">
                <input value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} disabled={!!editing} className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed" />
                {!editing && (
                  <button type="button" onClick={async () => {
                    if (!baseOid) { await showAlert('请先选择基地'); return; }
                    try {
                      const res = await fetch(`/api/code-generator/next-greenhouse-code?baseOid=${baseOid}`);
                      const json = await res.json();
                      if (json.success) setFormData({ ...formData, code: json.data.code });
                      else await showAlert(json.error || '生成编码失败');
                    } catch { await showAlert('生成编码失败，请检查网络'); }
                  }} className="px-2 py-1.5 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200">生成</button>
                )}
              </div>
            </label>
            <label className="text-xs font-medium text-gray-600">名称<span className="text-red-500">*</span>
              <input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
            </label>
            <label className="text-xs font-medium text-gray-600">类型
              <select value={formData.greenhouseType || ''} onChange={e => setFormData({ ...formData, greenhouseType: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
                <option value="">请选择</option>
                {facilityTypes.map(o => <option key={o.dictCode} value={o.dictCode}>{o.dictLabel}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">面积
              <input type="number" value={formData.area || ''} onChange={e => setFormData({ ...formData, area: Number(e.target.value) })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
            </label>
            <label className="text-xs font-medium text-gray-600">单位
              <select value={formData.unit || '亩'} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
                {areaUnits.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">种植类型
              <select value={formData.crop || ''} onChange={e => setFormData({ ...formData, crop: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
                <option value="">请选择</option>
                <option value="vegetable">蔬菜</option>
                <option value="grain">粮食</option>
                <option value="fruit">水果</option>
                <option value="other">其他</option>
              </select>
            </label>
          </div>
          <label className="text-xs font-medium text-gray-600">位置
            <input value={formData.location || ''} onChange={e => setFormData({ ...formData, location: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
          </label>
          <label className="text-xs font-medium text-gray-600">状态
            <select value={formData.status || 'active'} onChange={e => setFormData({ ...formData, status: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
              <option value="active">活跃</option><option value="inactive">停用</option>
            </select>
          </label>
          <label className="text-xs font-medium text-gray-600">备注
            <textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded resize-none" />
          </label>
        </div>
      </Modal>

      {/* 删除确认 */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="确认删除"
        size="sm"
        enableDrag
        enableResize
        showFooter
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setDeleteConfirm(null)}><X className="w-4 h-4" /> 取消</Button>
            <Button size="sm" variant="destructive" onClick={handleDelete}><Trash2 className="w-4 h-4" /> 删除</Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600">确定删除「{deleteConfirm?.name}」？</p>
      </Modal>
    </div>
  );
}

/* ==================== 区块划分子组件 ==================== */
export function ZoneTab({
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

  const handleAdd = () => { setEditing(null); setFormData({ status: 'active', greenhouseOid: greenhouses[0]?.oid || '' }); setShowModal(true); };
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
          <input type="text" placeholder="搜索区块..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg" />
        </div>
        <Button size="sm" onClick={handleAdd}><Plus className="w-4 h-4 mr-1" />新增区块</Button>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-green-500" /></div> : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full table-fixed">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/8">编码</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/8">名称</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/8">所属温室</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/8">区域类型</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/8">面积(亩)</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/8">状态</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/8">备注</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/8">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {paginated.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-12 text-center text-gray-400"><Layers className="w-8 h-8 mx-auto mb-2 text-gray-300" />暂无区块</td></tr>
              ) : paginated.map(z => (
                <tr key={z.oid} className="hover:bg-green-50">
                  <td className="px-2 py-3 text-sm text-center truncate">{z.zoneCode || '-'}</td>
                  <td className="px-2 py-3 text-sm text-center truncate">{z.zoneName}</td>
                  <td className="px-2 py-3 text-sm text-center truncate">{greenhouses.find(g => g.oid === z.greenhouseOid)?.name || '-'}</td>
                  <td className="px-2 py-3 text-sm text-center truncate">{z.zoneType ? zoneTypes.find(t => t.value === z.zoneType)?.label : '-'}</td>
                  <td className="px-2 py-3 text-sm text-center">{z.area || 0}</td>
                  <td className="px-2 py-3 text-center">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${z.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {z.status === 'active' ? '活跃' : '停用'}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-sm text-center truncate" title={z.description || '-'}>
                    {z.description || '-'}
                  </td>
                  <td className="px-2 py-3 text-center">
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
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? '编辑区块' : '新增区块'}
        size="xxl"
        enableDrag
        enableResize
        showFooter
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowModal(false)}><X className="w-4 h-4" /> 取消</Button>
            <Button size="sm" onClick={handleSave}><Save className="w-4 h-4" /> 保存</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs font-medium text-gray-600">编码
              <div className="flex gap-1 mt-1">
                <input value={formData.zoneCode || ''} onChange={e => setFormData({ ...formData, zoneCode: e.target.value })} disabled={!!editing} className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed" />
                {!editing && (
                  <button type="button" disabled={!formData.greenhouseOid} onClick={async () => {
                    if (!formData.greenhouseOid) { await showAlert('请先选择所属温室'); return; }
                    try {
                      const res = await fetch(`/api/code-generator/next-zone-code?greenhouseOid=${formData.greenhouseOid}`);
                      const json = await res.json();
                      if (json.success) setFormData({ ...formData, zoneCode: json.data.code });
                      else await showAlert(json.error || '生成编码失败');
                    } catch { await showAlert('生成编码失败，请检查网络'); }
                  }} className="px-2 py-1.5 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed">生成</button>
                )}
              </div>
            </label>
            <label className="text-xs font-medium text-gray-600">名称<span className="text-red-500">*</span>
              <input value={formData.zoneName || ''} onChange={e => setFormData({ ...formData, zoneName: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
            </label>
            <label className="text-xs font-medium text-gray-600">所属温室
              <select value={formData.greenhouseOid || ''} onChange={e => setFormData({ ...formData, greenhouseOid: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
                <option value="">请选择</option>
                {greenhouses.map(g => <option key={g.oid} value={g.oid}>{g.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">区域类型
              <select value={formData.zoneType || ''} onChange={e => setFormData({ ...formData, zoneType: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
                <option value="">请选择</option>
                {zoneTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">面积(亩)
              <input type="number" value={formData.area || ''} onChange={e => setFormData({ ...formData, area: Number(e.target.value) })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
            </label>
            <label className="text-xs font-medium text-gray-600">状态
              <select value={formData.status || 'active'} onChange={e => setFormData({ ...formData, status: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
                <option value="active">活跃</option><option value="inactive">停用</option>
              </select>
            </label>
          </div>
          <label className="text-xs font-medium text-gray-600">备注
            <input value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
          </label>
        </div>
      </Modal>

      {deleteConfirm && (
        <Modal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          title="确认删除"
          size="sm"
          enableDrag
          enableResize
          showFooter
          footer={
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setDeleteConfirm(null)}><X className="w-4 h-4" /> 取消</Button>
              <Button size="sm" variant="destructive" onClick={handleDelete}><Trash2 className="w-4 h-4" /> 删除</Button>
            </div>
          }
        >
          <p className="text-sm text-gray-600">确定删除「{deleteConfirm?.zoneName}」？</p>
        </Modal>
      )}
    </div>
  );
}

/* ==================== 种植记录子组件 ==================== */
export function PlantingTab({
  records, greenhouses, zones, loading, onAdd, onEdit, onEnd, onRemove, searchTerm, setSearchTerm
}: {
  records: PlantingRecord[];
  greenhouses: Greenhouse[];
  zones: Zone[];
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

  // 根据选中的种植区获取对应的区域列表
  const selectedFacilityZones = zones.filter(z => z.greenhouseOid === formData.facility_oid);

  const handleAdd = () => {
    setCurrentRecord(null);
    setFormData({ status: 'planting', start_date: new Date().toISOString().slice(0, 10), zone_oid: '', facility_oid: '', crop_name: '', variety_name: '' });
    setShowCreateModal(true);
  };
  const handleEdit = (r: PlantingRecord) => {
    setCurrentRecord(r);
    setFormData({
      crop_name: r.cropName,
      variety_name: r.varietyName,
      start_date: r.startDate?.slice(0, 10),
      notes: r.notes || '',
      zone_oid: r.zoneOid || '',
      facility_oid: r.facilityOid || ''
    });
    setShowEditModal(true);
  };
  const handleEnd = (r: PlantingRecord) => { setCurrentRecord(r); setFormData({ end_date: new Date().toISOString().slice(0, 10), yield_amount: '', yield_unit: 'kg', quality_grade: '', notes: '' }); setShowEndModal(true); };
  const handleSaveAdd = async () => {
    if (!formData.facility_oid || !formData.zone_oid || !formData.crop_name) { await showAlert('请选择种植区、区域和填写作物'); return; }
    try {
      await onAdd({
        facility_oid: formData.facility_oid,
        zone_oid: formData.zone_oid,
        crop_name: formData.crop_name,
        variety_name: formData.variety_name || '',
        start_date: formData.start_date,
        notes: formData.notes || ''
      });
      setShowCreateModal(false);
    } catch { await showAlert('创建失败'); }
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
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg" />
        </div>
        <button onClick={() => setShowOnlyActive(!showOnlyActive)} className={`px-3 py-1.5 text-sm rounded-lg border ${showOnlyActive ? 'bg-green-50 border-green-300 text-green-600' : 'border-gray-400'}`}>
          {showOnlyActive ? '种植中' : '全部'}
        </button>
        <Button size="sm" onClick={handleAdd}><Plus className="w-4 h-4 mr-1" />新增种植季</Button>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-green-500" /></div> : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full table-fixed">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/10">编码</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/10">种植区</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/10">区域</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/10">作物</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/10">开始</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/10">结束</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/10">状态</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/10">产量</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/10">备注</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/10">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {paginated.length === 0 ? (
                <tr><td colSpan={10} className="px-3 py-12 text-center text-gray-400"><Leaf className="w-8 h-8 mx-auto mb-2 text-gray-300" />暂无种植记录</td></tr>
              ) : paginated.map(r => (
                <tr key={r.oid} className="hover:bg-green-50">
                  <td className="px-2 py-3 text-sm text-center font-mono font-semibold text-green-600 truncate">{r.seasonCode}</td>
                  <td className="px-2 py-3 text-sm text-center truncate">{greenhouses.find(g => g.oid === r.facilityOid)?.name || '-'}</td>
                  <td className="px-2 py-3 text-sm text-center truncate">{zones.find(z => z.oid === r.zoneOid)?.zoneName || '-'}</td>
                  <td className="px-2 py-3 text-sm text-center truncate">{r.cropName}{r.varietyName ? ` · ${r.varietyName}` : ''}</td>
                  <td className="px-2 py-3 text-sm text-center">{r.startDate?.slice(0, 10) || '-'}</td>
                  <td className="px-2 py-3 text-sm text-center">{r.endDate?.slice(0, 10) || '-'}</td>
                  <td className="px-2 py-3 text-center">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${r.status === 'planting' ? 'bg-blue-100 text-blue-700' : r.status === 'harvested' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {statusOptions.find(s => s.dictCode === r.status)?.dictLabel || r.status}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-sm text-center">{r.yieldAmount ?? '-'}</td>
                  <td className="px-2 py-3 text-sm text-center truncate" title={r.notes || '-'}>
                    {r.notes || '-'}
                  </td>
                  <td className="px-2 py-3 text-center">
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
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="新增种植季"
        size="xxl"
        enableDrag
        enableResize
        showFooter
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowCreateModal(false)}><X className="w-4 h-4" /> 取消</Button>
            <Button size="sm" onClick={handleSaveAdd}><Plus className="w-4 h-4" /> 创建</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs font-medium text-gray-600">种植区<span className="text-red-500">*</span>
              <select value={formData.facility_oid || ''} onChange={e => setFormData({ ...formData, facility_oid: e.target.value, zone_oid: '' })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
                <option value="">请选择</option>
                {greenhouses.map(g => <option key={g.oid} value={g.oid}>{g.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">区域<span className="text-red-500">*</span>
              <select value={formData.zone_oid || ''} onChange={e => setFormData({ ...formData, zone_oid: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
                <option value="">请选择</option>
                {selectedFacilityZones.map(z => <option key={z.oid} value={z.oid}>{z.zoneName}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">作物名称<span className="text-red-500">*</span>
              <input value={formData.crop_name || ''} onChange={e => setFormData({ ...formData, crop_name: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
            </label>
            <label className="text-xs font-medium text-gray-600">品种
              <input value={formData.variety_name || ''} onChange={e => setFormData({ ...formData, variety_name: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
            </label>
            <label className="text-xs font-medium text-gray-600">开始日期
              <input type="date" value={formData.start_date || ''} onChange={e => setFormData({ ...formData, start_date: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
            </label>
            <label className="text-xs font-medium text-gray-600">编码预览
              <div className="flex gap-1 mt-1">
                <input value={formData.season_code || ''} readOnly className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded bg-gray-50" placeholder="选择种植区后点击生成" />
                <button type="button" disabled={!formData.facility_oid} onClick={async () => {
                  if (!formData.facility_oid) { await showAlert('请先选择种植区'); return; }
                  try {
                    const year = formData.start_date ? formData.start_date.slice(0, 4) : new Date().getFullYear();
                    const res = await fetch(`/api/code-generator/next-season-code?facilityOid=${formData.facility_oid}&year=${year}`);
                    const json = await res.json();
                    if (json.success) setFormData({ ...formData, season_code: json.data.code });
                    else await showAlert(json.error || '生成编码失败');
                  } catch { await showAlert('生成编码失败'); }
                }} className="px-2 py-1.5 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed">生成</button>
              </div>
            </label>
          </div>
          <label className="text-xs font-medium text-gray-600">备注
            <textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded resize-none" />
          </label>
        </div>
      </Modal>

      {/* 编辑弹窗 */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="编辑种植记录"
        size="xxl"
        enableDrag
        enableResize
        showFooter
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowEditModal(false)}><X className="w-4 h-4" /> 取消</Button>
            <Button size="sm" onClick={handleSaveEdit}><Save className="w-4 h-4" /> 保存</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs font-medium text-gray-600">种植区
              <input value={greenhouses.find(g => g.oid === formData.facility_oid)?.name || '-'} readOnly className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded bg-gray-50" />
            </label>
            <label className="text-xs font-medium text-gray-600">区域
              <input value={zones.find(z => z.oid === formData.zone_oid)?.zoneName || '-'} readOnly className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded bg-gray-50" />
            </label>
            <label className="text-xs font-medium text-gray-600">作物名称
              <input value={formData.crop_name || ''} onChange={e => setFormData({ ...formData, crop_name: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
            </label>
            <label className="text-xs font-medium text-gray-600">品种
              <input value={formData.variety_name || ''} onChange={e => setFormData({ ...formData, variety_name: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
            </label>
            <label className="text-xs font-medium text-gray-600">开始日期
              <input type="date" value={formData.start_date || ''} onChange={e => setFormData({ ...formData, start_date: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
            </label>
          </div>
          <label className="text-xs font-medium text-gray-600">备注
            <textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded resize-none" />
          </label>
        </div>
      </Modal>

      {/* 结束弹窗 */}
      <Modal
        isOpen={showEndModal}
        onClose={() => setShowEndModal(false)}
        title="结束种植季"
        size="xxl"
        enableDrag
        enableResize
        showFooter
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowEndModal(false)}><X className="w-4 h-4" /> 取消</Button>
            <Button size="sm" onClick={handleSaveEnd}><Check className="w-4 h-4" /> 确认结束</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">结束「<span className="font-semibold text-green-600">{currentRecord?.seasonCode}</span>」</p>
          <label className="text-xs font-medium text-gray-600">结束日期<span className="text-red-500">*</span>
            <input type="date" value={formData.end_date || ''} onChange={e => setFormData({ ...formData, end_date: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs font-medium text-gray-600">产量
              <input type="number" value={formData.yield_amount || ''} onChange={e => setFormData({ ...formData, yield_amount: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
            </label>
            <label className="text-xs font-medium text-gray-600">单位
              <select value={formData.yield_unit || 'kg'} onChange={e => setFormData({ ...formData, yield_unit: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
                <option value="kg">千克</option><option value="ton">吨</option><option value="jin">斤</option>
              </select>
            </label>
          </div>
          <label className="text-xs font-medium text-gray-600">品质
            <select value={formData.quality_grade || ''} onChange={e => setFormData({ ...formData, quality_grade: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
              <option value="">请选择</option>
              <option value="A">A级</option><option value="B">B级</option><option value="C">C级</option>
            </select>
          </label>
          <label className="text-xs font-medium text-gray-600">备注
            <textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded resize-none" />
          </label>
        </div>
      </Modal>

      {/* 删除确认 */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="确认删除"
        size="sm"
        enableDrag
        enableResize
        showFooter
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setDeleteConfirm(null)}><X className="w-4 h-4" /> 取消</Button>
            <Button size="sm" variant="destructive" onClick={handleDelete}><Trash2 className="w-4 h-4" /> 删除</Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600">确定删除「{deleteConfirm?.seasonCode}」？</p>
      </Modal>
    </div>
  );
}
