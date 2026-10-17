/**
 * 作物管理通用回收站页面（2026-10-17）
 *
 * 覆盖：种源 / 育苗 / 种植 / 水肥 / 病虫害 / 每日记录
 * 能力：按类型/关键字/状态筛选、查看快照、恢复（管理员/主管）、彻底删除（管理员）
 */
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Eye, RotateCcw, Search, Trash2 } from 'lucide-react';
import { Button, Input, Pagination, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, UnifiedModal } from '@/components/ui';
import { useRecycleBinStore } from '@/stores';
import { showAlert, showConfirm, showToast } from '@/lib/dialogService';
import {
  RECYCLE_ENTITY_LABELS,
  RECYCLE_STATUS_LABELS,
  RECYCLE_VIEW_ONLY_TYPES,
  type RecycleBinItem,
} from '@/types/recycleBin';

const ENTITY_OPTIONS = [
  { value: 'all', label: '全部类型' },
  ...Object.entries(RECYCLE_ENTITY_LABELS).map(([value, label]) => ({ value, label })),
];

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待恢复' },
  { value: 'restored', label: '已恢复' },
  { value: 'failed', label: '归档失败' },
];

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  restored: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  purged: 'bg-gray-100 text-gray-600',
};

/** 从快照中提取常用展示字段（失败返回空对象） */
function parseSnapshot(item: RecycleBinItem): Record<string, any> {
  try {
    return JSON.parse(item.snapshot || '{}');
  } catch {
    return {};
  }
}

// ============================================================
// 快照「人话化」渲染：字段中文名 + 值格式化（不再直接展示 JSON 代码）
// ============================================================

/** 数据库字段 → 中文名称（未收录的字段回退为原字段名） */
const FIELD_LABELS: Record<string, string> = {
  id: '记录编号',
  seedling_code: '育苗批号',
  planting_code: '种植批号',
  source_code: '种源批号',
  source_name: '种源名称',
  record_code: '记录单号',
  fertilizer_code: '水肥单号',
  record_date: '记录日期',
  spray_time: '防治时间',
  fertilize_time: '施肥时间',
  crop_code: '作物编码',
  crop_name: '作物名称',
  crop_variety: '作物品种',
  crop_names: '作物名称',
  category: '类别',
  type_name: '类型',
  variety_name: '品种',
  greenhouse_name: '温室/区域',
  area_name: '区域',
  area_id: '区域编号',
  unit: '单位',
  quantity: '数量',
  initial_count: '初始数量',
  seedling_quantity: '育苗数量',
  survival_quantity: '存活数量',
  survival_rate: '存活率',
  mother_plant_count: '母株数量',
  mother_loss_count: '母株累计损耗',
  seedling_loss_count: '小苗累计损耗',
  expanded_plant_count: '小苗累计产出',
  harvest_stocked_count: '已入库数量',
  replant_count: '补苗累计',
  target_survival_count: '目标成苗数',
  target_survival_rate: '目标成苗率',
  loss_count: '累计损耗',
  loss_rate: '损耗率',
  source_id: '种源编号',
  source_mode: '种源来源模式',
  source_type: '来源类型',
  source_deducted_quantity: '已扣减种源量',
  propagation_mode: '繁殖模式',
  propagation_type: '繁殖方式',
  propagation_method: '繁殖方法',
  propagation_status: '繁殖状态',
  plan_type: '计划类型',
  calculate_mode: '计算模式',
  production_plan_code: '关联生产计划',
  production_plan_id: '生产计划编号',
  seedling_type: '育苗方式',
  seedling_form: '育苗后形态',
  seedling_date: '开始日期',
  start_date: '开始日期',
  expected_finish_date: '预计结束日期',
  expected_end_date: '预计结束日期',
  actual_finish_date: '实际结束日期',
  end_date: '结束日期',
  end_time: '结束时间',
  end_type: '结束类型',
  status: '状态',
  seedling_status: '育苗状态',
  quality_grade: '品质等级',
  charge_person: '负责人',
  operator_name: '操作人',
  operator_id: '操作人编号',
  create_by: '创建人',
  create_time: '创建时间',
  update_time: '更新时间',
  deleted_at: '删除时间',
  remarks: '备注',
  description: '说明',
  work_hours: '工时（小时）',
  is_finished: '是否结束',
  is_harvest: '是否采收',
  harvest_date: '采收日期',
  harvest_quantity: '采收数量',
  harvest_to_inventory_qty: '已入库数量',
  planting_quantity: '种植数量',
  plant_date: '种植日期',
  plot_name: '地块',
  data_source: '数据来源',
  fertilizer_name: '肥料名称',
  fertilizer_type: '肥料类型',
  fertilizer_id: '肥料库编号',
  fertilization_pool: '施肥区域明细',
  dilution_ratio: '稀释倍数',
  unit_price: '单价',
  total_cost: '总成本',
  pesticide_name: '药剂名称',
  pesticide_type: '药剂类型',
  dosage: '用量',
  dosage_unit: '用量单位',
  target_pest: '防治对象',
  application_method: '施用方法',
  leaf_fertilizer_list: '叶面肥明细',
  pesticide_list: '药剂明细',
  bio_agent_list: '生物制剂明细',
  equipment_list: '设备明细',
  equipment_name: '设备名称',
  equipment_count: '设备数量',
  photos: '照片',
  pictures: '图片',
  related_id: '关联记录编号',
  related_code: '关联单号',
  related_type: '关联类型',
  record_type: '记录类型',
  data: '数量变更明细',
  created_at: '创建时间',
  restore_status: '恢复状态',
  is_revoked: '是否已撤销',
  revoked_at: '撤销时间',
  revoked_by: '撤销人',
  // 每日记录 data 内的变更字段
  motherLossChange: '母株损耗',
  seedlingLossChange: '小苗损耗',
  expandedChange: '小苗产出',
  transplantedChange: '定植数量',
  replantChange: '补苗数量',
};

