/**
 * 来源模块单元格组件
 * 显示来源模块名称和原始单据ID
 */

import type { ProblemEntry } from '../../../hooks/usePersistentProblems';
import { getSourceConfig } from '../constants/sourceConfig';

interface SourceCellProps {
  problem: ProblemEntry;
}

export function SourceCell({ problem }: SourceCellProps) {
  const config = getSourceConfig(problem.sourceModule);

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-gray-700">{config.label}</span>
      {problem.sourceId && (
        <span className="text-xs text-gray-400 font-mono">{problem.sourceId}</span>
      )}
    </div>
  );
}
