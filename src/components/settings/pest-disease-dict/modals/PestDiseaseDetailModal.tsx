/**
 * 病虫害详情查看弹窗组件
 * 显示病虫害基本信息及关联的药剂列表
 */
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Label } from '@/components/ui';
// 2026-07-10：pesticideTypes 多值 label 翻译
import { useDictionaryStore, getDictLabel } from '@/stores/useDictionaryStore';
import { usePestDiseaseDictStore, PestDiseaseDict, PesticideForRelation } from '@/stores';

interface PestDiseaseDetailModalProps {
  isOpen: boolean;
  record: PestDiseaseDict | null;
  onClose: () => void;
}

// 防治类型 Badge
const getTypeBadge = (type: string) => {
  switch (type) {
    case 'pest':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
          虫害
        </span>
      );
    case 'disease':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
          病害
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          {type}
        </span>
      );
  }
};

// 2026-07-17：pesticide_type 中文兜底表（method-dict-cross-fallback 教训 — 字典未加载时 getDictLabel
// 返回空导致显示英文原码。含 24 项细分码，与 DB pesticide_type 字典对齐）
// 2026-07-17 新增调节剂（GB/T 19378 国标 04 类）6 个子项：促进/延缓/催熟/生根/保果/抗逆
const PESTICIDE_TYPE_FALLBACK: Record<string, string> = {
  insecticide: '杀虫剂',
  fungicide: '杀菌剂',
  herbicide: '除草剂',
  acaricide: '杀螨剂',
  plant_growth_regulator: '调节剂',
  protective: '保护剂',
  adjuvant: '助剂',
  other: '其他',
  nematicide: '杀线虫剂',
  insecticide_chewing: '杀虫剂-咀嚼式',
  insecticide_sucking: '杀虫剂-刺吸式',
  acaricide_mite: '杀螨剂-螨类',
  fungicide_fungi: '杀菌剂-真菌',
  fungicide_bacteria: '杀菌剂-细菌',
  fungicide_virus: '杀菌剂-病毒',
  protective_contact: '保护剂-接触式',
  protective_systemic: '保护剂-系统性',
  adjuvant_penetration: '助剂-渗透剂',
  adjuvant_synergist: '助剂-增效剂',
  // 调节剂子类
  pgr_promoter: '调节剂-促进生长',
  pgr_retardant: '调节剂-延缓生长',
  pgr_ripening: '调节剂-催熟催黄',
  pgr_rooting: '调节剂-生根壮苗',
  pgr_fruit_set: '调节剂-保花保果',
  pgr_stress: '调节剂-抗逆增效',
};

/** 药剂类型码 → 中文（字典优先，fallback 表兜底，最后回原码） */
function pesticideTypeLabel(code: string): string {
  return getDictLabel('pesticide_type', code) || PESTICIDE_TYPE_FALLBACK[code] || code;
}

export function PestDiseaseDetailModal({ isOpen, record, onClose }: PestDiseaseDetailModalProps) {
  const pestDiseaseStore = usePestDiseaseDictStore();

  const [relatedPesticides, setRelatedPesticides] = useState<PesticideForRelation[]>([]);
  const [loadingRelations, setLoadingRelations] = useState(false);
  // 2026-07-17：图片全屏预览
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 加载关联的药剂 + 字典（2026-07-17：确保 pesticide_type 字典已加载，否则类型显示英文原码）
  useEffect(() => {
    if (isOpen && record) {
      loadRelatedPesticides();
      const dictState = useDictionaryStore.getState();
      if (dictState.dictionaries.length === 0 && !dictState.loading) {
        dictState.loadDictionaries();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadRelatedPesticides 每次渲染重建，加依赖会无限重拉
  }, [isOpen, record]);

  const loadRelatedPesticides = async () => {
    if (!record) return;
    setLoadingRelations(true);
    try {
      const pesticides = await pestDiseaseStore.fetchRelatedPesticides(record.id);
      setRelatedPesticides(pesticides);
    } finally {
      setLoadingRelations(false);
    }
  };

  if (!record) return null;

  // 2026-07-17：图片数组（store normalize 已 parseImages 为 string[]，兜底再防御一层）
  const images: string[] = Array.isArray(record.images) ? record.images : [];

  // 详情字段定义
  // 2026-08-15：与药剂详情弹窗样式统一 — 删头部重复卡片、字段同行显示（label:value）、无背景无边框
  const fields = [
    { label: '病虫害编码', value: <span className="font-mono">{record.dictCode || '-'}</span> },
    { label: '病虫害名称', value: <span className="font-bold">{record.dictName || '-'}</span> },
    { label: '类型', value: getTypeBadge(record.dictType) },
    { label: '适用作物', value: record.targetCrops || '-' },
    { label: '状态', value: record.status === 'active' ? '启用' : '禁用' },
    { label: '创建时间', value: record.createTime ? new Date(record.createTime).toLocaleString() : '-' },
    { label: '描述', value: record.description || '-' },
  ];

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="病虫害详情"
      // 2026-07-17：默认大小 +30%（lg 700×500 → 910×650）
      size="lg"
      width={910}
      height={650}
      showFooter={false}
    >
      {/* 2026-08-15：删除头部标题卡片（编码/名称/类型）— 与下方基础信息字段内容重复 */}

      {/* 基础信息字段（同行显示，无背景无边框） */}
      <div className="mb-4">
        <div className="grid grid-cols-2 gap-x-6">
          {fields.map((field, idx) => (
            <FieldCell key={idx} label={field.label} value={field.value} />
          ))}
        </div>
      </div>

      {/* 关联药剂列表 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-gray-700">关联药剂 ({relatedPesticides.length})</Label>
          {loadingRelations && <span className="text-xs text-gray-400">加载中...</span>}
        </div>
        {relatedPesticides.length === 0 ? (
          <div className="text-center py-4 text-gray-400 bg-gray-50 rounded-lg border border-gray-200">
            暂无关联药剂
          </div>
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {relatedPesticides.map((pesticide) => (
              <div
                key={pesticide.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{pesticide.pesticideName}</div>
                  <div className="text-sm text-gray-500 font-mono">{pesticide.pesticideCode}</div>
                </div>
                {/* 2026-07-10：controlType 已删除，改为 pesticideTypes 多值 chips 展示
                    2026-07-17：修复 — 原注释用 // 直接写在 JSX 里被当文本渲染 */}
                <div className="ml-4 flex flex-wrap gap-1">
                  {(pesticide.pesticideTypes || []).map(t => (
                    <span
                      key={t}
                      className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200"
                    >
                      {pesticideTypeLabel(t)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2026-07-17：图片区块（缩略图 + 点击全屏预览） */}
      {images.length > 0 && (
        <div className="mb-4">
          <Label className="text-gray-700 mb-2 block">图片 ({images.length})</Label>
          <div className="flex flex-wrap gap-2">
            {images.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt={`病虫害图片 ${idx + 1}`}
                className="w-24 h-24 object-cover rounded-lg border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setPreviewUrl(src)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 底部关闭按钮 */}
      <div className="mt-6 flex justify-end">
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
        >
          <X className="w-4 h-4" /> 关闭
        </Button>
      </div>

      {/* 2026-07-17：图片全屏预览层 */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewUrl}
            alt="预览"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </UnifiedModal>
  );
}

/** 单个字段展示行 — 2026-08-15：标签与值同一行（"编码：xxx"）、无背景色无底框（对齐药剂详情弹窗） */
function FieldCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="text-xs text-gray-500 shrink-0">{label}：</span>
      <span className="text-sm text-gray-900 flex-1 min-w-0 truncate">{value}</span>
    </div>
  );
}
