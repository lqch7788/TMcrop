/**
 * 育苗新增弹窗 — 关联种源信息区
 * 2026-10-18：从 AddModal.tsx 拆出（纯移动，无逻辑变更）
 */
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { X } from 'lucide-react';
import { Input, Button, Label } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import { getSeedSourceVarietyName, getSeedSourceOriginOrSupplier } from '../../../../../constants/seedSourceDict';
import type { SeedSource } from '../../../../../types/crop';
import type { AddFormData } from './types';
import { deepInputClass, formatSeedFormDisplay } from './helpers';

interface SeedlingSourceSectionProps {
  formData: AddFormData;
  setFormData: Dispatch<SetStateAction<AddFormData>>;
  filteredSeedSources: SeedSource[];
  productionPlanVarietyFilterFromPlan: string | null;
  sourcePopoverOpen: boolean;
  setSourcePopoverOpen: (open: boolean) => void;
  sourceSearch: string;
  setSourceSearch: (search: string) => void;
  sourcePopoverRef: RefObject<HTMLDivElement>;
  selectedSourceLabel: string;
  selectedSource: SeedSource | null;
  fullVarietyPath: {
    categoryName: string;
    typeName: string;
    varietyName: string;
    subVariety1Name: string;
  } | null;
  handleSourceChange: (sourceId: string) => void;
  navigate: (path: string) => void;
}

