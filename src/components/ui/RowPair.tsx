import React from 'react';

/**
 * 表格"成对行"容器（Fragment 替代品）
 *
 * 背景：构建插件 `vite-plugin-source-identifier` 会向 **JSX 写法** 的 `<React.Fragment>`
 * 注入 `data-matrix-id` 属性，React 随即报
 * "Invalid prop `data-matrix-id` supplied to `React.Fragment`"，表格行多时控制台刷屏。
 *
 * 用 `React.createElement` 调用（非 JSX）插件不会注入，渲染语义与 Fragment 完全一致
 * （不产生额外 DOM 节点）。
 *
 * 用法：把 `<React.Fragment key={x}>` / `</React.Fragment>` 换成 `<RowPair key={x}>` / `</RowPair>`。
 *
 * 2026-09-29：原先各表格各自内联一份同名小函数（ExecuteTabTable / ApplicationTable /
 * WarehouseInboundTable），现统一为本组件；新代码一律从这里导入，不要再复制。
 */
export function RowPair({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}

export default RowPair;
