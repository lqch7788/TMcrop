import { Modal, FormField, Input, Select, Textarea } from '../../ui/Modal';
import { Button } from '@/components/ui/button';
import { CropBatch, Greenhouse, CropType, PlanType, PlanTypeLabels, PlanTypeColors } from '../../../types';
import { RESPONSIBLE_PERSONS, planTypeOptions, getModesByPlanType } from '../constants';
import { useState, useRef, useEffect } from 'react';
import { Upload, Search, X } from 'lucide-react';
import { searchVarieties, getVarietyByCode, CropVarietySearchResult } from '../../../services/cropVarietyService';

interface CreateBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDraft: () => void;
  onSubmitForApproval: () => void;
  formData: {
    batchCode: string;
    planType: PlanType;  // 计划类型
    planTypeName: string;  // 计划类型名称
    cropCode: string;  // 作物编码（11位）
    cropName: string;
    variety: string;
    greenhouseId: string;
    plantingArea: string;
    startDate: string;
    expectedHarvestDate: string;
    targetYield: string;
    plantingMode: string;
    responsiblePerson: string;
    publisher: string;
    description: string;
    planDetail: string;
  };
  errors: Record<string, string>;
  greenhouses: Greenhouse[];
  cropTypes: CropType[];
  plantingModes: { id: string; name: string; description: string }[];
  onFormChange: (field: string, value: any) => void;
  onGenerateCode: () => void;
}

