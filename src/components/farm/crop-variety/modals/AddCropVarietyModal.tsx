/**
 * 新增作物品种弹窗
 * 支持多级子品种选择和动态新增
 */

import React, { useState, useMemo, useEffect } from 'react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { CropVariety, CropVarietyStatus } from '../../../../types/cropVariety';
import {
  getCategoryOptions,
  generateCropCode,
  getAllVarieties,
  getMaxDetailVarietyCode
} from '../../../../services/cropVarietyService';
import { useCropVarietyStore } from '../../../../stores/useCropVarietyStore';
import {
  getTypeOptionsByCategory,
  getVarietyOptionsByType,
  getSubVariety1Options as getSubVariety1OptionsFromExtension
} from '../../../../services/cropVarietyExtensionService';
import { Check, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { showAlert } from '@/lib/dialogService';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface AddCropVarietyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  // 预填充数据（从树形节点新增时）
  prefillData?: {
    categoryCode: string;
    categoryName: string;
    typeCode: string;
    typeName: string;
    varietyCode: string;
    varietyName: string;
    subVariety1Code?: string;
    subVariety1Name?: string;
  };
}

export function AddCropVarietyModal({
  isOpen,
  onClose,
  onSuccess,
  prefillData
}: AddCropVarietyModalProps) {
  // Zustand Store
  const store = useCropVarietyStore();

  const [formData, setFormData] = useState({
    categoryCode: '',
    categoryName: '',
    typeCode: '',
    typeName: '',
    varietyCode: '',
    varietyName: '',
    subVariety1Code: '',   // 子品种1代码（3位）
    subVariety1Name: '',   // 子品种1名称
    // 2026-07-26：详细品种层级已删除
    alias: '',
    image: '',            // 作物图片URL
    description: '',     // 特性描述
    germinationPeriod: undefined as number | undefined,  // 发芽期(天)
    seedlingPeriod: undefined as number | undefined,     // 育苗期(天)
    floweringPeriod: undefined as number | undefined,    // 开花期(天)
    fruitingPeriod: undefined as number | undefined,    // 结果期(天)
    harvestPeriod: undefined as number | undefined,     // 摘收期(天)
    // 适宜环境参数
    airTemperature: undefined as number | undefined,    // 空气温度(℃)
    airHumidity: undefined as number | undefined,      // 空气湿度(%)
    co2Content: undefined as number | undefined,       // CO₂含量(ppm)
    lightIntensity: undefined as number | undefined,    // 光照度(lx)
    soilTemperature: undefined as number | undefined,   // 土壤温度(℃)
    soilHumidity: undefined as number | undefined,      // 土壤湿度(%)
    soilPh: undefined as number | undefined,           // 土壤PH值
    soilEc: undefined as number | undefined,            // 土壤EC值
    remarks: ''
  });

  // 作物编码（可编辑）
  const [cropCode, setCropCode] = useState('');

  // 2026-07-26：详细品种层级已删除

  // 查重结果
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<{
    hasDuplicate: boolean;
    message: string;
    duplicateInfo?: { code: string; name: string };
  } | null>(null);

  // 编码已生成标志
  const [codeGenerated, setCodeGenerated] = useState(false);

  // 处理预填充数据
  useEffect(() => {
    if (prefillData) {
      setFormData(prev => ({
        ...prev,
        categoryCode: prefillData.categoryCode,
        categoryName: prefillData.categoryName,
        typeCode: prefillData.typeCode,
        typeName: prefillData.typeName,
        varietyCode: prefillData.varietyCode,
        varietyName: prefillData.varietyName,
        subVariety1Code: prefillData.subVariety1Code || '',
        subVariety1Name: prefillData.subVariety1Name || '',
        }));
      // 自动生成编码（9位）
      const code = generateCropCode(
        prefillData.categoryCode,
        prefillData.typeCode,
        prefillData.varietyCode,
        prefillData.subVariety1Code || undefined,
      );
      setCropCode(code);
      setCodeGenerated(true);
    }
  }, [prefillData]);

  // 获取选项数据
  const categoryOptions = useMemo(() => getCategoryOptions(), []);
  const typeOptions = useMemo(() => {
    if (!formData.categoryCode) return [];
    return getTypeOptionsByCategory(formData.categoryCode);
  }, [formData.categoryCode]);
  const varietyOptions = useMemo(() => {
    if (!formData.categoryCode || !formData.typeCode) return [];
    return getVarietyOptionsByType(formData.categoryCode, formData.typeCode);
  }, [formData.categoryCode, formData.typeCode]);
  const subVariety1Options = useMemo(() => {
    if (!formData.categoryCode || !formData.typeCode || !formData.varietyCode) return [];
    return getSubVariety1OptionsFromExtension(formData.categoryCode, formData.typeCode, formData.varietyCode);
  }, [formData.categoryCode, formData.typeCode, formData.varietyCode]);

  // 处理类别变化
  const handleCategoryChange = (code: string) => {
    const category = categoryOptions.find(c => c.value === code);
    setFormData(prev => ({
      ...prev,
      categoryCode: code,
      categoryName: category?.label || '',
      typeCode: '',
      typeName: '',
      varietyCode: '',
      varietyName: '',
      subVariety1Code: '',
      subVariety1Name: '',
      // detailVarietyName removed
    }));
    setCropCode('');
    // setDetailVarietyCode removed
    setCodeGenerated(false);
    setDuplicateCheckResult(null);
  };

  // 处理类型变化
  const handleTypeChange = (code: string) => {
    const type = typeOptions.find(t => t.value === code);
    setFormData(prev => ({
      ...prev,
      typeCode: code,
      typeName: type?.label || '',
      varietyCode: '',
      varietyName: '',
      subVariety1Code: '',
      subVariety1Name: '',
      // detailVarietyName removed
    }));
    setCropCode('');
    // setDetailVarietyCode removed
    setCodeGenerated(false);
    setDuplicateCheckResult(null);
  };

  // 处理品种变化
  const handleVarietyChange = (code: string, name: string) => {
    setFormData(prev => ({
      ...prev,
      varietyCode: code,
      varietyName: name,
      subVariety1Code: '',
      subVariety1Name: '',
      // detailVarietyName removed
    }));
    setCropCode('');
    // setDetailVarietyCode removed
    setCodeGenerated(false);
    setDuplicateCheckResult(null);
  };

  // 处理子品种1变化
  const handleSubVariety1Change = (code: string, name: string) => {
    setFormData(prev => ({
      ...prev,
      subVariety1Code: code,
      subVariety1Name: name,
      // detailVarietyName removed
    }));
    // 详细品种层级已删除
    setDuplicateCheckResult(null);
  };

  // 详细品种名称变化handler已删除
  const handleDetailVarietyNameChange = (name: string) => {
    // detailVarietyName setter removed
    setDuplicateCheckResult(null);
  };

  // 生成编码（9位：类别+类型+作物+品种）
  const handleGenerateCode = () => {
    if (!formData.categoryCode || !formData.typeCode || !formData.varietyCode) {
      showAlert('请先选择完整的类别、类型和作物');
      return;
    }

    const code = generateCropCode(
      formData.categoryCode,
      formData.typeCode,
      formData.varietyCode,
      formData.subVariety1Code || undefined,
    );
    setCropCode(code);
    setCodeGenerated(true);
    setDuplicateCheckResult(null);
  };

  // 查重
  const handleCheckDuplicate = () => {
    if (!cropCode && !formData.varietyName) {
      setDuplicateCheckResult({
        hasDuplicate: false,
        message: '请先生成编码或输入品种名称'
      });
      return;
    }

    const allVarieties = getAllVarieties();
    const duplicates: string[] = [];

    // 检查编码是否重复
    if (cropCode) {
      const existingByCode = allVarieties.find(v => v.cropCode === cropCode);
      if (existingByCode) {
        duplicates.push(`编码 ${cropCode} 已存在，对应品种：${existingByCode.varietyName}`);
      }
    }

    {/* 2026-07-26：删除详细品种名称重复检查（层级已删除） */}

    if (duplicates.length > 0) {
      setDuplicateCheckResult({
        hasDuplicate: true,
        message: duplicates.join('；')
      });
    } else {
      setDuplicateCheckResult({
        hasDuplicate: false,
        message: '可以使用'
      });
    }
  };

  // 解析别名
  const parseAlias = (aliasStr: string): string[] => {
    if (!aliasStr.trim()) return [];
    return aliasStr.split(/[,，;；]/).map(s => s.trim()).filter(s => s);
  };

  // 提交
  const handleSubmit = async () => {
    try {
      // 验证
      if (!formData.categoryCode || !formData.typeCode || !formData.varietyName) {
        await showAlert('请选择完整的类别、类型和品种');
        return;
      }
      if (!cropCode) {
        await showAlert('请先生成作物编码');
        return;
      }
      if (duplicateCheckResult?.hasDuplicate) {
        await showAlert('存在重复的品种，请修改后重试');
        return;
      }

      // 2026-07-26：作物品种 = subVariety1Name || varietyName

      // 通过 Store 添加品种
      await store.addItem({
        cropCode: cropCode,           // 作物编码（9位，数据库NOT NULL必填）
        categoryCode: formData.categoryCode as any,
        categoryName: formData.categoryName,
        typeCode: formData.typeCode,
        typeName: formData.typeName,
        varietyCode: formData.varietyCode,
        varietyName: formData.varietyName,
        subVariety1Code: formData.subVariety1Code || undefined,
        subVariety1Name: formData.subVariety1Name || undefined,
        alias: parseAlias(formData.alias),
        image: formData.image || undefined,
        description: formData.description || undefined,
        germinationPeriod: formData.germinationPeriod,
        seedlingPeriod: formData.seedlingPeriod,
        floweringPeriod: formData.floweringPeriod,
        fruitingPeriod: formData.fruitingPeriod,
        harvestPeriod: formData.harvestPeriod,
        airTemperature: formData.airTemperature,
        airHumidity: formData.airHumidity,
        co2Content: formData.co2Content,
        lightIntensity: formData.lightIntensity,
        soilTemperature: formData.soilTemperature,
        soilHumidity: formData.soilHumidity,
        soilPh: formData.soilPh,
        soilEc: formData.soilEc,
        status: 'active' as CropVarietyStatus,
        remarks: formData.remarks
      } as any);

      onSuccess();
      onClose();
    } catch (error) {
      // logger.error('保存品种失败:', error);
      await showAlert('保存失败，请重试');
    } finally {
      // 重置表单
      setFormData({
        categoryCode: '',
        categoryName: '',
        typeCode: '',
        typeName: '',
        varietyCode: '',
        varietyName: '',
        subVariety1Code: '',
        subVariety1Name: '',
        // detailVarietyName removed
        alias: '',
        image: '',
        description: '',
        germinationPeriod: undefined,
        seedlingPeriod: undefined,
        floweringPeriod: undefined,
        fruitingPeriod: undefined,
        harvestPeriod: undefined,
        remarks: ''
      });
      setCropCode('');
      // setDetailVarietyCode removed
      setCodeGenerated(false);
      setDuplicateCheckResult(null);
    }
  };

  // 关闭时重置表单
  const handleClose = () => {
    setFormData({
      categoryCode: '',
      categoryName: '',
      typeCode: '',
      typeName: '',
      varietyCode: '',
      varietyName: '',
      subVariety1Code: '',
      subVariety1Name: '',
      // detailVarietyName removed
      alias: '',
      image: '',
      description: '',
      germinationPeriod: undefined,
      seedlingPeriod: undefined,
      floweringPeriod: undefined,
      fruitingPeriod: undefined,
      harvestPeriod: undefined,
      remarks: ''
    });
    setCropCode('');
    // setDetailVarietyCode removed
    setCodeGenerated(false);
    setDuplicateCheckResult(null);
    onClose();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={handleClose}
      title="新增作物"
      size="xxl"
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="确认新增"
      cancelText="取消"
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {/* 分类标题 */}
        <div className="col-span-2 -mt-2">
          <span className="inline-block bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium">编码分类</span>
        </div>

        {/* 类别 */}
        <div>
          <Label className="font-bold text-blue-700">
            类别 <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.categoryCode}
            onValueChange={(val) => handleCategoryChange(val)}
          >
            <SelectTrigger className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50">
              <SelectValue placeholder="请选择类别" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 类型 */}
        <div>
          <Label className="font-bold text-blue-700">
            类型 <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.typeCode}
            onValueChange={(val) => handleTypeChange(val)}
            disabled={!formData.categoryCode}
          >
            <SelectTrigger className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50 disabled:bg-gray-100 disabled:border-gray-400">
              <SelectValue placeholder="请选择类型" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 品种 */}
        <div>
          <Label className="font-bold text-blue-700">
            品种 <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.varietyCode}
            onValueChange={(val) => {
              const opt = varietyOptions.find(v => v.value === val);
              if (opt) {
                handleVarietyChange(opt.value, opt.label);
              }
            }}
            disabled={!formData.typeCode}
          >
            <SelectTrigger className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50 disabled:bg-gray-100 disabled:border-gray-400">
              <SelectValue placeholder="请选择品种" />
            </SelectTrigger>
            <SelectContent>
              {varietyOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 子品种 */}
        <div>
          <Label className="text-gray-600">
            子品种
          </Label>
          <Select
            value={formData.subVariety1Code}
            onValueChange={(val) => {
              const opt = subVariety1Options.find(s => s.value === val);
              if (opt) {
                handleSubVariety1Change(opt.value, opt.label);
              } else {
                handleSubVariety1Change('', '');
              }
            }}
            disabled={!formData.varietyCode || subVariety1Options.length === 0}
          >
            <SelectTrigger className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100">
              <SelectValue placeholder="请选择子品种" />
            </SelectTrigger>
            <SelectContent>
              {subVariety1Options.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {subVariety1Options.length === 0 && formData.varietyCode && (
            <p className="mt-1 text-xs text-gray-400">该品种暂无子品种分类</p>
          )}
        </div>

        {/* 2026-07-26：作物品种字段已删除（编码改为9位，品种=子品种名） */}

        {/* 分类标题 */}
        <div className="col-span-2">
          <span className="inline-block bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2 rounded-lg font-medium">编码生成</span>
        </div>

        {/* 作物编码 */}
        <div className="col-span-2">
          <Label className="font-bold text-emerald-700">
            作物编码 <span className="text-red-500">*</span>
            <span className="text-xs text-gray-400 ml-2">(点击生成按钮自动生成)</span>
          </Label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={cropCode}
              onChange={(e) => setCropCode(e.target.value.toUpperCase())}
              placeholder="点击生成按钮获取编码"
              className="flex-1 px-3 py-2 border-2 border-emerald-300 rounded-lg text-sm font-mono text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50"
            />
            <Button
              onClick={handleGenerateCode}
              disabled={!formData.categoryCode || !formData.typeCode || !formData.varietyCode}
            >
              <RefreshCw className="w-4 h-4" />
              生成
            </Button>
            <Button
              variant="blue"
              onClick={handleCheckDuplicate}
              disabled={!cropCode}
            >
              <Search className="w-4 h-4" />
              查重
            </Button>
          </div>
          {duplicateCheckResult && (
            <div className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-lg ${
              duplicateCheckResult.hasDuplicate
                ? 'bg-red-50 border border-red-200'
                : 'bg-green-50 border border-green-200'
            }`}>
              {duplicateCheckResult.hasDuplicate ? (
                <X className="w-4 h-4 text-red-500" />
              ) : (
                <Check className="w-4 h-4 text-green-500" />
              )}
              <span className={`text-sm ${
                duplicateCheckResult.hasDuplicate ? 'text-red-700' : 'text-green-700'
              }`}>
                {duplicateCheckResult.message}
              </span>
            </div>
          )}
          <p className="mt-1 text-xs text-gray-400">
            格式：类别(2位字母) + 类型(2位数字) + 作物(2位数字) + 品种(3位数字) = 9位
          </p>
        </div>

        {/* 分类标题 */}
        <div className="col-span-2">
          <span className="inline-block bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-lg font-medium">品种信息</span>
        </div>

        {/* 别名 */}
        <div>
          <Label className="text-amber-700">
            别名 <span className="text-xs text-gray-400">(多个用逗号分隔)</span>
          </Label>
          <Input
            type="text"
            value={formData.alias}
            onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
            placeholder="如：西红柿、洋柿子"
            className="w-full px-3 py-2 border-2 border-amber-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
          />
        </div>

        {/* 图片 */}
        <div>
          <Label className="text-amber-700">
            图片
          </Label>
          <div className="flex items-center gap-3">
            {formData.image && (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-amber-200 flex-shrink-0">
                <img src={formData.image} alt="预览" className="w-full h-full object-cover" />
              </div>
            )}
            <Label className="flex-1 px-3 py-2 border border-amber-200 rounded-lg text-sm bg-amber-50 cursor-pointer hover:bg-amber-100 transition-colors flex items-center justify-center">
              <span className="text-amber-600">
                {formData.image ? '更换图片' : '上传图片'}
              </span>
              <Input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // 使用 FileReader 将图片转为 base64
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setFormData({ ...formData, image: event.target?.result as string });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </Label>
            {formData.image && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setFormData({ ...formData, image: '' })}
              >
                <Trash2 className="w-4 h-4" /> 删除
              </Button>
            )}
          </div>
        </div>

        {/* 特性描述 */}
        <div className="col-span-2">
          <Label className="text-amber-700">
            特性描述
          </Label>
          <TextArea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            placeholder="简要描述该作物品种的主要特性..."
            className="w-full px-3 py-2 border-2 border-amber-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white resize-none"
          />
        </div>

        {/* 作物生长周期 */}
        <div className="col-span-2">
          <Label className="font-bold text-amber-700">
            作物生长周期
          </Label>
          <div className="grid grid-cols-5 gap-3">
            <div>
              <Label className="text-xs text-amber-600">发芽期(天)</Label>
              <Input
                type="number"
                value={formData.germinationPeriod || ''}
                onChange={(e) => setFormData({ ...formData, germinationPeriod: Number(e.target.value) || undefined })}
                placeholder="0"
                className="w-full px-2 py-1.5 border-2 border-amber-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>
            <div>
              <Label className="text-xs text-amber-600">育苗期(天)</Label>
              <Input
                type="number"
                value={formData.seedlingPeriod || ''}
                onChange={(e) => setFormData({ ...formData, seedlingPeriod: Number(e.target.value) || undefined })}
                placeholder="0"
                className="w-full px-2 py-1.5 border-2 border-amber-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>
            <div>
              <Label className="text-xs text-amber-600">开花期(天)</Label>
              <Input
                type="number"
                value={formData.floweringPeriod || ''}
                onChange={(e) => setFormData({ ...formData, floweringPeriod: Number(e.target.value) || undefined })}
                placeholder="0"
                className="w-full px-2 py-1.5 border-2 border-amber-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>
            <div>
              <Label className="text-xs text-amber-600">结果期(天)</Label>
              <Input
                type="number"
                value={formData.fruitingPeriod || ''}
                onChange={(e) => setFormData({ ...formData, fruitingPeriod: Number(e.target.value) || undefined })}
                placeholder="0"
                className="w-full px-2 py-1.5 border-2 border-amber-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>
            <div>
              <Label className="text-xs text-amber-600">摘收期(天)</Label>
              <Input
                type="number"
                value={formData.harvestPeriod || ''}
                onChange={(e) => setFormData({ ...formData, harvestPeriod: Number(e.target.value) || undefined })}
                placeholder="0"
                className="w-full px-2 py-1.5 border-2 border-amber-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* 作物适宜环境参数 */}
        <div className="col-span-2">
          <Label className="font-bold text-cyan-700">
            作物适宜环境参数
          </Label>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-cyan-600">空气温度(℃)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.airTemperature || ''}
                onChange={(e) => setFormData({ ...formData, airTemperature: Number(e.target.value) || undefined })}
                placeholder="0.00"
                className="w-full px-2 py-1.5 border border-cyan-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-cyan-50"
              />
            </div>
            <div>
              <Label className="text-xs text-cyan-600">空气湿度(%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.airHumidity || ''}
                onChange={(e) => setFormData({ ...formData, airHumidity: Number(e.target.value) || undefined })}
                placeholder="0.00"
                className="w-full px-2 py-1.5 border border-cyan-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-cyan-50"
              />
            </div>
            <div>
              <Label className="text-xs text-cyan-600">CO₂含量(ppm)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.co2Content || ''}
                onChange={(e) => setFormData({ ...formData, co2Content: Number(e.target.value) || undefined })}
                placeholder="0.00"
                className="w-full px-2 py-1.5 border border-cyan-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-cyan-50"
              />
            </div>
            <div>
              <Label className="text-xs text-cyan-600">光照度(lx)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.lightIntensity || ''}
                onChange={(e) => setFormData({ ...formData, lightIntensity: Number(e.target.value) || undefined })}
                placeholder="0.00"
                className="w-full px-2 py-1.5 border border-cyan-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-cyan-50"
              />
            </div>
            <div>
              <Label className="text-xs text-cyan-600">土壤温度(℃)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.soilTemperature || ''}
                onChange={(e) => setFormData({ ...formData, soilTemperature: Number(e.target.value) || undefined })}
                placeholder="0.00"
                className="w-full px-2 py-1.5 border border-cyan-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-cyan-50"
              />
            </div>
            <div>
              <Label className="text-xs text-cyan-600">土壤湿度(%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.soilHumidity || ''}
                onChange={(e) => setFormData({ ...formData, soilHumidity: Number(e.target.value) || undefined })}
                placeholder="0.00"
                className="w-full px-2 py-1.5 border border-cyan-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-cyan-50"
              />
            </div>
            <div>
              <Label className="text-xs text-cyan-600">土壤PH值</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.soilPh || ''}
                onChange={(e) => setFormData({ ...formData, soilPh: Number(e.target.value) || undefined })}
                placeholder="0.00"
                className="w-full px-2 py-1.5 border border-cyan-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-cyan-50"
              />
            </div>
            <div>
              <Label className="text-xs text-cyan-600">土壤EC值</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.soilEc || ''}
                onChange={(e) => setFormData({ ...formData, soilEc: Number(e.target.value) || undefined })}
                placeholder="0.00"
                className="w-full px-2 py-1.5 border border-cyan-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-cyan-50"
              />
            </div>
          </div>
        </div>

        {/* 备注 */}
        <div className="col-span-2">
          <Label className="text-gray-500">
            备注
          </Label>
          <TextArea
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            rows={3}
            placeholder="请输入备注信息..."
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
          />
        </div>
      </div>
    </UnifiedModal>
  );
}
