/**
 * 绩效考核详情弹窗组件
 */
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { PerformanceRecord, PERFORMANCE_DIMENSIONS } from './types';

interface PerformanceDetailModalProps {
  record: PerformanceRecord | null;
  open: boolean;
  onClose: () => void;
}

export function PerformanceDetailModal({ record, open, onClose }: PerformanceDetailModalProps) {
  if (!open || !record) return null;

  // 计算维度得分和权重
  const dimensions = PERFORMANCE_DIMENSIONS.map((dim) => ({
    ...dim,
    score: record[dim.key] as number,
    weightedScore: ((record[dim.key] as number) * dim.weight) / 100,
  }));

  // 总加权得分
  const totalWeightedScore = dimensions.reduce((sum, d) => sum + d.weightedScore, 0);

  // 得分颜色
  const getScoreColor = (score: number) => {
    if (score >= 90) return { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500' };
    if (score >= 80) return { bg: 'bg-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500' };
    if (score >= 70) return { bg: 'bg-amber-100', text: 'text-amber-700', bar: 'bg-amber-500' };
    return { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500' };
  };

  const content = (
    <>
      {/* 基本信息 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">工号</p>
          <p className="text-sm font-medium text-gray-900">{record.staffId}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">姓名</p>
          <p className="text-sm font-medium text-gray-900">{record.staffName}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">部门</p>
          <p className="text-sm font-medium text-gray-900">{record.department}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">月份</p>
          <p className="text-sm font-medium text-gray-900">{record.month}</p>
        </div>
      </div>

      {/* 综合得分 */}
      <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-emerald-100 mb-1">综合得分</p>
            <p className="text-4xl font-bold">{record.totalScore}</p>
          </div>
          {record.rank && (
            <div className="text-right">
              <p className="text-sm text-emerald-100 mb-1">排名</p>
              <p className="text-2xl font-bold">第{record.rank}名</p>
            </div>
          )}
        </div>
      </div>

      {/* 各项维度得分 */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">各项维度得分</h3>
        <div className="space-y-4">
          {dimensions.map((dim) => {
            const colors = getScoreColor(dim.score);
            return (
              <div key={dim.key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">{dim.name}</span>
                    <span className="text-xs text-gray-400">权重: {dim.weight}%</span>
                  </div>
                  <span className={`text-sm font-semibold ${colors.text}`}>
                    {dim.score}分
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${colors.bar}`}
                    style={{ width: `${dim.score}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {dim.description} | 加权得分: {dim.weightedScore.toFixed(1)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 权重说明 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">考核权重说明</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {PERFORMANCE_DIMENSIONS.map((dim) => (
            <div key={dim.key} className="text-xs">
              <span className="text-gray-500">{dim.name}:</span>
              <span className="font-medium text-gray-700 ml-1">{dim.weight}%</span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-gray-200">
          <span className="text-xs text-gray-500">加权总分: </span>
          <span className="text-xs font-medium text-emerald-600">{totalWeightedScore.toFixed(1)}</span>
        </div>
      </div>
    </>
  );

  const footer = (
    <Button
      variant="secondary"
      onClick={onClose}
    >
      关闭
    </Button>
  );

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title={`${record.staffName} - ${record.month}月绩效考核`}
      size="lg"
      showFooter={true}
      headerAction={
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
        >
          <X className="w-5 h-5 text-gray-500" />
        </Button>
      }
      footer={footer}
    >
      {content}
    </UnifiedModal>
  );
}
