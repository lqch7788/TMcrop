import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Plus, Search, Download, Eye, Edit, ChevronLeft, ChevronRight, X, Hash, AlertTriangle, Package, Trash2 } from 'lucide-react';

// 供应商分类数据 - 与编码规则保持一致
interface SupplierMidCategory {
  code: string;
  name: string;
}

interface SupplierBigCategory {
  code: string;
  name: string;
  midCategories: SupplierMidCategory[];
}

const supplierCategories: SupplierBigCategory[] = [
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
const getSupplierTypeName = (code: string) => {
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

const suppliers = [
  // SP - 种子与种苗类
  { id: 1, code: 'SU_SP01001', name: '金色稻种有限公司', supplierType: 'SP', supplierAttribute: '企业', contact: '张志远', mobilePhone: '13800138001', workPhone: '0571-88886666', fax: '0571-88886667', status: '合作中', country: '中国', province: '湖南省', city: '长沙市', address: '岳麓区科技园路1号', bankName: '中国农业银行长沙分行', bankCardNumber: '6228481234567890123', organization: '宁波帮帮忙公司', createDate: '2024-01-15', remarks: '长期合作供应商，品质稳定' },
  { id: 2, code: 'SU_SP01002', name: '丰收种业公司', supplierType: 'SP', supplierAttribute: '企业', contact: '李志刚', mobilePhone: '13800138002', workPhone: '025-88888888', fax: '025-88888889', status: '合作中', country: '中国', province: '江苏省', city: '南京市', address: '江宁区农业路88号', bankName: '中国工商银行南京分行', bankCardNumber: '6228881234567890124', organization: '成都帮帮您公司', createDate: '2024-02-20', remarks: '' },
  { id: 3, code: 'SU_SP03001', name: '绿叶蔬菜种苗基地', supplierType: 'SP', supplierAttribute: '个体户', contact: '王老板', mobilePhone: '13800138003', workPhone: '0536-88888888', fax: '0536-88888889', status: '合作中', country: '中国', province: '山东省', city: '寿光市', address: '蔬菜批发市场A区12号', bankName: '中国建设银行寿光支行', bankCardNumber: '6227001234567890125', organization: '宁波帮帮忙公司', createDate: '2024-03-10', remarks: '主营蔬菜种苗' },
  // FE - 肥料与土壤改良类
  { id: 4, code: 'SU_FE01001', name: '有机肥生产厂家', supplierType: 'FE', supplierAttribute: '企业', contact: '赵总', mobilePhone: '13800138004', workPhone: '0371-88886666', fax: '0371-88886667', status: '合作中', country: '中国', province: '河南省', city: '郑州市', address: '中原区化工路56号', bankName: '中国银行郑州分行', bankCardNumber: '6228881234567890126', organization: '成都帮帮您公司', createDate: '2024-01-25', remarks: '' },
  { id: 5, code: 'SU_FE02001', name: '复合化肥供应公司', supplierType: 'FE', supplierAttribute: '企业', contact: '钱厂', mobilePhone: '13800138005', workPhone: '0311-88888888', fax: '0311-88888889', status: '合作中', country: '中国', province: '河北省', city: '石家庄市', address: '裕华区农资中心B座', bankName: '中国农业银行石家庄支行', bankCardNumber: '6228482345678900127', organization: '宁波帮帮忙公司', createDate: '2024-04-05', remarks: '化肥批发商' },
  // PP - 农药与植保产品类
  { id: 6, code: 'SU_PP01001', name: '高效杀虫剂供应商', supplierType: 'PP', supplierAttribute: '企业', contact: '孙经理', mobilePhone: '13800138006', workPhone: '0512-88886666', fax: '0512-88886667', status: '合作中', country: '中国', province: '江苏省', city: '苏州市', address: '工业园区东兴路128号', bankName: '中国工商银行苏州分行', bankCardNumber: '6228883456789010128', organization: '宁波帮帮忙公司', createDate: '2024-02-18', remarks: '' },
  { id: 7, code: 'SU_PP02001', name: '杀菌剂供应中心', supplierType: 'PP', supplierAttribute: '个体户', contact: '周经理', mobilePhone: '13800138007', workPhone: '0571-88888888', fax: '0571-88888889', status: '合作中', country: '中国', province: '浙江省', city: '杭州市', address: '西湖区文三路45号', bankName: '中国建设银行杭州分行', bankCardNumber: '6227004567890120129', organization: '成都帮帮您公司', createDate: '2024-03-22', remarks: '农药批发' },
  // EQ - 农业机械与设备类
  { id: 8, code: 'SU_EQ01001', name: '拖拉机制造商', supplierType: 'EQ', supplierAttribute: '企业', contact: '吴总', mobilePhone: '13800138008', workPhone: '0537-88886666', fax: '0537-88886667', status: '合作中', country: '中国', province: '山东省', city: '济宁市', address: '任城区农机工业园68号', bankName: '中国农业银行济宁分行', bankCardNumber: '6228484567890120130', organization: '宁波帮帮忙公司', createDate: '2024-01-30', remarks: '' },
  { id: 9, code: 'SU_EQ03001', name: '植保无人机公司', supplierType: 'EQ', supplierAttribute: '企业', contact: '郑经理', mobilePhone: '13800138009', workPhone: '0755-88888888', fax: '0755-88888889', status: '合作中', country: '中国', province: '广东省', city: '深圳市', address: '南山区科技园北区A栋', bankName: '招商银行深圳分行', bankCardNumber: '6228885678901230131', organization: '成都帮帮您公司', createDate: '2024-05-12', remarks: '提供无人机植保服务' },
  // FA - 设施农业资材类
  { id: 10, code: 'SU_FA01001', name: '温室大棚骨架厂', supplierType: 'FA', supplierAttribute: '个体户', contact: '王老板', mobilePhone: '13800138010', workPhone: '010-88886666', fax: '010-88886667', status: '合作中', country: '中国', province: '北京市', city: '北京市', address: '大兴区农业装备基地3号', bankName: '中国工商银行北京分行', bankCardNumber: '6228886789012340132', organization: '宁波帮帮忙公司', createDate: '2024-02-08', remarks: '' },
  { id: 11, code: 'SU_FA02001', name: 'PO膜供应商', supplierType: 'FA', supplierAttribute: '企业', contact: '冯总', mobilePhone: '13800138011', workPhone: '0513-88888888', fax: '0513-88888889', status: '暂停', country: '中国', province: '江苏省', city: '南通市', address: '崇川区工业园纬一路', bankName: '中国建设银行南通支行', bankCardNumber: '6227006789012340133', organization: '成都帮帮您公司', createDate: '2024-03-18', remarks: '暂停合作' },
  // IR - 灌溉与水肥一体化类
  { id: 12, code: 'SU_IR01001', name: '水泵设备供应商', supplierType: 'IR', supplierAttribute: '个体户', contact: '陈志明', mobilePhone: '13800138012', workPhone: '0577-88886666', fax: '0577-88886667', status: '合作中', country: '中国', province: '浙江省', city: '温州市', address: '瓯海区机械工业园12号', bankName: '中国农业银行温州分行', bankCardNumber: '6228487890123450134', organization: '宁波帮帮忙公司', createDate: '2024-04-25', remarks: '' },
  // OP - 日常劳保与劳动工具类
  { id: 13, code: 'SU_OP01001', name: '劳保用品公司', supplierType: 'OP', supplierAttribute: '企业', contact: '刘总', mobilePhone: '13800138013', workPhone: '021-88888888', fax: '021-88888889', status: '合作中', country: '中国', province: '上海市', city: '上海市', address: '浦东新区商城路368号', bankName: '中国银行上海分行', bankCardNumber: '6228887890123450135', organization: '成都帮帮您公司', createDate: '2024-05-08', remarks: '' },
  // TS - 检测与技术服务类
  { id: 14, code: 'SU_TS01001', name: '土壤检测服务中心', supplierType: 'TS', supplierAttribute: '事业单位', contact: '黄经理', mobilePhone: '13800138014', workPhone: '020-88886666', fax: '020-88886667', status: '合作中', country: '中国', province: '广东省', city: '广州市', address: '天河区农业技术中心大厦', bankName: '中国建设银行广州分行', bankCardNumber: '6227008901234560136', organization: '宁波帮帮忙公司', createDate: '2024-03-30', remarks: '提供专业检测报告' },
  // UT - 能源与辅助耗材类
  { id: 15, code: 'SU_UT03001', name: '电线电缆供应商', supplierType: 'UT', supplierAttribute: '企业', contact: '许总', mobilePhone: '13800138015', workPhone: '0514-88888888', fax: '0514-88888889', status: '合作中', country: '中国', province: '江苏省', city: '扬州市', address: '广陵区工业园电缆路1号', bankName: '中国工商银行扬州分行', bankCardNumber: '6228888901234560137', organization: '成都帮帮您公司', createDate: '2024-06-15', remarks: '' },
];

export default function SupplierManagement() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [type, setType] = useState('全部');
  const [status, setStatus] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [batchEditedSuppliers, setBatchEditedSuppliers] = useState<Record<number, any>>({});
  const [currentBatchEditIndex, setCurrentBatchEditIndex] = useState(0);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    supplierType: '',
    supplierAttribute: '',
    contact: '',
    mobilePhone: '',
    workPhone: '',
    fax: '',
    status: '',
    country: '中国',
    province: '',
    city: '',
    address: '',
    bankName: '',
    bankCardNumber: '',
    organization: '',
    createDate: '',
    remarks: '',
    lastEditBy: '',
    lastEditTime: ''
  });
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    organization: '',
    code: '',
    name: '',
    supplierType: '',
    supplierAttribute: '',
    contact: '',
    mobilePhone: '',
    workPhone: '',
    fax: '',
    country: '中国',
    province: '',
    city: '',
    address: '',
    status: '合作中',
    bankName: '',
    bankCardNumber: '',
    createDate: new Date().toISOString().split('T')[0],
    remarks: ''
  });

  // 供应商编码生成相关状态
  const [supplierCodeGen, setSupplierCodeGen] = useState({
    bigCategory: '',
    midCategory: '',
    generatedCode: ''
  });
  const [supplierCodeGenError, setSupplierCodeGenError] = useState('');
  const [supplierCodeGenSuccess, setSupplierCodeGenSuccess] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // 获取编码生成的中类列表
  const getSupplierCodeGenMidCategories = () => {
    if (!supplierCodeGen.bigCategory) return [];
    const bigCat = supplierCategories.find(c => c.code === supplierCodeGen.bigCategory);
    return bigCat ? bigCat.midCategories : [];
  };

  // 处理编码生成选择变化
  const handleSupplierCodeGenCategoryChange = (field: string, value: string) => {
    if (field === 'bigCategory') {
      setSupplierCodeGen({ ...supplierCodeGen, bigCategory: value, midCategory: '', generatedCode: '' });
    } else if (field === 'midCategory') {
      setSupplierCodeGen({ ...supplierCodeGen, midCategory: value, generatedCode: '' });
    }
  };

  // 生成供应商编码
  const handleSupplierCodeGen = () => {
    setSupplierCodeGenError('');
    setSupplierCodeGenSuccess('');

    if (!supplierCodeGen.bigCategory || !supplierCodeGen.midCategory) {
      setSupplierCodeGenError('请选择大类和中类');
      return;
    }

    // 根据已选择的类别查找最大流水号并加1
    const prefix = `${supplierCodeGen.bigCategory}${supplierCodeGen.midCategory}`;
    const existingCodes = suppliers
      .map(s => s.code.replace('SU_', ''))
      .filter(code => code.startsWith(prefix))
      .map(code => parseInt(code.slice(4), 10))
      .filter(n => !isNaN(n));

    const maxSerial = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
    const newSerial = maxSerial + 1;

    if (newSerial > 999) {
      setSupplierCodeGenError('该类别下的流水号已用完');
      return;
    }

    const serialNum = String(newSerial).padStart(3, '0');
    const fullCode = `SU_${supplierCodeGen.bigCategory}${supplierCodeGen.midCategory}${serialNum}`;

    setSupplierCodeGen({ ...supplierCodeGen, generatedCode: fullCode });
    setSupplierCodeGenSuccess('编码生成成功！');
  };

  // 验证编码是否重复
  const handleSupplierVerifyCode = () => {
    if (!supplierCodeGen.generatedCode) {
      setSupplierCodeGenError('请先生成编码');
      return;
    }

    // 检查是否重复（模拟）
    const exists = suppliers.some(s => s.code === supplierCodeGen.generatedCode.replace('SU_', 'S'));
    if (exists) {
      setSupplierCodeGenError('该编码已被使用，请重新生成');
      setSupplierCodeGenSuccess('');
    } else {
      setSupplierCodeGenError('');
      setSupplierCodeGenSuccess('编码验证通过，无重复！');
    }
  };

  // 复制编码
  const handleSupplierCopyCode = () => {
    if (!supplierCodeGen.generatedCode) return;
    navigator.clipboard.writeText(supplierCodeGen.generatedCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleSelectAll = () => {
    if (selectedRows.length === suppliers.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(suppliers.map(s => s.id));
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
    if (selectedRows.length === 0) {
      alert('请先选择要导出的数据');
      return;
    }
    handleDoExport();
  };

  // 导出数据处理
  const handleDoExport = async () => {
    // Get selected data
    const selectedData = suppliers.filter(s => selectedRows.includes(s.id));
    const headers = ['供应商编号', '所属组织', '供应商名称', '供应物资类型', '供应商属性', '联系人', '移动电话', '工作电话', '传真号码', '国家', '省份', '城市', '详细地址', '状态', '开户行', '银行卡号', '创建时间', '备注'];
    const exportData = selectedData.map(row => ({
      '供应商编号': row.code,
      '所属组织': row.organization,
      '供应商名称': row.name,
      '供应物资类型': getSupplierTypeName(row.supplierType),
      '供应商属性': row.supplierAttribute,
      '联系人': row.contact,
      '移动电话': row.mobilePhone,
      '工作电话': row.workPhone || '',
      '传真号码': row.fax || '',
      '国家': row.country,
      '省份': row.province,
      '城市': row.city,
      '详细地址': row.address,
      '状态': row.status,
      '开户行': row.bankName || '',
      '银行卡号': row.bankCardNumber || '',
      '创建时间': row.createDate,
      '备注': row.remarks || ''
    }));

    // Create content based on format
    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      // CSV format
      content = headers.join(',') + '\n' + exportData.map(row =>
        headers.map(h => `"${row[h] || ''}"`).join(',')
      ).join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      // Excel format (as HTML table with text formatting for bank card numbers)
      const bankCardIndex = headers.indexOf('银行卡号');
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map((h, i) => {
        const value = row[h] || '';
        // Apply text format to bank card number column to prevent scientific notation
        if (i === bankCardIndex && value) {
          return `<td style="mso-number-format:\\@">${value}</td>`;
        }
        return `<td>${value}</td>`;
      }).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      // Word format (as HTML)
      const bankCardIndex = headers.indexOf('银行卡号');
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers.map(h => `<th>${h}</th>`).join('')}${exportData.map(row => `<tr>${headers.map((h, i) => {
        const value = row[h] || '';
        if (i === bankCardIndex && value) {
          return `<td style="mso-number-format:\\@">${value}</td>`;
        }
        return `<td>${value}</td>`;
      }).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    // Try to use showSaveFilePicker for Chrome/Edge (allows user to choose save location)
    const fileName = `供应商管理_${new Date().toISOString().slice(0, 10)}.${extension}`;

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
        // Fallback for browsers without showSaveFilePicker
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
      // Fallback
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    // Reset states
    setExportMode(false);
    setSelectedRows([]);
    setShowExportModal(false);
  };

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">供应商管理</h1>
            <p className="text-gray-500">供应商信息管理与合作评估</p>
          </div>
        </div>
      </div>

      {/* 供应商编码生成器 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">供应商编码生成</h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">供应商编码规则：大类(2位) + 中类(2位) + 流水号(3位)，前缀 SU_</span>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">大类</label>
            <select
              value={supplierCodeGen.bigCategory}
              onChange={(e) => handleSupplierCodeGenCategoryChange('bigCategory', e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">请选择大类</option>
              {supplierCategories.map(cat => (
                <option key={cat.code} value={cat.code}>{cat.code} - {cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">中类</label>
            <select
              value={supplierCodeGen.midCategory}
              onChange={(e) => handleSupplierCodeGenCategoryChange('midCategory', e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              disabled={!supplierCodeGen.bigCategory}
            >
              <option value="">请选择中类</option>
              {getSupplierCodeGenMidCategories().map(cat => (
                <option key={cat.code} value={cat.code}>{cat.code} - {cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">生成编码</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={supplierCodeGen.generatedCode}
                placeholder="点击生成"
                className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50"
                readOnly
              />
              <button
                onClick={handleSupplierCodeGen}
                disabled={!supplierCodeGen.midCategory}
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
            onClick={() => navigate('/supplier-code-rule')}
            className="px-4 h-9 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
          >
            <Hash className="w-4 h-4" />
            编码规则
          </button>
          <button
            onClick={handleSupplierVerifyCode}
            disabled={!supplierCodeGen.generatedCode}
            className="px-4 h-9 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Search className="w-4 h-4" />
            验证重码
          </button>
          <button
            onClick={handleSupplierCopyCode}
            disabled={!supplierCodeGen.generatedCode}
            className="px-4 h-9 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            {copySuccess ? '已复制!' : '复制编码'}
          </button>
          <span className="text-xs text-gray-500">生成的编码可复制后用于新增供应商</span>
        </div>

        {/* 提示信息 */}
        {supplierCodeGenError && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{supplierCodeGenError}</p>
          </div>
        )}
        {supplierCodeGenSuccess && !supplierCodeGenError && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600">{supplierCodeGenSuccess}</p>
          </div>
        )}
      </div>

      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">供应商编号</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="请输入供应商编号"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">供应商名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入名称"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">联系人</label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="请输入联系人"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">供应物资类型</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="全部">全部</option>
              <option value="SP">SP - 种子与种苗类</option>
              <option value="FE">FE - 肥料与土壤改良类</option>
              <option value="PP">PP - 农药与植保产品类</option>
              <option value="EQ">EQ - 农业机械与设备类</option>
              <option value="FA">FA - 设施农业资材类</option>
              <option value="IR">IR - 灌溉与水肥一体化类</option>
              <option value="OP">OP - 日常劳保与劳动工具类</option>
              <option value="PH">PH - 仓储与物流资材类</option>
              <option value="TS">TS - 检测与技术服务类</option>
              <option value="UT">UT - 能源与辅助耗材类</option>
              <option value="OT">OT - 其他综合类</option>
            </select>
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option>全部</option>
              <option>合作中</option>
              <option>暂停</option>
              <option>已淘汰</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              重置
            </button>
            <button className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              <Search className="w-4 h-4" />
              搜索
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">供应商列表</h3>
          {exportMode ? (
            <div className="flex gap-2">
              <button onClick={() => setShowExportModal(true)} className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1">
                <Download className="w-4 h-4" />
                确认导出
              </button>
              <button onClick={handleCancelExport} className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                取消
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              {!batchEditMode && (
                <>
                  <button
                    onClick={() => setShowAddSupplierModal(true)}
                    className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    新增
                  </button>
                  <button
                    onClick={() => { setBatchEditMode(true); setShowEditWarning(true); }}
                    className="h-8 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => { setBatchEditMode(true); setShowDeleteWarning(true); }}
                    className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                  >
                    删除
                  </button>
                </>
              )}
              {batchEditMode && (
                <>
                  <button
                    onClick={() => { setShowBatchEditModal(true); }}
                    className="h-8 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    确认编辑
                  </button>
                  <button
                    onClick={() => { setShowBatchDeleteConfirm(true); }}
                    className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                  >
                    确认删除
                  </button>
                  <button
                    onClick={() => { setBatchEditMode(false); setSelectedRows([]); }}
                    className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    取消
                  </button>
                </>
              )}
              <button onClick={handleExportClick} className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1">
                <Download className="w-4 h-4" />
                导出
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: 'max-content' }}>
            <thead className="bg-gray-50">
              <tr>
                {(exportMode || batchEditMode) && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === suppliers.length && suppliers.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>}
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">供应商编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">所属组织</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">供应商名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">供应物资类型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">供应商属性</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">联系人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">移动电话</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工作电话</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">传真号码</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">国家</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">省份</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">城市</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">详细地址</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">开户行</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">银行卡号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">创建时间</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {suppliers.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50">
                  {(exportMode || batchEditMode) && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(supplier.id)}
                        onChange={() => handleSelectRow(supplier.id)}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm font-medium text-emerald-600 hover:text-emerald-700 cursor-pointer " onClick={() => { setSelectedSupplier(supplier); setShowDetailModal(true); }}>{supplier.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 ">{supplier.organization}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 ">{supplier.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 ">{getSupplierTypeName(supplier.supplierType)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 ">{supplier.supplierAttribute}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 ">{supplier.contact}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 ">{supplier.mobilePhone}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 ">{supplier.workPhone}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 ">{supplier.fax}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 ">{supplier.country}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 ">{supplier.province}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 ">{supplier.city}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 ">{supplier.address}</td>
                  <td className="px-4 py-3 ">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      supplier.status === '合作中' ? 'bg-green-100 text-green-700' :
                      supplier.status === '暂停' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {supplier.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 ">{supplier.bankName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 ">{supplier.bankCardNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 ">{supplier.createDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 ">{supplier.remarks}</td>
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
                  {selectedRows.length === suppliers.length ? '全不选' : '全选'}
                </button>
                <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
              </div>
            </div>
          )}
          {/* Pagination */}
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
              <span className="text-sm text-gray-500">共 {suppliers.length} 条</span>
              <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm">{currentPage} / {Math.ceil(suppliers.length / pageSize) || 1}</span>
              <button onClick={() => setCurrentPage(Math.min(Math.ceil(suppliers.length / pageSize), currentPage + 1))} disabled={currentPage >= Math.ceil(suppliers.length / pageSize)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Export Format Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowExportModal(false)}></div>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
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
                        <p className="text-sm font-medium text-gray-900">{format.label}</p>
                        <p className="text-xs text-gray-500">{format.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                <button onClick={() => setShowExportModal(false)} className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                  取消
                </button>
                <button onClick={handleConfirmExport} className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
                  导出
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 新增供应商弹窗 */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddSupplierModal(false)}></div>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-emerald-600">
                <h2 className="text-lg font-semibold text-white">新增</h2>
                <button onClick={() => setShowAddSupplierModal(false)} className="p-1 hover:bg-emerald-700 rounded">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* 所属组织 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">所属组织</label>
                    <select
                      value={newSupplier.organization}
                      onChange={(e) => setNewSupplier({...newSupplier, organization: e.target.value})}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">请选择</option>
                      <option value="宁波帮帮忙公司">宁波帮帮忙公司</option>
                      <option value="成都帮帮您公司">成都帮帮您公司</option>
                    </select>
                  </div>
                  {/* 供应商编号 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">供应商编号</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSupplier.code}
                        onChange={(e) => setNewSupplier({...newSupplier, code: e.target.value})}
                        placeholder="从编码生成器复制或手动输入"
                        className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setNewSupplier({...newSupplier, code: supplierCodeGen.generatedCode})}
                        disabled={!supplierCodeGen.generatedCode}
                        className="px-3 h-10 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        复制编码
                      </button>
                    </div>
                  </div>
                  {/* 供应商名称 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">供应商名称 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={newSupplier.name}
                      onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  {/* 供应商类型 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">供应商类型</label>
                    <select
                      value={newSupplier.supplierType}
                      onChange={(e) => setNewSupplier({...newSupplier, supplierType: e.target.value})}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">请选择</option>
                      <option value="SP">SP - 种子与种苗类</option>
                      <option value="FE">FE - 肥料与土壤改良类</option>
                      <option value="PP">PP - 农药与植保产品类</option>
                      <option value="EQ">EQ - 农业机械与设备类</option>
                      <option value="FA">FA - 设施农业资材类</option>
                      <option value="IR">IR - 灌溉与水肥一体化类</option>
                      <option value="OP">OP - 日常劳保与劳动工具类</option>
                      <option value="PH">PH - 仓储与物流资材类</option>
                      <option value="TS">TS - 检测与技术服务类</option>
                      <option value="UT">UT - 能源与辅助耗材类</option>
                      <option value="OT">OT - 其他综合类</option>
                    </select>
                  </div>
                  {/* 供应商属性 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">供应商属性</label>
                    <select
                      value={newSupplier.supplierAttribute}
                      onChange={(e) => setNewSupplier({...newSupplier, supplierAttribute: e.target.value})}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">请选择</option>
                      <option value="个人">个人</option>
                      <option value="个体户">个体户</option>
                      <option value="企业">企业</option>
                      <option value="团体">团体</option>
                      <option value="事业单位">事业单位</option>
                      <option value="网络平台">网络平台</option>
                    </select>
                  </div>
                  {/* 联系人 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">联系人</label>
                    <input
                      type="text"
                      value={newSupplier.contact}
                      onChange={(e) => setNewSupplier({...newSupplier, contact: e.target.value})}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  {/* 移动电话 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">移动电话</label>
                    <input
                      type="text"
                      value={newSupplier.mobilePhone}
                      onChange={(e) => setNewSupplier({...newSupplier, mobilePhone: e.target.value})}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  {/* 工作电话 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">工作电话</label>
                    <input
                      type="text"
                      value={newSupplier.workPhone}
                      onChange={(e) => setNewSupplier({...newSupplier, workPhone: e.target.value})}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  {/* 传真号码 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">传真号码</label>
                    <input
                      type="text"
                      value={newSupplier.fax}
                      onChange={(e) => setNewSupplier({...newSupplier, fax: e.target.value})}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  {/* 国家 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">国家</label>
                    <select
                      value={newSupplier.country}
                      onChange={(e) => setNewSupplier({...newSupplier, country: e.target.value})}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="中国">中国</option>
                    </select>
                  </div>
                  {/* 省份 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">省份</label>
                    <input
                      type="text"
                      value={newSupplier.province}
                      onChange={(e) => setNewSupplier({...newSupplier, province: e.target.value})}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  {/* 城市 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">城市</label>
                    <input
                      type="text"
                      value={newSupplier.city}
                      onChange={(e) => setNewSupplier({...newSupplier, city: e.target.value})}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  {/* 详细地址 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">详细地址</label>
                    <input
                      type="text"
                      value={newSupplier.address}
                      onChange={(e) => setNewSupplier({...newSupplier, address: e.target.value})}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  {/* 状态 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                    <select
                      value={newSupplier.status || '合作中'}
                      onChange={(e) => setNewSupplier({...newSupplier, status: e.target.value})}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="合作中">合作中</option>
                      <option value="暂停">暂停</option>
                      <option value="终止">终止</option>
                    </select>
                  </div>
                  {/* 开户行 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">开户行</label>
                    <input
                      type="text"
                      value={newSupplier.bankName}
                      onChange={(e) => setNewSupplier({...newSupplier, bankName: e.target.value})}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  {/* 银行卡号 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">银行卡号</label>
                    <input
                      type="text"
                      value={newSupplier.bankCardNumber}
                      onChange={(e) => setNewSupplier({...newSupplier, bankCardNumber: e.target.value})}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  {/* 创建时间 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">创建时间</label>
                    <input
                      type="date"
                      value={newSupplier.createDate}
                      onChange={(e) => setNewSupplier({...newSupplier, createDate: e.target.value})}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  {/* 备注 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                    <input
                      type="text"
                      value={newSupplier.remarks}
                      onChange={(e) => setNewSupplier({...newSupplier, remarks: e.target.value})}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                <button onClick={() => setShowAddSupplierModal(false)} className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                  取消
                </button>
                <button onClick={() => {
                  alert('供应商新增成功！（演示模式）');
                  setShowAddSupplierModal(false);
                }} className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-emerald-600">
              <h3 className="text-lg font-semibold text-white">供应商详情</h3>
              <button onClick={() => setShowDetailModal(false)} className="text-white hover:bg-emerald-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block">供应商编码</span>
                    <span className="text-sm font-medium text-gray-900">{selectedSupplier.code}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">所属组织</span>
                    <span className="text-sm font-medium text-gray-900">{selectedSupplier.organization}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">供应商名称</span>
                    <span className="text-sm font-medium text-gray-900">{selectedSupplier.name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">供应商类型</span>
                    <span className="text-sm font-medium text-gray-900">{getSupplierTypeName(selectedSupplier.supplierType)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">供应商属性</span>
                    <span className="text-sm font-medium text-gray-900">{selectedSupplier.supplierAttribute}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">联系人</span>
                    <span className="text-sm font-medium text-gray-900">{selectedSupplier.contact}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">移动电话</span>
                    <span className="text-sm font-medium text-gray-900">{selectedSupplier.mobilePhone}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">工作电话</span>
                    <span className="text-sm font-medium text-gray-900">{selectedSupplier.workPhone || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">传真号码</span>
                    <span className="text-sm font-medium text-gray-900">{selectedSupplier.fax || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">国家</span>
                    <span className="text-sm font-medium text-gray-900">{selectedSupplier.country}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">省份</span>
                    <span className="text-sm font-medium text-gray-900">{selectedSupplier.province}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">城市</span>
                    <span className="text-sm font-medium text-gray-900">{selectedSupplier.city}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">详细地址</span>
                    <span className="text-sm font-medium text-gray-900">{selectedSupplier.address}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">状态</span>
                    <span className={`text-sm font-medium ${selectedSupplier.status === '合作中' ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedSupplier.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">开户行</span>
                    <span className="text-sm font-medium text-gray-900">{selectedSupplier.bankName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">银行卡号</span>
                    <span className="text-sm font-medium text-gray-900">{selectedSupplier.bankCardNumber || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">创建时间</span>
                    <span className="text-sm font-medium text-gray-900">{selectedSupplier.createDate}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">备注</span>
                    <span className="text-sm font-medium text-gray-900">{selectedSupplier.remarks || '-'}</span>
                  </div>
                </div>
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
                <li>该供应商的历史交易记录可能无法追溯</li>
                <li>已生成的入库单据数据可能不一致</li>
                <li>相关的统计报表数据可能需要重新核算</li>
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
                <li>所有选中的供应商将被永久删除</li>
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

      {/* Edit Modal */}
      {showEditModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-600 sticky top-0">
              <h3 className="text-lg font-semibold text-white">编辑供应商</h3>
              <button onClick={() => setShowEditModal(false)} className="text-white hover:bg-blue-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {/* 编辑表单 - 紧凑布局 */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* 第1行：供应商编号（只读）+ 所属组织 + 供应商名称 */}
                <div className="bg-gray-100 rounded-lg p-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">供应商编号</label>
                  <div className="text-sm font-medium text-gray-900">{selectedSupplier.code}</div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">所属组织</label>
                  <select
                    value={editForm.organization}
                    onChange={(e) => setEditForm({ ...editForm, organization: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">请选择</option>
                    <option value="宁波帮帮忙公司">宁波帮帮忙公司</option>
                    <option value="成都帮帮您公司">成都帮帮您公司</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">供应商名称 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* 第2行：供应物资类型 + 供应商属性 */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">供应物资类型 <span className="text-red-500">*</span></label>
                  <select
                    value={editForm.supplierType}
                    onChange={(e) => setEditForm({ ...editForm, supplierType: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  >
                    {supplierCategories.map(cat => (
                      <option key={cat.code} value={cat.code}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">供应商属性</label>
                  <select
                    value={editForm.supplierAttribute}
                    onChange={(e) => setEditForm({ ...editForm, supplierAttribute: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">请选择</option>
                    <option value="个人">个人</option>
                    <option value="个体户">个体户</option>
                    <option value="企业">企业</option>
                    <option value="团体">团体</option>
                    <option value="事业单位">事业单位</option>
                    <option value="网络平台">网络平台</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">联系人 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={editForm.contact}
                    onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* 第3行：移动电话 + 工作电话 + 传真号码 */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">移动电话 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={editForm.mobilePhone}
                    onChange={(e) => setEditForm({ ...editForm, mobilePhone: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">工作电话</label>
                  <input
                    type="text"
                    value={editForm.workPhone}
                    onChange={(e) => setEditForm({ ...editForm, workPhone: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">传真号码</label>
                  <input
                    type="text"
                    value={editForm.fax}
                    onChange={(e) => setEditForm({ ...editForm, fax: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* 第4行：国家 + 省份 + 城市 */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">国家</label>
                  <input
                    type="text"
                    value={editForm.country}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">省份</label>
                  <input
                    type="text"
                    value={editForm.province}
                    onChange={(e) => setEditForm({ ...editForm, province: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">城市</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* 第5行：详细地址（占2列）+ 开户行 */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">详细地址</label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">开户行</label>
                  <input
                    type="text"
                    value={editForm.bankName}
                    onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* 第6行：银行卡号 + 状态 + 创建时间 */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">银行卡号</label>
                  <input
                    type="text"
                    value={editForm.bankCardNumber}
                    onChange={(e) => setEditForm({ ...editForm, bankCardNumber: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">状态</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="合作中">合作中</option>
                    <option value="暂停">暂停</option>
                    <option value="终止">终止</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">创建时间</label>
                  <input
                    type="text"
                    value={editForm.createDate}
                    readOnly
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                  />
                </div>

                {/* 第7行：最后编辑人 + 最后编辑时间 */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">最后编辑人</label>
                  <input
                    type="text"
                    value={editForm.lastEditBy || '-'}
                    readOnly
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">最后编辑时间</label>
                  <input
                    type="text"
                    value={editForm.lastEditTime || '-'}
                    readOnly
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                  />
                </div>

                {/* 第8行：备注（占满） */}
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">备注</label>
                  <input
                    type="text"
                    value={editForm.remarks}
                    onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
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
                  <h4 className="text-sm font-medium text-gray-900">修改供应商信息可能造成数据错乱</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    您正在修改供应商信息，这些修改将影响之前已使用的历史数据，可能导致数据不一致。
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <ul className="text-sm text-gray-600 space-y-1">
                  {editForm.name !== selectedSupplier.name && (
                    <li>• 供应商名称：{selectedSupplier.name} → {editForm.name}</li>
                  )}
                  {editForm.supplierType !== selectedSupplier.supplierType && (
                    <li>• 供应商类型：{getSupplierTypeName(selectedSupplier.supplierType)} → {getSupplierTypeName(editForm.supplierType)}</li>
                  )}
                  {editForm.contact !== selectedSupplier.contact && (
                    <li>• 联系人：{selectedSupplier.contact} → {editForm.contact}</li>
                  )}
                  {editForm.mobilePhone !== selectedSupplier.mobilePhone && (
                    <li>• 手机号码：{selectedSupplier.mobilePhone} → {editForm.mobilePhone}</li>
                  )}
                  {editForm.province !== selectedSupplier.province && (
                    <li>• 省份：{selectedSupplier.province} → {editForm.province}</li>
                  )}
                  {editForm.city !== selectedSupplier.city && (
                    <li>• 城市：{selectedSupplier.city} → {editForm.city}</li>
                  )}
                  {editForm.status !== selectedSupplier.status && (
                    <li>• 状态：{selectedSupplier.status} → {editForm.status}</li>
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
                    const now = new Date().toLocaleString('zh-CN');
                    const updatedForm = {
                      ...editForm,
                      lastEditBy: '管理员',
                      lastEditTime: now
                    };
                    console.log('Saving supplier edit:', { id: selectedSupplier.id, ...updatedForm });
                    setEditForm(updatedForm);
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

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-red-600">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                删除确认
              </h3>
              <button onClick={() => setShowDeleteConfirm(false)} className="text-white hover:bg-red-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900">警告：删除此供应商将造成严重后果！</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    您正在删除供应商：<strong>{selectedSupplier.name}</strong>（{selectedSupplier.code}）
                  </p>
                  <ul className="text-sm text-red-500 mt-2 space-y-1">
                    <li>• 此供应商的所有入库记录将无法追溯</li>
                    <li>• 历史采购数据将不完整</li>
                    <li>• 可能导致库存数据错乱</li>
                    <li>• 已生成的编码将永久失效</li>
                  </ul>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                此操作不可撤销！请确认是否继续删除？
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 h-10 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    console.log('Deleting supplier:', selectedSupplier);
                    setShowDeleteConfirm(false);
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

      {/* Batch Edit Modal */}
      {showBatchEditModal && (() => {
        const selectedSuppliersList = suppliers.filter(s => selectedRows.includes(s.id));
        const currentSupplierId = selectedRows[currentBatchEditIndex];
        const currentSupplier = selectedSuppliersList.find(s => s.id === currentSupplierId);
        const currentEditedData = batchEditedSuppliers[currentSupplierId] || currentSupplier || {};
        const editedCount = Object.keys(batchEditedSuppliers).length;

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-600 sticky top-0">
                <h3 className="text-lg font-semibold text-white">批量编辑供应商</h3>
                <button onClick={() => { setShowBatchEditModal(false); setBatchEditedSuppliers({}); setCurrentBatchEditIndex(0); }} className="text-white hover:bg-blue-700 p-1 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">已选择 <strong>{selectedRows.length}</strong> 个供应商进行批量编辑，已编辑 <strong>{editedCount}</strong> 个</p>
                </div>

                {/* 供应商选择下拉 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">选择供应商</label>
                  <select
                    value={currentSupplierId || ''}
                    onChange={(e) => {
                      const idx = selectedRows.indexOf(Number(e.target.value));
                      setCurrentBatchEditIndex(idx >= 0 ? idx : 0);
                    }}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  >
                    {selectedSuppliersList.map((supplier, idx) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name} ({supplier.code}) {batchEditedSuppliers[supplier.id] ? '✓ 已编辑' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 编辑表单 - 紧凑布局2-3列 */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {/* 第1行：供应商编号（只读）+ 所属组织 + 供应商名称 */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">供应商编号</div>
                    <div className="text-sm font-medium text-gray-900">{currentEditedData.code}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">所属组织</label>
                    <select
                      value={currentEditedData.organization || ''}
                      onChange={(e) => setBatchEditedSuppliers({
                        ...batchEditedSuppliers,
                        [currentSupplierId]: { ...currentEditedData, organization: e.target.value }
                      })}
                      className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value="">请选择</option>
                      <option value="宁波帮帮忙公司">宁波帮帮忙公司</option>
                      <option value="成都帮帮您公司">成都帮帮您公司</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">供应商名称</label>
                    <input
                      type="text"
                      value={currentEditedData.name || ''}
                      onChange={(e) => setBatchEditedSuppliers({
                        ...batchEditedSuppliers,
                        [currentSupplierId]: { ...currentEditedData, name: e.target.value }
                      })}
                      className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* 第2行：供应物资类型 + 供应商属性 + 联系人 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">供应物资类型</label>
                    <select
                      value={currentEditedData.supplierType || ''}
                      onChange={(e) => setBatchEditedSuppliers({
                        ...batchEditedSuppliers,
                        [currentSupplierId]: { ...currentEditedData, supplierType: e.target.value }
                      })}
                      className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    >
                      {supplierCategories.map(cat => (
                        <option key={cat.code} value={cat.code}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">供应商属性</label>
                    <select
                      value={currentEditedData.supplierAttribute || ''}
                      onChange={(e) => setBatchEditedSuppliers({
                        ...batchEditedSuppliers,
                        [currentSupplierId]: { ...currentEditedData, supplierAttribute: e.target.value }
                      })}
                      className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value="">请选择</option>
                      <option value="个人">个人</option>
                      <option value="个体户">个体户</option>
                      <option value="企业">企业</option>
                      <option value="团体">团体</option>
                      <option value="事业单位">事业单位</option>
                      <option value="网络平台">网络平台</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">联系人</label>
                    <input
                      type="text"
                      value={currentEditedData.contact || ''}
                      onChange={(e) => setBatchEditedSuppliers({
                        ...batchEditedSuppliers,
                        [currentSupplierId]: { ...currentEditedData, contact: e.target.value }
                      })}
                      className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* 第3行：移动电话 + 工作电话 + 传真号码 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">移动电话</label>
                    <input
                      type="text"
                      value={currentEditedData.mobilePhone || ''}
                      onChange={(e) => setBatchEditedSuppliers({
                        ...batchEditedSuppliers,
                        [currentSupplierId]: { ...currentEditedData, mobilePhone: e.target.value }
                      })}
                      className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">工作电话</label>
                    <input
                      type="text"
                      value={currentEditedData.workPhone || ''}
                      onChange={(e) => setBatchEditedSuppliers({
                        ...batchEditedSuppliers,
                        [currentSupplierId]: { ...currentEditedData, workPhone: e.target.value }
                      })}
                      className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">传真号码</label>
                    <input
                      type="text"
                      value={currentEditedData.fax || ''}
                      onChange={(e) => setBatchEditedSuppliers({
                        ...batchEditedSuppliers,
                        [currentSupplierId]: { ...currentEditedData, fax: e.target.value }
                      })}
                      className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* 第4行：国家 + 省份 + 城市 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">国家</label>
                    <input
                      type="text"
                      value={currentEditedData.country || ''}
                      onChange={(e) => setBatchEditedSuppliers({
                        ...batchEditedSuppliers,
                        [currentSupplierId]: { ...currentEditedData, country: e.target.value }
                      })}
                      className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">省份</label>
                    <input
                      type="text"
                      value={currentEditedData.province || ''}
                      onChange={(e) => setBatchEditedSuppliers({
                        ...batchEditedSuppliers,
                        [currentSupplierId]: { ...currentEditedData, province: e.target.value }
                      })}
                      className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">城市</label>
                    <input
                      type="text"
                      value={currentEditedData.city || ''}
                      onChange={(e) => setBatchEditedSuppliers({
                        ...batchEditedSuppliers,
                        [currentSupplierId]: { ...currentEditedData, city: e.target.value }
                      })}
                      className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* 第5行：详细地址（占2列）+ 状态 */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">详细地址</label>
                    <input
                      type="text"
                      value={currentEditedData.address || ''}
                      onChange={(e) => setBatchEditedSuppliers({
                        ...batchEditedSuppliers,
                        [currentSupplierId]: { ...currentEditedData, address: e.target.value }
                      })}
                      className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">状态</label>
                    <select
                      value={currentEditedData.status || ''}
                      onChange={(e) => setBatchEditedSuppliers({
                        ...batchEditedSuppliers,
                        [currentSupplierId]: { ...currentEditedData, status: e.target.value }
                      })}
                      className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value="合作中">合作中</option>
                      <option value="暂停">暂停</option>
                      <option value="终止">终止</option>
                    </select>
                  </div>

                  {/* 第6行：开户行 + 银行卡号 + 创建时间 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">开户行</label>
                    <input
                      type="text"
                      value={currentEditedData.bankName || ''}
                      onChange={(e) => setBatchEditedSuppliers({
                        ...batchEditedSuppliers,
                        [currentSupplierId]: { ...currentEditedData, bankName: e.target.value }
                      })}
                      className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">银行卡号</label>
                    <input
                      type="text"
                      value={currentEditedData.bankCardNumber || ''}
                      onChange={(e) => setBatchEditedSuppliers({
                        ...batchEditedSuppliers,
                        [currentSupplierId]: { ...currentEditedData, bankCardNumber: e.target.value }
                      })}
                      className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">创建时间</label>
                    <input
                      type="text"
                      value={currentEditedData.createDate || ''}
                      readOnly
                      className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs bg-gray-50 text-gray-500"
                    />
                  </div>

                  {/* 第7行：备注（占2列）+ 最后修改人 + 最后修改时间 */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">备注</label>
                    <input
                      type="text"
                      value={currentEditedData.remarks || ''}
                      onChange={(e) => setBatchEditedSuppliers({
                        ...batchEditedSuppliers,
                        [currentSupplierId]: { ...currentEditedData, remarks: e.target.value }
                      })}
                      className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">最后修改人</label>
                    <input
                      type="text"
                      value="管理员"
                      readOnly
                      className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs bg-gray-50 text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">最后修改时间</label>
                    <input
                      type="text"
                      value={new Date().toLocaleString('zh-CN')}
                      readOnly
                      className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      // 确认当前供应商编辑，切换到下一个
                      const nextIndex = currentBatchEditIndex + 1;
                      if (nextIndex < selectedRows.length) {
                        setCurrentBatchEditIndex(nextIndex);
                      } else {
                        // 已是最后一个，保持在当前位置
                        setCurrentBatchEditIndex(0);
                      }
                    }}
                    className="flex-1 h-10 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    确认 {currentBatchEditIndex + 1 < selectedRows.length ? '(下一个)' : '(已最后一个)'}
                  </button>
                  <button
                    onClick={() => {
                      console.log('Saving all batch edits:', batchEditedSuppliers);
                      setShowBatchEditModal(false);
                      setBatchEditMode(false);
                      setSelectedRows([]);
                      setBatchEditedSuppliers({});
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
                  <h4 className="text-sm font-medium text-gray-900">警告：批量删除供应商将造成严重后果！</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    您正在删除 <strong>{selectedRows.length}</strong> 个供应商
                  </p>
                  <ul className="text-sm text-red-500 mt-2 space-y-1">
                    <li>• 所有选中的供应商将被永久删除</li>
                    <li>• 相关的入库记录也将被删除</li>
                    <li>• 历史数据将无法恢复</li>
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
                    console.log('Batch deleting suppliers:', selectedRows);
                    setShowBatchDeleteConfirm(false);
                    setBatchEditMode(false);
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
    </div>
  );
}
