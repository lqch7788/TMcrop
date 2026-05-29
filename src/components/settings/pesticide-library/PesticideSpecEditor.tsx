/**
 * 药剂规格编辑器组件
 * 支持动态添加/删除规格行，每行包含：含量、剂型、生产厂家、建议用量、建议稀释比例
 */
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../ui/select';
import { UnitDictSelect } from '@/components/common/settings/UnitDictSelect';

// 农药剂型选项（完整列表）
const FORMULATION_OPTIONS = [
  { value: '可湿性粉剂', label: '可湿性粉剂 (WP)' },
  { value: '水分散粒剂', label: '水分散粒剂 (WDG)' },
  { value: '悬浮剂', label: '悬浮剂 (SC)' },
  { value: '乳油', label: '乳油 (EC)' },
  { value: '水剂', label: '水剂 (AS)' },
  { value: '可溶性粉剂', label: '可溶性粉剂 (SP)' },
  { value: '颗粒剂', label: '颗粒剂 (GR)' },
  { value: '微胶囊悬浮剂', label: '微胶囊悬浮剂 (CS)' },
  { value: '油剂', label: '油剂 (OL)' },
  { value: '粉剂', label: '粉剂 (DP)' },
  { value: '片剂', label: '片剂 (WT)' },
  { value: '烟剂', label: '烟剂 (FU)' },
  { value: '气雾剂', label: '气雾剂 (AE)' },
  { value: '蚊香', label: '蚊香 (CO)' },
  { value: '饵剂', label: '饵剂 (RB)' },
  { value: '胶饵', label: '胶饵 (GL)' },
  { value: '悬浮种衣剂', label: '悬浮种衣剂 (FS)' },
  { value: '种子处理悬浮剂', label: '种子处理悬浮剂 (SS)' },
  { value: '泡腾片剂', label: '泡腾片剂 (EB)' },
  { value: '水乳剂', label: '水乳剂 (EW)' },
  { value: '微乳剂', label: '微乳剂 (ME)' },
  { value: '悬乳剂', label: '悬乳剂 (SE)' },
  { value: '可分散油悬浮剂', label: '可分散油悬浮剂 (OD)' },
  { value: '乳粒剂', label: '乳粒剂 (EG)' },
  { value: '缓释剂', label: '缓释剂 (BR)' },
  { value: '可分散液剂', label: '可分散液剂 (DC)' },
  { value: '可湿性粒剂', label: '可湿性粒剂 (WG)' },
  { value: '可溶液剂', label: '可溶液剂 (SL)' },
  { value: '膏剂', label: '膏剂 (PA)' },
  { value: '其他', label: '其他' },
];

export interface PesticideSpecItem {
  id?: string; // 已有规格的ID（新增规格没有ID）
  specContent: string;
  formulation: string;
  manufacturer: string;
  suggestedDosage: string;
  suggestedRatio: string;
  dosageUnit: string;
  mechanism: string; // 作用机制
  brandName: string; // 品牌名称
  remark: string; // 备注
}

interface PesticideSpecEditorProps {
  specs: PesticideSpecItem[];
  onChange: (specs: PesticideSpecItem[]) => void;
  disabled?: boolean;
}

