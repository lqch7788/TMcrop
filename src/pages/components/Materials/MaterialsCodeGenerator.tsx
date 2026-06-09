/**
 * 物料编码生成器组件
 */
import { AlertCircle, Check, ChevronDown, ChevronUp, Copy, Wand2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import type { CodeGenState } from '../../types/materials.types';

interface MaterialsCodeGeneratorProps {
  codeGen: CodeGenState;
  collapsed: boolean;
  error: string;
  success: string;
  copySuccess: boolean;
  onCodeGenChange: (field: string, value: string) => void;
  onGenerate: () => void;
  onVerify: () => void;
  onCopy: () => void;
  onToggleCollapse: () => void;
  getMidCategories: () => { code: string; name: string }[];
  getSubCategories: () => { code: string; name: string; prefix: string }[];
}

// 大类选项
const BIG_CATEGORIES = [
  { code: 'SP', name: '生产投入类' },
  { code: 'EQ', name: '设施与装备类' },
  { code: 'OP', name: '作业支持类' },
  { code: 'PH', name: '采后处理与流通类' },
  { code: 'IT', name: '数字化与管理类' },
  { code: 'EC', name: '能源与通用耗材' },
  { code: 'OT', name: '其他类' },
];

export default function MaterialsCodeGenerator({
  codeGen,
  collapsed,
  error,
  success,
  copySuccess,
  onCodeGenChange,
  onGenerate,
  onVerify,
  onCopy,
  onToggleCollapse,
  getMidCategories,
  getSubCategories,
}: MaterialsCodeGeneratorProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* 头部 */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white cursor-pointer"
        onClick={onToggleCollapse}
      >
        <h3 className="font-medium">物料编码生成器</h3>
        <button className="p-1 hover:bg-white/20 rounded transition-colors">
          {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </button>
      </div>

      {/* 内容 */}
      {!collapsed && (
        <div className="p-4 space-y-4">
          {/* 分类选择 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">大类</label>
              <select
                value={codeGen.bigCategory}
                onChange={(e) => onCodeGenChange('bigCategory', e.target.value)}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-gray-900 text-sm"
              >
                <option value="">请选择</option>
                {BIG_CATEGORIES.map(cat => (
                  <option key={cat.code} value={cat.code}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">中类</label>
              <select
                value={codeGen.midCategory}
                onChange={(e) => onCodeGenChange('midCategory', e.target.value)}
                disabled={!codeGen.bigCategory}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-gray-900 text-sm disabled:opacity-50"
              >
                <option value="">请选择</option>
                {getMidCategories().map(cat => (
                  <option key={cat.code} value={cat.code}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">小类</label>
              <select
                value={codeGen.subCategory}
                onChange={(e) => onCodeGenChange('subCategory', e.target.value)}
                disabled={!codeGen.midCategory}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-gray-900 text-sm disabled:opacity-50"
              >
                <option value="">请选择</option>
                {getSubCategories().map(cat => (
                  <option key={cat.code} value={cat.code}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 生成按钮和结果 */}
          <div className="flex items-center gap-4">
            <Button variant="blue" onClick={onGenerate}>
              <Wand2 className="w-4 h-4" /> 生成编码
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={codeGen.generatedCode}
                  readOnly
                  placeholder="生成的编码将显示在这里"
                  className="flex-1 px-3 py-2 bg-gray-100 border border-gray-400 rounded-lg text-gray-900 font-mono text-sm"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCopy}
                  disabled={!codeGen.generatedCode}
                  className="text-gray-600"
                >
                  {copySuccess ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onVerify}
                  disabled={!codeGen.generatedCode}
                >
                  验证
                </Button>
              </div>
              {error && (
                <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-1 mt-1 text-emerald-600 text-sm">
                  <Check className="w-4 h-4" />
                  {success}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
