import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { WorkerMatch } from './types';
import { DispatchRecommend } from './DispatchRecommend';

interface WorkerMatchListProps {
  recommendations: WorkerMatch[];
  onSelectWorker?: (worker: WorkerMatch) => void;
}

export const WorkerMatchList: React.FC<WorkerMatchListProps> = ({
  recommendations,
  onSelectWorker,
}) => {
  if (recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <AlertCircle className="w-12 h-12 mb-3 text-gray-300" />
        <p>暂无符合条件的员工推荐</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recommendations.map((worker, index) => (
        <div
          key={worker.workerId}
          onClick={() => onSelectWorker?.(worker)}
          className={index === 0 ? 'cursor-pointer' : 'cursor-pointer'}
        >
          <DispatchRecommend
            recommendation={worker}
            rank={index + 1}
            isTopPick={index === 0}
          />
        </div>
      ))}
    </div>
  );
};

export default WorkerMatchList;
