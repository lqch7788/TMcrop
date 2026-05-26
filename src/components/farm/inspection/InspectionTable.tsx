import React from 'react';
import { MapPin } from 'lucide-react';
import { useUserStore } from '../../../stores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/Pagination';

// 巡查记录类型（简化版）
interface InspectionRecord {
  id: string;
  recordCode: string;
  inspectionType?: 'farm' | 'equipment' | 'infrastructure' | 'other';
  inspectorName: string;
  greenhouseName?: string;
  equipmentName?: string;
  infrastructureName?: string;
  remarks?: string;
  checkDate: string;
  // 新增字段
  status: string; // normal/critical
  issueCategories?: string[]; // 问题分类列表
  issuePresets?: string[]; // 快速勾选的问题
  issueText?: string;
  issueSeverity?: '轻微' | '中等' | '严重';
  issuePhotos?: string[];
  feedbackUsers?: string[]; // 反馈人员
  expectedCompletion?: string; // 期望完成时间
  // 原有字段保留
  issues: string[];
  images?: string[];
  issueStatus?: 'pending' | 'processing' | 'resolved';
  // 关联的问题ID（用于匹配问题数据）
  problemId?: number;
}

// 问题记录类型（用于流转进度展示）
interface ProblemEntry {
  id: number;
  status: '待处理' | '处理中' | '待验收' | '已处理';
  handler?: string;
  handleResult?: string;
  sourceTaskId?: string;
  flowRecords?: Array<{
    id: string;
    action: string;
    operatorName: string;
    actionTime: string;
    comment?: string;
  }>;
}

// 任务类型（用于获取实际进度）
interface TaskDispatchTask {
  id: string;
  status: string;
  progress?: number;
  sourceProblemId?: number;
}

interface InspectionTableProps {
  records: InspectionRecord[];
  currentPage: number;
  pageSize: number;
  selectedRows: number[];
  exportMode: boolean;
  batchEditMode: boolean;
  batchDeleteMode: boolean;
  onSelectRow: (index: number) => void;
  onSelectAll: () => void;
  onViewDetail: (record: InspectionRecord) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  // 新增：问题数据和操作
  problems?: ProblemEntry[];
  tasks?: TaskDispatchTask[];  // 任务列表，用于获取实际进度
  onAcceptance?: (problem: ProblemEntry) => void;
}

// 获取状态标签组件
function getStatusBadge(status: string) {
  switch (status) {
    case 'normal':
      return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">正常</span>;
    case 'warning':
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">注意</span>;
    case 'attention':
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">需关注</span>;
    case 'critical':
      return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">异常</span>;
    default:
      return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">未知</span>;
  }
}

/**
 * 巡查记录表格组件
 * 负责表格展示、分页、行选择等功能
 */
