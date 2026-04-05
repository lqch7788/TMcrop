import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Search, Download, Eye, Edit, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertTriangle, Plus, X, RefreshCw, Hash, Trash2, Barcode, ChevronDown } from 'lucide-react';

const warehouseMaterials = [
  { id: 1, code: 'SP0101001', name: '水稻种子', category: '种质资源-粮食作物种子', unit: '袋', quantity: 200, minStock: 50, maxStock: 500, price: '30元', supplier: '金种子业公司', location: 'A区-01', specification: '25kg/袋', barcode: '6932456789012', batchNo: 'PC20260301', productionDate: '2026-01-15', expiryDate: '2027-01-15', lastUpdateTime: '2026-03-20 10:30:00', dataStatus: '启用' },
  { id: 2, code: 'SP0102001', name: '棉花种子', category: '种质资源-经济作物种子', unit: '袋', quantity: 80, minStock: 30, maxStock: 200, price: '25元', supplier: '丰收种业', location: 'A区-02', specification: '20kg/袋', barcode: '6932456789013', batchNo: 'PC20260220', productionDate: '2026-02-01', expiryDate: '2027-02-01', lastUpdateTime: '2026-03-19 14:20:00', dataStatus: '启用' },
  { id: 3, code: 'SP0103001', name: '番茄种子', category: '种质资源-蔬菜种子', unit: '袋', quantity: 100, minStock: 50, maxStock: 300, price: '25元', supplier: '鑫源农资公司', location: 'A区-03', specification: '10g/袋', barcode: '6932456789014', batchNo: 'PC20260305', productionDate: '2026-02-20', expiryDate: '2026-08-20', lastUpdateTime: '2026-03-18 09:15:00', dataStatus: '启用' },
  { id: 4, code: 'SP0201001', name: '商品有机肥', category: '肥料与土壤改良剂-有机肥', unit: '袋', quantity: 50, minStock: 100, maxStock: 400, price: '45元', supplier: '丰达化肥厂', location: 'B区-01', specification: '40kg/袋', barcode: '6932456789015', batchNo: 'PC20260110', productionDate: '2026-01-10', expiryDate: '2026-07-10', lastUpdateTime: '2026-03-20 08:00:00', dataStatus: '启用' },
  { id: 5, code: 'SP0202001', name: '尿素', category: '肥料与土壤改良剂-化学肥料', unit: '袋', quantity: 150, minStock: 50, maxStock: 500, price: '80元', supplier: '丰达化肥厂', location: 'B区-02', specification: '50kg/袋', barcode: '6932456789016', batchNo: 'PC20260228', productionDate: '2026-02-28', expiryDate: '2028-02-28', lastUpdateTime: '2026-03-17 16:45:00', dataStatus: '启用' },
  { id: 6, code: 'SP0301001', name: '吡虫啉', category: '农药与植保产品-杀虫剂', unit: '箱', quantity: 30, minStock: 20, maxStock: 100, price: '120元', supplier: '绿叶农业用品店', location: 'C区-01', specification: '100g/瓶', barcode: '6932456789017', batchNo: 'PC20251215', productionDate: '2025-12-15', expiryDate: '2027-12-15', lastUpdateTime: '2026-03-16 11:30:00', dataStatus: '启用' },
  { id: 7, code: 'SP0302001', name: '多菌灵', category: '农药与植保产品-杀菌剂', unit: '箱', quantity: 20, minStock: 20, maxStock: 80, price: '150元', supplier: '绿叶农业用品店', location: 'C区-02', specification: '200g/瓶', barcode: '6932456789018', batchNo: 'PC20251120', productionDate: '2025-11-20', expiryDate: '2027-11-20', lastUpdateTime: '2026-03-15 13:20:00', dataStatus: '停用' },
  { id: 8, code: 'EQ0103001', name: '电动喷雾机', category: '农业机械-植保机械', unit: '台', quantity: 10, minStock: 5, maxStock: 30, price: '280元', supplier: '农机设备公司', location: 'D区-01', specification: '3W-16L', barcode: '6932456789019', batchNo: 'EQ20260301', productionDate: '2026-02-15', expiryDate: '2031-02-15', lastUpdateTime: '2026-03-14 10:00:00', dataStatus: '启用' },
  { id: 9, code: 'EQ0306001', name: '滴灌带', category: '灌溉与水肥系统-灌溉终端', unit: '卷', quantity: 500, minStock: 200, maxStock: 1000, price: '25元', supplier: '节水灌溉设备厂', location: 'E区-01', specification: 'D16-2.0L/h', barcode: '6932456789020', batchNo: 'EQ20260125', productionDate: '2026-01-25', expiryDate: '2031-01-25', lastUpdateTime: '2026-03-13 15:30:00', dataStatus: '启用' },
  { id: 10, code: 'OP0102001', name: '劳保胶靴', category: '劳保与防护用品-足部防护', unit: '双', quantity: 40, minStock: 20, maxStock: 100, price: '35元', supplier: '劳保用品商店', location: 'F区-01', specification: '39-43码', barcode: '6932456789021', batchNo: 'OP20260201', productionDate: '2026-02-01', expiryDate: '2028-02-01', lastUpdateTime: '2026-03-12 09:45:00', dataStatus: '启用' },
  { id: 11, code: 'OP0201001', name: '锄头', category: '日常劳动工具-手动农具', unit: '把', quantity: 25, minStock: 10, maxStock: 80, price: '18元', supplier: '五金工具店', location: 'F区-02', specification: '1.2kg', barcode: '6932456789022', batchNo: 'OP20260115', productionDate: '2026-01-15', expiryDate: '2031-01-15', lastUpdateTime: '2026-03-11 14:00:00', dataStatus: '启用' },
  { id: 12, code: 'PH0104001', name: '塑料袋', category: '采收容器-包装材料', unit: '卷', quantity: 200, minStock: 100, maxStock: 500, price: '15元', supplier: '包装材料公司', location: 'G区-01', specification: '50cm*80cm', barcode: '6932456789023', batchNo: 'PH20260210', productionDate: '2026-02-10', expiryDate: '2027-02-10', lastUpdateTime: '2026-03-10 16:20:00', dataStatus: '启用' },
  { id: 13, code: 'IT0101001', name: '土壤温湿度传感器', category: '监测设备-传感器', unit: '个', quantity: 20, minStock: 10, maxStock: 50, price: '150元', supplier: '智慧农业设备商', location: 'H区-01', specification: 'RS485 Modbus', barcode: '6932456789024', batchNo: 'IT20260308', productionDate: '2026-03-08', expiryDate: '2031-03-08', lastUpdateTime: '2026-03-20 17:00:00', dataStatus: '启用' },
];

const inboundRecords = [
  {
    id: 1,
    code: 'RK20260315-001',
    inboundDate: '2026-03-15',
    supplier: '鑫源农资公司',
    operator: '张伟民',
    status: 'completed',
    materials: [
      { id: 1, materialCode: 'SP0103001', materialName: '番茄种子', category: '种质资源-蔬菜种子', specification: '10g/袋', barcode: '6932456789014', unit: '袋', quantity: 100, price: '25', location: 'A区-03', batchNo: 'PC20260305', productionDate: '2026-02-20', expiryDate: '2026-08-20' },
      { id: 2, materialCode: 'SP0101001', materialName: '水稻种子', category: '种质资源-粮食作物种子', specification: '25kg/袋', barcode: '6932456789012', unit: '袋', quantity: 200, price: '30', location: 'A区-01', batchNo: 'PC20260301', productionDate: '2026-01-15', expiryDate: '2027-01-15' },
    ]
  },
  {
    id: 2,
    code: 'RK20260314-002',
    inboundDate: '2026-03-14',
    supplier: '丰达化肥厂',
    operator: '李明轩',
    status: 'completed',
    materials: [
      { id: 3, materialCode: 'SP0201001', materialName: '商品有机肥', category: '肥料与土壤改良剂-有机肥', specification: '40kg/袋', barcode: '6932456789015', unit: '袋', quantity: 50, price: '45', location: 'B区-01', batchNo: 'PC20260110', productionDate: '2026-01-10', expiryDate: '2026-07-10' },
      { id: 4, materialCode: 'SP0202001', materialName: '尿素', category: '肥料与土壤改良剂-化学肥料', specification: '50kg/袋', barcode: '6932456789016', unit: '袋', quantity: 150, price: '80', location: 'B区-02', batchNo: 'PC20260228', productionDate: '2026-02-28', expiryDate: '2028-02-28' },
    ]
  },
  {
    id: 3,
    code: 'RK20260313-003',
    inboundDate: '2026-03-13',
    supplier: '绿叶农业用品店',
    operator: '王建国',
    status: 'completed',
    materials: [
      { id: 5, materialCode: 'SP0302001', materialName: '多菌灵', category: '农药与植保产品-杀菌剂', specification: '200g/瓶', barcode: '6932456789018', unit: '箱', quantity: 20, price: '150', location: 'C区-02', batchNo: 'PC20251120', productionDate: '2025-11-20', expiryDate: '2027-11-20' },
      { id: 6, materialCode: 'SP0301001', materialName: '吡虫啉', category: '农药与植保产品-杀虫剂', specification: '100g/瓶', barcode: '6932456789017', unit: '箱', quantity: 30, price: '120', location: 'C区-01', batchNo: 'PC20251215', productionDate: '2025-12-15', expiryDate: '2027-12-15' },
    ]
  },
  {
    id: 4,
    code: 'RK20260312-004',
    inboundDate: '2026-03-12',
    supplier: '农机设备公司',
    operator: '张伟民',
    status: 'completed',
    materials: [
      { id: 7, materialCode: 'EQ0103001', materialName: '电动喷雾机', category: '农业机械-植保机械', specification: '3W-16L', barcode: '6932456789019', unit: '台', quantity: 10, price: '280', location: 'D区-01', batchNo: 'EQ20260301', productionDate: '2026-02-15', expiryDate: '2031-02-15' },
      { id: 8, materialCode: 'EQ0306001', materialName: '滴灌带', category: '灌溉与水肥系统-灌溉终端', specification: 'D16-2.0L/h', barcode: '6932456789020', unit: '卷', quantity: 500, price: '25', location: 'E区-01', batchNo: 'EQ20260125', productionDate: '2026-01-25', expiryDate: '2031-01-25' },
    ]
  },
  {
    id: 5,
    code: 'RK20260311-005',
    inboundDate: '2026-03-11',
    supplier: '劳保用品商店',
    operator: '李明轩',
    status: 'pending',
    materials: [
      { id: 9, materialCode: 'OP0102001', materialName: '劳保胶靴', category: '劳保与防护用品-足部防护', specification: '39-43码', barcode: '6932456789021', unit: '双', quantity: 40, price: '35', location: 'F区-01', batchNo: 'OP20260201', productionDate: '2026-02-01', expiryDate: '2028-02-01' },
      { id: 10, materialCode: 'OP0201001', materialName: '锄头', category: '日常劳动工具-手动农具', specification: '1.2kg', barcode: '6932456789022', unit: '把', quantity: 25, price: '18', location: 'F区-02', batchNo: 'OP20260115', productionDate: '2026-01-15', expiryDate: '2031-01-15' },
    ]
  },
  {
    id: 6,
    code: 'RK20260310-006',
    inboundDate: '2026-03-10',
    supplier: '包装材料公司',
    operator: '王建国',
    status: 'completed',
    materials: [
      { id: 11, materialCode: 'PH0104001', materialName: '塑料袋', category: '采收容器-包装材料', specification: '50cm*80cm', barcode: '6932456789023', unit: '卷', quantity: 200, price: '15', location: 'G区-01', batchNo: 'PH20260210', productionDate: '2026-02-10', expiryDate: '2027-02-10' },
    ]
  },
  {
    id: 7,
    code: 'RK20260309-007',
    inboundDate: '2026-03-09',
    supplier: '智慧农业设备商',
    operator: '张伟民',
    status: 'completed',
    materials: [
      { id: 12, materialCode: 'IT0101001', materialName: '土壤温湿度传感器', category: '监测设备-传感器', specification: 'RS485 Modbus', barcode: '6932456789024', unit: '个', quantity: 20, price: '150', location: 'H区-01', batchNo: 'IT20260308', productionDate: '2026-03-08', expiryDate: '2031-03-08' },
    ]
  },
];

