/**
 * 新增病虫害防治记录弹窗
 * 2026-07-10：完全重构，删除化学/生物/物理三分支，改为统一字段（pesticideList 多项目 + 肥料联用）
 * 2026-07-11：关联业务移到作物名称字段前面，与施肥管理新增弹窗一致
 * 2026-07-11：目标病虫害从纯文本输入改为"病害/虫害"Tab + 搜索下拉多选
 * 2026-07-11：防治项目改为"药剂池"模式（PesticidePoolItem[] 替代 PesticideItem[]）
 * - 顶部药剂类型多选 checkbox → 过滤下方药剂下拉
 * - 选择药剂后自动加入池（按 pesticideId 去重，自动用 specs[0] 默认值）
 * - 池中每行内联编辑：用量/单位/稀释倍数/使用方法/备注
 * - 一键清空药剂池、单个移除
 * 2026-07-17：肥料联用字段复用 FertilizerPoolEditor（与新增施肥记录一致）—— 类型下拉 → 过滤库 → 池化编辑
 * - 移除了"启用肥料联用"checkbox 与"添加一行"按钮，肥料池始终可见
 * - 提交时序列化为 leafFertilizerList JSON（字段名与 FertilizerPoolItem 一致，含 specId/fertilizerName/fertilizerType 等）
 */
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { X, Search } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
// 2026-10-21：目标病虫害与防治药剂池已抽取为共享组件
//   （农事任务「病虫害防治 - 详细配置」复用同一份，避免两处 UI 漂移）
//   DictSelect / UnitDictSelect / Trash2 / getDictLabel 随之从本文件移除 —— 它们只被这两块 JSX 使用
import { TargetPestPicker } from '../TargetPestPicker';
import { PesticidePoolEditor } from '../PesticidePoolEditor';
import { usePestControlStore, usePlantingStore, useSeedlingStore, useFarmTaskStore } from '@/stores';
// 2026-10-21：usePesticideLibraryStore / usePestDiseaseDictStore / useDictionaryStore
//   已随各自 UI 移入共享组件，本文件不再需要
import { showAlert } from '@/lib/dialogService';
import { todayLocal, currentTimeLocal } from '@/lib/dateUtils';
import { FertilizerPoolEditor } from '@/components/farm/fertilizer/FertilizerPoolEditor';
import type { FertilizerPoolItem } from '@/components/farm/fertilizer/FertilizerPoolEditor';
// 2026-07-18 P3-L11：从共享工具导入
import { deepInputClass } from '@/components/common/deepInputClass';

/**
 * 2026-07-11：药剂池条目（替代化学/生物/物理三分支 + 原 PesticideItem 多卡片）
 * - pesticideId: 药剂库 id（用于库存扣减 + 去重）
 * - pesticideName: 药剂名称
 * - pesticideCode: 编码
 * - pesticideTypes: 类型数组（从药剂库带入，冗余展示）
 * - 2026-07-11：精确到规格（spec）— 同一药剂名可能有多个不同含量/厂家规格
 *   - specId: 规格 id（按规格去重 + 库存扣减 + 详情定位）
 *   - specContent: 规格描述（如 "80%可湿性粉剂"）
 *   - formulation: 剂型
 *   - manufacturer: 厂家
 *   - brandName: 品牌名
 * - dosage / unit / ratio / applicationMethod: 用量/单位/稀释倍数/使用方法
 * - remarks: 备注
 * - 添加到池时自动用选中规格的 suggestedDosage/Ratio/Unit/remark 作默认值
 */
// 2026-07-18 P2-M3：从共享类型导入，避免与 EditModal 定义漂移
import type { PesticidePoolItem } from '@/types/farm/pest-control';

// 2026-07-17：肥料池条目类型复用 FertilizerPoolEditor（与新增施肥记录一致）
// - 含 specId / fertilizerName / fertilizerType / brandName / specContent / manufacturer
// - dosage / unit / dilutionRatio / fertilizationMethod / unitPrice / stockQuantity / stockUnit
// 不再独立定义，避免字段漂移

// 2026-07-12：防治区域多选 — 每条选中的种植/育苗记录（含批次、区域、作物）
interface SelectedBizRecord {
  type: 'planting' | 'seedling';
  id: string;
  code: string;
  cropName: string;
  area: string;       // 种植用 rootName/areaName，育苗用 siteName
}

