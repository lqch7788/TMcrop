/**
 * 通用详情弹窗组件
 * 统一所有详情弹窗的样式和交互
 */

import React from 'react';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";
import { Modal } from './Modal';
import { Button } from './button';
import { Label } from './label';
import { Input } from './input';

export interface DetailField {
  /** 字段标签 */
  label: string;
  /** 字段值 */
  value: string | number | boolean | React.ReactNode;
  /** 是否占满整行 */
  fullWidth?: boolean;
  /** 自定义样式类 */
  className?: string;
}

export interface DetailModalProps {
  /** 弹窗标题 */
  title: string;
  /** 字段分组，每组为一行 */
  fields: DetailField[][];
  /** 是否打开 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 底部内容 */
  footer?: React.ReactNode;
  /** 弹窗宽度 */
  width?: number;
  /** 弹窗高度 */
  height?: number;
  /** 是否显示最大化按钮 */
  showMaximize?: boolean;
  /** 自定义底部内容（如审批记录、关联记录等） */
  bottom?: React.ReactNode;
}

/**
 * 通用详情弹窗
 * 提供统一的详情展示样式
 */
export function DetailModal({
  title,
  fields,
  isOpen,
  onClose,
  footer,
  width = 700,
  height = 600,
  showMaximize = true,
  bottom,
}: DetailModalProps) {
  // 底部按钮
  const defaultFooter = (
    <div className="flex items-center justify-end gap-3">
      <Button variant="secondary" size="sm" onClick={onClose}>
        关闭
      </Button>
    </div>
  );

  // 渲染单个字段
  const renderField = (field: DetailField, rowIndex: number, colIndex: number) => {
    const isFullWidth = field.fullWidth || false;
    const gridClass = isFullWidth ? 'col-span-2' : '';

    return (
      <div key={`${rowIndex}-${colIndex}`} className={gridClass}>
        <Label className="text-gray-700">{field.label}</Label>
        {typeof field.value === 'string' || typeof field.value === 'number' ? (
          <Input
            type="text"
            value={String(field.value)}
            readOnly
            className={`${deepInputClass} bg-gray-50 text-gray-600 ${field.className || ''}`}
          />
        ) : (
          <div className={`h-10 px-3 border border-gray-300 bg-gray-50 rounded-lg flex items-center ${field.className || ''}`}>
            {field.value}
          </div>
        )}
      </div>
    );
  };

  // 渲染一行字段
  const renderRow = (row: DetailField[], rowIndex: number) => {
    return (
      <div key={rowIndex} className="grid grid-cols-2 gap-4">
        {row.map((field, colIndex) => renderField(field, rowIndex, colIndex))}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      width={width}
      height={height}
      showFooter={true}
      footer={footer || defaultFooter}
      showMaximize={showMaximize}
      enableDrag={true}
      enableResize={true}
    >
      <div className="px-2 space-y-4">
        {fields.map((row, rowIndex) => renderRow(row, rowIndex))}
        {bottom && <div className="mt-4">{bottom}</div>}
      </div>
    </Modal>
  );
}

export default DetailModal;