export function CreateBatchModal({
  isOpen,
  onClose,
  onSaveDraft,
  onSubmitForApproval,
  formData,
  errors,
  greenhouses,
  cropTypes,
  plantingModes,
  onFormChange,
  onGenerateCode,
}: CreateBatchModalProps) {
  // 作物品种搜索状态
  const [varietySearch, setVarietySearch] = useState('');
  const [searchResults, setSearchResults] = useState<CropVarietySearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // 处理作物品种搜索
  const handleVarietySearch = (keyword: string) => {
    setVarietySearch(keyword);
    if (keyword.trim()) {
      const results = searchVarieties(keyword);
      setSearchResults(results.slice(0, 10)); // 最多显示10条
      setShowDropdown(true);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  // 选择作物品种 - 根据匹配字段决定填充的值
  const handleVarietySelect = (result: CropVarietySearchResult) => {
    const variety = result.variety;
    // 填充作物编码（11位编码）
    onFormChange('cropCode', variety.cropCode);
    // 根据匹配字段决定填充的品种名称
    // subVariety1Name是最细化的名称，其次是varietyName
    let selectedName = variety.varietyName;
    if (result.matchField === 'subVariety1Name' && variety.subVariety1Name) {
      selectedName = variety.subVariety1Name;
    } else if (result.matchField === 'varietyName') {
      selectedName = variety.varietyName;
    } else if (result.matchField === 'alias' && result.matchText) {
      selectedName = result.matchText;
    }
    // 填充作物品种（用户选择的名称）
    onFormChange('variety', selectedName);
    // 填充作物名称（用于显示，这里用主品种名）
    onFormChange('cropName', variety.varietyName);
    setVarietySearch(selectedName);
    setShowDropdown(false);
  };

  // 清除选择
  const handleVarietyClear = () => {
    setVarietySearch('');
    onFormChange('cropCode', '');
    onFormChange('variety', '');
    onFormChange('cropName', '');
    setSearchResults([]);
    setShowDropdown(false);
  };

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 初始化时如果已经有cropCode，显示品种信息
  useEffect(() => {
    if (formData.cropCode && !varietySearch) {
      const variety = getVarietyByCode(formData.cropCode);
      if (variety) {
        setVarietySearch(variety.varietyName);
      }
    }
  }, [formData.cropCode]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="新增生产计划批次"
      size="xl"
      showFooter={true}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onSaveDraft}>
            存为草稿
          </Button>
          <Button onClick={onSubmitForApproval}>
            提交审批
          </Button>
        </div>
      }
    >
      <div className="space-y-4 modal-form-inputs">
        {/* 计划类型和生产计划批次号同一行 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="计划类型" required>
            <div className="flex gap-4 flex-wrap">
              {planTypeOptions.map((option) => {
                const isSelected = formData.planType === option.value;
                return (
                  <div
                    key={option.value}
                    onClick={() => {
                      onFormChange('planType', option.value);
                      onFormChange('planTypeName', option.label);
                    }}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border-2 transition-all
                      ${isSelected
                        ? `border-emerald-500 ${option.color.bg} ${option.color.text}`
                        : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'}
                    `}
                  >
                    <span className="font-medium">{option.label}</span>
                  </div>
                );
              })}
            </div>
          </FormField>

          <FormField label="生产计划批次号" required error={errors.batchCode}>
            <div className="flex gap-2">
              <Input
                value={formData.batchCode}
                onChange={(e) => onFormChange('batchCode', e.target.value)}
                placeholder="例如：FQ2024-001"
                error={!!errors.batchCode}
              />
              <Button size="sm" onClick={onGenerateCode}>
                生成
              </Button>
            </div>
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 作物品种搜索 - 可搜索的下拉框 */}
          <FormField label="作物品种" required error={errors.variety}>
            <div className="relative" ref={searchRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={varietySearch}
                  onChange={(e) => handleVarietySearch(e.target.value)}
                  onFocus={() => varietySearch && setShowDropdown(true)}
                  placeholder="搜索作物品种..."
                  className="pl-9 pr-8"
                />
                {varietySearch && (
                  <button
                    type="button"
                    onClick={handleVarietyClear}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
              {/* 搜索结果下拉框 */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <div
                      key={`${result.variety.id}-${index}`}
                      onClick={() => handleVarietySelect(result)}
                      className="px-3 py-2 hover:bg-emerald-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {result.matchField === 'subVariety1Name' && (
                          <span className="text-emerald-600 mr-1">{result.matchText}</span>
                        )}
                        {result.matchField === 'varietyName' && (
                          <span className="text-blue-600 mr-1">{result.matchText}</span>
                        )}
                        {result.matchField === 'cropCode' && (
                          <span className="text-orange-600 mr-1">{result.variety.varietyName}</span>
                        )}
                        {result.matchField === 'alias' && (
                          <span className="text-purple-600 mr-1">{result.matchText}</span>
                        )}
                        <span className="text-gray-400">({result.variety.categoryName} &gt; {result.variety.typeName})</span>
                      </div>
                      <div className="text-xs text-orange-600 font-mono mt-1">{result.variety.cropCode}</div>
                    </div>
                  ))}
                </div>
              )}
              {showDropdown && searchResults.length === 0 && varietySearch && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-4 text-sm text-gray-500 text-center">
                  未找到匹配的作物品种
                </div>
              )}
            </div>
          </FormField>

          {/* 作物编码 - 只读显示 */}
          <FormField label="作物编码" error={errors.cropCode}>
            <Input
              value={formData.cropCode || ''}
              placeholder="选择品种后自动填充"
              disabled
              className="bg-gray-50 font-mono"
            />
          </FormField>

          <FormField label="种植区域" required error={errors.greenhouseId}>
            <Select
              value={formData.greenhouseId}
              onChange={(e) => onFormChange('greenhouseId', e.target.value)}
              options={greenhouses.filter(g => g.status === 'active').map(g => ({ value: g.id, label: g.name }))}
            />
          </FormField>

          <FormField label="种植面积（m²）" required error={errors.plantingArea}>
            <Input
              value={formData.plantingArea}
              onChange={(e) => {
                const val = e.target.value.replace(/[^\d.]/g, '');
                const parts = val.split('.');
                let formatted = parts[0];
                if (parts.length > 1) {
                  formatted += '.' + parts[1].slice(0, 2);
                }
                onFormChange('plantingArea', formatted);
              }}
              placeholder="例如：1000或1500.50"
            />
          </FormField>

          <FormField label="生产模式" required error={errors.plantingMode}>
            <Select
              value={formData.plantingMode}
              onChange={(e) => onFormChange('plantingMode', e.target.value)}
              options={getModesByPlanType(formData.planType)}
            />
          </FormField>

          <FormField label="开始时间" required error={errors.startDate}>
            <Input
              type="date"
              value={formData.startDate}
              onChange={(e) => onFormChange('startDate', e.target.value)}
            />
          </FormField>

          <FormField label="预计结束时间" required error={errors.expectedHarvestDate}>
            <Input
              type="date"
              value={formData.expectedHarvestDate}
              onChange={(e) => onFormChange('expectedHarvestDate', e.target.value)}
            />
          </FormField>

          <FormField label="目标产量" required error={errors.targetYield}>
            <Input
              value={formData.targetYield}
              onChange={(e) => onFormChange('targetYield', e.target.value)}
              placeholder="例如：10000或10000kg"
            />
          </FormField>

          <FormField label="负责人" required error={errors.responsiblePerson}>
            <Select
              value={formData.responsiblePerson}
              onChange={(e) => onFormChange('responsiblePerson', e.target.value)}
              options={RESPONSIBLE_PERSONS.map(name => ({ value: name, label: name }))}
            />
          </FormField>

          <FormField label="发布人">
            <Input
              value={formData.publisher}
              disabled
              className="bg-blue-50 text-blue-700 font-medium"
            />
          </FormField>

          <FormField label="版本号">
            <Input
              value="V1.0"
              disabled
              className="bg-gray-100 cursor-not-allowed"
            />
          </FormField>

          <FormField label="备注说明">
            <Textarea
              value={formData.description}
              onChange={(e) => onFormChange('description', e.target.value)}
              placeholder="输入相关的备注信息..."
            />
          </FormField>

          <FormField label="计划详细说明">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="blue"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.txt,.md,.docx';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        onFormChange('planDetail', event.target?.result as string);
                        // 从文件名生成计划详情文件名
                        const fileName = file.name;
                        onFormChange('planDetailFileName', fileName);
                      };
                      reader.readAsText(file);
                    }
                  };
                  input.click();
                }}
              >
                <Upload className="w-3 h-3" />
                导入文件
              </Button>
              <span className="text-xs text-gray-500">支持 .txt, .md, .docx 格式文件</span>
            </div>
          </FormField>
        </div>
      </div>
    </Modal>
  );
}
