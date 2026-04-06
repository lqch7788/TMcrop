// 物料管理Mock数据
import { WarehouseMaterial, InboundRecord, CategoryConfig, BigCategory } from './types';

export const warehouseMaterials: WarehouseMaterial[] = [
  { id: 1, code: 'SP0101001', name: '水稻种子', category: '种质资源-粮食作物种子', unit: '袋', quantity: 200, minStock: 50, price: '30元', supplier: '金种子业公司', location: 'A区-01' },
  { id: 2, code: 'SP0102001', name: '棉花种子', category: '种质资源-经济作物种子', unit: '袋', quantity: 80, minStock: 30, price: '25元', supplier: '丰收种业', location: 'A区-02' },
  { id: 3, code: 'SP0103001', name: '番茄种子', category: '种质资源-蔬菜种子', unit: '袋', quantity: 100, minStock: 50, price: '25元', supplier: '鑫源农资公司', location: 'A区-03' },
  { id: 4, code: 'SP0201001', name: '商品有机肥', category: '肥料与土壤改良剂-有机肥', unit: '袋', quantity: 50, minStock: 100, price: '45元', supplier: '丰达化肥厂', location: 'B区-01' },
  { id: 5, code: 'SP0202001', name: '尿素', category: '肥料与土壤改良剂-化学肥料', unit: '袋', quantity: 150, minStock: 50, price: '80元', supplier: '丰达化肥厂', location: 'B区-02' },
  { id: 6, code: 'SP0301001', name: '吡虫啉', category: '农药与植保产品-杀虫剂', unit: '箱', quantity: 30, minStock: 20, price: '120元', supplier: '绿叶农业用品店', location: 'C区-01' },
  { id: 7, code: 'SP0302001', name: '多菌灵', category: '农药与植保产品-杀菌剂', unit: '箱', quantity: 20, minStock: 20, price: '150元', supplier: '绿叶农业用品店', location: 'C区-02' },
  { id: 8, code: 'EQ0103001', name: '电动喷雾机', category: '农业机械-植保机械', unit: '台', quantity: 10, minStock: 5, price: '280元', supplier: '农机设备公司', location: 'D区-01' },
  { id: 9, code: 'EQ0306001', name: '滴灌带', category: '灌溉与水肥系统-灌溉终端', unit: '卷', quantity: 500, minStock: 200, price: '25元', supplier: '节水灌溉设备厂', location: 'E区-01' },
  { id: 10, code: 'OP0102001', name: '劳保胶靴', category: '劳保与防护用品-足部防护', unit: '双', quantity: 40, minStock: 20, price: '35元', supplier: '劳保用品商店', location: 'F区-01' },
  { id: 11, code: 'OP0201001', name: '锄头', category: '日常劳动工具-手动农具', unit: '把', quantity: 25, minStock: 10, price: '18元', supplier: '五金工具店', location: 'F区-02' },
  { id: 12, code: 'PH0104001', name: '塑料袋', category: '采收容器-包装材料', unit: '卷', quantity: 200, minStock: 100, price: '15元', supplier: '包装材料公司', location: 'G区-01' },
  { id: 13, code: 'IT0101001', name: '土壤温湿度传感器', category: '监测设备-传感器', unit: '个', quantity: 20, minStock: 10, price: '150元', supplier: '智慧农业设备商', location: 'H区-01' },
];

