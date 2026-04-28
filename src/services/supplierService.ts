/**
 * 供应商服务
 * 提供供应商的查询、搜索功能
 */

import { Supplier } from '../components/supplier/types';

const STORAGE_KEY = 'suppliers';

// 默认供应商数据
const defaultSuppliers: Supplier[] = [
  { id: 1, code: 'SU_SP01001', name: '金色稻种有限公司', supplierType: 'SP', supplierAttribute: '企业', contact: '张志远', mobilePhone: '13800138001', workPhone: '0571-88886666', fax: '0571-88886667', status: '合作中', country: '中国', province: '湖南省', city: '长沙市', address: '岳麓区科技园路1号', bankName: '中国农业银行长沙分行', bankCardNumber: '6228481234567890123', organization: '宁波帮帮忙公司', createDate: '2024-01-15', remarks: '长期合作供应商，品质稳定' },
  { id: 2, code: 'SU_SP01002', name: '丰收种业公司', supplierType: 'SP', supplierAttribute: '企业', contact: '李志刚', mobilePhone: '13800138002', workPhone: '025-88888888', fax: '025-88888889', status: '合作中', country: '中国', province: '江苏省', city: '南京市', address: '江宁区农业路88号', bankName: '中国工商银行南京分行', bankCardNumber: '6228881234567890124', organization: '成都帮帮您公司', createDate: '2024-02-20', remarks: '' },
  { id: 3, code: 'SU_SP03001', name: '绿叶蔬菜种苗基地', supplierType: 'SP', supplierAttribute: '个体户', contact: '王老板', mobilePhone: '13800138003', workPhone: '0536-88888888', fax: '0536-88888889', status: '合作中', country: '中国', province: '山东省', city: '寿光市', address: '蔬菜批发市场A区12号', bankName: '中国建设银行寿光支行', bankCardNumber: '6227001234567890125', organization: '宁波帮帮忙公司', createDate: '2024-03-10', remarks: '主营蔬菜种苗' },
  { id: 4, code: 'SU_FE01001', name: '有机肥生产厂家', supplierType: 'FE', supplierAttribute: '企业', contact: '赵总', mobilePhone: '13800138004', workPhone: '0371-88886666', fax: '0371-88886667', status: '合作中', country: '中国', province: '河南省', city: '郑州市', address: '中原区化工路56号', bankName: '中国银行郑州分行', bankCardNumber: '6228881234567890126', organization: '宁波帮帮忙公司', createDate: '2024-01-25', remarks: '' },
  { id: 5, code: 'SU_FE02001', name: '复合化肥供应公司', supplierType: 'FE', supplierAttribute: '企业', contact: '钱厂', mobilePhone: '13800138005', workPhone: '0311-88888888', fax: '0311-88888889', status: '合作中', country: '中国', province: '河北省', city: '石家庄市', address: '裕华区农资中心B座', bankName: '中国农业银行石家庄支行', bankCardNumber: '6228482345678900127', organization: '宁波帮帮忙公司', createDate: '2024-04-05', remarks: '化肥批发商' },
  { id: 6, code: 'SU_PP01001', name: '高效杀虫剂供应商', supplierType: 'PP', supplierAttribute: '企业', contact: '孙经理', mobilePhone: '13800138006', workPhone: '0512-88886666', fax: '0512-88886667', status: '合作中', country: '中国', province: '江苏省', city: '苏州市', address: '工业园区东兴路128号', bankName: '中国工商银行苏州分行', bankCardNumber: '6228883456789010128', organization: '宁波帮帮忙公司', createDate: '2024-02-18', remarks: '' },
  { id: 7, code: 'SU_PP02001', name: '杀菌剂供应中心', supplierType: 'PP', supplierAttribute: '个体户', contact: '周经理', mobilePhone: '13800138007', workPhone: '0571-88888888', fax: '0571-88888889', status: '合作中', country: '中国', province: '浙江省', city: '杭州市', address: '西湖区文三路45号', bankName: '中国建设银行杭州分行', bankCardNumber: '6227004567890120129', organization: '宁波帮帮您公司', createDate: '2024-03-22', remarks: '农药批发' },
  { id: 8, code: 'SU_EQ01001', name: '拖拉机制造商', supplierType: 'EQ', supplierAttribute: '企业', contact: '吴总', mobilePhone: '13800138008', workPhone: '0537-88886666', fax: '0537-88886667', status: '合作中', country: '中国', province: '山东省', city: '济宁市', address: '任城区农机工业园68号', bankName: '中国农业银行济宁分行', bankCardNumber: '6228484567890120130', organization: '宁波帮帮忙公司', createDate: '2024-01-30', remarks: '' },
  { id: 9, code: 'SU_EQ03001', name: '植保无人机公司', supplierType: 'EQ', supplierAttribute: '企业', contact: '郑经理', mobilePhone: '13800138009', workPhone: '0755-88888888', fax: '0755-88888889', status: '合作中', country: '中国', province: '广东省', city: '深圳市', address: '南山区科技园北区A栋', bankName: '招商银行深圳分行', bankCardNumber: '6228885678901230131', organization: '成都帮帮您公司', createDate: '2024-05-12', remarks: '提供无人机植保服务' },
  { id: 10, code: 'SU_FA01001', name: '温室大棚骨架厂', supplierType: 'FA', supplierAttribute: '个体户', contact: '王老板', mobilePhone: '13800138010', workPhone: '010-88886666', fax: '010-88886667', status: '合作中', country: '中国', province: '北京市', city: '北京市', address: '大兴区农业装备基地3号', bankName: '中国工商银行北京分行', bankCardNumber: '6228886789012340132', organization: '宁波帮帮忙公司', createDate: '2024-02-08', remarks: '' },
  { id: 11, code: 'SU_FA02001', name: 'PO膜供应商', supplierType: 'FA', supplierAttribute: '企业', contact: '冯总', mobilePhone: '13800138011', workPhone: '0513-88888888', fax: '0513-88888889', status: '暂停', country: '中国', province: '江苏省', city: '南通市', address: '崇川区工业园纬一路', bankName: '中国建设银行南通支行', bankCardNumber: '6227006789012340133', organization: '成都帮帮您公司', createDate: '2024-03-18', remarks: '暂停合作' },
];

