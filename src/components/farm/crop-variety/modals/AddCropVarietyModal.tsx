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
import { EnvironmentRangeInput } from '../EnvironmentRangeInput';
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
  // 2026-07-27：用 selector 单独选 actions（避免整 store 解构触发 useEffect 死循环）
const store = useCropVarietyStore();
const addItem = useCropVarietyStore((s) => s.addItem);
const getVarietyByCode = useCropVarietyStore((s) => s.getVarietyByCode);
const getMaxSubVariety1Code = useCropVarietyStore((s) => s.getMaxSubVariety1Code);
const loadItems = useCropVarietyStore((s) => s.loadItems);
const isInitialized = useCropVarietyStore((s) => s.isInitialized);

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
    // 2026-07-27：作物生长周期改为时间段（string 格式 "min-max" 天数）
    germinationPeriod: undefined as string | undefined,  // 发芽期(天)
    seedlingPeriod: undefined as string | undefined,     // 育苗期(天)
    floweringPeriod: undefined as string | undefined,    // 开花期(天)
    fruitingPeriod: undefined as string | undefined,    // 结果期(天)
    harvestPeriod: undefined as string | undefined,     // 摘收期(天)
    // 适宜环境参数（2026-07-27：改为阈值区间，string 格式 "min-max"）
    airTemperature: undefined as string | undefined,    // 空气温度(℃)
    airHumidity: undefined as string | undefined,      // 空气湿度(%)
    co2Content: undefined as string | undefined,       // CO₂含量(ppm)
    lightIntensity: undefined as string | undefined,    // 光照度(lx)
    soilTemperature: undefined as string | undefined,   // 土壤温度(℃)
    soilHumidity: undefined as string | undefined,      // 土壤湿度(%)
    soilPh: undefined as string | undefined,           // 土壤PH值
    soilEc: undefined as string | undefined,            // 土壤EC值
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

  // 生成编码（9位：类别+类型+作物+子品种）
  // 2026-07-27 v3：服务端 409 兜底 + 前端循环递增
  // - 优先用 store.items（已从后端 DB 加载）的最大子品种序号 + 1 作为起点
  // - 循环确认新编码不在 store 里（处理本地缓存短暂不一致）
  // - 即便前端检查全过，后端也会用 409 拦截重复 INSERT（race 保护）
  const handleGenerateCode = async () => {
    if (!formData.categoryCode || !formData.typeCode || !formData.varietyCode) {
      showAlert('请先选择完整的类别、类型和作物');
      return;
    }

    const { categoryCode, typeCode, varietyCode } = formData;

    // 防御 1：store 未初始化时（用户极速点开新增弹窗），强制触发加载
    if (!isInitialized) {
      try {
        await loadItems();
      } catch (e) {
        // 即便加载失败，也按当前 items（可能为空）继续，避免阻塞用户
      }
    }

    // 从 store.items 中找最大子品种序号
    const maxSub = getMaxSubVariety1Code(categoryCode, typeCode, varietyCode);
    let candidate = parseInt(maxSub, 10) + 1;

    // 循环找无冲突的子品种序号（前端预检）
    // 上限 999 次（实际不可能达到，但提供安全网）
    let attempts = 0;
    while (attempts < 999) {
      const sub = String(candidate).padStart(3, '0');
      const code = generateCropCode(categoryCode, typeCode, varietyCode, sub);
      // 在前端 store 中查冲突（store.items 已含后端 DB 全量）
      const existing = getVarietyByCode(code);
      if (!existing) {
        // 找到无冲突的编码
        setCropCode(code);
        setCodeGenerated(true);
        setDuplicateCheckResult({
          hasDuplicate: false,
          message: `已自动生成无重码编码（子品种序号 ${sub}）`,
        });
        return;
      }
      candidate += 1;
      attempts += 1;
    }

    // 极端情况：999 次都冲突（不可能但兜底）
    showAlert('生成失败：连续 999 次都遇到冲突，请联系管理员检查作物编码库');
  };

  // 查重（2026-07-27 修复：改用 store.getVarietyByCode — store.items 已从后端 API 加载，不再走 localStorage）
  const handleCheckDuplicate = () => {
    if (!cropCode && !formData.varietyName) {
      setDuplicateCheckResult({
        hasDuplicate: false,
        message: '请先生成编码或输入品种名称'
      });
      return;
    }

    const duplicates: string[] = [];

    // 检查编码是否重复（store.items 已包含后端 DB 全量数据）
    if (cropCode) {
      const existingByCode = store.getVarietyByCode(cropCode);
      if (existingByCode) {
        duplicates.push(`编码 ${cropCode} 已存在，对应品种：${existingByCode.varietyName || existingByCode.detailVarietyName || existingByCode.subVariety1Name || '-'}`);
      }
    }

    // 2026-07-26：删除详细品种名称重复检查（层级已删除）

    if (duplicates.length > 0) {
      setDuplicateCheckResult({
        hasDuplicate: true,
        message: duplicates.join('；'),
        duplicateInfo: cropCode ? { code: cropCode, name: store.getVarietyByCode(cropCode)?.varietyName || '' } : undefined,
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
      // 2026-07-27：检查返回值 — addItem 抛错时（409 Conflict 等）不能继续 onSuccess
      const result = await store.addItem({
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

      // 2026-07-27：addItem 抛错时（409 Conflict）已经被 catch 接住，这里不会再执行
      if (result) {
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      // 2026-07-27：透传后端 409 Conflict 详细错误（"作物编码 XXX 已存在"）
      // 之前：catch 块只显示通用"保存失败"，用户看不到根因
      const errMsg = error?.message || String(error);
      await showAlert(`保存失败：${errMsg}\n\n如果提示"作物编码已存在"，请重新点击"生成编码"按钮获取新编码。`);
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
        // 2026-07-27 审核 C-7：补全 8 个环境字段，避免新增第二条带温度的品种时显示上一次的温度
        airTemperature: undefined,
        airHumidity: undefined,
        co2Content: undefined,
        lightIntensity: undefined,
        soilTemperature: undefined,
        soilHumidity: undefined,
        soilPh: undefined,
        soilEc: undefined,
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
        {/* 分类标题 — 2026-07-27：原"编码分类"区块已删除，替换为"编码生成"区块（移到顶部位置） */}
        <div className="col-span-2 -mt-2">
          <span className="inline-block bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-3 py-1.5 rounded text-sm font-normal">编码生成</span>
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

        {/* 作物 */}
        <div>
          <Label className="font-bold text-blue-700">
            作物 <span className="text-red-500">*</span>
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
              <SelectValue placeholder="请选择作物" />
            </SelectTrigger>
            <SelectContent>
              {varietyOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 品种（新建时可输入） */}
        <div>
          <Label className="text-gray-600">
            品种名称 <span className="text-xs text-gray-400">(可输入新建)</span>
          </Label>
          <Input
            type="text"
            value={formData.subVariety1Name}
            // 2026-07-27 审核清理：品种编码字段已删除，handleSubVariety1Change 第二个参数为名称
            onChange={(e) => handleSubVariety1Change('000', e.target.value)}
            placeholder="输入品种名称"
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 2026-07-26：作物品种字段已删除（编码改为9位，品种=子品种名） */}
        {/* 2026-07-27：品种编码字段也删除（编码 9 位已含子品种 3 位，subVariety1Code 不再需要用户输入） */}

        <div className="col-span-2">
          {/* 作物编码 */}
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
          <span className="inline-block bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1.5 rounded text-sm font-normal">品种信息</span>
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
              <EnvironmentRangeInput
                value={formData.germinationPeriod}
                onChange={(v) => setFormData({ ...formData, germinationPeriod: v || undefined })}
                placeholderMin="最少"
                placeholderMax="最多"
              />
            </div>
            <div>
              <Label className="text-xs text-amber-600">育苗期(天)</Label>
              <EnvironmentRangeInput
                value={formData.seedlingPeriod}
                onChange={(v) => setFormData({ ...formData, seedlingPeriod: v || undefined })}
                placeholderMin="最少"
                placeholderMax="最多"
              />
            </div>
            <div>
              <Label className="text-xs text-amber-600">开花期(天)</Label>
              <EnvironmentRangeInput
                value={formData.floweringPeriod}
                onChange={(v) => setFormData({ ...formData, floweringPeriod: v || undefined })}
                placeholderMin="最少"
                placeholderMax="最多"
              />
            </div>
            <div>
              <Label className="text-xs text-amber-600">结果期(天)</Label>
              <EnvironmentRangeInput
                value={formData.fruitingPeriod}
                onChange={(v) => setFormData({ ...formData, fruitingPeriod: v || undefined })}
                placeholderMin="最少"
                placeholderMax="最多"
              />
            </div>
            <div>
              <Label className="text-xs text-amber-600">摘收期(天)</Label>
              <EnvironmentRangeInput
                value={formData.harvestPeriod}
                onChange={(v) => setFormData({ ...formData, harvestPeriod: v || undefined })}
                placeholderMin="最少"
                placeholderMax="最多"
              />
            </div>
          </div>
        </div>

        {/* 作物适宜环境参数（2026-07-27：改为阈值区间，min-max） */}
        <div className="col-span-2">
          <Label className="font-bold text-cyan-700">
            作物适宜环境参数
          </Label>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-cyan-600">空气温度(℃)</Label>
              <EnvironmentRangeInput
                value={formData.airTemperature}
                onChange={(v) => setFormData({ ...formData, airTemperature: v || undefined })}
                placeholderMin="最小℃"
                placeholderMax="最大℃"
              />
            </div>
            <div>
              <Label className="text-xs text-cyan-600">空气湿度(%)</Label>
              <EnvironmentRangeInput
                value={formData.airHumidity}
                onChange={(v) => setFormData({ ...formData, airHumidity: v || undefined })}
                placeholderMin="最小%"
                placeholderMax="最大%"
              />
            </div>
            <div>
              <Label className="text-xs text-cyan-600">CO₂含量(ppm)</Label>
              <EnvironmentRangeInput
                value={formData.co2Content}
                onChange={(v) => setFormData({ ...formData, co2Content: v || undefined })}
                placeholderMin="最小ppm"
                placeholderMax="最大ppm"
              />
            </div>
            <div>
              <Label className="text-xs text-cyan-600">光照度(lx)</Label>
              <EnvironmentRangeInput
                value={formData.lightIntensity}
                onChange={(v) => setFormData({ ...formData, lightIntensity: v || undefined })}
                placeholderMin="最小lx"
                placeholderMax="最大lx"
              />
            </div>
            <div>
              <Label className="text-xs text-cyan-600">土壤温度(℃)</Label>
              <EnvironmentRangeInput
                value={formData.soilTemperature}
                onChange={(v) => setFormData({ ...formData, soilTemperature: v || undefined })}
                placeholderMin="最小℃"
                placeholderMax="最大℃"
              />
            </div>
            <div>
              <Label className="text-xs text-cyan-600">土壤湿度(%)</Label>
              <EnvironmentRangeInput
                value={formData.soilHumidity}
                onChange={(v) => setFormData({ ...formData, soilHumidity: v || undefined })}
                placeholderMin="最小%"
                placeholderMax="最大%"
              />
            </div>
            <div>
              <Label className="text-xs text-cyan-600">土壤PH值</Label>
              <EnvironmentRangeInput
                value={formData.soilPh}
                onChange={(v) => setFormData({ ...formData, soilPh: v || undefined })}
                placeholderMin="最小"
                placeholderMax="最大"
              />
            </div>
            <div>
              <Label className="text-xs text-cyan-600">土壤EC值</Label>
              <EnvironmentRangeInput
                value={formData.soilEc}
                onChange={(v) => setFormData({ ...formData, soilEc: v || undefined })}
                placeholderMin="最小"
                placeholderMax="最大"
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
