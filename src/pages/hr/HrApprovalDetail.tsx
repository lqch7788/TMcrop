// ============================================================
// HR审批单详情页面
// 文件路径：src/pages/hr/HrApprovalDetail.tsx
// 功能：审批单详情展示、审批历史、附件、打印功能
// ============================================================

import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, Download, ArrowLeft, Clock, User, Calendar, FileText, CheckCircle, XCircle } from 'lucide-react';
import { Timeline, List, Card, Tag, Button } from 'antd';
import { useHrApprovals } from '../../hooks/useApproval';
import {
  Approval,
  ApprovalType,
  ApprovalStatus,
  ApprovalAction,
  getApprovalTypeName,
  getApprovalStatusName,
  BusinessLink,
} from '../../types/approval';
import StatusBadge from '../../components/common/badge/StatusBadge';
import ProModal from '../../components/common/modal/ProModal';

// ============================================================
// 审批类型名称映射
// ============================================================
const APPROVAL_TYPE_NAMES: Record<ApprovalType, string> = {
  [ApprovalType.LEAVE]: '请假申请',
  [ApprovalType.OVERTIME]: '加班申请',
  [ApprovalType.TRANSFER]: '调岗申请',
  [ApprovalType.RESIGNATION]: '离职申请',
  [ApprovalType.RECRUITMENT]: '招聘申请',
  [ApprovalType.MATERIAL_REQUEST]: '领料单',
  [ApprovalType.PURCHASE_REQUEST]: '采购申请',
  [ApprovalType.PRODUCTION_PLAN]: '生产计划',
  [ApprovalType.HARVEST_REQUEST]: '采收申请',
  [ApprovalType.RETURN_MATERIAL]: '退料单',
};

// ============================================================
// 请假类型映射
// ============================================================
const LEAVE_TYPE_NAMES: Record<string, string> = {
  annual: '年假',
  sick: '病假',
  personal: '事假',
  marriage: '婚假',
  maternity: '产假',
  funeral: '丧假',
};

// ============================================================
// 加班类型映射
// ============================================================
const OVERTIME_TYPE_NAMES: Record<string, string> = {
  weekday: '工作日加班',
  weekend: '周末加班',
  holiday: '节假日加班',
};

// ============================================================
// 优先级映射
// ============================================================
const PRIORITY_NAMES: Record<string, string> = {
  low: '低',
  normal: '普通',
  high: '高',
  urgent: '紧急',
};

// ============================================================
// HrApprovalDetailProps 接口
// ============================================================
interface HrApprovalDetailProps {
  /** 审批单ID */
  approvalId?: string;
  /** 是否弹窗模式 */
  isModal?: boolean;
  /** 弹窗关闭回调 */
  onClose?: () => void;
}

