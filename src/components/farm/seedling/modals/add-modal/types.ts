/**
 * 育苗新增弹窗 — 表单数据类型
 * 2026-10-18：从 AddModal.tsx 拆出（纯移动，无逻辑变更）
 */
import type { SeedlingCalculateMode } from '../../../../../types/crop';

/** 育苗新增表单数据（与 AddModal 的 INITIAL_FORM_DATA 完全一致） */
export interface AddFormData {
  sourceId: string;
  sourceCode: string;
  sourceType: string;
  selectedCropCode: string;
  cropName: string;
  cropVariety: string;
  seedlingType: string;
  seedlingTypeOther: string;
  // 2026-10-11：补齐两个此前只在运行时动态挂到 state 上的字段（原代码靠 (formData as any) 读写）
  seedForm: string;        // 种源形态（选择种源后自动带入，只读展示）
  seedlingForm: string;    // 育苗后形态（必填，写入 seedlings.seedling_form）
  unit: string;            // 2026-07-01: 单位（株/粒/颗/盆等）
  siteId: string;
  siteName: string;
  seedlingCode: string;
  productionPlanId: string;
  startDate: string;
  expectedEndDate: string;
  initialCount: number;
  // 2026-10-17：种源消耗量（单位=种源单位）—— 种源单位与育苗单位不同时必填
  sourceConsumedQuantity: number;
  targetSurvivalRate: number;
  chargePerson: string;
  // 2026-10-17：品质等级此前只能在编辑弹窗补录，新增时无法设置
  qualityGrade: string;
  remarks: string;
  calculateMode: SeedlingCalculateMode;
  motherPlantCount: number;
  propagationMultiple: number;
  customMultiple: number;
  theoreticalYield: number;
  // 2026-10-17：删除 workHours（新增弹窗已按业务决定移除工时输入，提交恒为 undefined）
  // 2026-06-15: 数量体系重构 — 繁殖模式合并为 2 种（1:1 / 1:多）
  propagationMode: 'one_to_one' | 'one_to_many';
  propagationMotherPlantCount: number;  // 兼容字段（后续可移除）
  propagationScionCount: number;         // 兼容字段（后续可移除）
}
