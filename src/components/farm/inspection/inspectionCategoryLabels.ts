/**
 * 巡查问题分类中英映射（2026-10-24 抽出为单一真相源）
 *
 * 数据来源：inspections.issue_categories 存英文 code（disease / pest / …），
 * 历史数据里有少量中文值（如「病虫害」），未知值原样透传。
 *
 * 抽出原因：InspectionTable 与 DetailInspectionModal 此前各自内联一份完全相同的
 * 字典（后者注释还写着「与列表 InspectionTable 一致的翻译字典」），
 * 「我的任务·巡查问题整改」再写一份就会成为第三份拷贝。
 */

/** 分类 code → 中文 */
export const INSPECTION_CATEGORY_LABELS: Record<string, string> = {
  disease: '病害',
  pest: '虫害',
  environment: '环境',
  growth: '长势',
  equipment: '设备',
  safety: '安全',
  other: '其他',
};

/**
 * 取分类的中文名；未知 code 与已是中文的历史值原样返回。
 * @param cat 分类 code 或中文名
 */
export function translateInspectionCategory(cat: string): string {
  return INSPECTION_CATEGORY_LABELS[cat] || cat;
}
