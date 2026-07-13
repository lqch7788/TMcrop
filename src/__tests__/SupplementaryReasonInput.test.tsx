/**
 * SupplementaryReasonInput 单元测试
 * 2026-07-13 v6
 *
 * 验证点：
 * - 5 个预设 + OTHER_VALUE 常量正确
 * - 受控 value 为预设 → 只渲染下拉，不显示自定义文本框
 * - 受控 value 为 OTHER_VALUE → 下拉 + 自定义文本框
 * - 受控 value 为 "OTHER_VALUE：xxx" → 自定义文本框显示 xxx
 * - 自定义文本框输入 → onChange 输出 "OTHER_VALUE：xxx"
 * - 自定义文本框清空 → onChange 输出 OTHER_VALUE 占位
 *
 * 测试策略：项目约定使用 renderToString（静态）+ createRoot+act（交互）
 * 不依赖 @testing-library/react（项目未安装）
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import {
  SupplementaryReasonInput,
  SUPPLEMENTARY_REASONS,
  OTHER_VALUE,
} from '../components/farm/inventory/SupplementaryReasonInput';

// 测试工具：创建 DOM 容器、渲染组件、卸载
function renderInContainer(element: React.ReactElement): { container: HTMLDivElement; root: ReturnType<typeof createRoot>; unmount: () => void } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return {
    container,
    root,
    unmount: () => {
      act(() => root.unmount());
      document.body.removeChild(container);
    },
  };
}

describe('SUPPLEMENTARY_REASONS 常量', () => {
  it('OTHER_VALUE 等于 "其他（请说明）"', () => {
    expect(OTHER_VALUE).toBe('其他（请说明）');
  });

  it('SUPPLEMENTARY_REASONS 包含 5 项且最后一项是 OTHER_VALUE', () => {
    expect(SUPPLEMENTARY_REASONS).toHaveLength(5);
    expect(SUPPLEMENTARY_REASONS[SUPPLEMENTARY_REASONS.length - 1]).toBe(OTHER_VALUE);
  });

  it('SUPPLEMENTARY_REASONS 包含采收时漏登/数量统计错误/系统故障/品质复检后修正', () => {
    expect(SUPPLEMENTARY_REASONS).toContain('采收时漏登');
    expect(SUPPLEMENTARY_REASONS).toContain('数量统计错误');
    expect(SUPPLEMENTARY_REASONS).toContain('系统故障');
    expect(SUPPLEMENTARY_REASONS).toContain('品质复检后修正');
  });
});

describe('SupplementaryReasonInput 渲染', () => {
  it('受控 value 为预设 → 不显示自定义文本框', () => {
    const { container, unmount } = renderInContainer(
      <SupplementaryReasonInput value="采收时漏登" onChange={() => {}} />,
    );
    // SelectValue 显示选中的预设
    expect(container.textContent).toContain('采收时漏登');
    // 自定义文本框不应渲染
    expect(container.querySelector('input[placeholder="请输入具体原因"]')).toBeNull();
    unmount();
  });

  it('受控 value 为空 → 只渲染下拉触发器，不显示自定义文本框', () => {
    const { container, unmount } = renderInContainer(
      <SupplementaryReasonInput value="" onChange={() => {}} />,
    );
    // 渲染了 SelectTrigger（Radix combobox role）
    expect(container.querySelector('[role="combobox"]')).toBeTruthy();
    // 自定义文本框不应渲染（因为未选"其他"）
    expect(container.querySelector('input[placeholder="请输入具体原因"]')).toBeNull();
    unmount();
  });

  it('受控 value 为 OTHER_VALUE → 显示自定义文本框', () => {
    const { container, unmount } = renderInContainer(
      <SupplementaryReasonInput value={OTHER_VALUE} onChange={() => {}} />,
    );
    expect(container.querySelector('input[placeholder="请输入具体原因"]')).toBeTruthy();
    unmount();
  });

  it('受控 value 为 "OTHER_VALUE：大风" → 自定义文本框显示 "大风"', () => {
    const { container, unmount } = renderInContainer(
      <SupplementaryReasonInput value={`${OTHER_VALUE}：大风`} onChange={() => {}} />,
    );
    const input = container.querySelector('input[placeholder="请输入具体原因"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('大风');
    unmount();
  });
});

describe('SupplementaryReasonInput 交互', () => {
  it('自定义文本框输入 → onChange 输出 "OTHER_VALUE：xxx"', () => {
    const onChange = vi.fn();
    const { container, unmount } = renderInContainer(
      <SupplementaryReasonInput value={OTHER_VALUE} onChange={onChange} />,
    );

    const input = container.querySelector('input[placeholder="请输入具体原因"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    act(() => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      nativeInputValueSetter?.call(input, '大风导致落果');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledWith(`${OTHER_VALUE}：大风导致落果`);
    unmount();
  });

  it('自定义文本框清空 → onChange 输出 OTHER_VALUE 占位', () => {
    const onChange = vi.fn();
    const { container, unmount } = renderInContainer(
      <SupplementaryReasonInput value={`${OTHER_VALUE}：大风`} onChange={onChange} />,
    );

    const input = container.querySelector('input[placeholder="请输入具体原因"]') as HTMLInputElement;
    expect(input.value).toBe('大风');

    act(() => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      nativeInputValueSetter?.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledWith(OTHER_VALUE);
    unmount();
  });
});