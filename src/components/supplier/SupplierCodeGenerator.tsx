// 供应商编码生成器组件 - 参照物料入库 WarehouseInboundCodeGen 样式
import React from 'react';
import { RotateCcw, Wand2 } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { useSupplierCodeRuleStore } from '../../stores';

interface SupplierCodeGenState {
  bigCategory: string;
  midCategory: string;
  generatedCode: string;
}

interface SupplierCodeGeneratorProps {
  expanded: boolean;
  onToggleExpand: () => void;
  codeGen: SupplierCodeGenState;
  onCodeGenChange: (field: 'bigCategory' | 'midCategory', value: string) => void;
  onGenerate: () => void;
  onCopy: () => void;
  onReset: () => void;
  error: string;
  success: string;
  copySuccess: boolean;
}

export default function SupplierCodeGenerator({
  codeGen,
  onCodeGenChange,
  onGenerate,
  onCopy,
  onReset,
  error,
  success,
  copySuccess,
}: SupplierCodeGeneratorProps) {
  // 从Store获取分类数据（支持编码规则页修改后同步）
  const categories = useSupplierCodeRuleStore((s) => s.categories);

  // 获取中类列表
  const midCategories = codeGen.bigCategory
    ? categories.find(c => c.code === codeGen.bigCategory)?.midCategories || []
    : [];

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="grid grid-cols-6 gap-4">
        {/* 供应商大类选择 */}
        <div className="col-span-1">
          <Label className="block text-sm font-medium text-gray-700 mb-1">供应商大类</Label>
          <Select
            value={codeGen.bigCategory}
            onValueChange={(val) => onCodeGenChange('bigCategory', val)}
          >
            <SelectTrigger className="w-full h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">请选择</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.code} value={cat.code}>
                  {cat.code}-{cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 供应商中类选择 */}
        <div className="col-span-1">
          <Label className="block text-sm font-medium text-gray-700 mb-1">供应商中类</Label>
          <Select
            value={codeGen.midCategory}
            onValueChange={(val) => onCodeGenChange('midCategory', val)}
            disabled={!codeGen.bigCategory}
          >
            <SelectTrigger className="w-full h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100">
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">请选择</SelectItem>
              {midCategories.map((mid) => (
                <SelectItem key={mid.code} value={mid.code}>
                  {mid.code}-{mid.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 生成编码显示和操作 */}
        <div className="col-span-4">
          <Label className="block text-sm font-medium text-gray-700 mb-1">
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
              className="w-40 h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50"
              readOnly
            />

            {/* 生成按钮 */}
            <Button
              size="sm"
              onClick={onGenerate}
              disabled={!codeGen.midCategory}
            >
              <Wand2 className="w-4 h-4" /> 生成
            </Button>

            {/* 复制按钮 */}
            <Button
              size="sm"
              variant="blue"
              onClick={onCopy}
              disabled={!codeGen.generatedCode}
            >
              {copySuccess ? '已复制!' : '复制'}
            </Button>

            {/* 重置按钮 */}
            <Button
              size="sm"
              variant="secondary"
              onClick={onReset}
            >
              <RotateCcw className="w-4 h-4" /> 重置
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
