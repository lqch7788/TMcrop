/**
 * 采购计划批量编辑弹窗组件
 */
import React, { useRef, useEffect } from 'react';
import { Modal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Check, ChevronDown, Plus, Save } from 'lucide-react';
import { UserSelect } from '../common/settings/UserSelect';
import { useUserStore, useDictionaryStore, usePlantingStore } from '../../stores';
import { MaterialItemsTable } from './MaterialItemsTable';
import type { PurchasePlan, PurchasePlanItem } from '../../types/purchase';
import { PURCHASE_EXECUTION_STATUS_OPTIONS, PURCHASE_TYPE_TEXT } from '../../types/purchase';

const safeArray = <T,>(v: T[] | undefined | null): T[] => Array.isArray(v) ? v : [];

interface BatchEditModalProps {
  // 弹窗状态
  isOpen: boolean;
  onClose: () => void;
  // 选中状态
  selectedRows: string[];
  selectedPlanCode: string;
  currentEditingPlan: PurchasePlan | null;
  // 编辑数据（与 CreatePlanModal 字段保持一致）
  batchEditData: {
    purchaseType: string;
    relatedBatchCode: string;
    otherBatchReason: string;
    applicant: string;
    applicantDepartment: string;
    applyDate: string;
    requiredDate: string;
    priority: string;
    remark: string;
    executionStatus: string;
  };
  batchEditItems: PurchasePlanItem[];
  // 下拉状态
  batchSelectOpen: boolean;
  // 已编辑状态
  editedPlans: Record<string, Partial<PurchasePlan>>;
  // 数据列表
  purchasePlansData: PurchasePlan[];
  // 展开状态
  showEditItemsExpanded: boolean;
  // 操作函数
  onBatchSelectOpenChange: (open: boolean) => void;
  onSelectedPlanCodeChange: (code: string) => void;
  onBatchEditDataChange: (field: string, value: string) => void;
  onBatchEditItemsChange: (items: PurchasePlanItem[]) => void;
  onShowEditItemsExpandedChange: (expanded: boolean) => void;
  onCurrentEditingPlanChange: (plan: PurchasePlan | null) => void;
  onEditedPlansChange: (plans: Record<string, Partial<PurchasePlan>>) => void;
  // 提交函数
  onSubmit: () => void;
  onNext: () => void;
}

/**
 * 批次号选择下拉组件
 */
