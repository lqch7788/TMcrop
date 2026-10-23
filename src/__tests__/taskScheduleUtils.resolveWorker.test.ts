/**
 * 任务排班「派工执行人」预填测试（2026-10-23）
 *
 * 背景：新增排班弹窗选好待排班任务后要自动带出执行人。农事任务的 assignee_id
 * 是姓名哈希 ID，与工人表 worker.id 不是同一套 ID，只能按姓名匹配；
 * 匹配不到必须返回空串（由用户手工选），不能塞一个查无此人的 id 进去。
 */
import { describe, it, expect } from 'vitest';
import {
  resolveWorkerIdByAssignee,
  isCrossDayShift,
  isValidScheduleTimeRange,
  formatEndTimeLabel,
} from '../pages/farm/taskScheduleUtils';

describe('resolveWorkerIdByAssignee 任务排班执行人预填', () => {
  const tasks = [
    { id: 'T1', assigneeName: '张三' },
    { id: 'T2', assigneeName: '王五' },
    { id: 'T3', assigneeName: '' },
  ];
  const workers = [
    { id: 'W1', name: '张三' },
    { id: 'W2', name: '李四' },
  ];

  it('按姓名匹配到工人表 id', () => {
    expect(resolveWorkerIdByAssignee(tasks, workers, 'T1')).toBe('W1');
  });

  it('派工执行人不在工人表 → 空串（交给用户手工选，不能塞无效 id）', () => {
    expect(resolveWorkerIdByAssignee(tasks, workers, 'T2')).toBe('');
  });

  it('任务没有派工执行人 → 空串', () => {
    expect(resolveWorkerIdByAssignee(tasks, workers, 'T3')).toBe('');
  });

  it('任务不存在 → 空串', () => {
    expect(resolveWorkerIdByAssignee(tasks, workers, 'TX')).toBe('');
  });

  it('空 taskId → 空串', () => {
    expect(resolveWorkerIdByAssignee(tasks, workers, '')).toBe('');
  });

  it('工人表为空（异步尚未加载）→ 空串，不抛错', () => {
    expect(resolveWorkerIdByAssignee(tasks, [], 'T1')).toBe('');
  });

  it('工人表为空且任务列表为空 → 空串', () => {
    expect(resolveWorkerIdByAssignee([], [], 'T1')).toBe('');
  });
});

describe('跨天班次（晚班 22:00-06:00）起止时间判定', () => {
  it('结束早于开始 → 跨天（合法，按次日解释）', () => {
    expect(isCrossDayShift('22:00', '06:00')).toBe(true);
    expect(isValidScheduleTimeRange('22:00', '06:00')).toBe(true);
  });

  it('常规班次（结束晚于开始）→ 不跨天', () => {
    expect(isCrossDayShift('08:00', '20:00')).toBe(false);
    expect(isValidScheduleTimeRange('08:00', '20:00')).toBe(true);
  });

  it('起止完全相同 → 零时长，非法', () => {
    expect(isCrossDayShift('08:00', '08:00')).toBe(false);
    expect(isValidScheduleTimeRange('08:00', '08:00')).toBe(false);
  });

  it('任一为空 → 非法', () => {
    expect(isValidScheduleTimeRange('', '06:00')).toBe(false);
    expect(isValidScheduleTimeRange('22:00', '')).toBe(false);
    expect(isCrossDayShift('', '')).toBe(false);
  });

  it('结束时间展示：跨天加「次日」前缀，常规班次原样', () => {
    expect(formatEndTimeLabel('06:00', '22:00')).toBe('次日 06:00');
    expect(formatEndTimeLabel('20:00', '08:00')).toBe('20:00');
    expect(formatEndTimeLabel('', '08:00')).toBe('—');
  });
});
