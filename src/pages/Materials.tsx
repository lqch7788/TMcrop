import { useState } from 'react';
import { Package, Search, Download, Eye, Edit, ChevronLeft, ChevronRight, ChevronDown, ChevronsLeft, ChevronsRight, AlertTriangle, Plus, RefreshCw } from 'lucide-react';
import AddInboundModal from '../components/materials/AddInboundModal';
import { ExportFormatModal } from '../components/materials/ExportFormatModal';
import { useAuthPermission } from '../hooks/usePermission';

const warehouseMaterials = [
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

const inboundRecords = [
  { id: 1, code: 'RK20260315-001', materialCode: 'SP0103001', materialName: '番茄种子', quantity: 100, unit: '袋', supplier: '鑫源农资公司', inboundDate: '2026-03-15', operator: '张伟民', status: 'completed' },
  { id: 2, code: 'RK20260314-002', materialCode: 'SP0201001', materialName: '商品有机肥', quantity: 50, unit: '袋', supplier: '丰达化肥厂', inboundDate: '2026-03-14', operator: '李明轩', status: 'completed' },
  { id: 3, code: 'RK20260313-003', materialCode: 'SP0302001', materialName: '多菌灵', quantity: 20, unit: '箱', supplier: '绿叶农业用品店', inboundDate: '2026-03-13', operator: '王建国', status: 'completed' },
  { id: 4, code: 'RK20260312-004', materialCode: 'SP0101001', materialName: '水稻种子', quantity: 200, unit: '袋', supplier: '金种子业公司', inboundDate: '2026-03-12', operator: '张伟民', status: 'completed' },
  { id: 5, code: 'RK20260311-005', materialCode: 'SP0102001', materialName: '棉花种子', quantity: 80, unit: '袋', supplier: '丰收种业', inboundDate: '2026-03-11', operator: '李明轩', status: 'completed' },
  { id: 6, code: 'RK20260310-006', materialCode: 'SP0202001', materialName: '尿素', quantity: 150, unit: '袋', supplier: '丰达化肥厂', inboundDate: '2026-03-10', operator: '王建国', status: 'completed' },
  { id: 7, code: 'RK20260309-007', materialCode: 'SP0301001', materialName: '吡虫啉', quantity: 30, unit: '箱', supplier: '绿叶农业用品店', inboundDate: '2026-03-09', operator: '张伟民', status: 'completed' },
  { id: 8, code: 'RK20260308-008', materialCode: 'EQ0103001', materialName: '电动喷雾机', quantity: 10, unit: '台', supplier: '农机设备公司', inboundDate: '2026-03-08', operator: '李明轩', status: 'completed' },
  { id: 9, code: 'RK20260307-009', materialCode: 'EQ0306001', materialName: '滴灌带', quantity: 500, unit: '卷', supplier: '节水灌溉设备厂', inboundDate: '2026-03-07', operator: '王建国', status: 'completed' },
  { id: 10, code: 'RK20260306-010', materialCode: 'OP0102001', materialName: '劳保胶靴', quantity: 40, unit: '双', supplier: '劳保用品商店', inboundDate: '2026-03-06', operator: '张伟民', status: 'completed' },
  { id: 11, code: 'RK20260305-011', materialCode: 'OP0201001', materialName: '锄头', quantity: 25, unit: '把', supplier: '五金工具店', inboundDate: '2026-03-05', operator: '李明轩', status: 'completed' },
  { id: 12, code: 'RK20260304-012', materialCode: 'PH0104001', materialName: '塑料袋', quantity: 200, unit: '卷', supplier: '包装材料公司', inboundDate: '2026-03-04', operator: '王建国', status: 'completed' },
  { id: 13, code: 'RK20260303-013', materialCode: 'IT0101001', materialName: '土壤温湿度传感器', quantity: 20, unit: '个', supplier: '智慧农业设备商', inboundDate: '2026-03-03', operator: '张伟民', status: 'completed' },
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

export default function Materials() {
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);

  // 权限检查 - 物料库存管理模块
  const { can } = useAuthPermission();
  const canCreate = can('PROC_MATERIALS', 'create');
  const canEdit = can('PROC_MATERIALS', 'edit');
  const canDelete = can('PROC_MATERIALS', 'delete');
  const canExport = can('PROC_MATERIALS', 'export');

  const [newInbound, setNewInbound] = useState({
    orderCode: '',
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
  const [codeGenCollapsed, setCodeGenCollapsed] = useState(true); // 默认折叠

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
    setSelectedRows([]);
  };

  const handleDoExport = async () => {
    const selectedData = filteredMaterials.filter(m => selectedRows.includes(m.id));
    const exportData = selectedData.map(m => ({
      '物料编号': m.code,
      '物料名称': m.name,
      '分类': m.category,
      '单位': m.unit,
      '库存数量': m.quantity,
      '最低库存': m.minStock,
      '单价': m.price,
      '供应商': m.supplier,
      '存放位置': m.location,
    }));

    const headers = ['物料编号', '物料名称', '分类', '单位', '库存数量', '最低库存', '单价', '供应商', '存放位置'];

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

  const getMidCategories = () => {
    if (!newInbound.bigCategory) return [];
    const bigCat = categoryConfig[newInbound.bigCategory as keyof typeof categoryConfig];
    if (!bigCat) return [];
    return Object.entries(bigCat.categories).map(([code, data]) => ({
      code,
      name: data.name,
    }));
  };

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
    checkCodeDuplicate(fullCode);
  };

  const checkCodeDuplicate = (code: string) => {
    if (!code) return;
    const exists = warehouseMaterials.some(m => m.code === code);
    if (exists) {
      setCodeError('该物料编码已存在，请重新选择分类');
    } else {
      setCodeError('');
    }
  };

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
    if (codeError || nameError) return;
    if (!newInbound.materialCode || !newInbound.materialName || !newInbound.quantity) return;

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
      remarks: '',
    });
    setCodeError('');
    setNameError('');
  };

  return (
    <div className="space-y-6">
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
                showLowStock ? 'bg-red-100 text-red-700' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">库存不足</span>
              <span className="bg-red-500 text-white text-sm px-2 py-0.5 rounded-full">{lowStockCount}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => { setActiveTab('overview'); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'overview' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          库存总览
        </button>
        <button
          onClick={() => { setActiveTab('inbound'); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'inbound' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          物料入库
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
            <div className="grid grid-cols-8 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">物料编号</label>
                <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="请输入" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">物料名称</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="请输入" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
                <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
                  <option value="">全部</option>
                  {warehouseMaterials.map(m => m.supplier).filter((v, i, a) => a.indexOf(v) === i).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">存放位置</label>
                <select value={location} onChange={(e) => setLocation(e.target.value)} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
                  <option value="">全部</option>
                  {warehouseMaterials.map(m => m.location).filter((v, i, a) => a.indexOf(v) === i).map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">大类</label>
                <select value={searchBigCategory} onChange={(e) => { setSearchBigCategory(e.target.value); setSearchMidCategory(''); setSearchSubCategory(''); }} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
                  <option value="">全部</option>
                  {getSearchBigCategories().map(cat => (
                    <option key={cat.code} value={cat.code}>{cat.code} - {cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">中类</label>
                <select value={searchMidCategory} onChange={(e) => { setSearchMidCategory(e.target.value); setSearchSubCategory(''); }} disabled={!searchBigCategory} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100">
                  <option value="">全部</option>
                  {getSearchMidCategories().map(cat => (
                    <option key={cat.code} value={cat.code}>{cat.code} - {cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">小类</label>
                <select value={searchSubCategory} onChange={(e) => setSearchSubCategory(e.target.value)} disabled={!searchMidCategory} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100">
                  <option value="">全部</option>
                  {getSearchSubCategories().map(cat => (
                    <option key={cat.code} value={cat.code}>{cat.code} - {cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-1 flex items-end">
                <button onClick={() => { setCode(''); setName(''); setCategory('全部'); setSupplier(''); setLocation(''); setSearchBigCategory(''); setSearchMidCategory(''); setSearchSubCategory(''); setShowLowStock(false); setCurrentPage(1); }} className="w-full h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-2">
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
                  <button onClick={handleLowStockClick} className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1">
                    <span>显示全部</span>
                  </button>
                )}
                {exportMode ? (
                  <div className="flex gap-2">
                    <button onClick={handleConfirmExport} className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1">
                      <Download className="w-4 h-4" />
                      确认导出
                    </button>
                    <button onClick={handleCancelExport} className="h-9 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                      取消
                    </button>
                  </div>
                ) : (
                  canExport && (
                  <button onClick={handleExportClick} className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    导出
                  </button>
                )
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {exportMode && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-12">
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
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">单位</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">库存数量</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">最低库存</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">单价</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">供应商</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">存放位置</th>
                    {!exportMode && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMaterials.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      {exportMode && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(item.id)}
                            onChange={() => handleSelectRow(item.id)}
                            className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.code}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.unit}</td>
                      <td className="px-4 py-3 text-sm"><span className={`font-medium ${item.quantity < item.minStock ? 'text-red-600' : 'text-gray-900'}`}>{item.quantity}</span></td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.minStock}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.price}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.supplier}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.location}</td>
                      {!exportMode && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {can.can('PROC_MATERIALS', 'view') && (
                              <button className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="查看"><Eye className="w-4 h-4" /></button>
                            )}
                            {canEdit && (
                              <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="编辑"><Edit className="w-4 h-4" /></button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {exportMode && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-4">
                    <button onClick={handleSelectAll} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                      {selectedRows.length === filteredMaterials.length ? '全不选' : '全选'}
                    </button>
                    <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">每页</span>
                  <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="px-2 py-1 border border-gray-200 rounded text-sm">
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-sm text-gray-500">条</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">共 {filteredMaterials.length} 条</span>
                  <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="text-sm">{currentPage} / {Math.ceil(filteredMaterials.length / pageSize) || 1}</span>
                  <button onClick={() => setCurrentPage(Math.min(Math.ceil(filteredMaterials.length / pageSize), currentPage + 1))} disabled={currentPage >= Math.ceil(filteredMaterials.length / pageSize)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'inbound' && (
        <>
          {/* 供应商编码生成器 */}
          {codeGenCollapsed ? (
            <div className="bg-white rounded-xl shadow-sm p-3 inline-flex items-center gap-2">
              <button
                onClick={() => setCodeGenCollapsed(!codeGenCollapsed)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title={codeGenCollapsed ? '展开' : '收起'}
              >
                <ChevronRight className="w-5 h-5 text-gray-600 font-bold" />
              </button>
              <h3 className="text-sm font-semibold text-gray-900">物料编码生成</h3>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setCodeGenCollapsed(!codeGenCollapsed)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title={codeGenCollapsed ? '展开' : '收起'}
                >
                  <ChevronDown className="w-6 h-6 text-gray-600 font-bold" />
                </button>
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
          )}

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">物料入库记录</h3>
              {canCreate && (
              <button onClick={() => setShowAddModal(true)} className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
                <Plus className="w-4 h-4" /> 新增入库
              </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">入库单号</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">物料编号</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">物料名称</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">入库数量</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">供应商</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">入库日期</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作员</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inboundRecords.slice((inboundPage - 1) * inboundPageSize, inboundPage * inboundPageSize).map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.code}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{record.materialCode}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{record.materialName}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{record.quantity}{record.unit}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{record.supplier}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{record.inboundDate}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{record.operator}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${record.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {record.status === 'completed' ? '已完成' : '待审核'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {can.can('PROC_MATERIALS', 'view') && (
                            <button className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="查看"><Eye className="w-4 h-4" /></button>
                          )}
                          {canEdit && (
                            <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="编辑"><Edit className="w-4 h-4" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
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

      {/* 新增入库弹窗 */}
      <AddInboundModal
        show={showAddModal}
        newInbound={newInbound}
        codeError={codeError}
        nameError={nameError}
        inboundRecords={inboundRecords}
        onClose={handleCloseModal}
        onSave={handleSaveInbound}
        onNewInboundChange={(field: string, value: string) => setNewInbound({ ...newInbound, [field]: value })}
        onGenerateOrderCode={generateOrderCode}
        onCheckCodeDuplicate={checkCodeDuplicate}
        onCheckNameDuplicate={checkNameDuplicate}
      />

      {/* 导出格式选择弹窗 */}
      <ExportFormatModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        exportFormat={exportFormat}
        selectedRowsCount={selectedRows.length}
        onExportFormatChange={setExportFormat}
        onDoExport={handleDoExport}
      />
    </div>
  );
}
