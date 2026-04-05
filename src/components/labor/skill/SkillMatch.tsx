import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import type { SkillTag } from './types';

interface SkillMatchProps {
  requiredSkills: SkillTag[];
  workerSkills: SkillTag[];
  workerName?: string;
  matchRate?: number;
}

export const SkillMatch: React.FC<SkillMatchProps> = ({
  requiredSkills,
  workerSkills,
  workerName,
  matchRate,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // 计算匹配情况
  const matchedSkills = requiredSkills.filter((skill) => workerSkills.includes(skill));
  const missingSkills = requiredSkills.filter((skill) => !workerSkills.includes(skill));
  const rate = requiredSkills.length > 0
    ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
    : 100;

  // 获取匹配度文字
  const getMatchLevel = (rate: number) => {
    if (rate >= 90) return { text: '完全匹配', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (rate >= 70) return { text: '高度匹配', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (rate >= 50) return { text: '部分匹配', color: 'text-amber-600', bg: 'bg-amber-50' };
    return { text: '匹配度低', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const level = getMatchLevel(rate);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* 头部 */}
      <div
        className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center gap-3">
          {workerName && (
            <span className="font-medium text-gray-900">{workerName}</span>
          )}
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${level.bg}`}>
            {rate >= 70 ? (
              <CheckCircle2 className={`w-4 h-4 ${level.color}`} />
            ) : rate >= 50 ? (
              <AlertTriangle className={`w-4 h-4 ${level.color}`} />
            ) : (
              <XCircle className={`w-4 h-4 ${level.color}`} />
            )}
            <span className={`text-sm font-medium ${level.color}`}>{level.text}</span>
          </div>
          {matchRate !== undefined && (
            <span className="text-2xl font-bold text-gray-900">{matchRate}%</span>
          )}
        </div>
        <TrendingUp className={`w-5 h-5 text-gray-400 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
      </div>

      {/* 详情 */}
      {showDetails && (
        <div className="p-3 border-t border-gray-200">
          {/* 匹配技能 */}
          {matchedSkills.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1.5">已匹配技能</div>
              <div className="flex flex-wrap gap-1">
                {matchedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-700 border border-emerald-200"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 缺失技能 */}
          {missingSkills.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-1.5">缺失技能</div>
              <div className="flex flex-wrap gap-1">
                {missingSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-50 text-red-700 border border-red-200"
                  >
                    <XCircle className="w-3 h-3" />
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 员工所有技能 */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500 mb-1.5">员工持有技能</div>
            <div className="flex flex-wrap gap-1">
              {workerSkills.map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillMatch;
