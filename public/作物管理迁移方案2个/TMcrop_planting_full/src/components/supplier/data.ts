// 供应商管理静态数据
import { SupplierBigCategory, Supplier } from './types';

// 供应商分类数据
export const supplierCategories: SupplierBigCategory[] = [
  { code: 'SP', name: '种子与种苗类', midCategories: [
    { code: '01', name: '粮食作物种子' }, { code: '02', name: '经济作物种子' }, { code: '03', name: '蔬菜种子/种苗' },
    { code: '04', name: '水果苗木' }, { code: '05', name: '花卉与观赏植物' }, { code: '06', name: '食用菌/药用菌菌种' }, { code: '99', name: '其他种质资源' },
  ]},
  { code: 'FE', name: '肥料与土壤改良类', midCategories: [
    { code: '01', name: '有机肥' }, { code: '02', name: '化学肥料' }, { code: '03', name: '微生物菌剂/生物刺激素' },
    { code: '04', name: '土壤调理剂' }, { code: '05', name: '育苗基质' }, { code: '99', name: '其他肥料类' },
  ]},
  { code: 'PP', name: '农药与植保产品类', midCategories: [
    { code: '01', name: '杀虫剂' }, { code: '02', name: '杀菌剂' }, { code: '03', name: '除草剂' },
    { code: '04', name: '植物生长调节剂' }, { code: '05', name: '绿色防控产品' }, { code: '06', name: '生物农药' }, { code: '99', name: '其他植保产品' },
  ]},
  { code: 'EQ', name: '农业机械与设备类', midCategories: [
    { code: '01', name: '耕作与动力机械' }, { code: '02', name: '播种/移栽设备' }, { code: '03', name: '植保机械' },
    { code: '04', name: '收获与采收机械' }, { code: '05', name: '初加工与分选设备' }, { code: '99', name: '其他农机设备' },
  ]},
  { code: 'FA', name: '设施农业资材类', midCategories: [
    { code: '01', name: '温室/大棚骨架材料' }, { code: '02', name: '覆盖材料' }, { code: '03', name: '通风降温设备' },
    { code: '04', name: '加温设备' }, { code: '05', name: '补光系统' }, { code: '06', name: '智能环控系统' }, { code: '99', name: '其他设施农业资材' },
  ]},
  { code: 'IR', name: '灌溉与水肥一体化类', midCategories: [
    { code: '01', name: '水泵与水源设备' }, { code: '02', name: '输水管网' }, { code: '03', name: '过滤系统' },
    { code: '04', name: '施肥装置' }, { code: '05', name: '灌溉终端' }, { code: '99', name: '其他灌溉设备' },
  ]},
  { code: 'OP', name: '日常劳保与劳动工具类', midCategories: [
    { code: '01', name: '劳动防护用品' }, { code: '02', name: '日常手动工具' }, { code: '03', name: '小型电动工具' },
    { code: '04', name: '清洁与卫生用品' }, { code: '99', name: '其他作业支持用品' },
  ]},
  { code: 'PH', name: '仓储与物流资材类', midCategories: [
    { code: '01', name: '采收容器' }, { code: '02', name: '农产品包装材料' }, { code: '03', name: '冷链设备' },
    { code: '04', name: '装卸与仓储设备' }, { code: '99', name: '其他采后处理' },
  ]},
  { code: 'TS', name: '检测与技术服务类', midCategories: [
    { code: '01', name: '土壤/水质检测服务' }, { code: '02', name: '农残快检设备与试剂' }, { code: '03', name: '农业物联网设备' },
    { code: '04', name: '数字农业软件服务' }, { code: '05', name: '农业技术咨询与培训' }, { code: '99', name: '其他技术服务' },
  ]},
  { code: 'UT', name: '能源与辅助耗材类', midCategories: [
    { code: '01', name: '燃油/润滑油' }, { code: '02', name: '电力与新能源' }, { code: '03', name: '通用工业耗材' }, { code: '99', name: '其他能源与耗材' },
  ]},
  { code: 'OT', name: '其他综合类', midCategories: [
    { code: '01', name: '其他未分类供应商' },
  ]},
];

