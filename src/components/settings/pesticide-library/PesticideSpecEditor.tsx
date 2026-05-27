/**
 * 药剂规格编辑器组件
 * 支持动态添加/删除规格行，每行包含：含量、剂型、生产厂家、建议用量、建议稀释比例
 */
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';

export interface PesticideSpecItem {
  specContent: string;
  formulation: string;
  manufacturer: string;
  suggestedDosage: string;
  suggestedRatio: string;
  dosageUnit: string;
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
              className="grid grid-cols-6 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 relative"
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
                <Input
                  type="text"
                  value={spec.formulation}
                  onChange={(e) => handleSpecChange(index, 'formulation', e.target.value)}
                  placeholder="如 可湿性粉剂"
                  disabled={disabled}
                  className="h-9 text-sm"
                />
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
                <Input
                  type="text"
                  value={spec.dosageUnit}
                  onChange={(e) => handleSpecChange(index, 'dosageUnit', e.target.value)}
                  placeholder="g/L"
                  disabled={disabled}
                  className="h-9 text-sm"
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
