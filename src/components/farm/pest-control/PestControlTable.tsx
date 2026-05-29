/**
 * 病虫害防治记录表格组件
 * V12.0 新增 - 折叠形式展示多药剂/多制剂/多叶面肥详情
 * 列：勾选框、编号、防治日期、防治类型（彩色Badge）、作物、防治区域、操作人、操作（展开/编辑/删除）
 */
import React from 'react';
import { Eye, Edit2, Trash2, Plus, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { PestControlData, useDictionaryStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/badge';

interface PestControlTableProps {
  data: PestControlData[];
  isLoading: boolean;
  operationMode: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onDetail: (record: PestControlData) => void;
  onEdit: (record: PestControlData) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onBatchDeleteMode: () => void;
  onBatchDelete: () => void;
  onBatchDeleteConfirm: () => void;
  onExportMode: () => void;
}

// 防治类型 Badge 颜色
const getControlTypeBadgeColor = (type: string): string => {
  const colors: Record<string, string> = {
    'chemical': 'bg-red-100 text-red-700 border-red-200',
    'bio': 'bg-green-100 text-green-700 border-green-200',
    'physical': 'bg-blue-100 text-blue-700 border-blue-200',
  };
  return colors[type] || 'bg-gray-100 text-gray-700 border-gray-200';
};

// 防治类型显示名
const getControlTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'chemical': '化学防治',
    'bio': '生物防治',
    'physical': '物理防治',
  };
  return labels[type] || type;
};

