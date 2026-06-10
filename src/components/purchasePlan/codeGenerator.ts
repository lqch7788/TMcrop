/**
 * 采购申请批次号生成器 (H-2 抽取)
 * 单一职责：包装"调后端 / 本地兜底"双策略，避免在 Page 和 Modal 中重复实现
 *
 * - 优先调 `/api/purchase-plans/next-code` 端点获取下一个可用流水号
 * - 后端失败时**抛错**（C2 修复：禁止 Math.random 兜底）
 * - 永不在前端做 DB 查询；任何"下一个"序号必须由后端算
 *
 * 占位符（弹窗打开瞬间防白屏，不参与提交）由 buildPlaceholderCode 提供
 */
import { getNextPurchaseApplicationCode } from '../../services/apiPurchasePlanService';

/** C2 修复：localFallback 已禁用——后端失败时改抛错，不再 Math.random 兜底 */
function localFallback(): never {
  throw new Error('编码服务不可用，请刷新重试');
}

/** 同步占位符：弹窗打开瞬间立即显示，避免白屏等待 */
export const PLACEHOLDER_PREFIX = 'PA';

/** 同步生成占位编号（"PA202606____"）—— 不参与提交 */
export function buildPlaceholderCode(): string {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `${PLACEHOLDER_PREFIX}${ym}____`;
}

/** 异步获取下一个真实编号；后端失败抛错（不静默 fallback） */
export async function generatePurchasePlanCode(): Promise<string> {
  const code = await getNextPurchaseApplicationCode();
  if (!code) {
    throw new Error('编码服务不可用，请刷新重试');
  }
  return code;
}
