import React, { useState, useRef } from 'react';

// NumberInput 组件属性接口
interface NumberInputProps {
  value: number | string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  decimals?: number;  // 保留小数位数，默认2位
  className?: string;
  disabled?: boolean;
  allowNegative?: boolean;  // 是否允许负数
}

/**
 * 数字输入框组件
 * - 支持小数输入，onBlur时自动保留指定小数位数
 * - 可以完全清空输入框
 * - 阻止上下箭头按键
 * - 内部完全以字符串形式管理输入状态，避免精度丢失
 */
export function NumberInput({
  value,
  onChange,
  placeholder = '0.00',
  decimals = 2,
  className = '',
  disabled = false,
  allowNegative = false,
}: NumberInputProps) {
  // 内部维护字符串状态的输入值
  const [inputValue, setInputValue] = useState<string>(
    value != null && value !== '' ? String(value) : ''
  );
  // 跟踪是否正在编辑
  const isFocusedRef = useRef(false);

  // 格式化显示值（用于失焦后显示）
  const formatValue = (val: string | number | null | undefined): string => {
    if (val == null || val === '') return '';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '';
    const factor = Math.pow(10, decimals);
    return String(Math.round(num * factor) / factor);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    if (val === '') {
      setInputValue('');
      onChange('');
      return;
    }

    // 允许数字、小数点、负号
    const pattern = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;
    if (!pattern.test(val)) {
      return;
    }

    setInputValue(val);
    // 不在输入时通知父组件，避免频繁更新
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    const val = inputValue;

    if (val === '') {
      setInputValue('');
      onChange('');
      return;
    }

    const num = parseFloat(val);
    if (!isNaN(num)) {
      // 四舍五入保留指定小数位
      const factor = Math.pow(10, decimals);
      const rounded = Math.round(num * factor) / factor;
      const roundedStr = String(rounded);
      setInputValue(roundedStr);
      // 通知父组件
      onChange(roundedStr);
    } else {
      // 无效输入，恢复原值
      const formatted = formatValue(value);
      setInputValue(formatted);
    }
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
    // 获得焦点时，如果当前值是0或空，清空显示让用户输入
    if (inputValue === '0' || inputValue === '') {
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${className}`}
    />
  );
}

export default NumberInput;
