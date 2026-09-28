import { Trash2, RefreshCw } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { AddFormData, MaterialItem, RETURN_REASONS } from '../types';
import { useExecuteDataStore } from '@/stores/useExecuteDataStore';
import { useUserStore } from '../../../stores/useUserStore';
import { useWarehouseStore } from '../../../stores/useWarehouseStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { SearchableSelect } from './SearchableSelect';
import { UnifiedModal, Button, NumberInput, ActionIconButton, DeepSelectTrigger, Input, Label } from '@/components/ui';
import { useDepartmentOptions } from '../../../hooks/useDepartmentOptions';

// 2026-09-28 UI 统一：输入框样式对齐生产领料弹窗（ApplicationModals）
// 目的：物资管理模块各页面弹窗的文字/输入框/下拉框风格一致；仅改样式，不动任何业务逻辑
const STD_INPUT_CLS = 'w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';

interface AddModalProps {
  open: boolean;
  form: AddFormData;
  onClose: () => void;
  onSave: () => void;
  onRemoveMaterial: (index: number) => void;
  onMaterialChange: (index: number, field: keyof MaterialItem, value: string | number) => void;
  onFormChange: (field: keyof AddFormData, value: string) => void;
  onSelectMaterialsFromSource: (sourceAppCode: string) => void;
  onGenerateCode: () => void;
}