// 2026-10-17：补齐 6 类实体全部列 + 嵌套 JSON 字段的中文名。
// 未收录字段一律不展示（buildSnapshotRows 过滤），确保详情页不出现任何英文字段名。
Object.assign(FIELD_LABELS, {
  // 种源补充
  used_quantity: '已使用数量', remaining_quantity: '可用数量', source_origin: '来源途径',
  crop_category: '作物类别', variety_name: '品种名称', purchase_date: '采购日期',
  purchase_price: '采购单价', total_amount: '总金额', supplier_id: '供应商编号', supplier_name: '供应商名称',
  parent_male_id: '父本编号', parent_male_code: '父本编号', parent_female_id: '母本编号', parent_female_code: '母本编号',
  mother_plant_id: '母株编号', mother_plant_code: '母株编号', linked_planting_id: '关联种植编号',
  linked_planting_code: '关联种植单号', propagation_start_date: '繁殖开始日期',
  expected_harvest_date: '预计采收日期', actual_harvest_date: '实际采收日期', breeding_location: '繁育地点',
  target_traits: '目标性状', generation: '世代', print_count: '打印次数', parent_source_id: '父级种源编号',
  transferred_from_stock_id: '调拨来源库存编号', transferred_from_business_type: '调拨来源业务类型',
  transferred_from_business_id: '调拨来源业务编号', original_inbound_date: '原始入库日期',
  original_source_module: '原始来源模块', original_source_id: '原始来源编号',
  original_harvest_record_id: '原始采收记录编号', original_crop_id: '原始作物编号', original_crop_name: '原始作物名称',
  original_variety_id: '原始品种编号', original_variety_name: '原始品种名称', original_unit: '原始单位',
  original_unit_price: '原始单价', original_supplier_id: '原始供应商编号', original_supplier_name: '原始供应商名称',
  original_production_plan_code: '原始生产计划', update_by: '最后修改人', stock_instance_id: '库存实例编号',
  reflow_count: '回流次数', last_reflow_at: '最后回流时间', parent_source_code: '父级种源编号',
  base_id: '基地编号', base_name: '基地名称', traceability_code: '溯源码',
  // 育苗补充
  planted_count: '已定植数量', external_seed_code: '外部种子编号', external_seed_name: '外部种子名称',
  external_seed_quantity: '外部种子数量', external_seed_note: '外部种子备注', scion_count: '接穗数量',
  transplanted_count: '累计定植数量', auto_planted_count: '自动定植数量', mother_loss_fixed: '母株损耗已修正',
  mother_source_type: '母株来源类型', mother_source_id: '母株来源编号', mother_source_code: '母株来源单号',
  inoculation_count: '接种数量', survival_count: '存活数量（旧）', mother_generation: '母株世代',
  mother_crop_name: '母株作物名称', mother_propagation_method: '母株繁殖方法',
  asexual_propagation_note: '无性繁殖说明', crop_id: '作物编号', propagation_multiple: '扩繁倍数',
  custom_multiple: '自定义倍数', theoretical_yield: '理论产量', available_transplant_count: '可出圃数量',
  // 种植补充
  planting_date: '种植日期', planted_quantity: '已定植数量', growth_status: '生长状态',
  soil_ph: '土壤酸碱度', soil_ec: '土壤电导率', attrition_rate: '损耗率', area_id: '区域编号',
  root_name: '砧木/根名称', transplant_count: '移栽次数', transplant_date: '移栽日期',
  is_harvest_locked: '采收锁定', target_yield: '目标产量', target_yield_unit: '目标产量单位',
  is_breeding: '是否繁育', breeding_method: '繁育方法', is_seed_saving: '是否留种',
  seed_plant_marker: '留种植株标记', supplement_count: '补苗数量',
  harvest_to_inventory_unit: '已入库单位', origin_path: '原始路径',
  // 水肥补充
  farm_task_id: '农事任务编号', greenhouse_id: '温室编号', iot_device_id: '物联网设备编号', iot_record_id: '物联网记录编号',
  spec_id: '肥料规格编号', spec_brand_name: '品牌', spec_unit_price_snapshot: '规格单价快照',
  spec_batch_number: '规格批次号', source_daily_record_id: '来源每日记录编号', source_item_id: '来源明细编号',
  real_fertilizer_code: '实际肥料编码', crop_names: '作物名称',
  // 病虫害补充
  spec_content: '规格含量', bio_agent_id: '生物制剂编号', bio_agent_name: '生物制剂名称',
  bio_agent_type: '生物制剂类型', use_leaf_fertilizer: '是否使用叶面肥',
  leaf_fertilizer_name: '叶面肥名称', leaf_fertilizer_dosage: '叶面肥用量', leaf_fertilizer_unit: '叶面肥单位',
  real_pesticide_code: '实际药剂编码',
  // 嵌套 JSON 字段
  type: '类型', area: '区域', code: '单号', fertilizerSpecId: '肥料规格编号',
  brandName: '品牌', manufacturer: '生产厂家', fertilizationMethod: '施肥方式',
  stockQuantity: '库存数量', stockUnit: '库存单位', name: '名称', ratio: '配比',
  applicationMethod: '施用方法', temperature: '温度', humidity: '湿度', watering: '是否浇水',
  abnormality: '异常情况', survivalCountChange: '存活数变化', plantedCountChange: '定植数变化',
  lossCountChange: '损耗变化', runnerIncreaseCount: '匍匐茎增加', phValue: '酸碱度', ecValue: '电导率',
  operator: '操作人', pesticideCode: '药剂编码', fertilizerCode: '肥料编码',
  // P2：作物库存
  instance_id: '库存实例编号', stock_type: '库存类型', business_id: '业务编号', business_type: '业务类型',
  business_code: '业务单号', variety_id: '品种编号',
  current_quantity: '当前数量', frozen_quantity: '冻结数量', available_quantity: '可用数量',
  warehouse_id: '仓库编号', warehouse_name: '仓库名称', inbound_date: '入库日期',
  source_instance_id: '来源库存实例', production_plan_id: '生产计划编号', version: '版本号',
  planting_mode: '种植方式', grade: '等级', auditor: '审核人',
  quality_grade: '品质等级', source_module: '来源模块', notes: '说明', product_form: '产品形态',
  propagation_form: '繁殖形态', source_form: '来源形态', is_supplementary: '是否补录',
  supplementary_reason: '补录原因', supplementary_at: '补录时间', supplementary_by: '补录人',
  // P2：采收入库
  harvest_code: '采收单号', harvest_date: '采收日期', harvest_quantity: '采收数量',
  buyer_id: '买家编号', buyer_name: '买家名称', sales_channel: '销售渠道',
  harvester_ids: '采收人编号', harvester_names: '采收人', inbound_type: '入库方式',
  batch_code: '批次号', harvest_area: '采收面积', products: '产品明细', harvest_form: '采收形态',
  purchase_plan_id: '采购计划编号', purchaser_ids: '采购人编号', purchaser_names: '采购人',
  purchase_total_amount: '采购总额',
  // P2：种植采收记录
  record_type: '记录类型', destination: '去向', sub_type: '子类型',
  harvest_record_id: '采收入库记录编号', inventory_stock_id: '库存实例编号',
  circulation_record_id: '回流记录编号', circulation_revoked_at: '回流撤销时间',
  circulation_revoked_by: '回流撤销人', circulation_revoke_reason: '回流撤销原因',
  // P2：浇水
  water_code: '浇水单号', fertilizer_record_id: '关联施肥记录编号', water_pool: '浇水明细',
  total_water: '总水量', water_unit: '水量单位', water_cost: '水费', water_time: '浇水时间',
  // P2：繁殖记录
  seed_source_id: '种源编号', stage: '阶段', pollination_type: '授粉方式', pollinator_crop: '授粉作物',
  flower_count: '花朵数', fruit_set_count: '坐果数', harvest_seed_count: '采种数量', seed_weight: '种子重量',
  harvest_plant_count: '采收株数', germination_rate: '发芽率', purity: '纯度', moisture: '水分',
  rooted_rate: '生根率', graft_success_rate: '嫁接成活率', seedling_id: '育苗编号',
  seedling_output: '出苗量', transplant_position: '移栽位置', operation_type: '操作类型',
  reproduction_mode: '繁殖模式', survival_count_asexual: '无性繁殖存活数',
  // P2：流水/流转
  transaction_id: '流水编号', transaction_type: '流水类型', balance_before: '变动前余额',
  balance_after: '变动后余额', operate_date: '操作日期', flow_type: '流转类型',
  source_category: '来源类别', target_type: '目标类型', target_id: '目标编号', target_code: '目标单号',
  target_quantity: '目标数量', target_unit: '目标单位', created_at: '创建时间',
});

