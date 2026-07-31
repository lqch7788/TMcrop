/**
 * 农事任务共用工具函数
 * P2-7：消除 FarmTaskHub.tsx / CreateTaskModal.tsx 中的 3 处重复函数
 */

import { format, parse, addHours } from 'date-fns';

/** 任务类型 → 中文标签映射 */
const TYPE_LABEL_MAP: Record<string, string> = {
  fertilization: '施肥',
  irrigation: '灌溉',
  pruning: '修剪',
  pesticide: '植保',
  rootIrrigation: '灌根',
  planting: '定植',
  harvest: '采收',
  weeding: '除草',
  other: '其他',
  // 兼容旧格式
  fertilizing: '施肥',
  pest_control: '病虫害防治',
  harvesting: '采收',
  soil_management: '土壤管理',
  seedling: '育苗',
  transplanting: '移栽',
};

/** 根据任务类型编码返回中文标签 */
export function getTypeLabel(type: string): string {
  return TYPE_LABEL_MAP[type] || type;
}

/** 自动生成任务编号 NS+年月日+3位流水号（如 NS20260416001） */
export function autoGenerateTaskCode(existingCodes: string[]): string {
  const today = new Date();
  const datePrefix =
    today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    today.getDate().toString().padStart(2, '0');

  let maxSequence = 0;
  const prefix = 'NS' + datePrefix + '-';
  for (const code of existingCodes) {
    if (code.startsWith(prefix)) {
      const seqStr = code.slice(-3);
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSequence) {
        maxSequence = seq;
      }
    }
  }

  const newSequence = maxSequence + 1;
  return `NS${datePrefix}-${String(newSequence).padStart(3, '0')}`;
}

/**
 * 根据开始时间 + 工作日天数 + 工时计算结束时间
 * @param startTime  开始时间 "yyyy-MM-dd HH:mm"
 * @param days       工作日数
 * @param hours      工作小时数
 * @param workHoursPerDay 每日工作时长（默认 8h）
 */
export function calculateEndDateTime(
  startTime: string,
  days: number,
  hours: number,
  workHoursPerDay: number
): string {
  if (!startTime) return '';
  try {
    const start = parse(startTime, 'yyyy-MM-dd HH:mm', new Date());
    const totalHours = days * workHoursPerDay + hours;
    const end = addHours(start, totalHours);
    return format(end, 'yyyy-MM-dd HH:mm');
  } catch {
    return '';
  }
}
