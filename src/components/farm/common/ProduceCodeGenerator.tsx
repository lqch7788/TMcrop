/**
 * 通用产品编码生成器组件
 * 供种源管理、育苗管理、种植管理页面使用
 */

import React, { useState } from 'react';
import { RotateCcw, Wand2 } from 'lucide-react';

import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
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
          <Label className="text-gray-700">大类</Label>
          <Select
            value={codeGen.bigCategory}
            onValueChange={(val) => setCodeGen(prev => ({
              ...prev,
              bigCategory: val as ProduceCategoryCode,
              type: '',
              subCategory: '',
              generatedCode: '',
            }))}
          >
            <SelectTrigger className="w-full h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              {produceCategories.map((cat) => (
                <SelectItem key={cat.code} value={cat.code}>
                  {cat.code}-{cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 类型选择 */}
        <div className="col-span-1">
          <Label className="text-gray-700">类型</Label>
          <Select
            value={codeGen.type}
            onValueChange={(val) => setCodeGen(prev => ({
              ...prev,
              type: val,
              subCategory: '',
              generatedCode: '',
            }))}
            disabled={!codeGen.bigCategory}
          >
            <SelectTrigger className="w-full h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100">
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              {currentTypes.map((type) => (
                <SelectItem key={type.code} value={type.code}>
                  {type.code}-{type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 品种选择 */}
        <div className="col-span-1">
          <Label className="text-gray-700">品种</Label>
          <Select
            value={codeGen.subCategory}
            onValueChange={(val) => setCodeGen(prev => ({
              ...prev,
              subCategory: val,
              generatedCode: '',
            }))}
            disabled={!codeGen.type}
          >
            <SelectTrigger className="w-full h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100">
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              {currentSubCategories.map((sub) => (
                <SelectItem key={sub.code} value={sub.code}>
                  {sub.code}-{sub.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 生成编码 */}
        <div className="col-span-3">
          <Label className="text-gray-700">
            生成编码
            {codeGenSuccess && !codeGenError && (
              <span className="ml-2 text-sm text-green-600 font-normal">{codeGenSuccess}</span>
            )}
            {codeGenError && (
              <span className="ml-2 text-sm text-red-600 font-normal">{codeGenError}</span>
            )}
          </Label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={codeGen.generatedCode}
              placeholder="点击生成"
              className="w-40 h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50"
              readOnly
            />
            <Button
              variant="default"
              onClick={handleCodeGen}
              disabled={!codeGen.subCategory}
              className="whitespace-nowrap gap-1"
            >
              <Wand2 className="w-4 h-4" /> 生成
            </Button>
            <Button
              variant="blue"
              onClick={handleCopy}
              disabled={!codeGen.generatedCode}
              className="whitespace-nowrap gap-1"
            >
              {copySuccess ? '已复制!' : '复制'}
            </Button>
            <Button
              variant="secondary"
              onClick={handleReset}
              className="whitespace-nowrap gap-1"
            >
              <RotateCcw className="w-4 h-4" /> 重置
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
