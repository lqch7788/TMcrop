/**
 * 通用产品编码生成器组件
 * 供种源管理、育苗管理、种植管理页面使用
 */

import React, { useState } from 'react';
import {
  produceCategories,
  getProduceTypesByCategory,
  ProduceCategoryCode,
} from '../../../data/produceCodeRule';

interface ProduceCodeGeneratorProps {
  codeGenExpanded: boolean;
}

export default function ProduceCodeGenerator({ codeGenExpanded }: ProduceCodeGeneratorProps) {
  const [codeGen, setCodeGen] = useState({
    bigCategory: '' as ProduceCategoryCode | '',
    type: '',
    subCategory: '',
    generatedCode: '',
  });
  const [codeGenError, setCodeGenError] = useState('');
  const [codeGenSuccess, setCodeGenSuccess] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // 获取当前选中大类的类型列表
  const currentTypes = codeGen.bigCategory ? getProduceTypesByCategory(codeGen.bigCategory) : [];

  // 获取当前选中类型的品种列表
  const currentSubCategories = codeGen.bigCategory && codeGen.type
    ? currentTypes.find(t => t.code === codeGen.type)?.subCategories || []
    : [];

  const handleCodeGen = () => {
    if (!codeGen.bigCategory || !codeGen.type || !codeGen.subCategory) {
      setCodeGenError('请选择完整的分类');
      setCodeGenSuccess('');
      return;
    }
    setCodeGenError('');
    const baseCode = `${codeGen.bigCategory}${codeGen.type}${codeGen.subCategory}`;
    const seq = Math.floor(Math.random() * 999) + 1;
    const generatedCode = `${baseCode}${String(seq).padStart(3, '0')}`;
    setCodeGen(prev => ({ ...prev, generatedCode }));
    setCodeGenSuccess('生成成功！');
  };

  const handleReset = () => {
    setCodeGen({ bigCategory: '', type: '', subCategory: '', generatedCode: '' });
    setCodeGenError('');
    setCodeGenSuccess('');
  };

  const handleCopy = () => {
    if (codeGen.generatedCode) {
      navigator.clipboard.writeText(codeGen.generatedCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  if (!codeGenExpanded) return null;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="grid grid-cols-6 gap-4">
        {/* 大类选择 */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">大类</label>
          <select
            value={codeGen.bigCategory}
            onChange={(e) => setCodeGen(prev => ({
              ...prev,
              bigCategory: e.target.value as ProduceCategoryCode,
              type: '',
              subCategory: '',
              generatedCode: '',
            }))}
            className="w-full h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">请选择</option>
            {produceCategories.map((cat) => (
              <option key={cat.code} value={cat.code}>
                {cat.code}-{cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* 类型选择 */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
          <select
            value={codeGen.type}
            onChange={(e) => setCodeGen(prev => ({
              ...prev,
              type: e.target.value,
              subCategory: '',
              generatedCode: '',
            }))}
            disabled={!codeGen.bigCategory}
            className="w-full h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100"
          >
            <option value="">请选择</option>
            {currentTypes.map((type) => (
              <option key={type.code} value={type.code}>
                {type.code}-{type.name}
              </option>
            ))}
          </select>
        </div>

        {/* 品种选择 */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">品种</label>
          <select
            value={codeGen.subCategory}
            onChange={(e) => setCodeGen(prev => ({
              ...prev,
              subCategory: e.target.value,
              generatedCode: '',
            }))}
            disabled={!codeGen.type}
            className="w-full h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100"
          >
            <option value="">请选择</option>
            {currentSubCategories.map((sub) => (
              <option key={sub.code} value={sub.code}>
                {sub.code}-{sub.name}
              </option>
            ))}
          </select>
        </div>

        {/* 生成编码 */}
        <div className="col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            生成编码
            {codeGenSuccess && !codeGenError && (
              <span className="ml-2 text-sm text-green-600 font-normal">{codeGenSuccess}</span>
            )}
            {codeGenError && (
              <span className="ml-2 text-sm text-red-600 font-normal">{codeGenError}</span>
            )}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={codeGen.generatedCode}
              placeholder="点击生成"
              className="w-40 h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50"
              readOnly
            />
            <button
              onClick={handleCodeGen}
              disabled={!codeGen.subCategory}
              className="px-4 h-10 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1"
            >
              生成
            </button>
            <button
              onClick={handleCopy}
              disabled={!codeGen.generatedCode}
              className="px-4 h-10 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1"
            >
              {copySuccess ? '已复制!' : '复制'}
            </button>
            <button
              onClick={handleReset}
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
