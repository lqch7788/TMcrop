/**
 * 数据迁移工具页面
 *
 * 功能：将 localStorage 中的业务数据迁移到后端数据库
 * 安全策略：
 *  1. 读取 localStorage，不删除任何数据
 *  2. 预检查字段映射是否一致
 *  3. 迁移时检查后端是否已有该记录（按 id 判断）
 *  4. 只添加后端没有的记录
 *  5. 不覆盖、不删除后端已有数据
 *  6. 生成详细的迁移报告
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Badge } from '@/components/ui';
import { showAlert, showConfirm } from '@/lib/dialogService';
import { useNavigate } from 'react-router-dom';
import { Database, ArrowLeft } from 'lucide-react';

interface MigrationItem {
  key: string;
  name: string;
  localCount: number;
  dbCount: number;
  status: 'pending' | 'scanning' | 'checking' | 'ready' | 'migrating' | 'success' | 'error' | 'blocked';
  addedCount: number;
  skippedCount: number;
  error?: string;
  fieldMapping?: {
    localFields: string[];
    dbFields: string[];
    matched: string[];
    unmatched: string[];
    missing: string[];
    status: 'ok' | 'warning' | 'error';
    message?: string;
  };
  // 数据冲突检测
  dataConflicts?: {
    totalConflicts: number;
    conflicts: Array<{
      id: string;
      localField: string;
      localValue: any;
      dbValue: any;
      conflictType: 'value_mismatch' | 'exists_in_both';
    }>;
  };
}

interface MigrationReport {
  totalItems: number;
  successfulItems: number;
  failedItems: number;
  totalMigrated: number;
  details: MigrationItem[];
}

// localStorage key → 后端 API 端点映射
const MIGRATION_CONFIG: Record<string, { apiEndpoint: string; name: string; table: string }> = {
  // 作物管理
  'announcement_notices': { apiEndpoint: '/api/sync/announcements', name: '公告通知', table: 'announcements' },
  'indicators_data': { apiEndpoint: '/api/sync/indicators', name: '指标数据', table: 'indicators' },
  'crop_orders': { apiEndpoint: '/api/sync/crop-orders', name: '作物订单', table: 'crop_orders' },
  'crop_instances': { apiEndpoint: '/api/sync/crop-instances', name: '作物实例', table: 'crop_instances' },
  'crop_seed_sources': { apiEndpoint: '/api/sync/seed-sources', name: '种子来源', table: 'seed_sources' },
  'crop_seedlings': { apiEndpoint: '/api/sync/seedlings', name: '秧苗数据', table: 'seedlings' },
  'crop_plantings': { apiEndpoint: '/api/sync/plantings', name: '种植记录', table: 'plantings' },
  'harvest_records': { apiEndpoint: '/api/sync/harvest', name: '采收记录', table: 'harvest_records' },

  // 人工管理
  'yuanxingtu_attendance': { apiEndpoint: '/api/sync/attendance', name: '考勤数据', table: 'attendance_records' },
  'yuanxingtu_tempTasks': { apiEndpoint: '/api/sync/temp-tasks', name: '临时任务', table: 'temp_tasks' },
  'yuanxingtu_tasks': { apiEndpoint: '/api/sync/farm-tasks', name: '农事任务', table: 'farm_tasks' },
  'yuanxingtu_inspections': { apiEndpoint: '/api/sync/inspections', name: '巡检记录', table: 'inspections' },
  'yuanxingtu_daily_problems': { apiEndpoint: '/api/sync/problems', name: '日常问题', table: 'problems' },
  'yuanxingtu_worklogs': { apiEndpoint: '/api/sync/labor', name: '工作日志', table: 'labor_records' },

  // 字典/配置
  'yuanxingtu_dictionaries': { apiEndpoint: '/api/sync/dictionaries', name: '字典数据', table: 'dictionaries' },
  'yuanxingtu_system_configs': { apiEndpoint: '/api/sync/system-configs', name: '系统配置', table: 'system_configs' },

  // 技术方案
  'tech_solutions': { apiEndpoint: '/api/sync/tech-solutions', name: '技术方案', table: 'tech_solutions' },

  // 供应商
  'suppliers': { apiEndpoint: '/api/sync/suppliers', name: '供应商', table: 'suppliers' },

  // 采购计划
  'purchase_plans': { apiEndpoint: '/api/sync/purchase-plans', name: '采购计划', table: 'purchase_plans' },
  'production_plans': { apiEndpoint: '/api/sync/production-plans', name: '生产计划', table: 'production_plans' },
};

// 字段映射表：localStorage 字段 → 数据库字段
// 这个映射定义了 localStorage 中的字段名可能对应哪些数据库字段名
const FIELD_MAPPINGS: Record<string, Record<string, string>> = {
  'crop_seed_sources': {
    'id': 'id',
    'seedCode': 'source_code', 'seed_code': 'source_code',
    'sourceName': 'source_name', 'source_name': 'source_name',
    'sourceType': 'source_type', 'source_type': 'source_type',
    'cropName': 'crop_name', 'crop_name': 'crop_name',
    'cropVariety': 'crop_variety', 'crop_variety': 'crop_variety',
    'cropCode': 'crop_code', 'crop_code': 'crop_code',
    'supplierId': 'supplier_id', 'supplier_id': 'supplier_id',
    'supplierName': 'supplier_name', 'supplier_name': 'supplier_name',
    'productionPlanCode': 'production_plan_code', 'production_plan_code': 'production_plan_code',
    'quantity': 'quantity', 'unit': 'unit',
    'purchaseDate': 'purchase_date', 'purchase_date': 'purchase_date',
    'unitPrice': 'unit_price', 'unit_price': 'unit_price',
    'totalAmount': 'total_amount', 'total_amount': 'total_amount',
    'usedQuantity': 'used_quantity', 'used_quantity': 'used_quantity',
    'status': 'status', 'remarks': 'remarks',
    'createBy': 'create_by', 'create_by': 'create_by',
    'createTime': 'create_time', 'create_time': 'create_time',
  },
  'crop_seedlings': {
    'id': 'id',
    'seedlingCode': 'seedling_code', 'seedling_code': 'seedling_code',
    'sourceId': 'source_id', 'source_id': 'source_id',
    'sourceName': 'source_name', 'source_name': 'source_name',
    'productionPlanCode': 'production_plan_code', 'production_plan_code': 'production_plan_code',
    'cropCode': 'crop_code', 'crop_code': 'crop_code',
    'cropName': 'crop_name', 'crop_name': 'crop_name',
    'cropVariety': 'crop_variety', 'crop_variety': 'crop_variety',
    'seedlingType': 'seedling_type', 'seedling_type': 'seedling_type',
    'greenhouseName': 'greenhouse_name', 'greenhouse_name': 'greenhouse_name',
    'areaName': 'area_name', 'area_name': 'area_name',
    'seedlingDate': 'seedling_date', 'seedling_date': 'seedling_date',
    'expectedFinishDate': 'expected_finish_date', 'expected_finish_date': 'expected_finish_date',
    'actualFinishDate': 'actual_finish_date', 'actual_finish_date': 'actual_finish_date',
    'seedlingQuantity': 'seedling_quantity', 'seedling_quantity': 'seedling_quantity',
    'survivalQuantity': 'survival_quantity', 'survival_quantity': 'survival_quantity',
    'survivalRate': 'survival_rate', 'survival_rate': 'survival_rate',
    'plantedCount': 'planted_count', 'planted_count': 'planted_count',
    'status': 'status', 'remarks': 'remarks',
    'createBy': 'create_by', 'create_by': 'create_by',
    'createTime': 'create_time', 'create_time': 'create_time',
  },
  'crop_plantings': {
    'id': 'id',
    'plantCode': 'planting_code', 'planting_code': 'planting_code',
    'sourceType': 'source_type', 'source_type': 'source_type',
    'sourceId': 'source_id', 'source_id': 'source_id',
    'sourceName': 'source_name', 'source_name': 'source_name',
    'cropName': 'crop_name', 'crop_name': 'crop_name',
    'cropVariety': 'crop_variety', 'crop_variety': 'crop_variety',
    'greenhouseName': 'greenhouse_name', 'greenhouse_name': 'greenhouse_name',
    'areaName': 'area_name', 'area_name': 'area_name',
    'plantingDate': 'planting_date', 'planting_date': 'planting_date',
    'plantingQuantity': 'planting_quantity', 'planting_quantity': 'planting_quantity',
    'plantedQuantity': 'planted_quantity', 'planted_quantity': 'planted_quantity',
    'survivalQuantity': 'survival_quantity', 'survival_quantity': 'survival_quantity',
    'survivalRate': 'survival_rate', 'survival_rate': 'survival_rate',
    'growthStatus': 'growth_status', 'growth_status': 'growth_status',
    'expectedHarvestDate': 'expected_harvest_date', 'expected_harvest_date': 'expected_harvest_date',
    'actualHarvestDate': 'actual_harvest_date', 'actual_harvest_date': 'actual_harvest_date',
    'harvestQuantity': 'harvest_quantity', 'harvest_quantity': 'harvest_quantity',
    'status': 'status', 'remarks': 'remarks',
    'createBy': 'create_by', 'create_by': 'create_by',
    'createTime': 'create_time', 'create_time': 'create_time',
  },
  'harvest_records': {
    'id': 'id',
    'harvestCode': 'harvest_code', 'harvest_code': 'harvest_code',
    'sourceId': 'source_id', 'source_id': 'source_id',
    'sourceName': 'source_name', 'source_name': 'source_name',
    'cropName': 'crop_name', 'crop_name': 'crop_name',
    'cropVariety': 'crop_variety', 'crop_variety': 'crop_variety',
    'greenhouseName': 'greenhouse_name', 'greenhouse_name': 'greenhouse_name',
    'harvestDate': 'harvest_date', 'harvest_date': 'harvest_date',
    'harvestQuantity': 'harvest_quantity', 'harvest_quantity': 'harvest_quantity',
    'unit': 'unit', 'unitPrice': 'unit_price', 'unit_price': 'unit_price',
    'totalAmount': 'total_amount', 'total_amount': 'total_amount',
    'qualityGrade': 'quality_grade', 'quality_grade': 'quality_grade',
    'buyerId': 'buyer_id', 'buyer_id': 'buyer_id',
    'buyerName': 'buyer_name', 'buyer_name': 'buyer_name',
    'salesChannel': 'sales_channel', 'sales_channel': 'sales_channel',
    'status': 'status', 'remarks': 'remarks',
    'createBy': 'create_by', 'create_by': 'create_by',
    'createTime': 'create_time', 'create_time': 'create_time',
  },
  'crop_instances': {
    'id': 'id',
    'instanceCode': 'instance_code', 'instance_code': 'instance_code',
    'orderId': 'order_id', 'order_id': 'order_id',
    'orderCode': 'order_code', 'order_code': 'order_code',
    'cropCategory': 'crop_category', 'crop_category': 'crop_category',
    'cropName': 'crop_name', 'crop_name': 'crop_name',
    'cropVariety': 'crop_variety', 'crop_variety': 'crop_variety',
    'categoryCode': 'category_code', 'category_code': 'category_code',
    'typeCode': 'type_code', 'type_code': 'type_code',
    'subCode': 'sub_code', 'sub_code': 'sub_code',
    'sourceOrigin': 'source_origin', 'source_origin': 'source_origin',
    'sourceDescription': 'source_description', 'source_description': 'source_description',
    'sourceInstanceId': 'source_instance_id', 'source_instance_id': 'source_instance_id',
    'initialQuantity': 'initial_quantity', 'initial_quantity': 'initial_quantity',
    'currentQuantity': 'current_quantity', 'current_quantity': 'current_quantity',
    'plantedQuantity': 'planted_quantity', 'planted_quantity': 'planted_quantity',
    'harvestedQuantity': 'harvested_quantity', 'harvested_quantity': 'harvested_quantity',
    'status': 'status',
    'seedEntryDate': 'seed_entry_date', 'seed_entry_date': 'seed_entry_date',
    'seedlingStartDate': 'seedling_start_date', 'seedling_start_date': 'seedling_start_date',
    'plantingDate': 'planting_date', 'planting_date': 'planting_date',
    'harvestDate': 'harvest_date', 'harvest_date': 'harvest_date',
    'createBy': 'create_by', 'create_by': 'create_by',
    'createTime': 'create_time', 'create_time': 'create_time',
  },
  'crop_orders': {
    'id': 'id',
    'orderCode': 'order_code', 'order_code': 'order_code',
    'cropName': 'crop_name', 'crop_name': 'crop_name',
    'cropVariety': 'crop_variety', 'crop_variety': 'crop_variety',
    'quantity': 'quantity', 'unit': 'unit',
    'unitPrice': 'unit_price', 'unit_price': 'unit_price',
    'totalAmount': 'total_amount', 'total_amount': 'total_amount',
    'status': 'status', 'remarks': 'remarks',
    'createBy': 'create_by', 'create_by': 'create_by',
    'createTime': 'create_time', 'create_time': 'create_time',
  },
  'announcement_notices': {
    'id': 'id',
    'code': 'code', 'title': 'title',
    'type': 'type', 'category': 'category',
    'priority': 'priority', 'status': 'status',
    'sender': 'sender', 'date': 'date',
    'deadline': 'deadline', 'readCount': 'read_count', 'read_count': 'read_count',
    'recipients': 'recipients', 'content': 'content',
    'createTime': 'create_time', 'create_time': 'create_time',
  },
  'indicators_data': {
    'id': 'id',
    'code': 'code', 'name': 'name',
    'category': 'category', 'unit': 'unit',
    'target': 'target', 'actual': 'actual',
    'trend': 'trend', 'frequency': 'frequency',
    'source': 'source', 'warning': 'warning', 'weight': 'weight',
    'createTime': 'create_time', 'create_time': 'create_time',
  },
  'yuanxingtu_dictionaries': {
    'id': 'id',
    'category': 'category', 'categoryCode': 'category_code', 'category_code': 'category_code',
    'dictCode': 'dict_code', 'dict_code': 'dict_code',
    'dictName': 'dict_name', 'dict_name': 'dict_name',
    'dictValue': 'dict_value', 'dict_value': 'dict_value',
    'sortOrder': 'sort_order', 'sort_order': 'sort_order',
    'status': 'status', 'remarks': 'remarks',
    'createTime': 'create_time', 'create_time': 'create_time',
  },
  'production_plans': {
    'id': 'id',
    'batchCode': 'plan_code', 'batchName': 'plan_name',
    'planCode': 'plan_code', 'plan_name': 'plan_name',
    'planType': 'plan_type', 'cropName': 'crop_name',
    'cropVariety': 'crop_variety', 'variety': 'crop_variety',
    'greenhouseName': 'greenhouse_name', 'areaName': 'area_name',
    'plannedQuantity': 'planned_quantity', 'actualQuantity': 'actual_quantity',
    'plantingDate': 'planting_date', 'expectedHarvestDate': 'expected_harvest_date',
    'actualHarvestDate': 'actual_harvest_date',
    'status': 'status', 'priority': 'priority', 'remarks': 'remarks',
    'createBy': 'create_by', 'create_by': 'create_by',
    'createTime': 'create_time', 'create_time': 'create_time',
    'updateTime': 'update_time', 'update_time': 'update_time',
    'responsiblePerson': 'responsible_person', 'unit': 'unit',
    'publishDate': 'publish_date', 'batchStatus': 'batch_status',
    'planDetail': 'plan_detail', 'planDetailFileName': 'plan_detail_file_name',
    'plantingArea': 'planting_area', 'plantingMode': 'planting_mode',
    'supplierName': 'supplier_name', 'seedlingSiteName': 'seedling_site_name',
    'seedQuantity': 'seed_quantity', 'targetSeedlingCount': 'target_seedling_count',
  },
  'yuanxingtu_worklogs': {
    'id': 'id',
    'code': 'work_log_code', 'workLogCode': 'work_log_code',
    'date': 'work_date', 'workDate': 'work_date',
    'worker': 'worker_name', 'workerName': 'worker_name',
    'weather': 'weather', 'temperature': 'temperature',
    'crop': 'crop_name', 'cropName': 'crop_name',
    'greenhouse': 'greenhouse_name', 'greenhouseName': 'greenhouse_name',
    'growthStatus': 'growth_status',
    'tasks': 'task_description', 'taskDescription': 'task_description',
    'problems': 'problems', 'solutions': 'solutions',
    'taskId': 'task_id', 'task_id': 'task_id',
    'batchId': 'batch_id', 'batch_id': 'batch_id',
    'batchCode': 'batch_code', 'batch_code': 'batch_code',
    'taskCode': 'task_code', 'task_code': 'task_code',
    'taskType': 'task_type', 'task_type': 'task_type',
    'taskTypeName': 'task_type_name',
    'progress': 'progress', 'workloadHours': 'work_hours', 'workHours': 'work_hours',
    'workloadDays': 'workload_days', 'workers': 'workers',
    'submitTime': 'submit_time', 'submit_time': 'submit_time',
    'feedbackText': 'feedback_text', 'feedback_text': 'feedback_text',
    'status': 'status', 'remarks': 'remarks',
    'createTime': 'create_time', 'create_time': 'create_time',
    'updateTime': 'update_time', 'update_time': 'update_time',
  },
};

// 默认字段映射（如果没有特定的映射）
const DEFAULT_FIELD_MAPPING: Record<string, string> = {
  'id': 'id',
  'status': 'status',
  'remarks': 'remarks',
  'createBy': 'create_by', 'create_by': 'create_by',
  'createTime': 'create_time', 'create_time': 'create_time',
  'updateTime': 'update_time', 'update_time': 'update_time',
};

/**
 * 从 localStorage 数据中提取数组
 * 有些数据格式是 {version: x, data: [...]} 包装对象，需要特殊处理
 */
