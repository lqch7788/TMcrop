import { useState } from 'react';
import { ArrowLeftRight, Plus, Search, Eye, Edit, ChevronLeft, ChevronRight, Download, Trash2, ChevronDown, ChevronRight as ChevronRightIcon, AlertTriangle, X } from 'lucide-react';

// 物料明细类型
interface MaterialItem {
  materialCode: string;
  materialName: string;
  spec: string;
  unit: string;
  quantity: number;
  reason: string;
}

// 编码规则配置：大类(2位字母) + 中类(2位数字) + 小类(2位数字) + 顺序号(3位数字)
const categoryConfig = {
  // 大类：SP = 生产投入类
  'SP': { name: '生产投入类', categories: {
    '01': { name: '种质资源', subCategories: {
      '01': { name: '粮食作物种子' },
      '02': { name: '经济作物种子' },
      '03': { name: '蔬菜种子' },
      '04': { name: '蔬菜种苗' },
      '05': { name: '水果苗木种苗' },
      '06': { name: '水果苗木种子' },
      '07': { name: '花卉与观赏植物' },
      '08': { name: '食用菌菌种' },
      '99': { name: '其他种质资源' },
    }},
    '02': { name: '肥料与土壤改良剂', subCategories: {
      '01': { name: '有机肥' },
      '02': { name: '化学肥料' },
      '03': { name: '水溶肥' },
      '04': { name: '叶面肥' },
      '05': { name: '微生物菌剂' },
      '06': { name: '土壤调理剂' },
      '07': { name: '育苗基质' },
      '99': { name: '其他类型' },
    }},
    '03': { name: '农药与植保产品', subCategories: {
      '01': { name: '杀虫剂' },
      '02': { name: '杀菌剂' },
      '03': { name: '杀螨剂' },
      '04': { name: '除草剂' },
      '05': { name: '植物生长调节剂' },
      '06': { name: '物理防控用品' },
      '07': { name: '生物农药' },
      '99': { name: '其他类型' },
    }},
  }},
  // 大类：EQ = 设施与装备类
  'EQ': { name: '设施与装备类', categories: {
    '01': { name: '农业机械', subCategories: {
      '01': { name: '耕作机械' },
      '02': { name: '播种/移栽设备' },
      '03': { name: '植保机械' },
      '04': { name: '收获机械' },
      '05': { name: '初加工设备' },
      '99': { name: '其他相关机械' },
    }},
    '02': { name: '设施农业系统', subCategories: {
      '01': { name: '骨架结构材料' },
      '02': { name: '覆盖材料' },
      '03': { name: '通风降温设备' },
      '04': { name: '加温设备' },
      '05': { name: '补光系统' },
      '06': { name: '自动化控制设备' },
      '99': { name: '其他相关设施设备' },
    }},
    '03': { name: '灌溉与水肥系统', subCategories: {
      '01': { name: '水源与泵站' },
      '02': { name: '水肥一体机' },
      '03': { name: '输水管网' },
      '04': { name: '过滤系统' },
      '05': { name: '施肥装置' },
      '06': { name: '灌溉终端' },
      '99': { name: '其他相关灌溉系统设备' },
    }},
  }},
  // 大类：OP = 作业支持类
  'OP': { name: '作业支持类', categories: {
    '01': { name: '劳保与防护用品', subCategories: {
      '01': { name: '手部防护' },
      '02': { name: '足部防护' },
      '03': { name: '身体防护' },
      '04': { name: '呼吸/眼部防护' },
      '05': { name: '防晒防暑用品' },
      '99': { name: '其他劳保防护类' },
    }},
    '02': { name: '日常劳动工具', subCategories: {
      '01': { name: '手动农具' },
      '02': { name: '修剪工具' },
      '03': { name: '小型电动工具' },
      '04': { name: '清洁工具' },
      '05': { name: '小型运输车' },
      '99': { name: '其他劳动工具' },
    }},
    '03': { name: '标识与记录用品', subCategories: {
      '01': { name: '田间标牌/标签' },
      '02': { name: '记录本、记号笔' },
      '03': { name: '二维码/RFID标签' },
      '99': { name: '其他标识记录用品' },
    }},
  }},
  // 大类：PH = 采后处理与流通类
  'PH': { name: '采后处理与流通类', categories: {
    '01': { name: '采收容器', subCategories: {
      '01': { name: '塑料周转箱' },
      '02': { name: '采摘篮/筐' },
      '03': { name: '吨袋/编织袋' },
      '04': { name: '包装材料' },
      '05': { name: '纸箱' },
      '06': { name: '泡沫网套/隔板' },
      '07': { name: '胶带、封口耗材' },
      '08': { name: '商品标签/追溯标签' },
      '99': { name: '其他采收材料' },
    }},
    '02': { name: '冷链与仓储设备', subCategories: {
      '01': { name: '预冷库/冷藏库' },
      '02': { name: '冷藏运输设备' },
      '03': { name: '保温箱、冰袋' },
      '99': { name: '其他' },
    }},
  }},
  // 大类：IT = 数字化与管理类
  'IT': { name: '数字化与管理类', categories: {
    '01': { name: '监测设备', subCategories: {
      '01': { name: '空气/土壤/光照等传感器' },
      '02': { name: '手持检测类设备' },
      '03': { name: '气象站' },
      '04': { name: '虫情测报灯' },
      '05': { name: '视频监控设备' },
      '99': { name: '其他检测相关设备' },
    }},
    '02': { name: '控制设备', subCategories: {
      '01': { name: '环境参数感知设备' },
      '02': { name: '执行控制设备' },
      '03': { name: '人机交互与本地操作设备' },
      '04': { name: '通信与联网设备' },
      '05': { name: '电源与辅助控制设备' },
      '99': { name: '其他相关控制设备' },
    }},
  }},
  // 大类：EC = 能源与通用耗材
  'EC': { name: '能源与通用耗材', categories: {
    '01': { name: '能源类', subCategories: {
      '01': { name: '柴油/汽油' },
      '02': { name: '电力' },
      '03': { name: '太阳能板及配件' },
      '99': { name: '其他能源类' },
    }},
    '02': { name: '通用耗材', subCategories: {
      '01': { name: '润滑油脂' },
      '02': { name: '清洁剂' },
      '99': { name: '其他通用耗材' },
    }},
  }},
};

