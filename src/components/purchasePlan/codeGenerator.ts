/**
 * 采购申请批次号生成器 (H-2 抽取)
 * 单一职责：包装"调后端 / 本地兜底"双策略，避免在 Page 和 Modal 中重复实现
 *
 * - 优先调 `/api/purchase-plans/next-code` 端点获取下一个可用流水号
 * - 后端失败时回退到 `PA + YYYYMM + 4位随机`（前端校验可能在保存时再次报错）
 * - 永不在前端做 DB 查询；任何"下一个"序号必须由后端算
 */
import { getNextPurchaseApplicationCode } from '../../services/apiPurchasePlanService';

/** 本地兜底：PA + YYYYMM + 4 位随机数 */
function localFallback(): string {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `PA${ym}${random}`;
}

/** 同步占位符：弹窗打开瞬间立即显示，避免白屏等待 */
export const PLACEHOLDER_PREFIX = 'PA';

/** 同步生成占位编号（"PA202606____"） */
export function buildPlaceholderCode(): string {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `${PLACEHOLDER_PREFIX}${ym}____`;
}

/** 异步获取下一个真实编号，失败兜底 */
export async function generatePurchasePlanCode(): Promise<string> {
  try {
    const code = await getNextPurchaseApplicationCode();
    if (code) return code;
  } catch {
    // 静默走兜底
  }
  return localFallback();
}
