/**
 * 病虫害防治记录表格组件
 * V12.0 新增 - 折叠形式展示多药剂/多制剂/多肥料详情
 * 列：勾选框、展开、编号、防治日期、作物、防治区域、操作人、施用方法、目标病虫害、备注、状态、操作（编辑/删除）
 * 2026-06-21: 删除操作列"查看"按钮（与点击编号重复，统一通过编号查看详情）
 */
import React from 'react';
import { ChevronDown, ChevronRight, Download, Edit2, Plus, Trash2, X } from 'lucide-react';
import { PestControlData, useDictionaryStore } from '@/stores';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Pagination } from '@/components/ui';
import { Badge } from '@/components/ui';

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

// 2026-07-10 P1-6：抽到 constants/cropEnums.ts 共享（替代 3 处 inline 定义）
// 保留函数名 getControlTypeLabel 以兼容现有调用
import { CONTROL_TYPE_OPTIONS, lookupEnumLabel } from '@/constants/cropEnums';
const getControlTypeLabel = (type: string): string =>
  lookupEnumLabel(CONTROL_TYPE_OPTIONS, type, type);

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
          <span className="text-sm text-gray-500">（点击展开查看多药剂/肥料详情）</span>
        </div>
        {/* 批量删除模式：显示确认栏 */}
        {operationMode === 'delete' && selectedIds.length > 0 ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-red-600 font-medium">已选择 {selectedIds.length} 条记录</span>
            <Button variant="destructive" size="sm" onClick={onBatchDeleteConfirm}>
              <Trash2 className="w-4 h-4" />确认删除
            </Button>
            <Button variant="secondary" size="sm" onClick={onBatchDeleteMode}><X className="w-4 h-4" /> 取消</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={onAdd}
            >
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
            <Button
              variant="default"
              size="sm"
              onClick={onExportMode}
            >
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
                <TableCell colSpan={showCheckbox ? 12 : 11} className="px-4 py-12 text-center text-gray-400">
                  暂无防治记录
                </TableCell>
              </TableRow>
            ) : (
              currentData.map((record) => {
                const expanded = isExpanded(record.id);
                const pesticideList = parseJsonList((record as any).pesticideList);
                const bioAgentList = parseJsonList((record as any).bioAgentList);
                const equipmentList = parseJsonList((record as any).equipmentList);
                // 2026-07-12：肥料池必须读 leafFertilizerList（旧代码误读 leafFertilizerName 单字段，永远为空）
                const leafFertilizerList = parseJsonList(record.leafFertilizerList);

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
                      {/* 操作 - 2026-06-21: 删除"查看"按钮（与点击编号重复） */}
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-1">
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
                        <TableCell colSpan={showCheckbox ? 12 : 11} className="px-6 py-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* 左侧：防治详情表格 — 2026-07-12：改用 pesticideTypes 判定药剂池类型，移除废弃 controlType */}
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                                    <tr>
                                      {/* 药剂池：依 pesticideList 长度判定有无，老字段（pesticideName 单条）也兜底 */}
                                      {(pesticideList.length > 0 || (record as any).pesticideName || (record.pesticideTypes || []).length > 0) && (
                                        <>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">序号</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">药剂名称</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">药剂类型</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">含量/规格</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">用药量</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">单位</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">稀释倍数</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">施用方法</th>
                                        </>
                                      )}
                                      {/* 制剂池 */}
                                      {bioAgentList.length > 0 && (
                                        <>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">序号</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">制剂名称</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">制剂类型</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">用量</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">单位</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">稀释倍数</th>
                                        </>
                                      )}
                                      {/* 设备池 */}
                                      {equipmentList.length > 0 && (
                                        <>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">序号</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">设备/方式</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">用量/次数</th>
                                        </>
                                      )}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {/* 药剂池内容（JSON 列表优先；老字段兜底单条） */}
                                    {(pesticideList.length > 0 ? pesticideList : (record as any).pesticideName ? [{
                                      name: (record as any).pesticideName,
                                      types: record.pesticideTypes || [(record as any).pesticideType],
                                      specContent: (record as any).specContent,
                                      dosage: (record as any).dosage,
                                      unit: (record as any).dosageUnit,
                                      ratio: (record as any).dilutionRatio,
                                      applicationMethod: (record as any).applicationMethod,
                                    }] : []).map((item: any, idx: number) => {
                                      const pestTypes = item.types && item.types.length > 0 ? item.types : (item.type ? [item.type] : []);
                                      return (
                                        <tr key={idx} className="hover:bg-emerald-50">
                                          <td className="px-3 py-2 text-center text-gray-500">{idx + 1}</td>
                                          <td className="px-3 py-2 font-medium text-gray-900">{item.name || '-'}</td>
                                          <td className="px-3 py-2 text-gray-600">
                                            {pestTypes.length > 0 ? pestTypes.map((t: string, ti: number) => (
                                              <span key={ti}>
                                                {ti > 0 && '、'}
                                                {getDictLabel('pesticide_type', t) || t}
                                              </span>
                                            )) : '-'}
                                          </td>
                                          <td className="px-3 py-2 text-gray-600">{item.specContent || '-'}</td>
                                          <td className="px-3 py-2 text-orange-600 font-medium">{item.dosage || '-'}</td>
                                          <td className="px-3 py-2 text-gray-600">{item.unit || '-'}</td>
                                          <td className="px-3 py-2 text-gray-600">{item.ratio || '-'}</td>
                                          <td className="px-3 py-2 text-gray-600">{getDictLabel('application_method', item.applicationMethod || '') || '-'}</td>
                                        </tr>
                                      );
                                    })}
                                    {/* 制剂池内容 */}
                                    {bioAgentList.length > 0 && bioAgentList.map((item: any, idx: number) => (
                                      <tr key={`bio-${idx}`} className="hover:bg-emerald-50">
                                        <td className="px-3 py-2 text-center text-gray-500">{idx + 1}</td>
                                        <td className="px-3 py-2 font-medium text-gray-900">{item.name || '-'}</td>
                                        <td className="px-3 py-2 text-gray-600">{getDictLabel('bio_agent_type', item.type) || '-'}</td>
                                        <td className="px-3 py-2 text-orange-600 font-medium">{item.dosage || '-'}</td>
                                        <td className="px-3 py-2 text-gray-600">{item.unit || '-'}</td>
                                        <td className="px-3 py-2 text-gray-600">{item.ratio || '-'}</td>
                                      </tr>
                                    ))}
                                    {/* 设备池内容 */}
                                    {equipmentList.length > 0 && equipmentList.map((item: any, idx: number) => (
                                      <tr key={`eq-${idx}`} className="hover:bg-emerald-50">
                                        <td className="px-3 py-2 text-center text-gray-500">{idx + 1}</td>
                                        <td className="px-3 py-2 font-medium text-gray-900">{item.name || '-'}</td>
                                        <td className="px-3 py-2 text-gray-600">{item.count || '-'}</td>
                                      </tr>
                                    ))}
                                    {/* 完全无内容兜底 */}
                                    {pesticideList.length === 0 && bioAgentList.length === 0 && equipmentList.length === 0 && !(record as any).pesticideName && (record.pesticideTypes || []).length === 0 && (
                                      <tr>
                                        <td className="px-3 py-4 text-center text-gray-400">暂无防治数据</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* 右侧：肥料联用 — 读 leafFertilizerList（修复点） */}
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                                    <tr>
                                      <th className="px-3 py-2 text-left font-bold whitespace-nowrap">序号</th>
                                      <th className="px-3 py-2 text-left font-bold whitespace-nowrap">肥料名称</th>
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
                                        <td className="px-3 py-2 text-gray-600">{item.ratio || item.dilutionRatio || '-'}</td>
                                      </tr>
                                    )) : (
                                      <tr>
                                        <td colSpan={5} className="px-3 py-4 text-center text-gray-400">
                                          {record.useLeafFertilizer === 'yes' ? '暂无肥料明细' : '未启用肥料联用'}
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
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