// 编码规则配置：大类(2位字母) + 中类(2位数字) + 小类(2位数字) + 顺序号(3位数字)
// 例如：SP0101001 = SP(生产投入类) - 01(种质资源) - 01(粮食作物种子) - 001
const categoryConfig = {
  // 大类：SP = 生产投入类
  'SP': { name: '生产投入类', categories: {
    // 中类：01 = 种质资源
    '01': { name: '种质资源', subCategories: {
      '01': { name: '粮食作物种子', prefix: 'SP0101' },
      '02': { name: '经济作物种子', prefix: 'SP0102' },
      '03': { name: '蔬菜种子', prefix: 'SP0103' },
      '04': { name: '蔬菜种苗', prefix: 'SP0104' },
      '05': { name: '水果苗木种苗', prefix: 'SP0105' },
      '06': { name: '水果苗木种子', prefix: 'SP0106' },
      '07': { name: '花卉与观赏植物', prefix: 'SP0107' },
      '08': { name: '食用菌菌种', prefix: 'SP0108' },
      '99': { name: '其他种质资源', prefix: 'SP0199' },
    }},
    // 中类：02 = 肥料与土壤改良剂
    '02': { name: '肥料与土壤改良剂', subCategories: {
      '01': { name: '有机肥', prefix: 'SP0201' },
      '02': { name: '化学肥料', prefix: 'SP0202' },
      '03': { name: '水溶肥', prefix: 'SP0203' },
      '04': { name: '叶面肥', prefix: 'SP0204' },
      '05': { name: '微生物菌剂', prefix: 'SP0205' },
      '06': { name: '土壤调理剂', prefix: 'SP0206' },
      '07': { name: '育苗基质', prefix: 'SP0207' },
      '99': { name: '其他类型', prefix: 'SP0299' },
    }},
    // 中类：03 = 农药与植保产品
    '03': { name: '农药与植保产品', subCategories: {
      '01': { name: '杀虫剂', prefix: 'SP0301' },
      '02': { name: '杀菌剂', prefix: 'SP0302' },
      '03': { name: '杀螨剂', prefix: 'SP0303' },
      '04': { name: '除草剂', prefix: 'SP0304' },
      '05': { name: '植物生长调节剂', prefix: 'SP0305' },
      '06': { name: '物理防控用品', prefix: 'SP0306' },
      '07': { name: '生物农药', prefix: 'SP0307' },
      '99': { name: '其他类型', prefix: 'SP0399' },
    }},
  }},
  // 大类：EQ = 设施与装备类
  'EQ': { name: '设施与装备类', categories: {
    // 中类：01 = 农业机械
    '01': { name: '农业机械', subCategories: {
      '01': { name: '耕作机械', prefix: 'EQ0101' },
      '02': { name: '播种/移栽设备', prefix: 'EQ0102' },
      '03': { name: '植保机械', prefix: 'EQ0103' },
      '04': { name: '收获机械', prefix: 'EQ0104' },
      '05': { name: '初加工设备', prefix: 'EQ0105' },
      '99': { name: '其他相关机械', prefix: 'EQ0199' },
    }},
    // 中类：02 = 设施农业系统
    '02': { name: '设施农业系统', subCategories: {
      '01': { name: '骨架结构材料', prefix: 'EQ0201' },
      '02': { name: '覆盖材料', prefix: 'EQ0202' },
      '03': { name: '通风降温设备', prefix: 'EQ0203' },
      '04': { name: '加温设备', prefix: 'EQ0204' },
      '05': { name: '补光系统', prefix: 'EQ0205' },
      '06': { name: '自动化控制设备', prefix: 'EQ0206' },
      '99': { name: '其他相关设施设备', prefix: 'EQ0299' },
    }},
    // 中类：03 = 灌溉与水肥系统
    '03': { name: '灌溉与水肥系统', subCategories: {
      '01': { name: '水源与泵站', prefix: 'EQ0301' },
      '02': { name: '水肥一体机', prefix: 'EQ0302' },
      '03': { name: '输水管网', prefix: 'EQ0303' },
      '04': { name: '过滤系统', prefix: 'EQ0304' },
      '05': { name: '施肥装置', prefix: 'EQ0305' },
      '06': { name: '灌溉终端', prefix: 'EQ0306' },
      '99': { name: '其他相关灌溉系统设备', prefix: 'EQ0399' },
    }},
  }},
  // 大类：OP = 作业支持类
  'OP': { name: '作业支持类', categories: {
    // 中类：01 = 劳保与防护用品
    '01': { name: '劳保与防护用品', subCategories: {
      '01': { name: '手部防护', prefix: 'OP0101' },
      '02': { name: '足部防护', prefix: 'OP0102' },
      '03': { name: '身体防护', prefix: 'OP0103' },
      '04': { name: '呼吸/眼部防护', prefix: 'OP0104' },
      '05': { name: '防晒防暑用品', prefix: 'OP0105' },
      '99': { name: '其他劳保防护类', prefix: 'OP0199' },
    }},
    // 中类：02 = 日常劳动工具
    '02': { name: '日常劳动工具', subCategories: {
      '01': { name: '手动农具', prefix: 'OP0201' },
      '02': { name: '修剪工具', prefix: 'OP0202' },
      '03': { name: '小型电动工具', prefix: 'OP0203' },
      '04': { name: '清洁工具', prefix: 'OP0204' },
      '05': { name: '小型运输车', prefix: 'OP0205' },
      '99': { name: '其他劳动工具', prefix: 'OP0299' },
    }},
    // 中类：03 = 标识与记录用品
    '03': { name: '标识与记录用品', subCategories: {
      '01': { name: '田间标牌/标签', prefix: 'OP0301' },
      '02': { name: '记录本、记号笔', prefix: 'OP0302' },
      '03': { name: '二维码/RFID标签', prefix: 'OP0303' },
      '99': { name: '其他标识记录用品', prefix: 'OP0399' },
    }},
  }},
  // 大类：PH = 采后处理与流通类
  'PH': { name: '采后处理与流通类', categories: {
    // 中类：01 = 采收容器
    '01': { name: '采收容器', subCategories: {
      '01': { name: '塑料周转箱', prefix: 'PH0101' },
      '02': { name: '采摘篮/筐', prefix: 'PH0102' },
      '03': { name: '吨袋/编织袋', prefix: 'PH0103' },
      '04': { name: '包装材料', prefix: 'PH0104' },
      '05': { name: '纸箱', prefix: 'PH0105' },
      '06': { name: '泡沫网套/隔板', prefix: 'PH0106' },
      '07': { name: '胶带、封口耗材', prefix: 'PH0107' },
      '08': { name: '商品标签/追溯标签', prefix: 'PH0108' },
      '99': { name: '其他采收材料', prefix: 'PH0199' },
    }},
    // 中类：02 = 冷链与仓储设备
    '02': { name: '冷链与仓储设备', subCategories: {
      '01': { name: '预冷库/冷藏库', prefix: 'PH0201' },
      '02': { name: '冷藏运输设备', prefix: 'PH0202' },
      '03': { name: '保温箱、冰袋', prefix: 'PH0203' },
      '99': { name: '其他', prefix: 'PH0299' },
    }},
  }},
  // 大类：IT = 数字化与管理类
  'IT': { name: '数字化与管理类', categories: {
    // 中类：01 = 监测设备
    '01': { name: '监测设备', subCategories: {
      '01': { name: '空气/土壤/光照等传感器', prefix: 'IT0101' },
      '02': { name: '手持检测类设备', prefix: 'IT0102' },
      '03': { name: '气象站', prefix: 'IT0103' },
      '04': { name: '虫情测报灯', prefix: 'IT0104' },
      '05': { name: '视频监控设备', prefix: 'IT0105' },
      '99': { name: '其他检测相关设备', prefix: 'IT0199' },
    }},
    // 中类：02 = 控制设备
    '02': { name: '控制设备', subCategories: {
      '01': { name: '环境参数感知设备', prefix: 'IT0201' },
      '02': { name: '执行控制设备', prefix: 'IT0202' },
      '03': { name: '人机交互与本地操作设备', prefix: 'IT0203' },
      '04': { name: '通信与联网设备', prefix: 'IT0204' },
      '05': { name: '电源与辅助控制设备', prefix: 'IT0205' },
      '99': { name: '其他相关控制设备', prefix: 'IT0299' },
    }},
    // 中类：03 = 软件与服务
    '03': { name: '软件与服务', subCategories: {
      '01': { name: 'ERP模块许可', prefix: 'IT0301' },
      '02': { name: '温室大棚控制系统web', prefix: 'IT0302' },
      '03': { name: '温室大棚控制系统小程序', prefix: 'IT0303' },
      '04': { name: '数据分析服务', prefix: 'IT0304' },
      '05': { name: '产品检测服务', prefix: 'IT0305' },
      '99': { name: '其他软件与服务', prefix: 'IT0399' },
    }},
  }},
  // 大类：EC = 能源与通用耗材
  'EC': { name: '能源与通用耗材', categories: {
    // 中类：01 = 能源类
    '01': { name: '能源类', subCategories: {
      '01': { name: '柴油/汽油', prefix: 'EC0101' },
      '02': { name: '电力', prefix: 'EC0102' },
      '03': { name: '太阳能板及配件', prefix: 'EC0103' },
      '99': { name: '其他能源类', prefix: 'EC0199' },
    }},
    // 中类：02 = 通用耗材
    '02': { name: '通用耗材', subCategories: {
      '01': { name: '电线、电缆', prefix: 'EC0201' },
      '02': { name: '扎带、螺丝、密封胶', prefix: 'EC0202' },
      '03': { name: '电池', prefix: 'EC0203' },
      '04': { name: '润滑油、润滑脂', prefix: 'EC0204' },
      '99': { name: '其他耗材', prefix: 'EC0299' },
    }},
  }},
  // 大类：OT = 其他类
  'OT': { name: '其他类', categories: {
    '01': { name: '未分类资材', subCategories: {
      '01': { name: '其他未分类资材', prefix: 'OT0101' },
    }},
  }},
};

