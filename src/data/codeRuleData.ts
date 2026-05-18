/**
 * 编码规则数据
 * 编码规则配置 - 大类(2位字母) + 中类(2位数字) + 小类(2位数字) + 流水号(3位数字)
 */

export interface SubCategory {
  code: string;
  name: string;
}

export interface MidCategory {
  code: string;
  name: string;
  subCategories: SubCategory[];
}

export interface BigCategory {
  code: string;
  name: string;
  nameEn: string;
  midCategories: MidCategory[];
}

// 初始分类数据 — 7大类物料编码规则
export const initialCategories: BigCategory[] = [
  // 生产投入类 SP
  {
    code: 'SP',
    name: '生产投入类',
    nameEn: 'Production Inputs',
    midCategories: [
      {
        code: '01',
        name: '种质资源',
        subCategories: [
          { code: '01', name: '粮食作物种子' },
          { code: '02', name: '经济作物种子' },
          { code: '03', name: '蔬菜种子' },
          { code: '04', name: '蔬菜种苗' },
          { code: '05', name: '水果苗木种苗' },
          { code: '06', name: '水果苗木种子' },
          { code: '07', name: '花卉与观赏植物' },
          { code: '08', name: '食用菌菌种' },
          { code: '99', name: '其他种质资源' },
        ]
      },
      {
        code: '02',
        name: '肥料与土壤改良剂',
        subCategories: [
          { code: '01', name: '有机肥' },
          { code: '02', name: '化学肥料' },
          { code: '03', name: '水溶肥' },
          { code: '04', name: '叶面肥' },
          { code: '05', name: '微生物菌剂' },
          { code: '06', name: '土壤调理剂' },
          { code: '07', name: '育苗基质' },
          { code: '99', name: '其他类型' },
        ]
      },
      {
        code: '03',
        name: '农药与植保产品',
        subCategories: [
          { code: '01', name: '杀虫剂' },
          { code: '02', name: '杀菌剂' },
          { code: '03', name: '杀螨剂' },
          { code: '04', name: '除草剂' },
          { code: '05', name: '植物生长调节剂' },
          { code: '06', name: '物理防控用品' },
          { code: '07', name: '生物农药' },
          { code: '99', name: '其他类型' },
        ]
      },
    ]
  },
  // 设施与装备类 EQ
  {
    code: 'EQ',
    name: '设施与装备类',
    nameEn: 'Equipment & Facilities',
    midCategories: [
      {
        code: '01',
        name: '生产设施',
        subCategories: [
          { code: '01', name: '塑料薄膜' },
          { code: '02', name: '灌溉设备' },
          { code: '03', name: '通风设备' },
          { code: '04', name: '保温设备' },
          { code: '05', name: '降温设备' },
          { code: '06', name: '温室骨架' },
          { code: '99', name: '其他设施' },
        ]
      },
      {
        code: '02',
        name: '农机具',
        subCategories: [
          { code: '01', name: '耕作机械' },
          { code: '02', name: '播种机械' },
          { code: '03', name: '施肥机械' },
          { code: '04', name: '采收机械' },
          { code: '05', name: '搬运机械' },
          { code: '99', name: '其他机械' },
        ]
      },
      {
        code: '03',
        name: '包装设备',
        subCategories: [
          { code: '01', name: '包装材料' },
          { code: '02', name: '包装机械' },
          { code: '03', name: '标签设备' },
          { code: '99', name: '其他' },
        ]
      },
    ]
  },
  // 作业支持类 OP
  {
    code: 'OP',
    name: '作业支持类',
    nameEn: 'Operational Support',
    midCategories: [
      {
        code: '01',
        name: '劳保与防护用品',
        subCategories: [
          { code: '01', name: '手部防护' },
          { code: '02', name: '足部防护' },
          { code: '03', name: '身体防护' },
          { code: '04', name: '呼吸/眼部防护' },
          { code: '05', name: '防晒防暑用品' },
          { code: '99', name: '其他劳保防护类' },
        ]
      },
      {
        code: '02',
        name: '日常劳动工具',
        subCategories: [
          { code: '01', name: '手动农具' },
          { code: '02', name: '修剪工具' },
          { code: '03', name: '小型电动工具' },
          { code: '04', name: '清洁工具' },
          { code: '05', name: '小型运输车' },
          { code: '99', name: '其他劳动工具' },
        ]
      },
      {
        code: '03',
        name: '标识与记录用品',
        subCategories: [
          { code: '01', name: '田间标牌/标签' },
          { code: '02', name: '记录本、记号笔' },
          { code: '03', name: '二维码/RFID标签' },
          { code: '99', name: '其他标识记录用品' },
        ]
      },
    ]
  },
  // 采后处理与流通类 PH
  {
    code: 'PH',
    name: '采后处理与流通类',
    nameEn: 'Post-harvest & Logistics',
    midCategories: [
      {
        code: '01',
        name: '采收容器',
        subCategories: [
          { code: '01', name: '塑料周转箱' },
          { code: '02', name: '采摘篮/筐' },
          { code: '03', name: '吨袋/编织袋' },
          { code: '04', name: '包装材料' },
          { code: '05', name: '纸箱' },
          { code: '06', name: '泡沫网套/隔板' },
          { code: '07', name: '胶带、封口耗材' },
          { code: '08', name: '商品标签/追溯标签' },
          { code: '99', name: '其他采收材料' },
        ]
      },
      {
        code: '02',
        name: '冷链与仓储设备',
        subCategories: [
          { code: '01', name: '预冷库/冷藏库' },
          { code: '02', name: '冷藏运输设备' },
          { code: '03', name: '保温箱、冰袋' },
          { code: '99', name: '其他' },
        ]
      },
    ]
  },
  // 数字化与管理类 IT
  {
    code: 'IT',
    name: '数字化与管理类',
    nameEn: 'Digital & Management',
    midCategories: [
      {
        code: '01',
        name: '监测设备',
        subCategories: [
          { code: '01', name: '空气/土壤/光照等传感器' },
          { code: '02', name: '手持检测类设备' },
          { code: '03', name: '气象站' },
          { code: '04', name: '虫情测报灯' },
          { code: '05', name: '视频监控设备' },
          { code: '99', name: '其他检测相关设备' },
        ]
      },
      {
        code: '02',
        name: '控制设备',
        subCategories: [
          { code: '01', name: '环境参数感知设备' },
          { code: '02', name: '执行控制设备' },
          { code: '03', name: '人机交互与本地操作设备' },
          { code: '04', name: '通信与联网设备' },
          { code: '05', name: '电源与辅助控制设备' },
          { code: '99', name: '其他相关控制设备' },
        ]
      },
      {
        code: '03',
        name: '软件与服务',
        subCategories: [
          { code: '01', name: 'ERP模块许可' },
          { code: '02', name: '温室大棚控制系统web' },
          { code: '03', name: '温室大棚控制系统小程序' },
          { code: '04', name: '数据分析服务' },
          { code: '05', name: '产品检测服务' },
          { code: '99', name: '其他软件与服务' },
        ]
      },
    ]
  },
  // 能源与通用耗材 EC
  {
    code: 'EC',
    name: '能源与通用耗材',
    nameEn: 'Energy & Consumables',
    midCategories: [
      {
        code: '01',
        name: '能源类',
        subCategories: [
          { code: '01', name: '柴油/汽油' },
          { code: '02', name: '电力' },
          { code: '03', name: '太阳能板及配件' },
          { code: '99', name: '其他能源类' },
        ]
      },
      {
        code: '02',
        name: '通用耗材',
        subCategories: [
          { code: '01', name: '电线、电缆' },
          { code: '02', name: '扎带、螺丝、密封胶' },
          { code: '03', name: '电池' },
          { code: '04', name: '润滑油、润滑脂' },
          { code: '99', name: '其他耗材' },
        ]
      },
    ]
  },
  // 其他类 OT
  {
    code: 'OT',
    name: '其他类',
    nameEn: 'Others',
    midCategories: [
      {
        code: '01',
        name: '未分类资材',
        subCategories: [
          { code: '01', name: '其他未分类资材' },
        ]
      },
    ]
  },
];
