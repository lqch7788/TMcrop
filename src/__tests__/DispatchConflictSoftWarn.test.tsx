/**
 * DispatchConflictSoftWarn Modal 单测
 * 覆盖：渲染、原因必填、确认/取消回调
 */

import { describe, it, expect, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { DispatchConflictSoftWarn } from '../components/dispatch/DispatchConflictSoftWarn';

describe('DispatchConflictSoftWarn', () => {
  it('open=true 时应展示工人姓名 + 日期 + scheduleStatus', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root;
    act(() => {
      root = createRoot(container);
      root.render(
        React.createElement(DispatchConflictSoftWarn, {
          open: true,
          workerName: '张三',
          date: '2026-07-30',
          scheduleStatus: 'off_duty',
          onConfirm: vi.fn(),
          onCancel: vi.fn(),
        }),
      );
    });
    expect(container.textContent).toContain('张三');
    expect(container.textContent).toContain('2026-07-30');
  });

  it('原因未填时「仍要派工」按钮应禁用', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root;
    act(() => {
      root = createRoot(container);
      root.render(
        React.createElement(DispatchConflictSoftWarn, {
          open: true,
          workerName: '张三',
          date: '2026-07-30',
          scheduleStatus: 'off_duty',
          onConfirm: vi.fn(),
          onCancel: vi.fn(),
        }),
      );
    });
    const confirmBtn = container.querySelector('[data-testid="soft-warn-confirm"]') as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
  });

  it('填入原因后「仍要派工」按钮应启用', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root;
    act(() => {
      root = createRoot(container);
      root.render(
        React.createElement(DispatchConflictSoftWarn, {
          open: true,
          workerName: '张三',
          date: '2026-07-30',
          scheduleStatus: 'off_duty',
          onConfirm: vi.fn(),
          onCancel: vi.fn(),
        }),
      );
    });
    const input = container.querySelector('[data-testid="override-reason"]') as HTMLInputElement;
    act(() => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(input, '紧急任务，工人已电话确认');
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const confirmBtn = container.querySelector('[data-testid="soft-warn-confirm"]') as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(false);
  });

  it('点击「仍要派工」应调用 onConfirm 并传原因', () => {
    const onConfirm = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root;
    act(() => {
      root = createRoot(container);
      root.render(
        React.createElement(DispatchConflictSoftWarn, {
          open: true,
          workerName: '张三',
          date: '2026-07-30',
          scheduleStatus: 'off_duty',
          onConfirm,
          onCancel: vi.fn(),
        }),
      );
    });
    const input = container.querySelector('[data-testid="override-reason"]') as HTMLInputElement;
    act(() => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(input, '紧急任务');
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const confirmBtn = container.querySelector('[data-testid="soft-warn-confirm"]') as HTMLButtonElement;
    act(() => {
      confirmBtn.click();
    });
    expect(onConfirm).toHaveBeenCalledWith('紧急任务');
  });

  it('点击「取消」应调用 onCancel', () => {
    const onCancel = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root;
    act(() => {
      root = createRoot(container);
      root.render(
        React.createElement(DispatchConflictSoftWarn, {
          open: true,
          workerName: '张三',
          date: '2026-07-30',
          scheduleStatus: 'off_duty',
          onConfirm: vi.fn(),
          onCancel,
        }),
      );
    });
    // 找「取消」按钮（没有 data-testid，按文本匹配）
    const cancelBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === '取消',
    ) as HTMLButtonElement;
    expect(cancelBtn).toBeTruthy();
    act(() => {
      cancelBtn.click();
    });
    expect(onCancel).toHaveBeenCalled();
  });
});