// 根据物料编码获取物料分类名称
const getCategoryByCode = (code: string): string => {
  if (!code || code.length < 6) return '未知分类';
  const type = code.substring(0, 2);
  const category = code.substring(2, 4);
  const subCategory = code.substring(4, 6);

  const typeConfig = categoryConfig[type as keyof typeof categoryConfig];
  if (!typeConfig) return '未知分类';

  const categoryInfo = typeConfig.categories[category as keyof typeof typeConfig.categories];
  if (!categoryInfo) return '未知分类';

  const subCategoryInfo = categoryInfo.subCategories[subCategory as keyof typeof categoryInfo.subCategories];
  if (!subCategoryInfo) return '未知分类';

  return subCategoryInfo.name;
};

// 模拟数据
const mockReturns = [
  { id: 1, code: 'TL20240301001', date: '2024-03-05', type: '生产退料', applicant: '李建国', department: '生产部', warehouseLocation: 'A区-01', status: '已完成', statusClass: 'completed', remark: '', materials: [
    { materialCode: 'SP0103001', materialName: '番茄种子', spec: '50g/袋', unit: '袋', quantity: 5, reason: '质量问题' },
    { materialCode: 'SP0201001', materialName: '商品有机肥', spec: '50kg/袋', unit: '袋', quantity: 10, reason: '规格不符' },
  ]},
  { id: 2, code: 'TL20240302001', date: '2024-03-08', type: '生产退料', applicant: '王建华', department: '种植部', warehouseLocation: 'B区-03', status: '待审批', statusClass: 'pending', remark: '', materials: [
    { materialCode: 'SP0302001', materialName: '多菌灵', spec: '100g/瓶', unit: '箱', quantity: 3, reason: '过期产品' },
  ]},
  { id: 3, code: 'TL20240303001', date: '2024-03-10', type: '生产退料', applicant: '李建国', department: '生产部', warehouseLocation: 'A区-02', status: '已审批', statusClass: 'approved', remark: '', materials: [
    { materialCode: 'EQ0202001', materialName: 'PO膜', spec: '2m×100m', unit: '㎡', quantity: 50, reason: '运输损坏' },
    { materialCode: 'SP0301001', materialName: '吡虫啉', spec: '10g×10袋/盒', unit: '盒', quantity: 20, reason: '库存积压' },
  ]},
  { id: 4, code: 'TL20240304001', date: '2024-03-12', type: '生产退料', applicant: '张建华', department: '设备部', warehouseLocation: 'C区-05', status: '已完成', statusClass: 'completed', remark: '', materials: [
    { materialCode: 'SP0202001', materialName: '尿素', spec: '50kg/袋', unit: '袋', quantity: 8, reason: '质量问题' },
  ]},
  { id: 5, code: 'TL20240305001', date: '2024-03-15', type: '生产退料', applicant: '赵技术', department: '种植部', warehouseLocation: 'B区-01', status: '已驳回', statusClass: 'rejected', remark: '不符合退货条件', materials: [
    { materialCode: 'SP0202002', materialName: '复合肥', spec: '25kg/袋', unit: '袋', quantity: 15, reason: '规格不符' },
  ]},
  { id: 6, code: 'TL20240306001', date: '2024-03-16', type: '生产退料', applicant: '李建国', department: '生产部', warehouseLocation: 'A区-03', status: '待审批', statusClass: 'pending', remark: '', materials: [
    { materialCode: 'PH0104001', materialName: '农药瓶', spec: '500ml/瓶', unit: '瓶', quantity: 30, reason: '过期产品' },
  ]},
  { id: 7, code: 'TL20240307001', date: '2024-03-17', type: '生产退料', applicant: '王建华', department: '种植部', warehouseLocation: 'B区-02', status: '已审批', statusClass: 'approved', remark: '', materials: [
    { materialCode: 'EQ0202002', materialName: '农用薄膜', spec: '5m×100m', unit: '卷', quantity: 25, reason: '质量问题' },
  ]},
  { id: 8, code: 'TL20240308001', date: '2024-03-18', type: '生产退料', applicant: '张建华', department: '设备部', warehouseLocation: 'C区-01', status: '已完成', statusClass: 'completed', remark: '', materials: [
    { materialCode: 'EQ0103001', materialName: '电动喷雾机', spec: '16L', unit: '台', quantity: 5, reason: '运输损坏' },
  ]},
];

