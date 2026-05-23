import React from 'react';
import { Star, MapPin, Zap, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import type { WorkerMatch } from './types';

interface DispatchRecommendProps {
  recommendation: WorkerMatch;
  rank: number;
  isTopPick?: boolean;
}

export const DispatchRecommend: React.FC<DispatchRecommendProps> = ({
  recommendation,
  rank,
  isTopPick,
}) => {
  return (
    <div
      className={`
        relative p-4 rounded-lg border-2 transition-all
        ${isTopPick
          ? 'border-emerald-500 bg-emerald-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm'
        }
      `}
    >
      {/* 排名标识 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isTopPick ? (
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white font-bold text-sm">
              <Star className="w-4 h-4" />
            </span>
          ) : (
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-600 font-bold text-sm">
              {rank}
            </span>
          )}
          <div>
            <span className="font-semibold text-gray-900">{recommendation.workerName}</span>
            <span className="ml-2 text-xs text-gray-500">{recommendation.workerType}</span>
          </div>
        </div>
        <div className={`
          px-3 py-1 rounded-full text-sm font-medium
          ${isTopPick ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-700'}
        `}>
          {recommendation.matchScore}分
        </div>
      </div>

      {/* 基本信息 */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        <div className="flex items-center gap-1 text-gray-600">
          <MapPin className="w-3 h-3" />
          <span>{recommendation.currentWorkZone}</span>
          <span className="text-gray-400">({recommendation.distance}km)</span>
        </div>
        <div className="flex items-center gap-1 text-gray-600">
          <Zap className="w-3 h-3" />
          <span>负荷{recommendation.currentLoad}%</span>
        </div>
        <div className="flex items-center gap-1 text-gray-600">
          <TrendingUp className="w-3 h-3" />
          <span>表现{recommendation.recentPerformance}分</span>
        </div>
      </div>

      {/* 评分细分 */}
      <div className="flex gap-2 mb-3">
        <ScoreTag label="技能" score={recommendation.skillMatchRate} />
        <ScoreTag label="位置" score={recommendation.locationScore} />
        <ScoreTag label="负荷" score={recommendation.loadScore} />
        <ScoreTag label="表现" score={recommendation.performanceScore} />
        <ScoreTag label="紧急" score={recommendation.urgencyScore} />
      </div>

      {/* 推荐理由 */}
      {recommendation.reasons.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {recommendation.reasons.map((reason, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700"
            >
              <CheckCircle2 className="w-3 h-3" />
              {reason}
            </span>
          ))}
        </div>
      )}

      {/* 技能标签 */}
      <div className="mt-3 flex flex-wrap gap-1">
        {recommendation.skills.map((skill) => (
          <span
            key={skill}
            className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
          >
            {skill}
          </span>
        ))}
      </div>

      {/* 最佳推荐标识 */}
      {isTopPick && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-xs font-medium">
          推荐
        </div>
      )}
    </div>
  );
};

// 评分标签组件
const ScoreTag: React.FC<{ label: string; score: number }> = ({ label, score }) => {
  const getColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="text-gray-500">{label}:</span>
      <span className={`font-medium ${getColor(score)}`}>{score}</span>
    </div>
  );
};

export default DispatchRecommend;