function BatchSelectDropdown({
  selectedRows,
  purchasePlansData,
  selectedPlanCode,
  batchSelectOpen,
  editedPlans,
  onSelectOpenChange,
  onPlanCodeChange,
  onPlanSelect,
}: {
  selectedRows: string[];
  purchasePlansData: PurchasePlan[];
  selectedPlanCode: string;
  batchSelectOpen: boolean;
  editedPlans: Record<string, Partial<PurchasePlan>>;
  onSelectOpenChange: (open: boolean) => void;
  onPlanCodeChange: (code: string) => void;
  onPlanSelect: (plan: PurchasePlan) => void;
}) {
  const batchSelectRef = useRef<HTMLDivElement>(null);

  // 外部点击关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (batchSelectRef.current && !batchSelectRef.current.contains(event.target as Node)) {
        onSelectOpenChange(false);
      }
    };
    if (batchSelectOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [batchSelectOpen, onSelectOpenChange]);

  return (
    <div className="relative" ref={batchSelectRef}>
      <div
        className="w-full h-10 px-3 border border-gray-300 rounded-lg bg-white flex items-center justify-between cursor-pointer hover:border-blue-400"
        onClick={() => onSelectOpenChange(!batchSelectOpen)}
      >
        <span className={selectedPlanCode ? "text-sm text-gray-900" : "text-sm text-gray-400"}>
          {selectedPlanCode || '-- 请选择 --'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${batchSelectOpen ? 'rotate-180' : ''}`} />
      </div>
      {batchSelectOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {selectedRows.length > 0 ? (
            purchasePlansData.filter(p => selectedRows.includes(p.purchaseApplicationCode)).map((plan) => {
              const isEdited = editedPlans[plan.purchaseApplicationCode] !== undefined;
              return (
                <div
                  key={plan.purchaseApplicationCode}
                  className={`px-3 py-2 cursor-pointer hover:bg-blue-50 flex items-center gap-2 ${
                    selectedPlanCode === plan.purchaseApplicationCode ? 'bg-blue-100' : ''
                  }`}
                  onClick={() => onPlanSelect(plan)}
                >
                  <span className="text-sm flex items-center gap-1">
                    {plan.purchaseApplicationCode}
                    {isEdited && (
                      <span className="text-blue-600 font-bold">✓已编辑</span>
                    )}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="px-3 py-2 text-sm text-gray-400">-- 请先选择要编辑的数据 --</div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 采购计划批量编辑弹窗组件
 */
export function BatchEditModal({
  isOpen,
  onClose,
  selectedRows,
  selectedPlanCode,
  currentEditingPlan,
  batchEditData,
  batchEditItems,
  batchSelectOpen,
  editedPlans,
  purchasePlansData,
  showEditItemsExpanded,
  onBatchSelectOpenChange,
  onSelectedPlanCodeChange,
  onBatchEditDataChange,
  onBatchEditItemsChange,
  onShowEditItemsExpandedChange,
  onCurrentEditingPlanChange,
  onEditedPlansChange,
  onSubmit,
  onNext,
}: BatchEditModalProps) {
  // 深度输入框样式
  const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

  // 用户列表（用于获取申请人姓名）
  const users = safeArray(useUserStore((state: any) => state.users));
  const loadUsers = useUserStore((state: any) => state.loadUsers);

  // 部门和种植批次从字典加载
  const dictionaries = safeArray(useDictionaryStore((s: any) => s.dictionaries));
  const loadDictionaries = useDictionaryStore((s: any) => s.loadDictionaries);
  const plantingItems = safeArray(usePlantingStore((s: any) => s.items));
  const loadPlantings = usePlantingStore((s: any) => s.loadItems);

  useEffect(() => {
    if (users.length === 0) loadUsers();
    if (dictionaries.length === 0) loadDictionaries();
    if (plantingItems.length === 0) loadPlantings();
  }, [users.length, dictionaries.length, plantingItems.length, loadUsers, loadDictionaries, loadPlantings]);

  // 部门选项：与 CreatePlanModal 保持一致（硬编码 4 项，DB 字典无 department 分类）
  const departmentOptions = React.useMemo(
    () => [
      { value: '生产部', label: '生产部' },
      { value: '后勤部', label: '后勤部' },
      { value: '办公室', label: '办公室' },
      { value: '技术部', label: '技术部' },
    ],
    []
  );

  const batchOptions = React.useMemo(
    () => plantingItems.map((b: any) => ({
      value: String(b.plantCode || b.id),
      label: `${b.plantCode || b.id} - ${b.cropName || ''}`,
    })),
    [plantingItems]
  );

  // 采购类型选项（与 CreatePlanModal 完全一致）
  const purchaseTypeOptions = React.useMemo(
    () => Object.entries(PURCHASE_TYPE_TEXT).map(([value, label]) => ({ value, label })),
    []
  );

  // 选择采购计划时的处理
  const handlePlanSelect = (plan: PurchasePlan) => {
    onSelectedPlanCodeChange(plan.purchaseApplicationCode);
    onCurrentEditingPlanChange(plan);
    // 同步所有字段（与 CreatePlanModal 保持一致）
    onBatchEditDataChange('purchaseType', plan.purchaseType);
    onBatchEditDataChange('relatedBatchCode', plan.relatedBatchCode || '');
    onBatchEditDataChange('otherBatchReason', (plan as any).otherBatchReason || '');
    onBatchEditDataChange('applicant', plan.applicant || '');
    onBatchEditDataChange('applicantDepartment', plan.applicantDepartment || '');
    onBatchEditDataChange('applyDate', plan.applyDate || '');
    onBatchEditDataChange('requiredDate', plan.requiredDate || '');
    onBatchEditDataChange('priority', plan.priority);
    onBatchEditDataChange('remark', plan.remark || '');
    onBatchEditDataChange('executionStatus', plan.executionStatus || 'pending_execution');
    onBatchEditItemsChange(plan.items || []);
    onBatchSelectOpenChange(false);
  };

  // 批次号选择下拉
  const handleBatchSelectOpen = (open: boolean) => {
    onBatchSelectOpenChange(open);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑采购申请单"
      // 2026-06-10: 统一 4 页面 × 新增/编辑弹窗尺寸 = 900×650
      size="xl"
      width={900}
      height={650}
      showFooter={true}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="default" size="sm" onClick={onNext}>
            <Check className="w-4 h-4" /> 确认（下一个）
          </Button>
          <Button variant="default" size="sm" onClick={onSubmit}>
            <Save className="w-4 h-4" /> 保存
          </Button>
        </div>
      }
    >
      {/* 内容区域全宽显示 */}
      <div className="space-y-4">
          {/* 提示信息 */}
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-800">已选择 <strong>{selectedRows.length}</strong> 个采购计划进行编辑</p>
          </div>

          {/* 采购申请批次号选择下拉 */}
          <div className="mb-4">
            <Label className="text-gray-700">选择采购申请批次号</Label>
            <BatchSelectDropdown
              selectedRows={selectedRows}
              purchasePlansData={purchasePlansData}
              selectedPlanCode={selectedPlanCode}
              batchSelectOpen={batchSelectOpen}
              editedPlans={editedPlans}
              onSelectOpenChange={handleBatchSelectOpen}
              onPlanCodeChange={onSelectedPlanCodeChange}
              onPlanSelect={handlePlanSelect}
            />
          </div>

          {/* 编辑表单 - 紧凑布局 2-3列，字段与 CreatePlanModal 完全一致 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* 第1行：采购申请批次号（只读）+ 采购类型 + 关联生产批次号 */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">采购申请批次号</div>
              <div className="text-sm font-medium text-gray-900">{currentEditingPlan?.purchaseApplicationCode || '-'}</div>
            </div>
            <div>
              <Label className="text-xs text-gray-700">采购类型</Label>
              <Select
                value={batchEditData.purchaseType}
                onValueChange={(v) => onBatchEditDataChange('purchaseType', v)}
              >
                <SelectTrigger className={`h-9 text-xs ${deepInputClass}`}><SelectValue placeholder="请选择" /></SelectTrigger>
                <SelectContent>
                  {purchaseTypeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-700">关联生产批次号</Label>
              <Select
                value={batchEditData.relatedBatchCode || ''}
                onValueChange={(v) => {
                  onBatchEditDataChange('relatedBatchCode', v);
                  if (v !== 'other') {
                    onBatchEditDataChange('otherBatchReason', '');
                  }
                }}
              >
                <SelectTrigger className={`h-9 text-xs ${deepInputClass}`}><SelectValue placeholder="不关联批次" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">不关联批次</SelectItem>
                  {batchOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 第1.5行：其他说明（仅当关联批次=其他时显示） */}
            {batchEditData.relatedBatchCode === 'other' && (
              <div className="md:col-span-3">
                <Label className="text-xs text-gray-700">其他说明</Label>
                <Input
                  value={batchEditData.otherBatchReason || ''}
                  onChange={(e) => onBatchEditDataChange('otherBatchReason', e.target.value)}
                  placeholder="请说明采购原因，如：日常用具、劳保用品等"
                  className={deepInputClass}
                />
              </div>
            )}

            {/* 第2行：申请人 + 申请部门 + 需求日期 */}
            <div>
              <Label className="text-xs text-gray-700">申请人</Label>
              <UserSelect
                // M-6: 统一从 batchEditData.applicant 读；改值时也只走 batchEditData
                value={batchEditData.applicant || currentEditingPlan?.applicantId || ''}
                onChange={(value) => {
                  if (currentEditingPlan) {
                    // 根据选择的用户ID获取用户姓名
                    const selectedUser = users.find(u => u.id === value);
                    const applicantName = selectedUser?.realName || selectedUser?.name || '';
                    onCurrentEditingPlanChange({
                      ...currentEditingPlan,
                      applicantId: value,
                      applicant: applicantName,
                    });
                    // 同步写回 batchEditData，保证保存时使用最新值
                    onBatchEditDataChange('applicant', applicantName);
                  }
                }}
                placeholder="请选择"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-700">申请部门</Label>
              <Select
                value={batchEditData.applicantDepartment || ''}
                onValueChange={(v) => onBatchEditDataChange('applicantDepartment', v)}
              >
                <SelectTrigger className={`h-9 text-xs ${deepInputClass}`}><SelectValue placeholder="请选择" /></SelectTrigger>
                <SelectContent>
                  {departmentOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-700">申请日期</Label>
              <Input
                type="date"
                value={batchEditData.applyDate}
                onChange={(e) => onBatchEditDataChange('applyDate', e.target.value)}
                className={deepInputClass}
              />
            </div>

            {/* 第3行：需求日期（独占一行更突出） */}
            <div>
              <Label className="text-xs text-gray-700">需求日期</Label>
              <Input
                type="date"
                value={batchEditData.requiredDate}
                onChange={(e) => onBatchEditDataChange('requiredDate', e.target.value)}
                className={deepInputClass}
              />
            </div>

            {/* 第3行：优先级 + 状态（只读不可编辑）+ 备注 */}
            <div>
              <Label className="text-xs text-gray-700">优先级</Label>
              <Select
                value={batchEditData.priority}
                onValueChange={(v) => onBatchEditDataChange('priority', v)}
              >
                <SelectTrigger className={`h-9 text-xs ${deepInputClass}`}><SelectValue placeholder="请选择" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">紧急</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="normal">中</SelectItem>
                  <SelectItem value="low">低</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-700">执行状态</Label>
              <Select
                value={batchEditData.executionStatus || 'pending_execution'}
                onValueChange={(v) => onBatchEditDataChange('executionStatus', v)}
              >
                <SelectTrigger className={`h-9 text-xs ${deepInputClass}`}><SelectValue placeholder="请选择" /></SelectTrigger>
                <SelectContent>
                  {PURCHASE_EXECUTION_STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">状态</div>
              <div className={`text-sm font-medium ${
                currentEditingPlan?.status === 'rejected' ? 'text-red-600' :
                currentEditingPlan?.status === 'pending' ? 'text-amber-600' :
                currentEditingPlan?.status === 'approved' ? 'text-blue-600' :
                'text-gray-600'
              }`}>
                {currentEditingPlan?.statusText || '-'}
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-700">备注</Label>
              <Input
                value={batchEditData.remark}
                onChange={(e) => onBatchEditDataChange('remark', e.target.value)}
                placeholder="输入备注"
                className={deepInputClass}
              />
            </div>

            {/* 第4行：物料明细（展开显示） */}
            <div className="md:col-span-3 border-t border-gray-300 pt-3 mt-2">
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onShowEditItemsExpandedChange(!showEditItemsExpanded)}
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showEditItemsExpanded ? 'rotate-180' : ''}`} />
                  物料明细（{batchEditItems.length || 0}种物料）
                </Button>
                {showEditItemsExpanded && (
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    onClick={() => {
                      const newItem: PurchasePlanItem = {
                        id: `new_${Date.now()}`,
                        materialId: '',
                        materialCode: '',
                        materialName: '',
                        category: '',
                        specification: '',
                        unit: '',
                        quantity: 0,
                        estimatedPrice: 0,
                        estimatedTotalPrice: 0,
                        supplier: '',
                        location: '',
                        batchNo: '',
                        productionDate: '',
                        expiryDate: '',
                        purpose: '',
                        remark: '',
                      };
                      onBatchEditItemsChange([...batchEditItems, newItem]);
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    新增物料
                  </Button>
                )}
              </div>

              {showEditItemsExpanded && batchEditItems.length > 0 && (
                <div className="mt-3 overflow-auto rounded-lg border border-gray-300 bg-white">
                  <MaterialItemsTable
                    items={batchEditItems}
                    mode="edit"
                    onItemsChange={onBatchEditItemsChange}
                  />
                </div>
              )}

              {showEditItemsExpanded && batchEditItems.length === 0 && (
                <div className="mt-3 text-center py-4 text-gray-500 text-sm border border-dashed border-gray-400 rounded-lg">
                  暂无物料明细，请点击"新增物料"按钮添加
                </div>
              )}
            </div>
          </div>
        </div>
    </Modal>
  );
}

export default BatchEditModal;
