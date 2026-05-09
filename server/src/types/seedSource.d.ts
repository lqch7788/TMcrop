/**
 * 种源相关类型定义
 */

/**
 * 种源记录（数据库模型）
 */
export interface SeedSourceRecord {
  id: string;
  source_code: string;
  source_name: string;
  source_type: string;
  source_origin: string;
  production_plan_code: string;
  crop_category: string;
  type_name: string;
  variety_name: string;
  crop_name: string;
  crop_variety: string;
  crop_code: string;
  supplier_id: string;
  supplier_name: string;
  quantity: number;
  unit: string;
  purchase_date: string;
  purchase_price: number;
  total_amount: number;
  used_quantity: number;
  remaining_quantity: number;
  status: string;
  remarks: string;
  create_by: string;
  create_by_id: string;
  create_time: string;
  update_time: string;
}

/**
 * 种源查询参数
 */
export interface SeedSourceQuery {
  crop_name?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/**
 * 创建种源 DTO
 */
export interface CreateSeedSourceDTO {
  id?: string;
  source_code?: string;
  source_name?: string;
  source_type?: string;
  source_origin?: string;
  production_plan_code?: string;
  crop_category?: string;
  type_name?: string;
  variety_name?: string;
  crop_name: string;
  crop_variety?: string;
  crop_code?: string;
  supplier_id?: string;
  supplier_name?: string;
  quantity?: number;
  unit?: string;
  purchase_date?: string;
  purchase_price?: number;
  total_amount?: number;
  used_quantity?: number;
  remaining_quantity?: number;
  status?: string;
  remarks?: string;
  create_by?: string;
  create_by_id?: string;
}

/**
 * 更新种源 DTO
 */
export interface UpdateSeedSourceDTO {
  source_code?: string;
  source_name?: string;
  source_type?: string;
  source_origin?: string;
  production_plan_code?: string;
  crop_category?: string;
  type_name?: string;
  variety_name?: string;
  crop_name?: string;
  crop_variety?: string;
  crop_code?: string;
  supplier_id?: string;
  supplier_name?: string;
  quantity?: number;
  unit?: string;
  purchase_date?: string;
  purchase_price?: number;
  total_amount?: number;
  used_quantity?: number;
  remaining_quantity?: number;
  status?: string;
  remarks?: string;
}
