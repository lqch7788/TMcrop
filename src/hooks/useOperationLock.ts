/**
 * 操作列 3-状态锁定判定 hook
 * 2026-07-01 P2-1 抽离：SeedlingTable 与 PlantingTable 之前各自硬写 3-态锁定逻辑
 * - locked: 全部按钮隐藏，显示"已锁定"
 * - supplemental: 异常结束，保留部分操作（采收入库/补录）但禁止结束按钮
 * - normal: 进行中，全部可用
 */
import { useMemo } from 'react'

export type OperationLockState = 'locked' | 'supplemental' | 'normal'

interface OperationLockInput {
  /** 后端 status 字段（completed/ended/cancelled/in_progress 等） */
  status?: string | null
  /** 后端 endType 字段（normal/abnormal/disposal/harvest） */
  endType?: string | null
  /** 后端 endTime 字段（存在即已结束） */
  endTime?: string | null
  /** 后端 is_harvest_locked 字段（1 锁定补录） */
  isHarvestLocked?: number | boolean | null
  /** 育苗侧用的 ABNORMAL 状态常量 */
  abnormalStatus?: string
  /** 种植侧用的 CANCELLED 状态常量 */
  cancelledStatus?: string
  /** 种植侧用的 ENDED 状态常量 */
  endedStatus?: string
}

export interface OperationLockResult {
  /** 3 态之一 */
  state: OperationLockState
  /** 便利布尔 */
  isLocked: boolean
  isSupplemental: boolean
  isNormal: boolean
}

/**
 * 计算记录的 3 态操作锁定
 *
 * 规则：
 * - isHarvestLocked=1 → locked（不区分状态，最强锁）
 * - endType=abnormal 或 status=cancelled/abnormal → supplemental
 * - endTime 存在 + status=ended/completed → locked
 * - 否则 normal
 */
export function useOperationLock(input: OperationLockInput): OperationLockResult {
  return useMemo(() => {
    const abnormal = input.abnormalStatus ?? 'abnormal'
    const cancelled = input.cancelledStatus ?? 'cancelled'
    const ended = input.endedStatus ?? 'ended'
    const completed = input.completedStatus ?? 'completed'

    const isLockedFlag = input.isHarvestLocked === 1 || input.isHarvestLocked === true
    if (isLockedFlag) {
      return { state: 'locked', isLocked: true, isSupplemental: false, isNormal: false }
    }

    if (input.endType === 'abnormal' || input.status === abnormal || input.status === cancelled) {
      return { state: 'supplemental', isLocked: false, isSupplemental: true, isNormal: false }
    }

    if (input.endTime || input.status === ended || input.status === completed) {
      return { state: 'locked', isLocked: true, isSupplemental: false, isNormal: false }
    }

    return { state: 'normal', isLocked: false, isSupplemental: false, isNormal: true }
  }, [
    input.status,
    input.endType,
    input.endTime,
    input.isHarvestLocked,
    input.abnormalStatus,
    input.cancelledStatus,
    input.endedStatus,
  ])
}
