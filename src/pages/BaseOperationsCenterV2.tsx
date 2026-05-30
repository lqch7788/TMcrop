/**
 * 基地运营中心 V2 页面
 * 树状布局：左侧基地树 + 右侧数据表格和统计卡片
 * 路由：/base-operations-v2
 */
import { useEffect, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, Building2, Loader2 } from 'lucide-react';
import { Tree } from '@/components/ui/Tree';
import type { TreeNode } from '@/components/ui/Tree';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { useBaseOperationsStore } from '@/stores/useBaseOperationsStore';
import { useBaseStore } from '@/stores/useBaseStore';
import { useGreenhouseStore } from '@/stores/useGreenhouseStore';
import { useZoneStore } from '@/stores/useZoneStore';
import { useBlockStore } from '@/stores/useBlockStore';
import { showAlert } from '@/lib/dialogService';

// ============================================
// 数据转换函数
// ============================================

/**
 * 将基地、温室、区域数据构建为树形结构
 * @param bases 基地列表
 * @param greenhouses 温室列表
 * @param zones 区域列表
 * @param searchQuery 搜索关键词
 * @returns 树形节点数组
 */
function buildTreeData(
  bases: { oid: string; code: string; name: string }[],
  greenhouses: { oid: string; code: string; name: string; baseOid: string }[],
  zones: { oid: string; zoneCode: string; zoneName: string; greenhouseOid: string }[],
  searchQuery: string
): TreeNode[] {
  const query = searchQuery.toLowerCase();

  return bases
    .filter(base => !query || base.name.toLowerCase().includes(query) || base.code.toLowerCase().includes(query))
    .map(base => ({
      key: `base_${base.oid}`,
      title: `${base.code} ${base.name}`,
      type: 'base' as const,
      oid: base.oid,
      children: greenhouses
        .filter(gh => gh.baseOid === base.oid && (!query || gh.name.toLowerCase().includes(query) || gh.code.toLowerCase().includes(query)))
        .map(gh => ({
          key: `gh_${gh.oid}`,
          title: `${gh.code} ${gh.name}`,
          type: 'greenhouse' as const,
          oid: gh.oid,
          children: zones
            .filter(z => z.greenhouseOid === gh.oid && (!query || z.zoneName.toLowerCase().includes(query) || z.zoneCode.toLowerCase().includes(query)))
            .map(z => ({
              key: `zone_${z.oid}`,
              title: `${z.zoneCode} ${z.zoneName}`,
              type: 'zone' as const,
              oid: z.oid,
            })),
        })),
    }));
}

// ============================================
// 统计卡片配置
// ============================================
const STAT_CARDS = [
  { key: 'totalBases', label: '基地总数', color: 'from-blue-50 to-blue-100', textColor: 'text-blue-600' },
  { key: 'totalGreenhouses', label: '温室总数', color: 'from-emerald-50 to-emerald-100', textColor: 'text-emerald-600' },
  { key: 'totalZones', label: '区域总数', color: 'from-amber-50 to-amber-100', textColor: 'text-amber-600' },
  { key: 'totalBlocks', label: '地块总数', color: 'from-purple-50 to-purple-100', textColor: 'text-purple-600' },
] as const;

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

// ============================================
// 主组件
// ============================================
export default function BaseOperationsCenterV2() {
  // Store
  const {
    filteredData,
    expandedKeys,
    selectedNode,
    searchTerm,
    stats,
    loading,
    loadAllData,
    setExpandedKeys,
    selectNode,
    setSearchTerm,
  } = useBaseOperationsStore();

  // 基础数据 Store（用于获取原始数据做表格展示）
  const { bases } = useBaseStore();
  const { greenhouses } = useGreenhouseStore();
  const { zones } = useZoneStore();
  const { blocks } = useBlockStore();

  // 使用 buildTreeData 函数构建本地树形数据
  const treeData = useMemo(() => {
    return buildTreeData(bases, greenhouses, zones, searchTerm);
  }, [bases, greenhouses, zones, searchTerm]);

  // 加载所有数据
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // 根据选中节点获取表格数据
  const tableData = useMemo(() => {
    if (!selectedNode.oid) {
      // 未选中时显示所有基地
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
      default:
        return [];
    }
  }, [selectedNode, bases, greenhouses, zones, blocks]);

  // 根据选中节点类型获取表格列
  const tableColumns = useMemo(() => {
    switch (selectedNode.type) {
      case 'greenhouse':
        return GREENHOUSE_COLUMNS;
      case 'zone':
        return ZONE_COLUMNS;
      case 'block':
        return BLOCK_COLUMNS;
      default:
        return BASE_COLUMNS;
    }
  }, [selectedNode.type]);

  // 处理节点选择
  const handleNodeSelect = (key: string) => {
    // key 格式: "base_xxx" | "gh_xxx" | "zone_xxx"
    const [type, oid] = key.split('_')
    const typeMap: Record<string, 'base' | 'greenhouse' | 'zone'> = {
      base: 'base',
      gh: 'greenhouse',
      zone: 'zone',
    }
    selectNode(typeMap[type] || 'base', oid, null)
  };

  // 处理新增
  const handleAdd = () => {
    const addType = selectedNode.type || 'base';
    showAlert(`新增${getTypeName(addType)}功能待实现`, '提示');
  };

  // 处理编辑
  const handleEdit = (oid: string) => {
    showAlert(`编辑 ${oid} 功能待实现`, '提示');
  };

  // 处理删除
  const handleDelete = async (oid: string) => {
    const confirmed = await showAlert(`确定要删除吗？`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
    if (confirmed) {
      showAlert(`删除 ${oid} 功能待实现`, '提示');
    }
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
      default:
        return '新增基地';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-4 shadow-none mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">基地运营中心</h1>
            <p className="text-sm text-gray-500">
              {selectedNode.name
                ? `当前选择：${selectedNode.name}`
                : '请从左侧树形结构中选择节点'}
            </p>
          </div>
        </div>
      </div>

      {/* 主内容区：左侧树 + 右侧内容 */}
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
                selectedKeys={selectedNode.oid ? [`${selectedNode.type === 'greenhouse' ? 'gh' : selectedNode.type === 'zone' ? 'zone' : 'base'}_${selectedNode.oid}`] : []}
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
          <div className="grid grid-cols-4 gap-4">
            {STAT_CARDS.map((card) => (
              <Card key={card.key} className={`bg-gradient-to-br ${card.color}`}>
                <CardContent className="text-center py-4">
                  <div className={`text-2xl font-bold ${card.textColor}`}>
                    {stats[card.key]}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{card.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 数据表格 */}
          <div className="flex-1 bg-white rounded-xl shadow-none overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {tableColumns.map((col) => (
                    <TableHead key={col.key} className={col.width}>
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
                        <TableCell key={col.key} className={col.width}>
                          {col.key === 'action' ? (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(row.oid)}
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
    </div>
  );
}
