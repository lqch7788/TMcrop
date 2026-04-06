import { SupplierBigCategory } from './types';

export const supplierCategories: SupplierBigCategory[] = [
  { code: 'SP', name: '种子与种苗类', nameEn: 'Seed & Seedling', midCategories: [
    { code: '01', name: '粮食作物种子' }, { code: '02', name: '经济作物种子' }, { code: '03', name: '蔬菜种子/种苗' },
    { code: '04', name: '水果苗木' }, { code: '05', name: '花卉与观赏植物' }, { code: '06', name: '食用菌/药用菌菌种' }, { code: '99', name: '其他种质资源' },
  ]},
  { code: 'FE', name: '肥料与土壤改良类', nameEn: 'Fertilizer & Soil Amendment', midCategories: [
    { code: '01', name: '有机肥' }, { code: '02', name: '化学肥料' }, { code: '03', name: '微生物菌剂/生物刺激素' },
    { code: '04', name: '土壤调理剂' }, { code: '05', name: '育苗基质' }, { code: '99', name: '其他肥料类' },
  ]},
  { code: 'PP', name: '农药与植保产品类', nameEn: 'Pesticide & Plant Protection', midCategories: [
    { code: '01', name: '杀虫剂' }, { code: '02', name: '杀菌剂' }, { code: '03', name: '除草剂' },
    { code: '04', name: '植物生长调节剂' }, { code: '05', name: '绿色防控产品' }, { code: '06', name: '生物农药' }, { code: '99', name: '其他植保产品' },
  ]},
  { code: 'EQ', name: '农业机械与设备类', nameEn: 'Agricultural Machinery & Equipment', midCategories: [
    { code: '01', name: '耕作与动力机械' }, { code: '02', name: '播种/移栽设备' }, { code: '03', name: '植保机械' },
    { code: '04', name: '收获与采收机械' }, { code: '05', name: '初加工与分选设备' }, { code: '99', name: '其他农机设备' },
  ]},
  { code: 'FA', name: '设施农业资材类', nameEn: 'Facility Agriculture Materials', midCategories: [
    { code: '01', name: '温室/大棚骨架材料' }, { code: '02', name: '覆盖材料' }, { code: '03', name: '通风降温设备' },
    { code: '04', name: '加温设备' }, { code: '05', name: '补光系统' }, { code: '06', name: '智能环控系统' }, { code: '99', name: '其他设施农业资材' },
  ]},
  { code: 'IR', name: '灌溉与水肥一体化类', nameEn: 'Irrigation & Fertilization', midCategories: [
    { code: '01', name: '水泵与水源设备' }, { code: '02', name: '输水管网' }, { code: '03', name: '过滤系统' },
    { code: '04', name: '施肥装置' }, { code: '05', name: '灌溉终端' }, { code: '99', name: '其他灌溉设备' },
  ]},
  { code: 'OP', name: '日常劳保与劳动工具类', nameEn: 'Labor Protection & Tools', midCategories: [
    { code: '01', name: '劳动防护用品' }, { code: '02', name: '日常手动工具' }, { code: '03', name: '小型电动工具' },
    { code: '04', name: '清洁与卫生用品' }, { code: '99', name: '其他作业支持用品' },
  ]},
  { code: 'PH', name: '仓储与物流资材类', nameEn: 'Storage & Logistics Materials', midCategories: [
    { code: '01', name: '采收容器' }, { code: '02', name: '农产品包装材料' }, { code: '03', name: '冷链设备' },
    { code: '04', name: '装卸与仓储设备' }, { code: '99', name: '其他采后处理' },
  ]},
  { code: 'TS', name: '检测与技术服务类', nameEn: 'Testing & Technical Services', midCategories: [
    { code: '01', name: '土壤/水质检测服务' }, { code: '02', name: '农残快检设备与试剂' }, { code: '03', name: '农业物联网设备' },
    { code: '04', name: '数字农业软件服务' }, { code: '05', name: '农业技术咨询与培训' }, { code: '99', name: '其他技术服务' },
  ]},
  { code: 'UT', name: '能源与辅助耗材类', nameEn: 'Energy & Auxiliary Consumables', midCategories: [
    { code: '01', name: '燃油/润滑油' }, { code: '02', name: '电力与新能源' }, { code: '03', name: '通用工业耗材' }, { code: '99', name: '其他能源与耗材' },
  ]},
  { code: 'OT', name: '其他综合类', nameEn: 'Others', midCategories: [
    { code: '01', name: '其他未分类供应商' },
  ]},
];

export const getSupplierTypeName = (code: string): string => {
  const typeMap: Record<string, string> = {
    'SP': '种子与种苗类',
    'FE': '肥料与土壤改良类',
    'PP': '农药与植保产品类',
    'EQ': '农业机械与设备类',
    'FA': '设施农业资材类',
    'IR': '灌溉与水肥一体化类',
    'OP': '日常劳保与劳动工具类',
    'PH': '仓储与物流资材类',
    'TS': '检测与技术服务类',
    'UT': '能源与辅助耗材类',
    'OT': '其他综合类'
  };
  return typeMap[code] || code;
};

export const supplierTypeOptions = [
  { value: 'SP', label: 'SP - 种子与种苗类' },
  { value: 'FE', label: 'FE - 肥料与土壤改良类' },
  { value: 'PP', label: 'PP - 农药与植保产品类' },
  { value: 'EQ', label: 'EQ - 农业机械与设备类' },
  { value: 'FA', label: 'FA - 设施农业资材类' },
  { value: 'IR', label: 'IR - 灌溉与水肥一体化类' },
  { value: 'OP', label: 'OP - 日常劳保与劳动工具类' },
  { value: 'PH', label: 'PH - 仓储与物流资材类' },
  { value: 'TS', label: 'TS - 检测与技术服务类' },
  { value: 'UT', label: 'UT - 能源与辅助耗材类' },
  { value: 'OT', label: 'OT - 其他综合类' },
];

export const supplierAttributeOptions = [
  { value: '个人', label: '个人' },
  { value: '个体户', label: '个体户' },
  { value: '企业', label: '企业' },
  { value: '团体', label: '团体' },
  { value: '事业单位', label: '事业单位' },
  { value: '网络平台', label: '网络平台' },
];

export const supplierStatusOptions = [
  { value: '合作中', label: '合作中' },
  { value: '暂停', label: '暂停' },
  { value: '终止', label: '终止' },
];
