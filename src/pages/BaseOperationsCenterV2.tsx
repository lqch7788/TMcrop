/**
 * 基地运营中心 V2 页面
 * 树状布局：左侧基地树 + 右侧数据表格和统计卡片
 * 路由：/base-operations-v2
 */
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Edit2, Trash2, Building2, Loader2, List, Network, ArrowLeft, CalendarCheck, Check, History, Layers, Leaf, MapPin, Save, X, ChevronDown, ListTree } from 'lucide-react';
import { enhancedApiClient } from '@/lib/apiClient';
import { Modal } from '@/components/ui';
import { Tree } from '@/components/ui';
import type { TreeNode } from '@/components/ui/Tree';
import { Card, CardContent } from '@/components/ui';
import { Button, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Pagination,
} from '@/components/ui';
import { useBaseOperationsStore } from '@/stores/useBaseOperationsStore';
import { useBaseStore } from '@/stores/useBaseStore';
import { useGreenhouseStore } from '@/stores/useGreenhouseStore';
import { useZoneStore } from '@/stores/useZoneStore';
import { useBlockStore } from '@/stores/useBlockStore';
import { usePlantingRecordStore } from '@/stores/usePlantingRecordStore';
import { useDictionaryStore, getDictItems } from '@/stores/useDictionaryStore';
import type { Greenhouse, Zone } from '@/services/apiBasicDataService';
import type { PlantingRecord } from '@/services/apiPlantingRecordService';
import { showAlert, showToast } from '@/lib/dialogService';
import { StatsCards } from '@/components/farm/base-ops/StatsCards';
import { TreeMenu } from '@/components/farm/base-ops/TreeMenu';

// 2026-07-25 重构（方案 B）：FacilityTab / ZoneTab / PlantingTab 内联到本文件末尾
// 删除原 import './BaseOperationsCenter' 跨文件依赖

const LIST_PAGE_SIZE = 10;

// ============================================
// 数据转换函数
// ============================================

/**
 * 转义正则表达式特殊字符，防止 XSS 攻击
 * @param str 输入字符串
 * @returns 转义后的字符串
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 高亮搜索关键词
 * @param text 原始文本
 * @param query 搜索关键词
 * @returns React 节点，匹配文字用黄色背景高亮
 */
function highlightText(text: string, query: string): React.ReactNode {
  if (!query || !text) return text;

  // 转义特殊字符防止正则注入
  const escapedQuery = escapeRegExp(query);
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  );
}

/**
 * 将基地、温室、区域、地块数据构建为树形结构
 * @param bases 基地列表
 * @param greenhouses 温室列表
 * @param zones 区域列表
 * @param blocks 地块列表
 * @param currentBaseOid 当前基地OID（用于过滤，只显示该基地的数据）
 * @param searchQuery 搜索关键词
 * @returns 树形节点数组
 */
function buildTreeData(
  bases: { oid: string; code: string; name: string }[],
  greenhouses: { oid: string; code: string; name: string; baseOid: string }[],
  zones: { oid: string; zoneCode: string; zoneName: string; greenhouseOid: string }[],
  blocks: { oid: string; blockCode: string; blockName: string; zoneOid: string }[],
  currentBaseOid: string,
  searchQuery: string
): any[] {
  const query = searchQuery.toLowerCase();

  // 如果有当前基地OID，只显示该基地的数据
  if (currentBaseOid) {
    const currentBase = bases.find(b => b.oid === currentBaseOid);
    if (!currentBase) return [] as any;

    return [{
      key: `base_${currentBase.oid}`,
      title: highlightText(`${currentBase.code} ${currentBase.name}`, searchQuery),
      type: 'base' as const,
      oid: currentBase.oid,
      children: greenhouses
        .filter(gh => gh.baseOid === currentBaseOid && (!query || gh.name.toLowerCase().includes(query) || gh.code.toLowerCase().includes(query)))
        .map(gh => ({
          key: `gh_${gh.oid}`,
          title: highlightText(`${gh.code} ${gh.name}`, searchQuery),
          type: 'greenhouse' as const,
          oid: gh.oid,
          children: zones
            .filter(z => z.greenhouseOid === gh.oid && (!query || z.zoneName.toLowerCase().includes(query) || z.zoneCode.toLowerCase().includes(query)))
            .map(z => ({
              key: `zone_${z.oid}`,
              title: highlightText(`${z.zoneCode} ${z.zoneName}`, searchQuery),
              type: 'zone' as const,
              oid: z.oid,
              children: blocks
                .filter(b => b.zoneOid === z.oid && (!query || b.blockName.toLowerCase().includes(query) || b.blockCode.toLowerCase().includes(query)))
                .map(b => ({
                  key: `block_${b.oid}`,
                  title: highlightText(`${b.blockCode} ${b.blockName}`, searchQuery),
                  type: 'block' as const,
                  oid: b.oid,
                })),
            })),
        })),
    }];
  }

  // 没有 baseOid 时显示所有基地（兼容旧逻辑）
  return bases
    .filter(base => !query || base.name.toLowerCase().includes(query) || base.code.toLowerCase().includes(query))
    .map(base => ({
      key: `base_${base.oid}`,
      title: highlightText(`${base.code} ${base.name}`, searchQuery),
      type: 'base' as const,
      oid: base.oid,
      children: greenhouses
        .filter(gh => gh.baseOid === base.oid && (!query || gh.name.toLowerCase().includes(query) || gh.code.toLowerCase().includes(query)))
        .map(gh => ({
          key: `gh_${gh.oid}`,
          title: highlightText(`${gh.code} ${gh.name}`, searchQuery),
          type: 'greenhouse' as const,
          oid: gh.oid,
          children: zones
            .filter(z => z.greenhouseOid === gh.oid && (!query || z.zoneName.toLowerCase().includes(query) || z.zoneCode.toLowerCase().includes(query)))
            .map(z => ({
              key: `zone_${z.oid}`,
              title: highlightText(`${z.zoneCode} ${z.zoneName}`, searchQuery),
              type: 'zone' as const,
              oid: z.oid,
              children: blocks
                .filter(b => b.zoneOid === z.oid && (!query || b.blockName.toLowerCase().includes(query) || b.blockCode.toLowerCase().includes(query)))
                .map(b => ({
                  key: `block_${b.oid}`,
                  title: highlightText(`${b.blockCode} ${b.blockName}`, searchQuery),
                  type: 'block' as const,
                  oid: b.oid,
                })),
            })),
        })),
    }));
}

// ============================================
// 表格列定义
// ============================================
interface TableColumn {
  key: string;
  label: string;
  width?: string;
}

const BASE_COLUMNS: TableColumn[] = [
  { key: 'code', label: '编码', width: 'w-32' },
  { key: 'name', label: '名称' },
  { key: 'area', label: '面积' },
  { key: 'status', label: '状态', width: 'w-24' },
  { key: 'action', label: '操作', width: 'w-32' },
];

const GREENHOUSE_COLUMNS: TableColumn[] = [
  { key: 'code', label: '编码', width: 'w-32' },
  { key: 'name', label: '名称' },
  { key: 'location', label: '位置' },
  { key: 'area', label: '面积' },
  { key: 'status', label: '状态', width: 'w-24' },
  { key: 'action', label: '操作', width: 'w-32' },
];

const ZONE_COLUMNS: TableColumn[] = [
  { key: 'zoneCode', label: '编码', width: 'w-32' },
  { key: 'zoneName', label: '名称' },
  { key: 'zoneType', label: '类型' },
  { key: 'area', label: '面积' },
  { key: 'status', label: '状态', width: 'w-24' },
  { key: 'action', label: '操作', width: 'w-32' },
];

const BLOCK_COLUMNS: TableColumn[] = [
  { key: 'blockCode', label: '编码', width: 'w-32' },
  { key: 'blockName', label: '名称' },
  { key: 'blockType', label: '类型' },
  { key: 'area', label: '面积' },
  { key: 'status', label: '状态', width: 'w-24' },
  { key: 'action', label: '操作', width: 'w-32' },
];

// 种植记录表格列
const PLANTING_RECORD_COLUMNS: TableColumn[] = [
  { key: 'seasonCode', label: '编码', width: 'w-32' },
  { key: 'cropName', label: '作物' },
  { key: 'varietyName', label: '品种' },
  { key: 'startDate', label: '开始日期' },
  { key: 'status', label: '状态', width: 'w-24' },
  { key: 'action', label: '操作', width: 'w-32' },
];

// 2026-07-25：类型列英文→中文翻译表
// - zoneType 取值（来自 server/src/db/seedData.ts）：greenhouse / plastic_house / glass_house / solar_greenhouse / open_field
// - blockType 数据中已有中文（"露地"/"大棚"），但历史脏数据可能含英文，统一兼容
// - 找不到匹配时原样输出（不抹掉未知值，便于后期补字典）
const ZONE_TYPE_LABEL: Record<string, string> = {
  greenhouse: '温室大棚',
  plastic_house: '塑料大棚',
  glass_house: '玻璃温室',
  solar_greenhouse: '日光温室',
  open_field: '露天种植区',
  // 兼容历史/手填的可能取值
  大棚: '塑料大棚',
  露地: '露天种植区',
};
const BLOCK_TYPE_LABEL: Record<string, string> = {
  露地: '露地',
  大棚: '塑料大棚',
  planting: '种植区',
  open_field: '露天种植区',
};
const translateType = (key: string, value: unknown): string => {
  const v = value == null ? '' : String(value);
  if (!v) return '-';
  if (key === 'zoneType') return ZONE_TYPE_LABEL[v] || v;
  if (key === 'blockType') return BLOCK_TYPE_LABEL[v] || v;
  return v;
};

// 2026-07-25：编辑表单用的"类型"下拉选项（中文标签 + 英文存储值）
const ZONE_TYPE_OPTIONS = [
  { value: 'glass_house', label: '玻璃温室' },
  { value: 'plastic_house', label: '塑料大棚' },
  { value: 'solar_greenhouse', label: '日光温室' },
  { value: 'open_field', label: '露天种植区' },
  { value: 'greenhouse', label: '温室大棚' },
];
const BLOCK_TYPE_OPTIONS = [
  { value: '露地', label: '露地' },
  { value: '大棚', label: '塑料大棚' },
  { value: 'planting', label: '种植区' },
];

