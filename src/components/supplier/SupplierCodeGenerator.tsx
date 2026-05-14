// 供应商编码生成器组件 - 参照物料入库 WarehouseInboundCodeGen 样式
import React from 'react';
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
          <label className="block text-sm font-medium text-gray-700 mb-1">供应商大类</label>
          <select
            value={codeGen.bigCategory}
            onChange={(e) => onCodeGenChange('bigCategory', e.target.value)}
            className="w-full h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">请选择</option>
            {categories.map((cat) => (
              <option key={cat.code} value={cat.code}>
                {cat.code}-{cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* 供应商中类选择 */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">供应商中类</label>
          <select
            value={codeGen.midCategory}
            onChange={(e) => onCodeGenChange('midCategory', e.target.value)}
            disabled={!codeGen.bigCategory}
            className="w-full h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100"
          >
            <option value="">请选择</option>
            {midCategories.map((mid) => (
              <option key={mid.code} value={mid.code}>
                {mid.code}-{mid.name}
              </option>
            ))}
          </select>
        </div>

        {/* 生成编码显示和操作 */}
        <div className="col-span-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            生成编码
            {success && !error && (
              <span className="ml-2 text-sm text-green-600 font-normal">{success}</span>
            )}
            {error && (
              <span className="ml-2 text-sm text-red-600 font-normal">{error}</span>
            )}
          </label>
          <div className="flex gap-2">
            {/* 生成的编码显示 */}
            <input
              type="text"
              value={codeGen.generatedCode}
              placeholder="点击生成"
              className="w-40 h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50"
              readOnly
            />

            {/* 生成按钮 */}
            <button
              onClick={onGenerate}
              disabled={!codeGen.midCategory}
              className="px-4 h-10 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1"
            >
              生成
            </button>

            {/* 复制按钮 */}
            <button
              onClick={onCopy}
              disabled={!codeGen.generatedCode}
              className="px-4 h-10 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1"
            >
              {copySuccess ? '已复制!' : '复制'}
            </button>

            {/* 重置按钮 */}
            <button
              onClick={onReset}
              className="px-4 h-10 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 whitespace-nowrap flex items-center gap-1"
            >
              重置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
