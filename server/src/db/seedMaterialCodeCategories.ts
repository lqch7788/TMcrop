/**
 * 物料编码分类树种子数据
 * 7大类 + 18个中类 + 若干小类
 * 数据来源: src/data/codeRuleData.ts (权威参考)
 */

import { getDatabase } from './index';

interface CategorySeed {
  code: string;
  name: string;
  nameEn: string;
  parentCode: string;
  level: 'big' | 'mid' | 'sub';
  sortOrder: number;
}

export function seedMaterialCodeCategories(): CategorySeed[] {
  const db = getDatabase();

  const now = new Date().toISOString();
  const allSeeds: CategorySeed[] = [];

  // 检查是否已有物料编码分类数据（仅检查 material 类型）
  const existing = db.exec(`SELECT COUNT(*) as cnt FROM material_code_categories WHERE status = 'active' AND rule_type = 'material'`);
  if (existing.length > 0 && existing[0].values.length > 0 && Number(existing[0].values[0][0]) > 0) {
    console.log('• 物料编码分类数据已存在，跳过种子数据');
    return allSeeds;
  }

  // ==================== SP - 生产投入类 ====================
  const SP: CategorySeed[] = [
    { code: 'SP', name: '生产投入类', nameEn: 'Production Inputs', parentCode: '', level: 'big', sortOrder: 1 },
    { code: '01', name: '种质资源', nameEn: '', parentCode: 'SP', level: 'mid', sortOrder: 1 },
    { code: '01', name: '粮食作物种子', nameEn: '', parentCode: 'SP01', level: 'sub', sortOrder: 1 },
    { code: '02', name: '经济作物种子', nameEn: '', parentCode: 'SP01', level: 'sub', sortOrder: 2 },
    { code: '03', name: '蔬菜种子', nameEn: '', parentCode: 'SP01', level: 'sub', sortOrder: 3 },
    { code: '04', name: '蔬菜种苗', nameEn: '', parentCode: 'SP01', level: 'sub', sortOrder: 4 },
    { code: '05', name: '水果苗木种苗', nameEn: '', parentCode: 'SP01', level: 'sub', sortOrder: 5 },
    { code: '06', name: '水果苗木种子', nameEn: '', parentCode: 'SP01', level: 'sub', sortOrder: 6 },
    { code: '07', name: '花卉与观赏植物', nameEn: '', parentCode: 'SP01', level: 'sub', sortOrder: 7 },
    { code: '08', name: '食用菌菌种', nameEn: '', parentCode: 'SP01', level: 'sub', sortOrder: 8 },
    { code: '99', name: '其他种质资源', nameEn: '', parentCode: 'SP01', level: 'sub', sortOrder: 99 },
    { code: '02', name: '肥料与土壤改良剂', nameEn: '', parentCode: 'SP', level: 'mid', sortOrder: 2 },
    { code: '01', name: '有机肥', nameEn: '', parentCode: 'SP02', level: 'sub', sortOrder: 1 },
    { code: '02', name: '化学肥料', nameEn: '', parentCode: 'SP02', level: 'sub', sortOrder: 2 },
    { code: '03', name: '水溶肥', nameEn: '', parentCode: 'SP02', level: 'sub', sortOrder: 3 },
    { code: '04', name: '叶面肥', nameEn: '', parentCode: 'SP02', level: 'sub', sortOrder: 4 },
    { code: '05', name: '微生物菌剂', nameEn: '', parentCode: 'SP02', level: 'sub', sortOrder: 5 },
    { code: '06', name: '土壤调理剂', nameEn: '', parentCode: 'SP02', level: 'sub', sortOrder: 6 },
    { code: '07', name: '育苗基质', nameEn: '', parentCode: 'SP02', level: 'sub', sortOrder: 7 },
    { code: '99', name: '其他类型', nameEn: '', parentCode: 'SP02', level: 'sub', sortOrder: 99 },
    { code: '03', name: '农药与植保产品', nameEn: '', parentCode: 'SP', level: 'mid', sortOrder: 3 },
    { code: '01', name: '杀虫剂', nameEn: '', parentCode: 'SP03', level: 'sub', sortOrder: 1 },
    { code: '02', name: '杀菌剂', nameEn: '', parentCode: 'SP03', level: 'sub', sortOrder: 2 },
    { code: '03', name: '杀螨剂', nameEn: '', parentCode: 'SP03', level: 'sub', sortOrder: 3 },
    { code: '04', name: '除草剂', nameEn: '', parentCode: 'SP03', level: 'sub', sortOrder: 4 },
    { code: '05', name: '植物生长调节剂', nameEn: '', parentCode: 'SP03', level: 'sub', sortOrder: 5 },
    { code: '06', name: '物理防控用品', nameEn: '', parentCode: 'SP03', level: 'sub', sortOrder: 6 },
    { code: '07', name: '生物农药', nameEn: '', parentCode: 'SP03', level: 'sub', sortOrder: 7 },
    { code: '99', name: '其他类型', nameEn: '', parentCode: 'SP03', level: 'sub', sortOrder: 99 },
  ];

  // ==================== EQ - 设施与装备类 ====================
  const EQ: CategorySeed[] = [
    { code: 'EQ', name: '设施与装备类', nameEn: 'Equipment & Facilities', parentCode: '', level: 'big', sortOrder: 2 },
    { code: '01', name: '生产设施', nameEn: '', parentCode: 'EQ', level: 'mid', sortOrder: 1 },
    { code: '01', name: '塑料薄膜', nameEn: '', parentCode: 'EQ01', level: 'sub', sortOrder: 1 },
    { code: '02', name: '灌溉设备', nameEn: '', parentCode: 'EQ01', level: 'sub', sortOrder: 2 },
    { code: '03', name: '通风设备', nameEn: '', parentCode: 'EQ01', level: 'sub', sortOrder: 3 },
    { code: '04', name: '保温设备', nameEn: '', parentCode: 'EQ01', level: 'sub', sortOrder: 4 },
    { code: '05', name: '降温设备', nameEn: '', parentCode: 'EQ01', level: 'sub', sortOrder: 5 },
    { code: '06', name: '温室骨架', nameEn: '', parentCode: 'EQ01', level: 'sub', sortOrder: 6 },
    { code: '99', name: '其他设施', nameEn: '', parentCode: 'EQ01', level: 'sub', sortOrder: 99 },
    { code: '02', name: '农机具', nameEn: '', parentCode: 'EQ', level: 'mid', sortOrder: 2 },
    { code: '01', name: '耕作机械', nameEn: '', parentCode: 'EQ02', level: 'sub', sortOrder: 1 },
    { code: '02', name: '播种机械', nameEn: '', parentCode: 'EQ02', level: 'sub', sortOrder: 2 },
    { code: '03', name: '施肥机械', nameEn: '', parentCode: 'EQ02', level: 'sub', sortOrder: 3 },
    { code: '04', name: '采收机械', nameEn: '', parentCode: 'EQ02', level: 'sub', sortOrder: 4 },
    { code: '05', name: '搬运机械', nameEn: '', parentCode: 'EQ02', level: 'sub', sortOrder: 5 },
    { code: '99', name: '其他机械', nameEn: '', parentCode: 'EQ02', level: 'sub', sortOrder: 99 },
    { code: '03', name: '包装设备', nameEn: '', parentCode: 'EQ', level: 'mid', sortOrder: 3 },
    { code: '01', name: '包装材料', nameEn: '', parentCode: 'EQ03', level: 'sub', sortOrder: 1 },
    { code: '02', name: '包装机械', nameEn: '', parentCode: 'EQ03', level: 'sub', sortOrder: 2 },
    { code: '03', name: '标签设备', nameEn: '', parentCode: 'EQ03', level: 'sub', sortOrder: 3 },
    { code: '99', name: '其他', nameEn: '', parentCode: 'EQ03', level: 'sub', sortOrder: 99 },
  ];

  // ==================== OP - 作业支持类 ====================
  const OP: CategorySeed[] = [
    { code: 'OP', name: '作业支持类', nameEn: 'Operational Support', parentCode: '', level: 'big', sortOrder: 3 },
    { code: '01', name: '劳保与防护用品', nameEn: '', parentCode: 'OP', level: 'mid', sortOrder: 1 },
    { code: '01', name: '手部防护', nameEn: '', parentCode: 'OP01', level: 'sub', sortOrder: 1 },
    { code: '02', name: '足部防护', nameEn: '', parentCode: 'OP01', level: 'sub', sortOrder: 2 },
    { code: '03', name: '身体防护', nameEn: '', parentCode: 'OP01', level: 'sub', sortOrder: 3 },
    { code: '04', name: '呼吸/眼部防护', nameEn: '', parentCode: 'OP01', level: 'sub', sortOrder: 4 },
    { code: '05', name: '防晒防暑用品', nameEn: '', parentCode: 'OP01', level: 'sub', sortOrder: 5 },
    { code: '99', name: '其他劳保防护类', nameEn: '', parentCode: 'OP01', level: 'sub', sortOrder: 99 },
    { code: '02', name: '日常劳动工具', nameEn: '', parentCode: 'OP', level: 'mid', sortOrder: 2 },
    { code: '01', name: '手动农具', nameEn: '', parentCode: 'OP02', level: 'sub', sortOrder: 1 },
    { code: '02', name: '修剪工具', nameEn: '', parentCode: 'OP02', level: 'sub', sortOrder: 2 },
    { code: '03', name: '小型电动工具', nameEn: '', parentCode: 'OP02', level: 'sub', sortOrder: 3 },
    { code: '04', name: '清洁工具', nameEn: '', parentCode: 'OP02', level: 'sub', sortOrder: 4 },
    { code: '05', name: '小型运输车', nameEn: '', parentCode: 'OP02', level: 'sub', sortOrder: 5 },
    { code: '99', name: '其他劳动工具', nameEn: '', parentCode: 'OP02', level: 'sub', sortOrder: 99 },
    { code: '03', name: '标识与记录用品', nameEn: '', parentCode: 'OP', level: 'mid', sortOrder: 3 },
    { code: '01', name: '田间标牌/标签', nameEn: '', parentCode: 'OP03', level: 'sub', sortOrder: 1 },
    { code: '02', name: '记录本、记号笔', nameEn: '', parentCode: 'OP03', level: 'sub', sortOrder: 2 },
    { code: '03', name: '二维码/RFID标签', nameEn: '', parentCode: 'OP03', level: 'sub', sortOrder: 3 },
    { code: '99', name: '其他标识记录用品', nameEn: '', parentCode: 'OP03', level: 'sub', sortOrder: 99 },
  ];

  // ==================== PH - 采后处理与流通类 ====================
  const PH: CategorySeed[] = [
    { code: 'PH', name: '采后处理与流通类', nameEn: 'Post-harvest & Logistics', parentCode: '', level: 'big', sortOrder: 4 },
    { code: '01', name: '采收容器', nameEn: '', parentCode: 'PH', level: 'mid', sortOrder: 1 },
    { code: '01', name: '塑料周转箱', nameEn: '', parentCode: 'PH01', level: 'sub', sortOrder: 1 },
    { code: '02', name: '采摘篮/筐', nameEn: '', parentCode: 'PH01', level: 'sub', sortOrder: 2 },
    { code: '03', name: '吨袋/编织袋', nameEn: '', parentCode: 'PH01', level: 'sub', sortOrder: 3 },
    { code: '04', name: '包装材料', nameEn: '', parentCode: 'PH01', level: 'sub', sortOrder: 4 },
    { code: '05', name: '纸箱', nameEn: '', parentCode: 'PH01', level: 'sub', sortOrder: 5 },
    { code: '06', name: '泡沫网套/隔板', nameEn: '', parentCode: 'PH01', level: 'sub', sortOrder: 6 },
    { code: '07', name: '胶带、封口耗材', nameEn: '', parentCode: 'PH01', level: 'sub', sortOrder: 7 },
    { code: '08', name: '商品标签/追溯标签', nameEn: '', parentCode: 'PH01', level: 'sub', sortOrder: 8 },
    { code: '99', name: '其他采收材料', nameEn: '', parentCode: 'PH01', level: 'sub', sortOrder: 99 },
    { code: '02', name: '冷链与仓储设备', nameEn: '', parentCode: 'PH', level: 'mid', sortOrder: 2 },
    { code: '01', name: '预冷库/冷藏库', nameEn: '', parentCode: 'PH02', level: 'sub', sortOrder: 1 },
    { code: '02', name: '冷藏运输设备', nameEn: '', parentCode: 'PH02', level: 'sub', sortOrder: 2 },
    { code: '03', name: '保温箱、冰袋', nameEn: '', parentCode: 'PH02', level: 'sub', sortOrder: 3 },
    { code: '99', name: '其他', nameEn: '', parentCode: 'PH02', level: 'sub', sortOrder: 99 },
  ];

  // ==================== IT - 数字化与管理类 ====================
  const IT: CategorySeed[] = [
    { code: 'IT', name: '数字化与管理类', nameEn: 'Digital & Management', parentCode: '', level: 'big', sortOrder: 5 },
    { code: '01', name: '监测设备', nameEn: '', parentCode: 'IT', level: 'mid', sortOrder: 1 },
    { code: '01', name: '空气/土壤/光照等传感器', nameEn: '', parentCode: 'IT01', level: 'sub', sortOrder: 1 },
    { code: '02', name: '手持检测类设备', nameEn: '', parentCode: 'IT01', level: 'sub', sortOrder: 2 },
    { code: '03', name: '气象站', nameEn: '', parentCode: 'IT01', level: 'sub', sortOrder: 3 },
    { code: '04', name: '虫情测报灯', nameEn: '', parentCode: 'IT01', level: 'sub', sortOrder: 4 },
    { code: '05', name: '视频监控设备', nameEn: '', parentCode: 'IT01', level: 'sub', sortOrder: 5 },
    { code: '99', name: '其他检测相关设备', nameEn: '', parentCode: 'IT01', level: 'sub', sortOrder: 99 },
    { code: '02', name: '控制设备', nameEn: '', parentCode: 'IT', level: 'mid', sortOrder: 2 },
    { code: '01', name: '环境参数感知设备', nameEn: '', parentCode: 'IT02', level: 'sub', sortOrder: 1 },
    { code: '02', name: '执行控制设备', nameEn: '', parentCode: 'IT02', level: 'sub', sortOrder: 2 },
    { code: '03', name: '人机交互与本地操作设备', nameEn: '', parentCode: 'IT02', level: 'sub', sortOrder: 3 },
    { code: '04', name: '通信与联网设备', nameEn: '', parentCode: 'IT02', level: 'sub', sortOrder: 4 },
    { code: '05', name: '电源与辅助控制设备', nameEn: '', parentCode: 'IT02', level: 'sub', sortOrder: 5 },
    { code: '99', name: '其他相关控制设备', nameEn: '', parentCode: 'IT02', level: 'sub', sortOrder: 99 },
    { code: '03', name: '软件与服务', nameEn: '', parentCode: 'IT', level: 'mid', sortOrder: 3 },
    { code: '01', name: 'ERP模块许可', nameEn: '', parentCode: 'IT03', level: 'sub', sortOrder: 1 },
    { code: '02', name: '温室大棚控制系统web', nameEn: '', parentCode: 'IT03', level: 'sub', sortOrder: 2 },
    { code: '03', name: '温室大棚控制系统小程序', nameEn: '', parentCode: 'IT03', level: 'sub', sortOrder: 3 },
    { code: '04', name: '数据分析服务', nameEn: '', parentCode: 'IT03', level: 'sub', sortOrder: 4 },
    { code: '05', name: '产品检测服务', nameEn: '', parentCode: 'IT03', level: 'sub', sortOrder: 5 },
    { code: '99', name: '其他软件与服务', nameEn: '', parentCode: 'IT03', level: 'sub', sortOrder: 99 },
  ];

  // ==================== EC - 能源与通用耗材 ====================
  const EC: CategorySeed[] = [
    { code: 'EC', name: '能源与通用耗材', nameEn: 'Energy & Consumables', parentCode: '', level: 'big', sortOrder: 6 },
    { code: '01', name: '能源类', nameEn: '', parentCode: 'EC', level: 'mid', sortOrder: 1 },
    { code: '01', name: '柴油/汽油', nameEn: '', parentCode: 'EC01', level: 'sub', sortOrder: 1 },
    { code: '02', name: '电力', nameEn: '', parentCode: 'EC01', level: 'sub', sortOrder: 2 },
    { code: '03', name: '太阳能板及配件', nameEn: '', parentCode: 'EC01', level: 'sub', sortOrder: 3 },
    { code: '99', name: '其他能源类', nameEn: '', parentCode: 'EC01', level: 'sub', sortOrder: 99 },
    { code: '02', name: '通用耗材', nameEn: '', parentCode: 'EC', level: 'mid', sortOrder: 2 },
    { code: '01', name: '电线、电缆', nameEn: '', parentCode: 'EC02', level: 'sub', sortOrder: 1 },
    { code: '02', name: '扎带、螺丝、密封胶', nameEn: '', parentCode: 'EC02', level: 'sub', sortOrder: 2 },
    { code: '03', name: '电池', nameEn: '', parentCode: 'EC02', level: 'sub', sortOrder: 3 },
    { code: '04', name: '润滑油、润滑脂', nameEn: '', parentCode: 'EC02', level: 'sub', sortOrder: 4 },
    { code: '99', name: '其他耗材', nameEn: '', parentCode: 'EC02', level: 'sub', sortOrder: 99 },
  ];

  // ==================== OT - 其他类 ====================
  const OT: CategorySeed[] = [
    { code: 'OT', name: '其他类', nameEn: 'Others', parentCode: '', level: 'big', sortOrder: 7 },
    { code: '01', name: '未分类资材', nameEn: '', parentCode: 'OT', level: 'mid', sortOrder: 1 },
    { code: '01', name: '其他未分类资材', nameEn: '', parentCode: 'OT01', level: 'sub', sortOrder: 1 },
  ];

  const allCategories = [...SP, ...EQ, ...OP, ...PH, ...IT, ...EC, ...OT];

  for (const cat of allCategories) {
    const id = `MCC_${cat.code}_${cat.parentCode}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    db.run(`
      INSERT INTO material_code_categories (id, code, name, name_en, parent_code, level, sort_order, rule_type, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'material', 'active', ?, ?)
    `, [id, cat.code, cat.name, cat.nameEn, cat.parentCode, cat.level, cat.sortOrder, now, now]);
  }

  console.log(`✓ 物料编码分类种子数据已导入 (${allCategories.length} 条)`);
  allSeeds.push(...allCategories);
  return allSeeds;
}