/**
 * 初始化供应商数据
 */
export function initSuppliers(): Supplier[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSuppliers));
    return defaultSuppliers;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return defaultSuppliers;
  }
}

/**
 * 获取所有供应商
 */
export function getAllSuppliers(): Supplier[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return defaultSuppliers;
    }
  }
  return initSuppliers();
}

/**
 * 搜索供应商（按名称、编码、联系人搜索）
 */
export function searchSuppliers(keyword: string): Supplier[] {
  if (!keyword.trim()) {
    return getAllSuppliers();
  }

  const suppliers = getAllSuppliers();
  const lowerKeyword = keyword.toLowerCase().trim();

  return suppliers.filter(s =>
    s.name.toLowerCase().includes(lowerKeyword) ||
    s.code.toLowerCase().includes(lowerKeyword) ||
    s.contact.toLowerCase().includes(lowerKeyword) ||
    s.mobilePhone.includes(keyword)
  );
}

/**
 * 根据ID获取供应商
 */
export function getSupplierById(id: number): Supplier | undefined {
  const suppliers = getAllSuppliers();
  return suppliers.find(s => s.id === id);
}

/**
 * 获取合作中的供应商（用于下拉选择）
 */
export function getActiveSuppliers(): Array<{ value: string; label: string; code: string }> {
  const suppliers = getAllSuppliers();
  return suppliers
    .filter(s => s.status === '合作中')
    .map(s => ({
      value: String(s.id),
      label: s.name,
      code: s.code
    }));
}