export function SeedlingSourceSection({
  formData,
  setFormData,
  filteredSeedSources,
  productionPlanVarietyFilterFromPlan,
  sourcePopoverOpen,
  setSourcePopoverOpen,
  sourceSearch,
  setSourceSearch,
  sourcePopoverRef,
  selectedSourceLabel,
  selectedSource,
  fullVarietyPath,
  handleSourceChange,
  navigate,
}: SeedlingSourceSectionProps) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-900 pb-2 mb-3 border-b border-gray-200">关联种源信息</h3>
      <p className="text-xs text-gray-500 mb-3">种源必须先在种源管理中录入</p>
      {/* combogrid 种源选择器 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 关联种源 - 方案2.7: combogrid下拉表格替代Select */}
          <div>
            <Label className="text-gray-900">
              关联种源 <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type="text"
                value={sourcePopoverOpen ? sourceSearch : selectedSourceLabel}
                placeholder="搜索种源批号或作物品种..."
                onFocus={() => {
                  setSourcePopoverOpen(true);
                  setSourceSearch('');
                }}
                onChange={(e) => {
                  setSourceSearch(e.target.value);
                  setSourcePopoverOpen(true);
                }}
                className={deepInputClass}
              />
              {/* 清除按钮 */}
              {formData.sourceId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, sourceId: '', sourceCode: '', sourceType: '', seedForm: '' }));
                    setSourceSearch('');
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
              {/* 下拉表格 Popover */}
              {sourcePopoverOpen && (
                <div ref={sourcePopoverRef} className="absolute z-50 mt-1 w-full bg-white border border-gray-400 rounded-lg shadow-lg max-h-64 overflow-hidden"
                  style={{ minWidth: '500px', left: 0 }}
                >
                  {/* 表头 — 2026-10-17：删「采购数量」列（选种源只需看可用数量）；
                      「作物名称」→「作物品种」（作物级名称无法区分品种，如草莓/红颜）；
                      列顺序：种源批号在前（用户主要按批号找），品种其次；
                      列宽按内容分配：种源批号最宽（如 SRC-SS-20261016-001 需完整显示） */}
                  <div className="grid grid-cols-[1.6fr_0.85fr_0.7fr_0.95fr] gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600">
                    <div>种源批号</div>
                    <div>作物品种</div>
                    <div>形态</div>
                    <div>可用数量</div>
                  </div>
                  {/* 表格行 */}
                  <div className="overflow-y-auto max-h-48">
                    {filteredSeedSources.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-gray-500 text-center space-y-2">
                        <div>
                          {productionPlanVarietyFilterFromPlan
                            ? `所选生产计划 [${productionPlanVarietyFilterFromPlan}] 暂无对应种源`
                            : '未找到匹配的种源'}
                        </div>
                        <div className="text-xs text-gray-400">请前往「种源管理」添加种源后，再返回此处选择</div>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={() => navigate('/crop/seed-source')}
                        >
                          去种源管理添加
                        </Button>
                      </div>
                    ) : (
                      filteredSeedSources.map(s => {
                        // 2026-06-16: failed / 无可用余量的种源不可选（前端友好提示，避免后端 500）
                        const isFailed = (s as any).propagationStatus === 'failed';
                        const isUnavailable = s.availableCount <= 0;
                        const isDisabled = isFailed || isUnavailable;
                        const disabledReason = isFailed
                          ? '该种源已标记为失败，不能用于育苗'
                          : isUnavailable
                            ? '该种源可用余量为 0'
                            : '';
                        return (
                          <div
                            key={s.id}
                            onClick={() => {
                              if (isDisabled) {
                                showAlert(disabledReason);
                                return;
                              }
                              handleSourceChange(s.id);
                              setSourcePopoverOpen(false);
                              setSourceSearch('');
                            }}
                            className={`grid grid-cols-[1.6fr_0.85fr_0.7fr_0.95fr] gap-2 px-3 py-2 text-sm border-b border-gray-100 transition-colors
                              ${isDisabled
                                ? 'bg-gray-100 cursor-not-allowed opacity-60'
                                : `cursor-pointer hover:bg-emerald-50 ${formData.sourceId === s.id ? 'bg-emerald-100' : ''}`}`}
                            title={disabledReason}
                          >
                            <div className={`truncate ${isDisabled ? 'text-gray-400' : 'text-emerald-700'}`}>{s.seedCode}</div>
                            <div className={`truncate font-medium ${isDisabled ? 'text-gray-400' : 'text-gray-800'}`}>
                              {getSeedSourceVarietyName(s)}
                              {isFailed && <span className="ml-1 text-xs text-red-500">[已失败]</span>}
                            </div>
                            <div className="text-gray-600 truncate">{formatSeedFormDisplay((s as any).seedForm) || '—'}</div>
                            <div className={`font-medium ${s.availableCount <= 0 ? 'text-red-500' : s.availableCount < 10 ? 'text-amber-500' : 'text-gray-700'}`}>
                              {s.availableCount} {s.unit}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {/* 底部提示 */}
                  <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
                    共 {filteredSeedSources.length} 条 | 点击行选择 | 点击外部关闭
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 种源形态（只读自动带入） — 2026-07-23：原"来源类型"改名"种源形态"，数据源改为种源 seedForm */}
          <div>
            <Label className="text-gray-700">种源形态</Label>
            <Input
              type="text"
              value={formatSeedFormDisplay(formData.seedForm) || '请先选择种源'}
              readOnly
              className={`${deepInputClass} bg-gray-100 text-gray-600`}
            />
          </div>

          {/* 种源来源/原始供应商（只读自动带入）
              2026-10-17：原「供应商」列改名并改为口径展示 —— 有原始供应商显示供应商，
              没有（如种植留种回流）显示来源途径中文，与内部种源列表两列口径一致 */}
          <div>
            <Label className="text-gray-700">种源来源/原始供应商</Label>
            <Input
              type="text"
              value={selectedSource ? getSeedSourceOriginOrSupplier(selectedSource) : '请先选择种源'}
              readOnly
              className={`${deepInputClass} bg-gray-100 text-gray-600`}
            />
          </div>

          {/* 作物品种：与种源列表"作物品种"列一致；2026-06-16 兜底：种源未填 cropVariety 时回退到 cropName（品种名） */}
          <div>
            <Label className="text-gray-900">
              作物品种 <span className="text-red-500">*</span>
            </Label>
            <div className={`${deepInputClass} bg-gray-100 text-gray-600 flex items-center min-h-[46px]`}>
              {formData.cropVariety || formData.cropName ? (
                <span>{formData.cropVariety || formData.cropName}</span>
              ) : (
                <span className="text-gray-400">请先选择种源</span>
              )}
            </div>
          </div>

          {/* 品种路径：与种源列表/育苗列表"品种路径"列 4 段格式保持一致 */}
          <div className="col-span-2">
            <Label className="text-gray-700">品种路径</Label>
            <div className={`${deepInputClass} bg-gray-100 text-gray-600 flex items-center gap-1 flex-wrap min-h-[46px]`}>
              {fullVarietyPath ? (
                <>
                  <span className="text-gray-400">{fullVarietyPath.categoryName}</span>
                  <span className="text-gray-400">-</span>
                  <span className="text-gray-700">{fullVarietyPath.typeName}</span>
                  <span className="text-gray-400">-</span>
                  <span className="text-gray-700">{fullVarietyPath.varietyName}</span>
                  {fullVarietyPath.subVariety1Name && (
                    <>
                      <span className="text-gray-400">-</span>
                      <span className="text-gray-900 font-medium">{fullVarietyPath.subVariety1Name}</span>
                    </>
                  )}
                </>
              ) : (
                <span className="text-gray-400">请先选择种源</span>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}