/** 枚举值中文映射（避免详情页出现英文枚举值） */
const ENUM_VALUE_LABELS: Record<string, string> = {
  // 通用状态
  sown: '已播种', in_progress: '生长中', transplant_ready: '待定植', completed: '已完成',
  abnormal: '异常结束', cancelled: '已取消', harvested: '已采收', growing: '生长中',
  active: '有效', inactive: '停用', pending: '待处理', dead: '死亡',
  // 模式/来源
  one_to_one: '1:1 育苗', one_to_many: '1:多 育苗', internal: '内部种源', external: '外部种源',
  manual: '手动录入', auto_iot: '物联网自动记录', daily_record_sync: '每日记录同步',
  single: '单株育苗', propagation: '扩繁育苗', routine: '常规育苗',
  // 种源/种植类型
  seed: '种源', seedling: '育苗', planting: '种植', inventory: '库存', transfer: '调拨',
  external_purchase: '外部采购', planting_self_kept: '种植留种', inventory_transfer: '库存调拨',
  harvest: '采收', purchase: '采购', external_seed: '外部种子',
  cutting: '扦插', grafting: '嫁接', tissue_culture: '组培', split: '分株', bulb: '鳞球', other: '其他',
  propagating: '繁育中', failed: '失败',
  normal: '正常', yes: '是', no: '否',
  plug: '穴盘育苗', ground: '地栽育苗',
  // 水肥/药剂
  water_soluble: '水溶肥', organic: '有机肥', compound: '复合肥', trace: '微量元素肥', foliar: '叶面肥',
  insecticide: '杀虫剂', fungicide: '杀菌剂', herbicide: '除草剂', acaricide: '杀螨剂',
  nematicide: '杀线虫剂', regulator: '调节剂',
  drip_irrigation: '滴灌', spray: '喷雾',
  seed_source: '种源',
  // 流水类型
  outbound: '出库', inbound: '入库', transfer_in: '调入', transfer_out: '调出',
  freeze: '冻结', unfreeze: '解冻', reverse_inbound: '冲销入库',
  harvest_record: '采收入库', planting_harvest_record: '种植采收',
  // 常见英文单位
  kg: '千克', g: '克', ml: '毫升', l: '升', t: '吨',
};

