// ============================================================
// 物料审批表单组件
// 文件路径：src/components/approval/MaterialApprovalForm.tsx
// 组件化结构：物料审批的部分通过表单
// ============================================================

import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, NumberInput, TextArea, Label } from '@/components/ui';
import type { Approval, BusinessLink } from '../../types/approval';

interface MaterialApprovalFormProps {
  approval: Approval;
  businessLink: Extract<BusinessLink, { type: 'material' }>;
  approvedItems: Record<string, number>;
  onChange: (items: Record<string, number>) => void;
  comment: string;
  onCommentChange: (comment: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function MaterialApprovalForm({
  approval,
  businessLink,
  approvedItems,
  onChange,
  comment,
  onCommentChange,
  onSubmit,
  onCancel,
}: MaterialApprovalFormProps) {
  const [localItems, setLocalItems] = useState<Record<string, number>>({});

  useEffect(() => {
    // 初始化本地状态
    const initial: Record<string, number> = {};
    businessLink.materials.forEach((mat) => {
      initial[mat.materialId] = mat.approvedQuantity ?? mat.requestedQuantity;
    });
    setLocalItems(initial);
    onChange(initial);
  }, [businessLink, onChange]);

  const handleQuantityChange = (materialId: string, value: number, max: number) => {
    const newValue = Math.max(0, Math.min(value, max));
    const newItems = { ...localItems, [materialId]: newValue };
    setLocalItems(newItems);
    onChange(newItems);
  };

  // 检查是否有物料数量不足
  const hasInsufficientMaterials = businessLink.materials.some(
    (mat) => (localItems[mat.materialId] ?? 0) < mat.requestedQuantity
  );

  // 计算不足的物料
  const insufficientMaterials = businessLink.materials.filter(
    (mat) => (localItems[mat.materialId] ?? 0) < mat.requestedQuantity
  );

  return (
    <div className="space-y-4">
      {/* 基础信息 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-gray-500 mb-1">领料单号</div>
          <div className="font-medium text-gray-900">{approval.code}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500 mb-1">标题</div>
          <div className="font-medium text-gray-900">{approval.title}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500 mb-1">申请人</div>
          <div className="font-medium text-gray-900">{approval.applicantName}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500 mb-1">申请部门</div>
          <div className="font-medium text-gray-900">{approval.applicantDepartment}</div>
        </div>
      </div>

      {/* 物料明细 */}
      <div>
        <div className="text-sm font-medium text-gray-700 mb-2">
          物料明细 - 请填写实际发放数量
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="text-xs font-medium text-gray-500">物料编码</TableHead>
                <TableHead className="text-xs font-medium text-gray-500">物料名称</TableHead>
                <TableHead className="text-right text-xs font-medium text-gray-500">申请数量</TableHead>
                <TableHead className="text-right text-xs font-medium text-gray-500">实际发放</TableHead>
                <TableHead className="text-right text-xs font-medium text-gray-500">差额</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {businessLink.materials.map((mat) => {
                const currentQty = localItems[mat.materialId] ?? mat.requestedQuantity;
                const diff = currentQty - mat.requestedQuantity;
                const isInsufficient = currentQty < mat.requestedQuantity;

                return (
                  <TableRow key={mat.materialId}>
                    <TableCell>{mat.materialCode}</TableCell>
                    <TableCell>{mat.materialName}</TableCell>
                    <TableCell className="text-right">
                      {mat.requestedQuantity} {mat.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <NumberInput
                          value={currentQty}
                          onChange={(value) =>
                            handleQuantityChange(
                              mat.materialId,
                              Number(value),
                              mat.requestedQuantity
                            )
                          }
                          decimals={0}
                          className={`w-20 ${isInsufficient ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                        />
                        <span className="text-gray-400 text-sm">{mat.unit}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`text-sm font-medium ${
                          diff === 0
                            ? 'text-gray-400'
                            : diff > 0
                            ? 'text-blue-600'
                            : 'text-red-600'
                        }`}
                      >
                        {diff > 0 ? '+' : ''}
                        {diff}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 不足提示 */}
      {hasInsufficientMaterials && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">部分物料数量不足</p>
              <div className="mt-2 text-sm text-amber-700">
                <p>以下物料实际发放数量小于申请数量：</p>
                <ul className="mt-1 space-y-1">
                  {insufficientMaterials.map((mat) => (
                    <li key={mat.materialId}>
                      · {mat.materialName}：申请 {mat.requestedQuantity}
                      {mat.unit}，实际发放 {localItems[mat.materialId] ?? 0}
                      {mat.unit}（不足 {(mat.requestedQuantity - (localItems[mat.materialId] ?? 0)).toString() }
                      {mat.unit}）
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-2 text-sm text-amber-800">
                系统将自动生成新的待审批领料单，包含不足数量的物料。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 审批意见 */}
      <div>
        <Label className="text-gray-700 mb-1">审批意见</Label>
        <TextArea
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder="请输入审批意见（可选）..."
          rows={3}
          className="w-full border-gray-200 rounded-lg text-sm focus:border-emerald-500"
        />
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button
          variant="outline"
          size="default"
          onClick={onCancel}
        >
          取消
        </Button>
        <Button
          variant="blue"
          size="default"
          onClick={onSubmit}
        >
          确认部分通过
        </Button>
      </div>
    </div>
  );
}

export default MaterialApprovalForm;