// 解析 JSON 列表
function parseJsonList(jsonStr: string | null | undefined): any[] {
  if (!jsonStr) return [];
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// 解析目标病虫害（可能是JSON数组或单个字符串）
function parseTargetPests(targetPest: string | null | undefined): string[] {
  if (!targetPest) return [];
  try {
    const parsed = JSON.parse(targetPest);
    if (Array.isArray(parsed)) return parsed;
    return [parsed];
  } catch {
    return [targetPest];
  }
}

// 解析防治区域（可能是JSON数组或单个字符串）
function parseGreenhouses(greenhouseName: string | null | undefined): string[] {
  if (!greenhouseName) return [];
  try {
    const parsed = JSON.parse(greenhouseName);
    if (Array.isArray(parsed)) return parsed;
    return [parsed];
  } catch {
    return [greenhouseName];
  }
}

export function PestControlTable({
  data,
  isLoading,
  operationMode,
  selectedIds,
  onSelectionChange,
  onDetail,
  onEdit,
  onDelete,
  onAdd,
  onBatchDeleteMode,
  onBatchDelete,
  onBatchDeleteConfirm,
  onExportMode,
}: PestControlTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const dictionaries = useDictionaryStore((s) => s.dictionaries);

  // 获取字典项标签
  const getDictLabel = (category: string, code: string) => {
    if (!code || !dictionaries.length) return code;
    const items = dictionaries.filter(d => (d as any).categoryCode === category);
    const item = items.find(d => (d as any).dictCode === code);
    return item ? (item as any).dictLabel : code;
  };

  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const showCheckbox = operationMode === 'delete';
  const startIdx = (currentPage - 1) * pageSize;
  const currentData = data.slice(startIdx, startIdx + pageSize);

  // 切换页面时重置
  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [data.length, totalPages, currentPage]);

  // 全选/取消
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(data.map((it) => it.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter((k) => k !== id));
    }
  };

  // 展开/折叠
  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const isExpanded = (id: string) => expandedIds.has(id);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
        <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2" />
        加载中...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 表头操作栏 */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">防治记录列表</h3>
          <span className="text-sm text-gray-500">（点击展开查看多药剂/叶面肥详情）</span>
        </div>
        {/* 批量删除模式：显示确认栏 */}
        {operationMode === 'delete' && selectedIds.length > 0 ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-red-600 font-medium">已选择 {selectedIds.length} 条记录</span>
            <Button variant="destructive" size="sm" onClick={onBatchDeleteConfirm}>
              <Trash2 className="w-4 h-4" />确认删除
            </Button>
            <Button variant="secondary" size="sm" onClick={onBatchDeleteMode}>取消</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onAdd}>
              <Plus className="w-4 h-4" />
              新增
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onBatchDeleteMode}
            >
              <Trash2 className="w-4 h-4" />
              批量删除
            </Button>
            <Button size="sm" onClick={onExportMode}>
              <Download className="w-4 h-4" />
              导出
            </Button>
          </div>
        )}
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600">
            <TableRow className="hover:bg-blue-400/30">
              {showCheckbox && (
                <TableHead className="py-3 font-bold text-white whitespace-nowrap w-12">
                  <Input
                    type="checkbox"
                    checked={data.length > 0 && selectedIds.length === data.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
                  />
                </TableHead>
              )}
              <TableHead className="py-3 font-bold text-white whitespace-nowrap w-10"></TableHead>
              <TableHead className="py-3 font-bold text-white whitespace-nowrap">编号</TableHead>
              <TableHead className="py-3 font-bold text-white whitespace-nowrap">防治日期</TableHead>
              <TableHead className="py-3 font-bold text-white whitespace-nowrap">防治类型</TableHead>
              <TableHead className="py-3 font-bold text-white whitespace-nowrap">作物</TableHead>
              <TableHead className="py-3 font-bold text-white whitespace-nowrap">防治区域</TableHead>
              <TableHead className="py-3 font-bold text-white whitespace-nowrap">操作人</TableHead>
              <TableHead className="py-3 font-bold text-white whitespace-nowrap">施用方法</TableHead>
              <TableHead className="py-3 font-bold text-white whitespace-nowrap">目标病虫害</TableHead>
              <TableHead className="py-3 font-bold text-white whitespace-nowrap">备注</TableHead>
              <TableHead className="py-3 font-bold text-white whitespace-nowrap">状态</TableHead>
              <TableHead className="py-3 font-bold text-white whitespace-nowrap">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-300">
            {currentData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showCheckbox ? 13 : 12} className="px-4 py-12 text-center text-gray-400">
                  暂无防治记录
                </TableCell>
              </TableRow>
            ) : (
              currentData.map((record) => {
                const expanded = isExpanded(record.id);
                const pesticideList = parseJsonList((record as any).pesticide_list);
                const bioAgentList = parseJsonList((record as any).bio_agent_list);
                const equipmentList = parseJsonList((record as any).equipment_list);
                const leafFertilizerList = parseJsonList(record.leafFertilizerName);

                return (
                  <React.Fragment key={record.id}>
                    {/* 主行 */}
                    <TableRow
                      className="bg-white hover:bg-emerald-50 transition-colors"
                    >
                      {showCheckbox && (
                        <TableCell className="px-4 py-3">
                          <Input
                            type="checkbox"
                            checked={selectedIds.includes(record.id)}
                            onChange={(e) => handleSelectRow(record.id, e.target.checked)}
                            className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
                          />
                        </TableCell>
                      )}
                      {/* 展开/折叠按钮 */}
                      <TableCell className="px-2 py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleExpand(record.id)}
                          className="text-gray-500 hover:text-emerald-600"
                        >
                          {expanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                      </TableCell>
                      {/* 编号 */}
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => onDetail(record)}
                          className="font-mono p-0 h-auto text-emerald-600 hover:text-emerald-800"
                          title="查看详情"
                        >
                          {record.recordCode}
                        </Button>
                      </TableCell>
                      {/* 防治日期 */}
                      <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {record.sprayTime ? record.sprayTime.slice(0, 16) : '-'}
                      </TableCell>
                      {/* 防治类型 */}
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getControlTypeBadgeColor(record.controlType)}`}>
                          {getControlTypeLabel(record.controlType)}
                        </span>
                      </TableCell>
                      {/* 作物 */}
                      <TableCell className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {record.cropName || '-'}
                      </TableCell>
                      {/* 防治区域 */}
                      <TableCell className="px-4 py-3 text-sm text-gray-600">
                        {parseGreenhouses(record.greenhouseName).length > 0
                          ? parseGreenhouses(record.greenhouseName).join(', ')
                          : '-'}
                      </TableCell>
                      {/* 操作人 */}
                      <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {record.operatorName || '-'}
                      </TableCell>
                      {/* 施用方法 */}
                      <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {getDictLabel('application_method', record.applicationMethod || '') || '-'}
                      </TableCell>
                      {/* 目标病虫害 */}
                      <TableCell className="px-4 py-3">
                        {parseTargetPests(record.targetPest).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {parseTargetPests(record.targetPest).map((pest, idx) => (
                              <span
                                key={idx}
                                className="inline-flex px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-700"
                              >
                                {pest}
                              </span>
                            ))}
                          </div>
                        ) : '-'}
                      </TableCell>
                      {/* 备注 */}
                      <TableCell className="px-4 py-3 text-sm text-gray-500 max-w-[120px] truncate" title={record.description || ''}>
                        {record.description || '-'}
                      </TableCell>
                      {/* 状态 */}
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="success" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                          {record.status === 'completed' ? '已完成' : record.status || '已完成'}
                        </Badge>
                      </TableCell>
                      {/* 操作 */}
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDetail(record)}
                            className="text-gray-500 hover:text-blue-600"
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(record)}
                            className="text-gray-500 hover:text-amber-600"
                            title="编辑"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(record.id)}
                            className="text-gray-500 hover:text-red-600"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* 折叠的详情行 */}
                    {expanded && (
                      <TableRow className="bg-gray-50 hover:bg-gray-50">
                        <TableCell colSpan={showCheckbox ? 13 : 12} className="px-6 py-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* 左侧：防治详情表格 */}
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                                    <tr>
                                      {record.controlType === 'chemical' && (
                                        <>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">序号</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">药剂名称</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">药剂类型</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">用药量</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">单位</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">稀释倍数</th>
                                        </>
                                      )}
                                      {record.controlType === 'bio' && (
                                        <>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">序号</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">制剂名称</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">制剂类型</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">用量</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">单位</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">稀释倍数</th>
                                        </>
                                      )}
                                      {record.controlType === 'physical' && (
                                        <>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">序号</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">设备/方式</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">用量/次数</th>
                                        </>
                                      )}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {record.controlType === 'chemical' && (
                                      (pesticideList.length > 0 ? pesticideList : [{
                                        name: record.pesticideName,
                                        type: record.pesticideType,
                                        dosage: record.dosage,
                                        unit: record.dosageUnit,
                                        ratio: record.dilutionRatio,
                                      }]).map((item: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-emerald-50">
                                          <td className="px-3 py-2 text-center text-gray-500">{idx + 1}</td>
                                          <td className="px-3 py-2 font-medium text-gray-900">{item.name || '-'}</td>
                                          <td className="px-3 py-2 text-gray-600">{getDictLabel('pesticide_type', item.type) || '-'}</td>
                                          <td className="px-3 py-2 text-orange-600 font-medium">{item.dosage || '-'}</td>
                                          <td className="px-3 py-2 text-gray-600">{item.unit || '-'}</td>
                                          <td className="px-3 py-2 text-gray-600">{item.ratio || '-'}</td>
                                        </tr>
                                      ))
                                    )}
                                    {record.controlType === 'bio' && (
                                      (bioAgentList.length > 0 ? bioAgentList : [{
                                        name: record.bioAgentName,
                                        type: record.bioAgentType,
                                        dosage: record.dosage,
                                        unit: record.dosageUnit,
                                        ratio: record.dilutionRatio,
                                      }]).map((item: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-emerald-50">
                                          <td className="px-3 py-2 text-center text-gray-500">{idx + 1}</td>
                                          <td className="px-3 py-2 font-medium text-gray-900">{item.name || '-'}</td>
                                          <td className="px-3 py-2 text-gray-600">{getDictLabel('bio_agent_type', item.type) || '-'}</td>
                                          <td className="px-3 py-2 text-orange-600 font-medium">{item.dosage || '-'}</td>
                                          <td className="px-3 py-2 text-gray-600">{item.unit || '-'}</td>
                                          <td className="px-3 py-2 text-gray-600">{item.ratio || '-'}</td>
                                        </tr>
                                      ))
                                    )}
                                    {record.controlType === 'physical' && (
                                      (equipmentList.length > 0 ? equipmentList : [{
                                        name: record.equipmentName,
                                        count: record.equipmentCount,
                                      }]).map((item: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-emerald-50">
                                          <td className="px-3 py-2 text-center text-gray-500">{idx + 1}</td>
                                          <td className="px-3 py-2 font-medium text-gray-900">{item.name || '-'}</td>
                                          <td className="px-3 py-2 text-gray-600">{item.count || '-'}</td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* 右侧：叶面肥联用 */}
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                              {record.useLeafFertilizer === 'yes' ? (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                                      <tr>
                                        <th className="px-3 py-2 text-left font-bold whitespace-nowrap">序号</th>
                                        <th className="px-3 py-2 text-left font-bold whitespace-nowrap">叶面肥名称</th>
                                        <th className="px-3 py-2 text-left font-bold whitespace-nowrap">用量</th>
                                        <th className="px-3 py-2 text-left font-bold whitespace-nowrap">单位</th>
                                        <th className="px-3 py-2 text-left font-bold whitespace-nowrap">稀释倍数</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {leafFertilizerList.length > 0 ? leafFertilizerList.map((item: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-purple-50">
                                          <td className="px-3 py-2 text-center text-gray-500">{idx + 1}</td>
                                          <td className="px-3 py-2 font-medium text-gray-900">{item.name || '-'}</td>
                                          <td className="px-3 py-2 text-orange-600 font-medium">{item.dosage || '-'}</td>
                                          <td className="px-3 py-2 text-gray-600">{item.unit || '-'}</td>
                                          <td className="px-3 py-2 text-gray-600">{item.ratio || '-'}</td>
                                        </tr>
                                      )) : (
                                        <tr>
                                          <td colSpan={5} className="px-3 py-4 text-center text-gray-400">暂无数据</td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="px-3 py-4 text-sm text-gray-400 text-center">未启用叶面肥联用</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          pageSizeOptions={[10, 20, 50]}
          showPageSize
        />
      </div>
    </div>
  );
}