// ============================================================
// HrApprovalDetail 主组件
// ============================================================
export default function HrApprovalDetail({ approvalId, isModal = false, onClose }: HrApprovalDetailProps) {
  // 获取路由参数
  const params = useParams();
  const navigate = useNavigate();

  // 使用 HR 审批 Hook
  const { getApprovalById } = useHrApprovals();

  // 确定要显示的审批单ID
  const currentApprovalId = approvalId || params.id;

  // 获取审批详情
  const approval = useMemo(() => {
    if (!currentApprovalId) return null;
    return getApprovalById(currentApprovalId);
  }, [currentApprovalId, getApprovalById]);

  // 处理打印
  const handlePrint = () => {
    window.print();
  };

  // 处理关闭（弹窗模式）
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  // 处理附件下载
  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
  };

  // 渲染基础信息区域
  const renderBasicInfo = () => {
    if (!approval) return null;

    return (
      <Card title="审批信息" className="mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="info-item">
            <label className="text-sm text-gray-500">审批编号</label>
            <p className="font-medium">{approval.code}</p>
          </div>
          <div className="info-item">
            <label className="text-sm text-gray-500">审批类型</label>
            <p className="font-medium">{getApprovalTypeName(approval.type)}</p>
          </div>
          <div className="info-item">
            <label className="text-sm text-gray-500">申请人</label>
            <p className="font-medium">{approval.applicantName}</p>
          </div>
          <div className="info-item">
            <label className="text-sm text-gray-500">所属部门</label>
            <p className="font-medium">{approval.applicantDepartment}</p>
          </div>
          <div className="info-item">
            <label className="text-sm text-gray-500">申请时间</label>
            <p className="font-medium">{approval.applyDate} {approval.applyTime}</p>
          </div>
          <div className="info-item">
            <label className="text-sm text-gray-500">当前状态</label>
            <p className="font-medium">
              <StatusBadge status={approval.status} />
            </p>
          </div>
          <div className="info-item">
            <label className="text-sm text-gray-500">审批进度</label>
            <p className="font-medium">
              第 {approval.currentStep} / {approval.totalSteps} 步
            </p>
          </div>
          <div className="info-item">
            <label className="text-sm text-gray-500">优先级</label>
            <p className="font-medium">
              <Tag color={approval.priority === 'urgent' ? 'red' : approval.priority === 'high' ? 'orange' : 'default'}>
                {PRIORITY_NAMES[approval.priority] || approval.priority}
              </Tag>
            </p>
          </div>
        </div>
        {approval.title && (
          <div className="info-item mt-4">
            <label className="text-sm text-gray-500">标题</label>
            <p className="font-medium">{approval.title}</p>
          </div>
        )}
        {approval.description && (
          <div className="info-item mt-4">
            <label className="text-sm text-gray-500">描述</label>
            <p className="text-gray-700">{approval.description}</p>
          </div>
        )}
      </Card>
    );
  };

  // 渲染业务信息区域（根据不同审批类型显示不同内容）
  const renderBusinessInfo = () => {
    if (!approval?.businessLink) return null;
    const bl = approval.businessLink;

    return (
      <Card title="业务信息" className="mb-4">
        {/* 请假申请 */}
        {approval.type === ApprovalType.LEAVE && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">请假类型</label>
                <p className="font-medium">{LEAVE_TYPE_NAMES[bl.leaveType || ''] || bl.leaveType}</p>
              </div>
              {bl.startDate && (
                <div>
                  <label className="text-sm text-gray-500">开始日期</label>
                  <p className="font-medium">{bl.startDate}</p>
                </div>
              )}
              {bl.endDate && (
                <div>
                  <label className="text-sm text-gray-500">结束日期</label>
                  <p className="font-medium">{bl.endDate}</p>
                </div>
              )}
              {bl.totalDays && (
                <div>
                  <label className="text-sm text-gray-500">请假天数</label>
                  <p className="font-medium">{bl.totalDays} 天</p>
                </div>
              )}
            </div>
            {bl.reason && (
              <div>
                <label className="text-sm text-gray-500">请假原因</label>
                <p className="text-gray-700">{bl.reason}</p>
              </div>
            )}
            {bl.substituteName && (
              <div>
                <label className="text-sm text-gray-500">替班人员</label>
                <p className="font-medium">{bl.substituteName}</p>
              </div>
            )}
          </div>
        )}

        {/* 加班申请 */}
        {approval.type === ApprovalType.OVERTIME && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">加班类型</label>
                <p className="font-medium">{OVERTIME_TYPE_NAMES[bl.overtimeType || ''] || bl.overtimeType}</p>
              </div>
              {bl.date && (
                <div>
                  <label className="text-sm text-gray-500">加班日期</label>
                  <p className="font-medium">{bl.date}</p>
                </div>
              )}
              {bl.startTime && (
                <div>
                  <label className="text-sm text-gray-500">开始时间</label>
                  <p className="font-medium">{bl.startTime}</p>
                </div>
              )}
              {bl.endTime && (
                <div>
                  <label className="text-sm text-gray-500">结束时间</label>
                  <p className="font-medium">{bl.endTime}</p>
                </div>
              )}
              {bl.totalHours && (
                <div>
                  <label className="text-sm text-gray-500">总时长</label>
                  <p className="font-medium">{bl.totalHours} 小时</p>
                </div>
              )}
            </div>
            {bl.reason && (
              <div>
                <label className="text-sm text-gray-500">加班原因</label>
                <p className="text-gray-700">{bl.reason}</p>
              </div>
            )}
          </div>
        )}

        {/* 调岗申请 */}
        {approval.type === ApprovalType.TRANSFER && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              {bl.employeeName && (
                <div>
                  <label className="text-sm text-gray-500">员工姓名</label>
                  <p className="font-medium">{bl.employeeName}</p>
                </div>
              )}
              {bl.fromDepartment && (
                <div>
                  <label className="text-sm text-gray-500">原部门</label>
                  <p className="font-medium">{bl.fromDepartment}</p>
                </div>
              )}
              {bl.fromPosition && (
                <div>
                  <label className="text-sm text-gray-500">原岗位</label>
                  <p className="font-medium">{bl.fromPosition}</p>
                </div>
              )}
              {bl.toDepartment && (
                <div>
                  <label className="text-sm text-gray-500">调入部门</label>
                  <p className="font-medium">{bl.toDepartment}</p>
                </div>
              )}
              {bl.toPosition && (
                <div>
                  <label className="text-sm text-gray-500">调入岗位</label>
                  <p className="font-medium">{bl.toPosition}</p>
                </div>
              )}
              {bl.effectiveDate && (
                <div>
                  <label className="text-sm text-gray-500">生效日期</label>
                  <p className="font-medium">{bl.effectiveDate}</p>
                </div>
              )}
            </div>
            {bl.reason && (
              <div>
                <label className="text-sm text-gray-500">调岗原因</label>
                <p className="text-gray-700">{bl.reason}</p>
              </div>
            )}
          </div>
        )}

        {/* 离职申请 */}
        {approval.type === ApprovalType.RESIGNATION && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              {bl.employeeName && (
                <div>
                  <label className="text-sm text-gray-500">员工姓名</label>
                  <p className="font-medium">{bl.employeeName}</p>
                </div>
              )}
              {bl.department && (
                <div>
                  <label className="text-sm text-gray-500">所属部门</label>
                  <p className="font-medium">{bl.department}</p>
                </div>
              )}
              {bl.position && (
                <div>
                  <label className="text-sm text-gray-500">岗位</label>
                  <p className="font-medium">{bl.position}</p>
                </div>
              )}
              {bl.joinDate && (
                <div>
                  <label className="text-sm text-gray-500">入职日期</label>
                  <p className="font-medium">{bl.joinDate}</p>
                </div>
              )}
              {bl.expectedResignDate && (
                <div>
                  <label className="text-sm text-gray-500">预计离职日期</label>
                  <p className="font-medium">{bl.expectedResignDate}</p>
                </div>
              )}
            </div>
            {bl.reason && (
              <div>
                <label className="text-sm text-gray-500">离职原因</label>
                <p className="text-gray-700">{bl.reason}</p>
              </div>
            )}
            {bl.handoverNotes && (
              <div>
                <label className="text-sm text-gray-500">交接说明</label>
                <p className="text-gray-700">{bl.handoverNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* 招聘申请 */}
        {approval.type === ApprovalType.RECRUITMENT && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              {bl.department && (
                <div>
                  <label className="text-sm text-gray-500">招聘部门</label>
                  <p className="font-medium">{bl.department}</p>
                </div>
              )}
              {bl.position && (
                <div>
                  <label className="text-sm text-gray-500">招聘岗位</label>
                  <p className="font-medium">{bl.position}</p>
                </div>
              )}
              {bl.headcount && (
                <div>
                  <label className="text-sm text-gray-500">招聘人数</label>
                  <p className="font-medium">{bl.headcount} 人</p>
                </div>
              )}
              {bl.employmentType && (
                <div>
                  <label className="text-sm text-gray-500">用工类型</label>
                  <p className="font-medium">{bl.employmentType}</p>
                </div>
              )}
              {bl.salaryMin && bl.salaryMax && (
                <div>
                  <label className="text-sm text-gray-500">薪资范围</label>
                  <p className="font-medium">{bl.salaryMin} - {bl.salaryMax} 元/月</p>
                </div>
              )}
              {bl.priority && (
                <div>
                  <label className="text-sm text-gray-500">优先级</label>
                  <p className="font-medium">
                    <Tag color={bl.priority === 'urgent' ? 'red' : bl.priority === 'high' ? 'orange' : 'default'}>
                      {PRIORITY_NAMES[bl.priority]}
                    </Tag>
                  </p>
                </div>
              )}
            </div>
            {bl.reason && (
              <div>
                <label className="text-sm text-gray-500">招聘原因</label>
                <p className="text-gray-700">{bl.reason}</p>
              </div>
            )}
          </div>
        )}
      </Card>
    );
  };

  // 渲染审批流程区域
  const renderApprovalFlow = () => {
    if (!approval?.approvers || approval.approvers.length === 0) return null;

    return (
      <Card title="审批流程" className="mb-4">
        <div className="space-y-2">
          {approval.approvers.map((approver, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                  approver.status === 'approved' ? 'bg-green-500' :
                  approver.status === 'rejected' ? 'bg-red-500' :
                  approver.status === 'skipped' ? 'bg-gray-400' :
                  'bg-yellow-500'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium">{approver.userName}</p>
                  <p className="text-sm text-gray-500">{approver.role}</p>
                </div>
              </div>
              <div className="text-right">
                <StatusBadge
                  status={
                    approver.status === 'approved' ? ApprovalStatus.APPROVED :
                    approver.status === 'rejected' ? ApprovalStatus.REJECTED :
                    ApprovalStatus.PENDING
                  }
                />
                {approver.actionTime && (
                  <p className="text-xs text-gray-400 mt-1">{approver.actionTime}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  // 渲染审批历史区域（使用 Timeline）
  const renderApprovalHistory = () => {
    if (!approval?.records || approval.records.length === 0) return null;

    // 获取动作图标和颜色
    const getActionConfig = (action: ApprovalAction) => {
      switch (action) {
        case ApprovalAction.APPROVE:
          return { icon: <CheckCircle className="w-4 h-4" />, color: 'green' };
        case ApprovalAction.REJECT:
          return { icon: <XCircle className="w-4 h-4" />, color: 'red' };
        case ApprovalAction.PARTIALLY_APPROVE:
          return { icon: <CheckCircle className="w-4 h-4" />, color: 'blue' };
        case ApprovalAction.CANCEL:
          return { icon: <XCircle className="w-4 h-4" />, color: 'gray' };
        default:
          return { icon: <Clock className="w-4 h-4" />, color: 'gray' };
      }
    };

    // 获取动作名称
    const getActionName = (action: ApprovalAction) => {
      switch (action) {
        case ApprovalAction.APPROVE:
          return '通过';
        case ApprovalAction.REJECT:
          return '拒绝';
        case ApprovalAction.PARTIALLY_APPROVE:
          return '部分通过';
        case ApprovalAction.CANCEL:
          return '撤回';
        default:
          return action;
      }
    };

    return (
      <Card title="审批历史" className="mb-4">
        <Timeline
          mode="left"
          items={approval.records.map((record, index) => {
            const config = getActionConfig(record.action);
            return {
              key: record.id || index,
              color: config.color,
              icon: config.icon,
              children: (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{record.approverName}</span>
                    <span className="text-sm text-gray-500">{record.actionTime}</span>
                  </div>
                  <div className="text-sm">
                    <span className={`font-medium ${
                      record.action === ApprovalAction.APPROVE ? 'text-green-600' :
                      record.action === ApprovalAction.REJECT ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {getActionName(record.action)}
                    </span>
                  </div>
                  {record.comment && (
                    <div className="mt-2 text-sm text-gray-600 bg-white p-2 rounded">
                      意见：{record.comment}
                    </div>
                  )}
                </div>
              ),
            };
          })}
        />
      </Card>
    );
  };

  // 渲染附件区域
  const renderAttachments = () => {
    if (!approval?.attachments || approval.attachments.length === 0) return null;

    return (
      <Card title="附件列表" className="mb-4">
        <List
          size="small"
          dataSource={approval.attachments}
          renderItem={(item, index) => (
            <List.Item
              actions={[
                <Button
                  key="download"
                  type="link"
                  icon={<Download className="w-4 h-4" />}
                  onClick={() => handleDownload(item, `附件${index + 1}`)}
                >
                  下载
                </Button>
              ]}
            >
              <List.Item.Meta
                avatar={<FileText className="w-5 h-5 text-blue-500" />}
                title={`附件 ${index + 1}`}
                description={item}
              />
            </List.Item>
          )}
        />
      </Card>
    );
  };

  // 加载状态
  if (!approval) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  // 页面内容
  const pageContent = (
    <div className={`approval-detail ${isModal ? '' : 'p-6'}`}>
      {/* 打印样式 - 不显示操作按钮 */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .approval-detail {
            padding: 0 !important;
          }
        }
      `}</style>

      {/* 头部（仅非弹窗模式显示） */}
      {!isModal && (
        <div className="bg-white rounded-xl p-6 shadow-sm mb-4 no-print">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">审批单详情</h1>
                <p className="text-gray-500">查看审批申请详细信息</p>
              </div>
            </div>
            <div className="flex items-center gap-2 no-print">
              <Button
                icon={<Printer className="w-4 h-4" />}
                onClick={handlePrint}
              >
                打印
              </Button>
              <Button onClick={handleClose}>
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 基础信息 */}
      {renderBasicInfo()}

      {/* 业务信息 */}
      {renderBusinessInfo()}

      {/* 审批流程 */}
      {renderApprovalFlow()}

      {/* 审批历史 */}
      {renderApprovalHistory()}

      {/* 附件列表 */}
      {renderAttachments()}

      {/* 底部操作按钮（弹窗模式下显示） */}
      {isModal && (
        <div className="flex justify-end gap-2 mt-4 no-print">
          <Button icon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
            打印
          </Button>
          <Button onClick={handleClose}>
            关闭
          </Button>
        </div>
      )}
    </div>
  );

  // 如果是弹窗模式，用 ProModal 包裹
  if (isModal) {
    return (
      <ProModal
        title="审批单详情"
        type="info"
        open={true}
        onCancel={onClose}
        width={800}
        footer={null}
      >
        {pageContent}
      </ProModal>
    );
  }

  return pageContent;
}
