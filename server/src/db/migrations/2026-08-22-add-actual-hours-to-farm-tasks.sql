-- ============================================================================
-- Migration: 2026-08-22-add-actual-hours-to-farm-tasks
-- Purpose: AI-06 工时预测需要"实际工时"作为训练 target，但 V1.1 farm_tasks
--          表没有 actual_hours 列。本迁移添加 3 个字段：
--          1. actual_hours REAL       —— 实际工时（员工填写）
--          2. actual_hours_recorded_at TEXT —— 记录时间（ISO8601）
--          3. actual_hours_recorded_by TEXT —— 记录人 ID
-- 同时为 historical_hours_accuracy 计算添加 1 个字段：
--          4. estimated_vs_actual_ratio REAL —— 预估/实际比（自动计算，AI 训练用）
--
-- Rollback: 见文末（如需回滚）
-- ============================================================================

-- 添加 4 个字段（IF NOT EXISTS 确保幂等）
ALTER TABLE farm_tasks ADD COLUMN actual_hours REAL;
ALTER TABLE farm_tasks ADD COLUMN actual_hours_recorded_at TEXT;
ALTER TABLE farm_tasks ADD COLUMN actual_hours_recorded_by TEXT;
ALTER TABLE farm_tasks ADD COLUMN estimated_vs_actual_ratio REAL;

-- 索引：加速按 actual_hours 过滤 + 按类型统计
CREATE INDEX IF NOT EXISTS idx_ft_actual_hours ON farm_tasks(actual_hours);
CREATE INDEX IF NOT EXISTS idx_ft_actual_recorded_at ON farm_tasks(actual_hours_recorded_at);

-- ============================================================================
-- Rollback（如果需要回滚）：
-- DROP INDEX IF EXISTS idx_ft_actual_recorded_at;
-- DROP INDEX IF EXISTS idx_ft_actual_hours;
-- ALTER TABLE farm_tasks DROP COLUMN estimated_vs_actual_ratio;
-- ALTER TABLE farm_tasks DROP COLUMN actual_hours_recorded_by;
-- ALTER TABLE farm_tasks DROP COLUMN actual_hours_recorded_at;
-- ALTER TABLE farm_tasks DROP COLUMN actual_hours;
-- ============================================================================
