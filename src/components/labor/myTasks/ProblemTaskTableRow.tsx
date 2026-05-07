/**
 * 巡查反馈任务表格行组件
 */

import { MapPin, CheckCircle, XCircle, Play, Eye, Edit } from 'lucide-react';
import { TaskWithExtras, TaskDispatchTask } from './types';

interface ProblemTaskTableRowProps {
  task: TaskDispatchTask | Task;
  unifiedTasks: Array<{ id: string; taskCode?: string }>;
  acceptTask: (taskId: string) => void;
  onAccept: (task: TaskDispatchTask) => void;
  onReject: (task: TaskDispatchTask) => void;
  onContinueExecution: (task: TaskDispatchTask) => void;
  onOpenFeedbackModal: (task: TaskDispatchTask) => void;
  onOpenDetailModal: (task: TaskDispatchTask) => void;
}

/**
 * 巡查反馈任务表格行组件
 */
export function ProblemTaskTableRow({
  task,
  onAccept,
  onReject,
  onContinueExecution,
  onOpenFeedbackModal,
  onOpenDetailModal,
}: ProblemTaskTableRowProps) {
  const taskWithExtras = task as TaskWithExtras;

  // 巡查类型映射
  const getInspectionTypeConfig = (type: string) => {
    const typeMap: Record<string, { label: string; className: string }> = {
      '农场巡查': { label: '种植', className: 'bg-emerald-100 text-emerald-700' },
      '设备巡查': { label: '设备', className: 'bg-blue-100 text-blue-700' },
      '设施巡查': { label: '设施', className: 'bg-amber-100 text-amber-700' },
      '其他巡查': { label: '其他', className: 'bg-purple-100 text-purple-700' },
      'farm': { label: '种植', className: 'bg-emerald-100 text-emerald-700' },
      'equipment': { label: '设备', className: 'bg-blue-100 text-blue-700' },
      'infrastructure': { label: '设施', className: 'bg-amber-100 text-amber-700' },
      'other': { label: '其他', className: 'bg-purple-100 text-purple-700' },
    };
    return typeMap[type] || { label: '种植', className: 'bg-emerald-100 text-emerald-700' };
  };

  // 巡查结果配置
  const getCheckResultConfig = (result: string) => {
    const isNormal = result === '正常' || result === '轻微' || result === 'low';
    return isNormal
      ? { label: '正常', className: 'bg-emerald-100 text-emerald-700' }
      : { label: '异常', className: 'bg-red-100 text-red-700' };
  };

  // 严重程度配置
  const getSeverityConfig = (severity: string) => {
    if (severity === '严重' || severity === 'high') {
      return { label: '严重', className: 'bg-red-100 text-red-700' };
    }
    if (severity === '中等' || severity === 'medium') {
      return { label: '中等', className: 'bg-amber-100 text-amber-700' };
    }
    return { label: '轻微', className: 'bg-gray-100 text-gray-700' };
  };

  // 反馈状态配置
  const getFeedbackStatusConfig = (fbStatus: string) => {
    const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
      pending: { label: '待接受', bg: 'bg-gray-100', color: 'text-gray-600' },
      accepted: { label: '已接受', bg: 'bg-blue-100', color: 'text-blue-600' },
      in_progress: { label: '处理中', bg: 'bg-blue-100', color: 'text-blue-600' },
      waiting_acceptance: { label: '待验收', bg: 'bg-amber-100', color: 'text-amber-600' },
      completed: { label: '已完成', bg: 'bg-green-100', color: 'text-green-600' },
      rejected: { label: '返工中', bg: 'bg-red-100', color: 'text-red-600' },
      待接受: { label: '待接受', bg: 'bg-gray-100', color: 'text-gray-600' },
      已接受: { label: '已接受', bg: 'bg-blue-100', color: 'text-blue-600' },
      处理中: { label: '处理中', bg: 'bg-blue-100', color: 'text-blue-600' },
      待验收: { label: '待验收', bg: 'bg-amber-100', color: 'text-amber-600' },
      已完成: { label: '已完成', bg: 'bg-green-100', color: 'text-green-600' },
      返工中: { label: '返工中', bg: 'bg-red-100', color: 'text-red-600' },
    };
    return statusConfig[fbStatus] || { label: fbStatus, bg: 'bg-gray-100', color: 'text-gray-600' };
  };

  const inspectionTypeConfig = getInspectionTypeConfig(taskWithExtras.inspectionType || 'farm');
  const checkResultConfig = getCheckResultConfig(taskWithExtras.checkResult || taskWithExtras.issueSeverity || '');
  const severityConfig = getSeverityConfig(taskWithExtras.issueSeverity || taskWithExtras.priority || '');
  const feedbackStatusConfig = getFeedbackStatusConfig(taskWithExtras.feedbackStatus || task.status);
  const progress = parseInt(String(taskWithExtras.processProgress || task.progress || 0));

  return (
    <>
      {/* 巡查编号 */}
      <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
        <button
          onClick={() => onOpenDetailModal(task)}
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          {taskWithExtras.sourceId || taskWithExtras.recordCode || task.taskCode || '-'}
        </button>
      </td>
      {/* 巡查类型 */}
      <td className="px-3 py-3 text-center">
        <span className={`px-2 py-1 text-xs rounded-full ${inspectionTypeConfig.className}`}>
          {inspectionTypeConfig.label}
        </span>
      </td>
      {/* 提交人 */}
      <td className="px-3 py-3 text-sm text-center text-gray-600 whitespace-nowrap">
        <span className="font-medium text-gray-900 truncate block" title={taskWithExtras.submitterName || task.assigneeName || '-'}>
          {taskWithExtras.submitterName || task.assigneeName || '-'}
        </span>
      </td>
      {/* 位置/对象 */}
      <td className="px-3 py-3 text-sm text-gray-600 min-w-[10em] max-w-[15em]">
        <div className="flex items-center gap-1 overflow-hidden">
          <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="text-gray-900 truncate block" title={taskWithExtras.location || task.greenhouseName || task.field || '-'}>
            {taskWithExtras.location || task.greenhouseName || task.field || '-'}
          </span>
        </div>
      </td>
      {/* 巡查日期 */}
      <td className="px-3 py-3 text-sm text-center text-gray-600 whitespace-nowrap">
        {taskWithExtras.checkDate || task.planStart?.split(' ')[0] || '-'}
      </td>
      {/* 巡查结果 */}
      <td className="px-3 py-3 text-center">
        <span className={`px-2 py-1 ${checkResultConfig.className} text-xs rounded-full`}>
          {checkResultConfig.label}
        </span>
      </td>
      {/* 问题分类 */}
      <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
        {(() => {
          const cats = taskWithExtras.issueCategories || [];
          if (Array.isArray(cats) && cats.length > 0) {
            return (
              <div className="flex gap-1 justify-center flex-wrap">
                {cats.slice(0, 2).map((cat: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full">
                    {cat}
                  </span>
                ))}
                {cats.length > 2 && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">+{cats.length - 2}</span>
                )}
              </div>
            );
          }
          return <span className="text-sm text-gray-500">-</span>;
        })()}
      </td>
      {/* 严重程度 */}
      <td className="px-3 py-3 text-center">
        <span className={`px-2 py-1 ${severityConfig.className} text-xs rounded-full`}>
          {severityConfig.label}
        </span>
      </td>
      {/* 问题照片 */}
      <td className="px-3 py-3 text-center whitespace-nowrap">
        {(() => {
          const photos = taskWithExtras.photos || [];
          if (photos.length > 0) {
            return (
              <div className="flex justify-center gap-1">
                {photos.slice(0, 3).map((img: string, imgIdx: number) => (
                  <div key={imgIdx} className="w-8 h-8 rounded overflow-hidden bg-gray-100">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
                {photos.length > 3 && (
                  <span className="flex items-center justify-center w-8 h-8 text-xs text-gray-500">+{photos.length - 3}</span>
                )}
              </div>
            );
          }
          return <span className="text-sm text-gray-500">-</span>;
        })()}
      </td>
      {/* 反馈状态 */}
      <td className="px-3 py-3 text-center">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${feedbackStatusConfig.bg} ${feedbackStatusConfig.color}`}>
          {feedbackStatusConfig.label}
        </span>
      </td>
      {/* 反馈人员 */}
      <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
        {(() => {
          const users = taskWithExtras.feedbackUsers || [];
          return Array.isArray(users) && users.length > 0 ? users[0] : '-';
        })()}
      </td>
      {/* 处理进度 */}
      <td className="px-3 py-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <div className="w-12 bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{progress}%</span>
        </div>
      </td>
      {/* 操作列 */}
      <td className="px-3 py-3 whitespace-nowrap">
        {task.status === 'pending' && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onAccept(task)}
              className="flex items-center gap-1 px-2 py-1.5 text-white bg-green-500 hover:bg-green-600 rounded-lg text-xs font-medium transition-colors"
              title="接受任务"
            >
              <CheckCircle className="w-3 h-3" />
              接受
            </button>
            <button
              onClick={() => onReject(task)}
              className="flex items-center gap-1 px-2 py-1.5 text-white bg-red-500 hover:bg-red-600 rounded-lg text-xs font-medium transition-colors"
              title="拒绝任务"
            >
              <XCircle className="w-3 h-3" />
              拒绝
            </button>
          </div>
        )}
        {(task.status === 'accepted' || task.status === 'in_progress') && (
          <button
            onClick={() => onOpenFeedbackModal(task)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-white bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors"
            title="点击提交进度"
          >
            <Edit className="w-4 h-4" />
            提交进度
          </button>
        )}
        {task.status === 'rejected' && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onContinueExecution(task)}
              className="flex items-center gap-1 px-2 py-1.5 text-white bg-orange-500 hover:bg-orange-600 rounded-lg text-xs font-medium transition-colors"
              title="点击继续执行"
            >
              <Play className="w-3 h-3" />
              继续执行
            </button>
            <button
              onClick={() => onOpenDetailModal(task)}
              className="flex items-center gap-1 px-2 py-1.5 text-gray-600 hover:text-white bg-gray-100 hover:bg-gray-500 rounded-lg text-xs font-medium transition-colors"
              title="点击查看详情"
            >
              <Eye className="w-3 h-3" />
              查看
            </button>
          </div>
        )}
        {(task.status === 'waiting_acceptance' || task.status === 'completed') && (
          <button
            onClick={() => onOpenDetailModal(task)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:text-white bg-gray-100 hover:bg-gray-500 rounded-lg text-sm font-medium transition-colors"
            title="点击查看详情"
          >
            <Eye className="w-4 h-4" />
            查看
          </button>
        )}
      </td>
      {/* 备注 */}
      <td className="px-3 py-3 text-sm text-gray-600 max-w-[10em]">
        <span className="truncate block" title={taskWithExtras.issueText || taskWithExtras.remarks || ''}>
          {((taskWithExtras.issueText || taskWithExtras.remarks || '') as string).slice(0, 10) || '-'}
        </span>
      </td>
    </>
  );
}

export default ProblemTaskTableRow;
