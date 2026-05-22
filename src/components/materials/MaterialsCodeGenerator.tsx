// 物料编码生成器组件
import { ChevronRight, ChevronDown, Search, Download } from 'lucide-react';

// 物料类型定义
interface Material {
  id: number;
  code: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minStock: number;
  price: string;
  supplier: string;
  location: string;
}

// 大类选项
const bigCategories = [
  { code: 'SP', name: '生产投入类' },
  { code: 'EQ', name: '设施与装备类' },
  { code: 'OP', name: '作业支持类' },
  { code: 'PH', name: '采后处理与流通类' },
  { code: 'IT', name: '数字化与管理类' },
  { code: 'EC', name: '能源与通用耗材' },
  { code: 'OT', name: '其他类' },
];

// 编码生成器配置
interface CodeGenConfig {
  bigCategory: string;
  midCategory: string;
  subCategory: string;
  generatedCode: string;
}

interface MaterialsCodeGeneratorProps {
  codeGen: CodeGenConfig;
  codeGenCollapsed: boolean;
  codeGenError: string;
  codeGenSuccess: string;
  copySuccess: boolean;
  warehouseMaterials: Material[];
  categoryConfig: Record<string, { name: string; categories: Record<string, { name: string; subCategories: Record<string, { name: string; prefix: string }> }> }>;
  onCodeGenChange: (field: string, value: string) => void;
  onGenerate: () => void;
  onVerify: () => void;
  onCopy: () => void;
  onToggleCollapse: () => void;
}

export default function MaterialsCodeGenerator({
  codeGen,
  codeGenCollapsed,
  codeGenError,
  codeGenSuccess,
  copySuccess,
  warehouseMaterials,
  categoryConfig,
  onCodeGenChange,
  onGenerate,
  onVerify,
  onCopy,
  onToggleCollapse,
}: MaterialsCodeGeneratorProps) {
  // 获取编码生成器中类选项
  const getCodeGenMidCategories = () => {
    if (!codeGen.bigCategory) return [];
    const bigCat = categoryConfig[codeGen.bigCategory as keyof typeof categoryConfig];
    if (!bigCat) return [];
    return Object.entries(bigCat.categories).map(([code, data]) => ({
      code,
      name: data.name,
    }));
  };

  // 获取编码生成器小类选项
  const getCodeGenSubCategories = () => {
    if (!codeGen.bigCategory || !codeGen.midCategory) return [];
    const bigCat = categoryConfig[codeGen.bigCategory as keyof typeof categoryConfig];
    if (!bigCat) return [];
    const midCat = bigCat.categories[codeGen.midCategory as keyof typeof bigCat.categories];
    if (!midCat) return [];
    return Object.entries(midCat.subCategories).map(([code, data]) => ({
      code,
      name: data.name,
      prefix: data.prefix,
    }));
  };

  return (
    <>
      {/* 编码生成器 - 折叠状态 */}
      {codeGenCollapsed ? (
        <div className="bg-white rounded-xl shadow-sm p-3 inline-flex items-center gap-2">
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="展开"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 font-bold" />
          </button>
          <h3 className="text-sm font-semibold text-gray-900">物料编码生成</h3>
        </div>
      ) : (
        /* 编码生成器 - 展开状态 */
        <div className="bg-white rounded-xl p-6 shadow-none">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={onToggleCollapse}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="收起"
            >
              <ChevronDown className="w-6 h-6 text-gray-600 font-bold" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900">物料编码生成</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              资材编码规则：大类(2位) + 中类(2位) + 小类(2位) + 序号(3位)
            </span>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-4">
            {/* 大类选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">大类</label>
              <select
                value={codeGen.bigCategory}
                onChange={(e) => onCodeGenChange('bigCategory', e.target.value)}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">请选择大类</option>
                {bigCategories.map((cat) => (
                  <option key={cat.code} value={cat.code}>
                    {cat.code} - {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 中类选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">中类</label>
              <select
                value={codeGen.midCategory}
                onChange={(e) => onCodeGenChange('midCategory', e.target.value)}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100"
                disabled={!codeGen.bigCategory}
              >
                <option value="">请选择中类</option>
                {getCodeGenMidCategories().map((cat) => (
                  <option key={cat.code} value={cat.code}>
                    {cat.code} - {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 小类选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">小类</label>
              <select
                value={codeGen.subCategory}
                onChange={(e) => onCodeGenChange('subCategory', e.target.value)}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100"
                disabled={!codeGen.midCategory}
              >
                <option value="">请选择小类</option>
                {getCodeGenSubCategories().map((cat) => (
                  <option key={cat.code} value={cat.code}>
                    {cat.code} - {cat.name}
                  </option>
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
      )}
    </>
  );
}
