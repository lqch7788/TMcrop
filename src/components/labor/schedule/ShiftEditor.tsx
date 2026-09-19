/**
 * 班次设置（2026-09-19 重写：由"只能改时间的编辑器"升级为完整班次管理）
 *
 * 背景：原实现编辑的是前端硬编码的 DEFAULT_SHIFT_CONFIGS 内存副本 ——
 * 不能改名称、不能新增班次、没有状态概念，且**不落库**（刷新即回默认）。
 * 与此同时系统设置里另有一个真正读写 shifts 表的「班次管理」，两个入口一真一假。
 * 本次把后者的全部能力搬到这里，shifts 表成为班次配置的**唯一数据源**：
 *   - 新增 / 编辑（名称、编码、起止时间、类型、说明、启用状态）/ 删除，全部落库
 *   - 变更后通知父组件重取，排班表格、日历、新增排班弹窗的班次下拉同步更新
 *
 * 数据流（V2.1）：组件 → useShiftStore（CRUD）/ useScheduleStore（派生配置）→ API → SQLite
 */
import { useEffect, useState } from 'react';
import { Clock, Edit2, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { Button, Input, Label } from '@/components/ui';
import { showAlert, showConfirm } from '@/lib/dialogService';
import { useShiftStore, useScheduleStore } from '@/stores';
import type { Shift } from '@/services/apiBasicDataService';

interface ShiftEditorProps {
  /** 班次增删改后回调 —— 父组件据此重排班页的班次配置（颜色/时间/下拉选项） */
  onChanged?: () => void;
}

const EMPTY_FORM: Partial<Shift> = { status: 'active', shiftType: '早班' };

export function ShiftEditor({ onChanged }: ShiftEditorProps) {
  const { shifts, loading, error, loadShifts, addShift, updateShift, removeShift } = useShiftStore();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [form, setForm] = useState<Partial<Shift>>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadShifts().catch((err) => {
      console.error('[ShiftEditor] 班次列表加载失败:', err);
    });
  }, [loadShifts]);

  /** 变更后统一刷新：本组件列表 + 排班页的派生配置 */
  const afterChange = async () => {
    await loadShifts();
    try {
      await useScheduleStore.getState().fetchShiftConfigs();
    } catch (err) {
      // 派生配置刷新失败不影响班次本身已保存，仅记录（store 内已写 error）
      console.error('[ShiftEditor] 刷新排班页班次配置失败:', err);
    }
    onChanged?.();
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (shift: Shift) => {
    setEditing(shift);
    setForm({ ...shift });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm({ ...EMPTY_FORM });
  };

  const handleSave = async () => {
    if (!form.shiftName?.trim()) { await showAlert('请填写班次名称'); return; }
    if (!form.shiftCode?.trim()) { await showAlert('请填写班次编码'); return; }
    if (!form.startTime || !form.endTime) { await showAlert('请填写开始时间和结束时间'); return; }

    setSaving(true);
    try {
      if (editing) {
        await updateShift(editing.id, form);
      } else {
        await addShift(form);
      }
      closeForm();
      await afterChange();
    } catch (err) {
      await showAlert(`保存班次失败：${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (shift: Shift) => {
    const ok = await showConfirm(
      `确定删除班次「${shift.shiftName}」吗？\n` +
      '删除后该班次不再出现在排班选择里；已用该班次的排班记录会保留，但班组可用工时会因为找不到班次定义而不再计入。',
    );
    if (!ok) return;
    try {
      await removeShift(shift.id);
      await afterChange();
    } catch (err) {
      await showAlert(`删除班次失败：${(err as Error).message}`);
    }
  };

  if (loading && shifts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
        加载中...
      </div>
    );
  }

  if (error && shifts.length === 0) {
    return (
      <div className="py-8 text-center text-red-600 text-sm">
        班次数据加载失败：{error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          班次定义会用于排班选择与**班组可用工时**计算（按起止时间累加），请如实维护。
        </p>
        <Button size="sm" onClick={openAdd}>
          <Plus className="w-4 h-4" /> 新增班次
        </Button>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">班次名称</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">编码</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">时间</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">类型</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">状态</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 w-24">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {shifts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-400 text-sm">暂无班次数据</td>
              </tr>
            ) : (
              shifts.map((shift) => (
                <tr key={shift.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                    <span className="inline-flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {shift.shiftName}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">{shift.shiftCode}</td>
                  <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">
                    {shift.startTime} - {shift.endTime}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">{shift.shiftType || '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      shift.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {shift.status === 'active' ? '启用' : '停用'}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(shift)}
                        className="p-1.5 rounded hover:bg-blue-100 text-blue-600 transition-colors"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(shift)}
                        className="p-1.5 rounded hover:bg-red-100 text-red-600 transition-colors"
                        title="删除"
                      >
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

      {/* 新增/编辑表单 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editing ? '编辑班次' : '新增班次'}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">班次编码 *</Label>
                  <Input
                    value={form.shiftCode || ''}
                    onChange={(e) => setForm({ ...form, shiftCode: e.target.value })}
                    placeholder="如：SH004"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">班次名称 *</Label>
                  <Input
                    value={form.shiftName || ''}
                    onChange={(e) => setForm({ ...form, shiftName: e.target.value })}
                    placeholder="如：全天班"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">开始时间 *</Label>
                  <Input
                    type="time"
                    value={form.startTime || ''}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">结束时间 *</Label>
                  <Input
                    type="time"
                    value={form.endTime || ''}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">班次类型</Label>
                  <Input
                    value={form.shiftType || ''}
                    onChange={(e) => setForm({ ...form, shiftType: e.target.value })}
                    placeholder="如：早班"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">状态</Label>
                  <select
                    value={form.status || 'active'}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="active">启用</option>
                    <option value="inactive">停用</option>
                  </select>
                </div>
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">描述</Label>
                <textarea
                  value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="如：全天班 08:00-20:00"
                />
              </div>
              <p className="text-xs text-amber-600">
                ⚠ 跨日班次请让结束时间早于开始时间（如 22:00 → 06:00），系统按跨日计算工时。
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="outline" onClick={closeForm} disabled={saving}>
                <X className="w-4 h-4" /> 取消
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4" /> {saving ? '保存中…' : '保存'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShiftEditor;
