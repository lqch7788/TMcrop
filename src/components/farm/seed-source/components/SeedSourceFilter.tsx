/**
 * 种源筛选工具栏组件
 * 方案1.3: 添加"更多筛选"弹窗 — 作物类型→作物名称级联、组织→记录人级联、剩余数量范围
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, RotateCcw, Filter } from 'lucide-react';
import { Button } from '../../../ui/button';
import { SeedSourceFilters, SourceType, PropagationType, PropagationStatus } from '../../../../types/crop';
import { useDictionaryStore, getDictItems } from '../../../../stores/useDictionaryStore';
import { useDepartmentStore } from '../../../../stores/useDepartmentStore';
import { useUserStore } from '../../../../stores/useUserStore';
import { Input } from '../../../ui/input';
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

interface SeedSourceFilterProps {
  filters: SeedSourceFilters;
  onChange: (filters: SeedSourceFilters) => void;
  onSearch: () => void;
  onReset: () => void;
  cropCategories: Array<{ value: string; label: string }>;
  suppliers: Array<{ value: string; label: string }>;
  statusOptions: Array<{ value: string; label: string }>;
}

export function SeedSourceFilter({
  filters,
  onChange,
  onSearch,
  onReset,
  cropCategories,
  suppliers,
  statusOptions
}: SeedSourceFilterProps) {
  // 更多筛选弹窗状态
  const [showAdvanced, setShowAdvanced] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // 从 Store 获取级联数据
  const departments = useDepartmentStore((s) => s.departments);
  const loadDepartments = useDepartmentStore((s) => s.loadDepartments);
  const users = useUserStore((s) => s.users);
  const loadUsers = useUserStore((s) => s.loadUsers);

  // 作物类型选项（从字典）
  const cropTypes = getDictItems('crop_category');

  // 加载级联数据
  useEffect(() => {
    if (showAdvanced) {
      loadDepartments();
      loadUsers();
    }
  }, [showAdvanced, loadDepartments, loadUsers]);

  // 根据组织过滤记录人
  const filteredUsers = filters.orgId
    ? users.filter((u: any) => u.orgOid === filters.orgId)
    : users;

  // 点击外部关闭弹窗
  useEffect(() => {
    if (!showAdvanced) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setShowAdvanced(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAdvanced]);

  // 更新单个高级筛选字段
  const updateAdvanced = (patch: Partial<SeedSourceFilters>) => {
    onChange({ ...filters, ...patch });
  };

  // 是否有高级筛选激活
  const hasAdvancedFilter = filters.cropType || filters.orgId || filters.recorderId ||
    filters.surplusMin !== undefined || filters.surplusMax !== undefined;

  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        {/* 作物品种 */}
        <div className="flex-1 min-w-[150px]">
          <Label className="text-gray-700">作物品种</Label>
          <Input
            type="text"
            value={filters.cropName}
            onChange={(e) => onChange({ ...filters, cropName: e.target.value })}
            placeholder="请输入作物品种"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 种源批号 */}
        <div className="flex-1 min-w-[150px]">
          <Label className="text-gray-700">种源批号</Label>
          <Input
            type="text"
            value={filters.seedCode}
            onChange={(e) => onChange({ ...filters, seedCode: e.target.value })}
            placeholder="请输入种源批号"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 种源类型 */}
        <div className="min-w-[120px]">
          <Label className="text-gray-700">种源类型</Label>
          <Select
            value={filters.sourceType}
            onValueChange={(val) => onChange({ ...filters, sourceType: val })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              <SelectItem value={SourceType.SEED}>种子</SelectItem>
              <SelectItem value={SourceType.SEEDLING}>种苗</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 供应商 */}
        <div className="min-w-[150px]">
          <Label className="text-gray-700">供应商</Label>
          <Select
            value={filters.supplierName}
            onValueChange={(val) => onChange({ ...filters, supplierName: val })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              {suppliers.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 状态 */}
        <div className="min-w-[120px]">
          <Label className="text-gray-700">状态</Label>
          <Select
            value={filters.status}
            onValueChange={(val) => onChange({ ...filters, status: val })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              {statusOptions.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 入库方式（繁殖途径） */}
        <div className="min-w-[130px]">
          <Label className="text-gray-700">入库方式</Label>
          <Select
            value={filters.propagationType || ''}
            onValueChange={(val) => onChange({ ...filters, propagationType: val || undefined })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              <SelectItem value={PropagationType.EXTERNAL}>外购入库</SelectItem>
              <SelectItem value={PropagationType.BREEDING}>育种计划产出</SelectItem>
              <SelectItem value={PropagationType.SEED_SAVING}>种植留种</SelectItem>
              <SelectItem value={PropagationType.ASEXUAL}>无性繁殖</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 繁殖阶段 */}
        <div className="min-w-[120px]">
          <Label className="text-gray-700">繁殖阶段</Label>
          <Select
            value={filters.propagationStatus || ''}
            onValueChange={(val) => onChange({ ...filters, propagationStatus: val || undefined })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              <SelectItem value={PropagationStatus.PLANNED}>已计划</SelectItem>
              <SelectItem value={PropagationStatus.IN_PROGRESS}>进行中</SelectItem>
              <SelectItem value={PropagationStatus.HARVESTED}>已采收</SelectItem>
              <SelectItem value={PropagationStatus.QUALITY_CHECKED}>已质检</SelectItem>
              <SelectItem value={PropagationStatus.COMPLETED}>已入库</SelectItem>
              <SelectItem value={PropagationStatus.FAILED}>失败</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 采购/入库日期 */}
        <div className="min-w-[150px]">
          <Label className="text-gray-700">采购/入库日期</Label>
          <Input
            type="date"
            value={filters.startDate}
            onChange={(e) => onChange({ ...filters, startDate: e.target.value, endDate: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 创建人 */}
        <div className="min-w-[120px]">
          <Label className="text-gray-700">创建人</Label>
          <Input
            type="text"
            value={filters.createBy}
            onChange={(e) => onChange({ ...filters, createBy: e.target.value })}
            placeholder="请输入创建人"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 按钮行 */}
        <div className="flex gap-2 items-end">
          {/* 更多筛选按钮 */}
          <div className="relative">
            <Button
              ref={triggerRef}
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`h-10 font-medium ${
                hasAdvancedFilter
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200'
                  : ''
              }`}
            >
              <Filter className="w-4 h-4" />
              更多筛选
              {hasAdvancedFilter && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </Button>

            {/* 高级筛选 Popover */}
            {showAdvanced && (
              <div
                ref={popoverRef}
                className="absolute top-12 right-0 z-50 bg-white rounded-xl shadow-lg border border-gray-200 p-5 w-[480px]"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">高级筛选</h3>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => {
                      updateAdvanced({
                        cropType: '',
                        orgId: '',
                        recorderId: '',
                        surplusMin: undefined,
                        surplusMax: undefined,
                      });
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    清空高级筛选
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* 作物类型 → 作物名称级联 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-gray-600 text-xs">作物类型</Label>
                      <Select
                        value={filters.cropType || ''}
                        onValueChange={(val) => {
                          updateAdvanced({ cropType: val || undefined });
                        }}
                      >
                        <SelectTrigger className="w-full h-9 px-2.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500">
                          <SelectValue placeholder="全部" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">全部</SelectItem>
                          {cropTypes.map((t: any) => (
                            <SelectItem key={t.dictCode} value={t.dictCode}>{t.dictLabel}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-600 text-xs">作物名称</Label>
                      <Input
                        type="text"
                        value={filters.cropName}
                        onChange={(e) => updateAdvanced({ cropName: e.target.value })}
                        placeholder="按作物名称筛选"
                        className="w-full h-9 px-2.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* 组织 → 记录人级联 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-gray-600 text-xs">组织</Label>
                      <Select
                        value={filters.orgId || ''}
                        onValueChange={(val) => {
                          const orgId = val || undefined;
                          updateAdvanced({ orgId, recorderId: '' });
                        }}
                      >
                        <SelectTrigger className="w-full h-9 px-2.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500">
                          <SelectValue placeholder="全部" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">全部</SelectItem>
                          {departments.map((d: any) => (
                            <SelectItem key={d.oid || d.id} value={d.oid || d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-600 text-xs">记录人</Label>
                      <Select
                        value={filters.recorderId || ''}
                        onValueChange={(val) => updateAdvanced({ recorderId: val || undefined })}
                      >
                        <SelectTrigger className="w-full h-9 px-2.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500">
                          <SelectValue placeholder="全部" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">全部</SelectItem>
                          {filteredUsers.map((u: any) => (
                            <SelectItem key={u.oid || u.id} value={u.oid || u.id}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* 剩余数量范围 */}
                  <div>
                    <Label className="text-gray-600 text-xs">剩余数量范围</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={filters.surplusMin ?? ''}
                        onChange={(e) => updateAdvanced({
                          surplusMin: e.target.value ? Number(e.target.value) : undefined
                        })}
                        placeholder="最小值"
                        min="0"
                        className="w-full h-9 px-2.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-gray-400 text-xs">—</span>
                      <Input
                        type="number"
                        value={filters.surplusMax ?? ''}
                        onChange={(e) => updateAdvanced({
                          surplusMax: e.target.value ? Number(e.target.value) : undefined
                        })}
                        placeholder="最大值"
                        min="0"
                        className="w-full h-9 px-2.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 底部按钮 */}
                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowAdvanced(false)}
                  >
                    关闭
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Button
            variant="secondary"
            onClick={onReset}
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </Button>
          <Button
            variant="default"
            onClick={onSearch}
          >
            <Search className="w-4 h-4" />
            搜索
          </Button>
        </div>
      </div>
    </div>
  );
}
