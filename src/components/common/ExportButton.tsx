/**
 * 导出按钮组件 - 用于人工管理模块的数据导出功能
 * 支持 loading、disabled 状态，自定义图标和子元素
 */

import React from 'react';
import { Button, message } from 'antd';
import { Download } from 'lucide-react';

interface ExportButtonProps {
  /** 导出操作回调函数 */
  onExport?: () => void | Promise<void>;
  /** 加载状态 */
  loading?: boolean;
  /** 禁用状态 */
  disabled?: boolean;
  /** 自定义图标 */
  icon?: React.ReactNode;
  /** 按钮子元素 */
  children?: React.ReactNode;
}

export function ExportButton({
  onExport,
  loading = false,
  disabled = false,
  icon,
  children = '导出数据',
}: ExportButtonProps) {
  /**
   * 处理导出点击事件
   * 如果 onExport 返回 Promise，则等待完成后显示成功提示
   */
  const handleExport = async () => {
    if (!onExport) return;

    try {
      const result = onExport();
      // 如果返回 Promise，等待完成后显示成功提示
      if (result instanceof Promise) {
        await result;
      }
      message.success('导出成功');
    } catch (error) {
      // 导出失败时显示错误提示（如果 onExport 内部没有处理错误）
      console.error('导出失败:', error);
    }
  };

  return (
    <Button
      type="primary"
      icon={icon || <Download className="w-4 h-4" />}
      loading={loading}
      disabled={disabled}
      onClick={handleExport}
    >
      {children}
    </Button>
  );
}

export default ExportButton;