/** 枚举值翻译（未命中原样返回，仅用于值，不用于字段名） */
function translateEnumValue(value: string): string {
  return ENUM_VALUE_LABELS[value] || value;
}

/** 不展示的技术字段（用户看不懂且无业务意义） */
const HIDDEN_FIELDS = new Set([
  'tenant_id',
  'create_by_id',
  'area_oid',
  'oid',
  'merged_from_ids',
  'parent_male_id',
  'parent_female_id',
  'mother_plant_id',
  'linked_planting_id',
]);

/** 优先展示的业务字段顺序 */
const PRIORITY_FIELDS = [
  'seedling_code', 'planting_code', 'source_code', 'record_code', 'fertilizer_code',
  'crop_name', 'crop_variety', 'unit', 'quantity',
  'initial_count', 'seedling_quantity', 'mother_plant_count', 'planting_quantity',
  'status', 'record_date', 'seedling_date', 'plant_date', 'spray_time', 'fertilize_time',
  'greenhouse_name', 'area_name', 'operator_name', 'remarks',
];

/** JSON 值转成可读文本（明细数组 → 名称 + 数量；对象 → 字段: 值） */
function formatJsonValue(value: any): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return '-';
    return value.map((item) => {
      if (item === null || item === undefined) return '-';
      if (typeof item !== 'object') return translateEnumValue(String(item));
      const name = item.fertilizerName || item.pesticideName || item.name || item.cropName
        || item.area || item.code || item.specId || item.fertilizerSpecId || '';
      const qty = item.dosage ?? item.quantity ?? item.count;
      const unit = translateEnumValue(String(item.unit || item.dosageUnit || ''));
      const text = [name, qty !== undefined && qty !== null ? `${qty}${unit}` : '']
        .filter(Boolean).join(' ');
      if (text) return text;
      // 无名称/数量的对象：只展示有中文名的字段
      return Object.entries(item)
        .filter(([k]) => FIELD_LABELS[k])
        .slice(0, 4)
        .map(([k, v]) => `${FIELD_LABELS[k]}：${formatSnapshotValue(k, v)}`)
        .join('，') || '-';
    }).join('；');
  }
  if (value && typeof value === 'object') {
    const parts = Object.entries(value)
      .filter(([k]) => FIELD_LABELS[k])
      .map(([k, v]) => `${FIELD_LABELS[k]}：${formatSnapshotValue(k, v)}`);
    return parts.length ? parts.join('；') : '-';
  }
  return translateEnumValue(String(value));
}

