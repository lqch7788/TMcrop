import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ScrollText, Plus, Edit, Trash2, ArrowLeft, Search } from 'lucide-react';
import { useProcessDefinitionStore, useDictionaryStore, getDictItems } from '../stores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/Pagination';
import type { ProcessDefinition } from '../services/apiBasicDataService';

// 工序类型选项（从字典读取，备用硬编码）
const FALLBACK_PROCESS_TYPES = [
  { value: '耕地', label: '耕地' },
  { value: '播种', label: '播种' },
  { value: '施肥', label: '施肥' },
  { value: '灌溉', label: '灌溉' },
  { value: '除草', label: '除草' },
  { value: '植保', label: '植保' },
  { value: '修剪', label: '修剪' },
  { value: '授粉', label: '授粉' },
  { value: '采收', label: '采收' },
  { value: '包装', label: '包装' },
];

const UNIT_OPTIONS = [
  { value: '亩', label: '亩' },
  { value: '株', label: '株' },
  { value: '公斤', label: '公斤' },
  { value: '小时', label: '小时' },
  { value: '次', label: '次' },
  { value: '平方米', label: '平方米' },
];

// 工序新增/编辑弹窗
function ProcessModal({
  open,
  onClose,
  onSave,
  editItem,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (item: Partial<ProcessDefinition>) => void;
  editItem?: ProcessDefinition | null;
}) {
  const [form, setForm] = useState({
    processCode: '',
    processName: '',
    processType: '',
    unit: '亩',
    defaultPrice: 0,
    defaultBonus: 0,
    description: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editItem) {
      setForm({
        processCode: editItem.processCode || '',
        processName: editItem.processName || '',
        processType: editItem.processType || '',
        unit: editItem.unit || '亩',
        defaultPrice: editItem.defaultPrice || 0,
        defaultBonus: editItem.defaultBonus || 0,
        description: editItem.description || '',
      });
    } else {
      setForm({ processCode: '', processName: '', processType: '', unit: '亩', defaultPrice: 0, defaultBonus: 0, description: '' });
    }
  }, [editItem, open]);

  const handleSubmit = async () => {
    if (!form.processCode.trim() || !form.processName.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editItem ? '编辑工序' : '添加工序'}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>工序编码 *</Label>
            <Input
              value={form.processCode}
              onChange={(e) => setForm((f) => ({ ...f, processCode: e.target.value }))}
              placeholder="如: PD011"
            />
          </div>
          <div>
            <Label>工序名称 *</Label>
            <Input
              value={form.processName}
              onChange={(e) => setForm((f) => ({ ...f, processName: e.target.value }))}
              placeholder="如: 深耕翻土"
            />
          </div>
          <div>
            <Label>工序类型</Label>
            <Select
              value={form.processType}
              onChange={(e) => setForm((f) => ({ ...f, processType: e.target.value || '' }))}
            >
              <option value="">-- 选择类型 --</option>
              {FALLBACK_PROCESS_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>计量单位</Label>
            <Select
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value || '亩' }))}
            >
              {UNIT_OPTIONS.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>默认单价 (元)</Label>
            <Input
              type="number"
              value={form.defaultPrice}
              onChange={(e) => setForm((f) => ({ ...f, defaultPrice: Number(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <Label>奖励比例 (%)</Label>
            <Input
              type="number"
              value={form.defaultBonus}
              onChange={(e) => setForm((f) => ({ ...f, defaultBonus: Number(e.target.value) || 0 }))}
            />
          </div>
        </div>
        <div>
          <Label>描述</Label>
          <Input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="工序描述..."
          />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// 删除确认弹窗
function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  itemName,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title="确认删除">
      <div className="space-y-4">
        <p className="text-gray-600">
          确定要删除工序 <span className="font-semibold text-gray-900">{itemName}</span> 吗？此操作不可撤销。
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button variant="destructive" onClick={onConfirm}>确认删除</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function ProcessManagement() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ProcessDefinition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProcessDefinition | null>(null);

  const pageSize = 10;

  const store = useProcessDefinitionStore();
  const items = store.items;
  const loading = store.loading;

  useEffect(() => {
    store.loadItems();
  }, []);

  // 搜索过滤
  const filteredData = searchText
    ? items.filter((p) =>
        p.processCode?.includes(searchText) ||
        p.processName?.includes(searchText) ||
        p.processType?.includes(searchText)
      )
    : items;

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const activeCount = items.filter((p) => p.status === 'active').length;
  const inactiveCount = items.length - activeCount;

  const handleAdd = async (form: Partial<ProcessDefinition>) => {
    await store.addItem(form);
    setCurrentPage(1);
  };

  const handleEdit = async (form: Partial<ProcessDefinition>) => {
    if (!editItem) return;
    await store.updateItem(editItem.id, form);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await store.removeItem(deleteTarget.id);
    setDeleteModalOpen(false);
    setDeleteTarget(null);
    // 如果当前页为空，回退一页
    const newTotal = Math.ceil((filteredData.length - 1) / pageSize);
    if (currentPage > newTotal && newTotal > 0) {
      setCurrentPage(newTotal);
    }
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex items-center gap-3">
          <a
            href="/settings"
            className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center hover:from-gray-200 hover:to-gray-300 transition-colors"
            title="返回系统设置"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </a>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <ScrollText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">工序管理</h1>
            <p className="text-gray-500">自定义生产工序及单价设置</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <ScrollText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{items.length}</p>
              <p className="text-xs text-gray-500">工序总数</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <span className="text-green-600 text-lg font-bold">✓</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
              <p className="text-xs text-gray-500">启用中</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
              <span className="text-gray-600 text-lg">○</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{inactiveCount}</p>
              <p className="text-xs text-gray-500">停用</p>
            </div>
          </div>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-10"
              placeholder="搜索工序编码/名称/类型..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <Button
            variant="default"
            onClick={() => {
              setEditItem(null);
              setModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            添加工序
          </Button>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">工序列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工序编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工序名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工序类型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">计量单位</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">默认单价(元)</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">奖励比例(%)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    加载中...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    {searchText ? '没有匹配的工序' : '暂无工序数据，点击"添加工序"按钮开始'}
                  </td>
                </tr>
              ) : (
                paginatedData.map((proc) => (
                  <tr key={proc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{proc.processCode}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{proc.processName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                        {proc.processType || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{proc.unit}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{proc.defaultPrice}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{proc.defaultBonus}%</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          proc.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {proc.status === 'active' ? '启用' : '停用'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="编辑"
                          onClick={() => {
                            setEditItem(proc);
                            setModalOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          title="删除"
                          onClick={() => {
                            setDeleteTarget(proc);
                            setDeleteModalOpen(true);
                          }}
                        >
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
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            共 {filteredData.length} 条记录
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            pageSizeOptions={[10, 20, 50]}
            showPageSize
          />
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      <ProcessModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={editItem ? handleEdit : handleAdd}
        editItem={editItem}
      />

      {/* 删除确认弹窗 */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        itemName={deleteTarget ? `${deleteTarget.processCode} ${deleteTarget.processName}` : ''}
      />
    </div>
  );
}
