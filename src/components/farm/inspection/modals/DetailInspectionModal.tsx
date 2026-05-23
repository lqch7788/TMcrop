import React, { useEffect } from 'react';
import { Modal } from '../../../ui/Modal';
import { usePersistentProblems } from '../../../../hooks/usePersistentProblems';
import type { ProblemFlowRecord } from '../../../../hooks/useProblemDispatch';
import { useUserStore } from '../../../../stores';

// 动作类型中文映射
const ACTION_LABELS: Record<string, string> = {
  'report': '上报问题',
  'dispatch': '分派任务',
  'accept': '接单',
  'reject': '拒绝任务',
  'start': '开始处理',
  'submit': '提交反馈',
  'approve': '验收通过',
  'reject_acceptance': '验收返工',
  'complete': '完成',
  'comment': '添加备注',
  'progress': '进度更新',
};

// 巡查记录类型
interface InspectionRecord {
  id: string;
  recordCode: string;
  inspectionType?: 'farm' | 'equipment' | 'infrastructure' | 'other';
  inspectorName: string;
  greenhouseName?: string;
  cropName?: string;
  equipmentName?: string;
  infrastructureName?: string;
  remarks?: string;
  checkDate: string;
  issues: string[];
  issueText?: string;
  issueSeverity?: '轻微' | '中等' | '严重';
  images?: string[];
  feedbackUsers?: string[];
  status: string;
  issueStatus?: 'pending' | 'processing' | 'resolved';
  cropStatus?: string;
  plantHeight?: number;
  leafCount?: number;
  duration?: number;
  airTemperature?: number;
  airHumidity?: number;
  lightIntensity?: number;
  co2Concentration?: number;
  soilTemperature?: number;
  soilMoisture?: number;
  soilEc?: number;
  soilPh?: number;
  // 关联问题ID（用于关联问题分派记录）
  problemId?: number;
}

interface DetailInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: InspectionRecord | null;
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
 * 巡查记录详情弹窗组件
 */
