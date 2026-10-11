/**
 * 作物品种库类型定义
 * 编码规则：类别(2位) + 类型(2位) + 品种(2位) + 子品种(3位) + 详细品种(2位) = 11位
 * 示例：FR010100101 = 水果类-浆果类-草莓-红颜-大叶红颜
 * 注意：详细品种名称（如"大叶红颜"）在录入时由用户手工输入，自动分配2位序号
 */

import { ProduceCategoryCode } from '../data/produceCodeRule';

/** 作物品种状态 */
export type CropVarietyStatus = 'active' | 'inactive';

/**
 * 作物品种库 - 系统数据基础表
 */
export interface CropVariety {
  id: string;                    // 唯一ID (CV + 时间戳)
  cropCode: string;             // 作物编码(11位) - 全系统唯一，固定不变
  categoryCode: ProduceCategoryCode;  // 类别代码 (如 'FR')
  categoryName: string;          // 类别名称 (如 '水果类')
  typeCode: string;             // 类型代码 (如 '01')
  typeName: string;             // 类型名称 (如 '浆果类')
  varietyCode: string;           // 品种代码 (如 '01')
  varietyName: string;           // 品种名称（如"大叶红颜"）- 用户录入时输入
  // 子品种1（第6-8位，如001红颜）
  subVariety1Code?: string;     // 子品种1代码 (3位，如 '001')
  subVariety1Name?: string;     // 子品种1名称 (如 '红颜')
  // 详细品种序号（第9-10位，如01大叶红颜，02小叶红颜），自动生成
  detailVarietyCode?: string;    // 详细品种代码 (2位，如 '01')
  // 作物品种名称（用户手工输入的最细分品种名称，如"青旗红颜"）
  detailVarietyName?: string;     // 作物品种名称（最细分品种）
  alias?: string[];             // 别名/俗名
  image?: string;              // 作物图片URL
  description?: string;         // 特性描述
  // 2026-10-11：以下生长周期/环境字段改为 number | string —— DB 实测这些列存的是区间文本
  // （air_temperature="20-25"、germination_period="5-7"、soil_ph="6.0-6.5"），
  // 前端表单直接在输入框读写该文本，声明为纯 number 会拒绝合法数据
  // 生长周期各阶段（天）
  germinationPeriod?: number | string;  // 发芽期(天)
  seedlingPeriod?: number | string;      // 育苗期(天)
  floweringPeriod?: number | string;     // 开花期(天)
  fruitingPeriod?: number | string;      // 结果期(天)
  harvestPeriod?: number | string;       // 摘收期(天)
  // 适宜环境参数
  airTemperature?: number | string;      // 空气温度(℃)
  airHumidity?: number | string;        // 空气湿度(%)
  co2Content?: number | string;          // CO₂含量(ppm)
  lightIntensity?: number | string;      // 光照度(lx)
  soilTemperature?: number | string;     // 土壤温度(℃)
  soilHumidity?: number | string;       // 土壤湿度(%)
  soilPh?: number | string;             // 土壤PH值
  soilEc?: number | string;             // 土壤EC值
  status: CropVarietyStatus;    // 状态：启用/停用
  remarks?: string;             // 备注说明
  createTime: string;           // 创建时间
  updateTime: string;           // 更新时间
  /**
   * 2026-10-11：两个"展示用"冗余字段（非 DB 列）
   * - cropName：与 varietyName 同义的旧称（种植 EditModal 的按名匹配会读 v.cropName）
   * - fullPath：选择器回填时写入的完整路径快照（订单 EditModal 会构造带该字段的 CropVariety）
   */
  cropName?: string;
  fullPath?: string;
}

/**
 * 新增品种的输入数据（不含自动生成的字段）
 */
export type CreateCropVarietyInput = Omit<CropVariety, 'id' | 'cropCode' | 'createTime' | 'updateTime'>;

/**
 * 更新品种的输入数据（仅允许部分字段）
 */
export type UpdateCropVarietyInput = Partial<Pick<CropVariety, 'alias' | 'image' | 'description' | 'germinationPeriod' | 'seedlingPeriod' | 'floweringPeriod' | 'fruitingPeriod' | 'harvestPeriod' | 'airTemperature' | 'airHumidity' | 'co2Content' | 'lightIntensity' | 'soilTemperature' | 'soilHumidity' | 'soilPh' | 'soilEc' | 'status' | 'remarks' | 'varietyName'>>;

/**
 * 品种下拉选项格式
 */
export interface CropVarietyOption {
  value: string;      // cropCode - 用作选择值
  label: string;      // varietyName - 用作显示
  category: string;   // categoryName - 类别名称
  categoryCode: string; // 类别代码
  typeName: string;   // typeName - 类型名称
  typeCode: string;   // 类型代码
  varietyCode: string; // 品种代码
  subVariety1Name?: string; // 子品种1名称
  subVariety1Code?: string; // 子品种1代码
  detailVarietyCode?: string; // 详细品种代码
  detailVarietyName?: string; // 作物品种名称（最细分）
  alias?: string[];   // 别名
  fullPath: string;   // 完整路径：如 "蔬菜类 > 茄果类 > 番茄 > 红颜 > 大叶红颜"
}

/**
 * 品种搜索结果
 */
export interface CropVarietySearchResult {
  variety: CropVariety;
  // 2026-10-11：searchVarieties 也会按子品种1名称命中，联合类型补齐
  matchField: 'cropCode' | 'varietyName' | 'subVariety1Name' | 'alias';
  matchText: string;
  /**
   * 2026-10-11：下拉/回填用的扁平字段（订单 EditModal 按 hit.value/hit.label/hit.fullPath 回填选择器）。
   * 由 searchVarieties 一并产出，避免消费端拿到 undefined。
   */
  value: string;      // = variety.cropCode
  label: string;      // = detailVarietyName || subVariety1Name || varietyName
  fullPath: string;   // = 类别 > 类型 > 品种 > 子品种1 > 详细品种
}
