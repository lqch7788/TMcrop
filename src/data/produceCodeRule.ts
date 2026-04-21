/**
 * 农产品编码规则配置
 *
 * 编码结构：大类代码(2位) + 类型代码(2位) + 品种代码(2位) + 流水号(3位)
 * 总长度：9位
 *
 * 示例：PD01010001
 * - PD: 果蔬产品类
 * - 01: 叶菜类
 * - 01: 菠菜
 * - 001: 第1个产品
 */

// 大类
export type ProduceCategoryCode = 'PD' | 'FR' | 'GR' | 'FL' | 'HB' | 'MG' | 'OT';

export interface ProduceCategory {
  code: ProduceCategoryCode;
  name: string;
  nameEn: string;
  description: string;
}

// 中类（产品类型）
export interface ProduceType {
  code: string;
  name: string;
  subCategories: ProduceSubType[];
}

// 小类（产品品种）
export interface ProduceSubType {
  code: string;
  name: string;
}

// 农产品大类配置
export const produceCategories: ProduceCategory[] = [
  {
    code: 'PD',
    name: '果蔬产品类',
    nameEn: 'Produce & Vegetables',
    description: '新鲜蔬菜和水果产品',
  },
  {
    code: 'FR',
    name: '水果类',
    nameEn: 'Fruits',
    description: '各类水果产品',
  },
  {
    code: 'GR',
    name: '粮食类',
    nameEn: 'Grains & Cereals',
    description: '粮食作物及加工品',
  },
  {
    code: 'FL',
    name: '花卉类',
    nameEn: 'Flowers & Plants',
    description: '花卉及观赏植物',
  },
  {
    code: 'HB',
    name: '药材类',
    nameEn: 'Herbs & Medicine',
    description: '中药材和药用植物',
  },
  {
    code: 'MG',
    name: '食用菌类',
    nameEn: 'Mushrooms',
    description: '食用菌及菌菇类产品',
  },
  {
    code: 'OT',
    name: '其他类',
    nameEn: 'Others',
    description: '其他农产品',
  },
];

// 果蔬产品类（PD）类型配置
export const produceTypesPD: ProduceType[] = [
  {
    code: '01',
    name: '叶菜类',
    subCategories: [
      { code: '01', name: '菠菜' },
      { code: '02', name: '生菜' },
      { code: '03', name: '油麦菜' },
      { code: '04', name: '小白菜' },
      { code: '05', name: '大白菜' },
      { code: '06', name: '甘蓝' },
      { code: '07', name: '娃娃菜' },
      { code: '08', name: '茼蒿' },
      { code: '09', name: '香菜' },
      { code: '10', name: '韭菜' },
      { code: '11', name: '芹菜' },
      { code: '12', name: '莴笋' },
      { code: '99', name: '其他叶菜' },
    ],
  },
  {
    code: '02',
    name: '瓜果类',
    subCategories: [
      { code: '01', name: '黄瓜' },
      { code: '02', name: '丝瓜' },
      { code: '03', name: '苦瓜' },
      { code: '04', name: '冬瓜' },
      { code: '05', name: '南瓜' },
      { code: '06', name: '西瓜' },
      { code: '07', name: '甜瓜' },
      { code: '08', name: '哈密瓜' },
      { code: '99', name: '其他瓜类' },
    ],
  },
  {
    code: '03',
    name: '茄果类',
    subCategories: [
      { code: '01', name: '番茄' },
      { code: '02', name: '小番茄' },
      { code: '03', name: '茄子' },
      { code: '04', name: '辣椒' },
      { code: '05', name: '螺丝椒' },
      { code: '06', name: '彩椒' },
      { code: '07', name: '朝天椒' },
      { code: '99', name: '其他茄果' },
    ],
  },
  {
    code: '04',
    name: '根茎类',
    subCategories: [
      { code: '01', name: '萝卜' },
      { code: '02', name: '胡萝卜' },
      { code: '03', name: '土豆' },
      { code: '04', name: '红薯' },
      { code: '05', name: '山药' },
      { code: '06', name: '莲藕' },
      { code: '07', name: '荸荠' },
      { code: '08', name: '芋头' },
      { code: '99', name: '其他根茎' },
    ],
  },
  {
    code: '05',
    name: '豆类',
    subCategories: [
      { code: '01', name: '豇豆' },
      { code: '02', name: '四季豆' },
      { code: '03', name: '毛豆' },
      { code: '04', name: '蚕豆' },
      { code: '05', name: '豌豆' },
      { code: '06', name: '扁豆' },
      { code: '99', name: '其他豆类' },
    ],
  },
  {
    code: '06',
    name: '葱蒜类',
    subCategories: [
      { code: '01', name: '大葱' },
      { code: '02', name: '小葱' },
      { code: '03', name: '洋葱' },
      { code: '04', name: '大蒜' },
      { code: '05', name: '生姜' },
      { code: '06', name: '韭菜花' },
      { code: '99', name: '其他葱蒜' },
    ],
  },
  {
    code: '07',
    name: '食用菌类',
    subCategories: [
      { code: '01', name: '香菇' },
      { code: '02', name: '金针菇' },
      { code: '03', name: '平菇' },
      { code: '04', name: '杏鲍菇' },
      { code: '05', name: '白玉菇' },
      { code: '06', name: '蟹味菇' },
      { code: '07', name: '木耳' },
      { code: '08', name: '银耳' },
      { code: '09', name: '茶树菇' },
      { code: '10', name: '虫草花' },
      { code: '99', name: '其他食用菌' },
    ],
  },
];

