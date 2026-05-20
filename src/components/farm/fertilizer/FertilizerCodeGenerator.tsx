/**
 * 施肥编码生成器组件
 * 自动生成 SF+年月日-流水号 格式编码，支持手动编辑 + 重新生成
 */
import React, { useState, useEffect } from 'react';
import { RefreshCw, Copy, Check } from 'lucide-react';
import { enhancedApiClient } from '@/lib/apiClient';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

interface FertilizerCodeGeneratorProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

export default function FertilizerCodeGenerator({ value, onChange, disabled = false }: FertilizerCodeGeneratorProps) {
  const [copied, setCopied] = useState(false);

  /** 从后端获取新的施肥编号 */
  const generateCode = async () => {
    try {
      const res = await enhancedApiClient.get<{ code: string }>('/fertilizer/generate-code');
      // enhancedApiClient 自动解包 data 字段，res 直接是 { code: "SF20260518-0002" }
      if (res?.code) {
        onChange(res.code);
      }
    } catch {
      // 降级：本地生成
      const now = new Date();
      const datePrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const random = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
      onChange(`SF${datePrefix}-${random}`);
    }
  };

  /** 弹窗打开时如果没有编码则自动生成 */
  useEffect(() => {
    if (!value) {
      generateCode();
    }
  }, []);

  const handleCopy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
        placeholder="SF20260517-0001"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={generateCode}
        disabled={disabled}
        className="text-gray-500 hover:text-emerald-600"
        title="重新生成编码"
      >
        <RefreshCw className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        disabled={disabled || !value}
        className="text-gray-500 hover:text-blue-600"
        title="复制编码"
      >
        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );
}