export function PesticideSpecEditor({ specs, onChange, disabled = false }: PesticideSpecEditorProps) {
  // 添加新规格行
  const handleAddSpec = () => {
    const newSpec: PesticideSpecItem = {
      specContent: '',
      formulation: '',
      manufacturer: '',
      suggestedDosage: '',
      suggestedRatio: '',
      dosageUnit: 'g/L',
      mechanism: '',
      brandName: '',
      remark: '',
    };
    onChange([...specs, newSpec]);
  };

  // 删除规格行
  const handleDeleteSpec = (index: number) => {
    const newSpecs = specs.filter((_, i) => i !== index);
    onChange(newSpecs);
  };

  // 更新规格行字段
  const handleSpecChange = (index: number, field: keyof PesticideSpecItem, value: string) => {
    const newSpecs = specs.map((spec, i) => {
      if (i === index) {
        return { ...spec, [field]: value };
      }
      return spec;
    });
    onChange(newSpecs);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-gray-900 font-medium">规格信息</Label>
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddSpec}
          >
            <Plus className="w-4 h-4" />
            添加规格
          </Button>
        )}
      </div>

      {specs.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-300 rounded-lg">
          暂无规格，点击"添加规格"新增
        </div>
      ) : (
        <div className="space-y-3">
          {specs.map((spec, index) => (
            <div
              key={index}
              className="grid grid-cols-8 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 relative"
            >
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteSpec(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 hover:bg-red-200 text-red-600 rounded-full"
                  title="删除此规格"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}

              {/* 品牌名称 */}
              <div>
                <Label className="text-xs text-gray-500">品牌名称</Label>
                <Input
                  type="text"
                  value={spec.brandName}
                  onChange={(e) => handleSpecChange(index, 'brandName', e.target.value)}
                  placeholder="如 大生"
                  disabled={disabled}
                  className="h-9 text-sm"
                />
              </div>

              {/* 含量 */}
              <div>
                <Label className="text-xs text-gray-500">含量</Label>
                <Input
                  type="text"
                  value={spec.specContent}
                  onChange={(e) => handleSpecChange(index, 'specContent', e.target.value)}
                  placeholder="如 50%"
                  disabled={disabled}
                  className="h-9 text-sm"
                />
              </div>

              {/* 剂型 */}
              <div>
                <Label className="text-xs text-gray-500">剂型</Label>
                <Select
                  value={spec.formulation || ''}
                  onValueChange={(value) => handleSpecChange(index, 'formulation', value)}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="选择剂型" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMULATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 生产厂家 */}
              <div>
                <Label className="text-xs text-gray-500">生产厂家</Label>
                <Input
                  type="text"
                  value={spec.manufacturer}
                  onChange={(e) => handleSpecChange(index, 'manufacturer', e.target.value)}
                  placeholder="生产厂家"
                  disabled={disabled}
                  className="h-9 text-sm"
                />
              </div>

              {/* 建议用量 */}
              <div>
                <Label className="text-xs text-gray-500">建议用量</Label>
                <Input
                  type="text"
                  value={spec.suggestedDosage}
                  onChange={(e) => handleSpecChange(index, 'suggestedDosage', e.target.value)}
                  placeholder="如 1000"
                  disabled={disabled}
                  className="h-9 text-sm"
                />
              </div>

              {/* 单位 */}
              <div>
                <Label className="text-xs text-gray-500">单位</Label>
                <UnitDictSelect
                  value={spec.dosageUnit}
                  onChange={(value) => handleSpecChange(index, 'dosageUnit', value)}
                  disabled={disabled}
                  placeholder="选择单位"
                />
              </div>

              {/* 建议稀释比例 */}
              <div>
                <Label className="text-xs text-gray-500">稀释比例</Label>
                <Input
                  type="text"
                  value={spec.suggestedRatio}
                  onChange={(e) => handleSpecChange(index, 'suggestedRatio', e.target.value)}
                  placeholder="如 1:1000"
                  disabled={disabled}
                  className="h-9 text-sm"
                />
              </div>

              {/* 作用机制 */}
              <div>
                <Label className="text-xs text-gray-500">作用机制</Label>
                <Input
                  type="text"
                  value={spec.mechanism}
                  onChange={(e) => handleSpecChange(index, 'mechanism', e.target.value)}
                  placeholder="如 接触毒杀"
                  disabled={disabled}
                  className="h-9 text-sm"
                />
              </div>

              {/* 备注 */}
              <div>
                <Label className="text-xs text-gray-500">备注</Label>
                <Input
                  type="text"
                  value={spec.remark}
                  onChange={(e) => handleSpecChange(index, 'remark', e.target.value)}
                  placeholder="补充说明"
                  disabled={disabled}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