// 获取供应商类型中文名称
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

// 供应商数据
export const suppliers: Supplier[] = [
  { id: 1, code: 'SU_SP01001', name: '金色稻种有限公司', supplierType: 'SP', supplierAttribute: '企业', contact: '张志远', mobilePhone: '13800138001', workPhone: '0571-88886666', fax: '0571-88886667', status: '合作中', country: '中国', province: '湖南省', city: '长沙市', address: '岳麓区科技园路1号', bankName: '中国农业银行长沙分行', bankCardNumber: '6228481234567890123', organization: '宁波帮帮忙公司', createDate: '2024-01-15', remarks: '长期合作供应商，品质稳定' },
  { id: 2, code: 'SU_SP01002', name: '丰收种业公司', supplierType: 'SP', supplierAttribute: '企业', contact: '李志刚', mobilePhone: '13800138002', workPhone: '025-88888888', fax: '025-88888889', status: '合作中', country: '中国', province: '江苏省', city: '南京市', address: '江宁区农业路88号', bankName: '中国工商银行南京分行', bankCardNumber: '6228881234567890124', organization: '成都帮帮您公司', createDate: '2024-02-20', remarks: '' },
  { id: 3, code: 'SU_SP03001', name: '绿叶蔬菜种苗基地', supplierType: 'SP', supplierAttribute: '个体户', contact: '王老板', mobilePhone: '13800138003', workPhone: '0536-88888888', fax: '0536-88888889', status: '合作中', country: '中国', province: '山东省', city: '寿光市', address: '蔬菜批发市场A区12号', bankName: '中国建设银行寿光支行', bankCardNumber: '6227001234567890125', organization: '宁波帮帮忙公司', createDate: '2024-03-10', remarks: '主营蔬菜种苗' },
  { id: 4, code: 'SU_FE01001', name: '有机肥生产厂家', supplierType: 'FE', supplierAttribute: '企业', contact: '赵总', mobilePhone: '13800138004', workPhone: '0371-88886666', fax: '0371-88886667', status: '合作中', country: '中国', province: '河南省', city: '郑州市', address: '中原区化工路56号', bankName: '中国银行郑州分行', bankCardNumber: '6228881234567890126', organization: '成都帮帮您公司', createDate: '2024-01-25', remarks: '' },
  { id: 5, code: 'SU_FE02001', name: '复合化肥供应公司', supplierType: 'FE', supplierAttribute: '企业', contact: '钱厂', mobilePhone: '13800138005', workPhone: '0311-88888888', fax: '0311-88888889', status: '合作中', country: '中国', province: '河北省', city: '石家庄市', address: '裕华区农资中心B座', bankName: '中国农业银行石家庄支行', bankCardNumber: '6228482345678900127', organization: '宁波帮帮忙公司', createDate: '2024-04-05', remarks: '化肥批发商' },
  { id: 6, code: 'SU_PP01001', name: '高效杀虫剂供应商', supplierType: 'PP', supplierAttribute: '企业', contact: '孙经理', mobilePhone: '13800138006', workPhone: '0512-88886666', fax: '0512-88886667', status: '合作中', country: '中国', province: '江苏省', city: '苏州市', address: '工业园区东兴路128号', bankName: '中国工商银行苏州分行', bankCardNumber: '6228883456789010128', organization: '宁波帮帮忙公司', createDate: '2024-02-18', remarks: '' },
  { id: 7, code: 'SU_PP02001', name: '杀菌剂供应中心', supplierType: 'PP', supplierAttribute: '个体户', contact: '周经理', mobilePhone: '13800138007', workPhone: '0571-88888888', fax: '0571-88888889', status: '合作中', country: '中国', province: '浙江省', city: '杭州市', address: '西湖区文三路45号', bankName: '中国建设银行杭州分行', bankCardNumber: '6227004567890120129', organization: '成都帮帮您公司', createDate: '2024-03-22', remarks: '农药批发' },
  { id: 8, code: 'SU_EQ01001', name: '拖拉机制造商', supplierType: 'EQ', supplierAttribute: '企业', contact: '吴总', mobilePhone: '13800138008', workPhone: '0537-88886666', fax: '0537-88886667', status: '合作中', country: '中国', province: '山东省', city: '济宁市', address: '任城区农机工业园68号', bankName: '中国农业银行济宁分行', bankCardNumber: '6228484567890120130', organization: '宁波帮帮忙公司', createDate: '2024-01-30', remarks: '' },
  { id: 9, code: 'SU_EQ03001', name: '植保无人机公司', supplierType: 'EQ', supplierAttribute: '企业', contact: '郑经理', mobilePhone: '13800138009', workPhone: '0755-88888888', fax: '0755-88888889', status: '合作中', country: '中国', province: '广东省', city: '深圳市', address: '南山区科技园北区A栋', bankName: '招商银行深圳分行', bankCardNumber: '6228885678901230131', organization: '成都帮帮您公司', createDate: '2024-05-12', remarks: '提供无人机植保服务' },
  { id: 10, code: 'SU_FA01001', name: '温室大棚骨架厂', supplierType: 'FA', supplierAttribute: '个体户', contact: '王老板', mobilePhone: '13800138010', workPhone: '010-88886666', fax: '010-88886667', status: '合作中', country: '中国', province: '北京市', city: '北京市', address: '大兴区农业装备基地3号', bankName: '中国工商银行北京分行', bankCardNumber: '6228886789012340132', organization: '宁波帮帮忙公司', createDate: '2024-02-08', remarks: '' },
  { id: 11, code: 'SU_FA02001', name: 'PO膜供应商', supplierType: 'FA', supplierAttribute: '企业', contact: '冯总', mobilePhone: '13800138011', workPhone: '0513-88888888', fax: '0513-88888889', status: '暂停', country: '中国', province: '江苏省', city: '南通市', address: '崇川区工业园纬一路', bankName: '中国建设银行南通支行', bankCardNumber: '6227006789012340133', organization: '成都帮帮您公司', createDate: '2024-03-18', remarks: '暂停合作' },
  { id: 12, code: 'SU_IR01001', name: '水泵设备供应商', supplierType: 'IR', supplierAttribute: '个体户', contact: '陈志明', mobilePhone: '13800138012', workPhone: '0577-88886666', fax: '0577-88886667', status: '合作中', country: '中国', province: '浙江省', city: '温州市', address: '瓯海区机械工业园12号', bankName: '中国农业银行温州分行', bankCardNumber: '6228487890123450134', organization: '宁波帮帮忙公司', createDate: '2024-04-25', remarks: '' },
  { id: 13, code: 'SU_OP01001', name: '劳保用品公司', supplierType: 'OP', supplierAttribute: '企业', contact: '刘总', mobilePhone: '13800138013', workPhone: '021-88888888', fax: '021-88888889', status: '合作中', country: '中国', province: '上海市', city: '上海市', address: '浦东新区商城路368号', bankName: '中国银行上海分行', bankCardNumber: '6228887890123450135', organization: '成都帮帮您公司', createDate: '2024-05-08', remarks: '' },
  { id: 14, code: 'SU_TS01001', name: '土壤检测服务中心', supplierType: 'TS', supplierAttribute: '事业单位', contact: '黄经理', mobilePhone: '13800138014', workPhone: '020-88886666', fax: '020-88886667', status: '合作中', country: '中国', province: '广东省', city: '广州市', address: '天河区农业技术中心大厦', bankName: '中国建设银行广州分行', bankCardNumber: '6227008901234560136', organization: '宁波帮帮忙公司', createDate: '2024-03-30', remarks: '提供专业检测报告' },
  { id: 15, code: 'SU_UT03001', name: '电线电缆供应商', supplierType: 'UT', supplierAttribute: '企业', contact: '许总', mobilePhone: '13800138015', workPhone: '0514-88888888', fax: '0514-88888889', status: '合作中', country: '中国', province: '江苏省', city: '扬州市', address: '广陵区工业园电缆路1号', bankName: '中国工商银行扬州分行', bankCardNumber: '6228888901234560137', organization: '成都帮帮您公司', createDate: '2024-06-15', remarks: '' },
];
