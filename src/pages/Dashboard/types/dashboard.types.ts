// Dashboard 页面类型定义
// 2026-10-11：温室/大田行类型改为与 greenhouses 表真实字段对齐（原 mock 明细类型 GreenhouseDetailData/FieldDetailData 删除，
//             无人引用的过时 DashboardProps 接口同步删除）

/** 温室/大田区域行（由 greenhouses 表真实数据映射，useDashboard 组装） */
export interface GreenhouseRow {
  id: string;
  /** 区域/基地名称（表格"棚号/地块号"列） */
  no: string;
  /** 当前作物 */
  crop: string;
  /** 面积 */
  area: number;
  /** 面积单位（亩） */
  unit: string;
  /** 温室/田地类型（中文） */
  type: string;
  /** 状态（启用中/停用） */
  status: string;
  /** 建档日期（created_at 取日期部分） */
  plantedDate: string;
  /** 负责人 */
  manager: string;
  /** 原始类型码（glass/film_greenhouse/solar/open…，供总览图分区匹配） */
  greenhouseType: string;
}

/** 基地总览图分区信息（名称 + 面积） */
export interface MapZoneInfo {
  name: string;
  area: number;
  unit: string;
}

/** 基地总览图 4 分区（可选：未匹配到真实数据时不渲染替换文本） */
export interface MapZones {
  glass?: MapZoneInfo;
  film?: MapZoneInfo;
  solar?: MapZoneInfo;
  open?: MapZoneInfo;
}

/** 基地概况统计（greenhouses 表 active 记录聚合） */
export interface BaseOverviewStats {
  /** 总面积（亩） */
  totalArea: number;
  /** 温室区域数（非露天类型） */
  greenhouseCount: number;
  /** 大田面积（亩，露天/大田类型合计） */
  fieldArea: number;
}

export type SelectedDetailType =
  | { type: 'greenhouse'; data: GreenhouseRow }
  | { type: 'field'; data: GreenhouseRow }
  | null;

// 温室环境数据结构（iot_sensors 按温室分组）
export interface GreenhouseEnvData {
  id: string;
  name: string;
  lastUpdate: string;
  airTemp: { value: number; unit: string; status: string } | null;
  airHumidity: { value: number; unit: string; status: string } | null;
  light: { value: number; unit: string; status: string } | null;
  co2: { value: number; unit: string; status: string } | null;
  soilTemp: { value: number; unit: string; status: string } | null;
  soilMoisture: { value: number; unit: string; status: string } | null;
  soilEc: { value: number; unit: string; status: string } | null;
  soilPh: { value: number; unit: string; status: string } | null;
}