const bigCategories = [
  { code: 'SP', name: '生产投入类' },
  { code: 'EQ', name: '设施与装备类' },
  { code: 'OP', name: '作业支持类' },
  { code: 'PH', name: '采后处理与流通类' },
  { code: 'IT', name: '数字化与管理类' },
  { code: 'EC', name: '能源与通用耗材' },
  { code: 'OT', name: '其他类' },
];

export default function WarehouseMaterials() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'inbound'>('overview');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('全部');
  const [supplier, setSupplier] = useState('');
  const [location, setLocation] = useState('');
  const [searchBigCategory, setSearchBigCategory] = useState('');
  const [searchMidCategory, setSearchMidCategory] = useState('');
  const [searchSubCategory, setSearchSubCategory] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [inboundPage, setInboundPage] = useState(1);
  const [inboundPageSize, setInboundPageSize] = useState(10);
  const [expandedInboundRows, setExpandedInboundRows] = useState<Set<number>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [showInboundDetailModal, setShowInboundDetailModal] = useState(false);
  const [showInboundEditModal, setShowInboundEditModal] = useState(false);
  const [showInboundEditConfirm, setShowInboundEditConfirm] = useState(false);
  const [selectedInboundRecord, setSelectedInboundRecord] = useState<any>(null);
  const [inboundEditForm, setInboundEditForm] = useState({
    supplier: '',
    operator: '',
    inboundDate: '',
    status: ''
  });
  // 物料删除状态
  const [showMaterialDeleteConfirm, setShowMaterialDeleteConfirm] = useState(false);
  // 入库记录删除状态
  const [showInboundDeleteConfirm, setShowInboundDeleteConfirm] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    quantity: 0,
    minStock: 0,
    maxStock: 0,
    price: '',
    supplier: '',
    location: '',
    specification: '',
    barcode: '',
    batchNo: '',
    productionDate: '',
    expiryDate: '',
    lastUpdateTime: '',
    dataStatus: '启用'
  });

  // 批量编辑状态
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [batchEditedMaterials, setBatchEditedMaterials] = useState<Record<number, any>>({});
  const [currentBatchEditIndex, setCurrentBatchEditIndex] = useState(0);

  // 新增入库表单状态
  const [newInbound, setNewInbound] = useState({
    orderCode: '',
    bigCategory: '',
    midCategory: '',
    subCategory: '',
    materialCode: '',
    materialName: '',
    category: '',
    specification: '',
    barcode: '',
    unit: '袋',
    quantity: '',
    price: '',
    supplier: '',
    location: '',
    batchNo: '',
    productionDate: '',
    expiryDate: '',
    inboundDate: '',
    operator: '',
    remarks: '',
  });

  // 自动生成入库单号
  const generateOrderCode = () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    // 查找当天已有的最大序号
    const todayRecords = inboundRecords.filter(r => r.code.startsWith(`RK${dateStr}`));
    let maxSeq = 0;
    if (todayRecords.length > 0) {
      const sequences = todayRecords.map(r => parseInt(r.code.split('-')[1] || '0'));
      maxSeq = Math.max(...sequences);
    }
    const newSeq = (maxSeq + 1).toString().padStart(3, '0');
    const orderCode = `RK${dateStr}-${newSeq}`;
    setNewInbound({ ...newInbound, orderCode });
  };

  // 编码重复检查
  const [codeError, setCodeError] = useState('');
  const [nameError, setNameError] = useState('');

  // 编码生成器状态（独立于新增表单）
  const [codeGen, setCodeGen] = useState({
    bigCategory: '',
    midCategory: '',
    subCategory: '',
    generatedCode: '',
  });
  const [codeGenError, setCodeGenError] = useState('');
  const [codeGenSuccess, setCodeGenSuccess] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // 编码生成器 - 分类变化
  const handleCodeGenCategoryChange = (field: string, value: string) => {
    if (field === 'bigCategory') {
      setCodeGen({ ...codeGen, bigCategory: value, midCategory: '', subCategory: '', generatedCode: '' });
    } else if (field === 'midCategory') {
      setCodeGen({ ...codeGen, midCategory: value, subCategory: '', generatedCode: '' });
    } else if (field === 'subCategory') {
      setCodeGen({ ...codeGen, subCategory: value, generatedCode: '' });
    }
    setCodeGenError('');
    setCodeGenSuccess('');
  };

  // 编码生成器 - 生成编码
  const handleCodeGen = () => {
    if (!codeGen.bigCategory || !codeGen.midCategory || !codeGen.subCategory) {
      setCodeGenError('请先选择大类、中类、小类');
      return;
    }

    const subCat = getCodeGenSubCategories().find(s => s.code === codeGen.subCategory);
    if (!subCat) return;

    const prefix = subCat.prefix;
    const existingCodes = warehouseMaterials
      .filter(m => m.code.startsWith(prefix))
      .map(m => parseInt(m.code.slice(-3)));

    let maxSeq = 0;
    if (existingCodes.length > 0) {
      maxSeq = Math.max(...existingCodes);
    }

    const newSeq = (maxSeq + 1).toString().padStart(3, '0');
    const fullCode = prefix + newSeq;

    setCodeGen({ ...codeGen, generatedCode: fullCode });
    setCodeGenError('');
    setCodeGenSuccess('编码已生成！');
  };

  // 编码生成器 - 验证重复
  const handleVerifyCode = () => {
    if (!codeGen.generatedCode) {
      setCodeGenError('请先生成编码');
      return;
    }

    const exists = warehouseMaterials.some(m => m.code === codeGen.generatedCode);
    if (exists) {
      setCodeGenError('警告：该编码已在库存中存在！');
      setCodeGenSuccess('');
    } else {
      setCodeGenError('');
      setCodeGenSuccess('验证通过：该编码可以使用！');
    }
  };

  // 编码生成器 - 复制编码
  const handleCopyCode = () => {
    if (!codeGen.generatedCode) return;
    navigator.clipboard.writeText(codeGen.generatedCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const lowStockCount = warehouseMaterials.filter(m => m.quantity < m.minStock).length;

  const handleLowStockClick = () => {
    setShowLowStock(!showLowStock);
    setCurrentPage(1);
  };

  // 展开/折叠入库记录行
  const toggleExpandInboundRow = (id: number) => {
    const newExpandedRows = new Set(expandedInboundRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedInboundRows(newExpandedRows);
  };

  // 导出模式相关处理函数
  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleSelectAll = () => {
    if (selectedRows.length === filteredMaterials.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredMaterials.map(m => m.id));
    }
  };

  const handleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const handleConfirmExport = () => {
    setShowExportModal(true);
  };

  const handleCancelExport = () => {
    setExportMode(false);
    setBatchEditMode(false);
    setSelectedRows([]);
    setBatchEditForm({ quantity: '', minStock: '', price: '', location: '' });
  };

  const handleDoExport = async () => {
    const selectedData = filteredMaterials.filter(m => selectedRows.includes(m.id));
    const exportData = selectedData.map(m => ({
      '物料编号': m.code,
      '物料名称': m.name,
      '分类': m.category,
      '规格型号': m.specification,
      '条形码': m.barcode,
      '单位': m.unit,
      '库存数量': m.quantity,
      '最低库存': m.minStock,
      '最高库存': m.maxStock,
      '单价': m.price,
      '供应商': m.supplier,
      '存放位置': m.location,
      '批次号': m.batchNo,
      '生产日期': m.productionDate,
      '有效期至': m.expiryDate,
      '最后更新时间': m.lastUpdateTime,
      '数据状态': m.dataStatus,
    }));

    const headers = ['物料编号', '物料名称', '分类', '规格型号', '条形码', '单位', '库存数量', '最低库存', '最高库存', '单价', '供应商', '存放位置', '批次号', '生产日期', '有效期至', '最后更新时间', '数据状态'];

    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(','))
      ].join('\n');
      const BOM = '\uFEFF';
      content = BOM + csvContent;
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h as keyof typeof row]}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>物料库存</title></head><body><table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse"><tr style="background-color:#f0f0f0">${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h as keyof typeof row]}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `物料库存_${new Date().toISOString().slice(0, 10)}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: exportFormat.toUpperCase() + ' Files',
            accept: { [mimeType]: ['.' + extension] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } else {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    setExportMode(false);
    setSelectedRows([]);
    setShowExportModal(false);
  };

  const filteredMaterials = warehouseMaterials.filter(m => {
    // 物料编号搜索
    if (code && !m.code.includes(code)) return false;
    // 物料名称搜索
    if (name && !m.name.includes(name)) return false;
    // 供应商搜索
    if (supplier && m.supplier !== supplier) return false;
    // 存放位置搜索
    if (location && m.location !== location) return false;
    // 分类搜索（简单分类）
    if (category !== '全部') {
      const categoryMap: Record<string, string> = {
        '种子种苗': '种质资源',
        '肥料': '肥料与土壤改良剂',
        '农药': '农药与植保产品',
        '农膜': '设施农业系统',
      };
      if (!m.category.includes(categoryMap[category] || category)) return false;
    }
    // 大类搜索
    if (searchBigCategory && !m.code.startsWith(searchBigCategory)) return false;
    // 中类搜索
    if (searchMidCategory && !m.code.slice(2, 4).startsWith(searchMidCategory)) return false;
    // 小类搜索
    if (searchSubCategory && !m.code.slice(4, 6).startsWith(searchSubCategory)) return false;
    // 低库存筛选
    if (showLowStock && m.quantity >= m.minStock) return false;
    return true;
  });

  // 搜索用-获取大类选项
  const getSearchBigCategories = () => {
    return Object.keys(categoryConfig).map(key => ({
      code: key,
      name: categoryConfig[key as keyof typeof categoryConfig].name,
    }));
  };

  // 搜索用-获取中类选项
  const getSearchMidCategories = () => {
    if (!searchBigCategory) return [];
    const bigCat = categoryConfig[searchBigCategory as keyof typeof categoryConfig];
    if (!bigCat) return [];
    return Object.entries(bigCat.categories).map(([code, data]) => ({
      code,
      name: data.name,
    }));
  };

  // 搜索用-获取小类选项
  const getSearchSubCategories = () => {
    if (!searchBigCategory || !searchMidCategory) return [];
    const bigCat = categoryConfig[searchBigCategory as keyof typeof categoryConfig];
    if (!bigCat) return [];
    const midCat = bigCat.categories[searchMidCategory as keyof typeof bigCat.categories];
    if (!midCat) return [];
    return Object.entries(midCat.subCategories).map(([code, data]) => ({
      code,
      name: data.name,
    }));
  };

  // 获取中类选项
  const getMidCategories = () => {
    if (!newInbound.bigCategory) return [];
    const bigCat = categoryConfig[newInbound.bigCategory as keyof typeof categoryConfig];
    if (!bigCat) return [];
    return Object.entries(bigCat.categories).map(([code, data]) => ({
      code,
      name: data.name,
    }));
  };

  // 获取小类选项
  const getSubCategories = () => {
    if (!newInbound.bigCategory || !newInbound.midCategory) return [];
    const bigCat = categoryConfig[newInbound.bigCategory as keyof typeof categoryConfig];
    if (!bigCat) return [];
    const midCat = bigCat.categories[newInbound.midCategory as keyof typeof bigCat.categories];
    if (!midCat) return [];
    return Object.entries(midCat.subCategories).map(([code, data]) => ({
      code,
      name: data.name,
      prefix: data.prefix,
    }));
  };

  // 获取编码生成器中类选项
  const getCodeGenMidCategories = () => {
    if (!codeGen.bigCategory) return [];
    const bigCat = categoryConfig[codeGen.bigCategory as keyof typeof categoryConfig];
    if (!bigCat) return [];
    return Object.entries(bigCat.categories).map(([code, data]) => ({
      code,
      name: data.name,
    }));
  };

  // 获取编码生成器小类选项
  const getCodeGenSubCategories = () => {
    if (!codeGen.bigCategory || !codeGen.midCategory) return [];
    const bigCat = categoryConfig[codeGen.bigCategory as keyof typeof categoryConfig];
    if (!bigCat) return [];
    const midCat = bigCat.categories[codeGen.midCategory as keyof typeof bigCat.categories];
    if (!midCat) return [];
    return Object.entries(midCat.subCategories).map(([code, data]) => ({
      code,
      name: data.name,
      prefix: data.prefix,
    }));
  };

  // 生成编码
  const generateCode = () => {
    if (!newInbound.bigCategory || !newInbound.midCategory || !newInbound.subCategory) {
      setCodeError('请先选择大类、中类、小类');
      return;
    }

    const subCat = getSubCategories().find(s => s.code === newInbound.subCategory);
    if (!subCat) return;

    const prefix = subCat.prefix;
    // 查找该前缀下已有的最大序号（编码格式：SP0101001，序号为最后3位）
    const existingCodes = warehouseMaterials
      .filter(m => m.code.startsWith(prefix))
      .map(m => parseInt(m.code.slice(-3)));

    let maxSeq = 0;
    if (existingCodes.length > 0) {
      maxSeq = Math.max(...existingCodes);
    }

    const newSeq = (maxSeq + 1).toString().padStart(3, '0');
    const fullCode = prefix + newSeq;

    setNewInbound({ ...newInbound, materialCode: fullCode });
    setCodeError('');

    // 自动检查编码重复
    checkCodeDuplicate(fullCode);
  };

  // 检查编码重复
  const checkCodeDuplicate = (code: string) => {
    if (!code) return;
    const exists = warehouseMaterials.some(m => m.code === code);
    if (exists) {
      setCodeError('该物料编码已存在，请重新选择分类');
    } else {
      setCodeError('');
    }
  };

  // 检查名称重复
  const checkNameDuplicate = (name: string) => {
    if (!name) return;
    const exists = warehouseMaterials.some(m => m.name === name);
    if (exists) {
      setNameError('该物料名称已存在');
    } else {
      setNameError('');
    }
  };

  const handleMaterialNameChange = (value: string) => {
    setNewInbound({ ...newInbound, materialName: value });
    checkNameDuplicate(value);
  };

  const handleCategoryChange = (field: string, value: string) => {
    if (field === 'bigCategory') {
      setNewInbound({ ...newInbound, bigCategory: value, midCategory: '', subCategory: '', materialCode: '' });
    } else if (field === 'midCategory') {
      setNewInbound({ ...newInbound, midCategory: value, subCategory: '', materialCode: '' });
    } else if (field === 'subCategory') {
      setNewInbound({ ...newInbound, subCategory: value, materialCode: '' });
    }
    setCodeError('');
  };

  const handleSaveInbound = () => {
    // 最终检查
    if (codeError || nameError) {
      return;
    }
    if (!newInbound.materialCode || !newInbound.materialName || !newInbound.quantity) {
      return;
    }

    console.log('Saving inbound:', newInbound);
    setShowAddModal(false);
    setNewInbound({
      bigCategory: '',
      midCategory: '',
      subCategory: '',
      materialCode: '',
      materialName: '',
      quantity: '',
      unit: '袋',
      supplier: '',
      inboundDate: '',
      operator: '',
      warehouseLocation: '',
      remarks: '',
    });
    setCodeError('');
    setNameError('');
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setNewInbound({
      bigCategory: '',
      midCategory: '',
      subCategory: '',
      materialCode: '',
      materialName: '',
      quantity: '',
      unit: '袋',
      supplier: '',
      inboundDate: '',
      operator: '',
      warehouseLocation: '',
      remarks: '',
    });
    setCodeError('');
    setNameError('');
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">仓库物料</h1>
              <p className="text-gray-500">仓库物料库存管理</p>
            </div>
          </div>
          {lowStockCount > 0 && (
            <button
              onClick={handleLowStockClick}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showLowStock
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">库存不足</span>
              <span className="bg-red-500 text-white text-sm px-2 py-0.5 rounded-full">{lowStockCount}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => { setActiveTab('overview'); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'overview'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          物料总览
        </button>
        <button
          onClick={() => { setActiveTab('inbound'); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'inbound'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          物料入库
        </button>
      </div>

      {/* Material Overview Tab */}
      {activeTab === 'overview' && (
        <>
          <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
            <div className="grid grid-cols-8 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">物料编号</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="请输入"
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">物料名称</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入"
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
                <select
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="">全部</option>
                  {warehouseMaterials.map(m => m.supplier).filter((v, i, a) => a.indexOf(v) === i).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">存放位置</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="">全部</option>
                  {warehouseMaterials.map(m => m.location).filter((v, i, a) => a.indexOf(v) === i).map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">大类</label>
                <select
                  value={searchBigCategory}
                  onChange={(e) => { setSearchBigCategory(e.target.value); setSearchMidCategory(''); setSearchSubCategory(''); }}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="">全部</option>
                  {getSearchBigCategories().map(cat => (
                    <option key={cat.code} value={cat.code}>{cat.code} - {cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">中类</label>
                <select
                  value={searchMidCategory}
                  onChange={(e) => { setSearchMidCategory(e.target.value); setSearchSubCategory(''); }}
                  disabled={!searchBigCategory}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100"
                >
                  <option value="">全部</option>
                  {getSearchMidCategories().map(cat => (
                    <option key={cat.code} value={cat.code}>{cat.code} - {cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">小类</label>
                <select
                  value={searchSubCategory}
                  onChange={(e) => setSearchSubCategory(e.target.value)}
                  disabled={!searchMidCategory}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100"
                >
                  <option value="">全部</option>
                  {getSearchSubCategories().map(cat => (
                    <option key={cat.code} value={cat.code}>{cat.code} - {cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-1 flex items-end">
                <button
                  onClick={() => { setCode(''); setName(''); setCategory('全部'); setSupplier(''); setLocation(''); setSearchBigCategory(''); setSearchMidCategory(''); setSearchSubCategory(''); setShowLowStock(false); setCurrentPage(1); }}
                  className="w-full h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-2"
                >
                  重置
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">物料库存列表</h3>
              <div className="flex items-center gap-2">
                {showLowStock && (
                  <button
                    onClick={handleLowStockClick}
                    className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <span>显示全部</span>
                  </button>
                )}
                {/* 编辑删除按钮 - 默认显示 */}
                {!batchEditMode && (
                  <>
                    <button
                      onClick={() => {
                        setBatchEditMode(true);
                      }}
                      className="h-9 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => { setBatchEditMode(true); setShowDeleteWarning(true); }}
                      className="h-9 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                    >
                      删除
                    </button>
                  </>
                )}

                {/* 选择模式下显示确认/取消按钮 */}
                {batchEditMode && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (selectedRows.length === 1) {
                          const material = warehouseMaterials.find(m => m.id === selectedRows[0]);
                          if (material) {
                            setSelectedMaterial(material);
                            setEditForm({
                              quantity: material.quantity,
                              minStock: material.minStock,
                              maxStock: material.maxStock,
                              price: material.price,
                              supplier: material.supplier,
                              location: material.location,
                              specification: material.specification,
                              barcode: material.barcode,
                              batchNo: material.batchNo,
                              productionDate: material.productionDate,
                              expiryDate: material.expiryDate,
                              lastUpdateTime: material.lastUpdateTime,
                              dataStatus: material.dataStatus
                            });
                            setShowEditModal(true);
                            setBatchEditMode(false);
                            setSelectedRows([]);
                          }
                        } else {
                          setShowBatchEditModal(true);
                        }
                      }}
                      className="h-9 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                      确认编辑
                    </button>
                    <button
                      onClick={() => { setShowBatchDeleteConfirm(true); }}
                      className="h-9 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                    >
                      确认删除
                    </button>
                    <button
                      onClick={() => { setBatchEditMode(false); setSelectedRows([]); }}
                      className="h-9 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                    >
                      取消
                    </button>
                  </div>
                )}

                {/* 导出按钮 - 默认显示 */}
                {!batchEditMode && (
                  <button onClick={handleExportClick} className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    导出
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: 'max-content' }}>
                <thead className="bg-gray-50">
                  <tr>
                    {(exportMode || batchEditMode) && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-12">
                      <input
                        type="checkbox"
                        checked={selectedRows.length === filteredMaterials.length && filteredMaterials.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </th>}
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">物料编号</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">物料名称</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">分类</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">规格型号</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">条形码</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">单位</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">库存数量</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">最低库存</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">最高库存</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">单价（元）</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">供应商</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">存放位置</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">批次号</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">生产日期</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">有效期至</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">最后更新时间</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">数据状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMaterials.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      {(exportMode || batchEditMode) && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(item.id)}
                            onChange={() => handleSelectRow(item.id)}
                            className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                        </td>
                      )}
                      <td
                        className="px-4 py-3 text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer underline"
                        onClick={() => { setSelectedMaterial(item); setShowDetailModal(true); }}
                      >
                        {item.code}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.specification}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.barcode}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.unit}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-medium ${item.quantity < item.minStock ? 'text-red-600' : 'text-gray-900'}`}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.minStock}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.maxStock}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.price.replace('元', '')}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.supplier}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.location}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.batchNo}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.productionDate}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.expiryDate}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.lastUpdateTime}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          item.dataStatus === '启用' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {item.dataStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(exportMode || batchEditMode) && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleSelectAll}
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      {selectedRows.length === filteredMaterials.length ? '全不选' : '全选'}
                    </button>
                    <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">每页</span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    className="px-2 py-1 border border-gray-200 rounded text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-sm text-gray-500">条</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">共 {filteredMaterials.length} 条</span>
                  <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm">{currentPage} / {Math.ceil(filteredMaterials.length / pageSize) || 1}</span>
                  <button onClick={() => setCurrentPage(Math.min(Math.ceil(filteredMaterials.length / pageSize), currentPage + 1))} disabled={currentPage >= Math.ceil(filteredMaterials.length / pageSize)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Material Inbound Tab */}
      {activeTab === 'inbound' && (
        <>
          {/* 编码规则生成器 */}
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold text-gray-900">物料编码生成</h3>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">资材编码规则：大类(2位) + 中类(2位) + 小类(2位) + 序号(3位)</span>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">大类</label>
                <select
                  value={codeGen.bigCategory}
                  onChange={(e) => handleCodeGenCategoryChange('bigCategory', e.target.value)}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="">请选择大类</option>
                  {bigCategories.map(cat => (
                    <option key={cat.code} value={cat.code}>{cat.code} - {cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">中类</label>
                <select
                  value={codeGen.midCategory}
                  onChange={(e) => handleCodeGenCategoryChange('midCategory', e.target.value)}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  disabled={!codeGen.bigCategory}
                >
                  <option value="">请选择中类</option>
                  {getCodeGenMidCategories().map(cat => (
                    <option key={cat.code} value={cat.code}>{cat.code} - {cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">小类</label>
                <select
                  value={codeGen.subCategory}
                  onChange={(e) => handleCodeGenCategoryChange('subCategory', e.target.value)}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  disabled={!codeGen.midCategory}
                >
                  <option value="">请选择小类</option>
                  {getCodeGenSubCategories().map(cat => (
                    <option key={cat.code} value={cat.code}>{cat.code} - {cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">生成编码</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={codeGen.generatedCode}
                    placeholder="点击生成"
                    className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50"
                    readOnly
                  />
                  <button
                    onClick={handleCodeGen}
                    disabled={!codeGen.subCategory}
                    className="px-3 h-10 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    生成
                  </button>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/code-rule')}
                className="px-4 h-9 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Hash className="w-4 h-4" />
                编码规则
              </button>
              <button
                onClick={handleVerifyCode}
                disabled={!codeGen.generatedCode}
                className="px-4 h-9 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <Search className="w-4 h-4" />
                验证重码
              </button>
              <button
                onClick={handleCopyCode}
                disabled={!codeGen.generatedCode}
                className="px-4 h-9 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                {copySuccess ? '已复制!' : '复制编码'}
              </button>
              <span className="text-xs text-gray-500">生成的编码可复制后用于新增物料</span>
            </div>

            {/* 提示信息 */}
            {codeGenError && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{codeGenError}</p>
              </div>
            )}
            {codeGenSuccess && !codeGenError && (
              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">{codeGenSuccess}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">物料入库记录</h3>
              <button
                onClick={() => setShowAddModal(true)}
                className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                新增入库
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-10"></th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">入库单号</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">入库日期</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">供应商</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">操作员</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">物料数量</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inboundRecords.slice((inboundPage - 1) * inboundPageSize, inboundPage * inboundPageSize).map((record) => (
                    <>
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleExpandInboundRow(record.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {expandedInboundRows.has(record.id) ? (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 underline whitespace-nowrap" onClick={() => toggleExpandInboundRow(record.id)}>
                          {record.code}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.inboundDate}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.supplier}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.operator}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.materials.length} 种物料</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            record.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {record.status === 'completed' ? '已完成' : '待审核'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setSelectedInboundRecord(record); setShowInboundDetailModal(true); }}
                              className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="查看">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setSelectedInboundRecord(record); setInboundEditForm({ supplier: record.supplier, operator: record.operator, inboundDate: record.inboundDate, status: record.status }); setShowInboundEditModal(true); }}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="编辑">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setSelectedInboundRecord(record); setShowInboundDeleteConfirm(true); }}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" title="删除">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedInboundRows.has(record.id) && (
                        <tr key={`${record.id}-expanded`} className="bg-white">
                          <td colSpan={8} className="px-4 py-3">
                            <div className="text-sm">
                              <div className="font-medium text-blue-800 mb-2">物料明细</div>
                              <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                                <thead className="bg-[#F2F6FA]">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">物料编码</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">物料名称</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">分类</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">规格型号</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">条形码</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">单位</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">入库数量</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">单价（元）</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">存放位置</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">批次号</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">生产日期</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">有效期至</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {record.materials.map((material, idx) => (
                                    <tr key={idx} className="hover:bg-[#F2F6FA]/50">
                                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.materialCode}</td>
                                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.materialName}</td>
                                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.category}</td>
                                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.specification}</td>
                                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.barcode}</td>
                                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.unit}</td>
                                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.quantity}</td>
                                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.price}</td>
                                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.location}</td>
                                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.batchNo}</td>
                                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.productionDate}</td>
                                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.expiryDate}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
            {/* 入库记录分页 */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">每页</span>
                <select
                  value={inboundPageSize}
                  onChange={(e) => { setInboundPageSize(Number(e.target.value)); setInboundPage(1); }}
                  className="px-2 py-1 border border-gray-200 rounded text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-gray-500">条</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  共 {inboundRecords.length} 条，第 {inboundPage} / {Math.ceil(inboundRecords.length / inboundPageSize) || 1} 页
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setInboundPage(1)}
                    disabled={inboundPage === 1}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
                    title="首页"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setInboundPage(Math.max(1, inboundPage - 1))}
                    disabled={inboundPage === 1}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setInboundPage(Math.min(Math.ceil(inboundRecords.length / inboundPageSize), inboundPage + 1))}
                    disabled={inboundPage >= Math.ceil(inboundRecords.length / inboundPageSize)}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setInboundPage(Math.ceil(inboundRecords.length / inboundPageSize) || 1)}
                    disabled={inboundPage >= Math.ceil(inboundRecords.length / inboundPageSize)}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
                    title="末页"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Inbound Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-emerald-600">
              <h3 className="text-lg font-semibold text-white">新增入库</h3>
              <button onClick={handleCloseModal} className="text-white hover:bg-emerald-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {/* 入库单号 */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">入库单号</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newInbound.orderCode}
                    onChange={(e) => setNewInbound({ ...newInbound, orderCode: e.target.value })}
                    placeholder="点击自动生成"
                    className="flex-1 h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500 bg-gray-50"
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={generateOrderCode}
                    className="px-3 h-8 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    自动生成
                  </button>
                </div>
              </div>

              {/* 物料编码和物料名称 */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">物料编码 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newInbound.materialCode}
                    onChange={(e) => {
                      setNewInbound({ ...newInbound, materialCode: e.target.value });
                      checkCodeDuplicate(e.target.value);
                    }}
                    placeholder="从编码生成器复制"
                    className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">物料名称 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newInbound.materialName}
                    onChange={(e) => handleMaterialNameChange(e.target.value)}
                    placeholder="请输入"
                    className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">分类</label>
                  <input
                    type="text"
                    value={newInbound.category}
                    onChange={(e) => setNewInbound({ ...newInbound, category: e.target.value })}
                    placeholder="请输入"
                    className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 规格型号、条形码、单位 */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">规格型号</label>
                  <input
                    type="text"
                    value={newInbound.specification}
                    onChange={(e) => setNewInbound({ ...newInbound, specification: e.target.value })}
                    placeholder="如：25kg/袋"
                    className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">条形码</label>
                  <input
                    type="text"
                    value={newInbound.barcode}
                    onChange={(e) => setNewInbound({ ...newInbound, barcode: e.target.value })}
                    placeholder="请输入"
                    className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">单位</label>
                  <select
                    value={newInbound.unit}
                    onChange={(e) => setNewInbound({ ...newInbound, unit: e.target.value })}
                    className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="袋">袋</option>
                    <option value="箱">箱</option>
                    <option value="公斤">公斤</option>
                    <option value="克">克</option>
                    <option value="吨">吨</option>
                    <option value="升">升</option>
                    <option value="毫升">毫升</option>
                    <option value="米">米</option>
                    <option value="厘米">厘米</option>
                    <option value="㎡">㎡</option>
                    <option value="亩">亩</option>
                    <option value="个">个</option>
                    <option value="台">台</option>
                    <option value="套">套</option>
                    <option value="卷">卷</option>
                    <option value="把">把</option>
                    <option value="双">双</option>
                    <option value="件">件</option>
                    <option value="瓶">瓶</option>
                    <option value="桶">桶</option>
                    <option value="盒">盒</option>
                    <option value="支">支</option>
                    <option value="棵">棵</option>
                    <option value="株">株</option>
                    <option value="盘">盘</option>
                    <option value="篮">篮</option>
                    <option value="筐">筐</option>
                  </select>
                </div>
              </div>

              {/* 入库数量、单价（元）、供应商 */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">入库数量 <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={newInbound.quantity}
                    onChange={(e) => setNewInbound({ ...newInbound, quantity: e.target.value })}
                    placeholder="请输入"
                    className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">单价（元）</label>
                  <input
                    type="text"
                    value={newInbound.price}
                    onChange={(e) => setNewInbound({ ...newInbound, price: e.target.value })}
                    placeholder="请输入"
                    className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">供应商</label>
                  <input
                    type="text"
                    value={newInbound.supplier}
                    onChange={(e) => setNewInbound({ ...newInbound, supplier: e.target.value })}
                    placeholder="请输入"
                    className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 存放位置、批次号 */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">存放位置</label>
                  <input
                    type="text"
                    value={newInbound.location}
                    onChange={(e) => setNewInbound({ ...newInbound, location: e.target.value })}
                    placeholder="如：A区-01"
                    className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">批次号</label>
                  <input
                    type="text"
                    value={newInbound.batchNo}
                    onChange={(e) => setNewInbound({ ...newInbound, batchNo: e.target.value })}
                    placeholder="如：PC20260301"
                    className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">生产日期</label>
                  <input
                    type="date"
                    value={newInbound.productionDate}
                    onChange={(e) => setNewInbound({ ...newInbound, productionDate: e.target.value })}
                    className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 有效期至、入库日期、操作员 */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">有效期至</label>
                  <input
                    type="date"
                    value={newInbound.expiryDate}
                    onChange={(e) => setNewInbound({ ...newInbound, expiryDate: e.target.value })}
                    className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">入库日期</label>
                  <input
                    type="date"
                    value={newInbound.inboundDate}
                    onChange={(e) => setNewInbound({ ...newInbound, inboundDate: e.target.value })}
                    className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">操作员</label>
                  <input
                    type="text"
                    value={newInbound.operator}
                    onChange={(e) => setNewInbound({ ...newInbound, operator: e.target.value })}
                    placeholder="请输入"
                    className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 备注 */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">备注</label>
                <textarea
                  value={newInbound.remarks}
                  onChange={(e) => setNewInbound({ ...newInbound, remarks: e.target.value })}
                  placeholder="请输入备注"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={handleSaveInbound}
                disabled={!!codeError || !!nameError || !newInbound.materialCode || !newInbound.materialName || !newInbound.quantity}
                className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导出格式选择弹窗 */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">选择导出格式</h2>
              <button onClick={() => setShowExportModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-4">已选择 {selectedRows.length} 条数据</p>
              <div className="space-y-3">
                {[
                  { value: 'excel', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
                  { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
                  { value: 'word', label: 'Word (.docx)', desc: '适用于文档编辑和分享' },
                ].map((format) => (
                  <label
                    key={format.value}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                      exportFormat === format.value
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="exportFormat"
                      value={format.value}
                      checked={exportFormat === format.value}
                      onChange={(e) => setExportFormat(e.target.value)}
                      className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                    />
                    <div className="ml-3">
                      <span className="block text-sm font-medium text-gray-900">{format.label}</span>
                      <span className="block text-xs text-gray-500">{format.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
              <button
                onClick={handleDoExport}
                disabled={selectedRows.length === 0}
                className="w-full mt-6 h-10 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                导出
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Detail Modal */}
      {showDetailModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-emerald-600">
              <h3 className="text-lg font-semibold text-white">物料详情查看</h3>
              <button onClick={() => setShowDetailModal(false)} className="text-white hover:bg-emerald-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {/* 基本信息 - 第一行显示条形码 */}
              <div className="mb-6">
                <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  基本信息
                </h4>
                <div className="bg-emerald-50 rounded-lg p-4 mb-4 border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-emerald-600 block font-medium">条形码</span>
                      <span className="text-2xl font-mono font-bold text-emerald-700">{selectedMaterial.barcode}</span>
                    </div>
                    <Barcode className="w-12 h-12 text-emerald-600" />
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block">物料编码</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.code}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">物料名称</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">物料分类</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.category}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">规格型号</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.specification}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">单位</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.unit}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">当前库存</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.quantity} {selectedMaterial.unit}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">最低库存</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.minStock} {selectedMaterial.unit}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">最高库存</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.maxStock} {selectedMaterial.unit}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">单价</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.price}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">供应商</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.supplier}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">存放位置</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.location}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">数据状态</span>
                    <span className={`text-sm font-medium ${selectedMaterial.dataStatus === '启用' ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedMaterial.dataStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* 批次信息 */}
              <div className="mb-6">
                <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  批次信息
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block">批次号</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.batchNo}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">生产日期</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.productionDate}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">有效期至</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.expiryDate}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">最后更新时间</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.lastUpdateTime}</span>
                  </div>
                </div>
              </div>

              {/* 库存状态 */}
              <div className="mb-6">
                <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  库存状态
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block">仓库区域</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.location.split('-')[0]}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">货架位置</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.location.split('-')[1] || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">库存状态</span>
                    <span className={`text-sm font-medium ${selectedMaterial.quantity <= selectedMaterial.minStock ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedMaterial.quantity <= selectedMaterial.minStock ? '库存不足' : '库存充足'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">库存预警</span>
                    <span className={`text-sm font-medium ${selectedMaterial.quantity <= selectedMaterial.minStock ? 'text-red-600' : 'text-gray-500'}`}>
                      {selectedMaterial.quantity <= selectedMaterial.minStock ? '需要补货' : '正常'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 入库记录 */}
              <div>
                <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  入库记录
                </h4>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">入库单号</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">入库日期</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">入库数量</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">供应商</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">操作人</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {inboundRecords.filter(r => r.materialCode === selectedMaterial.code).length > 0 ? (
                        inboundRecords.filter(r => r.materialCode === selectedMaterial.code).slice(0, 5).map((record, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">{record.code}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{record.date}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{record.quantity}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{record.supplier}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{record.operator}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                            暂无入库记录
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl shadow-xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-600 flex-shrink-0">
              <h3 className="text-lg font-semibold text-white">编辑物料库存</h3>
              <button onClick={() => setShowEditModal(false)} className="text-white hover:bg-blue-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {/* 条形码突出显示 */}
              <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-blue-600 block font-medium">条形码</span>
                    <span className="text-2xl font-mono font-bold text-blue-700">{selectedMaterial.barcode}</span>
                  </div>
                  <Barcode className="w-12 h-12 text-blue-600" />
                </div>
              </div>
              {/* 基本信息展示 */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block">物料编码</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.code}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">物料名称</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">物料分类</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.category}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">规格型号</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.specification}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">条形码</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.barcode}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">单位</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.unit}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">当前库存</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.quantity} {selectedMaterial.unit}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">最低库存</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.minStock} {selectedMaterial.unit}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">最高库存</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.maxStock} {selectedMaterial.unit}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">单价</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.price}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">供应商</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.supplier}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">存放位置</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.location}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">批次号</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.batchNo}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">生产日期</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.productionDate}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">有效期至</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.expiryDate}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">最后更新时间</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMaterial.lastUpdateTime}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">数据状态</span>
                    <span className={`text-sm font-medium ${selectedMaterial.dataStatus === '启用' ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedMaterial.dataStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* 编辑表单 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">库存数量 <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最低库存 <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={editForm.minStock}
                    onChange={(e) => setEditForm({ ...editForm, minStock: Number(e.target.value) })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最高库存</label>
                  <input
                    type="number"
                    value={editForm.maxStock}
                    onChange={(e) => setEditForm({ ...editForm, maxStock: Number(e.target.value) })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">单价（元） <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    placeholder="如：30"
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
                  <input
                    type="text"
                    value={editForm.supplier}
                    onChange={(e) => setEditForm({ ...editForm, supplier: e.target.value })}
                    placeholder="如：金种子业公司"
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">存放位置 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    placeholder="如：A区-01"
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">规格型号</label>
                  <input
                    type="text"
                    value={editForm.specification}
                    onChange={(e) => setEditForm({ ...editForm, specification: e.target.value })}
                    placeholder="如：25kg/袋"
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">条形码</label>
                  <input
                    type="text"
                    value={editForm.barcode}
                    onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })}
                    placeholder="如：6932456789012"
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">批次号</label>
                  <input
                    type="text"
                    value={editForm.batchNo}
                    onChange={(e) => setEditForm({ ...editForm, batchNo: e.target.value })}
                    placeholder="如：PC20260301"
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">生产日期</label>
                  <input
                    type="date"
                    value={editForm.productionDate}
                    onChange={(e) => setEditForm({ ...editForm, productionDate: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">有效期至</label>
                  <input
                    type="date"
                    value={editForm.expiryDate}
                    onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">数据状态</label>
                  <select
                    value={editForm.dataStatus}
                    onChange={(e) => setEditForm({ ...editForm, dataStatus: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="启用">启用</option>
                    <option value="停用">停用</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setShowEditModal(false); }}
                  className="flex-1 h-10 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => setShowEditConfirm(true)}
                  className="flex-1 h-10 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Confirm Modal */}
      {showEditConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-amber-500">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                数据一致性风险提示
              </h3>
              <button onClick={() => setShowEditConfirm(false)} className="text-white hover:bg-amber-600 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900">修改库存信息可能造成数据错乱</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    您正在修改以下信息：库存数量、最低库存、最高库存、单价、存放位置、规格型号、条形码、批次号、生产日期、有效期至、数据状态。这些修改将影响之前已使用的历史数据，可能导致数据不一致。
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <ul className="text-sm text-gray-600 space-y-1">
                  {editForm.quantity !== selectedMaterial.quantity && (
                    <li>• 库存数量：{selectedMaterial.quantity} → {editForm.quantity}</li>
                  )}
                  {editForm.minStock !== selectedMaterial.minStock && (
                    <li>• 最低库存：{selectedMaterial.minStock} → {editForm.minStock}</li>
                  )}
                  {editForm.maxStock !== selectedMaterial.maxStock && (
                    <li>• 最高库存：{selectedMaterial.maxStock} → {editForm.maxStock}</li>
                  )}
                  {editForm.price !== selectedMaterial.price && (
                    <li>• 单价：{selectedMaterial.price} → {editForm.price}</li>
                  )}
                  {editForm.location !== selectedMaterial.location && (
                    <li>• 存放位置：{selectedMaterial.location} → {editForm.location}</li>
                  )}
                  {editForm.specification !== selectedMaterial.specification && (
                    <li>• 规格型号：{selectedMaterial.specification} → {editForm.specification}</li>
                  )}
                  {editForm.barcode !== selectedMaterial.barcode && (
                    <li>• 条形码：{selectedMaterial.barcode} → {editForm.barcode}</li>
                  )}
                  {editForm.batchNo !== selectedMaterial.batchNo && (
                    <li>• 批次号：{selectedMaterial.batchNo} → {editForm.batchNo}</li>
                  )}
                  {editForm.productionDate !== selectedMaterial.productionDate && (
                    <li>• 生产日期：{selectedMaterial.productionDate} → {editForm.productionDate}</li>
                  )}
                  {editForm.expiryDate !== selectedMaterial.expiryDate && (
                    <li>• 有效期至：{selectedMaterial.expiryDate} → {editForm.expiryDate}</li>
                  )}
                  {editForm.dataStatus !== selectedMaterial.dataStatus && (
                    <li>• 数据状态：{selectedMaterial.dataStatus} → {editForm.dataStatus}</li>
                  )}
                </ul>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                请确认是否继续保存？建议在确认无影响后操作。
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditConfirm(false)}
                  className="flex-1 h-10 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    console.log('Saving material edit:', { id: selectedMaterial.id, ...editForm });
                    setShowEditConfirm(false);
                    setShowEditModal(false);
                    setShowDetailModal(false);
                  }}
                  className="flex-1 h-10 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                >
                  确认保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inbound Record Detail Modal */}
      {showInboundDetailModal && selectedInboundRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-emerald-600">
              <h3 className="text-lg font-semibold text-white">入库记录详情</h3>
              <button onClick={() => setShowInboundDetailModal(false)} className="text-white hover:bg-emerald-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <span className="text-xs text-gray-500 block">入库单号</span>
                    <span className="text-sm font-medium text-gray-900">{selectedInboundRecord.code}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">入库日期</span>
                    <span className="text-sm font-medium text-gray-900">{selectedInboundRecord.inboundDate}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">供应商</span>
                    <span className="text-sm font-medium text-gray-900">{selectedInboundRecord.supplier}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">操作员</span>
                    <span className="text-sm font-medium text-gray-900">{selectedInboundRecord.operator}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">物料种类</span>
                    <span className="text-sm font-medium text-gray-900">{selectedInboundRecord.materials?.length || 0} 种</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">状态</span>
                    <span className={`text-sm font-medium ${selectedInboundRecord.status === 'completed' ? 'text-green-600' : 'text-amber-600'}`}>
                      {selectedInboundRecord.status === 'completed' ? '已完成' : '待审核'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-sm">
                <div className="font-medium text-blue-800 mb-2">物料明细</div>
                <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-[#F2F6FA]">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">物料编码</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">物料名称</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">分类</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">规格型号</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">条形码</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">单位</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">数量</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">单价（元）</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">存放位置</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">批次号</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedInboundRecord.materials?.map((material: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#F2F6FA]/50">
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.materialCode}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.materialName}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.category}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.specification}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.barcode}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.unit}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.quantity}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.price}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.location}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.batchNo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inbound Record Edit Modal */}
      {showInboundEditModal && selectedInboundRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-600">
              <h3 className="text-lg font-semibold text-white">编辑入库记录</h3>
              <button onClick={() => setShowInboundEditModal(false)} className="text-white hover:bg-blue-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {/* 基本信息展示 */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <span className="text-xs text-gray-500 block">入库单号</span>
                    <span className="text-sm font-medium text-gray-900">{selectedInboundRecord.code}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">物料种类</span>
                    <span className="text-sm font-medium text-gray-900">{selectedInboundRecord.materials?.length || 0} 种</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">入库日期</span>
                    <span className="text-sm font-medium text-gray-900">{selectedInboundRecord.inboundDate}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">状态</span>
                    <span className={`text-sm font-medium ${selectedInboundRecord.status === 'completed' ? 'text-green-600' : 'text-amber-600'}`}>
                      {selectedInboundRecord.status === 'completed' ? '已完成' : '待审核'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 编辑表单 - 订单级别字段 */}
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">供应商</label>
                    <input
                      type="text"
                      value={inboundEditForm.supplier}
                      onChange={(e) => setInboundEditForm({ ...inboundEditForm, supplier: e.target.value })}
                      className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">操作员</label>
                    <input
                      type="text"
                      value={inboundEditForm.operator}
                      onChange={(e) => setInboundEditForm({ ...inboundEditForm, operator: e.target.value })}
                      className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">入库日期</label>
                    <input
                      type="date"
                      value={inboundEditForm.inboundDate}
                      onChange={(e) => setInboundEditForm({ ...inboundEditForm, inboundDate: e.target.value })}
                      className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">状态</label>
                    <select
                      value={inboundEditForm.status}
                      onChange={(e) => setInboundEditForm({ ...inboundEditForm, status: e.target.value })}
                      className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="pending">待审核</option>
                      <option value="completed">已完成</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="font-medium text-blue-800 mb-2">物料明细（不可编辑）</div>
                  <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-[#F2F6FA]">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">物料编码</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">物料名称</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">数量</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800 whitespace-nowrap">单位</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedInboundRecord.materials?.map((material: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#F2F6FA]/50">
                          <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.materialCode}</td>
                          <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.materialName}</td>
                          <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.quantity}</td>
                          <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setShowInboundEditModal(false)}
                    className="flex-1 h-9 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => setShowInboundEditConfirm(true)}
                    className="flex-1 h-9 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inbound Record Edit Confirm Modal */}
      {showInboundEditConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-amber-500">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                数据一致性风险提示
              </h3>
              <button onClick={() => setShowInboundEditConfirm(false)} className="text-white hover:bg-amber-600 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900">修改入库记录可能造成数据错乱</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    您正在修改入库记录信息，这些修改将影响之前已使用的历史数据，可能导致数据不一致。
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <ul className="text-sm text-gray-600 space-y-1">
                  {inboundEditForm.materialName !== selectedInboundRecord.materialName && (
                    <li>• 物料名称：{selectedInboundRecord.materialName} → {inboundEditForm.materialName}</li>
                  )}
                  {inboundEditForm.quantity !== selectedInboundRecord.quantity && (
                    <li>• 入库数量：{selectedInboundRecord.quantity} → {inboundEditForm.quantity}</li>
                  )}
                  {inboundEditForm.supplier !== selectedInboundRecord.supplier && (
                    <li>• 供应商：{selectedInboundRecord.supplier} → {inboundEditForm.supplier}</li>
                  )}
                  {inboundEditForm.inboundDate !== selectedInboundRecord.inboundDate && (
                    <li>• 入库日期：{selectedInboundRecord.inboundDate} → {inboundEditForm.inboundDate}</li>
                  )}
                  {inboundEditForm.operator !== selectedInboundRecord.operator && (
                    <li>• 操作人：{selectedInboundRecord.operator} → {inboundEditForm.operator}</li>
                  )}
                  {inboundEditForm.status !== selectedInboundRecord.status && (
                    <li>• 状态：{selectedInboundRecord.status === 'completed' ? '已完成' : '待审核'} → {inboundEditForm.status === 'completed' ? '已完成' : '待审核'}</li>
                  )}
                </ul>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                请确认是否继续保存？建议在确认无影响后操作。
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowInboundEditConfirm(false)}
                  className="flex-1 h-10 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    console.log('Saving inbound record edit:', { id: selectedInboundRecord.id, ...inboundEditForm });
                    setShowInboundEditConfirm(false);
                    setShowInboundEditModal(false);
                    setShowInboundDetailModal(false);
                  }}
                  className="flex-1 h-10 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                >
                  确认保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Material Delete Confirm Modal */}
      {showMaterialDeleteConfirm && selectedMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-red-600">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                删除确认
              </h3>
              <button onClick={() => setShowMaterialDeleteConfirm(false)} className="text-white hover:bg-red-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900">警告：删除此物料将造成严重后果！</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    您正在删除物料：<strong>{selectedMaterial.name}</strong>（{selectedMaterial.code}）
                  </p>
                  <ul className="text-sm text-red-500 mt-2 space-y-1">
                    <li>• 此操作将删除所有相关的入库记录</li>
                    <li>• 历史数据将无法恢复</li>
                    <li>• 可能导致库存数据错乱</li>
                    <li>• 已使用的物料信息将无法追溯</li>
                  </ul>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                此操作不可撤销！请确认是否继续删除？
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowMaterialDeleteConfirm(false)}
                  className="flex-1 h-10 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    console.log('Deleting material:', selectedMaterial);
                    setShowMaterialDeleteConfirm(false);
                  }}
                  className="flex-1 h-10 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Warning Dialog */}
      {showEditWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">批量编辑警告</h3>
            </div>
            <div className="text-sm text-gray-600 space-y-2 mb-6">
              <p>编辑后可能存在以下问题：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>之前的历史记录将无法获取新的物料信息</li>
                <li>已生成的入库/出库单据数据可能不一致</li>
                <li>库存统计报表数据可能需要重新核算</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowEditWarning(false); setBatchEditMode(false); setSelectedRows([]); }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={() => { setShowEditWarning(false); }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Warning Dialog */}
      {showDeleteWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">批量删除警告</h3>
            </div>
            <div className="text-sm text-gray-600 space-y-2 mb-6">
              <p>删除后可能存在以下问题：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>所有选中的物料将被永久删除</li>
                <li>相关的入库记录也将被删除</li>
                <li>历史数据将无法恢复</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteWarning(false); setBatchEditMode(false); setSelectedRows([]); }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={() => { setShowDeleteWarning(false); }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Edit Modal */}
      {showBatchEditModal && (() => {
        const selectedMaterialsList = warehouseMaterials.filter(m => selectedRows.includes(m.id));
        const currentMaterialId = selectedRows[currentBatchEditIndex];
        const currentMaterial = selectedMaterialsList.find(m => m.id === currentMaterialId);
        const currentEditedData = batchEditedMaterials[currentMaterialId] || currentMaterial || {};
        const editedCount = Object.keys(batchEditedMaterials).length;

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-600 sticky top-0">
                <h3 className="text-lg font-semibold text-white">批量编辑物料</h3>
                <button onClick={() => { setShowBatchEditModal(false); setBatchEditedMaterials({}); setCurrentBatchEditIndex(0); }} className="text-white hover:bg-blue-700 p-1 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">已选择 <strong>{selectedRows.length}</strong> 个物料进行批量编辑，已编辑 <strong>{editedCount}</strong> 个</p>
                </div>

                {/* 物料选择下拉 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">选择物料</label>
                  <select
                    value={currentMaterialId || ''}
                    onChange={(e) => {
                      const idx = selectedRows.indexOf(Number(e.target.value));
                      setCurrentBatchEditIndex(idx >= 0 ? idx : 0);
                    }}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  >
                    {selectedMaterialsList.map((material, idx) => (
                      <option key={material.id} value={material.id}>
                        {material.name} ({material.code}) {batchEditedMaterials[material.id] ? '✓ 已编辑' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 编辑表单 */}
                <div className="space-y-3">
                  {/* 物料基本信息（只读） */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <div className="text-xs text-gray-500 mb-1">物料编号</div>
                      <div className="text-sm font-medium text-gray-900">{currentEditedData.code}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <div className="text-xs text-gray-500 mb-1">分类</div>
                      <div className="text-sm font-medium text-gray-900 truncate">{currentEditedData.category}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <div className="text-xs text-gray-500 mb-1">数据状态</div>
                      <select
                        value={currentEditedData.dataStatus || '启用'}
                        onChange={(e) => setBatchEditedMaterials({
                          ...batchEditedMaterials,
                          [currentMaterialId]: { ...currentEditedData, dataStatus: e.target.value }
                        })}
                        className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                      >
                        <option value="启用">启用</option>
                        <option value="停用">停用</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">物料名称</label>
                    <input
                      type="text"
                      value={currentEditedData.name || ''}
                      onChange={(e) => setBatchEditedMaterials({
                        ...batchEditedMaterials,
                        [currentMaterialId]: { ...currentEditedData, name: e.target.value }
                      })}
                      className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">库存数量</label>
                      <input
                        type="number"
                        value={currentEditedData.quantity ?? ''}
                        onChange={(e) => setBatchEditedMaterials({
                          ...batchEditedMaterials,
                          [currentMaterialId]: { ...currentEditedData, quantity: Number(e.target.value) }
                        })}
                        className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">最低库存</label>
                      <input
                        type="number"
                        value={currentEditedData.minStock ?? ''}
                        onChange={(e) => setBatchEditedMaterials({
                          ...batchEditedMaterials,
                          [currentMaterialId]: { ...currentEditedData, minStock: Number(e.target.value) }
                        })}
                        className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">最高库存</label>
                      <input
                        type="number"
                        value={currentEditedData.maxStock ?? ''}
                        onChange={(e) => setBatchEditedMaterials({
                          ...batchEditedMaterials,
                          [currentMaterialId]: { ...currentEditedData, maxStock: Number(e.target.value) }
                        })}
                        className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">单价（元）</label>
                      <input
                        type="text"
                        value={(currentEditedData.price || '').replace('元', '')}
                        onChange={(e) => setBatchEditedMaterials({
                          ...batchEditedMaterials,
                          [currentMaterialId]: { ...currentEditedData, price: e.target.value }
                        })}
                        className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">单位</label>
                      <input
                        type="text"
                        value={currentEditedData.unit || ''}
                        onChange={(e) => setBatchEditedMaterials({
                          ...batchEditedMaterials,
                          [currentMaterialId]: { ...currentEditedData, unit: e.target.value }
                        })}
                        className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">存放位置</label>
                      <input
                        type="text"
                        value={currentEditedData.location || ''}
                        onChange={(e) => setBatchEditedMaterials({
                          ...batchEditedMaterials,
                          [currentMaterialId]: { ...currentEditedData, location: e.target.value }
                        })}
                        className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">供应商</label>
                    <input
                      type="text"
                      value={currentEditedData.supplier || ''}
                      onChange={(e) => setBatchEditedMaterials({
                        ...batchEditedMaterials,
                        [currentMaterialId]: { ...currentEditedData, supplier: e.target.value }
                      })}
                      className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">规格型号</label>
                      <input
                        type="text"
                        value={currentEditedData.specification || ''}
                        onChange={(e) => setBatchEditedMaterials({
                          ...batchEditedMaterials,
                          [currentMaterialId]: { ...currentEditedData, specification: e.target.value }
                        })}
                        className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">条形码</label>
                      <input
                        type="text"
                        value={currentEditedData.barcode || ''}
                        onChange={(e) => setBatchEditedMaterials({
                          ...batchEditedMaterials,
                          [currentMaterialId]: { ...currentEditedData, barcode: e.target.value }
                        })}
                        className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">批次号</label>
                      <input
                        type="text"
                        value={currentEditedData.batchNo || ''}
                        onChange={(e) => setBatchEditedMaterials({
                          ...batchEditedMaterials,
                          [currentMaterialId]: { ...currentEditedData, batchNo: e.target.value }
                        })}
                        className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">生产日期</label>
                      <input
                        type="date"
                        value={currentEditedData.productionDate || ''}
                        onChange={(e) => setBatchEditedMaterials({
                          ...batchEditedMaterials,
                          [currentMaterialId]: { ...currentEditedData, productionDate: e.target.value }
                        })}
                        className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">有效期至</label>
                      <input
                        type="date"
                        value={currentEditedData.expiryDate || ''}
                        onChange={(e) => setBatchEditedMaterials({
                          ...batchEditedMaterials,
                          [currentMaterialId]: { ...currentEditedData, expiryDate: e.target.value }
                        })}
                        className="w-full h-8 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      const nextIndex = currentBatchEditIndex + 1;
                      if (nextIndex < selectedRows.length) {
                        setCurrentBatchEditIndex(nextIndex);
                      } else {
                        setCurrentBatchEditIndex(0);
                      }
                    }}
                    className="flex-1 h-10 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    确认 {currentBatchEditIndex + 1 < selectedRows.length ? '(下一个)' : '(已最后一个)'}
                  </button>
                  <button
                    onClick={() => {
                      console.log('Saving all batch edits:', batchEditedMaterials);
                      setShowBatchEditModal(false);
                      setBatchEditMode(false);
                      setSelectedRows([]);
                      setBatchEditedMaterials({});
                      setCurrentBatchEditIndex(0);
                    }}
                    className="flex-1 h-10 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    保存全部 ({editedCount} 个)
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Batch Delete Confirm Modal */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-red-600">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                批量删除确认
              </h3>
              <button onClick={() => setShowBatchDeleteConfirm(false)} className="text-white hover:bg-red-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900">警告：批量删除物料将造成严重后果！</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    您正在删除 <strong>{selectedRows.length}</strong> 项物料
                  </p>
                  <ul className="text-sm text-red-500 mt-2 space-y-1">
                    <li>• 此操作将删除所有选中的物料</li>
                    <li>• 相关入库记录也将被删除</li>
                    <li>• 历史数据将无法恢复</li>
                    <li>• 可能导致库存数据错乱</li>
                  </ul>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                此操作不可撤销！请确认是否继续删除？
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowBatchDeleteConfirm(false)}
                  className="flex-1 h-10 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    console.log('Batch deleting materials:', selectedRows);
                    setShowBatchDeleteConfirm(false);
                    setSelectedRows([]);
                  }}
                  className="flex-1 h-10 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inbound Record Delete Confirm Modal */}
      {showInboundDeleteConfirm && selectedInboundRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-red-600">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                删除确认
              </h3>
              <button onClick={() => setShowInboundDeleteConfirm(false)} className="text-white hover:bg-red-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900">警告：删除此入库记录将造成严重后果！</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    您正在删除入库记录：<strong>{selectedInboundRecord.code}</strong>（{selectedInboundRecord.materialName}）
                  </p>
                  <ul className="text-sm text-red-500 mt-2 space-y-1">
                    <li>• 此记录将从系统中永久删除</li>
                    <li>• 历史数据将无法恢复</li>
                    <li>• 可能导致库存统计数据不一致</li>
                    <li>• 物料追溯信息将不完整</li>
                  </ul>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                此操作不可撤销！请确认是否继续删除？
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowInboundDeleteConfirm(false)}
                  className="flex-1 h-10 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    console.log('Deleting inbound record:', selectedInboundRecord);
                    setShowInboundDeleteConfirm(false);
                  }}
                  className="flex-1 h-10 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
