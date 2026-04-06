import { Hash, Search, Download } from 'lucide-react';
import { supplierCategories } from './data';

interface SupplierCodeGeneratorProps {
  supplierCodeGen: {
    bigCategory: string;
    midCategory: string;
    generatedCode: string;
  };
  onCodeGenChange: (field: string, value: string) => void;
  onGenerate: () => void;
  onVerify: () => void;
  onCopy: () => void;
  onNavigate: () => void;
  error: string;
  success: string;
  copySuccess: boolean;
}

export function SupplierCodeGenerator({
  supplierCodeGen,
  onCodeGenChange,
  onGenerate,
  onVerify,
  onCopy,
  onNavigate,
  error,
  success,
  copySuccess,
}: SupplierCodeGeneratorProps) {
  const getMidCategories = () => {
    if (!supplierCodeGen.bigCategory) return [];
    const bigCat = supplierCategories.find(c => c.code === supplierCodeGen.bigCategory);
    return bigCat ? bigCat.midCategories : [];
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">供应商编码生成</h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">供应商编码规则：大类(2位) + 中类(2位) + 流水号(3位)，前缀 SU_</span>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">大类</label>
          <select
            value={supplierCodeGen.bigCategory}
            onChange={(e) => onCodeGenChange('bigCategory', e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">请选择大类</option>
            {supplierCategories.map(cat => (
              <option key={cat.code} value={cat.code}>{cat.code} - {cat.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">中类</label>
          <select
            value={supplierCodeGen.midCategory}
            onChange={(e) => onCodeGenChange('midCategory', e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100"
            disabled={!supplierCodeGen.bigCategory}
          >
            <option value="">请选择中类</option>
            {getMidCategories().map(cat => (
              <option key={cat.code} value={cat.code}>{cat.code} - {cat.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">生成编码</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={supplierCodeGen.generatedCode}
              placeholder="点击生成"
              className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50"
              readOnly
            />
            <button
              onClick={onGenerate}
              disabled={!supplierCodeGen.midCategory}
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
          onClick={onNavigate}
          className="px-4 h-9 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
        >
          <Hash className="w-4 h-4" />
          编码规则
        </button>
        <button
          onClick={onVerify}
          disabled={!supplierCodeGen.generatedCode}
          className="px-4 h-9 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <Search className="w-4 h-4" />
          验证重码
        </button>
        <button
          onClick={onCopy}
          disabled={!supplierCodeGen.generatedCode}
          className="px-4 h-9 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <Download className="w-4 h-4" />
          {copySuccess ? '已复制!' : '复制编码'}
        </button>
        <span className="text-xs text-gray-500">生成的编码可复制后用于新增供应商</span>
      </div>

      {/* 提示信息 */}
      {error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {success && !error && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}
    </div>
  );
}
