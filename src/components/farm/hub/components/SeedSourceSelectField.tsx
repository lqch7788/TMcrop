/**
 * 种源搜索下拉 —— 任务类型配置字段（ConfigFieldType = 'seedSourceSelect'）的渲染器
 *
 * 背景（2026-10-21）：「定植 - 详细配置」的选择字段原名「苗种类」（现改名「种子/种苗名称」），
 *   原是 select + 7 个硬编码虚构选项
 *   （番茄苗 / 黄瓜苗 / 草莓苗…），与系统内实际存在的种源毫无关系，属于演示数据。
 *   改为关联内部种源列表：可按种源编号 / 作物品种 / 作物名称搜索，
 *   选项展示「种源编号 + 作物品种 + 可用数量」，可用量为 0 的置灰不可选。
 *
 * 数据口径全部复用现有实现，不另造轮子：
 *   - 服务：apiSeedSourceService.getSeedSources / searchSeedSources（与种植管理 AddModal 同源）
 *   - 类型：types/crop.ts#SeedSource
 *   - 形态中文化：constants/seedFormDict.resolveSeedFormLabel
 *   - 搜索控件：materialReturn/modals/SearchableSelect
 *
 * 存值口径：存种源 **ID**（与 planting AddModal 的 formData.sourceId 一致），
 *   种源编号只用于展示 —— 编号可能重复/变更，ID 才是稳定引用。
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Sprout, Loader2 } from 'lucide-react';
import { SearchableSelect } from '../../../materialReturn/modals/SearchableSelect';
import { getSeedSources, searchSeedSources } from '../../../../services/apiSeedSourceService';
import type { SeedSource } from '../../../../types/crop';
import { resolveSeedFormLabel } from '../../../../constants/seedFormDict';

interface SeedSourceSelectFieldProps {
  /** 选中的种源 ID */
  value: string;
  /** 值变化回调（回传种源 ID，清空时为 ''） */
  onChange: (seedSourceId: string) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 错误信息 */
  error?: string;
  /** 占位文本 */
  placeholder?: string;
}

/** 种源 → 下拉选项。
 *  2026-10-21（用户反馈修正）：选择框里显示的是**作物品种名称**，不是种源编号 ——
 *    编号只作副标题展示。品种名取不到时（历史脏数据）退回编号，避免出现空白触发框。 */
function toOption(s: SeedSource) {
  const available = Number(s.availableCount ?? 0);
  const varietyName = s.cropVariety || s.cropName || s.varietyName || '';
  return {
    value: String(s.id),
    label: varietyName || s.seedCode || String(s.id),
    description: `编号 ${s.seedCode || '—'} · 可用 ${available}${s.unit || ''}`,
    disabled: !(available > 0),
  };
}

export function SeedSourceSelectField({
  value,
  onChange,
  disabled,
  error,
  placeholder,
}: SeedSourceSelectFieldProps) {
  /** 全量种源：未输入关键词时展示，同时作为已选项回显的查找来源 */
  const [sources, setSources] = useState<SeedSource[]>([]);
  /** 已选中项快照：远程搜索换词后列表会变，靠它保证触发框仍能显示种源编号 */
  const [selected, setSelected] = useState<SeedSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  // 挂载时拉一次全量（用户规则：数据源唯一，不做本地缓存兜底）
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSeedSources()
      .then((list) => {
        if (!cancelled) setSources(list);
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : '种源列表加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 已选项回显：从全量列表里找；找不到时保留上一次快照（不在列表内的历史数据也能显示）
  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    const hit = sources.find((s) => String(s.id) === String(value));
    if (hit) setSelected(hit);
  }, [value, sources]);

  /** 远程搜索：关键词为空时 SearchableSelect 会回落到本地全量列表。
   *  必须返回映射后的 Option[]（而非原始 SeedSource[]）—— 否则远程结果的选项行
   *  会丢掉品种/可用量副标题，只有孤零零一行种源编号。 */
  const handleSearch = useCallback(async (keyword: string) => {
    if (!keyword || !keyword.trim()) return [];
    try {
      const list = await searchSeedSources(keyword);
      return list.map(toOption);
    } catch {
      return [];
    }
  }, []);

  // 已选项不在当前列表时补到首位，保证触发框的显示文本能解析出来
  const options = useMemo(() => {
    const list = sources.map(toOption);
    if (value && selected && !list.some((o) => o.value === String(value))) {
      return [toOption(selected), ...list];
    }
    return list;
  }, [sources, value, selected]);

  const handleChange = useCallback(
    (nextId: string) => {
      const hit = nextId ? sources.find((s) => String(s.id) === String(nextId)) ?? null : null;
      setSelected(hit);
      onChange(nextId);
    },
    [sources, onChange]
  );

  const available = Number(selected?.availableCount ?? 0);
  const formLabel = resolveSeedFormLabel(selected?.seedForm);

  return (
    <div>
      <div className="relative">
        <SearchableSelect
          value={value || ''}
          options={options}
          onChange={(nextId) => handleChange(nextId)}
          onSearch={handleSearch}
          disabled={disabled}
          placeholder={placeholder || '搜索：种源编号 / 作物品种 / 作物名称'}
        />
        {loading && (
          <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 animate-spin pointer-events-none" />
        )}
      </div>

      {/* 已选种源信息条：把用户关心的三项（编号 / 品种 / 可用量）一次说清，
          并明确「种子 or 种苗」的物理形态，避免与下方「种子/种苗用量」混淆 */}
      {selected && (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <Sprout className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-emerald-800 min-w-0">
            <div className="truncate">
              已选 <span className="font-mono font-medium">{selected.seedCode}</span>
              {/* cropName 与 cropVariety 常是同一个值（如「紫甘蓝」），
                  相同则不重复括号展示，避免出现「紫甘蓝（紫甘蓝）」 */}
              {selected.cropVariety && selected.cropVariety !== selected.cropName ? (
                <>
                  {selected.cropName && <> · {selected.cropName}</>}
                  <span className="text-emerald-600">（{selected.cropVariety}）</span>
                </>
              ) : (
                selected.cropName && <> · {selected.cropName}</>
              )}
            </div>
            <div className="text-xs text-emerald-700 mt-0.5">
              可用数量 <span className="font-medium">{available}</span> {selected.unit || ''}
              {formLabel && <> · 形态：{formLabel}</>}
              {available <= 0 && <span className="text-red-600">（该种源已用完，不可选用）</span>}
            </div>
          </div>
        </div>
      )}

      {loadError && <p className="mt-1 text-sm text-red-500">种源列表加载失败：{loadError}</p>}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}