/** 单个快照值格式化 */
function formatSnapshotValue(key: string, value: any): string {
  if (value === null || value === undefined || value === '') return '-';

  // 图片只显示数量，绝不渲染 Base64
  if (key === 'pictures' || key === 'photos') {
    try {
      const list = typeof value === 'string' ? JSON.parse(value) : value;
      if (Array.isArray(list)) return list.length > 0 ? `已上传 ${list.length} 张` : '-';
    } catch { /* 非 JSON 按普通文本处理 */ }
    return value === '[]' ? '-' : '已上传';
  }

  if (typeof value === 'boolean') return value ? '是' : '否';

  if (typeof value === 'number') {
    if (['is_finished', 'is_harvest', 'is_revoked', 'mother_loss_fixed'].includes(key)) {
      return value ? '是' : '否';
    }
    return String(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '[]' || trimmed === '{}') return '-';
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        return formatJsonValue(JSON.parse(trimmed));
      } catch { /* 解析失败回退文本 */ }
    }
    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
      return trimmed.replace('T', ' ').slice(0, 19);
    }
    if (key === 'status' || key === 'seedling_status' || key === 'propagation_mode'
      || key === 'source_mode' || key === 'data_source' || key === 'source_type'
      || key === 'source_origin' || key === 'propagation_type' || key === 'propagation_status'
      || key === 'growth_status' || key === 'end_type' || key === 'calculate_mode'
      || key === 'plan_type' || key === 'seedling_type' || key === 'fertilizer_type'
      || key === 'pesticide_type' || key === 'application_method' || key === 'use_leaf_fertilizer'
      || key === 'unit' || key === 'dosage_unit' || key === 'transferred_from_business_type') {
      return translateEnumValue(trimmed);
    }
    return translateEnumValue(trimmed.length > 300 ? `${trimmed.slice(0, 300)}…` : trimmed);
  }

  return formatJsonValue(value);
}