export function AddModal({
  open,
  form,
  onClose,
  onSave,
  onRemoveMaterial,
  onMaterialChange,
  onFormChange,
  onSelectMaterialsFromSource,
  onGenerateCode,
}: AddModalProps) {
  // 从 API 获取部门选项
  const { options: departmentOptions } = useDepartmentOptions();
  // 从 Zustand Store 加载用户/仓库数据（API 直连）
  const users = useUserStore((s) => s.users);
  const loadUsers = useUserStore((s) => s.loadUsers);
  const warehouses = useWarehouseStore((s) => s.warehouses);
  const loadWarehouses = useWarehouseStore((s) => s.loadWarehouses);
  useEffect(() => { loadUsers(); loadWarehouses(); }, [loadUsers, loadWarehouses]);

  // 出库单数据（2026-09-28 P0 修复）：此前只读 items 而从不调用 fetchItems，
  // 导致「选择领料单号」下拉永远为空（只有 MaterialSelectModal 会加载，
  // 用户直接点「新增」时 store 为空 → 无法选择来源领料单，新增流程整体不可用）
  const executeItems = useExecuteDataStore((s) => s.items);
  const loadExecutes = useExecuteDataStore((s) => s.fetchItems);
  useEffect(() => {
    if (open && executeItems.length === 0) loadExecutes();
  }, [open, executeItems.length, loadExecutes]);

  // 当前操作人（2026-09-28 修复）：优先取**登录用户**（认证信息），
  // 此前取 users[0]（用户列表首位）会显示成与操作无关的人（如"访客01"）。
  const authUser = useAuthStore((s) => s.currentUser);
  const currentUserName = authUser?.realName || authUser?.username || users[0]?.name || '当前用户';

  // 申请人 / 操作人：从 useUserStore 派生的真实用户列表（去重）
  const userNames = useMemo(() => Array.from(new Set(users.map((u) => u.name).filter(Boolean))), [users]);
  const warehouseNames = useMemo(() => Array.from(new Set(warehouses.map((w) => (w as any).name || (w as any).warehouseName || '').filter(Boolean))), [warehouses]);

  // 仓库位置自动取来源领料单所属出库单的仓库位置（2026-09-28）：
  // 退料是「原路退回」业务，物料从哪个仓库出库就退回哪个仓库，
  // 手选容易选错导致库存记入错误仓库（账实不符）。
  const sourceWarehouseLocation = useMemo(() => {
    const codes = Array.from(new Set((form.materials || []).map(m => m.sourceApplicationCode).filter(Boolean)));
    for (const c of codes) {
      const hit = executeItems.find(r => r.code === c) as { warehouseLocation?: string } | undefined;
      const loc = String(hit?.warehouseLocation || '').trim();
      if (loc) return loc;
    }
    return '';
  }, [form.materials, executeItems]);

  // 来源单有仓库位置时自动回填到表单（已同步则跳过，避免无限渲染）
  useEffect(() => {
    if (!open || !sourceWarehouseLocation) return;
    if (form.warehouseLocation === sourceWarehouseLocation) return;
    onFormChange('warehouseLocation', sourceWarehouseLocation);
  }, [open, sourceWarehouseLocation, form.warehouseLocation, onFormChange]);

  // 来源领料单号列表：来自领料出库 Store（业务规则：只能基于已出库单据退料，保证数据闭环）
  // 仅展示有实际出库物料的记录，避免出现"选了单号但没物料可选"
  const sourceApplicationOptions = useMemo(() => {
    return executeItems
      // 2026-09-28 修复：必须与后端闭环校验对齐——只有「实际出库过」的单据才能退料。
      // 此前只判空物料，导致已取消/待出库单据仍出现在下拉里，选中后被后端 400 拒绝
      // （报错"来源领料单当前状态为「已取消」，没有实际出库记录"），用户困惑且反复重试。
      .filter((r) => {
        if (!r.code || !r.materials || r.materials.length === 0) return false;
        const cls = String((r as { executeStatusClass?: string }).executeStatusClass || '').toLowerCase();
        return cls === 'completed' || cls === 'partial';
      })
      .map((r) => ({ value: r.code, label: `${r.code}（${r.applicant} · ${r.materials.length} 项）` }));
  }, [executeItems]);
  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title="新增退料单"
      size="xl"
      showFooter
      onSubmit={onSave}
      submitText="保存"
      cancelText="取消"
    >
      {/* 基本信息（2026-09-28 UI 统一：布局/文字/输入框对齐生产领料弹窗） */}
      <div className="grid grid-cols-2 gap-4">
        {/* 退料单号 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">退料单号</Label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={form.code}
              readOnly
              placeholder="系统自动生成"
              className={`${STD_INPUT_CLS} flex-1 font-mono`}
            />
            <Button variant="secondary" onClick={onGenerateCode} title="生成退料单号">
              <RefreshCw className="w-4 h-4" />
              生成
            </Button>
          </div>
        </div>
        {/* 退料日期 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">退料日期</Label>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => onFormChange('date', e.target.value)}
            className={STD_INPUT_CLS}
          />
        </div>
        {/* 申请人 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">申请人</Label>
          <SearchableSelect
            value={form.applicant}
            options={userNames.map(v => ({ value: v, label: v }))}
            onChange={(val) => onFormChange('applicant', val)}
            placeholder="请选择"
            className="w-full"
          />
        </div>
        {/* 退料部门 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">退料部门</Label>
          <SearchableSelect
            value={form.department}
            options={departmentOptions.map(v => ({ value: v, label: v }))}
            onChange={(val) => onFormChange('department', val)}
            placeholder="请选择"
            className="w-full"
          />
        </div>
        {/* 仓库位置 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">仓库位置</Label>
          {sourceWarehouseLocation ? (
            /* 2026-09-28：来源领料单有仓库位置 → 自动带入并锁定（退料=原路退回，避免手选错仓库） */
            <Input
              type="text"
              value={sourceWarehouseLocation}
              readOnly
              title="自动取来源领料单的仓库位置（原路退回）"
              className={`${STD_INPUT_CLS} bg-gray-100 cursor-not-allowed`}
            />
          ) : (
            /* 来源单未记录仓库位置（历史数据缺失）→ 允许手动补填 */
            <SearchableSelect
              value={form.warehouseLocation}
              options={warehouseNames.map(v => ({ value: v, label: v }))}
              onChange={(val) => onFormChange('warehouseLocation', val)}
              placeholder="来源单未记录，请选择"
              className="w-full"
            />
          )}
        </div>
        {/* 操作人 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">操作人</Label>
          <Input
            type="text"
            value={currentUserName}
            readOnly
            className={`${STD_INPUT_CLS} bg-gray-100 cursor-not-allowed`}
          />
        </div>
        {/* 2026-09-28 移除「审核人」手选：审批人由系统审批配置自动分派
            （createApprovalWithLevel 按级别解析），手选值此前从未传给审批引擎，
            仅写入 material_returns.reviewer 展示字段，导致"显示审核人 ≠ 实际审批人"。
            真实审批人现在由审批回调写入（approvalLinkage: reviewer = actor.name）。 */}
        {/* 备注（跨两列） */}
        <div className="col-span-2">
          <Label className="block text-sm font-medium text-gray-700 mb-1">备注</Label>
          <Input
            type="text"
            value={form.remark}
            onChange={(e) => onFormChange('remark', e.target.value)}
            placeholder="请输入"
            className={STD_INPUT_CLS}
          />
        </div>
      </div>

      {/* 物料明细 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">物料明细</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">选择领料单号：</span>
            <SearchableSelect
            value=""
            options={sourceApplicationOptions}
            onChange={(val) => {
              if (val) {
                onSelectMaterialsFromSource(val);
              }
            }}
            placeholder="选择领料单号添加物料"
            className="w-64"
          />
          </div>
        </div>
        {form.materials.length > 0 ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-auto max-h-[320px]">
              <table className="w-full min-w-[1400px]">
                <colgroup>
                  <col className="w-36" />
                  <col className="w-28" />
                  <col className="w-32" />
                  <col className="w-40" />
                  <col className="w-32" />
                  <col className="w-16" />
                  <col className="w-24" />
                  <col className="w-28" />
                  <col className="w-24" />
                  <col className="w-32" />
                  <col className="w-40" />
                  <col className="w-12" />
                </colgroup>
                <thead className="bg-emerald-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">来源领料单号</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">物料编码</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">物料分类</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">物料名称</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">规格</th>
                    <th className="px-3 py-2 text-center text-sm font-semibold text-gray-700">单位</th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700">领料数量</th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700">退料数量</th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700">单价</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">仓库货位</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">退料原因</th>
                    <th className="px-3 py-2 text-center text-sm font-semibold text-gray-700 whitespace-nowrap">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {form.materials.map((material, idx) => (
                    <tr key={idx} className="hover:bg-emerald-50/50">
                      <td className="px-3 py-2 text-sm font-mono text-gray-700 truncate">{material.sourceApplicationCode || '-'}</td>
                      <td className="px-3 py-2 text-sm font-mono text-gray-700 truncate">{material.materialCode || '-'}</td>
                      <td className="px-3 py-2 text-sm text-gray-700 truncate">{material.category || '-'}</td>
                      <td className="px-3 py-2 text-sm text-gray-700 truncate">{material.materialName || '-'}</td>
                      <td className="px-3 py-2 text-sm text-gray-700 truncate">{material.spec || '-'}</td>
                      <td className="px-3 py-2 text-sm text-center text-gray-700">{material.unit || '-'}</td>
                      <td className="px-3 py-2 text-sm text-right text-gray-700">{(material.quantity || 0).toFixed(2)}</td>
                      <td className="px-3 py-2">
                        {/* 退料数量：数字输入框组件（失焦时保留 2 位小数） */}
                        <NumberInput
                          value={material.returnQuantity}
                          onChange={(v) => onMaterialChange(idx, 'returnQuantity', parseFloat(v) || 0)}
                          placeholder="0"
                          className="text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-sm text-right text-gray-700">{material.unitPrice ? `¥${material.unitPrice.toFixed(2)}` : '-'}</td>
                      <td className="px-3 py-2 text-sm text-gray-700 truncate">{material.warehousePosition || '-'}</td>
                      <td className="px-3 py-2">
                        <DeepSelectTrigger
                          value={material.reason}
                          onChange={(e) => onMaterialChange(idx, 'reason', e.target.value)}
                          className="w-full"
                        >
                          <option value="">请选择</option>
                          {RETURN_REASONS.map(reason => (
                            <option key={reason} value={reason}>{reason}</option>
                          ))}
                        </DeepSelectTrigger>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <ActionIconButton
                          variant="delete"
                          icon={<Trash2 className="w-4 h-4" />}
                          onClick={() => onRemoveMaterial(idx)}
                          title="删除物料"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500 italic border border-gray-200 rounded-lg p-4 text-center">
            暂无物料明细，请通过上方"选择领料单号"添加退料物料（只能基于已出库的物料退料）
          </div>
        )}
      </div>
    </UnifiedModal>
  );
}
