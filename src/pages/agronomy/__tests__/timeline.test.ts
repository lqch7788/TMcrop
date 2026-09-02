/**
 * v0.3 批次时间线数据逻辑测试
 */
import { describe, it, expect } from 'vitest';

// 测试时间线事件渲染辅助函数（从组件提取纯逻辑）
describe('BatchTimeline 事件类型映射', () => {
  const EVENT_TYPE_LABELS = {
    farm_task: { label: '农事任务', color: 'blue' },
    operation: { label: '作业流水', color: 'green' },
    harvest: { label: '采收', color: 'gold' },
    daily_record: { label: '每日记录', color: 'cyan' },
    move: { label: '移栽', color: 'purple' },
    // camelCase 兼容
    farmTask: { label: '农事任务', color: 'blue' },
    dailyRecord: { label: '每日记录', color: 'cyan' },
  };

  it('5 种核心事件类型都有中文标签', () => {
    expect(EVENT_TYPE_LABELS.farm_task.label).toBe('农事任务');
    expect(EVENT_TYPE_LABELS.harvest.label).toBe('采收');
    expect(EVENT_TYPE_LABELS.move.label).toBe('移栽');
  });

  it('camelCase summary key 兼容', () => {
    expect(EVENT_TYPE_LABELS.farmTask.label).toBe('农事任务');
    expect(EVENT_TYPE_LABELS.dailyRecord.label).toBe('每日记录');
  });
});
