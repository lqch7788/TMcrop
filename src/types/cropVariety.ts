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
  // 生长周期各阶段（天）
  germinationPeriod?: number;  // 发芽期(天)
  seedlingPeriod?: number;      // 育苗期(天)
  floweringPeriod?: number;     // 开花期(天)
  fruitingPeriod?: number;      // 结果期(天)
  harvestPeriod?: number;       // 摘收期(天)
  // 适宜环境参数
  airTemperature?: number;      // 空气温度(℃)
  airHumidity?: number;        // 空气湿度(%)
  co2Content?: number;          // CO₂含量(ppm)
  lightIntensity?: number;      // 光照度(lx)
  soilTemperature?: number;     // 土壤温度(℃)
  soilHumidity?: number;       // 土壤湿度(%)
  soilPh?: number;             // 土壤PH值
  soilEc?: number;             // 土壤EC值
  status: CropVarietyStatus;    // 状态：启用/停用
  remarks?: string;             // 备注说明
  createTime: string;           // 创建时间
  updateTime: string;           // 更新时间
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
  matchField: 'cropCode' | 'varietyName' | 'alias';
  matchText: string;
}
