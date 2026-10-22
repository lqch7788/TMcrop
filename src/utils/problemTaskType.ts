/**
 * 问题 → 任务类型 映射（2026-10-21）
 *
 * 背景：问题分派此前只能对 issue_text 做关键词猜测，
 *   实测「通风异常、遮阳网故障、滴灌异常、灌溉系统故障、施肥系统故障」被派成「施肥」任务，
 *   而「设备维修 / 农场维修」这两个真正对口的类型一次都没被用上。
 *
 * 现在按「来源巡查类型 + 结构化问题分类」优先映射，
 * 关键词猜测降级为最后兜底（没有巡查上下文的老问题仍走老路）。
 */

import { FARM_OPERATION_TYPES } from '../types/farm/common';

/** 参与映射的问题字段（宽松结构，兼容 store / 组件的不同入参） */
export interface ProblemTypeSource {
  inspectionType?: string | null;
  inspection_type?: string | null;
  issueCategories?: string[] | string | null;
  issue_categories?: string[] | string | null;
  issueText?: string | null;
  issue_text?: string | null;
}

export interface ResolvedTaskType {
  type: string;
  typeName: string;
}

const TYPE_NAMES: Record<string, string> = Object.fromEntries(
  FARM_OPERATION_TYPES.map((t) => [t.value as string, t.label as string])
);

/** 任务类型中文名（供下拉与提示使用） */
export function getTaskTypeName(type: string): string {
  return TYPE_NAMES[type] || type;
}

/** 可选任务类型（分派弹窗下拉用） */
export const DISPATCH_TASK_TYPE_OPTIONS = FARM_OPERATION_TYPES.map((t) => ({
  value: t.value as string,
  label: t.label as string,
}));

/** 把 issue_categories 规整成数组（兼容 JSON 字符串） */
function parseCategories(raw: string[] | string | null | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((c) => String(c));
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((c) => String(c)) : [];
  } catch {
    return [];
  }
}

/**
 * 按优先级解析问题应对应的任务类型
 * 1. 来源巡查类型（equipment / infrastructure / safety）
 * 2. 结构化问题分类（equipment / disease / pest / environment / growth）
 * 3. 关键词兜底（老问题没有巡查上下文时）
 */
export function resolveProblemTaskType(problem: ProblemTypeSource): ResolvedTaskType {
  const inspectionType = String(problem.inspectionType || problem.inspection_type || '');
  const categories = parseCategories(problem.issueCategories || problem.issue_categories);
  const text = String(problem.issueText || problem.issue_text || '');

  // 1. 巡查类型
  if (inspectionType === 'equipment') return { type: 'equipment_repair', typeName: getTaskTypeName('equipment_repair') };
  if (inspectionType === 'infrastructure' || inspectionType === 'safety') {
    return { type: 'farm_repair', typeName: getTaskTypeName('farm_repair') };
  }

  // 2. 问题分类
  if (categories.includes('equipment')) {
    return { type: 'equipment_repair', typeName: getTaskTypeName('equipment_repair') };
  }
  if (categories.includes('disease') || categories.includes('pest')) {
    return { type: 'pest_control', typeName: getTaskTypeName('pest_control') };
  }
  if (categories.includes('environment') || categories.includes('growth')) {
    const byKeyword = resolveByKeyword(text);
    if (byKeyword) return byKeyword;
  }

  // 3. 关键词兜底
  return resolveByKeyword(text) || { type: 'other', typeName: getTaskTypeName('other') };
}

/** 关键词兜底（老问题无巡查上下文时） */
function resolveByKeyword(text: string): ResolvedTaskType | null {
  if (!text) return null;
  if (text.includes('虫') || text.includes('蚜') || text.includes('病') || text.includes('斑') || text.includes('灰霉')) {
    return { type: 'pest_control', typeName: getTaskTypeName('pest_control') };
  }
  if (text.includes('水') || text.includes('旱')) {
    return { type: 'irrigation', typeName: getTaskTypeName('irrigation') };
  }
  if (text.includes('肥')) {
    return { type: 'fertilization', typeName: getTaskTypeName('fertilization') };
  }
  return null;
}
