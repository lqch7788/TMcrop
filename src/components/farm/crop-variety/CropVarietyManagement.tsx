/**
 * 作物品种库管理页面
 * 系统设置 > 作物品种库管理
 * 功能：品种列表、编码规则、编码生成
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Leaf, Sprout, Copy, Check, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { CropVariety } from '../../../types/cropVariety';
import { CropVarietyTable } from './CropVarietyTable';
import { CropVarietyDetail } from './CropVarietyDetail';
import { AddCropVarietyModal } from './modals/AddCropVarietyModal';
import { EditCropVarietyModal } from './modals/EditCropVarietyModal';
import {
  initVarieties,
  getVarietyStats,
  getCategoryOptions,
  getTypeOptionsByCategory,
  getVarietyOptionsByType,
  getSubVariety1Options,
  generateCropCode
} from '../../../services/cropVarietyService';
import {
  getProduceTypesByCategory,
} from '../../../data/produceCodeRule';

export default function CropVarietyManagement() {
  const navigate = useNavigate();
  const [selectedVariety, setSelectedVariety] = useState<CropVariety | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, byCategory: {} as Record<string, number> });

  // 编码生成器状态
  const [codeGenCategory, setCodeGenCategory] = useState('');
  const [codeGenType, setCodeGenType] = useState('');
  const [codeGenVariety, setCodeGenVariety] = useState('');
  const [codeGenSubVariety1, setCodeGenSubVariety1] = useState(''); // 子品种1（3位码）
  const [generatedCode, setGeneratedCode] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [codeGenExpanded, setCodeGenExpanded] = useState(false);

  // 编码生成器选项
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [typeOptions, setTypeOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [varietyOptions, setVarietyOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [subVariety1Options, setSubVariety1Options] = useState<Array<{ value: string; label: string }>>([]);


  // 初始化品种库
  useEffect(() => {
    initVarieties();
  }, []);

  // 加载统计数据
  useEffect(() => {
    const s = getVarietyStats();
    setStats(s);
  }, [refreshKey]);

  // 加载编码生成器选项
  useEffect(() => {
    const categories = getCategoryOptions();
    setCategoryOptions(categories);
  }, []);

  // 类别变化时加载类型选项
  useEffect(() => {
    if (codeGenCategory) {
      const types = getTypeOptionsByCategory(codeGenCategory);
      setTypeOptions(types);
      setCodeGenType('');
      setCodeGenVariety('');
      setGeneratedCode('');
    } else {
      setTypeOptions([]);
      setCodeGenType('');
      setCodeGenVariety('');
      setGeneratedCode('');
    }
  }, [codeGenCategory]);

  // 类型变化时加载品种选项
  useEffect(() => {
    if (codeGenCategory && codeGenType) {
      const varieties = getVarietyOptionsByType(codeGenCategory, codeGenType);
      setVarietyOptions(varieties);
      setCodeGenVariety('');
      setCodeGenSubVariety1('');
      setCodeGenSubVariety2Name('');
      setGeneratedCode('');
    } else {
      setVarietyOptions([]);
      setCodeGenVariety('');
      setCodeGenSubVariety1('');
      setGeneratedCode('');
    }
  }, [codeGenCategory, codeGenType]);

  // 品种变化时加载子品种1选项
  useEffect(() => {
    if (codeGenCategory && codeGenType && codeGenVariety) {
      const subVarieties = getSubVariety1Options(codeGenCategory, codeGenType, codeGenVariety);
      setSubVariety1Options(subVarieties);
      setCodeGenSubVariety1('');
      setGeneratedCode('');
    } else {
      setSubVariety1Options([]);
      setCodeGenSubVariety1('');
      setGeneratedCode('');
    }
  }, [codeGenCategory, codeGenType, codeGenVariety]);

  // 生成编码
  const handleGenerateCode = useCallback(() => {
    if (codeGenCategory && codeGenType && codeGenVariety) {
      // 子品种1使用3位码（如001红颜）
      const sub1Code = codeGenSubVariety1 || '000';
      const code = generateCropCode(codeGenCategory, codeGenType, codeGenVariety, sub1Code);
      setGeneratedCode(code);
    }
  }, [codeGenCategory, codeGenType, codeGenVariety, codeGenSubVariety1]);

  // 复制编码
  const handleCopyCode = useCallback(() => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [generatedCode]);

  // 刷新列表
  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
    setStats(getVarietyStats());
  };

  // 选择品种
  const handleSelect = (variety: CropVariety) => {
    setSelectedVariety(variety);
  };

  // 新增成功
  const handleAddSuccess = () => {
    handleRefresh();
    setSelectedVariety(null);
  };

  // 编辑成功
  const handleEditSuccess = () => {
    handleRefresh();
    setSelectedVariety(null);
  };

  // 编辑品种
  const handleEdit = (variety: CropVariety) => {
    setSelectedVariety(variety);
    setIsEditModalOpen(true);
  };

  // 跳转到完整编码规则页面
  const handleCodeRuleClick = () => {
    navigate('/produce-code-rule');
  };

  return (
    <div className="min-h-screen w-full bg-gray-50">
      {/* 头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Sprout className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">作物品种库管理</h1>
            <p className="text-gray-500">统一管理系统中所有作物品种的编码和分类信息</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-sm text-white/80">品种总数</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <span className="text-green-600 text-lg">✓</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              <p className="text-xs text-gray-500">启用中</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
              <span className="text-gray-600 text-lg">○</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.inactive}</p>
              <p className="text-xs text-gray-500">已停用</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <span className="text-blue-600 text-lg">类</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.byCategory).length}</p>
              <p className="text-xs text-gray-500">作物类别</p>
            </div>
          </div>
        </div>
      </div>

      {/* 编码规则和作物编码生成工具栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          {/* 左侧工具栏 */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleCodeRuleClick}
              className="px-3 h-9 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
            >
              编码规则 &gt;&gt;
            </button>
            <span className="text-sm font-bold text-gray-900">作物编码生成</span>
            <button
              onClick={() => setCodeGenExpanded(!codeGenExpanded)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title={codeGenExpanded ? '收起' : '展开'}
            >
              {codeGenExpanded ? (
                <ChevronDown className="w-6 h-6 text-gray-600 font-bold" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-600 font-bold" />
              )}
            </button>
          </div>
        </div>

        {/* 作物编码生成器展开内容 */}
        {codeGenExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* 类别 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类别</label>
                <select
                  value={codeGenCategory}
                  onChange={(e) => setCodeGenCategory(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">请选择</option>
                  {categoryOptions.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* 类型 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                <select
                  value={codeGenType}
                  onChange={(e) => setCodeGenType(e.target.value)}
                  disabled={!codeGenCategory}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">请选择</option>
                  {typeOptions.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* 品种 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">品种</label>
                <select
                  value={codeGenVariety}
                  onChange={(e) => setCodeGenVariety(e.target.value)}
                  disabled={!codeGenType}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">请选择</option>
                  {varietyOptions.map(v => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </select>
              </div>

              {/* 子品种1（3位码） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">子品种1</label>
                <select
                  value={codeGenSubVariety1}
                  onChange={(e) => setCodeGenSubVariety1(e.target.value)}
                  disabled={!codeGenVariety || subVariety1Options.length === 0}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">请选择</option>
                  {subVariety1Options.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* 生成按钮和结果 */}
              <div className="md:col-span-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">生成结果</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generatedCode}
                    readOnly
                    placeholder="选择分类后点击生成，编码示例：FR0101001001"
                    className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50 font-mono"
                  />
                  <button
                    onClick={handleGenerateCode}
                    disabled={!codeGenVariety}
                    className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <RefreshCw className="w-4 h-4" />
                    生成
                  </button>
                  <button
                    onClick={handleCopyCode}
                    disabled={!generatedCode}
                    className="h-10 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copySuccess ? '已复制' : '复制'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 主内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：品种列表 */}
        <div className="lg:col-span-2">
          <CropVarietyTable
            onSelect={handleSelect}
            onAdd={() => setIsAddModalOpen(true)}
            onEdit={handleEdit}
            selectedId={selectedVariety?.id}
          />
        </div>

        {/* 右侧：品种详情 */}
        <div className="lg:col-span-1">
          <CropVarietyDetail
            variety={selectedVariety}
            onEdit={handleEdit}
          />
        </div>
      </div>

      {/* 弹窗 */}
      <AddCropVarietyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      {selectedVariety && (
        <EditCropVarietyModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedVariety(null);
          }}
          onSuccess={handleEditSuccess}
          variety={selectedVariety}
        />
      )}
    </div>
  );
}