// ============================================
// 主组件
// ============================================
export default function BaseOperationsCenterV2() {
  // URL 参数获取当前基地 OID
  const [searchParams] = useSearchParams();
  const baseOidFromUrl = searchParams.get('baseOid') || '';

  // 2026-07-25 Plan B：合并双模式为单一布局。
//   删除 viewMode（'tree' | 'list'） + listTab（'facility' | 'zone' | 'planting'）
//   默认：顶部 4 统计卡 + 左 4 级树菜单 + 右主表格（带行折叠）。
//   selectedNode 驱动整页状态。

  // Store
  const {
    filteredData,
    expandedKeys,
    selectedNode,
    searchTerm,
    loading,
    loadAllData,
    setExpandedKeys,
    selectNode,
    setSearchTerm,
  } = useBaseOperationsStore();

  // 基础数据 Store（统一从 useBaseOperationsStore 获取）
  const { bases, greenhouses, zones, blocks } = useBaseOperationsStore();
  // 种植记录单独加载
  const { records, loadRecords } = usePlantingRecordStore();

  // 字典数据
  const { loadDictionaries } = useDictionaryStore();
  const greenhouseTypes = getDictItems('greenhouse_type');

  // 初始加载
  useEffect(() => {
    loadRecords();
    loadDictionaries();
  }, [loadRecords, loadDictionaries]);

  // 弹窗状态管理
  const [modalType, setModalType] = useState<'add' | 'edit' | null>(null);
  interface EditingItem {
    type: 'greenhouse' | 'zone' | 'block' | null
    oid: string | null
    data: Record<string, any> | null
  }
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);

  // 表单数据状态
  const [formData, setFormData] = useState<Record<string, any>>({});

  // 计算温室面积限制信息（用于区域表单）
  const greenhouseAreaInfo = useMemo(() => {
    // 获取当前要新增区域的温室
    const targetGhOid = selectedNode.type === 'greenhouse' && modalType === 'add'
      ? selectedNode.oid
      : formData.greenhouseOid;

    if (!targetGhOid) return null;

    const greenhouse = greenhouses.find(gh => gh.oid === targetGhOid);
    if (!greenhouse) return null;

    // 计算该温室下已分配的区块面积总和
    const usedArea = zones
      .filter(z => z.greenhouseOid === targetGhOid)
      .reduce((sum, z) => sum + (z.area || 0), 0);

    // 剩余可用面积
    const remainingArea = (greenhouse.area || 0) - usedArea;

    return {
      greenhouseName: greenhouse.name,
      totalArea: greenhouse.area || 0,
      usedArea,
      remainingArea,
    };
  }, [selectedNode, modalType, formData.greenhouseOid, greenhouses, zones]);

  // 打开新增弹窗
  const handleAdd = (addedType?: 'base' | 'greenhouse' | 'zone') => {
    setModalType('add');
    setEditingItem(null);
    // 2026-07-25：支持显式指定新增类型（来自 TreeMenu 底部 [+新增基地/温室/区块]）
    setExplicitAddType(addedType || null);
    const effectiveType = addedType || selectedNode.type;
    // 根据选中节点类型初始化表单数据
    if (effectiveType === 'base') {
      // 新增基地（explicit addType='base' from TreeMenu [+新增基地]）
      setFormData({ status: 'active' });
    } else if (effectiveType === 'greenhouse') {
      // 新增温室（默认选中 base 时，或 explicit addType='greenhouse'）
      setFormData({ status: 'active', baseOid: selectedNode.oid || '' });
    } else if (effectiveType === 'zone') {
      // 新增区域/区块（selectedNode 是 greenhouse 时新增区域，或 explicit addType='zone' 新增区块）
      setFormData({ status: 'active', greenhouseOid: selectedNode.oid || '' });
    } else if (effectiveType === 'block') {
      // 新增地块
      setFormData({ status: 'active', zoneOid: selectedNode.oid || '' });
    } else {
      setFormData({ status: 'active' });
    }
  };

  // 打开编辑弹窗
  const handleEdit = (item: any) => {
    setModalType('edit');
    setEditingItem(item);
    setFormData({ ...item });
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setModalType(null);
    setEditingItem(null);
    setFormData({});
    setExplicitAddType(null);  // 2026-07-25：清空显式新增类型
  };

  // 处理表单字段变化
  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 提交表单（新增或编辑）
  const handleSubmit = async () => {
    try {
      // 2026-07-25 修复 种植记录 无 seasonCode 字段却要求"编码"：
      //   旧版单一校验 (code|zoneCode|blockCode) 漏了 seasonCode，新增种植记录时 formData 三个都是 undefined
      //   → 走"请填写编码"红 toast，但表单里压根没这字段，用户无法保存
      //   修复：按表单类型分支校验
      // 2026-07-25：planting_records 表已弃用，block 行不允许新增种植记录表单
      if (addAnchorType === 'block' || editTargetType === 'planting') {
        showToast('种植信息请到「种植管理」页面编辑', 'info');
        handleCloseModal();
        return;
      } else {
        // 基地 / 温室 / 区域 / 地块：编码 + 名称必填
        if (!formData.code && !formData.zoneCode && !formData.blockCode) {
          showToast('请填写编码', 'error');
          return;
        }
        if (!formData.name && !formData.zoneName && !formData.blockName) {
          showToast('请填写名称', 'error');
          return;
        }
      }

      // 区域新增/编辑时的面积验证（2026-07-25 同步改：用 editTargetType/addAnchorType 替换 selectedNode.type）
      if (addAnchorType === 'greenhouse' || editTargetType === 'zone') {
        const ghOid = addAnchorType === 'greenhouse'
          ? selectedNode.oid
          : formData.greenhouseOid;
        const greenhouse = greenhouses.find(gh => gh.oid === ghOid);
        if (greenhouse) {
          // 计算已分配的区块面积（编辑时排除自身）
          const usedArea = zones
            .filter(z => z.greenhouseOid === ghOid && (modalType === 'edit' ? z.oid !== editingItem?.oid : true))
            .reduce((sum, z) => sum + (z.area || 0), 0);
          const remainingArea = (greenhouse.area || 0) - usedArea;
          if ((formData.area || 0) > remainingArea) {
            showToast(`区块面积不能超过剩余可用面积 ${remainingArea} ㎡`, 'error');
            return;
          }
        }
      }

      if (modalType === 'add') {
        // 新增
        if (explicitAddType === 'base') {
          // 2026-07-25：新增基地（来自 [+新增基地] 工具栏按钮）
          await useBaseStore.getState().addBase(formData);
          showToast('基地新增成功', 'success');
        } else if (explicitAddType === 'greenhouse') {
          // 2026-07-25：新增温室（来自 [+新增温室] 工具栏按钮）
          await useGreenhouseStore.getState().addGreenhouse({
            ...formData,
            baseOid: selectedNode.oid || baseOidFromUrl || '',
          });
          showToast('温室新增成功', 'success');
        } else if (explicitAddType === 'zone') {
          // 2026-07-25：新增区块（来自 [+新增区块] 工具栏按钮）
          await useZoneStore.getState().addZone({
            ...formData,
            greenhouseOid: selectedNode.oid || '',
          });
          showToast('区块新增成功', 'success');
        } else if (selectedNode.type === 'base') {
          // 新增温室（隐式，行操作列按钮）
          await useGreenhouseStore.getState().addGreenhouse({
            ...formData,
            baseOid: selectedNode.oid || '',
          });
          showToast('温室新增成功', 'success');
        } else if (selectedNode.type === 'greenhouse') {
          // 新增区域（隐式，行操作列按钮）
          await useZoneStore.getState().addZone({
            ...formData,
            greenhouseOid: selectedNode.oid || '',
          });
          showToast('区域新增成功', 'success');
        } else if (selectedNode.type === 'zone') {
          // 新增地块
          await useBlockStore.getState().addBlock({
            ...formData,
            zoneOid: selectedNode.oid || '',
          });
          showToast('地块新增成功', 'success');
        } else if (selectedNode.type === 'block') {
          // 2026-07-25：planting_records 表已弃用，block 行不再支持新增种植记录表单
          showToast('种植信息请到「种植管理」页面编辑', 'info');
        }
      } else if (modalType === 'edit' && editingItem) {
        // 编辑
        if (editingItem.type === 'greenhouse') {
          await useGreenhouseStore.getState().editGreenhouse(editingItem.oid || '', formData);
          showToast('温室编辑成功', 'success');
        } else if (editingItem.type === 'zone') {
          await useZoneStore.getState().editZone(editingItem.oid || '', formData);
          showToast('区域编辑成功', 'success');
        } else if (editingItem.type === 'block') {
          await useBlockStore.getState().editBlock(editingItem.oid || '', formData);
          showToast('地块编辑成功', 'success');
        }
      }
      handleCloseModal();
      // 刷新数据
      loadAllData();
    } catch (error) {
      showToast('操作失败', 'error');
    }
  };

  // 处理删除
  // 2026-07-25 修复"删除假成功"bug：
  //   旧版按 selectedNode.type 派发 store.remove，但 selectedNode 是"父节点"
  //   删的是"子行"——例如 selectedNode='greenhouse'（玻璃温室区），表里点 zone 行删除 →
  //   走 removeGreenhouse(zoneOid)，API 200 + 0 rows affected，返回的 toast 还会显示
  //   "温室删除成功"（UI 看不出错误，但 zone 还在 DB 里）
  // 修复：用被删行的 row.type 决定派发哪个 store
  const handleDelete = async (row: Record<string, any>) => {
    await showAlert('确定要删除吗？删除后无法恢复。');
    // showAlert 仅接受 1 个参数（message）；删除按钮文字由 UI 提供

    const rowType = row.type as string;
    const labelMap: Record<string, string> = {
      greenhouse: '温室',
      zone: '区域',
      block: '地块',
      planting: '种植记录',
      base: '基地',
    };
    const successLabel = labelMap[rowType] || '记录';

    try {
      if (rowType === 'greenhouse') {
        await useGreenhouseStore.getState().removeGreenhouse(row.oid);
        showToast(`${successLabel}删除成功`, 'success');
      } else if (rowType === 'zone') {
        await useZoneStore.getState().removeZone(row.oid);
        showToast(`${successLabel}删除成功`, 'success');
      } else if (rowType === 'block') {
        await useBlockStore.getState().removeBlock(row.oid);
        showToast(`${successLabel}删除成功`, 'success');
      } else if (rowType === 'planting') {
        // 种植记录暂无 delete store，fallback 占位（暂无 UI 入口）
        showToast('种植记录删除：未实现', 'error');
        return;
      } else {
        showToast('未知的记录类型，无法删除', 'error');
        return;
      }
      loadAllData();
    } catch (error) {
      showToast('删除失败', 'error');
    }
  };

  // 使用 buildTreeData 函数构建本地树形数据
  const treeData = useMemo(() => {
    return buildTreeData(bases as any, greenhouses as any, zones as any, blocks as any, baseOidFromUrl, searchTerm) as any;
  }, [bases, greenhouses, zones, searchTerm]);

  // 按基地过滤后的数据（用于列表视图）
  const filteredGreenhouses = useMemo(() => {
    return greenhouses.filter(g => !baseOidFromUrl || g.baseOid === baseOidFromUrl);
  }, [greenhouses, baseOidFromUrl]);

  const filteredZones = useMemo(() => {
    if (!baseOidFromUrl) return zones;
    const baseGhOids = new Set(filteredGreenhouses.map(g => String(g.oid || '')));
    return zones.filter(z => baseGhOids.has(String(z.greenhouseOid || '')));
  }, [zones, filteredGreenhouses, baseOidFromUrl]);

  const filteredRecords = useMemo(() => {
    if (!baseOidFromUrl) return records;
    const baseGhOids = new Set(filteredGreenhouses.map(g => String(g.oid || '')));
    return records.filter(r => baseGhOids.has(String(r.facilityOid || '')));
  }, [records, filteredGreenhouses, baseOidFromUrl]);

  // 加载所有数据（仅首次挂载时）
  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 当有 baseOid 时，自动展开该基地节点
  useEffect(() => {
    if (baseOidFromUrl && bases.length > 0) {
      const baseKey = `base_${baseOidFromUrl}`;
      if (!expandedKeys.includes(baseKey)) {
        setExpandedKeys([baseKey]);
      }
    }
  }, [baseOidFromUrl, bases, expandedKeys, setExpandedKeys]);

  // 2026-07-25 Plan B Task 6：URL 持久化选中节点
  //   - 选中节点变化 → 写入 ?nodeType=&nodeOid=
  //   - URL 读取 → 恢复 selectedNode（一次性 mount）
  const [urlApplied, setUrlApplied] = useState(false);
  useEffect(() => {
    if (urlApplied) return;
    const params = new URLSearchParams(window.location.search);
    const nodeType = params.get('nodeType');
    const nodeOid = params.get('nodeOid');
    if (nodeType && nodeOid) {
      selectNode(nodeType as any, nodeOid, '');
    }
    setUrlApplied(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedNode.oid) {
      params.set('nodeType', selectedNode.type);
      params.set('nodeOid', selectedNode.oid);
    }
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    if (newUrl !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState({}, '', newUrl);
    }
  }, [selectedNode]);

  // 根据选中节点获取表格数据（树状视图使用）
  const tableData = useMemo(() => {
    if (!selectedNode.oid) {
      // 未选中时，如果有 baseOidFromUrl 显示该基地的温室，否则显示所有基地
      if (baseOidFromUrl) {
        return greenhouses
          .filter((gh) => gh.baseOid === baseOidFromUrl)
          .map((gh) => ({
            type: 'greenhouse' as const,
            oid: gh.oid,
            code: gh.code || '-',
            name: gh.name || '未命名温室',
            location: gh.location || '-',
            area: gh.area ? `${gh.area}` : '-',
            status: gh.status || 'active',
          }));
      }
      return bases.map((b) => ({
        type: 'base' as const,
        oid: b.oid,
        code: b.code || '-',
        name: b.name || '未命名基地',
        area: b.area ? `${b.area}` : '-',
        status: b.status || 'active',
      }));
    }

    switch (selectedNode.type) {
      case 'base': {
        return greenhouses
          .filter((gh) => gh.baseOid === selectedNode.oid)
          .map((gh) => ({
            type: 'greenhouse' as const,
            oid: gh.oid,
            code: gh.code || '-',
            name: gh.name || '未命名温室',
            location: gh.location || '-',
            area: gh.area ? `${gh.area}` : '-',
            status: gh.status || 'active',
          }));
      }
      case 'greenhouse': {
        return zones
          .filter((z) => z.greenhouseOid === selectedNode.oid)
          .map((z) => ({
            type: 'zone' as const,
            oid: z.oid,
            zoneCode: z.zoneCode || '-',
            zoneName: z.zoneName || '未命名区域',
            zoneType: z.zoneType || '-',
            area: z.area ? `${z.area}` : '-',
            status: z.status || 'active',
          }));
      }
      case 'zone': {
        return blocks
          .filter((b) => b.zoneOid === selectedNode.oid)
          .map((b) => ({
            type: 'block' as const,
            oid: b.oid,
            blockCode: b.blockCode || '-',
            blockName: b.blockName || '未命名地块',
            blockType: b.blockType || '-',
            area: b.area ? `${b.area}` : '-',
            status: b.status || 'active',
          }));
      }
      case 'block': {
        // 选中地块时，显示该地块的种植记录
        return records
          .filter((r) => r.blockOid === selectedNode.oid)
          .map((r) => ({
            type: 'planting' as const,
            oid: r.oid,
            seasonCode: r.seasonCode || '-',
            cropName: r.cropName || '-',
            varietyName: r.varietyName || '-',
            startDate: r.startDate?.slice(0, 10) || '-',
            status: r.status || '-',
          }));
      }
      default:
        return [];
    }
  }, [selectedNode, bases, greenhouses, zones, blocks, records, baseOidFromUrl]);

  // 根据选中节点计算统计数据
  // 2026-07-25 P2 修复：URL 带 baseOid 但用户尚未点选树节点时，
  //   tableData 已经 fallback 用 baseOidFromUrl 显示温室列表，但 stats 仍然走
  //   "selectedNode.oid 为空 → 返回全 0" 的旧路径，导致顶部 4 个统计卡片全是 0
  // 修复：selectedNode.oid 为空但有 baseOidFromUrl 时，按 baseOidFromUrl 当作"base 级"统计
  const stats = useMemo(() => {
    // 派生一个有效的 base oid（先 selectedNode，没有再 URL）
    const effectiveBaseOid = selectedNode.oid || baseOidFromUrl;
    const effectiveNodeType = selectedNode.oid ? selectedNode.type : (baseOidFromUrl ? 'base' : null);

    if (!effectiveBaseOid || !effectiveNodeType) {
      return { totalArea: 0, zoneCount: 0, plantingCount: 0, currentCrop: '-' };
    }

    // 局部辅助：与原 case 'base' 同样的统计逻辑，对外暴露 targetBaseOid 参数
    // 2026-07-25：改用 zones[].aggregatedPlantings API 字段（planting_records 已弃用）
    const computeBaseStats = (targetBaseOid: string) => {
      const baseNode = bases.find((b) => b.oid === targetBaseOid);
      const baseGreenhouses = greenhouses.filter((gh) => gh.baseOid === targetBaseOid);
      const baseZones = zones.filter((z) =>
        baseGreenhouses.some((gh) => gh.oid === String(z.greenhouseOid || '')),
      );

      // P2 修复：base.area（亩 → ㎡）优先于 greenhouse.area 累加
      const MU_TO_SQM = 666.67;
      const baseAreaSqm = (Number(baseNode?.area) || 0) * MU_TO_SQM;
      const ghAreaSum = baseGreenhouses.reduce((sum, gh) => sum + (Number(gh.area) || 0), 0);
      const totalArea = baseAreaSqm > 0 ? baseAreaSqm : ghAreaSum;

      // 用 aggregatedPlantings 聚合字段（来自 GET /api/basic-data/zones 的 LEFT JOIN）
      const plantingCount = baseZones.reduce(
        (sum, z) => sum + (z.aggregatedPlantings?.count || 0),
        0,
      );
      const currentCrop = baseZones
        .map((z) => z.aggregatedPlantings?.currentCrop)
        .filter((c) => c && c !== '-')[0] || '-';

      return {
        totalArea,
        zoneCount: baseZones.length,
        plantingCount,
        currentCrop,
      };
    };

    switch (effectiveNodeType) {
      case 'base': {
        // 委托给外层 computeBaseStats（共享统计逻辑）
        return computeBaseStats(effectiveBaseOid);
      }
      case 'greenhouse': {
        // 2026-07-25：改用 aggregatedPlantings API 字段（planting_records 已弃用）
        const ghZones = zones.filter(z => z.greenhouseOid === selectedNode.oid);
        const plantingCount = ghZones.reduce(
          (sum, z) => sum + (z.aggregatedPlantings?.count || 0),
          0,
        );
        const currentCrop = ghZones
          .map(z => z.aggregatedPlantings?.currentCrop)
          .filter(c => c && c !== '-')[0] || '-';

        return {
          totalArea: greenhouses.find(gh => gh.oid === selectedNode.oid)?.area || 0,
          zoneCount: ghZones.length,
          plantingCount,
          currentCrop,
        };
      }
      case 'zone': {
        // 2026-07-25：改用 aggregatedPlantings API 字段（planting_records 已弃用）
        const zone = zones.find(z => z.oid === selectedNode.oid);
        return {
          totalArea: zone?.area || 0,
          zoneCount: 1,
          plantingCount: zone?.aggregatedPlantings?.count || 0,
          currentCrop: zone?.aggregatedPlantings?.currentCrop || '-',
        };
      }
      default:
        return { totalArea: 0, zoneCount: 0, plantingCount: 0, currentCrop: '-' };
    }
  }, [selectedNode, bases, greenhouses, zones, records, blocks, baseOidFromUrl]);

  // 根据选中节点类型获取表格列
  // 2026-07-25 修复 区域划分 bug：列模板必须匹配"显示的子节点类型"而非"被选中节点类型"
  //   - 选中 base 时，tableData 返回 greenhouse children → 用 GREENHOUSE_COLUMNS
  //   - 选中 greenhouse 时，tableData 返回 zone children → 用 ZONE_COLUMNS
  //   - 选中 zone 时，tableData 返回 block children → 用 BLOCK_COLUMNS
  //   错配导致子节点的 code/name 等字段全部 undefined、回退显示 "-"
  const tableColumns = useMemo(() => {
    switch (selectedNode.type) {
      case 'base':
        return GREENHOUSE_COLUMNS;
      case 'greenhouse':
        return ZONE_COLUMNS;
      case 'zone':
        return BLOCK_COLUMNS;
      case 'block':
        return PLANTING_RECORD_COLUMNS;
      default:
        return BASE_COLUMNS;
    }
  }, [selectedNode.type]);

  // 处理节点选择
  const handleNodeSelect = (key: string) => {
    // 2026-07-25 修复 key 解析：base oid 含 '_'（如 'base_1780023508412'）
    //   旧版用 split('_') 会把 oid 截断成 '1780023508412'——base.match(b.oid=?) 返回 undefined
    //   → stats 退化到 0
    //   改用 indexOf 取首个分隔位置，剩下的部分（含 '_'）作为 oid 整段
    const sepIdx = key.indexOf('_');
    const type = sepIdx >= 0 ? key.substring(0, sepIdx) : '';
    const oid = sepIdx >= 0 ? key.substring(sepIdx + 1) : '';
    const typeMap: Record<string, 'base' | 'greenhouse' | 'zone' | 'block'> = {
      base: 'base',
      gh: 'greenhouse',
      zone: 'zone',
      block: 'block',
    }
    // 从树数据中查找节点名称
    const nodeName = (() => {
      if (type === 'base') {
        return bases.find(b => b.oid === oid)?.name || '';
      } else if (type === 'gh') {
        return greenhouses.find(g => g.oid === oid)?.name || '';
      } else if (type === 'zone') {
        return zones.find(z => z.oid === oid)?.zoneName || '';
      } else if (type === 'block') {
        return blocks.find(b => b.oid === oid)?.blockName || '';
      }
      return '';
    })();
    selectNode(typeMap[type] || 'base', oid, nodeName)
  };

  // 获取类型名称
  const getTypeName = (type: string): string => {
    const names: Record<string, string> = {
      base: '基地',
      greenhouse: '温室',
      zone: '区域',
      block: '地块',
    };
    return names[type] || type;
  };

  // 获取新增按钮文本
  const getAddButtonText = (): string => {
    switch (selectedNode.type) {
      case 'base':
        return '新增温室';
      case 'greenhouse':
        return '新增区域';
      case 'zone':
        return '新增地块';
      case 'block':
        return '新增种植记录';
      default:
        return '新增基地';
    }
  };

  // 获取当前基地名称
  const currentBaseName = useMemo(() => {
    if (baseOidFromUrl) {
      return bases.find(b => b.oid === baseOidFromUrl)?.name || '加载中...';
    }
    return '';
  }, [baseOidFromUrl, bases]);

  // 2026-07-25 修复 modal 弹窗空白 bug：
  // 旧版"用 selectedNode.type 决定编辑模式显示哪种表单"在以下场景失效——
  //   当 selectedNode = greenhouse（左侧树节点），用户点"右侧子 zone 行"的编辑按钮，
  //   handleEdit 设置 modalType='edit'、formData=zone 数据，但 selectedNode.type 仍是 'greenhouse'，
  //   modal 内 4 个表单的条件 (selectedNode.type === 'zone' && modalType === 'edit') 全 false，
  //   弹窗打开但内容为空。
  // 修复：在 edit 模式下，目标表单类型由 formData.type（被编辑行类型）决定；
  //       在 add 模式下，仍由 selectedNode.type 决定。
  const editTargetType = modalType === 'edit' ? (formData?.type as string | undefined) : undefined;
  // 2026-07-25：addAnchorType 优先取 handleAdd 传入的显式 type（来自 TreeMenu [+新增基地/温室/区块] 按钮）
  const [explicitAddType, setExplicitAddType] = useState<'base' | 'greenhouse' | 'zone' | null>(null);
  const addAnchorType = modalType === 'add' ? (explicitAddType || selectedNode.type) : null;

  /** 编辑模式标题：跟随被编辑行的真实类型 */
  const getEditButtonText = (): string => {
    const map: Record<string, string> = {
      greenhouse: '温室',
      zone: '区域',
      block: '地块',
      planting: '种植记录',
      base: '基地',
    };
    return map[editTargetType as string] || '';
  };

  return (
    <div className="h-full flex flex-col">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-4 shadow-none mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 2026-07-25：返回箭头 → 系统设置主页（与 FarmStructureManagement 等其他设置子页面一致） */}
            <a
              href="/settings"
              className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center hover:from-gray-200 hover:to-gray-300 transition-colors"
              title="返回系统设置"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">基地运营中心</h1>
              <p className="text-sm text-gray-500">
                {baseOidFromUrl
                  ? `当前基地：${currentBaseName}`
                  : selectedNode.name
                  ? `当前选择：${selectedNode.name}`
                  : '请从左侧树形结构中选择节点'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Plan B 统一布局：顶部 4 统计卡 + 左 4 级树菜单 + 右主表格（带行折叠） */}
      <div className="flex-1 flex flex-col gap-4 px-6 pb-6 min-h-0">
        {/* 顶部 4 统计卡（Plan B Task 2 抽出，stats 来自 useBaseOpsStats hook） */}
        <StatsCards stats={stats} />
        {/* 工具栏：新增基地 / 新增温室 / 新增区块（顶部操作区，不在 TreeMenu 底部） */}
        <div className="bg-white rounded-xl p-3 flex items-center gap-2 shadow-none">
          <Button size="sm" onClick={() => handleAdd('base')}>
            <Plus className="w-4 h-4 mr-1" /> 新增基地
          </Button>
          <Button size="sm" variant="secondary" onClick={() => handleAdd('greenhouse')}>
            <Plus className="w-4 h-4 mr-1" /> 新增温室
          </Button>
          <Button size="sm" variant="secondary" onClick={() => handleAdd('zone')}>
            <Plus className="w-4 h-4 mr-1" /> 新增区块
          </Button>
        </div>
        {/* Plan B Task 5：删除 tree branch（line 880-1028）和 list mode tab UI
            改为统一布局：左 TreeMenu + 右 GreenhouseWithZonesTab（保留行折叠） */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* 左 4 级树菜单（Plan B Task 3 TreeMenu 组件） */}
          <TreeMenu
            treeData={treeData}
            selectedNode={selectedNode}
            expandedKeys={expandedKeys}
            searchTerm={searchTerm}
            onSelect={handleNodeSelect}
            onExpand={setExpandedKeys}
            onSearchChange={setSearchTerm}
            loading={loading}
          />

          {/* 右侧主区域：直接用 GreenhouseWithZonesTab（带行折叠 + 行内批次列表） */}
          <div className="flex-1 bg-white rounded-xl shadow-none flex flex-col min-h-0 p-4 overflow-auto">
            {/* Plan B Task 5: 旧的 listTab 切换按钮已删除（合并为单 TreeMenu + GreenhouseWithZonesTab） */}
            <GreenhouseWithZonesTab
              greenhouses={filteredGreenhouses}
              zones={filteredZones}
              bases={bases}
              baseOid={baseOidFromUrl}
              baseName={bases.find(b => b.oid === baseOidFromUrl)?.name || ''}
              loading={loading}
              onAddGH={async (data: any) => {
                await useGreenhouseStore.getState().addGreenhouse(data);
                loadAllData();
              }}
              onEditGH={async (id: any, data: any) => {
                await useGreenhouseStore.getState().editGreenhouse(id, data);
                loadAllData();
              }}
              onRemoveGH={async (id: any) => {
                await useGreenhouseStore.getState().removeGreenhouse(id);
                loadAllData();
              }}
              onAddZone={async (data: any) => {
                await useZoneStore.getState().addZone(data);
                loadAllData();
              }}
              onEditZone={async (id: any, data: any) => {
                await useZoneStore.getState().editZone(id, data);
                loadAllData();
              }}
              onRemoveZone={async (id: any) => {
                await useZoneStore.getState().removeZone(id);
                loadAllData();
              }}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
          {/* Plan B Task 5：删除 listTab='planting' PlantingTab（planting_records 弃用） */}
          {/* ↑↑↑ 上面 line 932 已经是唯一的 GreenhouseWithZonesTab。
               这里（line 969）原本有一份重复渲染，已删除。 */}
          </div>
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      <Modal
        isOpen={!!modalType}
        onClose={handleCloseModal}
        title={modalType === 'add' ? `新增${getAddButtonText().replace('新增', '')}` : `编辑${getEditButtonText()}`}
        onSubmit={handleSubmit}
        size="md"
        width={650}
        height={520}
      >
        <div className="space-y-4">
          {/* 温室表单：编辑温室行（formData.type='greenhouse'）OR 新增基地下温室（addAnchorType='base'）*/}
          {/* 2026-07-25：基地表单（点击 [+新增基地] 时显示）。
              触发条件：modalType='add' 且 explicitAddType='base' */}
          {modalType === 'add' && explicitAddType === 'base' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">编码</label>
                  <Input
                    value={formData.code || ''}
                    onChange={(e) => handleFormChange('code', e.target.value)}
                    placeholder="请输入基地编码"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    placeholder="请输入基地名称"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">面积(亩)</label>
                  <Input
                    type="number"
                    value={formData.area || ''}
                    onChange={(e) => handleFormChange('area', Number(e.target.value))}
                    placeholder="请输入面积"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                  <Select
                    value={formData.status || 'active'}
                    onValueChange={(value) => handleFormChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">启用</SelectItem>
                      <SelectItem value="inactive">停用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* 温室表单：编辑温室 OR 新增温室（显式或默认 selectedNode='base'） */}
          {(editTargetType === 'greenhouse' || addAnchorType === 'base' || explicitAddType === 'greenhouse') && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">编码</label>
                  <Input
                    value={formData.code || ''}
                    onChange={(e) => handleFormChange('code', e.target.value)}
                    placeholder="请输入编码"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    placeholder="请输入名称"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                  <Select
                    value={formData.greenhouseType || ''}
                    onValueChange={(value) => handleFormChange('greenhouseType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择温室类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {greenhouseTypes.map(o => (
                        <SelectItem key={o.dictCode} value={o.dictCode}>{o.dictLabel}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">面积(㎡)</label>
                  <Input
                    type="number"
                    value={formData.area || ''}
                    onChange={(e) => handleFormChange('area', Number(e.target.value))}
                    placeholder="请输入面积"
                  />
                  {greenhouseAreaInfo && (
                    <div className="mt-1 text-xs text-gray-500">
                      所属温室：{greenhouseAreaInfo.greenhouseName}（总面积 {greenhouseAreaInfo.totalArea} ㎡，已分配 {greenhouseAreaInfo.usedArea} ㎡，剩余可用 {greenhouseAreaInfo.remainingArea} ㎡）
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">位置</label>
                <Input
                  value={formData.location || ''}
                  onChange={(e) => handleFormChange('location', e.target.value)}
                  placeholder="请输入位置"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <Select
                  value={formData.status || 'active'}
                  onValueChange={(value) => handleFormChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">启用</SelectItem>
                    <SelectItem value="inactive">停用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* 区域表单：编辑 zone 行（formData.type='zone'）OR 新增温室下区域（addAnchorType='greenhouse'）*/}
          {(editTargetType === 'zone' || addAnchorType === 'greenhouse' || explicitAddType === 'zone') && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">编码</label>
                  <Input
                    value={formData.zoneCode || ''}
                    onChange={(e) => handleFormChange('zoneCode', e.target.value)}
                    placeholder="请输入编码"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                  <Input
                    value={formData.zoneName || ''}
                    onChange={(e) => handleFormChange('zoneName', e.target.value)}
                    placeholder="请输入名称"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                  <Select
                    value={formData.zoneType || ''}
                    onValueChange={(value) => handleFormChange('zoneType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择区域类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {ZONE_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">面积(㎡)</label>
                  <Input
                    type="number"
                    value={formData.area || ''}
                    onChange={(e) => handleFormChange('area', Number(e.target.value))}
                    placeholder="请输入面积"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <Select
                  value={formData.status || 'active'}
                  onValueChange={(value) => handleFormChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">启用</SelectItem>
                    <SelectItem value="inactive">停用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* 地块表单：编辑 block 行 OR 新增 zone 下地块 */}
          {(editTargetType === 'block' || addAnchorType === 'zone') && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">编码</label>
                  <Input
                    value={formData.blockCode || ''}
                    onChange={(e) => handleFormChange('blockCode', e.target.value)}
                    placeholder="请输入编码"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                  <Input
                    value={formData.blockName || ''}
                    onChange={(e) => handleFormChange('blockName', e.target.value)}
                    placeholder="请输入名称"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                  <Select
                    value={formData.blockType || ''}
                    onValueChange={(value) => handleFormChange('blockType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择地块类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOCK_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">面积(㎡)</label>
                  <Input
                    type="number"
                    value={formData.area || ''}
                    onChange={(e) => handleFormChange('area', Number(e.target.value))}
                    placeholder="请输入面积"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <Select
                  value={formData.status || 'active'}
                  onValueChange={(value) => handleFormChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">启用</SelectItem>
                    <SelectItem value="inactive">停用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* 2026-07-25：planting_records 表已弃用，移除 block 行种植记录表单。
              种植信息请到「种植管理」页面编辑（plan Task 5）。 */}
        </div>
      </Modal>
    </div>
  );
}

/* ============================================
 * 2026-07-25 重构（方案 B）：以下 3 个 Tab 函数原本在
 * src/pages/BaseOperationsCenter.tsx，现已内联到本文件末尾
 *
 * 共享模式：
 * - 接受 props (data + onAdd/onEdit/onRemove)：V2 父组件接管所有数据加载和 mutation
 * - 每次 onAdd/onEdit/onRemove 后 V2 自动调 useBaseOperationsStore.loadAllData()，
 *   → 双模式（树状视图 + 列表视图）都自动反映最新数据，无需各自再 loadX
 * - PAGE_SIZE 改为 LIST_PAGE_SIZE 避免与外部 import 冲突
 * ============================================ */

/* ==================== 种植区 + 区块合并子组件（列表模式 Tab 1，折叠式） ==================== */
/**
 * 2026-07-25：合并原 FacilityTab + ZoneTab 为折叠式树状列表
 * 每个种植区是一行（可点击展开），展开后显示嵌套的区块列表
 *
 * 设计要点：
 * - 默认全部折叠（节省屏幕）
 * - 搜索时自动展开命中行（让匹配可见）
 * - 区块的"所属种植区"在编辑时锁定、新增时预填当前展开组
 * - 删除种植区前弹警告（若有区块）
 */
export function GreenhouseWithZonesTab({
  greenhouses, zones, bases, baseOid, baseName, loading,
  onAddGH, onEditGH, onRemoveGH,
  onAddZone, onEditZone, onRemoveZone,
  searchTerm, setSearchTerm,
}: {
  greenhouses: Greenhouse[];
  zones: Zone[];
  bases: any[];
  baseOid: string;
  baseName: string;
  loading: boolean;
  onAddGH: any; onEditGH: any; onRemoveGH: any;
  onAddZone: any; onEditZone: any; onRemoveZone: any;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
}) {
  // 2026-07-25：默认全部展开（用户期望右侧显示完整 3 级结构：基地→温室→区域）
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // 数据到达时展开所有温室
  useEffect(() => {
    if (filteredGH.length === 0) return;
    setExpanded(prev => {
      // 已展开的保持折叠，避免覆盖用户主动收起的状态
      const next: Record<string, boolean> = {};
      filteredGH.forEach(gh => {
        if (prev[gh.oid] === undefined) next[gh.oid] = true;
        else next[gh.oid] = prev[gh.oid];
      });
      return next;
    });
  }, [filteredGH.length]);  // eslint-disable-line react-hooks/exhaustive-deps
  // 温室新增/编辑 modal
  const [showGHModal, setShowGHModal] = useState(false);
  const [editingGH, setEditingGH] = useState<Greenhouse | null>(null);
  const [ghFormData, setGHFormData] = useState<Partial<Greenhouse>>({});
  const [deleteGHConfirm, setDeleteGHConfirm] = useState<Greenhouse | null>(null);
  // 区块新增/编辑 modal
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [zoneFormData, setZoneFormData] = useState<Partial<Zone>>({});
  const [deleteZoneConfirm, setDeleteZoneConfirm] = useState<Zone | null>(null);

  const { loadDictionaries } = useDictionaryStore();
  const facilityTypes = getDictItems('greenhouse_type');
  const zoneTypes = [
    { value: 'greenhouse', label: '温室大棚' },
    { value: 'plastic_house', label: '塑料大棚' },
    { value: 'glass_house', label: '玻璃温室' },
    { value: 'solar_greenhouse', label: '日光温室' },
    { value: 'open_field', label: '露天种植区' },
    { value: 'other', label: '其他' },
  ];
  const areaUnits = [
    { value: '亩', label: '亩' },
    { value: '平方米', label: '平方米' },
    { value: '公顷', label: '公顷' },
    { value: '个', label: '个' },
    { value: '栋', label: '栋' },
    { value: '座', label: '座' },
  ];

  // 搜索匹配：种植区 或 区块 名称/编码
  const lowerQ = searchTerm.trim().toLowerCase();
  const filteredGH = greenhouses.filter(gh =>
    (gh.name || '').toLowerCase().includes(lowerQ) ||
    (gh.code || '').toLowerCase().includes(lowerQ)
  );

  // 搜索变化时自动展开命中种植区（让匹配项可见）
  useEffect(() => {
    if (!lowerQ) { setExpanded({}); return; }
    const auto: Record<string, boolean> = {};
    filteredGH.forEach(gh => {
      const hasMatch = zones.some(z =>
        z.greenhouseOid === gh.oid && (
          (z.zoneName || '').toLowerCase().includes(lowerQ) ||
          (z.zoneCode || '').toLowerCase().includes(lowerQ)
        )
      );
      if (hasMatch) auto[gh.oid] = true;
    });
    setExpanded(prev => ({ ...prev, ...auto }));
  }, [lowerQ, zones.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleGH = (oid: string) => setExpanded(p => ({ ...p, [oid]: !p[oid] }));
  const expandAll = () => {
    const all: Record<string, boolean> = {};
    filteredGH.forEach(gh => { all[gh.oid] = true; });
    setExpanded(all);
  };

  // 2026-07-25：zone 行内联只读批次列表（plantings + seedlings 来自 API 聚合）
  const [expandedZonePlantings, setExpandedZonePlantings] = useState<Set<string>>(new Set());
  const toggleZonePlantings = (zoneOid: string) => {
    setExpandedZonePlantings(prev => {
      const next = new Set(prev);
      if (next.has(zoneOid)) next.delete(zoneOid);
      else next.add(zoneOid);
      return next;
    });
  };

  /**
   * 内联子组件：zone 行的「▼ 批次列表」展开区
   * 拉取 plantings + seedlings（通过 /api/basic-data/zones/:oid/plantings）
   */
  const ZonePlantingsList = ({ zoneOid, zoneName }: { zoneOid: string; zoneName: string }) => {
    const [items, setItems] = useState<Array<{
      kind: 'planting' | 'seedling';
      code: string;
      cropName: string;
      cropVariety: string;
      quantity: number;
      unit: string;
      date: string;
      status: string;
    }>>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      let cancelled = false;
      (async () => {
        try {
          const res: any = await enhancedApiClient.get(
            `/api/basic-data/zones/${encodeURIComponent(zoneOid)}/plantings`,
          );
          if (cancelled) return;
          const raw = res?.data || res || { plantings: [], seedlings: [] };
          const list: typeof items = [];
          (raw.plantings || []).forEach((p: any) => {
            list.push({
              kind: 'planting',
              code: p.plantingCode || p.planting_code || '-',
              cropName: p.cropName || p.crop_name || '-',
              cropVariety: p.cropVariety || p.crop_variety || '-',
              quantity: p.plantingQuantity ?? p.planting_quantity ?? 0,
              unit: p.unit || '株',
              date: (p.plantingDate || p.planting_date || '').slice(0, 10),
              status: p.status || '-',
            });
          });
          (raw.seedlings || []).forEach((s: any) => {
            list.push({
              kind: 'seedling',
              code: s.seedlingCode || s.seedling_code || '-',
              cropName: s.cropName || s.crop_name || '-',
              cropVariety: s.cropVariety || s.crop_variety || '-',
              quantity: s.seedlingQuantity ?? s.seedling_quantity ?? 0,
              unit: s.unit || '株',
              date: (s.seedlingDate || s.seedling_date || '').slice(0, 10),
              status: s.status || '-',
            });
          });
          setItems(list);
        } catch (e) {
          console.warn('[ZonePlantingsList] fetch failed', e);
          setItems([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [zoneOid]);

    if (loading) return <div className="px-12 py-4 text-sm text-gray-500">加载批次中…</div>;
    if (items.length === 0) {
      return <div className="px-12 py-4 text-sm text-gray-400">该区块「{zoneName}」暂无种植/育苗批次</div>;
    }
    return (
      <div className="bg-white">
        <div className="px-12 py-2 text-xs font-medium text-gray-600 bg-gray-100">
          共 {items.length} 个批次（{items.filter(i => i.kind === 'planting').length} 种植 / {items.filter(i => i.kind === 'seedling').length} 育苗）
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-600">类型</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">批次号</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">作物</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">品种</th>
              <th className="px-3 py-2 text-right font-medium text-gray-600">数量</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">日期</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">状态</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={`${it.kind}-${it.code}-${i}`} className="hover:bg-blue-50 border-t border-gray-200">
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    it.kind === 'planting' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {it.kind === 'planting' ? '种植' : '育苗'}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-gray-600">{it.code}</td>
                <td className="px-3 py-2 text-gray-800">{it.cropName}</td>
                <td className="px-3 py-2 text-gray-600">{it.cropVariety}</td>
                <td className="px-3 py-2 text-right">{it.quantity} {it.unit}</td>
                <td className="px-3 py-2 text-gray-600">{it.date || '-'}</td>
                <td className="px-3 py-2 text-gray-600">{it.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // === 温室 Modal handlers ===
  const openAddGHModal = () => {
    const currentBase = bases.find(b => b.oid === baseOid);
    setEditingGH(null);
    setGHFormData({ status: 'active', baseOid: baseOid, baseName: currentBase?.name || baseName, unit: '亩' });
    setShowGHModal(true);
  };
  const openEditGHModal = (gh: Greenhouse) => { setEditingGH(gh); setGHFormData({ ...gh }); setShowGHModal(true); };
  const saveGH = async () => {
    if (!ghFormData.name || !ghFormData.code) { await showAlert('请填写名称和编码'); return; }
    try {
      if (editingGH) await onEditGH(editingGH.id, ghFormData);
      else await onAddGH(ghFormData);
      setShowGHModal(false);
    } catch (err: any) {
      const d = err?.detail || err?.message || (typeof err === 'string' ? err : '未知错误');
      console.error('[GreenhouseWithZonesTab] GH save failed:', err);
      await showAlert(`保存失败：${d}`);
    }
  };
  const deleteGH = async () => {
    if (!deleteGHConfirm) return;
    try { await onRemoveGH(deleteGHConfirm.id); setDeleteGHConfirm(null); } catch (err: any) {
      const d = err?.detail || err?.message || (typeof err === 'string' ? err : '未知错误');
      await showAlert(`删除失败：${d}`);
    }
  };

  // === 区块 Modal handlers ===
  // openAddZoneModal(ghOid?) 预填当前所在种植区
  const openAddZoneModal = (ghOid?: string) => {
    setEditingZone(null);
    setZoneFormData({
      status: 'active',
      greenhouseOid: ghOid || filteredGH[0]?.oid || '',
    });
    setShowZoneModal(true);
  };
  const openEditZoneModal = (z: Zone) => { setEditingZone(z); setZoneFormData({ ...z }); setShowZoneModal(true); };
  const saveZone = async () => {
    if (!zoneFormData.zoneName) { await showAlert('请填写区块名称'); return; }
    try {
      if (editingZone) await onEditZone(editingZone.id, zoneFormData);
      else await onAddZone(zoneFormData);
      setShowZoneModal(false);
    } catch (err: any) {
      const d = err?.detail || err?.message || (typeof err === 'string' ? err : '未知错误');
      console.error('[GreenhouseWithZonesTab] Zone save failed:', err);
      await showAlert(`保存失败：${d}`);
    }
  };
  const deleteZone = async () => {
    if (!deleteZoneConfirm) return;
    try { await onRemoveZone(deleteZoneConfirm.oid); setDeleteZoneConfirm(null); } catch (err: any) {
      const d = err?.detail || err?.message || (typeof err === 'string' ? err : '未知错误');
      await showAlert(`删除失败：${d}`);
    }
  };

  // RENDER
  return (
    <div>
      {/* 顶部工具栏 */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="搜索种植区/区块（编码或名称）..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg" />
        </div>
        <Button size="sm" variant="secondary" onClick={expandAll} className="h-9">
          <ChevronDown className="w-4 h-4 mr-1" />展开全部
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setExpanded({})} className="h-9">
          <ChevronDown className="w-4 h-4 mr-1" />收起全部
        </Button>
        <Button size="sm" onClick={openAddGHModal}>
          <Plus className="w-4 h-4 mr-1" />新增种植区
        </Button>
      </div>

      {/* 种植区 + 嵌套区块 折叠列表 */}
      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-green-500" /></div> : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {filteredGH.length === 0 ? (
            <div className="px-3 py-12 text-center text-gray-400">
              <Building2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              暂无种植区。点击顶部"新增种植区"开始。
            </div>
          ) : (
            <div>
              {filteredGH.map((gh, idx) => {
                const isOpen = !!expanded[gh.oid];
                const childZones = zones.filter(z => z.greenhouseOid === gh.oid);
                return (
                  <div key={gh.oid} className={`${idx > 0 ? 'border-t border-gray-200' : ''}`}>
                    {/* 种植区折叠组头部（点击行切换展开） */}
                    <div
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition-colors ${
                        isOpen ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => toggleGH(gh.oid)}
                    >
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                      <span className="font-mono text-sm text-gray-500">{gh.code || '-'}</span>
                      <span className="font-medium text-gray-800">{gh.name}</span>
                      <span className="text-xs text-gray-500">
                        {facilityTypes.find(f => f.dictCode === gh.greenhouseType)?.dictLabel || gh.greenhouseType || ''}
                      </span>
                      <span className="text-xs text-gray-500">{gh.area || 0} {gh.unit || '亩'}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        gh.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {gh.status === 'active' ? '活跃' : '停用'}
                      </span>
                      <span className="ml-auto text-xs text-gray-500">
                        📍 {childZones.length} 个区块
                      </span>
                      {/* 阻止事件冒泡到 toggle */}
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        {/* 2026-07-25：操作列新增"新增区块"按钮（始终可见，不依赖展开状态） */}
                        <button onClick={() => openAddZoneModal(gh.oid)} className="p-1.5 hover:bg-green-50 text-green-600 rounded" title={`为「${gh.name}」新增区块`}>
                          <Plus className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEditGHModal(gh)} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded" title="编辑种植区">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteGHConfirm(gh)} className="p-1.5 hover:bg-red-50 text-red-500 rounded" title="删除种植区">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* 展开区域：嵌套显示该种植区下的区块列表 */}
                    {isOpen && (
                      <div className="bg-gray-50 border-t border-gray-200">
                        {childZones.length === 0 ? (
                          <div className="px-12 py-4 text-sm text-gray-400">
                            （该种植区暂无区块）
                          </div>
                        ) : (
                          <table className="w-full text-sm">
                            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium">编码</th>
                                <th className="px-3 py-2 text-left font-medium">名称</th>
                                <th className="px-3 py-2 text-left font-medium">类型</th>
                                <th className="px-3 py-2 text-right font-medium">面积(㎡)</th>
                                <th className="px-3 py-2 text-left font-medium">状态</th>
                                <th className="px-3 py-2 text-left font-medium">种植信息</th>
                                <th className="px-3 py-2 text-left font-medium">备注</th>
                                <th className="px-3 py-2 text-center font-medium">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {childZones.map(z => (
                                <Fragment key={z.oid}>
                                <tr className="hover:bg-blue-50 border-t border-gray-300">
                                  <td className="px-3 py-2 font-mono text-gray-600">{z.zoneCode || '-'}</td>
                                  <td className="px-3 py-2 font-medium text-gray-800">{z.zoneName}</td>
                                  <td className="px-3 py-2 text-gray-600">{zoneTypes.find(t => t.value === z.zoneType)?.label || z.zoneType || '-'}</td>
                                  <td className="px-3 py-2 text-right">{z.area || 0}</td>
                                  <td className="px-3 py-2">
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                                      z.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                      {z.status === 'active' ? '活跃' : '停用'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-gray-500 truncate max-w-[150px]" title={z.description || '-'}>{z.description || '-'}</td>
                                  {/* 2026-07-25：常驻「种植信息」列 — 显示该 zone 下的当前作物 + 已用面积 */}
                                  <td className="px-3 py-2 text-xs text-gray-700">
                                    {(() => {
                                      const agg = z.aggregatedPlantings;
                                      if (!agg || (agg.count === 0 && agg.seedlingCount === 0)) {
                                        return <span className="text-gray-400">— 暂无种植 —</span>;
                                      }
                                      return (
                                        <div className="flex flex-col gap-0.5">
                                          <span className="font-medium text-purple-700">
                                            🌱 {agg.currentCrop || '-'}
                                          </span>
                                          <span className="text-orange-600">
                                            已用 {agg.occupiedArea || 0} ㎡
                                            （{agg.count} 种植 / {agg.seedlingCount} 育苗）
                                          </span>
                                        </div>
                                      );
                                    })()}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <div className="flex justify-center gap-1">
                                      {/* 2026-07-25：行内联批次列表按钮（只读聚合） */}
                                      <button
                                        onClick={() => toggleZonePlantings(z.oid)}
                                        className="p-1 hover:bg-purple-50 text-purple-500 rounded"
                                        title="查看该区块下的种植/育苗批次"
                                      >
                                        <ListTree className={`w-3 h-3 transition-transform ${expandedZonePlantings.has(z.oid) ? 'rotate-90' : ''}`} />
                                      </button>
                                      <button onClick={() => openEditZoneModal(z)} className="p-1 hover:bg-blue-50 text-blue-500 rounded" title="编辑区块">
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button onClick={() => setDeleteZoneConfirm(z)} className="p-1 hover:bg-red-50 text-red-500 rounded" title="删除区块">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                                {/* 2026-07-25：展开批次列表（行折叠，只读） */}
                                {expandedZonePlantings.has(z.oid) && (
                                  <tr>
                                    <td colSpan={7} className="p-0 bg-white border-t border-gray-200">
                                      <ZonePlantingsList zoneOid={z.oid} zoneName={z.zoneName} />
                                    </td>
                                  </tr>
                                )}
                                </Fragment>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 温室新增/编辑 modal */}
      <Modal isOpen={showGHModal} onClose={() => setShowGHModal(false)} title={editingGH ? '编辑种植区' : '新增种植区'} size="xxl" enableDrag enableResize showFooter
        footer={<div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowGHModal(false)}><X className="w-4 h-4" /> 取消</Button>
          <Button size="sm" onClick={saveGH}><Save className="w-4 h-4" /> 保存</Button>
        </div>}>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs font-medium text-gray-600">编码<span className="text-red-500">*</span>
              <div className="flex gap-1 mt-1">
                <input value={ghFormData.code || ''} onChange={e => setGHFormData({ ...ghFormData, code: e.target.value })} disabled={!!editingGH} className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed" />
                {!editingGH && (
                  <button type="button" onClick={async () => {
                    if (!baseOid) { await showAlert('请先选择基地'); return; }
                    try {
                      const res = await fetch(`/api/code-generator/next-greenhouse-code?baseOid=${baseOid}`);
                      const json = await res.json();
                      if (json.success) setGHFormData({ ...ghFormData, code: json.data.code });
                      else await showAlert(json.error || '生成编码失败');
                    } catch { await showAlert('生成编码失败，请检查网络'); }
                  }} className="px-2 py-1.5 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200">生成</button>
                )}
              </div>
            </label>
            <label className="text-xs font-medium text-gray-600">名称<span className="text-red-500">*</span>
              <input value={ghFormData.name || ''} onChange={e => setGHFormData({ ...ghFormData, name: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
            </label>
            <label className="text-xs font-medium text-gray-600">类型
              <select value={ghFormData.greenhouseType || ''} onChange={e => setGHFormData({ ...ghFormData, greenhouseType: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
                <option value="">请选择</option>
                {facilityTypes.map(o => <option key={o.dictCode} value={o.dictCode}>{o.dictLabel}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">面积
              <input type="number" value={ghFormData.area || ''} onChange={e => setGHFormData({ ...ghFormData, area: Number(e.target.value) })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
            </label>
            <label className="text-xs font-medium text-gray-600">单位
              <select value={ghFormData.unit || '亩'} onChange={e => setGHFormData({ ...ghFormData, unit: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
                {areaUnits.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">种植类型
              <select value={ghFormData.crop || ''} onChange={e => setGHFormData({ ...ghFormData, crop: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
                <option value="">请选择</option>
                <option value="vegetable">蔬菜</option>
                <option value="grain">粮食</option>
                <option value="fruit">水果</option>
                <option value="other">其他</option>
              </select>
            </label>
          </div>
          <label className="text-xs font-medium text-gray-600">位置
            <input value={ghFormData.location || ''} onChange={e => setGHFormData({ ...ghFormData, location: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
          </label>
          <label className="text-xs font-medium text-gray-600">状态
            <select value={ghFormData.status || 'active'} onChange={e => setGHFormData({ ...ghFormData, status: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
              <option value="active">活跃</option><option value="inactive">停用</option>
            </select>
          </label>
          <label className="text-xs font-medium text-gray-600">备注
            <textarea value={ghFormData.description || ''} onChange={e => setGHFormData({ ...ghFormData, description: e.target.value })} rows={2} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded resize-none" />
          </label>
        </div>
      </Modal>

      <Modal isOpen={!!deleteGHConfirm} onClose={() => setDeleteGHConfirm(null)} title="确认删除种植区" size="sm" enableDrag enableResize showFooter
        footer={<div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => setDeleteGHConfirm(null)}><X className="w-4 h-4" /> 取消</Button>
          <Button size="sm" variant="destructive" onClick={deleteGH}><Trash2 className="w-4 h-4" /> 删除</Button>
        </div>}>
        <p className="text-sm text-gray-600">
          确定删除「{deleteGHConfirm?.name}」？
          {deleteGHConfirm && zones.filter(z => z.greenhouseOid === deleteGHConfirm.oid).length > 0 && (
            <span className="block mt-2 text-amber-600 text-xs">
              ⚠ 该种植区有 {zones.filter(z => z.greenhouseOid === deleteGHConfirm.oid).length} 个区块，建议先删除区块后再删除种植区。
            </span>
          )}
        </p>
      </Modal>

      {/* 区块新增/编辑 modal */}
      <Modal isOpen={showZoneModal} onClose={() => setShowZoneModal(false)} title={editingZone ? '编辑区块' : '新增区块'} size="xxl" enableDrag enableResize showFooter
        footer={<div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowZoneModal(false)}><X className="w-4 h-4" /> 取消</Button>
          <Button size="sm" onClick={saveZone}><Save className="w-4 h-4" /> 保存</Button>
        </div>}>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs font-medium text-gray-600">编码
              <div className="flex gap-1 mt-1">
                <input value={zoneFormData.zoneCode || ''} onChange={e => setZoneFormData({ ...zoneFormData, zoneCode: e.target.value })} disabled={!!editingZone} className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed" />
                {!editingZone && (
                  <button type="button" disabled={!zoneFormData.greenhouseOid} onClick={async () => {
                    if (!zoneFormData.greenhouseOid) { await showAlert('请先选择所属种植区'); return; }
                    try {
                      const res = await fetch(`/api/code-generator/next-zone-code?greenhouseOid=${zoneFormData.greenhouseOid}`);
                      const json = await res.json();
                      if (json.success) setZoneFormData({ ...zoneFormData, zoneCode: json.data.code });
                      else await showAlert(json.error || '生成编码失败');
                    } catch { await showAlert('生成编码失败，请检查网络'); }
                  }} className="px-2 py-1.5 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed">生成</button>
                )}
              </div>
            </label>
            <label className="text-xs font-medium text-gray-600">名称<span className="text-red-500">*</span>
              <input value={zoneFormData.zoneName || ''} onChange={e => setZoneFormData({ ...zoneFormData, zoneName: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
            </label>
            <label className="text-xs font-medium text-gray-600">所属种植区<span className="text-red-500">*</span>
              <select value={zoneFormData.greenhouseOid || ''} onChange={e => setZoneFormData({ ...zoneFormData, greenhouseOid: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" disabled={!!editingZone}>
                <option value="">请选择</option>
                {filteredGH.map(g => <option key={g.oid} value={g.oid}>{g.code} {g.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">区域类型
              <select value={zoneFormData.zoneType || ''} onChange={e => setZoneFormData({ ...zoneFormData, zoneType: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
                <option value="">请选择</option>
                {zoneTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">面积(㎡)
              <input type="number" value={zoneFormData.area || ''} onChange={e => setZoneFormData({ ...zoneFormData, area: Number(e.target.value) })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
            </label>
            <label className="text-xs font-medium text-gray-600">状态
              <select value={zoneFormData.status || 'active'} onChange={e => setZoneFormData({ ...zoneFormData, status: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
                <option value="active">活跃</option><option value="inactive">停用</option>
              </select>
            </label>
          </div>
          <label className="text-xs font-medium text-gray-600">备注
            <input value={zoneFormData.description || ''} onChange={e => setZoneFormData({ ...zoneFormData, description: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
          </label>
        </div>
      </Modal>

      <Modal isOpen={!!deleteZoneConfirm} onClose={() => setDeleteZoneConfirm(null)} title="确认删除区块" size="sm" enableDrag enableResize showFooter
        footer={<div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => setDeleteZoneConfirm(null)}><X className="w-4 h-4" /> 取消</Button>
          <Button size="sm" variant="destructive" onClick={deleteZone}><Trash2 className="w-4 h-4" /> 删除</Button>
        </div>}>
        <p className="text-sm text-gray-600">确定删除「{deleteZoneConfirm?.zoneName}」？</p>
      </Modal>
    </div>
  );
}

/* ==================== 种植记录子组件（列表模式 Tab 3） ==================== */
export function PlantingTab({
  records, greenhouses, zones, loading, onAdd, onEdit, onEnd, onRemove, searchTerm, setSearchTerm
}: {
  records: PlantingRecord[];
  greenhouses: Greenhouse[];
  zones: Zone[];
  loading: boolean;
  onAdd: any;
  onEdit: any;
  onEnd: any;
  onRemove: any;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<PlantingRecord | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<PlantingRecord | null>(null);
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const { loadDictionaries } = useDictionaryStore();
  const statusOptions = getDictItems('planting_season_status');

  const filtered = records.filter(r => {
    const matchSearch = !searchTerm || (r.seasonCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.cropName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchActive = !showOnlyActive || r.status === 'planting';
    return matchSearch && matchActive;
  });
  const totalPages = Math.ceil(filtered.length / LIST_PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * LIST_PAGE_SIZE, currentPage * LIST_PAGE_SIZE);

  const selectedFacilityZones = zones.filter(z => z.greenhouseOid === formData.facility_oid);

  const handleAdd = () => {
    setCurrentRecord(null);
    setFormData({ status: 'planting', start_date: new Date().toISOString().slice(0, 10), zone_oid: '', facility_oid: '', crop_name: '', variety_name: '' });
    setShowCreateModal(true);
  };
  const handleEdit = (r: PlantingRecord) => {
    setCurrentRecord(r);
    setFormData({
      crop_name: r.cropName,
      variety_name: r.varietyName,
      start_date: r.startDate?.slice(0, 10),
      notes: r.notes || '',
      zone_oid: r.zoneOid || '',
      facility_oid: r.facilityOid || ''
    });
    setShowEditModal(true);
  };
  const handleEnd = (r: PlantingRecord) => { setCurrentRecord(r); setFormData({ end_date: new Date().toISOString().slice(0, 10), yield_amount: '', yield_unit: 'kg', quality_grade: '', notes: '' }); setShowEndModal(true); };
  const handleSaveAdd = async () => {
    if (!formData.facility_oid || !formData.zone_oid || !formData.crop_name) { await showAlert('请选择种植区、区域和填写作物'); return; }
    try {
      await onAdd({
        facility_oid: formData.facility_oid,
        zone_oid: formData.zone_oid,
        crop_name: formData.crop_name,
        variety_name: formData.variety_name || '',
        start_date: formData.start_date,
        notes: formData.notes || ''
      });
      setShowCreateModal(false);
    } catch (err: any) {
      const detail = err?.detail || err?.message || (typeof err === 'string' ? err : '未知错误');
      console.error('[PlantingTab] add failed:', err);
      await showAlert(`创建失败：${detail}`);
    }
  };
  const handleSaveEdit = async () => {
    if (!currentRecord) return;
    try { await onEdit(currentRecord.oid, formData); setShowEditModal(false); } catch (err: any) {
      const detail = err?.detail || err?.message || (typeof err === 'string' ? err : '未知错误');
      await showAlert(`更新失败：${detail}`);
    }
  };
  const handleSaveEnd = async () => {
    if (!currentRecord || !formData.end_date) { await showAlert('请填写结束日期'); return; }
    try { await onEnd(currentRecord.oid, { end_date: formData.end_date, yield_amount: Number(formData.yield_amount) || 0, yield_unit: formData.yield_unit, quality_grade: formData.quality_grade, notes: formData.notes }); setShowEndModal(false); } catch (err: any) {
      const detail = err?.detail || err?.message || (typeof err === 'string' ? err : '未知错误');
      await showAlert(`结束失败：${detail}`);
    }
  };
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try { await onRemove(deleteConfirm.oid); setDeleteConfirm(null); } catch (err: any) {
      const detail = err?.detail || err?.message || (typeof err === 'string' ? err : '未知错误');
      await showAlert(`删除失败：${detail}`);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="搜索..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg" />
        </div>
        <button onClick={() => setShowOnlyActive(!showOnlyActive)} className={`px-3 py-1.5 text-sm rounded-lg border ${showOnlyActive ? 'bg-green-50 border-green-300 text-green-600' : 'border-gray-400'}`}>
          {showOnlyActive ? '种植中' : '全部'}
        </button>
        <Button size="sm" onClick={handleAdd}><Plus className="w-4 h-4 mr-1" />新增种植季</Button>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-green-500" /></div> : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full table-fixed">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/10">编码</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/10">种植区</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/10">区域</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/10">作物</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/10">开始</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/10">结束</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/10">状态</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/10">产量</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/10">备注</th>
                <th className="px-2 py-3 text-center text-sm font-semibold w-1/10">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {paginated.length === 0 ? (
                <tr><td colSpan={10} className="px-3 py-12 text-center text-gray-400"><Leaf className="w-8 h-8 mx-auto mb-2 text-gray-300" />暂无种植记录</td></tr>
              ) : paginated.map(r => (
                <tr key={r.oid} className="hover:bg-green-50">
                  <td className="px-2 py-3 text-sm text-center font-mono font-semibold text-green-600 truncate">{r.seasonCode}</td>
                  <td className="px-2 py-3 text-sm text-center truncate">{greenhouses.find(g => g.oid === r.facilityOid)?.name || '-'}</td>
                  <td className="px-2 py-3 text-sm text-center truncate">{zones.find(z => z.oid === r.zoneOid)?.zoneName || '-'}</td>
                  <td className="px-2 py-3 text-sm text-center truncate">{r.cropName}{r.varietyName ? ` · ${r.varietyName}` : ''}</td>
                  <td className="px-2 py-3 text-sm text-center">{r.startDate?.slice(0, 10) || '-'}</td>
                  <td className="px-2 py-3 text-sm text-center">{r.endDate?.slice(0, 10) || '-'}</td>
                  <td className="px-2 py-3 text-center">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${r.status === 'planting' ? 'bg-blue-100 text-blue-700' : r.status === 'harvested' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {statusOptions.find(s => s.dictCode === r.status)?.dictLabel || r.status}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-sm text-center">{r.yieldAmount ?? '-'}</td>
                  <td className="px-2 py-3 text-sm text-center truncate" title={r.notes || '-'}>{r.notes || '-'}</td>
                  <td className="px-2 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      {r.status === 'planting' && <button onClick={() => handleEnd(r)} className="p-1.5 hover:bg-green-50 text-green-500 rounded" title="结束"><CalendarCheck className="w-4 h-4" /></button>}
                      <button onClick={() => handleEdit(r)} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteConfirm(r)} className="p-1.5 hover:bg-red-50 text-red-500 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && <div className="flex justify-between mt-3 px-4">
        <div className="text-sm text-gray-500">共 {filtered.length} 条</div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} pageSize={LIST_PAGE_SIZE}
          onPageSizeChange={() => {}} pageSizeOptions={[10, 20, 50]} showPageSize={false} />
      </div>}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="新增种植季" size="xxl" enableDrag enableResize showFooter
        footer={<div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowCreateModal(false)}><X className="w-4 h-4" /> 取消</Button>
          <Button size="sm" onClick={handleSaveAdd}><Plus className="w-4 h-4" /> 创建</Button>
        </div>}>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs font-medium text-gray-600">种植区<span className="text-red-500">*</span>
              <select value={formData.facility_oid || ''} onChange={e => setFormData({ ...formData, facility_oid: e.target.value, zone_oid: '' })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
                <option value="">请选择</option>
                {greenhouses.map(g => <option key={g.oid} value={g.oid}>{g.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">区域<span className="text-red-500">*</span>
              <select value={formData.zone_oid || ''} onChange={e => setFormData({ ...formData, zone_oid: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
                <option value="">请选择</option>
                {selectedFacilityZones.map(z => <option key={z.oid} value={z.oid}>{z.zoneName}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">作物名称<span className="text-red-500">*</span>
              <input value={formData.crop_name || ''} onChange={e => setFormData({ ...formData, crop_name: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
            </label>
            <label className="text-xs font-medium text-gray-600">品种
              <input value={formData.variety_name || ''} onChange={e => setFormData({ ...formData, variety_name: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
            </label>
            <label className="text-xs font-medium text-gray-600">开始日期
              <input type="date" value={formData.start_date || ''} onChange={e => setFormData({ ...formData, start_date: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
            </label>
            <label className="text-xs font-medium text-gray-600">编码预览
              <div className="flex gap-1 mt-1">
                <input value={formData.season_code || ''} readOnly className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded bg-gray-50" placeholder="选择种植区后点击生成" />
                <button type="button" disabled={!formData.facility_oid} onClick={async () => {
                  if (!formData.facility_oid) { await showAlert('请先选择种植区'); return; }
                  try {
                    const year = formData.start_date ? formData.start_date.slice(0, 4) : new Date().getFullYear();
                    const res = await fetch(`/api/code-generator/next-season-code?facilityOid=${formData.facility_oid}&year=${year}`);
                    const json = await res.json();
                    if (json.success) setFormData({ ...formData, season_code: json.data.code });
                    else await showAlert(json.error || '生成编码失败');
                  } catch { await showAlert('生成编码失败'); }
                }} className="px-2 py-1.5 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed">生成</button>
              </div>
            </label>
          </div>
          <label className="text-xs font-medium text-gray-600">备注
            <textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded resize-none" />
          </label>
        </div>
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="编辑种植记录" size="xxl" enableDrag enableResize showFooter
        footer={<div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowEditModal(false)}><X className="w-4 h-4" /> 取消</Button>
          <Button size="sm" onClick={handleSaveEdit}><Save className="w-4 h-4" /> 保存</Button>
        </div>}>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs font-medium text-gray-600">种植区
              <input value={greenhouses.find(g => g.oid === formData.facility_oid)?.name || '-'} readOnly className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded bg-gray-50" />
            </label>
            <label className="text-xs font-medium text-gray-600">区域
              <input value={zones.find(z => z.oid === formData.zone_oid)?.zoneName || '-'} readOnly className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded bg-gray-50" />
            </label>
            <label className="text-xs font-medium text-gray-600">作物名称
              <input value={formData.crop_name || ''} onChange={e => setFormData({ ...formData, crop_name: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
            </label>
            <label className="text-xs font-medium text-gray-600">品种
              <input value={formData.variety_name || ''} onChange={e => setFormData({ ...formData, variety_name: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
            </label>
            <label className="text-xs font-medium text-gray-600">开始日期
              <input type="date" value={formData.start_date || ''} onChange={e => setFormData({ ...formData, start_date: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
            </label>
          </div>
          <label className="text-xs font-medium text-gray-600">备注
            <textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded resize-none" />
          </label>
        </div>
      </Modal>

      <Modal isOpen={showEndModal} onClose={() => setShowEndModal(false)} title="结束种植季" size="xxl" enableDrag enableResize showFooter
        footer={<div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowEndModal(false)}><X className="w-4 h-4" /> 取消</Button>
          <Button size="sm" onClick={handleSaveEnd}><Check className="w-4 h-4" /> 确认结束</Button>
        </div>}>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">结束「<span className="font-semibold text-green-600">{currentRecord?.seasonCode}</span>」</p>
          <label className="text-xs font-medium text-gray-600">结束日期<span className="text-red-500">*</span>
            <input type="date" value={formData.end_date || ''} onChange={e => setFormData({ ...formData, end_date: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs font-medium text-gray-600">产量
              <input type="number" value={formData.yield_amount || ''} onChange={e => setFormData({ ...formData, yield_amount: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded" />
            </label>
            <label className="text-xs font-medium text-gray-600">单位
              <select value={formData.yield_unit || 'kg'} onChange={e => setFormData({ ...formData, yield_unit: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
                <option value="kg">千克</option>
                <option value="ton">吨</option>
                <option value="jin">斤</option>
              </select>
            </label>
          </div>
          <label className="text-xs font-medium text-gray-600">品质
            <select value={formData.quality_grade || ''} onChange={e => setFormData({ ...formData, quality_grade: e.target.value })} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded">
              <option value="">请选择</option>
              <option value="A">A级</option>
              <option value="B">B级</option>
              <option value="C">C级</option>
            </select>
          </label>
          <label className="text-xs font-medium text-gray-600">备注
            <textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded resize-none" />
          </label>
        </div>
      </Modal>

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="确认删除" size="sm" enableDrag enableResize showFooter
        footer={<div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => setDeleteConfirm(null)}><X className="w-4 h-4" /> 取消</Button>
          <Button size="sm" variant="destructive" onClick={handleDelete}><Trash2 className="w-4 h-4" /> 删除</Button>
        </div>}>
        <p className="text-sm text-gray-600">确定删除「{deleteConfirm?.seasonCode}」？</p>
      </Modal>
    </div>
  );
}