export const inboundRecords: InboundRecord[] = [
  { id: 1, code: 'RK20260315-001', materialCode: 'SP0103001', materialName: '番茄种子', quantity: '100', unit: '袋', supplier: '鑫源农资公司', inboundDate: '2026-03-15', operator: '张伟民', status: 'completed' },
  { id: 2, code: 'RK20260314-002', materialCode: 'SP0201001', materialName: '商品有机肥', quantity: '50', unit: '袋', supplier: '丰达化肥厂', inboundDate: '2026-03-14', operator: '李明轩', status: 'completed' },
  { id: 3, code: 'RK20260313-003', materialCode: 'SP0302001', materialName: '多菌灵', quantity: '20', unit: '箱', supplier: '绿叶农业用品店', inboundDate: '2026-03-13', operator: '王建国', status: 'completed' },
  { id: 4, code: 'RK20260312-004', materialCode: 'SP0101001', materialName: '水稻种子', quantity: '200', unit: '袋', supplier: '金种子业公司', inboundDate: '2026-03-12', operator: '张伟民', status: 'completed' },
  { id: 5, code: 'RK20260311-005', materialCode: 'SP0102001', materialName: '棉花种子', quantity: '80', unit: '袋', supplier: '丰收种业', inboundDate: '2026-03-11', operator: '李明轩', status: 'completed' },
  { id: 6, code: 'RK20260310-006', materialCode: 'SP0202001', materialName: '尿素', quantity: '150', unit: '袋', supplier: '丰达化肥厂', inboundDate: '2026-03-10', operator: '王建国', status: 'completed' },
  { id: 7, code: 'RK20260309-007', materialCode: 'SP0301001', materialName: '吡虫啉', quantity: '30', unit: '箱', supplier: '绿叶农业用品店', inboundDate: '2026-03-09', operator: '张伟民', status: 'completed' },
  { id: 8, code: 'RK20260308-008', materialCode: 'EQ0103001', materialName: '电动喷雾机', quantity: '10', unit: '台', supplier: '农机设备公司', inboundDate: '2026-03-08', operator: '李明轩', status: 'completed' },
  { id: 9, code: 'RK20260307-009', materialCode: 'EQ0306001', materialName: '滴灌带', quantity: '500', unit: '卷', supplier: '节水灌溉设备厂', inboundDate: '2026-03-07', operator: '王建国', status: 'completed' },
  { id: 10, code: 'RK20260306-010', materialCode: 'OP0102001', materialName: '劳保胶靴', quantity: '40', unit: '双', supplier: '劳保用品商店', inboundDate: '2026-03-06', operator: '张伟民', status: 'completed' },
  { id: 11, code: 'RK20260305-011', materialCode: 'OP0201001', materialName: '锄头', quantity: '25', unit: '把', supplier: '五金工具店', inboundDate: '2026-03-05', operator: '李明轩', status: 'completed' },
  { id: 12, code: 'RK20260304-012', materialCode: 'PH0104001', materialName: '塑料袋', quantity: '200', unit: '卷', supplier: '包装材料公司', inboundDate: '2026-03-04', operator: '王建国', status: 'completed' },
  { id: 13, code: 'RK20260303-013', materialCode: 'IT0101001', materialName: '土壤温湿度传感器', quantity: '20', unit: '个', supplier: '智慧农业设备商', inboundDate: '2026-03-03', operator: '张伟民', status: 'completed' },
];

