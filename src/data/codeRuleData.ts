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

// 初始分类数据
export const initialCategories: BigCategory[] = [
  // 生产投入类 SP
  {
    code: 'SP',
    name: '生产投入类',
    nameEn: 'Seed & Planting Inputs',
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
  // 产出品类 OP
  {
    code: 'OP',
    name: '产出品类',
    nameEn: 'Output Products',
    midCategories: [
      {
        code: '01',
        name: '作物产品',
        subCategories: [
          { code: '01', name: '粮食作物' },
          { code: '02', name: '经济作物' },
          { code: '03', name: '蔬菜产品' },
          { code: '04', name: '水果产品' },
          { code: '05', name: '花卉产品' },
          { code: '99', name: '其他产品' },
        ]
      },
      {
        code: '02',
        name: '加工品',
        subCategories: [
          { code: '01', name: '初加工产品' },
          { code: '02', name: '深加工产品' },
          { code: '99', name: '其他加工品' },
        ]
      },
    ]
  },
];
