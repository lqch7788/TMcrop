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
  // 繁殖途径字段
  propagation_type?: string;
  propagation_status?: string;
  propagation_method?: string;
  parent_male_id?: string;
  parent_male_code?: string;
  parent_female_id?: string;
  parent_female_code?: string;
  mother_plant_id?: string;
  mother_plant_code?: string;
  linked_planting_id?: string;
  linked_planting_code?: string;
  propagation_start_date?: string;
  expected_harvest_date?: string;
  actual_harvest_date?: string;
  breeding_location?: string;
  target_traits?: string;
  generation?: string;
}

/** 繁殖过程记录 */
export interface PropagationRecord {
  id: string;
  seed_source_id: string;
  record_date: string;
  stage: string;
  temperature?: number;
  humidity?: number;
  abnormality?: string;
  operator?: string;
  remarks?: string;
  pictures?: string;
  pollination_type?: string;
  pollinator_crop?: string;
  flower_count?: number;
  fruit_set_count?: number;
  harvest_seed_count?: number;
  seed_weight?: number;
  harvest_plant_count?: number;
  germination_rate?: number;
  purity?: number;
  moisture?: number;
  survival_rate?: number;
  rooted_rate?: number;
  graft_success_rate?: number;
  create_time?: string;
  update_time?: string;
}

/** 添加繁殖记录 DTO */
export interface CreatePropagationRecordDTO {
  record_date: string;
  stage: string;
  temperature?: number;
  humidity?: number;
  abnormality?: string;
  operator?: string;
  remarks?: string;
  pictures?: string[];
  pollination_type?: string;
  pollinator_crop?: string;
  flower_count?: number;
  fruit_set_count?: number;
  harvest_seed_count?: number;
  seed_weight?: number;
  harvest_plant_count?: number;
  germination_rate?: number;
  purity?: number;
  moisture?: number;
  survival_rate?: number;
  rooted_rate?: number;
  graft_success_rate?: number;
}

/** 推进阶段 DTO */
export interface UpdatePropagationStageDTO {
  new_stage: string;
  operator?: string;
}

/** 完成入库 DTO */
export interface CompletePropagationDTO {
  quantity: number;  // 入库数量
  operator?: string;
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
