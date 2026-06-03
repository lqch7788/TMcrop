/**
 * 采收状态徽章工具函数
 * 提供状态和等级的徽章渲染逻辑
 *
 * 注意：等级和库存状态的视觉风格统一使用 src/constants/cropConstants.ts 里的共享常量
 * 颜色从 Ant Design 默认色（偏浅）改为 Tailwind 500/600 系列（更深、对比强）
 */

import { QUALITY_GRADE_MAP } from '../../../constants/cropConstants';

// 等级中文名称映射（保留兼容字段名）
const gradeNames: Record<string, string> = {
  A: 'A',
  B: 'B',
  C: 'C',
  excellent: '优',
  good: '良',
  average: '中',
  poor: '差',
};

// 状态颜色映射（仍用本地内联 hex，因为包含 harvesting/completed 等共享常量没的状态）
const statusColors: Record<string, string> = {
  pending: '#D97706',       // 待采收 - 深橙（比 #FAAD14 深）
  harvesting: '#2563EB',   // 采收中 - 深蓝
  harvested: '#16A34A',    // 已采收 - 深绿
  completed: '#16A34A',    // 已完成 - 深绿
  graded: '#7C3AED',       // 已分级 - 深紫
  stored: '#0E7490',      // 已入库 - 深青
};

// 状态中文名称映射
const statusNames: Record<string, string> = {
  pending: '待采收',
  harvesting: '采收中',
  harvested: '已采收',
  completed: '已完成',
  graded: '已分级',
  stored: '已入库',
};

/**
 * 获取等级徽章（深色实心 + 白字 + 加粗 + 阴影）
 * 数据源：src/constants/cropConstants.ts 的 QUALITY_GRADE_MAP
 *
 * grade 字段存的是字典码（special / excellent / good / qualified / unqualified）
 * - 直接查 QUALITY_GRADE_MAP 拿颜色 + label
 * - 兼容 A/B/C/D 老数据
 */
export function getGradeBadge(grade: string) {
  if (!grade) return <span className="text-xs text-gray-400">-</span>;
  const info = QUALITY_GRADE_MAP[grade];
  if (info) {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold ${info.bg} ${info.text} shadow-sm`}
      >
        {info.label}
      </span>
    );
  }
  // 未识别的值：原样显示（避免硬编码猜错）
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-500 text-white shadow-sm">
      {grade}
    </span>
  );
}

/**
 * 获取状态徽章
 * 使用 span 元素和 Tailwind 类保持样式一致
 */
export function getStatusBadge(status: string) {
  const color = statusColors[status] || '#D9D9D9';
  const text = statusNames[status] || status;

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {text}
    </span>
  );
}

export default { getGradeBadge, getStatusBadge };
