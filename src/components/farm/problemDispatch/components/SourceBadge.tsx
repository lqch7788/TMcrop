/**
 * 来源模块徽章组件
 * 用于详情弹窗中显示来源信息
 */

import type { ProblemEntry } from '../../../hooks/usePersistentProblems';
import { getSourceConfig } from '../constants/sourceConfig';

interface SourceBadgeProps {
  problem: ProblemEntry;
}

export function SourceBadge({ problem }: SourceBadgeProps) {
  if (!problem.sourceModule) {
    return null;
  }

  const config = getSourceConfig(problem.sourceModule);
  const IconComp = config.icon;

  return (
    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-500">问题来源</span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.color} bg-white border border-current/20`}>
          <IconComp className="w-3 h-3" />
          {config.label}
        </span>
      </div>
      {problem.sourceId && (
        <div className="text-xs text-gray-600">
          原始单据：<span className="font-mono text-gray-800">{problem.sourceId}</span>
        </div>
      )}
      {problem.sourceDetail && (
        <div className="text-xs text-gray-600 mt-1">
          {problem.sourceDetail}
        </div>
      )}
    </div>
  );
}
