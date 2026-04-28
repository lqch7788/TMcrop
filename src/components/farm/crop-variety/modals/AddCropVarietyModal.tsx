/**
 * 新增作物品种弹窗
 * 支持多级子品种选择和动态新增
 */

import React, { useState, useMemo, useEffect } from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { CropVariety, CropVarietyStatus } from '../../../../types/cropVariety';
import {
  addVariety,
  getCategoryOptions,
  getTypeOptionsByCategory,
  getVarietyOptionsByType,
  getSubVariety1Options,
  generateCropCode,
  getAllVarieties,
  getMaxDetailVarietyCode
} from '../../../../services/cropVarietyService';
import { Search, Check, X, RefreshCw } from 'lucide-react';

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
  const [formData, setFormData] = useState({
    categoryCode: '',
    categoryName: '',
    typeCode: '',
    typeName: '',
    varietyCode: '',
    varietyName: '',
    subVariety1Code: '',   // 子品种1代码（3位）
    subVariety1Name: '',   // 子品种1名称
    detailVarietyName: '', // 详细品种名称（用户手工输入）
    alias: '',
    growthCycle: undefined as number | undefined,
    targetYield: undefined as number | undefined,
    yieldUnit: 'kg/亩',
    remarks: ''
  });

  // 作物编码（可编辑）
  const [cropCode, setCropCode] = useState('');

  // 详细品种序号（自动生成）
  const [detailVarietyCode, setDetailVarietyCode] = useState('');

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
        detailVarietyName: ''
      }));
      // 自动获取下一个详细品种序号
      if (prefillData.subVariety1Code) {
        const maxCode = getMaxDetailVarietyCode(
          prefillData.categoryCode,
          prefillData.typeCode,
          prefillData.varietyCode,
          prefillData.subVariety1Code
        );
        setDetailVarietyCode(maxCode);
      }
      // 自动生成编码
      const code = generateCropCode(
        prefillData.categoryCode,
        prefillData.typeCode,
        prefillData.varietyCode,
        prefillData.subVariety1Code,
        prefillData.subVariety1Code ? getMaxDetailVarietyCode(
          prefillData.categoryCode,
          prefillData.typeCode,
          prefillData.varietyCode,
          prefillData.subVariety1Code
        ) : undefined
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
    return getSubVariety1Options(formData.categoryCode, formData.typeCode, formData.varietyCode);
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
      detailVarietyName: ''
    }));
    setCropCode('');
    setDetailVarietyCode('');
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
      detailVarietyName: ''
    }));
    setCropCode('');
    setDetailVarietyCode('');
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
      detailVarietyName: ''
    }));
    setCropCode('');
    setDetailVarietyCode('');
    setCodeGenerated(false);
    setDuplicateCheckResult(null);
  };

  // 处理子品种1变化
  const handleSubVariety1Change = (code: string, name: string) => {
    setFormData(prev => ({
      ...prev,
      subVariety1Code: code,
      subVariety1Name: name,
      detailVarietyName: ''
    }));
    // 获取该子品种1下的最大详细品种序号
    const maxCode = getMaxDetailVarietyCode(
      formData.categoryCode,
      formData.typeCode,
      formData.varietyCode,
      code
    );
    setDetailVarietyCode(maxCode);
    setDuplicateCheckResult(null);
  };

  // 处理详细品种名称变化
  const handleDetailVarietyNameChange = (name: string) => {
    setFormData(prev => ({ ...prev, detailVarietyName: name }));
    setDuplicateCheckResult(null);
  };

  // 生成编码
  const handleGenerateCode = () => {
    if (!formData.categoryCode || !formData.typeCode || !formData.varietyCode) {
      alert('请先选择完整的类别、类型和品种');
      return;
    }

    // 如果选择了子品种1但还没分配序号，自动分配下一个序号
    let finalDetailCode = detailVarietyCode;
    if (formData.subVariety1Code && !detailVarietyCode) {
      finalDetailCode = getMaxDetailVarietyCode(
        formData.categoryCode,
        formData.typeCode,
        formData.varietyCode,
        formData.subVariety1Code
      );
      setDetailVarietyCode(finalDetailCode);
    }

    const code = generateCropCode(
      formData.categoryCode,
      formData.typeCode,
      formData.varietyCode,
      formData.subVariety1Code || undefined,
      finalDetailCode || undefined
    );
    setCropCode(code);
    setCodeGenerated(true);
    setDuplicateCheckResult(null);
  };

  // 查重
  const handleCheckDuplicate = () => {
    if (!cropCode && !formData.detailVarietyName && !formData.varietyName) {
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

    // 检查详细品种名称是否重复（同一子品种1下不能有相同名称）
    if (formData.detailVarietyName && formData.subVariety1Code) {
      const existingByName = allVarieties.find(v =>
        v.subVariety1Code === formData.subVariety1Code &&
        v.varietyName === formData.detailVarietyName
      );
      if (existingByName) {
        duplicates.push(`品种名称 "${formData.detailVarietyName}" 已存在于该子品种下，对应编码：${existingByCode?.cropCode || existingByName.cropCode}`);
      }
    }

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
  const handleSubmit = () => {
    // 验证
    if (!formData.categoryCode || !formData.typeCode || !formData.varietyName) {
      alert('请选择完整的类别、类型和品种');
      return;
    }
    if (!cropCode) {
      alert('请先生成作物编码');
      return;
    }
    if (duplicateCheckResult?.hasDuplicate) {
      alert('存在重复的品种，请修改后重试');
      return;
    }

    // 如果没有输入详细品种名称，使用品种名称作为最终品种名称，详细品种序号默认为00
    const finalVarietyName = formData.detailVarietyName.trim() || formData.varietyName;
    const finalDetailCode = formData.detailVarietyName.trim() ? detailVarietyCode : '00';

    // 添加品种
    addVariety({
      categoryCode: formData.categoryCode as any,
      categoryName: formData.categoryName,
      typeCode: formData.typeCode,
      typeName: formData.typeName,
      varietyCode: formData.varietyCode,
      varietyName: finalVarietyName,
      subVariety1Code: formData.subVariety1Code || undefined,
      subVariety1Name: formData.subVariety1Name || undefined,
      detailVarietyCode: finalDetailCode || undefined,
      alias: parseAlias(formData.alias),
      growthCycle: formData.growthCycle,
      targetYield: formData.targetYield,
      yieldUnit: formData.yieldUnit,
      status: 'active' as CropVarietyStatus,
      remarks: formData.remarks
    });

    onSuccess();
    onClose();

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
      detailVarietyName: '',
      alias: '',
      growthCycle: undefined,
      targetYield: undefined,
      yieldUnit: 'kg/亩',
      remarks: ''
    });
    setCropCode('');
    setDetailVarietyCode('');
    setCodeGenerated(false);
    setDuplicateCheckResult(null);
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
      detailVarietyName: '',
      alias: '',
      growthCycle: undefined,
      targetYield: undefined,
      yieldUnit: 'kg/亩',
      remarks: ''
    });
    setCropCode('');
    setDetailVarietyCode('');
    setCodeGenerated(false);
    setDuplicateCheckResult(null);
    onClose();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={handleClose}
      title="新增作物品种"
      size="lg"
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="确认新增"
      cancelText="取消"
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {/* 类别 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            类别 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.categoryCode}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">请选择类别</option>
            {categoryOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            类型 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.typeCode}
            onChange={(e) => handleTypeChange(e.target.value)}
            disabled={!formData.categoryCode}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
          >
            <option value="">请选择类型</option>
            {typeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 品种 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            品种 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.varietyCode}
            onChange={(e) => {
              const opt = varietyOptions.find(v => v.value === e.target.value);
              if (opt) {
                handleVarietyChange(opt.value, opt.label);
              }
            }}
            disabled={!formData.typeCode}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
          >
            <option value="">请选择品种</option>
            {varietyOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 子品种 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            子品种
          </label>
          <select
            value={formData.subVariety1Code}
            onChange={(e) => {
              const opt = subVariety1Options.find(s => s.value === e.target.value);
              if (opt) {
                handleSubVariety1Change(opt.value, opt.label);
              } else {
                handleSubVariety1Change('', '');
              }
            }}
            disabled={!formData.varietyCode || subVariety1Options.length === 0}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
          >
            <option value="">请选择子品种</option>
            {subVariety1Options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {subVariety1Options.length === 0 && formData.varietyCode && (
            <p className="mt-1 text-xs text-gray-400">该品种暂无子品种分类</p>
          )}
        </div>

        {/* 详细品种名称 */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">
            详细品种名称
          </label>
          <input
            type="text"
            value={formData.detailVarietyName}
            onChange={(e) => handleDetailVarietyNameChange(e.target.value)}
            placeholder="输入详细品种名称"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 作物编码 */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">
            作物编码 <span className="text-red-500">*</span>
            <span className="text-xs text-gray-400 ml-2">(点击生成按钮自动生成)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={cropCode}
              onChange={(e) => setCropCode(e.target.value.toUpperCase())}
              placeholder="点击生成按钮获取编码"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={handleGenerateCode}
              disabled={!formData.categoryCode || !formData.typeCode || !formData.varietyCode}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              生成
            </button>
            <button
              type="button"
              onClick={handleCheckDuplicate}
              disabled={!cropCode}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Search className="w-4 h-4" />
              查重
            </button>
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
            格式：类别(2位) + 类型(2位) + 品种(2位) + 子品种(3位) + 详细品种(2位) = 11位
          </p>
          {formData.subVariety1Code && (
            <p className="mt-1 text-xs text-blue-600">
              当前子品种「{formData.subVariety1Name}」下已有详细品种，系统将自动分配下一个序号
              {detailVarietyCode && `（当前序号：${detailVarietyCode}）`}
            </p>
          )}
        </div>

        {/* 别名 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            别名 <span className="text-xs text-gray-400">(可选，多个用逗号分隔)</span>
          </label>
          <input
            type="text"
            value={formData.alias}
            onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
            placeholder="如：西红柿、洋柿子"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 生长周期 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            生长周期 <span className="text-xs text-gray-400">(天)</span>
          </label>
          <input
            type="number"
            value={formData.growthCycle || ''}
            onChange={(e) => setFormData({ ...formData, growthCycle: Number(e.target.value) || undefined })}
            placeholder="如：120"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 目标产量 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            目标产量
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={formData.targetYield || ''}
              onChange={(e) => setFormData({ ...formData, targetYield: Number(e.target.value) || undefined })}
              placeholder="如：5000"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <select
              value={formData.yieldUnit}
              onChange={(e) => setFormData({ ...formData, yieldUnit: e.target.value })}
              className="w-24 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="kg/亩">kg/亩</option>
              <option value="斤/亩">斤/亩</option>
              <option value="吨/亩">吨/亩</option>
            </select>
          </div>
        </div>

        {/* 备注 */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">
            备注
          </label>
          <textarea
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            rows={3}
            placeholder="请输入备注信息..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </div>
      </div>
    </UnifiedModal>
  );
}
