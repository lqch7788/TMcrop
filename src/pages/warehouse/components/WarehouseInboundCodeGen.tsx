/**
 * 仓库入库编码生成器组件
 * 从 WarehouseInboundPage 拆分出来，处理物料编码生成功能
 */

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { CodeGenState, categoryConfig, bigCategoriesList } from '../../../types/warehouseInbound.types';

interface WarehouseInboundCodeGenProps {
  // 展开状态
  expanded: boolean;
  onToggleExpand: () => void;

  // 编码生成状态
  codeGen: CodeGenState;
  onCodeGenChange: (field: 'bigCategory' | 'midCategory' | 'subCategory', value: string) => void;
  onGenerate: () => void;
  onCopy: () => void;
  onReset: () => void;

  // 状态消息
  error: string;
  success: string;
  copySuccess: boolean;
}

export const WarehouseInboundCodeGen: React.FC<WarehouseInboundCodeGenProps> = ({
  expanded,
  onToggleExpand,
  codeGen,
  onCodeGenChange,
  onGenerate,
  onCopy,
  onReset,
  error,
  success,
  copySuccess,
}) => {
  // 获取中类列表
  const midCategories = codeGen.bigCategory
    ? Object.entries(categoryConfig[codeGen.bigCategory]?.categories || {}).map(([code, data]) => ({
        code,
        name: data.name,
      }))
    : [];

  // 获取小类列表
  const subCategories =
    codeGen.bigCategory && codeGen.midCategory
      ? Object.entries(
          categoryConfig[codeGen.bigCategory]?.categories[codeGen.midCategory]?.subCategories || {}
        ).map(([code, data]) => ({
          code,
          name: data.name,
        }))
      : [];

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="grid grid-cols-6 gap-4">
        {/* 大类选择 */}
        <div className="col-span-1">
          <Label>大类</Label>
          <Select
            value={codeGen.bigCategory || undefined}
            onValueChange={(val) => onCodeGenChange('bigCategory', val)}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              {bigCategoriesList.map((cat) => (
                <SelectItem key={cat.code} value={cat.code}>
                  {cat.code}-{cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 中类选择 */}
        <div className="col-span-1">
          <Label>中类</Label>
          <Select
            value={codeGen.midCategory || undefined}
            onValueChange={(val) => onCodeGenChange('midCategory', val)}
            disabled={!codeGen.bigCategory}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              {midCategories.map((cat) => (
                <SelectItem key={cat.code} value={cat.code}>
                  {cat.code}-{cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 小类选择 */}
        <div className="col-span-1">
          <Label>小类</Label>
          <Select
            value={codeGen.subCategory || undefined}
            onValueChange={(val) => onCodeGenChange('subCategory', val)}
            disabled={!codeGen.midCategory}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              {subCategories.map((sub) => (
                <SelectItem key={sub.code} value={sub.code}>
                  {sub.code}-{sub.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 生成编码显示和操作 */}
        <div className="col-span-3">
          <Label>
            生成编码
            {success && !error && (
              <span className="ml-2 text-sm text-green-600 font-normal">{success}</span>
            )}
            {error && (
              <span className="ml-2 text-sm text-red-600 font-normal">{error}</span>
            )}
          </Label>
          <div className="flex gap-2">
            {/* 生成的编码显示 */}
            <Input
              type="text"
              value={codeGen.generatedCode}
              placeholder="点击生成"
              className="w-40 h-10 bg-gray-50"
              readOnly
            />

            {/* 生成按钮 */}
            <Button
              size="default"
              onClick={onGenerate}
              disabled={!codeGen.subCategory}
            >
              生成
            </Button>

            {/* 复制按钮 */}
            <Button
              size="default"
              variant="blue"
              onClick={onCopy}
              disabled={!codeGen.generatedCode}
            >
              {copySuccess ? '已复制!' : '复制'}
            </Button>

            {/* 重置按钮 */}
            <Button
              size="default"
              variant="secondary"
              onClick={onReset}
            >
              重置
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseInboundCodeGen;