const departments = ['全部部门', '生产部', '种植部', '设备部', '采购部', '仓储部'];
const returnReasons = ['质量问题', '规格不符', '过期产品', '运输损坏', '库存积压', '其他'];

export default function MaterialReturn() {
  // 搜索状态
  const [searchCode, setSearchCode] = useState('');
  const [searchMaterial, setSearchMaterial] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [searchWarehouse, setSearchWarehouse] = useState('');
  const [searchApplicant, setSearchApplicant] = useState('');

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 模态框状态
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<typeof mockReturns[0] | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showExportTypeModal, setShowExportTypeModal] = useState(false);
  const [exportFileType, setExportFileType] = useState('xlsx');
  const [showEditAlert, setShowEditAlert] = useState(false);
  const [editAlertMessage, setEditAlertMessage] = useState('');
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [batchEditedRecords, setBatchEditedRecords] = useState<Record<number, typeof mockReturns[0]>>({});
  const [currentBatchEditIndex, setCurrentBatchEditIndex] = useState(0);

  // 表单状态
  const [editForm, setEditForm] = useState({
    date: '',
    type: '',
    applicant: '',
    department: '',
    warehouseLocation: '',
    status: '',
    remark: '',
    materials: [] as MaterialItem[]
  });

  // 新增表单状态
  const [addForm, setAddForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: '生产退料',
    applicant: '',
    department: '生产部',
    warehouseLocation: '',
    remark: '',
    materials: [] as MaterialItem[]
  });

  // 添加物料行
  const handleAddMaterial = () => {
    const newMaterial: MaterialItem = {
      materialCode: '',
      materialName: '',
      spec: '',
      unit: '',
      quantity: 0,
      reason: ''
    };
    setAddForm({ ...addForm, materials: [...addForm.materials, newMaterial] });
  };

  // 删除物料行
  const handleRemoveMaterial = (index: number) => {
    const newMaterials = [...addForm.materials];
    newMaterials.splice(index, 1);
    setAddForm({ ...addForm, materials: newMaterials });
  };

  // 更新物料行
  const handleMaterialChange = (index: number, field: keyof MaterialItem, value: string | number) => {
    const newMaterials = [...addForm.materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    setAddForm({ ...addForm, materials: newMaterials });
  };

  // 保存新增
  const handleSaveAdd = () => {
    const newCode = `TL${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}${String(mockReturns.length + 1).padStart(3, '0')}`;
    const newRecord = {
      id: mockReturns.length + 1,
      code: newCode,
      date: addForm.date,
      type: addForm.type,
      applicant: addForm.applicant,
      department: addForm.department,
      warehouseLocation: addForm.warehouseLocation,
      status: '待审批',
      statusClass: 'pending',
      remark: addForm.remark,
      materials: addForm.materials
    };
    console.log('新增记录:', newRecord);
    setShowAddModal(false);
    setAddForm({
      date: new Date().toISOString().split('T')[0],
      type: '生产退料',
      applicant: '',
      department: '生产部',
      warehouseLocation: '',
      remark: '',
      materials: []
    });
  };

  // 取消新增
  const handleCancelAdd = () => {
    setShowAddModal(false);
    setAddForm({
      date: new Date().toISOString().split('T')[0],
      type: '生产退料',
      applicant: '',
      department: '生产部',
      warehouseLocation: '',
      remark: '',
      materials: []
    });
  };

  // 过滤后的数据
  const filteredReturns = mockReturns.filter(item => {
    if (searchCode && !item.code.toLowerCase().includes(searchCode.toLowerCase())) return false;
    if (searchMaterial && !item.materials.some(m => m.materialName.toLowerCase().includes(searchMaterial.toLowerCase()))) return false;
    if (searchWarehouse && !item.warehouseLocation.toLowerCase().includes(searchWarehouse.toLowerCase())) return false;
    if (searchApplicant && !item.applicant.toLowerCase().includes(searchApplicant.toLowerCase())) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (departmentFilter !== 'all' && item.department !== departmentFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredReturns.length / pageSize);

  // 重置搜索
  const handleReset = () => {
    setSearchCode('');
    setSearchMaterial('');
    setSearchWarehouse('');
    setSearchApplicant('');
    setStatusFilter('all');
    setDepartmentFilter('all');
    setCurrentPage(1);
  };

  // 展开/折叠行
  const toggleExpandRow = (id: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  // 全选
  const handleSelectAll = () => {
    if (selectedRows.length === filteredReturns.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredReturns.map(item => item.id));
    }
  };

  // 选择单行
  const handleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // 导出
  const handleExportClick = () => {
    setShowExportTypeModal(true);
  };

  const confirmExport = async () => {
    const exportData = filteredReturns.filter(item => selectedRows.includes(item.id));

    const headers = ['退料单号', '退料日期', '退料类型', '申请人', '退料部门', '仓库位置', '审批状态', '备注'];
    const fields = ['code', 'date', 'type', 'applicant', 'department', 'warehouseLocation', 'status', 'remark'];

    const materialHeaders = ['物料编码', '物料名称', '规格', '单位', '退料数量', '退料原因'];
    const materialFields = ['materialCode', 'materialName', 'spec', 'unit', 'quantity', 'reason'];

    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFileType === 'csv') {
      let csvContent = '\uFEFF' + headers.join(',') + ',' + materialHeaders.join(',') + '\n';
      exportData.forEach(row => {
        const mainRow = fields.map(f => `"${(row as any)[f] || ''}"`).join(',');
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            if (idx === 0) {
              csvContent += mainRow + ',' + materialFields.map(f => `"${mat[f] || ''}"`).join(',') + '\n';
            } else {
              csvContent += ','.repeat(headers.length) + ',' + materialFields.map(f => `"${mat[f] || ''}"`).join(',') + '\n';
            }
          });
        } else {
          csvContent += mainRow + ',' + ','.repeat(materialHeaders.length) + '\n';
        }
      });
      content = csvContent;
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFileType === 'xlsx') {
      let tableContent = `<html><head><meta charset="utf-8"></head><body><table border="1">`;
      tableContent += `<tr>${headers.map(h => `<th>${h}</th>`).join('')}${materialHeaders.map(h => `<th>${h}</th>`).join('')}</tr>`;
      exportData.forEach(row => {
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            if (idx === 0) {
              tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            } else {
              tableContent += `<tr>${'<td></td>'.repeat(headers.length)}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            }
          });
        } else {
          tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${'<td></td>'.repeat(materialHeaders.length)}</tr>`;
        }
      });
      tableContent += '</table></body></html>';
      content = tableContent;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFileType === 'word') {
      let tableContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">`;
      tableContent += `<tr>${headers.map(h => `<th>${h}</th>`).join('')}${materialHeaders.map(h => `<th>${h}</th>`).join('')}</tr>`;
      exportData.forEach(row => {
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            if (idx === 0) {
              tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            } else {
              tableContent += `<tr>${'<td></td>'.repeat(headers.length)}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            }
          });
        } else {
          tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${'<td></td>'.repeat(materialHeaders.length)}</tr>`;
        }
      });
      tableContent += '</table></body></html>';
      content = tableContent;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `生产退料_${new Date().toISOString().slice(0, 10)}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: exportFileType.toUpperCase() + ' Files',
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
      console.error('Export failed:', err);
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    setShowExportTypeModal(false);
    setExportMode(false);
    setSelectedRows([]);
  };

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  // 查看详情
  const handleView = (item: typeof mockReturns[0]) => {
    setSelectedRecord(item);
    setShowDetailModal(true);
  };

  // 编辑
  const handleEdit = (item: typeof mockReturns[0]) => {
    // 只有待审批状态的记录可以编辑
    if (item.status !== '待审批') {
      setEditAlertMessage(`该退料单当前状态为「${item.status}」，非待审批状态无法编辑。如需处理，可选择「作废申请」。`);
      setShowEditAlert(true);
      return;
    }
    setSelectedRecord(item);
    setEditForm({
      date: item.date,
      type: item.type,
      applicant: item.applicant,
      department: item.department,
      warehouseLocation: item.warehouseLocation,
      status: item.status,
      remark: item.remark || '',
      materials: [...item.materials],
    });
    setShowEditModal(true);
  };

  // 作废申请按钮点击
  const handleVoidApply = () => {
    if (!selectedRecord) return;
    setVoidReason('');
    setShowVoidModal(true);
  };

  // 删除确认
  const handleDeleteClick = (id: number) => {
    setDeletingId(id);
    setShowDeleteConfirm(true);
  };

  // 确认删除
  const confirmDelete = () => {
    console.log('删除记录 ID:', deletingId);
    setShowDeleteConfirm(false);
    setDeletingId(null);
  };

  // 提交作废申请
  const submitVoidApply = () => {
    if (!voidReason.trim()) {
      alert('请填写作废原因');
      return;
    }
    console.log('提交作废申请:', { recordId: selectedRecord?.id, voidReason });
    setShowVoidModal(false);
    alert('作废申请已提交');
  };

  // 保存编辑（重新提交）
  const handleSaveEdit = () => {
    console.log('保存编辑（重新提交）:', editForm);
    setShowEditModal(false);
    alert('编辑已保存，退料单已重新提交，等待审批');
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
              <ArrowLeftRight className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">生产退料</h1>
              <p className="text-gray-500">生产退料记录管理</p>
            </div>
          </div>
        </div>
      </div>

      {/* 搜索区域 */}
      <div className="bg-[#F2F6FA] rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">退料单号</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索退料单号..."
                value={searchCode}
                onChange={(e) => { setSearchCode(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">物资名称</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索物资名称..."
                value={searchMaterial}
                onChange={(e) => { setSearchMaterial(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">仓库位置</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索仓库位置..."
                value={searchWarehouse}
                onChange={(e) => { setSearchWarehouse(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">申请人</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索申请人..."
                value={searchApplicant}
                onChange={(e) => { setSearchApplicant(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">审批状态</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-w-[120px]"
            >
              <option value="all">全部状态</option>
              <option value="待审批">待审批</option>
              <option value="已审批">已审批</option>
              <option value="已驳回">已驳回</option>
              <option value="已完成">已完成</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">退料部门</label>
            <select
              value={departmentFilter}
              onChange={(e) => { setDepartmentFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-w-[140px]"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept === '全部部门' ? 'all' : dept}>{dept}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
          >
            重置
          </button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">生产退料单列表</h3>
          {exportMode ? (
            <div className="flex gap-2">
              <button
                onClick={handleExportClick}
                className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                确认导出
              </button>
              <button onClick={handleCancelExport} className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                取消
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                新增
              </button>
              {/* 编辑删除按钮 - 默认显示 */}
              {!batchEditMode && (
                <>
                  <button
                    onClick={() => { setBatchEditMode(true); setShowEditWarning(true); }}
                    className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    编辑
                  </button>
                  <button
                    onClick={() => { setBatchEditMode(true); setShowDeleteWarning(true); }}
                    className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                </>
              )}

              {/* 选择模式下显示确认/取消按钮 */}
              {batchEditMode && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (selectedRows.length === 0) {
                        alert('请先选择要编辑的记录');
                        setBatchEditMode(false);
                      } else {
                        setShowBatchEditModal(true);
                      }
                    }}
                    className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    确认编辑
                  </button>
                  <button
                    onClick={() => { setShowBatchDeleteConfirm(true); }}
                    className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
                  >
                    确认删除
                  </button>
                  <button
                    onClick={() => { setBatchEditMode(false); setSelectedRows([]); }}
                    className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-1"
                  >
                    取消
                  </button>
                </div>
              )}

              {!batchEditMode && (
                <button
                  onClick={() => setExportMode(true)}
                  className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  导出
                </button>
              )}
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {(exportMode || batchEditMode) && (
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-12">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === filteredReturns.length && filteredReturns.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-8"></th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">退料单号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">退料日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">退料类型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">申请人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">退料部门</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">仓库位置</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">审批状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-400">
              {filteredReturns.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item) => (
                <>
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
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleExpandRow(item.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {expandedRows.has(item.id) ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-700" onClick={() => handleView(item)}>{item.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.type}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.applicant}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.department}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.warehouseLocation}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        item.statusClass === 'approved' ? 'bg-green-100 text-green-700' :
                        item.statusClass === 'pending' ? 'bg-amber-100 text-amber-700' :
                        item.statusClass === 'rejected' ? 'bg-red-100 text-red-700' :
                        item.statusClass === 'completed' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleView(item)}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                          title="查看"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedRows.has(item.id) && (
                    <tr key={`${item.id}-expanded`} className="bg-white">
                      <td colSpan={(exportMode || batchEditMode) ? 10 : 9} className="px-4 py-3">
                        <div className="text-sm">
                          <div className="font-medium text-blue-800 mb-2">物料明细</div>
                          {item.materials.length > 0 ? (
                            <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                              <thead className="bg-[#F2F6FA]">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">物料分类</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">物料编码</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">物料名称</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">规格</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">单位</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">退料数量</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">退料原因</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {item.materials.map((material, idx) => (
                                  <tr key={idx} className="hover:bg-[#F2F6FA]/50">
                                    <td className="px-3 py-2 text-sm text-blue-800">{getCategoryByCode(material.materialCode)}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800 font-mono">{material.materialCode}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{material.materialName}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{material.spec}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{material.unit}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{material.quantity}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{material.reason}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="text-blue-800 text-center py-4">暂无物料明细</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
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
            <span className="text-sm text-gray-500">共 {filteredReturns.length} 条</span>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm">{currentPage} / {totalPages || 1}</span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 查看详情弹窗 */}
      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">退料单详情</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <span className="text-2xl text-gray-400">&times;</span>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">退料单号</label>
                  <p className="font-mono font-semibold text-gray-900">{selectedRecord.code}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">退料日期</label>
                  <p className="font-semibold text-gray-900">{selectedRecord.date}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">退料类型</label>
                  <p className="font-semibold text-gray-900">{selectedRecord.type}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">退料部门</label>
                  <p className="font-semibold text-gray-900">{selectedRecord.department}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">仓库位置</label>
                  <p className="font-semibold text-gray-900">{selectedRecord.warehouseLocation}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">申请人</label>
                  <p className="font-semibold text-gray-900">{selectedRecord.applicant}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">审批状态</label>
                  <p className="font-semibold">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      selectedRecord.statusClass === 'approved' ? 'bg-green-100 text-green-700' :
                      selectedRecord.statusClass === 'pending' ? 'bg-amber-100 text-amber-700' :
                      selectedRecord.statusClass === 'rejected' ? 'bg-red-100 text-red-700' :
                      selectedRecord.statusClass === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedRecord.status}
                    </span>
                  </p>
                </div>
                {selectedRecord.remark && (
                  <div className="col-span-2">
                    <label className="text-sm text-gray-500">备注</label>
                    <p className="font-semibold text-gray-900">{selectedRecord.remark}</p>
                  </div>
                )}
              </div>
              <div className="mt-6">
                <label className="text-sm text-gray-500 mb-2 block">物料明细</label>
                <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-[#F2F6FA]">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">物料分类</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">物料编码</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">物料名称</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">规格</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">单位</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">退料数量</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">退料原因</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedRecord.materials.map((material, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-700">{getCategoryByCode(material.materialCode)}</td>
                        <td className="px-3 py-2 text-sm text-gray-700 font-mono">{material.materialCode}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{material.materialName}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{material.spec}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{material.unit}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{material.quantity}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{material.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑弹窗 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-600 sticky top-0">
              <h3 className="text-lg font-semibold text-white">编辑退料单</h3>
              <button onClick={() => setShowEditModal(false)} className="text-white hover:bg-blue-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {/* 退料单号 - 只读 */}
                <div className="bg-gray-100 rounded-lg p-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">退料单号</label>
                  <div className="text-sm font-medium text-gray-900">{selectedRecord?.code}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">退料日期</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">退料类型</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="生产退料">生产退料</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">申请人</label>
                  <input
                    type="text"
                    value={editForm.applicant}
                    onChange={(e) => setEditForm({ ...editForm, applicant: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">退料部门</label>
                  <select
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {departments.filter(d => d !== '全部部门').map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">仓库位置</label>
                  <input
                    type="text"
                    value={editForm.warehouseLocation}
                    onChange={(e) => setEditForm({ ...editForm, warehouseLocation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">审批状态</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="待审批">待审批</option>
                    <option value="已审批">已审批</option>
                    <option value="已驳回">已驳回</option>
                    <option value="已完成">已完成</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                  <input
                    type="text"
                    value={editForm.remark}
                    onChange={(e) => setEditForm({ ...editForm, remark: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* 物料明细 */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">物料明细</label>
                  <button
                    onClick={() => setEditForm({ ...editForm, materials: [...editForm.materials, { materialCode: '', materialName: '', spec: '', unit: '', quantity: 0, reason: '' }] })}
                    className="px-3 py-1 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    添加物料
                  </button>
                </div>
                {editForm.materials.length > 0 ? (
                  <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-emerald-100">
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">物料编码</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">物料名称</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">规格</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">单位</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">退料数量</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">退料原因</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 w-12">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {editForm.materials.map((material, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={material.materialCode}
                              onChange={(e) => {
                                const newMaterials = [...editForm.materials];
                                newMaterials[idx] = { ...newMaterials[idx], materialCode: e.target.value };
                                setEditForm({ ...editForm, materials: newMaterials });
                              }}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={material.materialName}
                              onChange={(e) => {
                                const newMaterials = [...editForm.materials];
                                newMaterials[idx] = { ...newMaterials[idx], materialName: e.target.value };
                                setEditForm({ ...editForm, materials: newMaterials });
                              }}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={material.spec}
                              onChange={(e) => {
                                const newMaterials = [...editForm.materials];
                                newMaterials[idx] = { ...newMaterials[idx], spec: e.target.value };
                                setEditForm({ ...editForm, materials: newMaterials });
                              }}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={material.unit}
                              onChange={(e) => {
                                const newMaterials = [...editForm.materials];
                                newMaterials[idx] = { ...newMaterials[idx], unit: e.target.value };
                                setEditForm({ ...editForm, materials: newMaterials });
                              }}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={material.quantity}
                              onChange={(e) => {
                                const newMaterials = [...editForm.materials];
                                newMaterials[idx] = { ...newMaterials[idx], quantity: Number(e.target.value) };
                                setEditForm({ ...editForm, materials: newMaterials });
                              }}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={material.reason}
                              onChange={(e) => {
                                const newMaterials = [...editForm.materials];
                                newMaterials[idx] = { ...newMaterials[idx], reason: e.target.value };
                                setEditForm({ ...editForm, materials: newMaterials });
                              }}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <button
                              onClick={() => {
                                const newMaterials = [...editForm.materials];
                                newMaterials.splice(idx, 1);
                                setEditForm({ ...editForm, materials: newMaterials });
                              }}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-sm text-gray-500 italic border border-gray-200 rounded-lg p-4 text-center">
                    暂无物料明细，请点击"添加物料"按钮添加
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  handleVoidApply();
                }}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
              >
                作废申请
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑提示弹窗 */}
      {showEditAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Edit className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">无法编辑</h3>
                  <p className="text-sm text-gray-500">退料单状态限制</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-amber-800">
                  {editAlertMessage}
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowEditAlert(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  知道了
                </button>
                <button
                  onClick={() => {
                    setShowEditAlert(false);
                    handleVoidApply();
                  }}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                >
                  前往作废申请
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 编辑警告弹窗 */}
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
                <li>该退料单的历史记录可能无法追溯</li>
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

      {/* 删除警告弹窗 */}
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
                <li>所有选中的退料单将被永久删除</li>
                <li>相关的物料明细也将被删除</li>
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

      {/* 批量编辑弹窗 */}
      {showBatchEditModal && (() => {
        const selectedRecordsList = mockReturns.filter(r => selectedRows.includes(r.id));
        const currentRecordId = selectedRows[currentBatchEditIndex];
        const currentRecord = selectedRecordsList.find(r => r.id === currentRecordId);
        const currentEditedData = batchEditedRecords[currentRecordId] || currentRecord || {};
        const editedCount = Object.keys(batchEditedRecords).length;

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-600 sticky top-0">
                <h3 className="text-lg font-semibold text-white">批量编辑退料记录</h3>
                <button onClick={() => { setShowBatchEditModal(false); setBatchEditedRecords({}); setCurrentBatchEditIndex(0); }} className="text-white hover:bg-blue-700 p-1 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">已选择 <strong>{selectedRows.length}</strong> 条退料记录进行批量编辑，已编辑 <strong>{editedCount}</strong> 条</p>
                </div>

                {/* 退料单选择下拉 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">选择退料单</label>
                  <select
                    value={currentRecordId || ''}
                    onChange={(e) => {
                      const idx = selectedRows.indexOf(Number(e.target.value));
                      setCurrentBatchEditIndex(idx >= 0 ? idx : 0);
                    }}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  >
                    {selectedRecordsList.map((record, idx) => (
                      <option key={record.id} value={record.id}>
                        {record.code} ({record.applicant}) {batchEditedRecords[record.id] ? '✓ 已编辑' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 编辑表单 */}
                <div className="grid grid-cols-2 gap-4">
                  {/* 退料单号 - 只读 */}
                  <div className="bg-gray-100 rounded-lg p-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">退料单号</label>
                    <div className="text-sm font-medium text-gray-900">{currentEditedData.code}</div>
                  </div>
                  {/* 日期 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">日期</label>
                    <input
                      type="date"
                      value={currentEditedData.date || ''}
                      onChange={(e) => setBatchEditedRecords({
                        ...batchEditedRecords,
                        [currentRecordId]: { ...currentEditedData, date: e.target.value }
                      })}
                      className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  {/* 退料类型 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">退料类型</label>
                    <select
                      value={currentEditedData.type || ''}
                      onChange={(e) => setBatchEditedRecords({
                        ...batchEditedRecords,
                        [currentRecordId]: { ...currentEditedData, type: e.target.value }
                      })}
                      className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">请选择</option>
                      <option value="生产退料">生产退料</option>
                      <option value="品质退料">品质退料</option>
                      <option value="试制退料">试制退料</option>
                    </select>
                  </div>
                  {/* 申请人 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">申请人</label>
                    <input
                      type="text"
                      value={currentEditedData.applicant || ''}
                      onChange={(e) => setBatchEditedRecords({
                        ...batchEditedRecords,
                        [currentRecordId]: { ...currentEditedData, applicant: e.target.value }
                      })}
                      className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  {/* 部门 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">部门</label>
                    <select
                      value={currentEditedData.department || ''}
                      onChange={(e) => setBatchEditedRecords({
                        ...batchEditedRecords,
                        [currentRecordId]: { ...currentEditedData, department: e.target.value }
                      })}
                      className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">请选择</option>
                      <option value="生产部">生产部</option>
                      <option value="种植部">种植部</option>
                      <option value="设备部">设备部</option>
                      <option value="采购部">采购部</option>
                      <option value="仓储部">仓储部</option>
                    </select>
                  </div>
                  {/* 仓库地点 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">仓库地点</label>
                    <input
                      type="text"
                      value={currentEditedData.warehouseLocation || ''}
                      onChange={(e) => setBatchEditedRecords({
                        ...batchEditedRecords,
                        [currentRecordId]: { ...currentEditedData, warehouseLocation: e.target.value }
                      })}
                      className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  {/* 状态 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">状态</label>
                    <select
                      value={currentEditedData.status || ''}
                      onChange={(e) => setBatchEditedRecords({
                        ...batchEditedRecords,
                        [currentRecordId]: { ...currentEditedData, status: e.target.value }
                      })}
                      className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">请选择</option>
                      <option value="待审批">待审批</option>
                      <option value="已审批">已审批</option>
                      <option value="已驳回">已驳回</option>
                      <option value="已完成">已完成</option>
                    </select>
                  </div>
                  {/* 备注 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">备注</label>
                    <input
                      type="text"
                      value={currentEditedData.remark || ''}
                      onChange={(e) => setBatchEditedRecords({
                        ...batchEditedRecords,
                        [currentRecordId]: { ...currentEditedData, remark: e.target.value }
                      })}
                      className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* 物料明细表格 */}
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">物料明细</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">物料编码</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">物料名称</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">规格</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">单位</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">退料数量</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">退料原因</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(currentEditedData.materials || []).map((mat: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={mat.materialCode || ''}
                                onChange={(e) => {
                                  const newMaterials = [...(currentEditedData.materials || [])];
                                  newMaterials[idx] = { ...newMaterials[idx], materialCode: e.target.value };
                                  setBatchEditedRecords({
                                    ...batchEditedRecords,
                                    [currentRecordId]: { ...currentEditedData, materials: newMaterials }
                                  });
                                }}
                                className="w-24 h-8 px-2 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-500"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={mat.materialName || ''}
                                onChange={(e) => {
                                  const newMaterials = [...(currentEditedData.materials || [])];
                                  newMaterials[idx] = { ...newMaterials[idx], materialName: e.target.value };
                                  setBatchEditedRecords({
                                    ...batchEditedRecords,
                                    [currentRecordId]: { ...currentEditedData, materials: newMaterials }
                                  });
                                }}
                                className="w-24 h-8 px-2 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-500"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={mat.spec || ''}
                                onChange={(e) => {
                                  const newMaterials = [...(currentEditedData.materials || [])];
                                  newMaterials[idx] = { ...newMaterials[idx], spec: e.target.value };
                                  setBatchEditedRecords({
                                    ...batchEditedRecords,
                                    [currentRecordId]: { ...currentEditedData, materials: newMaterials }
                                  });
                                }}
                                className="w-20 h-8 px-2 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-500"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={mat.unit || ''}
                                onChange={(e) => {
                                  const newMaterials = [...(currentEditedData.materials || [])];
                                  newMaterials[idx] = { ...newMaterials[idx], unit: e.target.value };
                                  setBatchEditedRecords({
                                    ...batchEditedRecords,
                                    [currentRecordId]: { ...currentEditedData, materials: newMaterials }
                                  });
                                }}
                                className="w-12 h-8 px-2 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-500"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="0"
                                value={mat.quantity || 0}
                                onChange={(e) => {
                                  const newMaterials = [...(currentEditedData.materials || [])];
                                  newMaterials[idx] = { ...newMaterials[idx], quantity: Number(e.target.value) };
                                  setBatchEditedRecords({
                                    ...batchEditedRecords,
                                    [currentRecordId]: { ...currentEditedData, materials: newMaterials }
                                  });
                                }}
                                className="w-16 h-8 px-2 border border-gray-200 rounded text-right text-xs focus:outline-none focus:border-blue-500"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={mat.reason || ''}
                                onChange={(e) => {
                                  const newMaterials = [...(currentEditedData.materials || [])];
                                  newMaterials[idx] = { ...newMaterials[idx], reason: e.target.value };
                                  setBatchEditedRecords({
                                    ...batchEditedRecords,
                                    [currentRecordId]: { ...currentEditedData, materials: newMaterials }
                                  });
                                }}
                                className="h-8 px-2 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-500"
                              >
                                <option value="">请选择</option>
                                <option value="质量问题">质量问题</option>
                                <option value="规格不符">规格不符</option>
                                <option value="过期产品">过期产品</option>
                                <option value="运输损坏">运输损坏</option>
                                <option value="库存积压">库存积压</option>
                                <option value="其他">其他</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                        {(!currentEditedData.materials || currentEditedData.materials.length === 0) && (
                          <tr>
                            <td colSpan={6} className="px-3 py-4 text-center text-gray-500">暂无物料明细</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
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
                      console.log('Saving all batch edits:', batchEditedRecords);
                      setShowBatchEditModal(false);
                      setBatchEditMode(false);
                      setSelectedRows([]);
                      setBatchEditedRecords({});
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

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">确认删除</h3>
                  <p className="text-sm text-gray-500">此操作不可恢复</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-amber-800">
                  <strong>警告：</strong> 删除此退料记录可能会导致相关数据丢失，无法恢复。请确认是否继续删除操作。
                </p>
              </div>
              <p className="text-sm text-gray-600 mb-6">确定要删除这条退料记录吗？</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 作废申请弹窗 */}
      {showVoidModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">作废申请</h3>
                  <p className="text-sm text-gray-500">请填写作废原因</p>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">退料单号</label>
                <p className="font-mono text-gray-900">{selectedRecord?.code}</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  作废原因 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="请输入作废原因"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowVoidModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  onClick={submitVoidApply}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                >
                  提交作废申请
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 新增退料单弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[66vw] mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">新增退料单</h3>
              <button onClick={handleCancelAdd} className="p-1 hover:bg-gray-100 rounded">
                <span className="text-2xl text-gray-400">&times;</span>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">退料单号</label>
                  <input
                    type="text"
                    value={`系统自动生成`}
                    readOnly
                    placeholder="系统自动生成"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">退料日期</label>
                  <input
                    type="date"
                    value={addForm.date}
                    onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">申请人</label>
                  <input
                    type="text"
                    value={addForm.applicant}
                    onChange={(e) => setAddForm({ ...addForm, applicant: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">退料部门</label>
                  <select
                    value={addForm.department}
                    onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {departments.filter(d => d !== '全部部门').map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">仓库位置</label>
                  <input
                    type="text"
                    value={addForm.warehouseLocation}
                    onChange={(e) => setAddForm({ ...addForm, warehouseLocation: e.target.value })}
                    placeholder="请输入仓库位置"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                  <input
                    type="text"
                    value={addForm.remark}
                    onChange={(e) => setAddForm({ ...addForm, remark: e.target.value })}
                    placeholder="请输入备注"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* 物料明细 */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">物料明细</label>
                  <button
                    onClick={handleAddMaterial}
                    className="px-3 py-1 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    添加物料
                  </button>
                </div>
                {addForm.materials.length > 0 ? (
                  <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-emerald-100">
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">物料编码</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">物料名称</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">规格</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">单位</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">退料数量</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">退料原因</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 w-12">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {addForm.materials.map((material, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={material.materialCode}
                              onChange={(e) => handleMaterialChange(idx, 'materialCode', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={material.materialName}
                              onChange={(e) => handleMaterialChange(idx, 'materialName', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={material.spec}
                              onChange={(e) => handleMaterialChange(idx, 'spec', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={material.unit}
                              onChange={(e) => handleMaterialChange(idx, 'unit', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={material.quantity}
                              onChange={(e) => handleMaterialChange(idx, 'quantity', Number(e.target.value))}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={material.reason}
                              onChange={(e) => handleMaterialChange(idx, 'reason', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <button
                              onClick={() => handleRemoveMaterial(idx)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-sm text-gray-500 italic border border-gray-200 rounded-lg p-4 text-center">
                    暂无物料明细，请点击"添加物料"按钮添加
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={handleCancelAdd}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={handleSaveAdd}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导出类型选择弹窗 */}
      {showExportTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">选择导出文件类型</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="exportType"
                    value="xlsx"
                    checked={exportFileType === 'xlsx'}
                    onChange={(e) => setExportFileType(e.target.value)}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">Excel 文件 (.xlsx)</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="exportType"
                    value="csv"
                    checked={exportFileType === 'csv'}
                    onChange={(e) => setExportFileType(e.target.value)}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">CSV 文件 (.csv)</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="exportType"
                    value="word"
                    checked={exportFileType === 'word'}
                    onChange={(e) => setExportFileType(e.target.value)}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">Word 文件 (.doc)</span>
                  </div>
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowExportTypeModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={confirmExport}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                确认导出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