export function DetailInspectionModal({ isOpen, onClose, record }: DetailInspectionModalProps) {
  // 通过 problemId 获取关联的问题数据和流转记录 - Hook需在条件返回之前调用
  const { problems } = usePersistentProblems();
  // 从Zustand store获取用户列表
  const users = useUserStore((state) => state.users);
  const loadUsers = useUserStore((state) => state.loadUsers);

  useEffect(() => {
    if (users.length === 0) {
      loadUsers();
    }
  }, [users.length, loadUsers]);

  if (!record) return null;

  const problem = record.problemId
    ? problems.find(p => p.id === record.problemId)
    : undefined;

  // 获取流转记录（按时间倒序）
  const flowRecords = problem?.flowRecords
    ? [...problem.flowRecords].sort((a, b) =>
        new Date(b.actionTime).getTime() - new Date(a.actionTime).getTime()
      )
    : [];

  // 格式化时间显示
  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取问题状态标签
  const getProblemStatusBadge = (status: string) => {
    switch (status) {
      case '待处理':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">待处理</span>;
      case '处理中':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">处理中</span>;
      case '待验收':
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">待验收</span>;
      case '已处理':
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">已处理</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">{status}</span>;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="记录详情" size="xxxl">
      <div className="space-y-6">
        {/* 巡查类型标签 */}
        <div className="flex items-center gap-2">
          {record.inspectionType === 'farm' && (
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm rounded-full">种植区域巡查</span>
          )}
          {record.inspectionType === 'equipment' && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">设备保养巡查</span>
          )}
          {record.inspectionType === 'infrastructure' && (
            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm rounded-full">基础设施巡检</span>
          )}
          {!record.inspectionType && (
            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">传统巡查</span>
          )}
        </div>

        {/* 基本信息 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">巡查人员</span>
            <span className="text-sm font-medium text-gray-900">{record.inspectorName}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">巡查区域</span>
            <span className="text-sm font-medium text-gray-900">{record.greenhouseName}</span>
          </div>

          {/* 种植区域特有 */}
          {record.inspectionType === 'farm' && (
            <>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">作物名称</span>
                <span className="text-sm font-medium text-gray-900">{record.cropName}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">作物状态</span>
                <span className="text-sm font-medium text-gray-900">{record.cropStatus}</span>
              </div>
              {record.plantHeight && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">株高</span>
                  <span className="text-sm font-medium text-gray-900">{record.plantHeight} cm</span>
                </div>
              )}
              {record.leafCount && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">叶片数</span>
                  <span className="text-sm font-medium text-gray-900">{record.leafCount} 片</span>
                </div>
              )}
            </>
          )}

          {/* 设备保养特有 */}
          {record.inspectionType === 'equipment' && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">设备名称</span>
              <span className="text-sm font-medium text-gray-900">{record.equipmentName}</span>
            </div>
          )}

          {/* 基础设施巡检特有 */}
          {record.inspectionType === 'infrastructure' && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">设施名称</span>
              <span className="text-sm font-medium text-gray-900">{record.infrastructureName}</span>
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">巡查日期</span>
            <span className="text-sm font-medium text-gray-900">{record.checkDate}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">状态</span>
            {getStatusBadge(record.status)}
          </div>
          {record.issueStatus && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">问题处理</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                record.issueStatus === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                record.issueStatus === 'processing' ? 'bg-blue-100 text-blue-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {record.issueStatus === 'resolved' ? '已解决' :
                 record.issueStatus === 'processing' ? '处理中' : '待处理'}
              </span>
            </div>
          )}
          {record.duration && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">巡检时长</span>
              <span className="text-sm font-medium text-gray-900">{record.duration} 分钟</span>
            </div>
          )}
        </div>

        {/* 生长环境参数 - 仅种植区域显示 */}
        {record.inspectionType === 'farm' && (record.airTemperature || record.soilTemperature) && (
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-3">生长环境参数</h4>
            <div className="grid grid-cols-2 gap-6">
              {/* 空气环境参数 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-400">空气环境参数</h5>
                <div className="space-y-3">
                  {record.airTemperature && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-600">空气温度</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{record.airTemperature}°C</span>
                    </div>
                  )}
                  {record.airHumidity && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-600">空气湿度</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{record.airHumidity}%</span>
                    </div>
                  )}
                  {record.lightIntensity && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-600">光照强度</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{record.lightIntensity} Lux</span>
                    </div>
                  )}
                  {record.co2Concentration && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-600">CO2浓度</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{record.co2Concentration} ppm</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 土壤环境参数 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-400">土壤环境参数</h5>
                <div className="space-y-3">
                  {record.soilTemperature && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-600">土壤温度</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{record.soilTemperature}°C</span>
                    </div>
                  )}
                  {record.soilMoisture && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-600">土壤湿度</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{record.soilMoisture}%</span>
                    </div>
                  )}
                  {record.soilEc && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-600">土壤EC值</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{record.soilEc} mS/cm</span>
                    </div>
                  )}
                  {record.soilPh && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-600">土壤PH值</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{record.soilPh}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 发现问题 */}
        {record.issues && record.issues.length > 0 && (
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-3">发现问题</h4>
            <div className="flex gap-2 flex-wrap">
              {record.issues.map((issue: string, idx: number) => (
                <span key={idx} className="px-3 py-1.5 bg-red-50 text-red-700 text-sm rounded-full">{issue}</span>
              ))}
            </div>
          </div>
        )}

        {/* 问题描述 */}
        {record.issueText && (
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-2">问题描述</h4>
            <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">{record.issueText}</p>
          </div>
        )}

        {/* 严重程度 */}
        {record.issueSeverity && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">严重程度：</span>
            <span className={`px-3 py-1 text-sm rounded-full ${
              record.issueSeverity === '严重' ? 'bg-red-100 text-red-700' :
              record.issueSeverity === '中等' ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {record.issueSeverity}
            </span>
          </div>
        )}

        {/* 反馈人员 */}
        {record.feedbackUsers && record.feedbackUsers.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">反馈人员：</span>
            <div className="flex flex-wrap gap-1">
              {record.feedbackUsers.map(userId => {
                const user = users.find(u => u.id === userId);
                return (
                  <span key={userId} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                    {user?.name || userId}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* 问题照片 */}
        {record.issuePhotos && record.issuePhotos.length > 0 && (
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-3">问题照片 (最多6张)</h4>
            <div className="grid grid-cols-3 gap-3">
              {record.issuePhotos.slice(0, 6).map((img: string, idx: number) => (
                <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img src={img} alt={`问题照片${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========== 问题处理信息区块 ========== */}
        {problem && (
          <div className="border-t border-gray-200 pt-6">
            {/* 问题信息卡片 */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-5 mb-4 border border-red-100">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  问题处理信息
                </h4>
                {getProblemStatusBadge(problem.status)}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
                  <span className="text-sm text-gray-600">问题编号</span>
                  <span className="text-sm font-mono font-medium text-gray-900">{problem.problemCode}</span>
                </div>
                {problem.handler && (
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
                    <span className="text-sm text-gray-600">处理人</span>
                    <span className="text-sm font-medium text-gray-900">{problem.handler}</span>
                  </div>
                )}
                {problem.handleDate && (
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
                    <span className="text-sm text-gray-600">处理时间</span>
                    <span className="text-sm font-medium text-gray-900">{problem.handleDate}</span>
                  </div>
                )}
                {problem.expectedCompletion && (
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
                    <span className="text-sm text-gray-600">期望完成</span>
                    <span className="text-sm font-medium text-gray-900">{problem.expectedCompletion}</span>
                  </div>
                )}
                {problem.completionTime && (
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
                    <span className="text-sm text-gray-600">完成时间</span>
                    <span className="text-sm font-medium text-green-700">{problem.completionTime}</span>
                  </div>
                )}
              </div>
              {problem.handleResult && (
                <div className="mt-4 p-3 bg-white/60 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">处理结果</div>
                  <div className="text-sm text-gray-900">{problem.handleResult}</div>
                </div>
              )}
              {problem.reworkCount !== undefined && problem.reworkCount > 0 && (
                <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-sm text-amber-700">
                    ⚠️ 返工次数：{problem.reworkCount}次
                    {problem.reworkCount >= 2 && '（已达上限，将重新分派）'}
                  </span>
                </div>
              )}
            </div>

            {/* 流转记录区块 */}
            {flowRecords.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <span>📋</span>
                    处理流转记录（{flowRecords.length}条）
                  </h4>
                </div>
                <div className="divide-y divide-gray-100">
                  {flowRecords.map((record, index) => (
                    <div key={record.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-4">
                        {/* 时间线节点 */}
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                            record.action === 'approve' ? 'bg-green-500' :
                            record.action === 'reject_acceptance' ? 'bg-red-500' :
                            record.action === 'submit' ? 'bg-amber-500' :
                            record.action === 'dispatch' ? 'bg-blue-500' :
                            record.action === 'report' ? 'bg-purple-500' :
                            'bg-gray-500'
                          }`}>
                            {index + 1}
                          </div>
                          {index < flowRecords.length - 1 && (
                            <div className="w-0.5 h-full min-h-[40px] bg-gray-200 mt-1"></div>
                          )}
                        </div>

                        {/* 流转详情 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{record.operatorName}</span>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                record.action === 'approve' ? 'bg-green-100 text-green-700' :
                                record.action === 'reject_acceptance' ? 'bg-red-100 text-red-700' :
                                record.action === 'submit' ? 'bg-amber-100 text-amber-700' :
                                record.action === 'dispatch' ? 'bg-blue-100 text-blue-700' :
                                record.action === 'report' ? 'bg-purple-100 text-purple-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {ACTION_LABELS[record.action] || record.action}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {formatTime(record.actionTime)}
                            </span>
                          </div>

                          {/* 状态变化 */}
                          {(record.fromStatus || record.toStatus) && (
                            <div className="flex items-center gap-1 mb-1">
                              {record.fromStatus && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                  {record.fromStatus}
                                </span>
                              )}
                              <span className="text-gray-400">→</span>
                              {record.toStatus && (
                                <span className={`px-2 py-0.5 text-xs rounded ${
                                  record.toStatus === '已处理' ? 'bg-green-100 text-green-700' :
                                  record.toStatus === '待验收' ? 'bg-amber-100 text-amber-700' :
                                  record.toStatus === '处理中' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {record.toStatus}
                                </span>
                              )}
                            </div>
                          )}

                          {/* 进度显示 */}
                          {record.progress !== undefined && (
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex-1 max-w-[120px] bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${record.progress}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500">{record.progress}%</span>
                            </div>
                          )}

                          {/* 备注/说明 */}
                          {record.comment && (
                            <div className="mt-1 text-sm text-gray-600 bg-gray-50 rounded px-2 py-1">
                              {record.comment}
                            </div>
                          )}

                          {/* 反馈数据展示（位置、照片、语音等） */}
                          {record.feedbackData && (
                            <div className="mt-2 space-y-2">
                              {/* GPS位置 */}
                              {record.feedbackData.gpsLocation && (
                                <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded px-2 py-1">
                                  <span>📍</span>
                                  <span>位置打卡：</span>
                                  <span className="font-mono">
                                    {record.feedbackData.gpsLocation.lat.toFixed(6)}, {record.feedbackData.gpsLocation.lng.toFixed(6)}
                                  </span>
                                </div>
                              )}

                              {/* 作业前照片 */}
                              {record.feedbackData.photosBefore && record.feedbackData.photosBefore.length > 0 && (
                                <div className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
                                  <span>📷</span>
                                  <span>作业前照片：{record.feedbackData.photosBefore.length}张</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {record.feedbackData.photosBefore.map((img, idx) => (
                                      <img
                                        key={idx}
                                        src={img}
                                        alt={`作业前${idx + 1}`}
                                        className="w-10 h-10 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => window.open(img, '_blank')}
                                        title="点击查看原图"
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 作业后照片 */}
                              {record.feedbackData.photosAfter && record.feedbackData.photosAfter.length > 0 && (
                                <div className="text-xs text-orange-600 bg-orange-50 rounded px-2 py-1">
                                  <span>📷</span>
                                  <span>作业后照片：{record.feedbackData.photosAfter.length}张</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {record.feedbackData.photosAfter.map((img, idx) => (
                                      <img
                                        key={idx}
                                        src={img}
                                        alt={`作业后${idx + 1}`}
                                        className="w-10 h-10 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => window.open(img, '_blank')}
                                        title="点击查看原图"
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 物资编码 */}
                              {record.feedbackData.materialCode && (
                                <div className="text-xs text-purple-600 bg-purple-50 rounded px-2 py-1">
                                  <span>📦</span>
                                  <span>物资编码：{record.feedbackData.materialCode}</span>
                                </div>
                              )}

                              {/* 语音备注 */}
                              {record.feedbackData.voiceNote && (
                                <div className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                                  <span>🎤</span>
                                  <span>语音备注（已录音）</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 无流转记录提示 */}
            {flowRecords.length === 0 && (
              <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500 text-sm">
                暂无流转记录
              </div>
            )}
          </div>
        )}

        {/* 备注 */}
        {record.remarks && (
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-3">备注</h4>
            <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">{record.remarks}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default DetailInspectionModal;