// 水果类（FR）类型配置
export const produceTypesFR: ProduceType[] = [
  {
    code: '01',
    name: '浆果类',
    subCategories: [
      { code: '01', name: '草莓' },
      { code: '02', name: '蓝莓' },
      { code: '03', name: '树莓' },
      { code: '04', name: '葡萄' },
      { code: '05', name: '猕猴桃' },
      { code: '06', name: '火龙果' },
      { code: '99', name: '其他浆果' },
    ],
  },
  {
    code: '02',
    name: '核果类',
    subCategories: [
      { code: '01', name: '桃子' },
      { code: '02', name: '李子' },
      { code: '03', name: '杏子' },
      { code: '04', name: '梅子' },
      { code: '05', name: '樱桃' },
      { code: '99', name: '其他核果' },
    ],
  },
  {
    code: '03',
    name: '仁果类',
    subCategories: [
      { code: '01', name: '苹果' },
      { code: '02', name: '梨' },
      { code: '03', name: '山楂' },
      { code: '04', name: '枇杷' },
      { code: '99', name: '其他仁果' },
    ],
  },
  {
    code: '04',
    name: '柑橘类',
    subCategories: [
      { code: '01', name: '橙子' },
      { code: '02', name: '柑橘' },
      { code: '03', name: '柚子' },
      { code: '04', name: '柠檬' },
      { code: '05', name: '金橘' },
      { code: '99', name: '其他柑橘' },
    ],
  },
  {
    code: '05',
    name: '热带水果',
    subCategories: [
      { code: '01', name: '香蕉' },
      { code: '02', name: '菠萝' },
      { code: '03', name: '芒果' },
      { code: '04', name: '椰子' },
      { code: '05', name: '荔枝' },
      { code: '06', name: '龙眼' },
      { code: '07', name: '榴莲' },
      { code: '08', name: '菠萝蜜' },
      { code: '99', name: '其他热带水果' },
    ],
  },
  {
    code: '06',
    name: '瓜类水果',
    subCategories: [
      { code: '01', name: '西瓜' },
      { code: '02', name: '哈密瓜' },
      { code: '03', name: '甜瓜' },
      { code: '04', name: '木瓜' },
      { code: '99', name: '其他瓜类水果' },
    ],
  },
];

