/**
 * 作物品种库页面
 * 系统设置 > 作物品种库
 * 编码：类别(2字母)+类型(2数字)+作物(2数字)+品种(3数字) = 9位
 * 功能：品种列表、编码规则、编码生成
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Leaf, Sprout, Copy, Check, RefreshCw, ChevronDown, ChevronRight, List, GitBranch, ArrowLeft } from 'lucide-react';
import { showAlert } from '@/lib/dialogService';
import { CropVariety } from '../../../types/cropVariety';
import { CropVarietyTable } from './CropVarietyTable';
import { VarietyTree } from './VarietyTree';
import { CropVarietyDetail } from './CropVarietyDetail';
import { AddCropVarietyModal } from './modals/AddCropVarietyModal';
import { EditCropVarietyModal } from './modals/EditCropVarietyModal';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { DisplayMode, VarietyTreeNode as VarietyTreeNodeType } from './types';
import {
  getCategoryOptions,
  generateCropCode,
  getMaxDetailVarietyCode
} from '../../../services/cropVarietyService';
import {
  getTypeOptionsByCategory,
  getVarietyOptionsByType,
  getSubVariety1Options,
} from '../../../services/cropVarietyExtensionService';
import {
  getProduceTypesByCategory,
} from '../../../data/produceCodeRule';
import { useAuthPermission } from '../../../hooks/usePermission';
import { ProduceCategoryCode } from '../../../data/produceCodeRule';
import * as extensionService from '../../../services/cropVarietyExtensionService';
import { useCropVarietyStore } from '../../../stores/useCropVarietyStore';

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

  // === Zustand Store ===
  const store = useCropVarietyStore();
  const { items: allVarieties, isLoading } = store;

  // 权限检查 - 已取消，所有人可使用所有功能
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
  // 2026-07-27 审核修复 C-1：删除 migrationDone 状态（V2.1 架构下不再有 localStorage → API 迁移需求）
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
  const [codeGenSubVariety1, setCodeGenSubVariety1] = useState(''); // 品种（3位码）
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
      await showAlert('请输入名称');
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
      await showAlert(error instanceof Error ? error.message : '保存失败');
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
      await showAlert('请输入编号和名称');
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
      await showAlert(error instanceof Error ? error.message : '保存失败');
    }
  }, [inlineAddState, inlineAddCode, inlineAddName]);

  // 处理内联新增取消
  const handleInlineAddCancel = useCallback(() => {
    setInlineAddState({ active: false, level: 'type', parentKey: '', parentPath: { categoryCode: 'PD', categoryName: '' } });
    setInlineAddCode('');
    setInlineAddName('');
  }, []);


  // 初始化：加载数据 + 迁移 localStorage → 后端
  useEffect(() => {
    const init = async () => {
      extensionService.initExtensionCache();

      // 先尝试从后端加载（V2.1 架构：API 直连，无 localStorage 兜底）
      await store.loadItems();
    };
    init();
  }, []);

  // 从 Store 数据计算统计
  // 2026-07-29 死循环修复：deps 用 `store.items.length` + 顶层 items 引用，避免 store.items 数组引用变化
  // 触发额外 setState（虽然 setStats 不改 store.items，但会触发 re-render 链上的其他 listener）
  const storeItemsLength = store.items.length;
  useEffect(() => {
    const items = store.items;
    const statsData = {
      total: items.length,
      active: items.filter(v => v.status === 'active').length,
      inactive: items.filter(v => v.status === 'inactive').length,
      byCategory: {} as Record<string, number>
    };
    for (const v of items) {
      if (!statsData.byCategory[v.categoryName]) {
        statsData.byCategory[v.categoryName] = 0;
      }
      statsData.byCategory[v.categoryName]++;
    }
    setStats(statsData);
  }, [storeItemsLength, store.items, refreshKey]);

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
      setGeneratedCode('');
    } else {
      setSubVariety1Options([]);
      setCodeGenSubVariety1('');
      setGeneratedCode('');
    }
  }, [codeGenCategory, codeGenType, codeGenVariety]);

  // 2026-07-26：详细品种层级已删除，不再需要自动分配
  useEffect(() => {
    if (codeGenCategory && codeGenType && codeGenVariety && codeGenSubVariety1) {
      // 编码已改为9位（类别+类型+作物+品种），无需额外的序号
    } else {
    }
  }, [codeGenCategory, codeGenType, codeGenVariety, codeGenSubVariety1]);

  // 生成编码
  const handleGenerateCode = useCallback(() => {
    if (codeGenCategory && codeGenType && codeGenVariety) {
      // 品种使用3位码（如001红颜）
      const sub1Code = codeGenSubVariety1 || '000';
      const code = generateCropCode(codeGenCategory, codeGenType, codeGenVariety, sub1Code);
      setGeneratedCode(code);
    }
  }, [codeGenCategory, codeGenType, codeGenVariety, codeGenSubVariety1]);

  // 复制编码
  const handleCopyCode = useCallback(async () => {
    if (generatedCode) {
      try {
        await navigator.clipboard.writeText(generatedCode);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (error) {
        // logger.error('复制编码失败:', error);
      }
    }
  }, [generatedCode]);

  // 刷新列表
  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
    store.refreshItems();
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

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.variety) {
      const success = await store.deleteItem(deleteConfirm.variety.id);
      if (!success) {
        await showAlert('删除失败，请重试');
        return;
      }
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
    <div className="space-y-6">
      {/* 头部 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* 左侧标题 */}
          <div className="flex items-center gap-3">
            <a
              href="/settings"
              className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center hover:from-gray-200 hover:to-gray-300 transition-colors"
              title="返回系统设置"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </a>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">作物品种库</h1>
              <p className="text-gray-500">统一管理系统中所有作物品种的编码和分类信息</p>
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
            {/* 2026-07-27：视图切换（表格/树形）从 CropVarietyTable 提到此处，编码规则前面 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm text-gray-600 font-medium">视图：</span>
              <Button
                variant={viewMode === 'table' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <List className="w-4 h-4" />
                表格
              </Button>
              <Button
                variant={viewMode === 'tree' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setViewMode('tree')}
              >
                <GitBranch className="w-4 h-4" />
                树形
              </Button>
            </div>
            <Button
              size="sm"
              onClick={handleCodeRuleClick}
            >
              编码规则 &gt;&gt;
            </Button>
            <span className="text-sm font-bold text-gray-900">作物编码生成</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCodeGenExpanded(!codeGenExpanded)}
              title={codeGenExpanded ? '收起' : '展开'}
            >
              {codeGenExpanded ? (
                <ChevronDown className="w-6 h-6 text-gray-600 font-bold" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-600 font-bold" />
              )}
            </Button>
          </div>
        </div>

        {/* 作物编码生成器展开内容 */}
        {codeGenExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* 类别 */}
              <div>
                <Label className="text-gray-700">类别</Label>
                <Select
                  value={codeGenCategory}
                  onValueChange={(val) => setCodeGenCategory(val)}
                >
                  <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 类型 */}
              <div>
                <Label className="text-gray-700">类型</Label>
                <Select
                  value={codeGenType}
                  onValueChange={(val) => setCodeGenType(val)}
                  disabled={!codeGenCategory}
                >
                  <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 品种 */}
              <div>
                <Label className="text-gray-700">作物</Label>
                <Select
                  value={codeGenVariety}
                  onValueChange={(val) => setCodeGenVariety(val)}
                  disabled={!codeGenType}
                >
                  <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    {varietyOptions.map(v => (
                      <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 子品种（3位码） */}
              <div>
                <Label className="text-gray-700">品种</Label>
                <Select
                  value={codeGenSubVariety1}
                  onValueChange={(val) => setCodeGenSubVariety1(val)}
                  disabled={!codeGenVariety || subVariety1Options.length === 0}
                >
                  <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    {subVariety1Options.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 生成结果 */}
              <div className="md:col-span-2">
                <Label className="text-gray-700">生成结果</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={generatedCode}
                    readOnly
                    placeholder="选择作物后点击生成"
                    className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50 font-mono"
                  />
                  <Button
                    onClick={handleGenerateCode}
                    disabled={!codeGenVariety}
                  >
                    <RefreshCw className="w-4 h-4" />
                    生成
                  </Button>
                  <Button
                    variant="blue"
                    onClick={handleCopyCode}
                    disabled={!generatedCode}
                  >
                    {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copySuccess ? '已复制' : '复制'}
                  </Button>
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
              要删除的品种：<span className="font-medium">
                {deleteConfirm.variety?.detailVarietyName || deleteConfirm.variety?.subVariety1Name || deleteConfirm.variety?.varietyName}
              </span>
            </p>
          </div>
        </div>
      </UnifiedModal>
    </div>
  );
}
