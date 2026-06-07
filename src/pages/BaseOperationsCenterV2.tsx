/**
 * 基地运营中心 V2 页面
 * 树状布局：左侧基地树 + 右侧数据表格和统计卡片
 * 路由：/base-operations-v2
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Edit2, Trash2, Building2, Loader2, List, Network } from 'lucide-react';
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
} from '@/components/ui';
import { useBaseOperationsStore } from '@/stores/useBaseOperationsStore';
import { useBaseStore } from '@/stores/useBaseStore';
import { useGreenhouseStore } from '@/stores/useGreenhouseStore';
import { useZoneStore } from '@/stores/useZoneStore';
import { useBlockStore } from '@/stores/useBlockStore';
import { usePlantingRecordStore } from '@/stores/usePlantingRecordStore';
import { useDictionaryStore, getDictItems } from '@/stores/useDictionaryStore';
import { showAlert, showToast } from '@/lib/dialogService';
import { FacilityTab, ZoneTab, PlantingTab } from './BaseOperationsCenter';

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
): TreeNode[] {
  const query = searchQuery.toLowerCase();

  // 如果有当前基地OID，只显示该基地的数据
  if (currentBaseOid) {
    const currentBase = bases.find(b => b.oid === currentBaseOid);
    if (!currentBase) return [];

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

// ============================================
// 主组件
// ============================================
export default function BaseOperationsCenterV2() {
  // URL 参数获取当前基地 OID
  const [searchParams] = useSearchParams();
  const baseOidFromUrl = searchParams.get('baseOid') || '';

  // 视图模式状态：'tree' 树状视图，'list' 列表视图
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  // 列表视图中的 Tab 状态：'facility' 设施，'zone' 区块，'planting' 种植记录
  const [listTab, setListTab] = useState<'facility' | 'zone' | 'planting'>('facility');

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
  const handleAdd = () => {
    setModalType('add');
    setEditingItem(null);
    // 根据选中节点类型初始化表单数据
    if (selectedNode.type === 'base') {
      // 新增温室
      setFormData({ status: 'active', baseOid: selectedNode.oid });
    } else if (selectedNode.type === 'greenhouse') {
      // 新增区域
      setFormData({ status: 'active', greenhouseOid: selectedNode.oid });
    } else if (selectedNode.type === 'zone') {
      // 新增地块
      setFormData({ status: 'active', zoneOid: selectedNode.oid });
    } else if (selectedNode.type === 'block') {
      // 新增种植记录
      setFormData({ status: 'active', blockOid: selectedNode.oid });
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
  };

  // 处理表单字段变化
  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 提交表单（新增或编辑）
  const handleSubmit = async () => {
    try {
      // 验证必填字段
      if (!formData.code && !formData.zoneCode && !formData.blockCode) {
        showToast('请填写编码', 'error');
        return;
      }
      if (!formData.name && !formData.zoneName && !formData.blockName) {
        showToast('请填写名称', 'error');
        return;
      }

      // 区域新增/编辑时的面积验证
      if ((selectedNode.type === 'greenhouse' && modalType === 'add') ||
          (selectedNode.type === 'zone' && modalType === 'edit')) {
        const ghOid = selectedNode.type === 'greenhouse' && modalType === 'add'
          ? selectedNode.oid
          : formData.greenhouseOid;
        const greenhouse = greenhouses.find(gh => gh.oid === ghOid);
        if (greenhouse) {
          // 计算已分配的区块面积
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
        if (selectedNode.type === 'base') {
          // 新增温室
          await useGreenhouseStore.getState().addGreenhouse({
            ...formData,
            baseOid: selectedNode.oid,
          });
          showToast('温室新增成功', 'success');
        } else if (selectedNode.type === 'greenhouse') {
          // 新增区域
          await useZoneStore.getState().addZone({
            ...formData,
            greenhouseOid: selectedNode.oid,
          });
          showToast('区域新增成功', 'success');
        } else if (selectedNode.type === 'zone') {
          // 新增地块
          await useBlockStore.getState().addBlock({
            ...formData,
            zoneOid: selectedNode.oid,
          });
          showToast('地块新增成功', 'success');
        } else if (selectedNode.type === 'block') {
          // 新增种植记录
          await usePlantingRecordStore.getState().addRecord({
            ...formData,
            blockOid: selectedNode.oid,
          });
          showToast('种植记录新增成功', 'success');
        }
      } else if (modalType === 'edit' && editingItem) {
        // 编辑
        if (editingItem.type === 'greenhouse') {
          await useGreenhouseStore.getState().editGreenhouse(editingItem.oid, formData);
          showToast('温室编辑成功', 'success');
        } else if (editingItem.type === 'zone') {
          await useZoneStore.getState().editZone(editingItem.oid, formData);
          showToast('区域编辑成功', 'success');
        } else if (editingItem.type === 'block') {
          await useBlockStore.getState().editBlock(editingItem.oid, formData);
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
  const handleDelete = async (oid: string) => {
    const confirmed = await showAlert('确定要删除吗？删除后无法恢复。', '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
    if (!confirmed) return;

    try {
      if (selectedNode.type === 'greenhouse') {
        await useGreenhouseStore.getState().removeGreenhouse(oid);
        showToast('温室删除成功', 'success');
      } else if (selectedNode.type === 'zone') {
        await useZoneStore.getState().removeZone(oid);
        showToast('区域删除成功', 'success');
      } else if (selectedNode.type === 'block') {
        await useBlockStore.getState().removeBlock(oid);
        showToast('地块删除成功', 'success');
      }
      loadAllData();
    } catch (error) {
      showToast('删除失败', 'error');
    }
  };

  // 使用 buildTreeData 函数构建本地树形数据
  const treeData = useMemo(() => {
    return buildTreeData(bases, greenhouses, zones, blocks, baseOidFromUrl, searchTerm);
  }, [bases, greenhouses, zones, searchTerm]);

  // 按基地过滤后的数据（用于列表视图）
  const filteredGreenhouses = useMemo(() => {
    return greenhouses.filter(g => !baseOidFromUrl || g.baseOid === baseOidFromUrl);
  }, [greenhouses, baseOidFromUrl]);

  const filteredZones = useMemo(() => {
    if (!baseOidFromUrl) return zones;
    const baseGhOids = new Set(filteredGreenhouses.map(g => g.oid));
    return zones.filter(z => baseGhOids.has(z.greenhouseOid));
  }, [zones, filteredGreenhouses, baseOidFromUrl]);

  const filteredRecords = useMemo(() => {
    if (!baseOidFromUrl) return records;
    const baseGhOids = new Set(filteredGreenhouses.map(g => g.oid));
    return records.filter(r => baseGhOids.has(r.facilityOid));
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
  const stats = useMemo(() => {
    if (!selectedNode.oid) {
      return { totalArea: 0, zoneCount: 0, plantingCount: 0, currentCrop: '-' };
    }

    switch (selectedNode.type) {
      case 'base': {
        const baseGreenhouses = greenhouses.filter(gh => gh.baseOid === selectedNode.oid);
        const baseZoneOids = new Set(zones.filter(z => baseGreenhouses.some(gh => gh.oid === z.greenhouseOid)).map(z => z.oid));
        const baseRecords = records.filter(r => {
          const block = blocks.find(b => b.oid === r.blockOid);
          return block && baseZoneOids.has(block.zoneOid);
        });
        const plantingRecords = baseRecords.filter(r => r.status === 'planting');

        return {
          totalArea: baseGreenhouses.reduce((sum, gh) => sum + (gh.area || 0), 0),
          zoneCount: baseZoneOids.size,
          plantingCount: plantingRecords.length,
          currentCrop: plantingRecords[0]?.cropName || '-',
        };
      }
      case 'greenhouse': {
        const ghZoneOids = new Set(zones.filter(z => z.greenhouseOid === selectedNode.oid).map(z => z.oid));
        const ghRecords = records.filter(r => {
          const block = blocks.find(b => b.oid === r.blockOid);
          return block && ghZoneOids.has(block.zoneOid);
        });
        const plantingRecords = ghRecords.filter(r => r.status === 'planting');

        return {
          totalArea: greenhouses.find(gh => gh.oid === selectedNode.oid)?.area || 0,
          zoneCount: ghZoneOids.size,
          plantingCount: plantingRecords.length,
          currentCrop: plantingRecords[0]?.cropName || '-',
        };
      }
      case 'zone': {
        const zoneRecords = records.filter(r => {
          const block = blocks.find(b => b.oid === r.blockOid);
          return block?.zoneOid === selectedNode.oid;
        });
        const plantingRecords = zoneRecords.filter(r => r.status === 'planting');

        return {
          totalArea: zones.find(z => z.oid === selectedNode.oid)?.area || 0,
          zoneCount: 1,
          plantingCount: plantingRecords.length,
          currentCrop: plantingRecords[0]?.cropName || '-',
        };
      }
    }
  }, [selectedNode, greenhouses, zones, records]);

  // 根据选中节点类型获取表格列
  const tableColumns = useMemo(() => {
    switch (selectedNode.type) {
      case 'greenhouse':
        return GREENHOUSE_COLUMNS;
      case 'zone':
        return ZONE_COLUMNS;
      case 'block':
        return PLANTING_RECORD_COLUMNS;
      default:
        return BASE_COLUMNS;
    }
  }, [selectedNode.type]);

  // 处理节点选择
  const handleNodeSelect = (key: string) => {
    // key 格式: "base_xxx" | "gh_xxx" | "zone_xxx" | "block_xxx"
    const [type, oid] = key.split('_')
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

  return (
    <div className="h-full flex flex-col">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-4 shadow-none mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">基地运营中心</h1>
              <p className="text-sm text-gray-500">
                {viewMode === 'tree' && baseOidFromUrl
                  ? `当前基地：${currentBaseName}`
                  : viewMode === 'tree' && selectedNode.name
                  ? `当前选择：${selectedNode.name}`
                  : viewMode === 'tree'
                  ? '请从左侧树形结构中选择节点'
                  : '列表视图'}
              </p>
            </div>
          </div>
          {/* 视图切换按钮 */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4" />
              列表
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'tree'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Network className="w-4 h-4" />
              树状
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区：根据视图模式显示不同内容 */}
      {viewMode === 'tree' ? (
      /* 树状视图：左侧树 + 右侧内容 */
      <div className="flex-1 flex gap-4 min-h-0">
        {/* 左侧树形结构 */}
        <div className="w-80 flex-shrink-0 bg-white rounded-xl shadow-none flex flex-col">
          {/* 搜索框 */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="搜索基地/温室/区域..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          {/* 树形组件 */}
          <div className="flex-1 overflow-auto p-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <Tree
                data={treeData}
                selectable
                selectedKeys={selectedNode.oid ? [`${selectedNode.type === 'greenhouse' ? 'gh' : selectedNode.type === 'zone' ? 'zone' : selectedNode.type === 'block' ? 'block' : 'base'}_${selectedNode.oid}`] : []}
                expandedKeys={expandedKeys}
                onSelect={(keys) => {
                  if (keys.length > 0) {
                    handleNodeSelect(keys[0])
                  }
                }}
                onExpand={setExpandedKeys}
              />
            )}
          </div>
        </div>

        {/* 右侧内容区 */}
        <div className="flex-1 flex flex-col min-h-0 gap-4">
          {/* 统计卡片 */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalArea}</div>
                <div className="text-sm text-gray-600">总面积(㎡)</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.zoneCount}</div>
                <div className="text-sm text-gray-600">区块数</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
              <CardContent className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.plantingCount}</div>
                <div className="text-sm text-gray-600">种植中</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="text-center">
                <div className="text-lg font-bold text-purple-600 truncate">{stats.currentCrop}</div>
                <div className="text-sm text-gray-600">当前作物</div>
              </CardContent>
            </Card>
          </div>

          {/* 数据表格 */}
          <div className="flex-1 bg-white rounded-xl shadow-none overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {tableColumns.map((col) => (
                    <TableHead key={col.key} className={`${col.width || ''} text-center`.trim()}>
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={tableColumns.length} className="text-center py-8 text-gray-500">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  tableData.map((row) => (
                    <TableRow key={row.oid}>
                      {tableColumns.map((col) => (
                        <TableCell key={col.key} className={`${col.width || ''} text-center`.trim()}>
                          {col.key === 'action' ? (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(row)}
                                className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(row.oid)}
                                className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : col.key === 'status' ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                row.status === 'active'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {row.status === 'active' ? '启用' : '停用'}
                            </span>
                          ) : col.key === 'code' || col.key === 'name' || col.key === 'zoneCode' || col.key === 'zoneName' || col.key === 'blockCode' || col.key === 'blockName' ? (
                            highlightText((row as Record<string, unknown>)[col.key]?.toString() || '-', searchTerm)
                          ) : (
                            (row as Record<string, unknown>)[col.key]?.toString() || '-'
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 底部操作按钮 */}
          <div className="flex items-center justify-start gap-3 bg-white rounded-xl p-4 shadow-none">
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-1" />
              {getAddButtonText()}
            </Button>
          </div>
        </div>
      </div>
      ) : (
      /* 列表视图：使用旧版三个 Tab 组件 */
      <div className="flex-1 bg-white rounded-xl shadow-none flex flex-col">
        {/* Tab 切换 */}
        <div className="border-b border-gray-200 rounded-t-xl">
          <nav className="flex gap-0">
            <button
              onClick={() => setListTab('facility')}
              className={`px-6 py-3 text-base font-bold border-b-2 transition-all duration-200 rounded-t-md ${
                listTab === 'facility'
                  ? 'border-green-600 text-green-700 bg-green-50 shadow-sm'
                  : 'border-transparent text-gray-500 hover:text-green-600 hover:bg-green-50/50'
              }`}
            >
              种植区管理
            </button>
            <button
              onClick={() => setListTab('zone')}
              className={`px-6 py-3 text-base font-bold border-b-2 transition-all duration-200 rounded-t-md ${
                listTab === 'zone'
                  ? 'border-green-600 text-green-700 bg-green-50 shadow-sm'
                  : 'border-transparent text-gray-500 hover:text-green-600 hover:bg-green-50/50'
              }`}
            >
              区块划分
            </button>
            <button
              onClick={() => setListTab('planting')}
              className={`px-6 py-3 text-base font-bold border-b-2 transition-all duration-200 rounded-t-md ${
                listTab === 'planting'
                  ? 'border-green-600 text-green-700 bg-green-50 shadow-sm'
                  : 'border-transparent text-gray-500 hover:text-green-600 hover:bg-green-50/50'
              }`}
            >
              种植记录
            </button>
          </nav>
        </div>

        {/* Tab 内容区域 */}
        <div className="flex-1 p-4 overflow-auto">
          {listTab === 'facility' && (
            <FacilityTab
              greenhouses={filteredGreenhouses}
              bases={bases}
              baseOid={baseOidFromUrl}
              baseName={bases.find(b => b.oid === baseOidFromUrl)?.name || ''}
              loading={loading}
              onAdd={async (data) => {
                await useGreenhouseStore.getState().addGreenhouse(data);
                loadAllData(); // 刷新 useBaseOperationsStore
              }}
              onEdit={async (id, data) => {
                await useGreenhouseStore.getState().editGreenhouse(id, data);
                loadAllData();
              }}
              onRemove={async (id) => {
                await useGreenhouseStore.getState().removeGreenhouse(id);
                loadAllData();
              }}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
          )}
          {listTab === 'zone' && (
            <ZoneTab
              zones={filteredZones}
              greenhouses={filteredGreenhouses}
              loading={loading}
              onAdd={async (data) => {
                await useZoneStore.getState().addZone(data);
                loadAllData();
              }}
              onEdit={async (id, data) => {
                await useZoneStore.getState().editZone(id, data);
                loadAllData();
              }}
              onRemove={async (id) => {
                await useZoneStore.getState().removeZone(id);
                loadAllData();
              }}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
          )}
          {listTab === 'planting' && (
            <PlantingTab
              records={filteredRecords}
              greenhouses={filteredGreenhouses}
              zones={filteredZones}
              loading={loading}
              onAdd={async (data) => {
                await usePlantingRecordStore.getState().addRecord(data);
                loadRecords();
              }}
              onEdit={async (id, data) => {
                await usePlantingRecordStore.getState().editRecord(id, data);
                loadRecords();
              }}
              onEnd={async (id, data) => {
                await usePlantingRecordStore.getState().endSeason(id, data);
                loadRecords();
              }}
              onRemove={async (id) => {
                await usePlantingRecordStore.getState().removeRecord(id);
                loadRecords();
              }}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
          )}
        </div>
      </div>
      )}

      {/* 新增/编辑弹窗 */}
      <Modal
        isOpen={!!modalType}
        onClose={handleCloseModal}
        title={modalType === 'add' ? `新增${getAddButtonText().replace('新增', '')}` : `编辑${getAddButtonText().replace('新增', '')}`}
        onSubmit={handleSubmit}
        size="md"
      >
        <div className="space-y-4">
          {/* 温室表单：新增温室或编辑温室 */}
          {(selectedNode.type === 'greenhouse' && modalType === 'edit') || (selectedNode.type === 'base' && modalType === 'add') && (
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

          {/* 区域表单：新增区域或编辑区域 */}
          {(selectedNode.type === 'zone' && modalType === 'edit') || (selectedNode.type === 'greenhouse' && modalType === 'add') && (
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
                  <Input
                    value={formData.zoneType || ''}
                    onChange={(e) => handleFormChange('zoneType', e.target.value)}
                    placeholder="请输入区域类型"
                  />
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

          {/* 地块表单：新增地块或编辑地块 */}
          {(selectedNode.type === 'block' && modalType === 'edit') || (selectedNode.type === 'zone' && modalType === 'add') && (
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
                  <Input
                    value={formData.blockType || ''}
                    onChange={(e) => handleFormChange('blockType', e.target.value)}
                    placeholder="请输入地块类型"
                  />
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

          {/* 种植记录表单：新增种植记录 */}
          {selectedNode.type === 'block' && modalType === 'add' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">作物名称</label>
                  <Input
                    value={formData.cropName || ''}
                    onChange={(e) => handleFormChange('cropName', e.target.value)}
                    placeholder="请输入作物名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">品种</label>
                  <Input
                    value={formData.varietyName || ''}
                    onChange={(e) => handleFormChange('varietyName', e.target.value)}
                    placeholder="请输入品种"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
                  <Input
                    type="date"
                    value={formData.startDate || ''}
                    onChange={(e) => handleFormChange('startDate', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                  <Select
                    value={formData.status || 'planting'}
                    onValueChange={(value) => handleFormChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planting">种植中</SelectItem>
                      <SelectItem value="harvested">已收获</SelectItem>
                      <SelectItem value="cancelled">已取消</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <Input
                  value={formData.notes || ''}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  placeholder="请输入备注"
                />
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
