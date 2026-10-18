/**
 * 种源删除操作 Hook
 * 2026-07-14：从 SeedSourcePage 提取删除确认逻辑（~77 行 → 独立 hook）
 *
 * 职责：
 * 1. 批量删除前逐个预检引用冲突（checkDeletable）
 * 2. 列出所有冲突项，让用户选择「只删可删的」或「取消」
 * 3. 执行删除并 toast 反馈
 */

import { useCallback } from 'react';
import { useSeedSourceStore } from '../stores/useSeedSourceStore';
import { useToastStore } from '../stores/useToastStore';
import { showAlert, showConfirm } from '@/lib/dialogService';

export function useSeedSourceDelete() {
  const { deleteItems, checkDeletable } = useSeedSourceStore();
  const toast = useToastStore((s) => s.toast);

  /**
   * 执行批量删除（含引用冲突预检）
   * @param ids 待删除的种源 ID 数组
   * @returns 删除是否成功
   */
  const handleDeleteConfirm = useCallback(
    async (ids: string[]): Promise<boolean> => {
      if (ids.length === 0) return false;

      // 1. 全部预检，区分「可删除」和「有冲突」
      const deletable: string[] = [];
      const conflicted: Array<{ id: string; references: any[] }> = [];
      const errored: Array<{ id: string; error: string }> = [];

      for (const id of ids) {
        try {
          const res = await checkDeletable(id);
          if (res.deletable) {
            deletable.push(id);
          } else {
            conflicted.push({ id, references: res.references });
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          errored.push({ id, error: msg });
          // 2026-10-18 P1 修复：引用检查失败必须 fail-closed，不能放行删除。
          // 原实现将检查失败的记录归入 deletable，可能在有引用时误删。
        }
      }

      // 2. 全部检查通过且无冲突 → 直接执行
      if (conflicted.length === 0 && errored.length === 0) {
        try {
          await deleteItems(deletable);
          return true;
        } catch (e) {
          await showAlert(`删除失败：${e instanceof Error ? e.message : String(e)}`);
          return false;
        }
      }

      // 2b. 有引用检查失败 → 全部不删（fail-closed），提示具体原因
      if (errored.length > 0 && conflicted.length === 0) {
        await showAlert(
          `以下种源的引用检查失败，为避免误删，本次未执行删除：\n`
          + errored.slice(0, 5).map((e) => `• ${e.id}：${e.error}`).join('\n'),
        );
        return false;
      }

      // 3. 有冲突 → 列出冲突项，询问「只删可删的」还是「取消」
      const sections = conflicted.map((c) => {
        const refCount = c.references.length;
        const refSummary = c.references
          .slice(0, 3)
          .map((r) => `「${(r as any).targetCode || (r as any).targetId || r.code}」`)
          .join('、');
        return `• 种源 [${c.id}] 被 ${refCount} 条引用：${refSummary}${c.references.length > 3 ? '…' : ''}`;
      });

      const confirmed = await showConfirm(
        `⚠️ 批量删除检测：\n\n` +
          `• 可删除：${deletable.length} 个\n` +
          `• 有冲突：${conflicted.length} 个（详见下方）\n` +
          (errored.length > 0 ? `• 检查失败：${errored.length} 个（本次跳过，不删除）\n` : '') +
          `\n${sections.join('\n')}\n\n` +
          `点击「确定」删除可删除的 ${deletable.length} 个，跳过有冲突的。\n` +
          `点击「取消」放弃全部删除。`
      );
      if (!confirmed) return false;

      if (deletable.length === 0) {
        toast.warning(`全部 ${conflicted.length} 个都有冲突，未删除任何记录`);
        return false;
      }
      try {
        await deleteItems(deletable);
        toast.success(`已删除 ${deletable.length} 个，跳过 ${conflicted.length} 个有冲突的`);
        return true;
      } catch (e) {
        await showAlert(`删除失败：${e instanceof Error ? e.message : String(e)}`);
        return false;
      }
    },
    [checkDeletable, deleteItems, toast]
  );

  return { handleDeleteConfirm };
}
