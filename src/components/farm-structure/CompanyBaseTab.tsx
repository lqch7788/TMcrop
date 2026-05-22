/**
 * TAB 1: 公司基地管理（基地空间架构 V1.0）
 * 左侧公司列表 + 右侧基地表格，支持 CRUD
 */
import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit2, Trash2, Loader2, Building2, MapPin } from 'lucide-react';
import { Button, Input, TextArea, Label } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/Pagination';
import { useBaseStore } from '../../stores';
import type { Base } from '../../services/apiBasicDataService';
import { showAlert } from '@/lib/dialogService';

/** 公司分组（临时内存结构，后续可扩展为独立表） */
interface CompanyGroup {
  id: string;
  name: string;
}

const PAGE_SIZE = 10;

export default function CompanyBaseTab() {
  const { bases, loading, error, loadBases, addBase, editBase, removeBase } = useBaseStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingBase, setEditingBase] = useState<Base | null>(null);
  const [formData, setFormData] = useState<Partial<Base>>({ status: 'active' });
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Base | null>(null);

  useEffect(() => {
    loadBases();
  }, [loadBases]);

  // 从基地数据中提取唯一公司列表（同时检查 companyOid 和 companyName）
  const companyMap = new Map<string, CompanyGroup>();
  bases.forEach((b) => {
    if (b.companyOid && b.companyName && !companyMap.has(b.companyOid)) {
      companyMap.set(b.companyOid, { id: b.companyOid, name: b.companyName });
    }
  });
  const companies = Array.from(companyMap.values());

  // 按公司筛选基地
  const filteredBases = bases.filter((b) => {
    const matchSearch = (b.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      || (b.code || '').toLowerCase().includes(searchTerm.toLowerCase())
      || (b.companyName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchCompany = !selectedCompanyId || b.companyOid === selectedCompanyId;
    return matchSearch && matchCompany;
  });

  const totalPages = Math.ceil(filteredBases.length / PAGE_SIZE);
  const paginatedBases = filteredBases.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  /** 打开新增弹窗 */
  const handleAdd = () => {
    setEditingBase(null);
    setFormData({ status: 'active', unit: '亩' });
    setShowModal(true);
  };

  /** 打开编辑弹窗 */
  const handleEdit = (base: Base) => {
    setEditingBase(base);
    setFormData({ ...base });
    setShowModal(true);
  };

  /** 保存（新增或编辑） */
  const handleSave = async () => {
    if (!formData.name || !formData.companyName) {
      await showAlert('请填写基地名称和所属公司');
      return;
    }
    try {
      if (editingBase) {
        await editBase(editingBase.oid, formData);
      } else {
        // 自动生成 companyOid
        const companyOid = formData.companyOid || `company_${Date.now()}`;
        await addBase({ ...formData, companyOid });
      }
      // addBase 已经更新了本地 store，不需要再调用 loadBases
      setShowModal(false);
      setEditingBase(null);
    } catch (err) {
      await showAlert('保存失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  /** 删除确认 */
  const handleDeleteConfirm = async () => {
    if (!showDeleteConfirm) return;
    try {
      await removeBase(showDeleteConfirm.oid);
      setShowDeleteConfirm(null);
    } catch (err) {
      await showAlert('删除失败');
    }
  };

  /** 统计数据 */
  const stats = {
    companyCount: companies.length,
    baseCount: bases.filter((b) => b.status === 'active').length,
    totalArea: bases.reduce((sum, b) => sum + (b.area || 0), 0),
  };

  return (
    <div className="flex gap-4">
      {/* 左侧：公司列表 */}
      <div className="w-56 flex-shrink-0">
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-blue-500" />
            公司列表
          </h3>
          {/* 统计卡片 */}
          <div className="grid grid-cols-3 gap-1 mb-3">
            <div className="text-center p-1 bg-blue-50 rounded">
              <div className="text-sm font-bold text-blue-600">{stats.companyCount}</div>
              <div className="text-[10px] text-gray-500">公司</div>
            </div>
            <div className="text-center p-1 bg-green-50 rounded">
              <div className="text-sm font-bold text-green-600">{stats.baseCount}</div>
              <div className="text-[10px] text-gray-500">基地</div>
            </div>
            <div className="text-center p-1 bg-amber-50 rounded">
              <div className="text-sm font-bold text-amber-600">{stats.totalArea}</div>
              <div className="text-[10px] text-gray-500">总面积</div>
            </div>
          </div>
          <div className="space-y-0.5 max-h-[500px] overflow-y-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCompanyId('')}
              className="w-full text-left justify-start"
            >
              全部公司 ({bases.length})
            </Button>
            {companies.map((c) => {
              const count = bases.filter((b) => b.companyOid === c.id).length;
              return (
                <Button
                  key={c.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCompanyId(c.id)}
                  className="w-full text-left justify-start"
                  title={c.name}
                >
                  <span className="truncate">{c.name}</span>
                  <span className="text-gray-400 ml-1">{count}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 右侧：基地表格 */}
      <div className="flex-1 min-w-0">
        {/* 工具栏 */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="搜索基地名称/编码..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-9"
            />
          </div>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-1" />新增基地
          </Button>
        </div>

        {/* 表格 */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        )}
        {error && (
          <div className="text-center py-8 text-red-500 text-sm">{error}</div>
        )}
        {!loading && !error && (
          <>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">基地编码</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">基地名称</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">所属公司</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">面积(亩)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">所在地区</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">负责人</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">联系电话</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">状态</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300 bg-white">
                  {paginatedBases.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">
                        <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        暂无基地数据，点击"新增基地"开始
                      </td>
                    </tr>
                  ) : (
                    paginatedBases.map((base) => (
                      <tr key={base.oid} className="hover:bg-blue-100 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono whitespace-nowrap">{base.code || '-'}</td>
                        <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">{base.name}</td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">{base.companyName || '-'}</td>
                        <td className="px-4 py-3 text-sm text-right whitespace-nowrap">{base.area || 0}</td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">{[base.province, base.city].filter(Boolean).join(' ') || '-'}</td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">{base.manager || '-'}</td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">{base.phone || '-'}</td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${base.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {base.status === 'active' ? '活跃' : '停用'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(base)} className="text-blue-500 hover:text-blue-600" title="编辑">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setShowDeleteConfirm(base)} className="text-red-500 hover:text-red-600" title="删除">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {filteredBases.length > 0 && (
              <div className="flex items-center justify-between mt-3 px-4 py-3 border-t border-gray-100">
                <div className="text-sm text-gray-500">共 {filteredBases.length} 条</div>
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
          <BaseFormModal
            editingBase={editingBase}
            formData={formData}
            setFormData={setFormData}
            onSave={handleSave}
            onClose={() => { setShowModal(false); setEditingBase(null); }}
          />
        )}

        {/* 删除确认弹窗 */}
        {showDeleteConfirm && (
          <DeleteConfirmModal
            name={showDeleteConfirm.name}
            onConfirm={handleDeleteConfirm}
            onClose={() => setShowDeleteConfirm(null)}
          />
        )}
      </div>
    </div>
  );
}

/** 基地表单弹窗（内置，避免过多文件拆分） */
function BaseFormModal({
  editingBase, formData, setFormData, onSave, onClose,
}: {
  editingBase: Base | null;
  formData: Partial<Base>;
  setFormData: (d: Partial<Base>) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ minWidth: 640, minHeight: 400 }}
      >
        {/* 标题栏 */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-3 flex items-center justify-between">
          <h3 className="text-white font-semibold text-base">
            {editingBase ? '编辑基地' : '新增基地'}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white/80 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* 表单内容 */}
        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="基地名称" required>
              <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </FormField>
            <FormField label="基地编码">
              <Input value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
            </FormField>
            <FormField label="所属公司" required>
              <Input value={formData.companyName || ''} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} />
            </FormField>
            <FormField label="面积">
              <div className="flex gap-1">
                <Input type="number" className="flex-1" value={formData.area || ''} onChange={(e) => setFormData({ ...formData, area: Number(e.target.value) })} />
                <Select value={formData.unit || '亩'} onValueChange={(val) => setFormData({ ...formData, unit: val })}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="亩">亩</SelectItem>
                    <SelectItem value="公顷">公顷</SelectItem>
                    <SelectItem value="平方米">平方米</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </FormField>
            <FormField label="省份">
              <Input value={formData.province || ''} onChange={(e) => setFormData({ ...formData, province: e.target.value })} />
            </FormField>
            <FormField label="城市">
              <Input value={formData.city || ''} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
            </FormField>
            <FormField label="负责人">
              <Input value={formData.manager || ''} onChange={(e) => setFormData({ ...formData, manager: e.target.value })} />
            </FormField>
            <FormField label="联系电话">
              <Input value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </FormField>
            <FormField label="土壤类型">
              <Input value={formData.soilType || ''} onChange={(e) => setFormData({ ...formData, soilType: e.target.value })} />
            </FormField>
            <FormField label="pH值">
              <Input type="number" step="0.1" value={formData.ph || ''} onChange={(e) => setFormData({ ...formData, ph: Number(e.target.value) })} />
            </FormField>
          </div>
          <FormField label="简介">
            <TextArea value={formData.intro || ''} onChange={(e) => setFormData({ ...formData, intro: e.target.value })} minRows={2} />
          </FormField>
          <FormField label="状态">
            <Select value={formData.status || 'active'} onValueChange={(val) => setFormData({ ...formData, status: val })}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">活跃</SelectItem>
                <SelectItem value="inactive">停用</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>

        {/* 按钮栏 */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
          <Button size="sm" variant="secondary" onClick={onClose}>取消</Button>
          <Button size="sm" onClick={onSave}>保存</Button>
        </div>
      </div>
    </div>
  );
}

/** 内联表单字段 */
function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-gray-600 mb-0">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

/** 删除确认弹窗 */
function DeleteConfirmModal({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-96" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-gray-900 mb-2">确认删除</h3>
        <p className="text-sm text-gray-600 mb-4">确定要删除基地「{name}」吗？此操作不可恢复。</p>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={onClose}>取消</Button>
          <Button size="sm" variant="destructive" onClick={onConfirm}>确认删除</Button>
        </div>
      </div>
    </div>
  );
}
