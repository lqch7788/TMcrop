/**
 * 基地运营中心 — 主表格子组件
 * Plan B 2026-07-25
 *
 * 渲染根据 selectedNode.type 切换的表格列。
 * 包含 [+] [✏️] [🗑] 操作列。
 * 选中 greenhouse 时支持行折叠展开子区块表（plan Task 4 内嵌 JSX）。
 */
import { Fragment } from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Button } from '@/components/ui';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import type { SelectedNode, TableColumn } from './types';

interface MainTableProps {
  selectedNode: SelectedNode;
  tableData: any[];
  tableColumns: TableColumn[];
  onEdit: (row: any) => void;
  onDelete: (row: any) => void;
  onAdd: () => void;
  addButtonText: string;
  onRowExpand?: (rowId: string) => void;
  expandedRows?: Set<string>;
  rowChildrenMap?: Record<string, any[]>;
  onAddZoneInRow?: (ghOid: string) => void;
  onEditZoneInRow?: (zone: any) => void;
  onDeleteZoneInRow?: (zone: any) => void;
  onToggleZonePlantings?: (zoneOid: string) => void;
  expandedZonePlantings?: Set<string>;
  renderZonePlantings?: (zone: any) => React.ReactNode;
  zoneTypeLabels?: Record<string, string>;
}

export function MainTable({
  selectedNode, tableData, tableColumns,
  onEdit, onDelete, onAdd, addButtonText,
  onRowExpand, expandedRows, rowChildrenMap, onAddZoneInRow,
  onEditZoneInRow, onDeleteZoneInRow,
  onToggleZonePlantings, expandedZonePlantings,
  renderZonePlantings, zoneTypeLabels = {},
}: MainTableProps) {
  // 选中 greenhouse 时：行折叠展开子区块
  if (selectedNode.type === 'greenhouse' || selectedNode.type === 'base') {
    return (
      <>
        <div className="flex-1 bg-white rounded-xl shadow-none overflow-auto">
          <div className="divide-y divide-gray-200">
            {tableData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暂无数据</div>
            ) : (
              tableData.map((row) => {
                const isExpanded = expandedRows?.has(row.oid) || false;
                const childZones = rowChildrenMap?.[row.oid] || [];
                return (
                  <div key={row.oid}>
                    {/* 行头 */}
                    <div
                      className={`flex items-center px-4 py-3 cursor-pointer select-none transition-colors ${
                        isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => onRowExpand?.(row.oid)}
                    >
                      <button className="mr-2 text-gray-500">
                        <span className={`inline-block transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>▼</span>
                      </button>
                      <span className="font-mono text-sm text-gray-500 mr-3">{row.code || '-'}</span>
                      <span className="font-medium text-gray-800 mr-3">{row.name}</span>
                      {row.location && <span className="text-xs text-gray-500 mr-3">{row.location}</span>}
                      {row.area != null && <span className="text-xs text-gray-500 mr-3">{row.area}㎡</span>}
                      <span className="ml-auto text-xs text-gray-500 mr-3">
                        {selectedNode.type === 'greenhouse'
                          ? `📍 ${childZones.length} 个区块`
                          : null}
                      </span>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        {selectedNode.type === 'greenhouse' && onAddZoneInRow && (
                          <button
                            onClick={() => onAddZoneInRow(row.oid)}
                            className="p-1.5 hover:bg-green-50 text-green-600 rounded"
                            title={`为「${row.name}」新增区块`}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onEdit(row)}
                          className="p-1.5 hover:bg-blue-50 text-blue-500 rounded"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(row)}
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* 展开区：内嵌子区块表 + 行折叠子表 */}
                    {isExpanded && (
                      <div className="bg-gray-50 border-t border-gray-200">
                        {childZones.length === 0 ? (
                          <div className="px-12 py-4 text-sm text-gray-400">
                            （暂无区块）
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
                                <th className="px-3 py-2 text-left font-medium">备注</th>
                                <th className="px-3 py-2 text-center font-medium">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {childZones.map((z: any) => {
                                const isPlantingOpen = expandedZonePlantings?.has(z.oid) || false;
                                return (
                                  <Fragment key={z.oid}>
                                  <tr className="hover:bg-blue-50 border-t border-gray-300">
                                    <td className="px-3 py-2 font-mono text-gray-600">{z.zoneCode || '-'}</td>
                                    <td className="px-3 py-2 font-medium text-gray-800">{z.zoneName}</td>
                                    <td className="px-3 py-2 text-gray-600">
                                      {zoneTypeLabels[z.zoneType] || z.zoneType || '-'}
                                    </td>
                                    <td className="px-3 py-2 text-right">{z.area || 0}</td>
                                    <td className="px-3 py-2">
                                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                                        z.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                      }`}>
                                        {z.status === 'active' ? '活跃' : '停用'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-gray-500 truncate max-w-[150px]" title={z.description || '-'}>
                                      {z.description || '-'}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <div className="flex justify-center gap-1">
                                        {onToggleZonePlantings && (
                                          <button
                                            onClick={() => onToggleZonePlantings(z.oid)}
                                            className="p-1 hover:bg-purple-50 text-purple-500 rounded"
                                            title="查看批次"
                                          >
                                            <span className={`inline-block text-xs transition-transform ${isPlantingOpen ? 'rotate-90' : ''}`}>▶</span>
                                          </button>
                                        )}
                                        {onEditZoneInRow && (
                                          <button onClick={() => onEditZoneInRow(z)} className="p-1 hover:bg-blue-50 text-blue-500 rounded" title="编辑">
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                        )}
                                        {onDeleteZoneInRow && (
                                          <button onClick={() => onDeleteZoneInRow(z)} className="p-1 hover:bg-red-50 text-red-500 rounded" title="删除">
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                  {/* 行折叠批次列表展开 */}
                                  {isPlantingOpen && renderZonePlantings && (
                                    <tr>
                                      <td colSpan={7} className="p-0 bg-white border-t border-gray-200">
                                        {renderZonePlantings(z)}
                                      </td>
                                    </tr>
                                  )}
                                  </Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div className="flex items-center justify-start gap-3 bg-white rounded-xl p-4 shadow-none">
          <Button onClick={onAdd}><Plus className="w-4 h-4 mr-1" />{addButtonText}</Button>
        </div>
      </>
    );
  }

  // 其他类型用 Table 组件
  return (
    <>
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
                          <Button variant="ghost" size="sm" onClick={() => onEdit(row)}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => onDelete(row)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        (row[col.key as keyof typeof row]?.toString() || '-')
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-start gap-3 bg-white rounded-xl p-4 shadow-none">
        <Button onClick={onAdd}><Plus className="w-4 h-4 mr-1" />{addButtonText}</Button>
      </div>
    </>
  );
}

// Fragment 用于在 .map 中返回多个元素（已在顶部 import）