export function AddPestControlModal({ isOpen, onClose, onSaved }: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const pestStore = usePestControlStore();
  // 2026-10-21：pesticideStore / pestDiseaseStore / dictionaries 随之移入
  //   PesticidePoolEditor / TargetPestPicker 内部，本文件不再需要
  const plantingStore = usePlantingStore();
  const seedlingStore = useSeedlingStore();

  // 基础信息
  const [form, setForm] = useState({
    recordCode: '',
    sprayTime: '',
    cropName: '',
    greenhouseName: '',
    operatorName: '',
    // 2026-07-11：改为多选数组，从病虫害词典加载（兼容旧 schema 用空格 join 提交）
    targetPests: [] as string[],
    description: '',
  });

  // P0-3：关联农事任务（可选）
  const farmTasks = useFarmTaskStore((s) => s.tasks);
  const fetchFarmTasks = useFarmTaskStore((s) => s.fetchTasks);
  const [farmTaskId, setFarmTaskId] = useState('');
  // P1-1 合规生产档案
  const [complianceSource, setComplianceSource] = useState('');
  const [stopUseDate, setStopUseDate] = useState('');
  const pesticideTasks = useMemo(
    () => farmTasks.filter((t) =>
      t.type === 'pest_control' || t.type === 'pesticide'
      || String(t.type || '').includes('防治') || String(t.type || '').includes('植保')
      || String(t.type || '').includes('pest')
    ),
    [farmTasks],
  );

  useEffect(() => {
    if (farmTasks.length === 0) void fetchFarmTasks();
  }, [farmTasks.length, fetchFarmTasks]);

  // 2026-07-11：药剂池（每个条目是一个药剂 + 内联用量/单位/稀释/方法/备注）
  //   2026-10-21：类型筛选/搜索/下拉开关等内部状态已随 UI 一并移入 PesticidePoolEditor 组件
  const [pesticidePool, setPesticidePool] = useState<PesticidePoolItem[]>([]);

  // 2026-07-17：肥料联用池化（始终启用，由 FertilizerPoolEditor 提供完整 UI）
  const [fertilizerPool, setFertilizerPool] = useState<FertilizerPoolItem[]>([]);

  const [submitting, setSubmitting] = useState(false);
  // 2026-07-21：标记 cropName 是否仍处于"由所选批次自动反填"状态
  // - true = 由勾选批次自动维护（继续 append 新作物）；改为 false 表示用户已在 Input 中手动改过
  // - 解决旧 bug：第二次勾选时 form.cropName 已被反填成 'A'，导致 if (!form.cropName) 为 false 永远跳过更新
  //   → 后续选中的不同作物不会再进入作物名输入框
  const cropNameAutoFilledRef = useRef<boolean>(true);

  // 2026-07-12：防治区域多选 — 选项按 Tab 分种植/育苗（可同时多选 record；同一次只允许同一作物）
  const [bizTabType, setBizTabType] = useState<'planting' | 'seedling'>('planting');
  const [selectedBizRecords, setSelectedBizRecords] = useState<SelectedBizRecord[]>([]);
  const [bizSearchKeyword, setBizSearchKeyword] = useState('');
  const [showBizSearch, setShowBizSearch] = useState(false);
  const bizSearchRef = useRef<HTMLDivElement>(null);

  // 2026-07-11：目标病虫害多选（病害/虫害 Tab 切换 + 搜索下拉）
  //   2026-10-21：Tab/搜索/下拉开关等内部状态已随 UI 一并移入 TargetPestPicker 组件

  // 加载种植/育苗列表（用于关联业务下拉）
  //   2026-10-21：药剂库与病虫害字典的加载已移入 PesticidePoolEditor / TargetPestPicker 内部
  useEffect(() => {
    if (isOpen) {
      // 2026-07-18 P2-M4：统一使用 fetchItems 别名（与项目其他 store 命名一致）
      if (plantingStore.items.length === 0) {
        plantingStore.fetchItems();
      }
      if (seedlingStore.items.length === 0) {
        seedlingStore.fetchItems();
      }
    }
  }, [isOpen]);

  // 2026-07-12：种植记录选项（按 Tab 过滤 + 搜索）
  // 2026-07-24：搜索增加 cropVariety / subVariety1Name 字段（与种植管理列表一致）
  const plantingOptions = useMemo(() => {
    const plantings = plantingStore.items as any[];
    const activePlantings = plantings.filter((p: any) => !p.isHarvest);
    if (!bizSearchKeyword.trim() || bizTabType !== 'planting') return bizTabType === 'planting' ? activePlantings : [];
    const kw = bizSearchKeyword.toLowerCase();
    return activePlantings.filter((p: any) =>
      (p.plantCode || '').toLowerCase().includes(kw) ||
      (p.cropName || '').toLowerCase().includes(kw) ||
      (p.cropVariety || '').toLowerCase().includes(kw) ||
      (p.subVariety1Name || '').toLowerCase().includes(kw) ||
      (p.rootName || '').toLowerCase().includes(kw) ||
      (p.areaName || '').toLowerCase().includes(kw)
    );
  }, [bizSearchKeyword, bizTabType, plantingStore.items]);

  // 2026-07-12：育苗记录选项（按 Tab 过滤 + 搜索）
  const seedlingOptions = useMemo(() => {
    const seedlings = seedlingStore.items as any[];
    if (!bizSearchKeyword.trim() || bizTabType !== 'seedling') return bizTabType === 'seedling' ? seedlings : [];
    const kw = bizSearchKeyword.toLowerCase();
    return seedlings.filter((s: any) =>
      (s.seedlingCode || '').toLowerCase().includes(kw) ||
      (s.cropName || '').toLowerCase().includes(kw) ||
      (s.siteName || '').toLowerCase().includes(kw)
    );
  }, [bizSearchKeyword, bizTabType, seedlingStore.items]);

  // 2026-07-24：种植/育苗项展示用品种（与种植管理列表一致：红颜 > 草莓）
  const formatPlantingDisplay = (p: any) => p.subVariety1Name || p.cropVariety || p.cropName || '';

  // 点击外部关闭搜索下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // 2026-10-21：目标病虫害 / 药剂池的"点击外部关闭"已随 UI 移入各自组件内部
      if (bizSearchRef.current && !bizSearchRef.current.contains(e.target as Node)) {
        setShowBizSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 2026-10-21：药剂池（类型筛选/搜索/入池/改池）与目标病虫害（词典过滤/勾选/移除）
  //   的全部内部 state 与派生逻辑，已随 UI 一并移入共享组件
  //   PesticidePoolEditor / TargetPestPicker，本文件只保留池数据本身（pesticidePool）。

  // 重置表单
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const dateStr = todayLocal(now);
      const timeStr = currentTimeLocal(now);
      // 2026-07-11：强制整点（HH:00:00），分钟/秒归零
      const hh = (timeStr || '').split(':')[0] || '00';
      const hhTimeStr = `${hh}:00:00`;
      setForm({
        recordCode: '',
        sprayTime: dateStr ? `${dateStr} ${hhTimeStr}` : '',
        cropName: '',
        greenhouseName: '',
        operatorName: '',
        targetPests: [],
        description: '',
      });
      // 药剂池重置（2026-10-21：组件内部状态已外移，本文件只清池数据本身）
      setPesticidePool([]);
      // 2026-07-17：肥料池始终可见，重置为空数组
      setFertilizerPool([]);
      // 2026-07-12：防治区域多选重置
      setSelectedBizRecords([]);
      setBizSearchKeyword('');
      setShowBizSearch(false);
      setBizTabType('planting');
      // 2026-07-21 P1-修复：弹窗打开时重置自动反填 flag=true，让新一次勾选重新进入自动反填状态
      cropNameAutoFilledRef.current = true;
      // 2026-10-21：目标病虫害内部状态由 TargetPestPicker 自身管理（每次挂载即初始值），
      //   这里无需再调 setPestTabType / setPestSearchKeyword 等
    }
  }, [isOpen]);

  // 更新表单字段
  const updateForm = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // 2026-07-11：移除原 PesticideItem 多卡片相关函数（addPesticideItem/removePesticideItem/updatePesticideItem/togglePesticideTypeInItem/renderPesticideTypeSelector）
