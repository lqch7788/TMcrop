/**
 * 仓库入库编码生成器组件
 * 从 WarehouseInboundPage 拆分出来，处理物料编码生成功能
 */

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
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
          <label className="block text-sm font-medium text-gray-700 mb-1">大类</label>
          <select
            value={codeGen.bigCategory}
            onChange={(e) => onCodeGenChange('bigCategory', e.target.value)}
            className="w-full h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">请选择</option>
            {bigCategoriesList.map((cat) => (
              <option key={cat.code} value={cat.code}>
                {cat.code}-{cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* 中类选择 */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">中类</label>
          <select
            value={codeGen.midCategory}
            onChange={(e) => onCodeGenChange('midCategory', e.target.value)}
            disabled={!codeGen.bigCategory}
            className="w-full h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100"
          >
            <option value="">请选择</option>
            {midCategories.map((cat) => (
              <option key={cat.code} value={cat.code}>
                {cat.code}-{cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* 小类选择 */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">小类</label>
          <select
            value={codeGen.subCategory}
            onChange={(e) => onCodeGenChange('subCategory', e.target.value)}
            disabled={!codeGen.midCategory}
            className="w-full h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100"
          >
            <option value="">请选择</option>
            {subCategories.map((sub) => (
              <option key={sub.code} value={sub.code}>
                {sub.code}-{sub.name}
              </option>
            ))}
          </select>
        </div>

        {/* 生成编码显示和操作 */}
        <div className="col-span-3">
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
              disabled={!codeGen.subCategory}
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
};

export default WarehouseInboundCodeGen;
