// ============================================================
// 业务单据预览组件
// 文件路径：src/components/approval/BusinessPreview.tsx
// 组件化结构：根据审批类型展示不同的业务单据预览
// ============================================================

import React from 'react';
import type { Approval, BusinessLink, MaterialItem } from '../../types/approval';
import { getApprovalTypeName } from '../../types/approval';

interface BusinessPreviewProps {
  approval: Approval;
  businessLink?: BusinessLink;
}

export function BusinessPreview({ approval, businessLink }: BusinessPreviewProps) {
  if (!businessLink) {
    return (
      <div className="text-center py-8 text-gray-500">
        暂无业务单据数据
      </div>
    );
  }

  // 根据业务类型渲染不同的预览内容
  const renderMaterialPreview = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">领料单号</div>
          <div className="text-sm font-medium text-gray-900">{businessLink.requestCode}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">申请时间</div>
          <div className="text-sm text-gray-900">{approval.applyDate}</div>
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-500 mb-1">领料用途</div>
        <div className="text-sm text-gray-900">{businessLink.purpose || '-'}</div>
      </div>

      {businessLink.materials && businessLink.materials.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-2">物料明细</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">物料名称</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">申请数量</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">单位</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {businessLink.materials.map((mat, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-2 text-gray-900">{mat.materialName}</td>
                  <td className="px-3 py-2 text-right text-gray-900">{mat.requestedQuantity}</td>
                  <td className="px-3 py-2 text-right text-gray-900">{mat.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderPurchasePreview = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">采购单号</div>
          <div className="text-sm font-medium text-gray-900">{businessLink.requestCode}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">预计金额</div>
          <div className="text-sm font-medium text-emerald-600">
            ¥{businessLink.totalAmount?.toLocaleString() || '-'}
          </div>
        </div>
      </div>

      {businessLink.items && businessLink.items.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-2">采购明细</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">物料名称</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">数量</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">预计单价</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {businessLink.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-2 text-gray-900">{item.materialName}</td>
                  <td className="px-3 py-2 text-right text-gray-900">{item.quantity}</td>
                  <td className="px-3 py-2 text-right text-gray-900">¥{item.estimatedPrice}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {businessLink.expectedDeliveryDate && (
        <div>
          <div className="text-xs text-gray-500 mb-1">期望交付日期</div>
          <div className="text-sm text-gray-900">{businessLink.expectedDeliveryDate}</div>
        </div>
      )}
    </div>
  );

  const renderLeavePreview = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">请假类型</div>
          <div className="text-sm font-medium text-gray-900">
            {businessLink.leaveType === 'annual' ? '年假' :
             businessLink.leaveType === 'sick' ? '病假' :
             businessLink.leaveType === 'personal' ? '事假' :
             businessLink.leaveType === 'marriage' ? '婚假' :
             businessLink.leaveType === 'maternity' ? '产假' :
             businessLink.leaveType === 'funeral' ? '丧假' : '-'}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">请假天数</div>
          <div className="text-sm font-medium text-gray-900">{businessLink.totalDays} 天</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">开始日期</div>
          <div className="text-sm text-gray-900">{businessLink.startDate}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">结束日期</div>
          <div className="text-sm text-gray-900">{businessLink.endDate}</div>
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-500 mb-1">请假原因</div>
        <div className="text-sm text-gray-900">{businessLink.reason || '-'}</div>
      </div>
    </div>
  );

  const renderOrderPreview = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">订单编号</div>
          <div className="text-sm font-medium text-gray-900">{businessLink.requestCode}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">客户名称</div>
          <div className="text-sm text-gray-900">{businessLink.customerName || '-'}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">订单数量</div>
          <div className="text-sm text-gray-900">{businessLink.orderQuantity} {businessLink.unit}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">优先级</div>
          <div className={`text-sm font-medium ${
            businessLink.priority === 'urgent' ? 'text-red-600' :
            businessLink.priority === 'high' ? 'text-orange-600' : 'text-gray-900'
          }`}>
            {businessLink.priority === 'urgent' ? '紧急' :
             businessLink.priority === 'high' ? '高' :
             businessLink.priority === 'normal' ? '普通' : '-'}
          </div>
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-500 mb-1">交货日期</div>
        <div className="text-sm text-gray-900">{businessLink.deadline || '-'}</div>
      </div>
    </div>
  );

  const renderProductionPreview = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">计划编号</div>
          <div className="text-sm font-medium text-gray-900">{businessLink.planCode || businessLink.requestCode}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">作物名称</div>
          <div className="text-sm text-gray-900">{businessLink.cropName || '-'}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">计划开始</div>
          <div className="text-sm text-gray-900">{businessLink.plannedStartDate || '-'}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">计划结束</div>
          <div className="text-sm text-gray-900">{businessLink.plannedEndDate || '-'}</div>
        </div>
      </div>

      {businessLink.targetYield && (
        <div>
          <div className="text-xs text-gray-500 mb-1">目标产量</div>
          <div className="text-sm font-medium text-emerald-600">{businessLink.targetYield}</div>
        </div>
      )}
    </div>
  );

  // 技术方案预览
  const renderTechSolutionPreview = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">计划编号</div>
          <div className="text-sm font-medium text-gray-900">{businessLink.requestCode || '-'}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">方案标题</div>
          <div className="text-sm text-gray-900">{businessLink.solutionTitle || '-'}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">作物名称</div>
          <div className="text-sm text-gray-900">{businessLink.cropName || '-'}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">种植方式</div>
          <div className="text-sm text-gray-900">{businessLink.plantingMode || '-'}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">生长阶段</div>
          <div className="text-sm text-gray-900">{businessLink.stage || '-'}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">版本</div>
          <div className="text-sm text-gray-900">{businessLink.version || '-'}</div>
        </div>
      </div>
    </div>
  );

  // 根据业务类型选择渲染函数
  const renderContent = () => {
    switch (businessLink.type) {
      case 'material':
        return renderMaterialPreview();
      case 'purchase':
        return renderPurchasePreview();
      case 'leave':
        return renderLeavePreview();
      case 'order_create':
      case 'order_change':
        return renderOrderPreview();
      case 'production':
      case 'production_plan':
      case 'production_batch':
        return renderProductionPreview();
      case 'tech_solution':
        return renderTechSolutionPreview();
      default:
        return (
          <div className="text-center py-8 text-gray-500">
            暂不支持预览此类型审批单
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">业务单据预览</h4>
        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
          {getApprovalTypeName(approval.type)}
        </span>
      </div>
      {renderContent()}
    </div>
  );
}

export default BusinessPreview;