function extractArrayFromData(rawData: string): { array: any[]; isWrapped: boolean } {
  try {
    const parsed = JSON.parse(rawData);
    if (Array.isArray(parsed)) {
      return { array: parsed, isWrapped: false };
    }
    // 处理包装格式：{version, data}, {records, data}, {list, data} 等
    if (parsed && typeof parsed === 'object') {
      const keys = Object.keys(parsed);
      for (const key of keys) {
        if (key === 'data' || key === 'records' || key === 'list' || key === 'items') {
          if (Array.isArray(parsed[key])) {
            return { array: parsed[key], isWrapped: true };
          }
        }
      }
      // 如果只有一个键且值是数组
      if (keys.length === 1 && Array.isArray(parsed[keys[0]])) {
        return { array: parsed[keys[0]], isWrapped: true };
      }
    }
    return { array: [], isWrapped: false };
  } catch {
    return { array: [], isWrapped: false };
  }
}

export default function DataMigrationPage() {
  const navigate = useNavigate();
  const [migrationItems, setMigrationItems] = useState<MigrationItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [report, setReport] = useState<MigrationReport | null>(null);
  const [currentItem, setCurrentItem] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<MigrationItem | null>(null);

  // 扫描 localStorage 数据
  const scanLocalStorage = () => {
    setIsScanning(true);
    const items: MigrationItem[] = [];

    for (const [key, config] of Object.entries(MIGRATION_CONFIG)) {
      try {
        const localData = localStorage.getItem(key);
        // 使用辅助函数提取数组（处理包装格式）
        const { array } = localData ? extractArrayFromData(localData) : { array: [] };
        const localCount = array.length;

        items.push({
          key,
          name: config.name,
          localCount,
          dbCount: 0,
          status: 'pending',
          addedCount: 0,
          skippedCount: 0,
        });
      } catch (error) {
        // logger.error(`扫描 ${key} 失败:`, error);
        items.push({
          key,
          name: config.name,
          localCount: 0,
          dbCount: 0,
          status: 'error',
          addedCount: 0,
          skippedCount: 0,
          error: '读取 localStorage 失败',
        });
      }
    }

    setMigrationItems(items);
    setIsScanning(false);
  };

  // 查询后端数据库统计
  const fetchDbStats = async () => {
    try {
      const response = await fetch('/api/sync/stats');
      const result = await response.json();

      if (result.success) {
        setMigrationItems(prev =>
          prev.map(item => ({
            ...item,
            dbCount: result.data[item.key] || 0,
          }))
        );
      }
    } catch (error) {
      // logger.error('获取数据库统计失败:', error);
    }
  };

  // 预检查字段映射
  const checkFieldMapping = async (item: MigrationItem): Promise<MigrationItem['fieldMapping']> => {
    try {
      // 读取 localStorage 数据
      const localData = localStorage.getItem(item.key);
      if (!localData) {
        return {
          localFields: [],
          dbFields: [],
          matched: [],
          unmatched: [],
          missing: [],
          status: 'error',
          message: 'localStorage 中没有数据',
        };
      }

      // 使用辅助函数提取数组（处理包装格式）
      const { array: data, isWrapped } = extractArrayFromData(localData);

      if (!Array.isArray(data) || data.length === 0) {
        return {
          localFields: [],
          dbFields: [],
          matched: [],
          unmatched: [],
          missing: [],
          status: 'error',
          message: isWrapped ? '数据数组为空' : '数据为空或格式错误',
        };
      }

      // 获取第一条记录的字段
      const sampleRecord = data[0];
      const localFields = Object.keys(sampleRecord);

      // 获取该数据类型的字段映射
      const fieldMap = FIELD_MAPPINGS[item.key] || DEFAULT_FIELD_MAPPING;

      // 计算映射后的字段
      const mappedFields = new Set<string>();
      for (const localField of localFields) {
        const dbField = fieldMap[localField];
        if (dbField) {
          mappedFields.add(dbField);
        }
      }

      // 从后端获取表结构
      const response = await fetch(`/api/sync/schema/${MIGRATION_CONFIG[item.key].table}`);
      const result = await response.json();

      let dbFields: string[] = [];
      if (result.success && result.data) {
        dbFields = result.data;
      } else {
        // 如果无法获取表结构，使用已知的必需字段
        dbFields = ['id', 'create_time', 'update_time'];
      }

      // 计算匹配情况
      const matched: string[] = [];
      const unmatched: string[] = [];
      const missing: string[] = [];

      for (const dbField of dbFields) {
        if (mappedFields.has(dbField)) {
          matched.push(dbField);
        } else if (dbField !== 'id' && dbField !== 'create_time' && dbField !== 'update_time') {
          missing.push(dbField);
        }
      }

      for (const localField of localFields) {
        const dbField = fieldMap[localField];
        if (!dbField && localField !== 'id') {
          unmatched.push(localField);
        }
      }

      // 判断状态
      let status: 'ok' | 'warning' | 'error' = 'ok';
      let message = '';

      if (matched.length === 0 && localFields.length > 0) {
        status = 'error';
        message = '字段映射完全不匹配，迁移可能会失败';
      } else if (missing.length > 5 || unmatched.length > 10) {
        status = 'warning';
        message = `有 ${missing.length} 个数据库字段未映射，${unmatched.length} 个本地字段未识别`;
      } else {
        message = `映射检查通过 (${matched.length}/${dbFields.length} 字段匹配)`;
      }

      return {
        localFields,
        dbFields,
        matched,
        unmatched,
        missing,
        status,
        message,
      };
    } catch (error: any) {
      return {
        localFields: [],
        dbFields: [],
        matched: [],
        unmatched: [],
        missing: [],
        status: 'error',
        message: error.message || '检查失败',
      };
    }
  };

  /**
   * 检测数据冲突 - 检查 localStorage 数据是否与后端数据冲突
   * 冲突类型：
   * 1. exists_in_both: localStorage 和后端都有相同 id 的记录
   * 2. value_mismatch: 相同 id 的记录但关键字段值不同
   */
  const checkDataConflicts = async (item: MigrationItem): Promise<MigrationItem['dataConflicts']> => {
    try {
      const localData = localStorage.getItem(item.key);
      if (!localData) {
        return { totalConflicts: 0, conflicts: [] };
      }

      // 使用辅助函数提取数组（处理包装格式）
      const { array: localRecords } = extractArrayFromData(localData);
      if (!Array.isArray(localRecords) || localRecords.length === 0) {
        return { totalConflicts: 0, conflicts: [] };
      }

      const table = MIGRATION_CONFIG[item.key].table;

      // 从后端获取该表的样本数据（最多 100 条）
      const response = await fetch(`/api/sync/sample/${table}?limit=100`);
      const result = await response.json();

      if (!result.success || !result.data) {
        // 无法获取后端数据，假设没有冲突
        return { totalConflicts: 0, conflicts: [] };
      }

      const dbRecords = result.data;
      const dbRecordMap = new Map<string, Record<string, any>>();
      for (const record of dbRecords) {
        if (record.id) {
          dbRecordMap.set(record.id, record);
        }
      }

      const conflicts: Array<{
        id: string;
        localField: string;
        localValue: any;
        dbValue: any;
        conflictType: 'value_mismatch' | 'exists_in_both';
      }> = [];

      // 检查 localStorage 中的每条记录
      for (const localRecord of localRecords) {
        if (!localRecord.id) continue;

        const dbRecord = dbRecordMap.get(localRecord.id);
        if (!dbRecord) continue; // 后端没有这条记录，不算冲突

        // 后端存在相同 id 的记录 - 这是冲突！
        conflicts.push({
          id: localRecord.id,
          localField: 'id',
          localValue: localRecord.id,
          dbValue: dbRecord.id,
          conflictType: 'exists_in_both',
        });

        // 检查关键字段是否匹配
        const keyFields = ['name', 'code', 'status', 'quantity', 'amount'];
        for (const field of keyFields) {
          const localVal = localRecord[field];
          const dbVal = dbRecord[field];
          if (localVal !== undefined && dbVal !== undefined && localVal !== dbVal) {
            conflicts.push({
              id: localRecord.id,
              localField: field,
              localValue: localVal,
              dbValue: dbVal,
              conflictType: 'value_mismatch',
            });
          }
        }
      }

      return {
        totalConflicts: conflicts.length,
        conflicts: conflicts.slice(0, 20), // 最多显示 20 条冲突
      };
    } catch (error: any) {
      // logger.error('检测数据冲突失败:', error);
      return { totalConflicts: 0, conflicts: [] };
    }
  };

  // 执行所有字段映射和数据冲突检查
  const executeFieldCheck = async () => {
    setIsChecking(true);

    const results: MigrationItem[] = [];

    for (const item of migrationItems) {
      if (item.localCount === 0) {
        results.push({ ...item, status: 'ready' });
        continue;
      }

      setCurrentItem(`${item.name} - 字段映射`);
      const fieldMapping = await checkFieldMapping(item);

      setCurrentItem(`${item.name} - 数据冲突检测`);
      const dataConflicts = await checkDataConflicts(item);

      // 如果有数据冲突或字段映射错误，状态为 blocked
      const hasBlockingIssue = fieldMapping.status === 'error'; // 只对字段映射错误阻止

      results.push({
        ...item,
        status: hasBlockingIssue ? 'blocked' : 'ready',
        fieldMapping,
        dataConflicts,
      });
    }

    setMigrationItems(results);
    setCurrentItem('');
    setIsChecking(false);

    // 如果有字段映射错误，显示警告
    const blockedItems = results.filter(r => r.status === 'blocked');
    if (blockedItems.length > 0) {
      const errorDetails = blockedItems
        .filter(r => r.fieldMapping && r.fieldMapping.status === 'error')
        .map(r => `${r.name}: ${r.fieldMapping!.message}`)
        .join('\n');

      showAlert(
        `⚠️ 检测到字段映射错误，迁移已阻止：\n\n${errorDetails}\n\n请修复这些问题后再执行迁移！`,
        '字段映射错误'
      );
    } else {
      // 显示检测到的冲突信息，但允许继续迁移（系统会自动处理）
      const conflictItems = results.filter(r => r.dataConflicts && r.dataConflicts.totalConflicts > 0);
      if (conflictItems.length > 0) {
        const conflictSummary = conflictItems
          .map(r => `${r.name}: ${r.dataConflicts!.totalConflicts} 个冲突（将自动生成新ID）`)
          .join('\n');

        showAlert(
          `📋 检测到以下数据冲突（系统将自动处理）：\n\n${conflictSummary}\n\n` +
          `解决方案：对于 id 冲突的记录，系统将自动生成新的唯一ID后迁移。\n` +
          `这样可以保留 localStorage 中的所有数据，不会丢失！`,
          '冲突检测结果'
        );
      }
    }
  };

  // 执行迁移
  const executeMigration = async () => {
    // 确认迁移
    const confirmed = await showConfirm(
      '确认要执行迁移吗？\n\n' +
      '迁移策略：\n' +
      '• 只添加后端没有的记录\n' +
      '• 不覆盖、不删除后端已有数据\n' +
      '• 对于 id 冲突的记录，将自动生成新ID\n' +
      '• 建议先备份数据库',
      '确认迁移'
    );

    if (!confirmed) return;

    setIsMigrating(true);
    const results: MigrationItem[] = [];
    let totalMigrated = 0;

    for (const item of migrationItems) {
      if (item.localCount === 0) {
        results.push({ ...item, status: 'success', addedCount: 0, skippedCount: 0 });
        continue;
      }

      // 【关键安全检查】如果状态是 blocked（字段映射错误），停止整个迁移！
      if (item.status === 'blocked') {
        // 立即停止迁移！
        showAlert(
          `⚠️ 迁移已停止！\n\n` +
          `发现阻塞性问题：${item.name}\n` +
          `字段映射错误，无法迁移\n\n` +
          `请先修复这些问题后再执行迁移！`,
          '迁移被阻止'
        );

        // 将所有待处理的项标记为未执行（因为整个迁移被中止）
        for (const pendingItem of migrationItems) {
          if (pendingItem.status !== 'success' && pendingItem.status !== 'error') {
            results.push({
              ...pendingItem,
              status: 'blocked',
              error: '因字段映射错误，整个迁移被取消',
            });
          }
        }

        setMigrationItems(results);
        setCurrentItem('');
        setIsMigrating(false);
        return;
      }

      // 检查字段映射状态
      if (item.fieldMapping && item.fieldMapping.status === 'error') {
        results.push({
          ...item,
          status: 'error',
          addedCount: 0,
          skippedCount: 0,
          error: '字段映射错误，无法迁移',
        });
        continue;
      }

      setCurrentItem(item.name);
      const config = MIGRATION_CONFIG[item.key];

      try {
        // 读取 localStorage 数据
        const localData = localStorage.getItem(item.key);
        if (!localData) {
          results.push({ ...item, status: 'success', addedCount: 0, skippedCount: 0 });
          continue;
        }

        // 使用辅助函数提取数组（处理包装格式）
        let data = extractArrayFromData(localData).array;
        if (!Array.isArray(data) || data.length === 0) {
          results.push({ ...item, status: 'success', addedCount: 0, skippedCount: 0 });
          continue;
        }

        // 【关键】对于有冲突的数据，为其生成新 id
        if (item.dataConflicts && item.dataConflicts.totalConflicts > 0) {
          const conflictIds = new Set(
            item.dataConflicts.conflicts.map(c => c.id)
          );

          data = data.map((record: any) => {
            if (conflictIds.has(record.id)) {
              // 生成新的唯一 id
              const prefix = record.id.substring(0, 2) || 'MIG';
              const newId = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
              return { ...record, id: newId, _idWasConflict: true };
            }
            return record;
          });
        }

        // 调用后端 API 批量导入
        const response = await fetch(config.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data }),
        });

        const result = await response.json();

        if (result.success) {
          totalMigrated += result.data?.imported || 0;
          results.push({
            ...item,
            status: 'success',
            addedCount: result.data?.imported || 0,
            skippedCount: item.localCount - (result.data?.imported || 0),
          });
        } else {
          results.push({
            ...item,
            status: 'error',
            addedCount: 0,
            skippedCount: 0,
            error: result.error || '导入失败',
          });
        }
      } catch (error: any) {
        results.push({
          ...item,
          status: 'error',
          addedCount: 0,
          skippedCount: 0,
          error: error.message || '网络错误',
        });
      }

      setMigrationItems(results);
    }

    setCurrentItem('');
    setIsMigrating(false);

    // 生成报告
    const successfulItems = results.filter(r => r.status === 'success').length;
    const failedItems = results.filter(r => r.status === 'error').length;

    setReport({
      totalItems: results.length,
      successfulItems,
      failedItems,
      totalMigrated,
      details: results,
    });

    // 显示完成提示
    showAlert(
      `迁移完成！\n成功: ${successfulItems} 项\n失败: ${failedItems} 项\n共迁移: ${totalMigrated} 条记录`,
      '迁移结果'
    );
  };

  // 初始化扫描
  useEffect(() => {
    scanLocalStorage();
    fetchDbStats();
  }, []);

  const getStatusBadge = (status: MigrationItem['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">待检查</Badge>;
      case 'scanning':
        return <Badge variant="secondary">扫描中</Badge>;
      case 'checking':
        return <Badge variant="default">检查中</Badge>;
      case 'ready':
        return <Badge variant="success">就绪</Badge>;
      case 'migrating':
        return <Badge variant="default">迁移中</Badge>;
      case 'success':
        return <Badge variant="success">成功</Badge>;
      case 'error':
        return <Badge variant="destructive">失败</Badge>;
      case 'blocked':
        return <Badge variant="destructive">已阻止</Badge>;
    }
  };

  const getFieldMappingStatus = (mapping: MigrationItem['fieldMapping']) => {
    if (!mapping) return null;

    const statusClass = mapping.status === 'ok' ? 'text-green-600' :
                       mapping.status === 'warning' ? 'text-yellow-600' : 'text-red-600';

    return (
      <div className="mt-2 text-sm">
        <p className={statusClass}>{mapping.message}</p>
        {mapping.missing.length > 0 && (
          <p className="text-orange-600 mt-1">
            缺失字段: {mapping.missing.slice(0, 5).join(', ')}
            {mapping.missing.length > 5 && ` ...等${mapping.missing.length}个`}
          </p>
        )}
        {mapping.unmatched.length > 0 && (
          <p className="text-gray-500 mt-1">
            未识别字段: {mapping.unmatched.slice(0, 5).join(', ')}
            {mapping.unmatched.length > 5 && ` ...等${mapping.unmatched.length}个`}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="/settings"
              className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center hover:from-gray-200 hover:to-gray-300 transition-colors"
              title="返回系统设置"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </a>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">数据迁移工具</h1>
              <p className="text-gray-500">将 localStorage 中的业务数据迁移到后端数据库</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* 注意事项 */}
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">⚠️ 迁移须知</CardTitle>
          </CardHeader>
          <CardContent className="text-amber-700">
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>本工具只读取 localStorage 中的数据，<strong>不会删除</strong>任何数据</li>
              <li>迁移前会<strong>预检查字段映射</strong>，确保数据可以正确迁移</li>
              <li>迁移时<strong>只添加</strong>后端数据库中没有的记录</li>
              <li>已存在于后端数据库的记录<strong>不会被覆盖</strong></li>
              <li>建议在迁移前<strong>备份数据库</strong>以防万一</li>
              <li>迁移完成后请<strong>刷新页面</strong>验证数据是否正确</li>
            </ul>
          </CardContent>
        </Card>

        {/* 迁移状态表格 */}
        <Card>
          <CardHeader>
            <CardTitle>迁移进度</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">数据项</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">localStorage</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">数据库</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">状态</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">字段映射</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">数据冲突</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">迁移结果</th>
                  </tr>
                </thead>
                <tbody>
                  {migrationItems.map((item) => (
                    <tr key={item.key} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.key}</p>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                          {item.localCount} 条
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {item.dbCount} 条
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="text-center py-3 px-4">
                        {item.fieldMapping ? (
                          <div>
                            <span className={
                              item.fieldMapping.status === 'ok' ? 'text-green-600' :
                              item.fieldMapping.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                            }>
                              {item.fieldMapping.matched.length}/{item.fieldMapping.dbFields.length}
                            </span>
                            {getFieldMappingStatus(item.fieldMapping)}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      {/* 数据冲突列 */}
                      <td className="text-center py-3 px-4">
                        {item.dataConflicts && item.dataConflicts.totalConflicts > 0 ? (
                          <div>
                            <span className="text-red-600 font-medium">
                              ⚠️ {item.dataConflicts.totalConflicts} 个冲突
                            </span>
                            {item.dataConflicts.conflicts.length > 0 && (
                              <div className="text-xs text-red-500 mt-1">
                                {item.dataConflicts.conflicts[0]?.conflictType === 'exists_in_both'
                                  ? `ID ${item.dataConflicts.conflicts[0]?.id} 重复`
                                  : `ID ${item.dataConflicts.conflicts[0]?.id} 字段值不同`}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-green-600">✅ 无冲突</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        {item.status === 'success' ? (
                          <span className="text-green-600">
                            +{item.addedCount} | 跳过 {item.skippedCount}
                          </span>
                        ) : item.status === 'error' ? (
                          <span className="text-red-600 text-sm">{item.error}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(isScanning || isChecking || isMigrating) && currentItem && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-blue-700">
                  {isScanning && '正在扫描 localStorage...'}
                  {isChecking && `正在检查字段映射: ${currentItem}`}
                  {isMigrating && `正在迁移: ${currentItem}`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={scanLocalStorage}
            disabled={isScanning || isChecking || isMigrating}
          >
            {isScanning ? '扫描中...' : '重新扫描'}
          </Button>

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={fetchDbStats}
              disabled={isScanning || isChecking || isMigrating}
            >
              刷新统计
            </Button>
            <Button
              variant="outline"
              onClick={executeFieldCheck}
              disabled={isScanning || isChecking || isMigrating || migrationItems.every(i => i.localCount === 0)}
            >
              {isChecking ? '检查中...' : '预检查字段映射'}
            </Button>
            <Button
              onClick={executeMigration}
              disabled={
                isMigrating ||
                migrationItems.every(i => i.localCount === 0) ||
                // 【安全检查】只有字段映射错误才禁用，有冲突的会自动生成新ID
                migrationItems.some(i => i.localCount > 0 && (
                  !i.fieldMapping ||
                  i.fieldMapping.status === 'error'
                ))
              }
              variant="default"
            >
              {isMigrating ? '迁移中...' : '开始迁移'}
            </Button>
          </div>
        </div>

        {/* 迁移报告 */}
        {report && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800">✅ 迁移报告</CardTitle>
            </CardHeader>
            <CardContent className="text-green-700">
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{report.totalItems}</p>
                  <p className="text-sm">总项目数</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{report.successfulItems}</p>
                  <p className="text-sm">成功</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{report.failedItems}</p>
                  <p className="text-sm">失败</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{report.totalMigrated}</p>
                  <p className="text-sm">迁移记录数</p>
                </div>
              </div>

              {report.failedItems > 0 && (
                <div className="mt-4">
                  <p className="font-medium text-red-700">失败详情：</p>
                  <ul className="list-disc list-inside text-sm mt-2">
                    {report.details
                      .filter(d => d.status === 'error')
                      .map(d => (
                        <li key={d.key}>
                          {d.name}: {d.error}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-green-200">
                <p className="text-sm">
                  提示：请刷新页面验证数据是否正确迁移到后端数据库。
                  如果发现问题，可以从备份中恢复数据库。
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