/** 把快照整理成可读的「字段名 + 值」列表 */
function buildSnapshotRows(snapshot: Record<string, any>): Array<{ key: string; label: string; value: string }> {
  const priority = (key: string) => {
    const index = PRIORITY_FIELDS.indexOf(key);
    return index === -1 ? PRIORITY_FIELDS.length : index;
  };
  return Object.keys(snapshot)
    // 只展示已收录中文名的字段：未收录字段直接隐藏，杜绝页面上出现英文字段名
    .filter((key) => !HIDDEN_FIELDS.has(key) && !!FIELD_LABELS[key])
    .sort((a, b) => priority(a) - priority(b) || a.localeCompare(b))
    .map((key) => ({
      key,
      label: FIELD_LABELS[key],
      value: formatSnapshotValue(key, snapshot[key]),
    }));
}

export default function RecycleBinPage() {
  const navigate = useNavigate();
  const {
    items, total, page, pageSize, stats, isLoading, error,
    loadItems, loadStats, restoreItem, purgeItem, clearError,
  } = useRecycleBinStore();

  const [keyword, setKeyword] = useState('');
  const [entityType, setEntityType] = useState('all');
  const [status, setStatus] = useState('');
  const [detailItem, setDetailItem] = useState<RecycleBinItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    loadItems({ page: 1, entityType: '', status: '', keyword: '' });
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (error) {
      showAlert(`回收站加载失败：${error}`);
      clearError();
    }
  }, [error, clearError]);

  const handleSearch = () => {
    loadItems({
      page: 1,
      entityType: entityType === 'all' ? '' : entityType,
      status,
      keyword: keyword.trim(),
    });
  };

  const handleReset = () => {
    setKeyword('');
    setEntityType('all');
    setStatus('');
    loadItems({ page: 1, entityType: '', status: '', keyword: '' });
  };

  const handleRestore = async (item: RecycleBinItem) => {
    const label = RECYCLE_ENTITY_LABELS[item.entityType] || item.entityType;
    const ok = await showConfirm(
      `确定恢复「${item.displayName || item.entityCode || item.id}」吗？\n\n`
      + `恢复后该${label}会重新出现在原页面列表；若涉及种源/肥料/药剂库存，系统会重新扣减并校验可用量，余额不足时恢复会被拒绝。`,
    );
    if (!ok) return;
    setBusyId(item.id);
    try {
      const result = await restoreItem(item.id);
      if (result.warnings?.length) {
        await showAlert(`已恢复，但请注意：\n${result.warnings.join('\n')}`);
      } else {
        showToast('恢复成功', 'success');
      }
    } catch (e) {
      await showAlert(`恢复失败：${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  };

  const handlePurge = async (item: RecycleBinItem) => {
    const ok = await showConfirm(
      `彻底删除「${item.displayName || item.entityCode || item.id}」的回收站记录？\n\n`
      + '该操作会清除归档快照，之后将无法再通过回收站恢复（不删除原业务数据）。',
    );
    if (!ok) return;
    setBusyId(item.id);
    try {
      await purgeItem(item.id);
      showToast('已彻底删除回收站记录', 'success');
    } catch (e) {
      await showAlert(`彻底删除失败：${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  /** 恢复按钮可用条件：待恢复 且 非流水类（流水/流转只归档查看） */
  const canRestore = (item: RecycleBinItem) =>
    item.restoreStatus === 'pending' && !RECYCLE_VIEW_ONLY_TYPES.has(item.entityType);

  const detailRows = useMemo(
    () => (detailItem ? buildSnapshotRows(parseSnapshot(detailItem)) : []),
    [detailItem],
  );

  // 2026-10-17：快照按「两个字段一排」展示
  const detailRowPairs = useMemo(() => {
    const pairs: Array<Array<{ key: string; label: string; value: string }>> = [];
    for (let i = 0; i < detailRows.length; i += 2) {
      pairs.push(detailRows.slice(i, i + 2));
    }
    return pairs;
  }, [detailRows]);

  return (
    <div className="space-y-6">
      {/* 标题卡片 — 与其他系统设置页保持一致（返回箭头 + 渐变图标 + 标题/副标题） */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings')}
              className="text-gray-500 hover:text-gray-700"
              title="返回系统设置"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">作物管理回收站</h1>
              <p className="text-gray-500">
                统一查看/恢复种源、育苗、种植、水肥、病虫害、每日记录的删除数据
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700">
              待恢复 <span className="font-semibold">{stats.total}</span> 条
            </div>
          </div>
        </div>
      </div>

      {/* 筛选区 */}
      <div className="bg-white rounded-xl p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <label className="block text-xs text-gray-500 mb-1">业务类型</label>
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger><SelectValue placeholder="全部类型" /></SelectTrigger>
              <SelectContent>
                {ENTITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <label className="block text-xs text-gray-500 mb-1">恢复状态</label>
            <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="全部状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-64">
            <label className="block text-xs text-gray-500 mb-1">关键字</label>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              placeholder="单号 / 摘要"
            />
          </div>
          <Button variant="default" size="sm" onClick={handleSearch}>
            <Search className="w-4 h-4" /> 搜索
          </Button>
          <Button variant="secondary" size="sm" onClick={handleReset}>重置</Button>
        </div>
      </div>

      {/* 列表 — 表头/行/分页与其他系统设置页统一 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">回收站编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">业务类型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">原单号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">摘要</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">删除人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">删除时间</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">状态</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300 bg-white">
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">加载中...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">回收站为空</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500 whitespace-nowrap">{item.id}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {RECYCLE_ENTITY_LABELS[item.entityType] || item.entityType}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-emerald-700 whitespace-nowrap">
                      {item.entityCode || '-'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 max-w-[320px] truncate" title={item.displayName}>
                      {item.displayName || '-'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{item.deletedBy || '-'}</td>
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                      {item.deletedAt ? item.deletedAt.replace('T', ' ').slice(0, 19) : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[item.restoreStatus] || 'bg-gray-100 text-gray-600'}`}>
                        {RECYCLE_STATUS_LABELS[item.restoreStatus] || item.restoreStatus}
                      </span>
                      {item.restoreStatus === 'failed' && item.restoreError && (
                        <div className="text-[10px] text-red-500 mt-0.5 max-w-[180px] truncate" title={item.restoreError}>
                          {item.restoreError}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost" size="icon" title="查看快照"
                          onClick={() => setDetailItem(item)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          title={RECYCLE_VIEW_ONLY_TYPES.has(item.entityType)
                            ? '流水类只归档查看，不支持恢复'
                            : (canRestore(item) ? '恢复' : '不可恢复')}
                          disabled={!canRestore(item) || busyId === item.id}
                          onClick={() => handleRestore(item)}
                        >
                          <RotateCcw className="w-4 h-4 text-emerald-600" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" title="彻底删除回收站记录（仅管理员）"
                          disabled={busyId === item.id}
                          onClick={() => handlePurge(item)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 — 与其他系统设置页统一（共享 Pagination 组件） */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100 rounded-b-xl">
          <div className="text-sm text-gray-500">共 {total} 条</div>
          <Pagination
            currentPage={page}
            totalPages={totalPages || 1}
            onPageChange={(nextPage) => loadItems({ page: nextPage })}
            pageSize={pageSize}
            onPageSizeChange={(size) => loadItems({ page: 1, pageSize: size })}
            pageSizeOptions={[10, 20, 50]}
            showPageSize
          />
        </div>
      </div>

      {/* 快照详情 */}
      <UnifiedModal
        isOpen={!!detailItem}
        onClose={() => setDetailItem(null)}
        title="回收站记录详情"
        size="lg"
        showFooter={false}
        width={900}
        height={620}
      >
        {detailItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">回收站编号：</span>{detailItem.id}</div>
              <div><span className="text-gray-500">业务类型：</span>{RECYCLE_ENTITY_LABELS[detailItem.entityType] || detailItem.entityType}</div>
              <div><span className="text-gray-500">原单号：</span>{detailItem.entityCode || '-'}</div>
              <div><span className="text-gray-500">删除方式：</span>{detailItem.deleteMode === 'soft' ? '软删除' : '物理删除'}</div>
              <div><span className="text-gray-500">删除人：</span>{detailItem.deletedBy || '-'}</div>
              <div><span className="text-gray-500">删除时间：</span>{detailItem.deletedAt?.replace('T', ' ').slice(0, 19) || '-'}</div>
              <div className="col-span-2"><span className="text-gray-500">摘要：</span>{detailItem.displayName || '-'}</div>
              {detailItem.restoreStatus === 'failed' && (
                <div className="col-span-2 text-red-600">
                  <span className="text-gray-500">归档失败原因：</span>{detailItem.restoreError || '-'}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> 删除前的数据快照
              </div>
              {/* 2026-10-17：快照改为「两个字段一排」的可读表格，不再直接展示 JSON 代码 */}
              <div className="overflow-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {detailRowPairs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-gray-400">无快照数据</td>
                      </tr>
                    ) : detailRowPairs.map((pair, index) => (
                      <tr key={index} className="align-top hover:bg-gray-50">
                        {pair.map((row) => (
                          <Fragment key={row.key}>
                            <td className="w-[110px] whitespace-nowrap bg-gray-50 px-3 py-2 text-xs text-gray-500">
                              {row.label}
                            </td>
                            <td className="break-all px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap">
                              {row.value}
                            </td>
                          </Fragment>
                        ))}
                        {pair.length === 1 && (
                          <>
                            <td className="w-[110px] bg-gray-50 px-3 py-2" />
                            <td />
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </UnifiedModal>
    </div>
  );
}