// 粮食类（GR）类型配置
export const produceTypesGR: ProduceType[] = [
  {
    code: '01',
    name: '稻谷类',
    subCategories: [
      { code: '01', name: '水稻' },
      { code: '02', name: '糯米' },
      { code: '03', name: '粳米' },
      { code: '04', name: '籼米' },
      { code: '99', name: '其他稻谷' },
    ],
  },
  {
    code: '02',
    name: '小麦类',
    subCategories: [
      { code: '01', name: '小麦' },
      { code: '02', name: '面粉' },
      { code: '03', name: '全麦粉' },
      { code: '99', name: '其他小麦制品' },
    ],
  },
  {
    code: '03',
    name: '玉米类',
    subCategories: [
      { code: '01', name: '玉米' },
      { code: '02', name: '糯玉米' },
      { code: '03', name: '甜玉米' },
      { code: '04', name: '爆裂玉米' },
      { code: '99', name: '其他玉米' },
    ],
  },
  {
    code: '04',
    name: '豆类粮食',
    subCategories: [
      { code: '01', name: '黄豆' },
      { code: '02', name: '黑豆' },
      { code: '03', name: '绿豆' },
      { code: '04', name: '红豆' },
      { code: '05', name: '芸豆' },
      { code: '06', name: '蚕豆' },
      { code: '99', name: '其他豆类' },
    ],
  },
  {
    code: '05',
    name: '薯类粮食',
    subCategories: [
      { code: '01', name: '红薯' },
      { code: '02', name: '土豆' },
      { code: '03', name: '芋头' },
      { code: '04', name: '山药' },
      { code: '99', name: '其他薯类' },
    ],
  },
];

// 花卉类（FL）类型配置
export const produceTypesFL: ProduceType[] = [
  {
    code: '01',
    name: '鲜切花',
    subCategories: [
      { code: '01', name: '玫瑰' },
      { code: '02', name: '百合' },
      { code: '03', name: '康乃馨' },
      { code: '04', name: '郁金香' },
      { code: '05', name: '菊花' },
      { code: '06', name: '洋桔梗' },
      { code: '07', name: '非洲菊' },
      { code: '08', name: '满天星' },
      { code: '09', name: '勿忘我' },
      { code: '10', name: '情人草' },
      { code: '99', name: '其他鲜切花' },
    ],
  },
  {
    code: '02',
    name: '盆栽花卉',
    subCategories: [
      { code: '01', name: '绿萝' },
      { code: '02', name: '吊兰' },
      { code: '03', name: '多肉植物' },
      { code: '04', name: '仙人掌' },
      { code: '05', name: '君子兰' },
      { code: '06', name: '兰花' },
      { code: '07', name: '杜鹃花' },
      { code: '08', name: '茉莉花' },
      { code: '99', name: '其他盆栽' },
    ],
  },
  {
    code: '03',
    name: '观赏植物',
    subCategories: [
      { code: '01', name: '发财树' },
      { code: '02', name: '幸福树' },
      { code: '03', name: '平安树' },
      { code: '04', name: '散尾葵' },
      { code: '05', name: '龟背竹' },
      { code: '06', name: '橡皮树' },
      { code: '99', name: '其他观赏植物' },
    ],
  },
];

// 药材类（HB）类型配置
export const produceTypesHB: ProduceType[] = [
  {
    code: '01',
    name: '根茎类药材',
    subCategories: [
      { code: '01', name: '人参' },
      { code: '02', name: '党参' },
      { code: '03', name: '黄芪' },
      { code: '04', name: '当归' },
      { code: '05', name: '枸杞' },
      { code: '06', name: '天麻' },
      { code: '07', name: '三七' },
      { code: '08', name: '何首乌' },
      { code: '99', name: '其他根茎药材' },
    ],
  },
  {
    code: '02',
    name: '花叶类药材',
    subCategories: [
      { code: '01', name: '金银花' },
      { code: '02', name: '菊花' },
      { code: '03', name: '玫瑰花' },
      { code: '04', name: '茉莉花' },
      { code: '05', name: '荷叶' },
      { code: '06', name: '艾叶' },
      { code: '99', name: '其他花叶药材' },
    ],
  },
  {
    code: '03',
    name: '果实类药材',
    subCategories: [
      { code: '01', name: '山楂' },
      { code: '02', name: '枇杷叶' },
      { code: '03', name: '陈皮' },
      { code: '04', name: '橘红' },
      { code: '05', name: '罗汉果' },
      { code: '99', name: '其他果实药材' },
    ],
  },
];

