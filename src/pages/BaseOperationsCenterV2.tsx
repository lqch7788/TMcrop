/**
 * 基地运营中心 V2 页面
 * 树状布局：左侧基地树 + 右侧数据表格和统计卡片
 * 路由：/base-operations-v2
 */
import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Edit2, Trash2, Building2, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Tree } from '@/components/ui/Tree';
import type { TreeNode } from '@/components/ui/Tree';
import { Card, CardContent } from '@/components/ui/Card';
import { Button, Input, Select } from '@/components/ui';
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
import { usePlantingRecordStore } from '@/stores/usePlantingRecordStore';
import { showAlert, showToast } from '@/lib/dialogService';

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
  const { records } = usePlantingRecordStore();

  // 弹窗状态管理
  const [modalType, setModalType] = useState<'add' | 'edit' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  // 表单数据状态
  const [formData, setFormData] = useState<Record<string, any>>({});

  // 打开新增弹窗
  const handleAdd = () => {
    setModalType('add');
    setEditingItem(null);
    // 根据选中节点类型初始化表单数据
    if (selectedNode.type === 'greenhouse') {
      setFormData({ status: 'active' });
    } else if (selectedNode.type === 'zone') {
      setFormData({ status: 'active' });
    } else if (selectedNode.type === 'block') {
      setFormData({ status: 'active' });
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
      if (modalType === 'add') {
        // 新增
        if (selectedNode.type === 'greenhouse' || !selectedNode.oid) {
          // 新增温室
          await useGreenhouseStore.getState().addGreenhouse({
            ...formData,
            baseOid: selectedNode.oid || bases[0]?.oid,
          });
          showToast('温室新增成功', 'success');
        } else if (selectedNode.type === 'zone') {
          // 新增区域
          await useZoneStore.getState().addZone({
            ...formData,
            greenhouseOid: selectedNode.oid,
          });
          showToast('区域新增成功', 'success');
        } else if (selectedNode.type === 'block') {
          // 新增地块
          await useBlockStore.getState().addBlock({
            ...formData,
            zoneOid: selectedNode.oid,
          });
          showToast('地块新增成功', 'success');
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
    selectNode(typeMap[type] || 'base', oid, '')
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
                selectedKeys={selectedNode.oid ? [`${selectedNode.type === 'greenhouse' ? 'greenhouse' : selectedNode.type === 'zone' ? 'zone' : 'base'}_${selectedNode.oid}`] : []}
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

      {/* 新增/编辑弹窗 */}
      <Modal
        isOpen={!!modalType}
        onClose={handleCloseModal}
        title={modalType === 'add' ? `新增${getAddButtonText().replace('新增', '')}` : `编辑${getAddButtonText().replace('新增', '')}`}
        onSubmit={handleSubmit}
        size="md"
      >
        <div className="space-y-4">
          {/* 温室/地块表单 */}
          {(selectedNode.type === 'greenhouse' || (!selectedNode.type && modalType === 'add')) && (
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
                  <Input
                    value={formData.greenhouseType || ''}
                    onChange={(e) => handleFormChange('greenhouseType', e.target.value)}
                    placeholder="请输入温室类型"
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

          {/* 区域表单 */}
          {selectedNode.type === 'zone' && (
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

          {/* 地块表单 */}
          {selectedNode.type === 'block' && (
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
        </div>
      </Modal>
    </div>
  );
}
