/**
 * 农事任务中心 - 巡查详情弹窗
 * 样式与现有弹窗统一
 */

import React, { useState, useEffect } from 'react';
import { InspectionRecord } from '../../../types';
import { useInspectionDataStore } from '../../../stores';
import { X, FileText } from 'lucide-react';
import { Button } from '@/components/ui';
// 2026-10-24：巡查类型改用真相源 INSPECTION_TYPES（原文件内第二份映射缺 safety，
//   会把「安全检查」显示成「种植巡查」）
import { getInspectionTypeLabel } from '../../../types/farm/common';
import { translateInspectionCategory } from '../inspection/inspectionCategoryLabels';

interface InspectionDetailModalProps {
  recordId: string;
  onClose: () => void;
  onReportProblem?: (inspectionId: string) => void;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  normal: { bg: 'bg-green-100', text: 'text-green-700', label: '正常' },
  attention: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '需关注' },
  critical: { bg: 'bg-red-100', text: 'text-red-700', label: '异常' },
  // 2026-10-24：补 pending —— DB 有 2 条巡查记录 status='pending'，
  //   缺失时兜底成 "正常"，把「还没巡」显示成「正常」
  pending: { bg: 'bg-gray-100', text: 'text-gray-700', label: '待巡查' },
};

export function InspectionDetailModal({ recordId, onClose, onReportProblem }: InspectionDetailModalProps) {
  const [inspection, setInspection] = useState<InspectionRecord | null>(null);

  useEffect(() => {
    try {
      const inspectionsList = useInspectionDataStore.getState().records as unknown as InspectionRecord[];
      const foundInspection = inspectionsList.find((i: InspectionRecord) => i.id === recordId);
      if (foundInspection) {
        setInspection(foundInspection);
      }
    } catch (error) {
      // 加载数据失败，无需额外处理
    }
  }, [recordId]);

  if (!inspection) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl p-8">
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[inspection.status] || STATUS_CONFIG.normal;
  /** 发现的问题列表（string[]，缺省空数组） */
  const inspectionIssues = inspection.issues || [];
  const typeLabel = inspection.inspectionType
    ? getInspectionTypeLabel(inspection.inspectionType)
    : '种植区域巡查';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 flex-shrink-0 rounded-t-xl">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">巡查详情</h3>
            <span className={`px-2 py-0.5 text-xs rounded ${statusConfig.bg} ${statusConfig.text}`}>
              {statusConfig.label}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4 text-white" />
          </Button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* 巡查信息 - 蓝色背景 */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <h4 className="text-sm font-bold text-blue-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              巡查信息
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-blue-600">巡查编号:</span>
                <span className="ml-2 text-gray-900">{inspection.recordCode}</span>
              </div>
              <div>
                <span className="text-blue-600">巡查类型:</span>
                <span className="ml-2 text-gray-900">{typeLabel}</span>
              </div>
              <div>
                <span className="text-blue-600">执行区域:</span>
                <span className="ml-2 text-gray-900">{inspection.greenhouseName || '-'}</span>
              </div>
              <div>
                <span className="text-blue-600">巡查人员:</span>
                <span className="ml-2 text-gray-900">{inspection.inspectorName || '-'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-blue-600">巡查时间:</span>
                <span className="ml-2 text-gray-900">{inspection.checkDate} {inspection.checkTime}</span>
              </div>
              {inspection.batchCode && (
                <div className="col-span-2">
                  <span className="text-blue-600">关联批次:</span>
                  <span className="ml-2 text-gray-900">{inspection.batchCode}</span>
                </div>
              )}
            </div>
          </div>

          {/* 巡查项目检查清单 - 紫色背景 */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <h4 className="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              巡查项目检查清单
            </h4>
            <div className="space-y-3">
              {(inspection.checkItems || []).map((item: any, index: number) => (
                <div key={index} className="flex items-start gap-3 p-2 bg-white rounded">
                  <span className={`w-5 h-5 flex items-center justify-center rounded text-xs ${
                    item.status === 'normal' ? 'bg-green-100 text-green-600' :
                    item.status === 'attention' ? 'bg-yellow-100 text-yellow-600' :
                    item.status === 'critical' ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {item.status === 'normal' ? '✓' : item.status === 'attention' ? '!' : item.status === 'critical' ? '✗' : '○'}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{item.name}</p>
                    <p className={`text-xs ${
                      item.status === 'normal' ? 'text-green-600' :
                      item.status === 'attention' ? 'text-yellow-600' :
                      item.status === 'critical' ? 'text-red-600' : 'text-gray-400'
                    }`}>
                      {item.result || '未检查'}
                    </p>
                    {item.remark && (
                      <p className="text-xs text-gray-500 mt-1">备注: {item.remark}</p>
                    )}
                  </div>
                </div>
              ))}
              {(!inspection.checkItems || inspection.checkItems.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-4">暂无检查项目</p>
              )}
            </div>
          </div>

          {/* 发现问题 - 红色背景 */}
          <div className="bg-red-50 rounded-lg p-4 border border-red-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-red-700 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                发现问题 ({inspectionIssues.length})
              </h4>
              {onReportProblem && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onReportProblem?.(recordId)}
                >
                  上报问题
                </Button>
              )}
            </div>
            {(() => {
              // 2026-10-24：原先只渲染 issues（= issueText），勾选的「灰霉病/病毒病/白粉病」
              //   存在 issuePresets 里且从未展示 —— 详情页只剩「严重病害」这类描述。
              //   现在分类 / 具体项 / 描述分开渲染。
              const cats = inspection.issueCategories || [];
              const presets = inspection.issuePresets || [];
              const desc = inspection.issueText || inspectionIssues.join('、');
              if (cats.length === 0 && presets.length === 0 && !desc) {
                return <p className="text-sm text-gray-400 text-center py-4">未发现问题</p>;
              }
              return (
                <div className="space-y-2">
                  {(cats.length > 0 || presets.length > 0) && (
                    <div className="flex gap-2 flex-wrap">
                      {cats.map((cat: string, i: number) => (
                        <span key={`cat-${i}`} className="px-3 py-1.5 bg-white border border-red-200 text-red-700 text-sm rounded-full">
                          {translateInspectionCategory(cat)}
                        </span>
                      ))}
                      {presets.map((preset: string, i: number) => (
                        <span key={`preset-${i}`} className="px-3 py-1.5 bg-orange-100 border border-orange-300 text-orange-800 text-sm font-medium rounded-full">
                          {preset}
                        </span>
                      ))}
                    </div>
                  )}
                  {desc && (
                    <p className="text-sm text-gray-700">
                      <span className="text-gray-500">问题描述：</span>{desc}
                    </p>
                  )}
                </div>
              );
            })()}
          </div>

          {/* 现场照片 - 青色背景 */}
          {inspection.photos && inspection.photos.length > 0 && (
            <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-100">
              <h4 className="text-sm font-bold text-cyan-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                现场照片
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {inspection.photos.map((photo: string, index: number) => (
                  <div key={index} className="aspect-square bg-gray-200 rounded overflow-hidden">
                    <img
                      src={photo}
                      alt={`现场照片${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 备注 - 灰色背景 */}
          {inspection.remark && (
            <div className="bg-gray-100 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                备注
              </h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{inspection.remark}</p>
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <Button variant="secondary" onClick={onClose}>
            <X className="w-4 h-4" /> 关闭
          </Button>
        </div>
      </div>
    </div>
  );
}

export default InspectionDetailModal;