// 食用菌类（MG）类型配置
export const produceTypesMG: ProduceType[] = [
  {
    code: '01',
    name: '木腐菌',
    subCategories: [
      { code: '01', name: '香菇' },
      { code: '02', name: '金针菇' },
      { code: '03', name: '平菇' },
      { code: '04', name: '杏鲍菇' },
      { code: '05', name: '白玉菇' },
      { code: '06', name: '蟹味菇' },
      { code: '99', name: '其他木腐菌' },
    ],
  },
  {
    code: '02',
    name: '草腐菌',
    subCategories: [
      { code: '01', name: '双孢蘑菇' },
      { code: '02', name: '草菇' },
      { code: '03', name: '鸡腿菇' },
      { code: '04', name: '姬松茸' },
      { code: '99', name: '其他草腐菌' },
    ],
  },
  {
    code: '03',
    name: '野生菌',
    subCategories: [
      { code: '01', name: '松茸' },
      { code: '02', name: '牛肝菌' },
      { code: '03', name: '鸡枞菌' },
      { code: '04', name: '羊肚菌' },
      { code: '05', name: '竹荪' },
      { code: '06', name: '黑木耳' },
      { code: '07', name: '银耳' },
      { code: '99', name: '其他野生菌' },
    ],
  },
];

// 其他类（OT）类型配置
export const produceTypesOT: ProduceType[] = [
  {
    code: '01',
    name: '坚果类',
    subCategories: [
      { code: '01', name: '核桃' },
      { code: '02', name: '板栗' },
      { code: '03', name: '腰果' },
      { code: '04', name: '杏仁' },
      { code: '05', name: '榛子' },
      { code: '99', name: '其他坚果' },
    ],
  },
  {
    code: '02',
    name: '茶叶类',
    subCategories: [
      { code: '01', name: '绿茶' },
      { code: '02', name: '红茶' },
      { code: '03', name: '乌龙茶' },
      { code: '04', name: '普洱茶' },
      { code: '05', name: '茉莉花茶' },
      { code: '99', name: '其他茶叶' },
    ],
  },
  {
    code: '03',
    name: '调料类',
    subCategories: [
      { code: '01', name: '花椒' },
      { code: '02', name: '八角' },
      { code: '03', name: '桂皮' },
      { code: '04', name: '胡椒' },
      { code: '05', name: '辣椒干' },
      { code: '99', name: '其他调料' },
    ],
  },
  {
    code: '99',
    name: '其他农产品',
    subCategories: [
      { code: '01', name: '蜂蜜' },
      { code: '02', name: '花粉' },
      { code: '03', name: '蜂王浆' },
      { code: '99', name: '其他' },
    ],
  },
];

// 根据大类获取类型配置
export const getProduceTypesByCategory = (categoryCode: ProduceCategoryCode): ProduceType[] => {
  switch (categoryCode) {
    case 'PD':
      return produceTypesPD;
    case 'FR':
      return produceTypesFR;
    case 'GR':
      return produceTypesGR;
    case 'FL':
      return produceTypesFL;
    case 'HB':
      return produceTypesHB;
    case 'MG':
      return produceTypesMG;
    case 'OT':
      return produceTypesOT;
    default:
      return [];
  }
};

// 生成产品编码
let produceSerialCounters: Record<string, number> = {};

// 初始化计数器（从已有最大序号开始）
export const initProduceSerialCounter = (categoryCode: string, typeCode: string, varietyCode: string, currentMax: number = 0) => {
  const key = `${categoryCode}${typeCode}${varietyCode}`;
  produceSerialCounters[key] = currentMax;
};

// 获取下一个产品编码
export const generateProduceCode = (categoryCode: ProduceCategoryCode, typeCode: string, varietyCode: string): string => {
  const key = `${categoryCode}${typeCode}${varietyCode}`;
  if (!produceSerialCounters[key]) {
    produceSerialCounters[key] = 0;
  }
  produceSerialCounters[key]++;
  const serial = produceSerialCounters[key].toString().padStart(3, '0');
  return `${categoryCode}${typeCode}${varietyCode}${serial}`;
};

// 根据编码获取分类信息
export const getProduceCategoryInfo = (code: string): { category: ProduceCategory; type: ProduceType; variety: ProduceSubType } | null => {
  if (code.length < 10) return null;

  const categoryCode = code.substring(0, 2) as ProduceCategoryCode;
  const typeCode = code.substring(2, 4);
  const varietyCode = code.substring(4, 6);

  const category = produceCategories.find(c => c.code === categoryCode);
  if (!category) return null;

  const types = getProduceTypesByCategory(categoryCode);
  const type = types.find(t => t.code === typeCode);
  if (!type) return null;

  const variety = type.subCategories.find(v => v.code === varietyCode);
  if (!variety) return null;

  return { category, type, variety };
};
