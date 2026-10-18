/**
 * 育苗新增弹窗 — 场地与计划区
 * 2026-10-18：从 AddModal.tsx 拆出（纯移动，无逻辑变更）
 */
import type { Dispatch, SetStateAction } from 'react';
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, DatePicker } from '@/components/ui';
import { DictSelect } from '../../../../common/settings/DictSelect';
import { SEEDLING_FORM_MAP } from '../../../../../constants/cropConstants';
import { todayLocal } from '@/lib/dateUtils';
import type { AddFormData } from './types';
import { deepInputClass } from './helpers';

interface SitePlanSectionProps {
  formData: AddFormData;
  setFormData: Dispatch<SetStateAction<AddFormData>>;
  sites: Array<{ value: string; label: string }>;
  seedlingCycle: number;
  handleSiteChange: (siteId: string) => void;
  handleSeedlingTypeChange: (type: string) => void;
}

export function SitePlanSection({
  formData,
  setFormData,
  sites,
  seedlingCycle,
  handleSiteChange,
  handleSeedlingTypeChange,
}: SitePlanSectionProps) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-900 pb-2 mb-3 border-b border-gray-200">场地与计划</h3>
      <div className="grid grid-cols-2 gap-4">
        {/* 育苗区域 */}
        <div>
          <Label className="text-gray-900">
            育苗区域 <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.siteId}
            onValueChange={(val) => handleSiteChange(val)}
          >
            <SelectTrigger className={deepInputClass}>
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              {sites.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 育苗方式 */}
        <div>
          <Label className="text-gray-900">
            育苗方式 <span className="text-red-500">*</span>
          </Label>
          <DictSelect
            category="seedling_type"
            value={formData.seedlingType}
            onChange={(value) => handleSeedlingTypeChange(value)}
            placeholder="请选择育苗方式"
          />
        </div>

        {/* 2026-07-23：必填 — 描述"这次育苗产出的种苗是什么形态"（花朵/枝条/裸根苗/穴盘苗 等），入库后写入详情弹窗"种苗类型"列 */}
        <div>
          <Label className="text-gray-900">
            育苗后形态 <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.seedlingForm || '__none__'}
            onValueChange={(v) => setFormData({ ...formData, seedlingForm: v === '__none__' ? '' : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="请选择育苗后形态（必填）" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SEEDLING_FORM_MAP).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 其他育苗方式输入框（占满整行） */}
        {formData.seedlingType === '其他' && (
          <div className="col-span-2">
            <Label className="text-gray-900">
              其他方式说明 <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              value={formData.seedlingTypeOther}
              onChange={(e) => setFormData({ ...formData, seedlingTypeOther: e.target.value })}
              className={deepInputClass}
              placeholder="请输入具体的育苗方式"
            />
          </div>
        )}

        {/* 2026-07-01 P1-6 修复：单位选择器改为 DictSelect（category="unit"），跨页统一 */}
        <div>
          <Label className="text-gray-900">
            单位 <span className="text-red-500">*</span>
          </Label>
          <DictSelect
            category="unit"
            value={formData.unit}
            onChange={(value) => setFormData({ ...formData, unit: value })}
            placeholder="选择单位"
          />
        </div>

        {/* 2026-07-23：删除计划类型字段（业务上不需要，育苗计划类型由生产计划批次决定） */}

        {/* 开始日期 */}
        <div>
          <Label className="text-gray-900">
            开始日期 <span className="text-red-500">*</span>
          </Label>
          <DatePicker className="w-full"
            selected={formData.startDate ? new Date(formData.startDate) : undefined}
            onChange={(date) => {
              const startDate = todayLocal(date);
              // 2026-10-17：开始日期后移导致已选结束日期不再晚于开始日期时，自动清空，避免留下非法区间
              setFormData(prev => ({
                ...prev,
                startDate,
                expectedEndDate: prev.expectedEndDate && prev.expectedEndDate <= startDate ? '' : prev.expectedEndDate,
              }));
            }}
          />
        </div>

        {/* 预计结束日期 */}
        <div>
          <Label className="text-gray-900">预计结束日期</Label>
          <DatePicker className="w-full"
            selected={formData.expectedEndDate ? new Date(formData.expectedEndDate) : undefined}
            // 2026-10-17：日历层面禁选「开始日期及更早」的日期，从根上避免选到不合理的结束日期
            disabledDays={formData.startDate
              ? (date: Date) => date <= new Date(`${formData.startDate}T00:00:00`)
              : undefined}
            onChange={(date) => setFormData({ ...formData, expectedEndDate: todayLocal(date) })}
          />
        </div>

        {/* 育苗周期（自动计算） */}
        <div>
          <Label className="text-gray-700">育苗周期（天）</Label>
          <Input
            type="text"
            value={seedlingCycle > 0 ? `${seedlingCycle}天` : '请选择日期'}
            readOnly
            className={`${deepInputClass} bg-gray-100 text-gray-600`}
          />
        </div>

        {/* 2026-07-23：删除育苗工时字段（业务上不需要，估时数据由生产环节跟踪） */}
      </div>
    </div>
  );
}