// 改为统一的药剂池（toggleTypeFilter/addToPool/removeFromPool/updatePoolField）

  // 2026-07-21：放宽防治区域选择限制 — 取消同作物/同类型互斥，允许跨作物跨类型共用药剂
  // 修改点：
  // - 移除「同一次防治记录只能针对同一作物」校验
  // - 移除「种植/育苗二选一」互斥校验
  // - 保留作物自动反填逻辑（仅在用户未手动改过 cropName 时），但允许多作物并存
  // - 2026-07-21 P1-修复：用 cropNameAutoFilledRef 追踪"用户是否手动改过"，
  //   避免旧逻辑「第二次勾选时 form.cropName 已非空，if (!form.cropName) 跳过同步」导致多作物丢失
  const handleToggleBizRecord = (kind: 'planting' | 'seedling', record: any, area: string) => {
    const recordId = record.id;
    // 2026-07-24：cropName 优先存品种（与种植管理列表一致：红颜）
    const cropName = record.subVariety1Name || record.cropVariety || record.cropName || '';
    const code = kind === 'planting' ? record.plantCode : record.seedlingCode;
    setSelectedBizRecords((prev) => {
      const isSelected = prev.some((r) => r.type === kind && r.id === recordId);
      if (isSelected) {
        const next = prev.filter((r) => !(r.type === kind && r.id === recordId));
        // 同步作物：仅当处于"自动反填"状态时，去重拼接所有 cropName
        if (cropNameAutoFilledRef.current) {
          const cropNames = [...new Set(next.map((r) => r.cropName).filter(Boolean))];
          updateForm('cropName', cropNames.join(','));
          // 全部清空时重置 ref 为 true，便于下次勾选重新开始反填
          if (next.length === 0) cropNameAutoFilledRef.current = true;
        }
        // 同步 greenhouseName：去重按区域排序 join
        const areas = Array.from(new Set(next.map((r) => r.area))).filter(Boolean);
        updateForm('greenhouseName', areas.join(','));
        return next;
      }
      // 2026-07-21：新增不再校验作物一致性和类型互斥 — 同一次可选跨作物/跨种植/跨育苗
      const nextItem: SelectedBizRecord = { type: kind, id: recordId, code: code || '', cropName, area };
      const next = [...prev, nextItem];
      // 自动填入作物：仅当处于"自动反填"状态时，去重拼接所有 cropName
      if (cropNameAutoFilledRef.current) {
        const cropNames = [...new Set(next.map((r) => r.cropName).filter(Boolean))];
        updateForm('cropName', cropNames.join(','));
      }
      // 同步 greenhouseName：去重按区域排序 join
      const areas = Array.from(new Set(next.map((r) => r.area))).filter(Boolean);
      updateForm('greenhouseName', areas.join(','));
      return next;
    });
  };

  // 2026-07-12：清除全部已选
  // 2026-07-21 P1-修复：清除时同时重置 cropNameAutoFilledRef=true，让后续重新勾选能继续自动反填
  const handleClearBizRecords = () => {
    setSelectedBizRecords([]);
    updateForm('greenhouseName', '');
    cropNameAutoFilledRef.current = true;
  };

  // 提交
  const handleSubmit = async () => {
    if (!form.sprayTime) {
      await showAlert('请选择防治日期');
      return;
    }
    if (!form.cropName) {
      await showAlert('请输入或选择作物名称');
      return;
    }
    // 2026-07-11：药剂池校验 — 至少 1 个药剂
    if (pesticidePool.length === 0) {
      await showAlert('请至少添加 1 个药剂到防治药剂池');
      return;
    }

    setSubmitting(true);
    try {
      // 2026-07-11：合并池中所有药剂类型的并集作为记录级 pesticideTypes
      const allTypes = Array.from(new Set(pesticidePool.flatMap((it) => it.pesticideTypes || [])));
      // 取第一个药剂的主字段作为记录级（兼容老字段 pesticideName/dosage 等）
      const first = pesticidePool[0];

      // 序列化药剂池为 pesticideList JSON（schema 兼容旧字段名 + 2026-07-11 规格级）
      const pesticideListJson = JSON.stringify(
        pesticidePool.map((it) => ({
          name: it.pesticideName,
          pesticideId: it.pesticideId,
          pesticideCode: it.pesticideCode,
          // 2026-07-11：精确到规格
          specId: it.specId,
          specContent: it.specContent,
          formulation: it.formulation,
          manufacturer: it.manufacturer,
          brandName: it.brandName,
          // 2026-07-18 P0-C6 修复：统一写 pesticideTypes 字段名，删除 type/types 别名
          pesticideTypes: it.pesticideTypes || [],
          dosage: it.dosage,
          unit: it.unit,
          ratio: it.dilutionRatio,
          applicationMethod: it.applicationMethod,
          remarks: it.remarks,
        }))
      );

      await pestStore.createItem({
        farmTaskId: farmTaskId || undefined,
        // P1-1 合规生产档案
        source: complianceSource || undefined,
        stopUseDate: stopUseDate || undefined,
        sprayTime: form.sprayTime,
        operatorName: form.operatorName,
        cropName: form.cropName,
        // 2026-07-21：放宽限制后 — 写入多作物 JSON 数组（与 fertilizer_records 对齐）
        // - 优先取已选批次的去重 cropName 列表
        // - 若没有批次选中，回退为 [cropName] 单元素数组
        cropNames: JSON.stringify(
          Array.from(new Set(selectedBizRecords.map((r) => r.cropName).filter(Boolean))).length > 0
            ? Array.from(new Set(selectedBizRecords.map((r) => r.cropName).filter(Boolean)))
            : [form.cropName].filter(Boolean)
        ),
        greenhouseName: form.greenhouseName,
        // 2026-07-18 P0-C1 修复：补传关联业务 ID/Code（之前完全丢失）
        // - selectedBizRecords 是用户多选的种植/育苗记录数组
        // - 按 type 分组 join 成逗号分隔字符串（与后端 schema 一致）
        plantingId: selectedBizRecords.filter((r) => r.type === 'planting').map((r) => r.id).join(',') || undefined,
        plantingCode: selectedBizRecords.filter((r) => r.type === 'planting').map((r) => r.code).filter(Boolean).join(',') || undefined,
        seedlingId: selectedBizRecords.filter((r) => r.type === 'seedling').map((r) => r.id).join(',') || undefined,
        seedlingCode: selectedBizRecords.filter((r) => r.type === 'seedling').map((r) => r.code).filter(Boolean).join(',') || undefined,
        // 2026-07-18 P1-H3 修复：targetPests 多选用 JSON 数组存储（之前 join(' ') 导致详情页只能解析为一个 chip）
        targetPest: JSON.stringify(form.targetPests),
        description: form.description,
        pesticideTypes: allTypes,
        // 兼容老字段（取池中第一个药剂）
        pesticideName: first.pesticideName,
        pesticideId: first.pesticideId,
        dosage: first.dosage ? Number(first.dosage) : undefined,
        dosageUnit: first.unit,
        dilutionRatio: first.dilutionRatio,
        applicationMethod: first.applicationMethod,
        // JSON 列表字段（池数据）
        pesticideList: pesticideListJson,
        // 2026-07-17：肥料联用字段复用 FertilizerPoolEditor 数据结构
        // - fertilizerPool 为空时 useLeafFertilizer='no' + leafFertilizerList=null
        // - 有数据时序列化为 JSON（含 specId/fertilizerName/fertilizerType/brandName 等）
        useLeafFertilizer: fertilizerPool.length > 0 ? 'yes' : 'no',
        leafFertilizerList: fertilizerPool.length > 0
          ? JSON.stringify(fertilizerPool)
          : null,
        // 兼容旧字段（取池中第一个，仍需保留 schema 兼容）
        leafFertilizerName: fertilizerPool[0]?.fertilizerName,
        leafFertilizerDosage: fertilizerPool[0]?.dosage ? Number(fertilizerPool[0].dosage) : undefined,
        leafFertilizerUnit: fertilizerPool[0]?.unit,
        // 兼容 bio/physical 字段（如有填）
        bioAgentList: JSON.stringify([]),
        equipmentList: JSON.stringify([]),
        // 2026-07-17：移除 status 字段（DB 列已删除，业务上防治记录无中间态）
      } as any);
      onSaved();
    } catch (err) {
      await showAlert('保存失败：' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // 2026-07-12：选项按 Tab 类别计算为 plantingOptions / seedlingOptions

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新增防治记录"
      size="xl"
      width={1170}   // 2026-07-11：默认尺寸整体 +30%（900 * 1.3 = 1170）
      height={780}   // 600 * 1.3 = 780
      showFooter={false}
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* 基础信息 */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">📋 基础信息</h3>
          <div className="space-y-4">
            {/* 2026-07-11：防治日期 + 操作员（移到关联业务上方） */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">防治日期 <span className="text-red-500">*</span><span className="text-gray-500 text-xs ml-1">（精确到整点）</span></Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={form.sprayTime ? form.sprayTime.split(' ')[0] : ''}
                    onChange={(e) => {
                      // 2026-07-11：拆成日期 + 小时两个独立控件（避免分钟干扰）
                      const date = e.target.value;
                      const hh = (form.sprayTime || '').split(' ')[1]?.split(':')[0] || '00';
                      updateForm('sprayTime', date ? `${date} ${hh}:00:00` : '');
                    }}
                    className={`${deepInputClass} flex-1`}
                  />
                  <select
                    value={(form.sprayTime || '').split(' ')[1]?.split(':')[0] || '00'}
                    onChange={(e) => {
                      const hh = e.target.value;
                      const date = (form.sprayTime || '').split(' ')[0] || '';
                      updateForm('sprayTime', date ? `${date} ${hh}:00:00` : ` ${hh}:00:00`);
                    }}
                    className="px-3 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner bg-white"
                  >
                    {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(hh => (
                      <option key={hh} value={hh}>{hh}:00</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-gray-900">操作员</Label>
                <Input
                  type="text"
                  value={form.operatorName}
                  onChange={(e) => updateForm('operatorName', e.target.value)}
                  placeholder="请输入操作员"
                  className={deepInputClass}
                />
              </div>
            </div>

            {/* P1-1 合规生产档案：来源 / 停用日期 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">投入品来源 <span className="text-gray-500 text-xs">（供应商/自产等）</span></Label>
                <Input
                  type="text"
                  value={complianceSource}
                  onChange={(e) => setComplianceSource(e.target.value)}
                  placeholder="例如：XX 农资公司 / 自产"
                  className={deepInputClass}
                />
              </div>
              <div>
                <Label className="text-gray-900">停用日期 <span className="text-gray-500 text-xs">（停用期）</span></Label>
                <Input
                  type="date"
                  value={stopUseDate}
                  onChange={(e) => setStopUseDate(e.target.value)}
                  className={deepInputClass}
                />
              </div>
            </div>

            {/* P0-3：关联农事任务（可选） */}
            <div>
              <Label className="text-gray-900">关联农事任务 <span className="text-gray-500 text-xs">（可选）</span></Label>
              <select
                value={farmTaskId}
                onChange={(e) => setFarmTaskId(e.target.value)}
                className="w-full px-3 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner bg-white"
              >
                <option value="">不关联</option>
                {pesticideTasks.slice(0, 200).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.taskCode || t.id} · {t.title || ''}{t.status === 'completed' ? '（已完成）' : ''}
                  </option>
                ))}
              </select>
              {pesticideTasks.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">暂无可关联的防治任务</p>
              )}
            </div>

            {/* 2026-07-12：防治区域多选 — Tab 切换种植/育苗 + record 列表多选；同一次防治仅同一作物 */}
            {/* 2026-07-16 重构：拆 grid-cols-2 — 左半 Tab+搜索，右半 已选 chips + 清除，与其他 row 视觉对齐 */}
            <div ref={bizSearchRef} className="relative">
              <div className="grid grid-cols-2 gap-4">
                {/* 左半：Label + Tab + 搜索框 */}
                <div className="flex flex-col">
                  <Label className="text-gray-900 mb-1">
                    📍 防治区域 <span className="text-gray-500 text-xs">（可多选；可跨作物/跨类型，共用同一套药剂）</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    {/* Tab 切换 */}
                    <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 shrink-0">
                      <button
                        type="button"
                        onClick={() => { setBizTabType('planting'); setShowBizSearch(true); }}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                          bizTabType === 'planting' ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        🌱 种植
                      </button>
                      <button
                        type="button"
                        onClick={() => { setBizTabType('seedling'); setShowBizSearch(true); }}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                          bizTabType === 'seedling' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        🌿 育苗
                      </button>
                    </div>
                    {/* 搜索框 */}
                    <Input
                      type="text"
                      value={bizSearchKeyword}
                      onChange={(e) => { setBizSearchKeyword(e.target.value); setShowBizSearch(true); }}
                      onFocus={() => setShowBizSearch(true)}
                      placeholder={bizTabType === 'planting' ? '搜索种植批号...' : '搜索育苗批号...'}
                      className={`flex-1 ${deepInputClass} rounded-l-lg`}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowBizSearch(!showBizSearch)}
                      className="border border-l-0 border-gray-400 rounded-l-none rounded-r-lg shrink-0"
                    >
                      <Search className="w-4 h-4 text-gray-500" />
                    </Button>
                  </div>
                </div>
                {/* 右半：已选 chips 显示（与其他 row 右列对齐） */}
                <div className="flex flex-col">
                  <Label className="text-gray-900 mb-1">
                    已选防治区域 <span className="text-gray-500 text-xs">（{selectedBizRecords.length} 个）</span>
                  </Label>
                  <div className={`${deepInputClass} min-h-[42px] flex flex-wrap items-center gap-1.5 px-2 py-1`}>
                    {selectedBizRecords.length > 0 ? (
                      <>
                        {selectedBizRecords.map((r) => (
                          <span
                            key={`${r.type}-${r.id}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs"
                          >
                            <span>{r.type === 'planting' ? '🌱' : '🌿'}</span>
                            <span className="font-mono">{r.code}</span>
                            <span>· {r.area}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleBizRecord(r.type, { id: r.id, cropName: r.cropName, plantCode: r.code, seedlingCode: r.code }, r.area)}
                              className="ml-0.5 text-emerald-600 hover:text-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        <button
                          type="button"
                          onClick={handleClearBizRecords}
                          className="text-xs text-gray-500 hover:text-red-600 ml-auto"
                        >
                          清除全部
                        </button>
                      </>
                    ) : (
                      <span className="text-gray-400 text-sm">请从左侧选择区域</span>
                    )}
                  </div>
                </div>
              </div>
              {/* 下拉选项列表 */}
              {showBizSearch && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {bizTabType === 'planting' && plantingOptions.length > 0 && (
                    plantingOptions.map((p: any) => {
                      const checked = selectedBizRecords.some((r) => r.type === 'planting' && r.id === p.id);
                      const area = p.rootName || p.areaName || '';
                      return (
                        <Button
                          key={p.id}
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleBizRecord('planting', p, area)}
                          className="w-full justify-between rounded-none border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center gap-2 text-left min-w-0 flex-1">
                            <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-white'
                            }`}>
                              {checked && <span className="text-xs">✓</span>}
                            </span>
                            {/* 2026-07-16：单行 3 段（ID|作物|区域），竖线分隔，不同颜色 */}
                            <span className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                              <span className="text-sm font-mono font-semibold text-blue-700 truncate" title={p.plantCode}>
                                {p.plantCode}
                              </span>
                              <span className="text-gray-300 shrink-0">|</span>
                              <span className="text-sm font-medium text-emerald-700 truncate" title={formatPlantingDisplay(p)}>
                                {formatPlantingDisplay(p) || '-'}
                              </span>
                              <span className="text-gray-300 shrink-0">|</span>
                              <span className="text-xs text-gray-600 truncate" title={area}>
                                {area || '-'}
                              </span>
                            </span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                            p.isHarvest ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-600'
                          }`}>
                            {p.isHarvest ? '已采收' : '种植中'}
                          </span>
                        </Button>
                      );
                    })
                  )}
                  {bizTabType === 'seedling' && seedlingOptions.length > 0 && (
                    seedlingOptions.map((s: any) => {
                      const checked = selectedBizRecords.some((r) => r.type === 'seedling' && r.id === s.id);
                      const area = s.siteName || '';
                      return (
                        <Button
                          key={s.id}
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleBizRecord('seedling', s, area)}
                          className="w-full justify-between rounded-none border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center gap-2 text-left min-w-0 flex-1">
                            <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              checked ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 bg-white'
                            }`}>
                              {checked && <span className="text-xs">✓</span>}
                            </span>
                            {/* 2026-07-16：单行 3 段（ID|作物|区域），竖线分隔，不同颜色 */}
                            <span className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                              <span className="text-sm font-mono font-semibold text-blue-700 truncate" title={s.seedlingCode}>
                                {s.seedlingCode}
                              </span>
                              <span className="text-gray-300 shrink-0">|</span>
                              <span className="text-sm font-medium text-emerald-700 truncate" title={formatPlantingDisplay(s)}>
                                {formatPlantingDisplay(s) || '-'}
                              </span>
                              <span className="text-gray-300 shrink-0">|</span>
                              <span className="text-xs text-gray-600 truncate" title={area}>
                                {area || '-'}
                              </span>
                            </span>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 shrink-0 ml-2">
                            育苗中
                          </span>
                        </Button>
                      );
                    })
                  )}
                  {((bizTabType === 'planting' && plantingOptions.length === 0) ||
                    (bizTabType === 'seedling' && seedlingOptions.length === 0)) && (
                    <div className="p-4 text-center text-sm text-gray-400">
                      无匹配的{bizTabType === 'planting' ? '种植' : '育苗'}记录
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 作物名称（由所选首个 record 反填，可手改）+ 防治区域显示（多 chip，区域名去重） */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">
                  作物名称 <span className="text-red-500">*</span>
                  {selectedBizRecords.length > 0 && (
                    <span className="ml-2 text-xs text-emerald-600">
                      （由所选批次反填，多个作物逗号分隔，可手改）
                    </span>
                  )}
                </Label>
                <Input
                  type="text"
                  value={form.cropName}
                  // 2026-07-21 P1-修复：用户主动在 Input 中改动 → 标记 ref=false，
                  // 后续勾选新区域时不再覆盖（但用户可随时重新勾选来恢复）
                  onChange={(e) => {
                    cropNameAutoFilledRef.current = false;
                    updateForm('cropName', e.target.value);
                  }}
                  placeholder={selectedBizRecords.length > 0 ? '由所选批次反填（逗号分隔）' : '请输入作物名称'}
                  className={deepInputClass}
                />
              </div>
              <div>
                <Label className="text-gray-900">
                  防治区域明细（已选，去重）
                </Label>
                <div className={`${deepInputClass} min-h-[42px] flex flex-wrap items-center gap-1.5 px-2 py-1`}>
                  {(() => {
                    const areas = Array.from(new Set(selectedBizRecords.map((r) => r.area))).filter(Boolean);
                    return areas.length > 0 ? areas.map((area) => (
                      <span
                        key={area}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs"
                      >
                        📍 {area}
                      </span>
                    )) : <span className="text-gray-400 text-sm">尚未选择区域</span>;
                  })()}
                </div>
              </div>
            </div>

            {/* 2026-10-21：抽取为共享组件 TargetPestPicker —— 农事任务的
                「病虫害防治 - 详细配置」复用同一份（病害/虫害 Tab + 搜索多选 + 已选 chip）。 */}
            <TargetPestPicker
              value={form.targetPests}
              onChange={(names) => setForm((prev) => ({ ...prev, targetPests: names }))}
            />
          </div>
        </div>

        {/* 2026-10-21：抽取为共享组件 PesticidePoolEditor —— 与肥料侧的
            FertilizerPoolEditor 对称，农事任务的病虫害配置复用同一份。 */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">💊 防治药剂池（多选，先选类型再选药剂）</h3>
          <PesticidePoolEditor pool={pesticidePool} onChange={setPesticidePool} />
        </div>
        {/* 2026-07-17：肥料联用池复用 FertilizerPoolEditor（与新增施肥记录一致） */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">🧪 肥料联用（可选，先选类型再选肥料）</h3>
          <FertilizerPoolEditor pool={fertilizerPool} onChange={setFertilizerPool} />
        </div>

        {/* 备注 */}
        <div>
          <Label className="text-gray-900">备注</Label>
          <TextArea
            value={form.description}
            onChange={(e) => updateForm('description', e.target.value)}
            placeholder="请输入备注"
            rows={2}
            className="px-3 py-2 border border-gray-400 rounded-lg text-sm resize-none"
          />
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={onClose}>
          <X className="w-4 h-4" /> 取消
        </Button>
        <Button variant="default" size="sm" onClick={handleSubmit} disabled={submitting}>
          {submitting ? '保存中...' : '保存'}
        </Button>
      </div>
    </UnifiedModal>
  );
}