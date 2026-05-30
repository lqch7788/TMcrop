/**
 * 深度输入框组件
 * 默认状态下边框更深，带内阴影和聚焦效果
 *
 * 用法:
 * <DeepInput value={value} onChange={handleChange} placeholder="请输入..." />
 * <DeepInput value={value} onChange={handleChange} error="错误信息" />
 */

import React from 'react';
import { Input } from './input';
import { TextArea } from './TextArea';

interface DeepInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

interface DeepTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

// 深度输入框样式类名
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";
const deepTextAreaClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner resize-none";

/**
 * 深度输入框
 */
export function DeepInput({ error, className = '', ...props }: DeepInputProps) {
  return (
    <div>
      <Input
        className={`${error ? 'border-red-500' : ''} ${deepInputClass} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

/**
 * 深度文本域
 */
export function DeepTextArea({ error, className = '', rows = 3, ...props }: DeepTextAreaProps) {
  return (
    <div>
      <TextArea
        className={`${error ? 'border-red-500' : ''} ${deepTextAreaClass} ${className}`}
        rows={rows}
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

/**
 * 深度选择框触发器（用于 Select 组件）
 */
export function DeepSelectTrigger({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`${deepInputClass} ${className}`}
      {...props}
    />
  );
}

export default DeepInput;
