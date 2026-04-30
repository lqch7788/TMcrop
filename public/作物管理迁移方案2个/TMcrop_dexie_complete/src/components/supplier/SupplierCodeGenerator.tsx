// 供应商编码生成器组件
import { useState } from 'react';
import { Hash, Copy, Check, AlertCircle } from 'lucide-react';
import { supplierCategories } from './data';

interface SupplierCodeGeneratorProps {
  onCodeGenerated?: (code: string) => void;
}

export default function SupplierCodeGenerator({ onCodeGenerated }: SupplierCodeGeneratorProps) {
  const [bigCategory, setBigCategory] = useState('');
  const [midCategory, setMidCategory] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const midCategories = bigCategory
    ? supplierCategories.find(c => c.code === bigCategory)?.midCategories || []
    : [];

  const handleCategoryChange = (field: 'big' | 'mid', value: string) => {
    if (field === 'big') {
      setBigCategory(value);
      setMidCategory('');
      setGeneratedCode('');
    } else {
      setMidCategory(value);
    }
    setError('');
    setSuccess('');
  };

  const handleGenerate = () => {
    setError('');
    setSuccess('');

    if (!bigCategory || !midCategory) {
      setError('请选择大类和中类');
      return;
    }

    // 模拟生成编码（实际应该调用API获取最大流水号）
    const prefix = `${bigCategory}${midCategory}`;
    const serialNum = String(Math.floor(Math.random() * 99) + 1).padStart(3, '0');
    const code = `SU_${prefix}${serialNum}`;

    setGeneratedCode(code);
    setSuccess('编码生成成功！');
    onCodeGenerated?.(code);
  };

  const handleCopy = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Hash className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">供应商编码生成</h3>
      </div>

      <div className="space-y-4">
        {/* 大类选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">供应商大类</label>
          <select
            value={bigCategory}
            onChange={(e) => handleCategoryChange('big', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">请选择大类</option>
            {supplierCategories.map(cat => (
              <option key={cat.code} value={cat.code}>{cat.code} - {cat.name}</option>
            ))}
          </select>
        </div>

        {/* 中类选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">供应商中类</label>
          <select
            value={midCategory}
            onChange={(e) => handleCategoryChange('mid', e.target.value)}
            disabled={!bigCategory}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">请选择中类</option>
            {midCategories.map(mid => (
              <option key={mid.code} value={mid.code}>{mid.code} - {mid.name}</option>
            ))}
          </select>
        </div>

        {/* 生成按钮 */}
        <button
          onClick={handleGenerate}
          disabled={!bigCategory || !midCategory}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          生成编码
        </button>

        {/* 生成的编码显示 */}
        {generatedCode && (
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-emerald-800">生成结果：</span>
              <button onClick={handleCopy} className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700">
                {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copySuccess ? '已复制' : '复制'}
              </button>
            </div>
            <div className="mt-2 text-lg font-mono font-bold text-emerald-700">{generatedCode}</div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* 成功提示 */}
        {success && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <Check className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-emerald-700">{success}</span>
          </div>
        )}
      </div>
    </div>
  );
}
