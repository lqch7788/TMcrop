/**
 * 作物品种库管理页面
 * 系统设置 > 作物品种库管理
 * 功能：品种列表、编码规则、编码生成
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Leaf, Sprout, Copy, Check, RefreshCw, ChevronDown, ChevronRight, List, GitBranch } from 'lucide-react';
import { CropVariety } from '../../../types/cropVariety';
import { CropVarietyTable } from './CropVarietyTable';
import { VarietyTree } from './VarietyTree';
import { CropVarietyDetail } from './CropVarietyDetail';
import { AddCropVarietyModal } from './modals/AddCropVarietyModal';
import { EditCropVarietyModal } from './modals/EditCropVarietyModal';
import { UnifiedModal } from '../../ui/UnifiedModal';
import { DisplayMode, VarietyTreeNode as VarietyTreeNodeType } from './types';
import {
  initVarieties,
  getVarietyStats,
  getCategoryOptions,
  getTypeOptionsByCategory,
  getVarietyOptionsByType,
  getSubVariety1Options,
  generateCropCode,
  getMaxDetailVarietyCode,
  deleteVariety
} from '../../../services/cropVarietyService';
import {
  getProduceTypesByCategory,
} from '../../../data/produceCodeRule';
import { useAuthPermission } from '../../../hooks/usePermission';
import { ProduceCategoryCode } from '../../../data/produceCodeRule';
import * as extensionService from '../../../services/cropVarietyExtensionService';

// 内联新增状态类型
type InlineAddLevel = 'type' | 'variety' | 'subVariety1';

interface InlineAddState {
  active: boolean;
  level: InlineAddLevel;
  parentKey: string;
  parentPath: {
    categoryCode: ProduceCategoryCode;
    categoryName: string;
    typeCode?: string;
    typeName?: string;
    varietyCode?: string;
    varietyName?: string;
  };
}

// 内联编辑状态类型
interface InlineEditState {
  active: boolean;
  level: 'type' | 'variety' | 'subVariety1' | 'recorded';
  nodeKey: string;
  nodeName: string;
  extensionId?: string;
  parentPath: {
    categoryCode?: ProduceCategoryCode;
    categoryName?: string;
    typeCode?: string;
    typeName?: string;
    varietyCode?: string;
    varietyName?: string;
    subVariety1Code?: string;
    subVariety1Name?: string;
  };
}

export default function CropVarietyManagement() {
  const navigate = useNavigate();

  // 权限检查 - 已取消，所有人可使用所有功能
  // const { can } = useAuthPermission();
  // 品种管理模块权限 - 已取消，直接设置为 true
  const canCreate = true;
  const canEdit = true;
  const canDelete = true;
  const [selectedVariety, setSelectedVariety] = useState<CropVariety | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [prefillAddData, setPrefillAddData] = useState<{
    categoryCode: string;
    categoryName: string;
    typeCode: string;
    typeName: string;
    varietyCode: string;
    varietyName: string;
    subVariety1Code?: string;
    subVariety1Name?: string;
  } | undefined>(undefined);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, byCategory: {} as Record<string, number> });

  // 视图模式状态：表格 or 树形
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');
  // 显示模式状态：仅已录入 or 显示全部
  const [displayMode, setDisplayMode] = useState<DisplayMode>('recorded');
  // 树形编辑模式状态
  const [isTreeEditing, setIsTreeEditing] = useState(false);

  // 编码生成器状态
  const [codeGenCategory, setCodeGenCategory] = useState('');
  const [codeGenType, setCodeGenType] = useState('');
  const [codeGenVariety, setCodeGenVariety] = useState('');
  const [codeGenSubVariety1, setCodeGenSubVariety1] = useState(''); // 子品种1（3位码）
  const [detailVarietyName, setDetailVarietyName] = useState(''); // 详细品种名称（用户手工输入）
  const [detailVarietyCode, setDetailVarietyCode] = useState(''); // 详细品种序号（自动生成）
  const [generatedCode, setGeneratedCode] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [codeGenExpanded, setCodeGenExpanded] = useState(false);

  // 编码生成器选项
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [typeOptions, setTypeOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [varietyOptions, setVarietyOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [subVariety1Options, setSubVariety1Options] = useState<Array<{ value: string; label: string }>>([]);

  // 内联新增状态
  const [inlineAddState, setInlineAddState] = useState<InlineAddState>({
    active: false,
    level: 'type',
    parentKey: '',
    parentPath: {
      categoryCode: 'PD',
      categoryName: ''
    }
  });
  // 内联新增输入值
  const [inlineAddCode, setInlineAddCode] = useState('');
  const [inlineAddName, setInlineAddName] = useState('');

  // 内联编辑状态
  const [inlineEditState, setInlineEditState] = useState<InlineEditState>({
    active: false,
    level: 'type',
    nodeKey: '',
    nodeName: '',
    extensionId: undefined,
    parentPath: {}
  });
  // 内联编辑输入值
  const [inlineEditName, setInlineEditName] = useState('');

  // 处理内联编辑保存
  const handleInlineEditSave = useCallback(async () => {
    if (!inlineEditName.trim()) {
      alert('请输入名称');
      return;
    }

    try {
      if (inlineEditState.level === 'type' && inlineEditState.extensionId) {
        await extensionService.updateTypeExtension(inlineEditState.extensionId, inlineEditName.trim());
      } else if (inlineEditState.level === 'variety' && inlineEditState.extensionId) {
        await extensionService.updateVarietyExtension(inlineEditState.extensionId, inlineEditName.trim());
      } else if (inlineEditState.level === 'subVariety1' && inlineEditState.extensionId) {
        await extensionService.updateSubVariety1Extension(inlineEditState.extensionId, inlineEditName.trim());
      }
      // 刷新树形数据
      handleRefresh();
      // 清空内联编辑状态
      setInlineEditState({ active: false, level: 'type', nodeKey: '', nodeName: '', extensionId: undefined, parentPath: {} });
      setInlineEditName('');
    } catch (error) {
      alert(error instanceof Error ? error.message : '保存失败');
    }
  }, [inlineEditState, inlineEditName]);

  // 处理内联编辑取消
  const handleInlineEditCancel = useCallback(() => {
    setInlineEditState({ active: false, level: 'type', nodeKey: '', nodeName: '', extensionId: undefined, parentPath: {} });
    setInlineEditName('');
  }, []);

  // 处理内联新增保存
  const handleInlineAddSave = useCallback(async () => {
    if (!inlineAddCode.trim() || !inlineAddName.trim()) {
      alert('请输入编号和名称');
      return;
    }

    try {
      if (inlineAddState.level === 'type') {
        await extensionService.addTypeExtension(
          inlineAddState.parentPath.categoryCode,
          inlineAddCode.trim(),
          inlineAddName.trim()
        );
      } else if (inlineAddState.level === 'variety') {
        await extensionService.addVarietyExtension(
          inlineAddState.parentPath.categoryCode,
          inlineAddState.parentPath.typeCode!,
          inlineAddCode.trim(),
          inlineAddName.trim()
        );
      } else if (inlineAddState.level === 'subVariety1') {
        await extensionService.addSubVariety1Extension(
          inlineAddState.parentPath.categoryCode,
          inlineAddState.parentPath.typeCode!,
          inlineAddState.parentPath.varietyCode!,
          inlineAddCode.trim(),
          inlineAddName.trim()
        );
      }
      // 刷新树形数据
      handleRefresh();
      // 清空内联新增状态
      setInlineAddState({ active: false, level: 'type', parentKey: '', parentPath: { categoryCode: 'PD', categoryName: '' } });
      setInlineAddCode('');
      setInlineAddName('');
    } catch (error) {
      alert(error instanceof Error ? error.message : '保存失败');
    }
  }, [inlineAddState, inlineAddCode, inlineAddName]);

  // 处理内联新增取消
  const handleInlineAddCancel = useCallback(() => {
    setInlineAddState({ active: false, level: 'type', parentKey: '', parentPath: { categoryCode: 'PD', categoryName: '' } });
    setInlineAddCode('');
    setInlineAddName('');
  }, []);


  // 初始化品种库和扩展缓存
  useEffect(() => {
    initVarieties();
    extensionService.initExtensionCache();
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
      setDetailVarietyName('');
      setDetailVarietyCode('');
      setGeneratedCode('');
    } else {
      setSubVariety1Options([]);
      setCodeGenSubVariety1('');
      setDetailVarietyName('');
      setDetailVarietyCode('');
      setGeneratedCode('');
    }
  }, [codeGenCategory, codeGenType, codeGenVariety]);

  // 子品种1变化时自动分配详细品种序号
  useEffect(() => {
    if (codeGenCategory && codeGenType && codeGenVariety && codeGenSubVariety1) {
      // 自动分配下一个序号
      const nextCode = getMaxDetailVarietyCode(
        codeGenCategory,
        codeGenType,
        codeGenVariety,
        codeGenSubVariety1
      );
      setDetailVarietyCode(nextCode);
    } else {
      setDetailVarietyCode('');
    }
  }, [codeGenCategory, codeGenType, codeGenVariety, codeGenSubVariety1]);

  // 生成编码
  const handleGenerateCode = useCallback(() => {
    if (codeGenCategory && codeGenType && codeGenVariety) {
      // 子品种1使用3位码（如001红颜）
      const sub1Code = codeGenSubVariety1 || '000';
      // 详细品种序号（2位）
      const detailCode = detailVarietyCode || '00';
      const code = generateCropCode(codeGenCategory, codeGenType, codeGenVariety, sub1Code, detailCode);
      setGeneratedCode(code);
    }
  }, [codeGenCategory, codeGenType, codeGenVariety, codeGenSubVariety1, detailVarietyCode]);

  // 复制编码
  const handleCopyCode = useCallback(async () => {
    if (generatedCode) {
      try {
        await navigator.clipboard.writeText(generatedCode);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (error) {
        console.error('复制编码失败:', error);
      }
    }
  }, [generatedCode]);

  // 刷新列表
  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
    setStats(getVarietyStats());
  };

  // 选择品种（查看详情）
  const handleSelect = (variety: CropVariety) => {
    setSelectedVariety(variety);
    setIsDetailModalOpen(true);
  };

  // 新增成功
  const handleAddSuccess = () => {
    handleRefresh();
  };

  // 编辑成功
  const handleEditSuccess = () => {
    handleRefresh();
    setSelectedVariety(null);
  };

  // 编辑品种
  const handleEdit = (variety: CropVariety) => {
    setSelectedVariety(variety);
    setIsDetailModalOpen(false);
    setIsEditModalOpen(true);
  };

  // 删除品种
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    variety: CropVariety | null;
  }>({ isOpen: false, variety: null });

  const handleDelete = (variety: CropVariety) => {
    setDeleteConfirm({ isOpen: true, variety });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm.variety) {
      deleteVariety(deleteConfirm.variety.id);
      handleRefresh();
      if (selectedVariety?.id === deleteConfirm.variety.id) {
        setSelectedVariety(null);
      }
    }
    setDeleteConfirm({ isOpen: false, variety: null });
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, variety: null });
  };

  // 跳转到完整编码规则页面
  const handleCodeRuleClick = () => {
    navigate('/produce-code-rule');
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col">
      {/* 头部 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          {/* 左侧标题 */}
          <div className="flex items-center gap-3">
            <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </Link>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Sprout className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">作物品种库管理</h1>
              <p className="text-gray-500 text-sm">统一管理系统中所有作物品种的编码和分类信息</p>
            </div>
          </div>

          {/* 右侧统计卡片 - 同一行显示 */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg px-3 py-2 text-white">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                  <Leaf className="w-3 h-3" />
                </div>
                <div>
                  <p className="text-base font-bold">{stats.total}</p>
                  <p className="text-xs text-white/80">品种总数</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg px-3 py-2 border border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-green-50 flex items-center justify-center">
                  <span className="text-green-600 text-xs">✓</span>
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900">{stats.active}</p>
                  <p className="text-xs text-gray-500">启用中</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg px-3 py-2 border border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center">
                  <span className="text-gray-600 text-xs">○</span>
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900">{stats.inactive}</p>
                  <p className="text-xs text-gray-500">已停用</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg px-3 py-2 border border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                  <span className="text-blue-600 text-xs">类</span>
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900">{Object.keys(stats.byCategory).length}</p>
                  <p className="text-xs text-gray-500">作物类别</p>
                </div>
              </div>
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

              {/* 子品种（3位码） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">子品种</label>
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

              {/* 详细品种名称（用户手工输入） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">详细品种名称</label>
                <input
                  type="text"
                  value={detailVarietyName}
                  onChange={(e) => setDetailVarietyName(e.target.value)}
                  placeholder="输入详细品种名称"
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* 详细品种序号（自动生成）和生成结果 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">详细品种序号</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={detailVarietyCode}
                    readOnly
                    placeholder="自动分配"
                    className="w-20 h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50 font-mono"
                  />
                  <input
                    type="text"
                    value={generatedCode}
                    readOnly
                    placeholder="生成结果"
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

      {/* 品种列表 */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* 列表内容 */}
        <div className="flex-1 min-h-0">
          {viewMode === 'table' ? (
            <CropVarietyTable
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onSelect={handleSelect}
              onAdd={() => setIsAddModalOpen(true)}
              onEdit={handleEdit}
              onDelete={handleDelete}
              selectedId={selectedVariety?.id}
              refreshKey={refreshKey}
              canCreate={canCreate}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          ) : (
            <VarietyTree
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onSelect={handleSelect}
              onAdd={(node: VarietyTreeNodeType) => {
                // 只有子品种1级别才弹出作物品种新增弹窗
                // 其他级别（类型、品种）使用内联新增
                if (node.level === 'subVariety1') {
                  // 从节点获取预填充数据
                  if (node && node.path) {
                    setPrefillAddData({
                      categoryCode: node.path.categoryCode,
                      categoryName: node.path.categoryName,
                      typeCode: node.path.typeCode,
                      typeName: node.path.typeName,
                      varietyCode: node.path.varietyCode,
                      varietyName: node.path.varietyName,
                      subVariety1Code: node.path.subVariety1Code,
                      subVariety1Name: node.path.subVariety1Name
                    });
                  }
                  setIsAddModalOpen(true);
                } else {
                  // 内联新增：根据节点级别设置父级信息
                  if (node.level === 'category') {
                    // 在类别级别点击新增 → 新增类型
                    setInlineAddState({
                      active: true,
                      level: 'type',
                      parentKey: node.key,
                      parentPath: {
                        categoryCode: node.path.categoryCode,
                        categoryName: node.path.categoryName
                      }
                    });
                  } else if (node.level === 'type') {
                    // 在类型级别点击新增 → 新增品种
                    setInlineAddState({
                      active: true,
                      level: 'variety',
                      parentKey: node.key,
                      parentPath: {
                        categoryCode: node.path.categoryCode,
                        categoryName: node.path.categoryName,
                        typeCode: node.path.typeCode,
                        typeName: node.path.typeName
                      }
                    });
                  } else if (node.level === 'variety') {
                    // 在品种级别点击新增 → 新增子品种1
                    setInlineAddState({
                      active: true,
                      level: 'subVariety1',
                      parentKey: node.key,
                      parentPath: {
                        categoryCode: node.path.categoryCode,
                        categoryName: node.path.categoryName,
                        typeCode: node.path.typeCode,
                        typeName: node.path.typeName,
                        varietyCode: node.path.varietyCode,
                        varietyName: node.path.varietyName
                      }
                    });
                  }
                  setInlineAddCode('');
                  setInlineAddName('');
                }
              }}
              onEdit={handleEdit}
              onDelete={handleDelete}
              inlineAddState={inlineAddState}
              inlineAddCode={inlineAddCode}
              inlineAddName={inlineAddName}
              onInlineAddCodeChange={setInlineAddCode}
              onInlineAddNameChange={setInlineAddName}
              onInlineAddSave={handleInlineAddSave}
              onInlineAddCancel={handleInlineAddCancel}
              isTreeEditing={isTreeEditing}
              onTreeEditingChange={setIsTreeEditing}
              onRefresh={handleRefresh}
              refreshKey={refreshKey}
            />
          )}
        </div>
      </div>

      {/* 弹窗 */}
      <AddCropVarietyModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setPrefillAddData(undefined);
        }}
        onSuccess={handleAddSuccess}
        prefillData={prefillAddData}
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

      {/* 品种详情弹窗 */}
      <UnifiedModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="品种详情"
        size="xxl"
        showFooter={false}
      >
        <CropVarietyDetail
          variety={selectedVariety}
          onEdit={handleEdit}
        />
      </UnifiedModal>

      {/* 删除确认弹窗 */}
      <UnifiedModal
        isOpen={deleteConfirm.isOpen}
        onClose={handleDeleteCancel}
        title="确认删除"
        size="md"
        showFooter={true}
        onSubmit={handleDeleteConfirm}
        submitText="确认删除"
        cancelText="取消"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 font-medium mb-2">警告：删除操作不可逆！</p>
            <p className="text-red-600 text-sm">
              删除编码 <span className="font-mono font-bold">{deleteConfirm.variety?.cropCode}</span> 可能导致以下问题：
            </p>
            <ul className="text-red-600 text-sm mt-2 list-disc list-inside space-y-1">
              <li>之前引用此编码的订单、种植记录等将无法识别该品种</li>
              <li>历史数据中显示的品种信息可能显示异常</li>
              <li>相关的统计报表数据可能出现偏差</li>
            </ul>
            <p className="text-red-600 text-sm mt-3">
              请确认此编码未被任何业务数据使用后再删除。
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-600 text-sm">
              要删除的品种：<span className="font-medium">{deleteConfirm.variety?.varietyName}</span>
            </p>
          </div>
        </div>
      </UnifiedModal>
    </div>
  );
}
