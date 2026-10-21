/**
 * 目标病虫害选择器（多选）
 *
 * 2026-10-21 抽取自「病虫害管理 → 新增防治记录」（AddPestControlModal.tsx）。
 * 抽取原因：农事任务的「病虫害防治 - 详细配置」需要与防治记录完全一致的
 *   目标病虫害选择方式（病害/虫害 Tab + 搜索下拉多选 + 已选 chip），
 *   内联两套实现必然漂移，故抽成共享组件，两处引用同一份。
 *
 * 数据源：pestDiseaseStore（病虫害字典，dictType 区分 pest=虫害 / disease=病害）
 * 值域：string[]（存储的是字典项的 dictName，与防治记录表 targetPests 字段同口径）
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button, Input, Label } from '@/components/ui';
import { deepInputClass } from '@/components/common/deepInputClass';
import { usePestDiseaseDictStore } from '@/stores';

interface TargetPestPickerProps {
  /** 已选病虫害名称数组（存 dictName） */
  value: string[];
  /** 值变化回调 */
  onChange: (names: string[]) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /**
   * 是否显示必填红星。
   * 2026-10-21：任务配置侧（ConfigFieldRenderer）对自带标题的字段不重复渲染外层 Label，
   *   红星需要由本组件自己显示，否则必填标记会随外层 Label 一起消失。
   */
  required?: boolean;
}

export function TargetPestPicker({ value, onChange, disabled, required }: TargetPestPickerProps) {
  const pestDiseaseStore = usePestDiseaseDictStore();
  const [pestTabType, setPestTabType] = useState<'pest' | 'disease'>('pest');
  const [pestSearchKeyword, setPestSearchKeyword] = useState('');
  const [showPestSearch, setShowPestSearch] = useState(false);
  const pestSearchRef = useRef<HTMLDivElement>(null);

  // 打开即加载病虫害字典
  useEffect(() => {
    pestDiseaseStore.fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 点击外部关闭下拉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pestSearchRef.current && !pestSearchRef.current.contains(e.target as Node)) {
        setShowPestSearch(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 字典过滤（按 tab 类型 + 关键字 + 状态）
  const pestDictOptions = useMemo(() => {
    const items = pestDiseaseStore.items.filter((d: any) => d.status === 'active' || !d.status);
    const typed = items.filter((d: any) => d.dictType === pestTabType);
    if (!pestSearchKeyword.trim()) return typed;
    const kw = pestSearchKeyword.toLowerCase();
    return typed.filter(
      (d: any) =>
        (d.dictName || '').toLowerCase().includes(kw) ||
        (d.dictCode || '').toLowerCase().includes(kw)
    );
  }, [pestSearchKeyword, pestTabType, pestDiseaseStore.items]);

  /** 勾选/取消（勾选后自动收起下拉，避免遮挡已选 chip） */
  const togglePest = useCallback(
    (dictName: string) => {
      onChange(value.includes(dictName) ? value.filter((n) => n !== dictName) : [...value, dictName]);
      setShowPestSearch(false);
    },
    [value, onChange]
  );

  const removePest = useCallback(
    (dictName: string) => onChange(value.filter((n) => n !== dictName)),
    [value, onChange]
  );

  const isPestTab = pestTabType === 'pest';

  return (
    <div ref={pestSearchRef} className="relative">
      <div className="grid grid-cols-2 gap-4">
        {/* 左半：Label + Tab + 搜索框 */}
        <div className="flex flex-col">
          <Label className="text-gray-900 mb-1">
            目标病虫害 {required && <span className="text-red-500">*</span>}{' '}
            <span className="text-gray-500 text-xs">（多选，可同时防病害+虫害）</span>
          </Label>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 shrink-0">
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  setPestTabType('pest');
                  setShowPestSearch(true);
                }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
                  isPestTab ? 'bg-orange-500 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🐛 虫害
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  setPestTabType('disease');
                  setShowPestSearch(true);
                }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
                  isPestTab ? 'text-gray-600 hover:text-gray-900' : 'bg-purple-500 text-white'
                }`}
              >
                🦠 病害
              </button>
            </div>
            <Input
              type="text"
              disabled={disabled}
              value={pestSearchKeyword}
              onChange={(e) => {
                setPestSearchKeyword(e.target.value);
                setShowPestSearch(true);
              }}
              onFocus={() => setShowPestSearch(true)}
              placeholder={isPestTab ? '搜索虫害名称...' : '搜索病害名称...'}
              className={`flex-1 ${deepInputClass} rounded-l-lg`}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled}
              onClick={() => setShowPestSearch(!showPestSearch)}
              className="border border-l-0 border-gray-400 rounded-l-none rounded-r-lg shrink-0"
            >
              <Search className="w-4 h-4 text-gray-500" />
            </Button>
          </div>
        </div>
        {/* 右半：已选 chip */}
        <div className="flex flex-col">
          <Label className="text-gray-900 mb-1">
            已选病虫害 <span className="text-gray-500 text-xs">（{value.length} 个）</span>
          </Label>
          <div className={`${deepInputClass} min-h-[42px] flex flex-wrap items-center gap-1.5 px-2 py-1`}>
            {value.length > 0 ? (
              value.map((name) => {
                const matched = pestDiseaseStore.items.find((d: any) => d.dictName === name);
                const isPest = matched?.dictType === 'pest';
                return (
                  <span
                    key={name}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${
                      isPest
                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : 'bg-purple-50 text-purple-700 border-purple-200'
                    }`}
                  >
                    {name}
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => removePest(name)}
                      className="hover:bg-white/50 rounded-full w-3 h-3 flex items-center justify-center"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                );
              })
            ) : (
              <span className="text-gray-400 text-sm">请从左侧选择病虫害</span>
            )}
          </div>
        </div>
      </div>
      {/* 下拉选项 */}
      {showPestSearch && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {pestDictOptions.length > 0 ? (
            pestDictOptions.map((d: any) => {
              const selected = value.includes(d.dictName);
              return (
                <Button
                  key={d.id}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePest(d.dictName)}
                  className={`w-full justify-start rounded-none border-b border-gray-100 last:border-b-0 ${
                    selected ? 'bg-emerald-50' : ''
                  }`}
                >
                  <span
                    className={`w-4 h-4 mr-2 rounded border-2 flex items-center justify-center shrink-0 ${
                      selected
                        ? isPestTab
                          ? 'bg-orange-500 border-orange-500'
                          : 'bg-purple-500 border-purple-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {selected && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2 6L5 9L10 3"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="text-sm text-gray-800 flex-1 text-left">{d.dictName}</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded shrink-0 ml-2 ${
                      isPestTab ? 'bg-orange-100 text-orange-600' : 'bg-purple-100 text-purple-600'
                    }`}
                  >
                    {isPestTab ? '虫害' : '病害'}
                  </span>
                </Button>
              );
            })
          ) : (
            <div className="p-4 text-center text-sm text-gray-400">
              暂无{isPestTab ? '虫害' : '病害'}字典数据，请到系统设置→病虫害字典添加
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TargetPestPicker;