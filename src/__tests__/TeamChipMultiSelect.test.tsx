/**
 * TeamChipMultiSelect 单测
 * 覆盖渲染、点击切换、回调
 */

import { describe, it, expect, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// mock useTeamStore — 必须在导入被测组件之前
vi.mock('../stores/useTeamStore', () => ({
  useTeamStore: () => ({
    teams: [
      { id: 'team-001', teamName: '种植一组' },
      { id: 'team-002', teamName: '采收二组' },
    ],
    loading: false,
  }),
}));

import { TeamChipMultiSelect } from '../components/dispatch/TeamChipMultiSelect';

describe('TeamChipMultiSelect', () => {
  it('应渲染所有班组为 chip', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root;
    act(() => {
      root = createRoot(container);
      root.render(
        React.createElement(TeamChipMultiSelect, { value: [], onChange: vi.fn() }),
      );
    });
    expect(container.textContent).toContain('种植一组');
    expect(container.textContent).toContain('采收二组');
  });

  it('点击 chip 应触发 onChange 并切换选中状态', () => {
    const onChange = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root;
    act(() => {
      root = createRoot(container);
      root.render(
        React.createElement(TeamChipMultiSelect, { value: [], onChange }),
      );
    });

    const chip = container.querySelector('[data-testid="team-chip-team-001"]') as HTMLElement;
    expect(chip).toBeTruthy();
    act(() => {
      chip.click();
    });
    expect(onChange).toHaveBeenCalledWith(['team-001']);
  });

  it('已选中的 chip 再次点击应取消选中', () => {
    const onChange = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root;
    act(() => {
      root = createRoot(container);
      root.render(
        React.createElement(TeamChipMultiSelect, { value: ['team-001'], onChange }),
      );
    });

    const chip = container.querySelector('[data-testid="team-chip-team-001"]') as HTMLElement;
    act(() => {
      chip.click();
    });
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('空 value 数组不应有任何 chip 处于选中样式', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root;
    act(() => {
      root = createRoot(container);
      root.render(
        React.createElement(TeamChipMultiSelect, { value: [], onChange: vi.fn() }),
      );
    });
    const chips = container.querySelectorAll('[data-testid^="team-chip-"]');
    chips.forEach((chip) => {
      const className = (chip as HTMLElement).className;
      expect(className).not.toContain('bg-emerald-500');
    });
  });
});