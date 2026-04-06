// 物料编码生成器组件

import { useNavigate } from 'react-router-dom';
import { Hash, Search, Download } from 'lucide-react';
import { CodeGeneratorState, CategoryConfig, BigCategory, WarehouseMaterial } from './types';

interface CodeGeneratorProps {
  codeGen: CodeGeneratorState;
  bigCategories: BigCategory[];
  categoryConfig: CategoryConfig;
  warehouseMaterials: WarehouseMaterial[];
  codeGenError: string;
  codeGenSuccess: string;
  copySuccess: boolean;
  onCategoryChange: (field: string, value: string) => void;
  onGenerate: () => void;
  onVerify: () => void;
  onCopy: () => void;
}

export default function CodeGenerator({
  codeGen,
  bigCategories,
  categoryConfig,
  warehouseMaterials,
  codeGenError,
  codeGenSuccess,
  copySuccess,
  onCategoryChange,
  onGenerate,
  onVerify,
  onCopy,
}: CodeGeneratorProps) {
  const navigate = useNavigate();

  // 获取编码生成器中类选项
  const getCodeGenMidCategories = () => {
    if (!codeGen.bigCategory) return [];
    const bigCat = categoryConfig[codeGen.bigCategory];
    if (!bigCat) return [];
    return Object.entries(bigCat.categories).map(([code, data]) => ({
      code,
      name: data.name,
    }));
  };

  // 获取编码生成器小类选项
  const getCodeGenSubCategories = () => {
    if (!codeGen.bigCategory || !codeGen.midCategory) return [];
    const bigCat = categoryConfig[codeGen.bigCategory];
    if (!bigCat) return [];
    const midCat = bigCat.categories[codeGen.midCategory];
    if (!midCat) return [];
    return Object.entries(midCat.subCategories).map(([code, data]) => ({
      code,
      name: data.name,
      prefix: data.prefix,
    }));
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">物料编码生成</h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">资材编码规则：大类(2位) + 中类(2位) + 小类(2位) + 序号(3位)</span>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        {/* 大类 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">大类</label>
          <select
            value={codeGen.bigCategory}
            onChange={(e) => onCategoryChange('bigCategory', e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">请选择大类</option>
            {bigCategories.map(cat => (
              <option key={cat.code} value={cat.code}>{cat.code} - {cat.name}</option>
            ))}
          </select>
        </div>

        {/* 中类 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">中类</label>
          <select
            value={codeGen.midCategory}
            onChange={(e) => onCategoryChange('midCategory', e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            disabled={!codeGen.bigCategory}
          >
            <option value="">请选择中类</option>
            {getCodeGenMidCategories().map(cat => (
              <option key={cat.code} value={cat.code}>{cat.code} - {cat.name}</option>
            ))}
          </select>
        </div>

        {/* 小类 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">小类</label>
          <select
            value={codeGen.subCategory}
            onChange={(e) => onCategoryChange('subCategory', e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            disabled={!codeGen.midCategory}
          >
            <option value="">请选择小类</option>
            {getCodeGenSubCategories().map(cat => (
              <option key={cat.code} value={cat.code}>{cat.code} - {cat.name}</option>
            ))}
          </select>
        </div>

        {/* 生成编码 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">生成编码</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={codeGen.generatedCode}
              placeholder="点击生成"
              className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50"
              readOnly
            />
            <button
              onClick={onGenerate}
              disabled={!codeGen.subCategory}
              className="px-3 h-10 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              生成
            </button>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/code-rule')}
          className="px-4 h-9 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
        >
          <Hash className="w-4 h-4" />
          编码规则
        </button>
        <button
          onClick={onVerify}
          disabled={!codeGen.generatedCode}
          className="px-4 h-9 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <Search className="w-4 h-4" />
          验证重码
        </button>
        <button
          onClick={onCopy}
          disabled={!codeGen.generatedCode}
          className="px-4 h-9 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <Download className="w-4 h-4" />
          {copySuccess ? '已复制!' : '复制编码'}
        </button>
        <span className="text-xs text-gray-500">生成的编码可复制后用于新增物料</span>
      </div>

      {/* 提示信息 */}
      {codeGenError && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{codeGenError}</p>
        </div>
      )}
      {codeGenSuccess && !codeGenError && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">{codeGenSuccess}</p>
        </div>
      )}
    </div>
  );
}
