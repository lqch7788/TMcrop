/**
 * 采购计划批量编辑弹窗组件
 */
import React, { useRef, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ChevronDown, Trash2, Plus } from 'lucide-react';
import { UserSelect } from '../common/settings/UserSelect';
import { useUserStore } from '../../stores';
import type { PurchasePlan, PurchasePlanItem } from '../../types/purchase';

interface BatchEditModalProps {
  // 弹窗状态
  isOpen: boolean;
  onClose: () => void;
  // 选中状态
  selectedRows: string[];
  selectedPlanCode: string;
  currentEditingPlan: PurchasePlan | null;
  // 编辑数据
  batchEditData: {
    purchaseType: string;
    priority: string;
    requiredDate: string;
    remark: string;
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
 * 物料明细表格组件
 */
function MaterialItemsEditTable({
  items,
  onItemsChange,
}: {
  items: PurchasePlanItem[];
  onItemsChange: (items: PurchasePlanItem[]) => void;
}) {
  return (
    <div className="overflow-auto rounded-lg border border-gray-300 bg-white">
      <table className="w-full text-xs">
        <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0">
          <tr>
            <th className="px-2 py-2 text-center font-semibold w-10">操作</th>
            <th className="px-2 py-2 text-left font-semibold">物料编码</th>
            <th className="px-2 py-2 text-left font-semibold">物料名称</th>
            <th className="px-2 py-2 text-left font-semibold">分类</th>
            <th className="px-2 py-2 text-left font-semibold">规格型号</th>
            <th className="px-2 py-2 text-center font-semibold w-16">单位</th>
            <th className="px-2 py-2 text-center font-semibold w-24">数量</th>
            <th className="px-2 py-2 text-center font-semibold w-28">预估单价</th>
            <th className="px-2 py-2 text-left font-semibold">供应商</th>
            <th className="px-2 py-2 text-left font-semibold">用途说明</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              {/* 删除按钮 */}
              <td className="px-2 py-2 text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    onItemsChange(items.filter((_, i) => i !== idx));
                  }}
                  title="删除此行"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </td>
              {/* 物料编码 */}
              <td className="px-2 py-2">
                <Input
                  value={item.materialCode || ''}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[idx] = { ...newItems[idx], materialCode: e.target.value };
                    onItemsChange(newItems);
                  }}
                  className={deepInputClass}
                />
              </td>
              {/* 物料名称 */}
              <td className="px-2 py-2">
                <Input
                  value={item.materialName || ''}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[idx] = { ...newItems[idx], materialName: e.target.value };
                    onItemsChange(newItems);
                  }}
                  className={deepInputClass}
                />
              </td>
              {/* 分类 */}
              <td className="px-2 py-2">
                <Input
                  value={item.category || ''}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[idx] = { ...newItems[idx], category: e.target.value };
                    onItemsChange(newItems);
                  }}
                  className={deepInputClass}
                />
              </td>
              {/* 规格型号 */}
              <td className="px-2 py-2">
                <Input
                  value={item.specification || ''}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[idx] = { ...newItems[idx], specification: e.target.value };
                    onItemsChange(newItems);
                  }}
                  className={deepInputClass}
                />
              </td>
              {/* 单位 */}
              <td className="px-2 py-2">
                <Input
                  value={item.unit || ''}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[idx] = { ...newItems[idx], unit: e.target.value };
                    onItemsChange(newItems);
                  }}
                  className="h-7 p-1 text-xs text-center rounded border-gray-300"
                />
              </td>
              {/* 数量 */}
              <td className="px-2 py-2">
                <Input
                  type="number"
                  value={item.quantity || 0}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[idx] = { ...newItems[idx], quantity: Number(e.target.value) };
                    onItemsChange(newItems);
                  }}
                  className="h-7 p-1 text-xs text-right rounded border-gray-300"
                />
              </td>
              {/* 预估单价 */}
              <td className="px-2 py-2">
                <Input
                  type="number"
                  step="0.01"
                  value={item.estimatedPrice || 0}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[idx] = { ...newItems[idx], estimatedPrice: Number(e.target.value) };
                    onItemsChange(newItems);
                  }}
                  className="h-7 p-1 text-xs text-right rounded border-gray-300"
                />
              </td>
              {/* 供应商 */}
              <td className="px-2 py-2">
                <Input
                  value={item.supplier || ''}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[idx] = { ...newItems[idx], supplier: e.target.value };
                    onItemsChange(newItems);
                  }}
                  className={deepInputClass}
                />
              </td>
              {/* 用途说明 */}
              <td className="px-2 py-2">
                <Input
                  value={item.purpose || ''}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[idx] = { ...newItems[idx], purpose: e.target.value };
                    onItemsChange(newItems);
                  }}
                  className={deepInputClass}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
  const users = useUserStore((state) => state.users);
  const loadUsers = useUserStore((state) => state.loadUsers);

  useEffect(() => {
    if (users.length === 0) {
      loadUsers();
    }
  }, [users.length, loadUsers]);

  // 选择采购计划时的处理
  const handlePlanSelect = (plan: PurchasePlan) => {
    onSelectedPlanCodeChange(plan.purchaseApplicationCode);
    onCurrentEditingPlanChange(plan);
    onBatchEditDataChange('purchaseType', plan.purchaseType);
    onBatchEditDataChange('priority', plan.priority);
    onBatchEditDataChange('requiredDate', plan.requiredDate || '');
    onBatchEditDataChange('remark', plan.remark || '');
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
      size="xxl"
      showFooter={true}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="default" size="sm" onClick={onNext}>
            确认（下一个）
          </Button>
          <Button variant="default" size="sm" onClick={onSubmit}>
            保存
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

          {/* 编辑表单 - 紧凑布局 2-3列 */}
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
                  <SelectItem value="production">生产物资采购</SelectItem>
                  <SelectItem value="urgent">紧急采购</SelectItem>
                  <SelectItem value="routine">常规采购</SelectItem>
                  <SelectItem value="material">通用物资</SelectItem>
                  <SelectItem value="safety">劳保用品</SelectItem>
                  <SelectItem value="equipment">设备采购</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-700">关联生产批次号</Label>
              <Select
                value={currentEditingPlan?.relatedBatchCode || ''}
                onValueChange={(v) => {
                  if (currentEditingPlan) {
                    onCurrentEditingPlanChange({ ...currentEditingPlan, relatedBatchCode: v });
                  }
                }}
              >
                <SelectTrigger className={`h-9 text-xs ${deepInputClass}`}><SelectValue placeholder="不关联批次" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">不关联批次</SelectItem>
                  <SelectItem value="ZZB2026-001">ZZB2026-001 - 番茄种植批次</SelectItem>
                  <SelectItem value="ZZB2026-002">ZZB2026-002 - 黄瓜种植批次</SelectItem>
                  <SelectItem value="ZZB2026-003">ZZB2026-003 - 草莓种植批次</SelectItem>
                  <SelectItem value="YMB2026-001">YMB2026-001 - 番茄育苗批次</SelectItem>
                  <SelectItem value="YMB2026-002">YMB2026-002 - 黄瓜育苗批次</SelectItem>
                  <SelectItem value="JZB2026-001">JZB2026-001 - 番茄种源批次</SelectItem>
                  <SelectItem value="JZB2026-002">JZB2026-002 - 黄瓜种源批次</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 第2行：申请人 + 申请部门 + 需求日期 */}
            <div>
              <Label className="text-xs text-gray-700">申请人</Label>
              <UserSelect
                value={currentEditingPlan?.applicantId || ''}
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
                  }
                }}
                placeholder="请选择"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-700">申请部门</Label>
              <Select
                value={currentEditingPlan?.applicantDepartment || ''}
                onValueChange={(v) => {
                  if (currentEditingPlan) {
                    onCurrentEditingPlanChange({ ...currentEditingPlan, applicantDepartment: v });
                  }
                }}
              >
                <SelectTrigger className={`h-9 text-xs ${deepInputClass}`}><SelectValue placeholder="请选择" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="生产部">生产部</SelectItem>
                  <SelectItem value="技术部">技术部</SelectItem>
                  <SelectItem value="后勤部">后勤部</SelectItem>
                  <SelectItem value="办公室">办公室</SelectItem>
                  <SelectItem value="财务部">财务部</SelectItem>
                  <SelectItem value="采购部">采购部</SelectItem>
                  <SelectItem value="仓储部">仓储部</SelectItem>
                  <SelectItem value="销售部">销售部</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">状态</div>
              <div className={`text-sm font-medium ${
                currentEditingPlan?.status === 'completed' ? 'text-green-600' :
                currentEditingPlan?.status === 'purchasing' ? 'text-purple-600' :
                currentEditingPlan?.status === 'pending' ? 'text-amber-600' :
                currentEditingPlan?.status === 'approved' ? 'text-blue-600' :
                currentEditingPlan?.status === 'cancelled' ? 'text-red-600' :
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
                <div className="mt-3">
                  <MaterialItemsEditTable items={batchEditItems} onItemsChange={onBatchEditItemsChange} />
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