export function InspectionTable({
  records,
  currentPage,
  pageSize,
  selectedRows,
  exportMode,
  batchEditMode,
  batchDeleteMode,
  onSelectRow,
  onSelectAll,
  onViewDetail,
  onPageChange,
  onPageSizeChange,
  problems = [],
  tasks = [],
  onAcceptance,
}: InspectionTableProps) {
  // 从Zustand store获取用户列表
  const users = useUserStore((state) => state.users);
  const loadUsers = useUserStore((state) => state.loadUsers);

  React.useEffect(() => {
    if (users.length === 0) {
      loadUsers();
    }
  }, [users.length, loadUsers]);

  const totalPages = Math.ceil(records.length / pageSize) || 1;
  const showSelection = exportMode || batchEditMode || batchDeleteMode;

  // 根据 record 查找关联的问题
  const getProblemForRecord = (record: InspectionRecord): ProblemEntry | undefined => {
    // 优先通过 problemId 匹配
    if (record.problemId) {
      return problems.find(p => p.id === record.problemId);
    }
    // 通过温室名称和巡查日期匹配（没有 problemId 时使用）
    return problems.find(p =>
      record.checkDate === p.checkDate &&
      record.greenhouseName &&
      (record.greenhouseName.includes(p.greenhouseName || '') || (p.greenhouseName && p.greenhouseName.includes(record.greenhouseName)))
    );
  };

  // 根据问题获取关联的任务
  const getTaskForProblem = (problem: ProblemEntry): TaskDispatchTask | undefined => {
    if (!problem?.sourceTaskId) return undefined;
    return tasks.find(t => t.id === problem.sourceTaskId);
  };

  // 获取问题处理进度（优先使用任务的实际进度）
  const getProblemProgress = (problem: ProblemEntry): number => {
    if (!problem) return 0;
    // 优先获取关联任务的实际进度
    const task = getTaskForProblem(problem);
    if (task && task.progress !== undefined) {
      return task.progress;
    }
    // 如果没有任务，使用问题状态估算进度
    switch (problem.status) {
      case '待处理': return 0;
      case '处理中': return 50;
      case '待验收': return 100; // 待验收说明已提交完成
      case '已处理': return 100;
      default: return 0;
    }
  };

  // 是否显示验收按钮（待验收状态才显示）
  // 支持多种验收状态值
  const canAccept = (problem: ProblemEntry | undefined): boolean => {
    if (!problem) return false;
    const acceptStatuses = ['待验收', 'waiting_acceptance', 'waitingAcceptance', 'pending_acceptance', 'pendingAcceptance'];
    return acceptStatuses.includes(problem.status);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {showSelection && (
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap w-12">
                  <Input
                    type="checkbox"
                    checked={selectedRows.length === records.length && records.length > 0}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">巡查编号</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">巡查类型</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">提交人</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">位置/对象</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">巡查日期</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">巡查结果</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">问题分类</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">严重程度</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">反馈状态</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">反馈人员</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">处理进度</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">备注</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {records.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((record, idx) => (
              <tr key={record.id} className="hover:bg-blue-100 transition-colors">
                {showSelection && (
                  <td className="px-4 py-3 text-center">
                    <Input
                      type="checkbox"
                      checked={selectedRows.includes(idx)}
                      onChange={() => onSelectRow(idx)}
                      className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>
                )}
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  <Button
                    onClick={() => onViewDetail(record)}
                    variant="link"
                    size="sm"
                    className="font-medium"
                  >
                    {record.recordCode}
                  </Button>
                </td>
                <td className="px-4 py-3 text-center">
                  {record.inspectionType === 'farm' && (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">种植</span>
                  )}
                  {record.inspectionType === 'equipment' && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">设备</span>
                  )}
                  {record.inspectionType === 'infrastructure' && (
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">设施</span>
                  )}
                  {record.inspectionType === 'other' && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">其他</span>
                  )}
                  {!record.inspectionType && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-center text-gray-600 whitespace-nowrap">
                  <span className="font-medium text-gray-900 truncate block" title={record.inspectorName}>{record.inspectorName}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 min-w-[10em] max-w-[15em]">
                  <div className="flex items-center gap-1 overflow-hidden">
                    <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="text-gray-900 truncate block" title={
                      record.inspectionType === 'farm' && record.greenhouseName ||
                      record.inspectionType === 'equipment' && record.equipmentName ||
                      record.inspectionType === 'infrastructure' && record.infrastructureName ||
                      record.inspectionType === 'other' && record.remarks ||
                      record.greenhouseName || '-'
                    }>
                      {record.inspectionType === 'farm' && record.greenhouseName}
                      {record.inspectionType === 'equipment' && record.equipmentName}
                      {record.inspectionType === 'infrastructure' && record.infrastructureName}
                      {record.inspectionType === 'other' && record.remarks}
                      {!record.inspectionType && record.greenhouseName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-center text-gray-600 whitespace-nowrap">{record.checkDate}</td>
                <td className="px-4 py-3 text-center">
                  {record.status === 'normal' ? (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">正常</span>
                  ) : (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">异常</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {record.issueCategories && record.issueCategories.length > 0 ? (
                    <div className="flex gap-1 justify-center flex-wrap">
                      {record.issueCategories.slice(0, 2).map((cat, i) => {
                        const categoryLabels: Record<string, string> = {
                          disease: '病害',
                          pest: '虫害',
                          environment: '环境',
                          growth: '长势',
                          equipment: '设备',
                          other: '其他'
                        };
                        return (
                          <span key={i} className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full">
                            {categoryLabels[cat] || cat}
                          </span>
                        );
                      })}
                      {record.issueCategories.length > 2 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">+{record.issueCategories.length - 2}</span>
                      )}
                    </div>
                  ) : record.issuePresets && record.issuePresets.length > 0 ? (
                    <div className="flex gap-1 justify-center flex-wrap">
                      {record.issuePresets.slice(0, 2).map((preset, i) => (
                        <span key={i} className="px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded-full">{preset}</span>
                      ))}
                      {record.issuePresets.length > 2 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">+{record.issuePresets.length - 2}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {record.issueSeverity ? (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      record.issueSeverity === '严重' ? 'bg-red-100 text-red-700' :
                      record.issueSeverity === '中等' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {record.issueSeverity}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500">-</span>
                  )}
                </td>
                {/* 反馈状态列 */}
                <td className="px-4 py-3 text-center">
                  {(() => {
                    const problem = getProblemForRecord(record);
                    if (!problem?.flowRecords) {
                      return <span className="text-gray-300">-</span>;
                    }
                    // 查找最后一个包含 feedbackData 的记录
                    const submitRecord = [...(problem.flowRecords || [])]
                      .reverse()
                      .find(r => r.action === 'submit' && (r as any).feedbackData);
                    const feedbackData = submitRecord ? (submitRecord as any).feedbackData : null;
                    if (!feedbackData) {
                      return <span className="text-gray-300">-</span>;
                    }
                    return (
                      <div className="flex items-center justify-center gap-1">
                        {feedbackData.gpsLocation && (
                          <span title="GPS已打卡" className="text-emerald-600">📍</span>
                        )}
                        {feedbackData.photosBefore && feedbackData.photosBefore.length > 0 && (
                          <span title={`作业前照片${feedbackData.photosBefore.length}张`} className="text-blue-600">📷</span>
                        )}
                        {feedbackData.photosAfter && feedbackData.photosAfter.length > 0 && (
                          <span title={`作业后照片${feedbackData.photosAfter.length}张`} className="text-orange-600">📷</span>
                        )}
                        {feedbackData.materialCode && (
                          <span title="物资已扫码" className="text-purple-600">📦</span>
                        )}
                        {feedbackData.voiceNote && (
                          <span title="语音备注" className="text-red-600">🎤</span>
                        )}
                      </div>
                    );
                  })()}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {record.feedbackUsers && record.feedbackUsers.length > 0 ? (
                    <span className="text-gray-700" title={record.feedbackUsers.join('、')}>
                      {(() => {
                        // 优先从用户库按ID查找，查不到则直接显示（已为人名）
                        const names = record.feedbackUsers!.map(fu => {
                          const user = users.find(u => u.id === fu);
                          return user ? user.name : fu;
                        });
                        if (names.length <= 2) {
                          return names.join('、');
                        }
                        return names[0] + '等' + names.length + '人';
                      })()}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                {/* 处理进度列 */}
                <td className="px-4 py-3 text-center">
                  {(() => {
                    const problem = getProblemForRecord(record);
                    if (!problem) {
                      return <span className="text-gray-400 text-xs">-</span>;
                    }
                    const progress = getProblemProgress(problem);
                    const statusColors: Record<string, string> = {
                      '待处理': 'bg-gray-400',
                      '处理中': 'bg-blue-500',
                      '待验收': 'bg-amber-500',
                      '已处理': 'bg-green-500',
                    };
                    return (
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-12 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${statusColors[problem.status] || 'bg-gray-400'} rounded-full`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{progress}%</span>
                      </div>
                    );
                  })()}
                </td>
                {/* 操作列 */}
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  {(() => {
                    const problem = getProblemForRecord(record);
                    // 状态映射表（全部中文）
                    const statusMap: Record<string, string> = {
                      '待处理': '待处理',
                      '处理中': '处理中',
                      '待验收': '待验收',
                      '已处理': '已处理',
                      'pending': '待处理',
                      'processing': '处理中',
                      'waiting_acceptance': '待验收',
                      'waitingAcceptance': '待验收',
                      'pending_acceptance': '待验收',
                      'pendingAcceptance': '待验收',
                      'resolved': '已解决',
                      'completed': '已完成',
                      'completed_success': '已完成',
                      'completedSuccess': '已完成',
                    };
                    const status = problem?.status;
                    const displayStatus = status ? (statusMap[status] || status) : '';

                    if (canAccept(problem)) {
                      return (
                        <Button
                          onClick={() => onAcceptance?.(problem!)}
                          variant="default"
                          size="sm"
                        >
                          验收
                        </Button>
                      );
                    }
                    if (status && displayStatus && displayStatus !== '已处理') {
                      return <span className="text-xs text-blue-500 font-medium">{displayStatus}</span>;
                    }
                    if (status === '已处理') {
                      return <span className="text-xs text-green-500 font-medium">已处理</span>;
                    }
                    return <span className="text-gray-400 text-xs">-</span>;
                  })()}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-[10em]">
                  <span className="truncate block" title={record.remarks || ''}>
                    {record.remarks ? record.remarks.slice(0, 10) + (record.remarks.length > 10 ? '...' : '') : <span className="text-gray-400">-</span>}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {showSelection && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-4">
              <Button
                onClick={onSelectAll}
                variant="link"
                size="sm"
              >
                {selectedRows.length === records.length ? '全不选' : '全选'}
              </Button>
              <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
            </div>
          </div>
        )}
      </div>
      {/* 分页器 - 使用统一 Pagination 组件 */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={(size) => { onPageSizeChange(size); onPageChange(1); }}
        showPageSize={true}
      />
    </div>
  );
}

export default InspectionTable;
