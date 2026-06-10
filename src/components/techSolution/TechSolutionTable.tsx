/**
 * 技术方案数据表格 + 工具栏
 * 受控展示：父组件传 techSolutions、state、handlers
 * 2026-06-10: 种植模式列加 ALL_MODE_LABELS fallback（字典查不到时翻译 SEED_BREEDING/
 *           SEEDLING/PLANTING 三类的 value → label）
 */
import { Download, Edit2, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { TechSolution } from '../../types/techSolution';
import { SEED_BREEDING_MODES, SEEDLING_MODES, PLANTING_MODES } from '../production/constants';

export interface TechSolutionTableHandlers {
  onViewClick: (tech: TechSolution) => void;
  onTitleClick: (tech: TechSolution) => void;
  onEditClick: (tech: TechSolution) => void;
  onDeleteClick: (tech: TechSolution) => void;
  onSelectAll: () => void;
  onSelectRow: (id: string | number) => void;
  onOpenCreate: () => void;
  onEnterBatchEdit: () => void;
  onEnterBatchDelete: () => void;
  onEnterExport: () => void;
  onConfirmExport: () => void;
  onCancelExport: () => void;
  onConfirmBatchEdit: () => void;
  onCancelBatchEdit: () => void;
  onConfirmBatchDelete: () => void;
  onCancelBatchDelete: () => void;
  onDownloadDetail: (tech: TechSolution) => void;
}

export interface TechSolutionTableProps {
  techSolutions: TechSolution[];
  selectedRows: (string | number)[];
  exportMode: boolean;
  batchEditMode: boolean;
  batchDeleteMode: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  getDictItemName: (category: string, code: string) => string;
  handlers: TechSolutionTableHandlers;
}

export function TechSolutionTable({
  techSolutions,
  selectedRows,
  exportMode,
  batchEditMode,
  batchDeleteMode,
  canCreate,
  canEdit,
  canDelete,
  canExport,
  getDictItemName,
  handlers,
}: TechSolutionTableProps) {
  const inSelectionMode = exportMode || batchEditMode || batchDeleteMode;

  // 2026-06-10: 种植模式中文翻译——字典优先（保留字典表里的自定义 label，如"露天种植"），
  // 字典查不到 fallback ALL_MODE_LABELS（合并三类 modes 静态映射）
  const ALL_MODE_LABELS: Record<string, string> = (() => {
    const m: Record<string, string> = {};
    [...SEED_BREEDING_MODES, ...SEEDLING_MODES, ...PLANTING_MODES].forEach(opt => {
      m[opt.value] = opt.label;
    });
    return m;
  })();
  const formatPlantingMode = (raw: string | undefined | null): string => {
    if (!raw) return '-';
    const tokens = raw.split(',').map(v => v.trim()).filter(Boolean);
    return tokens.map(v => {
      // 优先用 prop 的字典查（保留字典表里的自定义 label）
      const dictName = getDictItemName('planting_mode', v);
      // 字典返回了非原值（如"露天种植"）→ 用字典结果
      if (dictName && dictName !== v) return dictName;
      // 字典查不到（fallback 原 code）→ 走 ALL_MODE_LABELS 兜底翻译
      return ALL_MODE_LABELS[v] || v;
    }).join('、');
  };

  // 2026-06-10: 长字段 8 汉字截断（与生产计划 ProductionTable 模式一致，详情弹窗/编辑弹窗保持完整）
  // null/undefined → '-'；长度 ≤ 8 → 原样；> 8 → 截断 + …
  const truncateForTable = (text: string | null | undefined, maxChars = 8): string => {
    if (text === null || text === undefined) return '-';
    const s = String(text);
    if (s.length <= maxChars) return s;
    return s.slice(0, maxChars) + '…';
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">技术方案列表</h3>
          {inSelectionMode ? (
            <div className="flex gap-2">
              {batchEditMode && (
                <>
                  <Button variant="blue" size="sm" onClick={handlers.onConfirmBatchEdit}>
                    <Edit2 className="w-4 h-4" />
                    编辑
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handlers.onCancelBatchEdit}>
                    <X className="w-4 h-4" /> 取消
                  </Button>
                </>
              )}
              {batchDeleteMode && (
                <>
                  <Button variant="destructive" size="sm" onClick={handlers.onConfirmBatchDelete} disabled={selectedRows.length === 0}>
                    <Trash2 className="w-4 h-4" />
                    删除
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handlers.onCancelBatchDelete}>
                    <X className="w-4 h-4" /> 取消
                  </Button>
                </>
              )}
              {exportMode && (
                <>
                  <Button variant="default" size="sm" onClick={handlers.onConfirmExport}>
                    <Download className="w-4 h-4" />
                    确认导出
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handlers.onCancelExport}>
                    <X className="w-4 h-4" /> 取消
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              {canCreate && (
                <Button variant="default" size="sm" onClick={handlers.onOpenCreate}>
                  <Plus className="w-4 h-4" />
                  新增
                </Button>
              )}
              {canEdit && (
                <Button variant="blue" size="sm" onClick={handlers.onEnterBatchEdit}>
                  <Edit2 className="w-4 h-4" />
                  编辑
                </Button>
              )}
              {canDelete && (
                <Button variant="destructive" size="sm" onClick={handlers.onEnterBatchDelete}>
                  <Trash2 className="w-4 h-4" />
                  删除
                </Button>
              )}
              {canExport && (
                <Button variant="default" size="sm" onClick={handlers.onEnterExport}>
                  <Download className="w-4 h-4" />
                  导出
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                {inSelectionMode && (
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                    <Checkbox
                      checked={selectedRows.length === techSolutions.length && techSolutions.length > 0}
                      onCheckedChange={handlers.onSelectAll}
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">方案编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">关联生产计划批次</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">方案标题</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">作物品种</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">种植模式</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">适用范围</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">版本</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">编制人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">创建日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">方案是否有效</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">备注</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">操作</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">方案详情文件</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {techSolutions.map((tech) => (
                <tr key={tech.id} className="hover:bg-blue-100 transition-colors">
                  {inSelectionMode && (
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedRows.includes(tech.id)}
                        onCheckedChange={() => handlers.onSelectRow(tech.id)}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap">
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800" onClick={() => handlers.onViewClick(tech)}>
                      {tech.code}
                    </Button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{tech.relatedBatchCode || '-'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-green-700 whitespace-nowrap" title={tech.title}>
                    <Button variant="ghost" size="sm" className="text-green-700 hover:text-green-900" onClick={() => handlers.onTitleClick(tech)}>
                      {truncateForTable(tech.title)}
                    </Button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap" title={tech.crop}>
                    {truncateForTable(tech.crop)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap" title={formatPlantingMode(tech.plantingMode)}>
                    {truncateForTable(formatPlantingMode(tech.plantingMode))}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap" title={(tech.scopes && tech.scopes.length > 0) ? tech.scopes.join('、') : (tech.stage || '')}>
                    {truncateForTable(
                      (tech.scopes && tech.scopes.length > 0)
                        ? tech.scopes.join('、')
                        : (tech.stage || '')
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{tech.version}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{tech.author}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{tech.createDate}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        tech.status === '已发布'
                          ? 'bg-green-100 text-green-700'
                          : tech.status === '待审批'
                          ? 'bg-amber-100 text-amber-700'
                          : tech.status === '已拒绝'
                          ? 'bg-red-100 text-red-700'
                          : tech.status === '已作废'
                          ? 'bg-gray-300 text-gray-600'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {tech.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        tech.isValid === '作废' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {tech.isValid || '有效'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap max-w-xs truncate" title={tech.remarks}>
                    {truncateForTable(tech.remarks)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {tech.isValid !== '作废' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="编辑"
                            onClick={() => handlers.onEditClick(tech)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-800 p-1"
                            title="删除"
                            onClick={() => handlers.onDeleteClick(tech)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {tech.isValid === '作废' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-800 p-1"
                          title="删除"
                          onClick={() => handlers.onDeleteClick(tech)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {tech.planDetailFileName ? (
                      <span title={tech.planDetailFileName}>
                        {truncateForTable(tech.planDetailFileName)}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 ml-1"
                          title="点击下载方案详情"
                          onClick={() => handlers.onDownloadDetail(tech)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {exportMode && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={handlers.onSelectAll}>
                  {selectedRows.length === techSolutions.length ? '全不选' : '全选'}
                </Button>
                <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
