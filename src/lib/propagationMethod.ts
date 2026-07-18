/**
 * 2026-07-18: 种源形态 → 繁殖方法映射（前端共用）
 *
 * 与后端 circulation.service.ts 的 deriveSeedFormSubType 保持一致：
 * - 果实/枝条/穗条/块根/块茎/鳞茎/叶片/花朵/整株 → cutting（取植物体）
 * - 种子/种苗 → seed_saving
 * - 其他 → cutting（兜底）
 */

const CUTTING_FORMS = ['果实', '枝条', '穗条', '块根', '块茎', '鳞茎', '叶片', '花朵', '整株'];
const SEED_SAVING_FORMS = ['种子', '种苗'];

/**
 * 根据种源形态派生繁殖方法
 */
export function derivePropagationMethod(seedForm: string): 'cutting' | 'seed_saving' {
  if (SEED_SAVING_FORMS.includes(seedForm)) return 'seed_saving';
  return 'cutting'; // 兜底：包括 CUTTING_FORMS 和其他
}