export const categoryConfig: CategoryConfig = {
  'SP': {
    name: '生产投入类',
    categories: {
      '01': {
        name: '种质资源',
        subCategories: {
          '01': { name: '粮食作物种子', prefix: 'SP0101' },
          '02': { name: '经济作物种子', prefix: 'SP0102' },
          '03': { name: '蔬菜种子', prefix: 'SP0103' },
          '04': { name: '蔬菜种苗', prefix: 'SP0104' },
          '05': { name: '水果苗木种苗', prefix: 'SP0105' },
          '06': { name: '水果苗木种子', prefix: 'SP0106' },
          '07': { name: '花卉与观赏植物', prefix: 'SP0107' },
          '08': { name: '食用菌菌种', prefix: 'SP0108' },
          '99': { name: '其他种质资源', prefix: 'SP0199' },
        },
      },
      '02': {
        name: '肥料与土壤改良剂',
        subCategories: {
          '01': { name: '有机肥', prefix: 'SP0201' },
          '02': { name: '化学肥料', prefix: 'SP0202' },
          '03': { name: '水溶肥', prefix: 'SP0203' },
          '04': { name: '叶面肥', prefix: 'SP0204' },
          '05': { name: '微生物菌剂', prefix: 'SP0205' },
          '06': { name: '土壤调理剂', prefix: 'SP0206' },
          '07': { name: '育苗基质', prefix: 'SP0207' },
          '99': { name: '其他类型', prefix: 'SP0299' },
        },
      },
      '03': {
        name: '农药与植保产品',
        subCategories: {
          '01': { name: '杀虫剂', prefix: 'SP0301' },
          '02': { name: '杀菌剂', prefix: 'SP0302' },
          '03': { name: '杀螨剂', prefix: 'SP0303' },
          '04': { name: '除草剂', prefix: 'SP0304' },
          '05': { name: '植物生长调节剂', prefix: 'SP0305' },
          '06': { name: '物理防控用品', prefix: 'SP0306' },
          '07': { name: '生物农药', prefix: 'SP0307' },
          '99': { name: '其他类型', prefix: 'SP0399' },
        },
      },
    },
  },
  'EQ': {
    name: '设施与装备类',
    categories: {
      '01': {
        name: '农业机械',
        subCategories: {
          '01': { name: '耕作机械', prefix: 'EQ0101' },
          '02': { name: '播种/移栽设备', prefix: 'EQ0102' },
          '03': { name: '植保机械', prefix: 'EQ0103' },
          '04': { name: '收获机械', prefix: 'EQ0104' },
          '05': { name: '初加工设备', prefix: 'EQ0105' },
          '99': { name: '其他相关机械', prefix: 'EQ0199' },
        },
      },
      '02': {
        name: '设施农业系统',
        subCategories: {
          '01': { name: '骨架结构材料', prefix: 'EQ0201' },
          '02': { name: '覆盖材料', prefix: 'EQ0202' },
          '03': { name: '通风降温设备', prefix: 'EQ0203' },
          '04': { name: '加温设备', prefix: 'EQ0204' },
          '05': { name: '补光系统', prefix: 'EQ0205' },
          '06': { name: '自动化控制设备', prefix: 'EQ0206' },
          '99': { name: '其他相关设施设备', prefix: 'EQ0299' },
        },
      },
      '03': {
        name: '灌溉与水肥系统',
        subCategories: {
          '01': { name: '水源与泵站', prefix: 'EQ0301' },
          '02': { name: '水肥一体机', prefix: 'EQ0302' },
          '03': { name: '输水管网', prefix: 'EQ0303' },
          '04': { name: '过滤系统', prefix: 'EQ0304' },
          '05': { name: '施肥装置', prefix: 'EQ0305' },
          '06': { name: '灌溉终端', prefix: 'EQ0306' },
          '99': { name: '其他相关灌溉系统设备', prefix: 'EQ0399' },
        },
      },
    },
  },
  'OP': {
    name: '作业支持类',
    categories: {
      '01': {
        name: '劳保与防护用品',
        subCategories: {
          '01': { name: '手部防护', prefix: 'OP0101' },
          '02': { name: '足部防护', prefix: 'OP0102' },
          '03': { name: '身体防护', prefix: 'OP0103' },
          '04': { name: '呼吸/眼部防护', prefix: 'OP0104' },
          '05': { name: '防晒防暑用品', prefix: 'OP0105' },
          '99': { name: '其他劳保防护类', prefix: 'OP0199' },
        },
      },
      '02': {
        name: '日常劳动工具',
        subCategories: {
          '01': { name: '手动农具', prefix: 'OP0201' },
          '02': { name: '修剪工具', prefix: 'OP0202' },
          '03': { name: '小型电动工具', prefix: 'OP0203' },
          '04': { name: '清洁工具', prefix: 'OP0204' },
          '05': { name: '小型运输车', prefix: 'OP0205' },
          '99': { name: '其他劳动工具', prefix: 'OP0299' },
        },
      },
      '03': {
        name: '标识与记录用品',
        subCategories: {
          '01': { name: '田间标牌/标签', prefix: 'OP0301' },
          '02': { name: '记录本、记号笔', prefix: 'OP0302' },
          '03': { name: '二维码/RFID标签', prefix: 'OP0303' },
          '99': { name: '其他标识记录用品', prefix: 'OP0399' },
        },
      },
    },
  },
  'PH': {
    name: '采后处理与流通类',
    categories: {
      '01': {
        name: '采收容器',
        subCategories: {
          '01': { name: '塑料周转箱', prefix: 'PH0101' },
          '02': { name: '采摘篮/筐', prefix: 'PH0102' },
          '03': { name: '吨袋/编织袋', prefix: 'PH0103' },
          '04': { name: '包装材料', prefix: 'PH0104' },
          '05': { name: '纸箱', prefix: 'PH0105' },
          '06': { name: '泡沫网套/隔板', prefix: 'PH0106' },
          '07': { name: '胶带、封口耗材', prefix: 'PH0107' },
          '08': { name: '商品标签/追溯标签', prefix: 'PH0108' },
          '99': { name: '其他采收材料', prefix: 'PH0199' },
        },
      },
      '02': {
        name: '冷链与仓储设备',
        subCategories: {
          '01': { name: '预冷库/冷藏库', prefix: 'PH0201' },
          '02': { name: '冷藏运输设备', prefix: 'PH0202' },
          '03': { name: '保温箱、冰袋', prefix: 'PH0203' },
          '99': { name: '其他', prefix: 'PH0299' },
        },
      },
    },
  },
  'IT': {
    name: '数字化与管理类',
    categories: {
      '01': {
        name: '监测设备',
        subCategories: {
          '01': { name: '空气/土壤/光照等传感器', prefix: 'IT0101' },
          '02': { name: '手持检测类设备', prefix: 'IT0102' },
          '03': { name: '气象站', prefix: 'IT0103' },
          '04': { name: '虫情测报灯', prefix: 'IT0104' },
          '05': { name: '视频监控设备', prefix: 'IT0105' },
          '99': { name: '其他检测相关设备', prefix: 'IT0199' },
        },
      },
      '02': {
        name: '控制设备',
        subCategories: {
          '01': { name: '环境参数感知设备', prefix: 'IT0201' },
          '02': { name: '执行控制设备', prefix: 'IT0202' },
          '03': { name: '人机交互与本地操作设备', prefix: 'IT0203' },
          '04': { name: '通信与联网设备', prefix: 'IT0204' },
          '05': { name: '电源与辅助控制设备', prefix: 'IT0205' },
          '99': { name: '其他相关控制设备', prefix: 'IT0299' },
        },
      },
      '03': {
        name: '软件与服务',
        subCategories: {
          '01': { name: 'ERP模块许可', prefix: 'IT0301' },
          '02': { name: '温室大棚控制系统web', prefix: 'IT0302' },
          '03': { name: '温室大棚控制系统小程序', prefix: 'IT0303' },
          '04': { name: '数据分析服务', prefix: 'IT0304' },
          '05': { name: '产品检测服务', prefix: 'IT0305' },
          '99': { name: '其他软件与服务', prefix: 'IT0399' },
        },
      },
    },
  },
  'EC': {
    name: '能源与通用耗材',
    categories: {
      '01': {
        name: '能源类',
        subCategories: {
          '01': { name: '柴油/汽油', prefix: 'EC0101' },
          '02': { name: '电力', prefix: 'EC0102' },
          '03': { name: '太阳能板及配件', prefix: 'EC0103' },
          '99': { name: '其他能源类', prefix: 'EC0199' },
        },
      },
      '02': {
        name: '通用耗材',
        subCategories: {
          '01': { name: '电线、电缆', prefix: 'EC0201' },
          '02': { name: '扎带、螺丝、密封胶', prefix: 'EC0202' },
          '03': { name: '电池', prefix: 'EC0203' },
          '04': { name: '润滑油、润滑脂', prefix: 'EC0204' },
          '99': { name: '其他耗材', prefix: 'EC0299' },
        },
      },
    },
  },
  'OT': {
    name: '其他类',
    categories: {
      '01': {
        name: '未分类资材',
        subCategories: {
          '01': { name: '其他未分类资材', prefix: 'OT0101' },
        },
      },
    },
  },
};

export const bigCategories: BigCategory[] = [
  { code: 'SP', name: '生产投入类' },
  { code: 'EQ', name: '设施与装备类' },
  { code: 'OP', name: '作业支持类' },
  { code: 'PH', name: '采后处理与流通类' },
  { code: 'IT', name: '数字化与管理类' },
  { code: 'EC', name: '能源与通用耗材' },
  { code: 'OT', name: '其他类' },
];

export const unitOptions = [
  '袋', '箱', '公斤', '克', '吨', '升', '毫升', '米', '厘米',
  '㎡', '亩', '个', '台', '套', '卷', '把', '双', '件', '瓶',
  '桶', '盒', '支', '棵', '株', '盘', '篮', '筐',
];
