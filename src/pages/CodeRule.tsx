import { useState } from 'react';
import { Hash, Plus, X, Save, Edit2, Trash2, ChevronDown, ChevronRight, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';

// 编码规则配置 - 大类(2位字母) + 中类(2位数字) + 小类(2位数字) + 流水号(3位数字)
interface SubCategory {
  code: string;
  name: string;
}

interface MidCategory {
  code: string;
  name: string;
  subCategories: SubCategory[];
}

interface BigCategory {
  code: string;
  name: string;
  nameEn: string;
  midCategories: MidCategory[];
}

// 初始分类数据
const initialCategories: BigCategory[] = [
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
    nameEn: 'Facilities and Equipment',
    midCategories: [
      {
        code: '01',
        name: '农业机械',
        subCategories: [
          { code: '01', name: '耕作机械' },
          { code: '02', name: '播种/移栽设备' },
          { code: '03', name: '植保机械' },
          { code: '04', name: '收获机械' },
          { code: '05', name: '初加工设备' },
          { code: '99', name: '其他相关机械' },
        ]
      },
      {
        code: '02',
        name: '设施农业系统',
        subCategories: [
          { code: '01', name: '骨架结构材料' },
          { code: '02', name: '覆盖材料' },
          { code: '03', name: '通风降温设备' },
          { code: '04', name: '加温设备' },
          { code: '05', name: '补光系统' },
          { code: '06', name: '自动化控制设备' },
          { code: '99', name: '其他相关设施设备' },
        ]
      },
      {
        code: '03',
        name: '灌溉与水肥系统',
        subCategories: [
          { code: '01', name: '水源与泵站' },
          { code: '02', name: '水肥一体机' },
          { code: '03', name: '输水管网' },
          { code: '04', name: '过滤系统' },
          { code: '05', name: '施肥装置' },
          { code: '06', name: '灌溉终端' },
          { code: '99', name: '其他相关灌溉系统设备' },
        ]
      },
    ]
  },
  // 作业支持类 OP
  {
    code: 'OP',
    name: '作业支持类',
    nameEn: 'Operations Support',
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
          { code: '03', name: '农事管理二维码/RFID标签' },
          { code: '99', name: '其他标识记录用品' },
        ]
      },
    ]
  },
  // 采后处理与流通类 PH
  {
    code: 'PH',
    name: '采后处理与流通类',
    nameEn: 'Post-harvest Handling',
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
    nameEn: 'Information Technology',
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
    nameEn: 'Energy and General Consumables',
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

export default function CodeRule() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<BigCategory[]>(initialCategories);
  const [expandedBig, setExpandedBig] = useState<Set<string>>(new Set(['SP', 'EQ', 'OP', 'PH', 'IT', 'EC', 'OT']));
  const [expandedMid, setExpandedMid] = useState<Set<string>>(new Set([
    'SP01', 'SP02', 'SP03',
    'EQ01', 'EQ02', 'EQ03',
    'OP01', 'OP02', 'OP03',
    'PH01', 'PH02',
    'IT01', 'IT02', 'IT03',
    'EC01', 'EC02',
    'OT01'
  ]));
  const [editingCell, setEditingCell] = useState<{type: 'big' | 'mid' | 'sub'; bigCode: string; midCode?: string; subCode?: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAddBig, setShowAddBig] = useState(false);
  const [showAddMid, setShowAddMid] = useState<string | null>(null);
  const [showAddSub, setShowAddSub] = useState<string | null>(null);
  const [newBigCode, setNewBigCode] = useState('');
  const [newBigName, setNewBigName] = useState('');
  const [newMidCode, setNewMidCode] = useState('');
  const [newMidName, setNewMidName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  // 展开/折叠大类
  const toggleBig = (code: string) => {
    const newExpanded = new Set(expandedBig);
    if (newExpanded.has(code)) {
      newExpanded.delete(code);
    } else {
      newExpanded.add(code);
    }
    setExpandedBig(newExpanded);
  };

  // 展开/折叠中类
  const toggleMid = (bigCode: string, midCode: string) => {
    const key = `${bigCode}${midCode}`;
    const newExpanded = new Set(expandedMid);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedMid(newExpanded);
  };

  // 开始编辑
  const startEdit = (type: 'big' | 'mid' | 'sub', bigCode: string, midCode?: string, subCode?: string, currentName?: string) => {
    setEditingCell({ type, bigCode, midCode, subCode });
    setEditValue(currentName || '');
  };

  // 保存编辑
  const saveEdit = () => {
    if (!editingCell || !editValue.trim()) return;

    setCategories(prev => prev.map(big => {
      if (big.code !== editingCell.bigCode) return big;

      if (editingCell.type === 'big') {
        return { ...big, name: editValue.trim() };
      }

      return {
        ...big,
        midCategories: big.midCategories.map(mid => {
          if (mid.code !== editingCell.midCode) return mid;

          if (editingCell.type === 'mid') {
            return { ...mid, name: editValue.trim() };
          }

          return {
            ...mid,
            subCategories: mid.subCategories.map(sub => {
              if (sub.code !== editingCell.subCode) return sub;
              return { ...sub, name: editValue.trim() };
            })
          };
        })
      };
    }));

    setEditingCell(null);
    setEditValue('');
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // 添加大类
  const addBigCategory = () => {
    if (!newBigCode.trim() || !newBigName.trim()) return;
    setCategories(prev => [...prev, {
      code: newBigCode.trim().toUpperCase(),
      name: newBigName.trim(),
      nameEn: '',
      midCategories: []
    }]);
    setNewBigCode('');
    setNewBigName('');
    setShowAddBig(false);
  };

  // 添加中类
  const addMidCategory = (bigCode: string) => {
    if (!newMidCode.trim() || !newMidName.trim()) return;
    setCategories(prev => prev.map(big => {
      if (big.code !== bigCode) return big;
      return {
        ...big,
        midCategories: [...big.midCategories, {
          code: newMidCode.trim(),
          name: newMidName.trim(),
          subCategories: []
        }]
      };
    }));
    setNewMidCode('');
    setNewMidName('');
    setShowAddMid(null);
  };

  // 添加小类
  const addSubCategory = (bigCode: string, midCode: string) => {
    if (!newSubCode.trim() || !newSubName.trim()) return;
    setCategories(prev => prev.map(big => {
      if (big.code !== bigCode) return big;
      return {
        ...big,
        midCategories: big.midCategories.map(mid => {
          if (mid.code !== midCode) return mid;
          return {
            ...mid,
            subCategories: [...mid.subCategories, {
              code: newSubCode.trim(),
              name: newSubName.trim()
            }]
          };
        })
      };
    }));
    setNewSubCode('');
    setNewSubName('');
    setShowAddSub(null);
  };

  // 删除大类
  const deleteBigCategory = (bigCode: string) => {
    if (!confirm(`确定要删除大类 "${bigCode}" 吗？`)) return;
    setCategories(prev => prev.filter(big => big.code !== bigCode));
  };

  // 删除中类
  const deleteMidCategory = (bigCode: string, midCode: string) => {
    if (!confirm(`确定要删除中类 "${midCode}" 吗？`)) return;
    setCategories(prev => prev.map(big => {
      if (big.code !== bigCode) return big;
      return {
        ...big,
        midCategories: big.midCategories.filter(mid => mid.code !== midCode)
      };
    }));
  };

  // 删除小类
  const deleteSubCategory = (bigCode: string, midCode: string, subCode: string) => {
    if (!confirm(`确定要删除小类 "${subCode}" 吗？`)) return;
    setCategories(prev => prev.map(big => {
      if (big.code !== bigCode) return big;
      return {
        ...big,
        midCategories: big.midCategories.map(mid => {
          if (mid.code !== midCode) return mid;
          return {
            ...mid,
            subCategories: mid.subCategories.filter(sub => sub.code !== subCode)
          };
        })
      };
    }));
  };

  // 保存所有修改
  const handleSave = () => {
    // 在实际应用中，这里应该保存到后端
    alert('编码规则已保存！（演示模式）');
  };

  // 渲染编辑单元格
  const renderEditCell = (type: 'big' | 'mid' | 'sub', bigCode: string, midCode?: string, subCode?: string, currentName?: string) => {
    if (editingCell?.type === type && editingCell?.bigCode === bigCode && editingCell?.midCode === midCode && editingCell?.subCode === subCode) {
      return (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            className="w-32 px-2 py-1 border border-emerald-500 rounded text-sm focus:outline-none"
            autoFocus
          />
          <Button variant="ghost" size="icon" onClick={saveEdit}>
            <Save className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={cancelEdit}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 group">
        <span className="cursor-pointer hover:text-emerald-600" onClick={() => startEdit(type, bigCode, midCode, subCode, currentName)}>
          {currentName}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => startEdit(type, bigCode, midCode, subCode, currentName)}
          className="opacity-0 group-hover:opacity-100"
        >
          <Edit2 className="w-3 h-3" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Button>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
              <Hash className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">物料编码规则</h1>
              <p className="text-gray-500">编码结构：大类代码(2位) + 中类代码(2位) + 小类代码(2位) + 流水号(3位)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button variant="default" onClick={() => setIsEditing(true)} className="flex items-center gap-2">
                <Edit2 className="w-4 h-4" />
                修改规则
              </Button>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setIsEditing(false)} className="flex items-center gap-2">
                  取消修改
                </Button>
                <Button variant="default" onClick={() => setShowSaveConfirm(true)} className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  保存修改
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 说明 */}
      {isEditing && (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-semibold text-blue-800 mb-2">使用说明</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 点击"修改规则"按钮进入编辑模式</li>
          <li>• 编辑模式下可添加、删除、修改分类</li>
          <li>• 点击展开图标查看下级分类</li>
          <li>• 点击"保存修改"前请注意风险提示</li>
        </ul>
      </div>
      )}

      {/* 分类表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden w-[60%]">
        <table className="w-full">
          <thead className="bg-emerald-600">
            <tr>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white w-24">大类代码</th>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white">大类名称</th>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white w-24">中类代码</th>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white w-48">中类名称</th>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white w-24">小类代码</th>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white w-48">小类名称</th>
            </tr>
            {/* 添加大类按钮 - 表格顶部 */}
            {isEditing && (
              <tr className="bg-white">
                <td colSpan={6} className="px-2 py-2">
                  {showAddBig ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newBigCode}
                        onChange={(e) => setNewBigCode(e.target.value)}
                        placeholder="代码(如:AB)"
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="text"
                        value={newBigName}
                        onChange={(e) => setNewBigName(e.target.value)}
                        placeholder="大类名称"
                        className="w-40 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <Button variant="default" size="sm" onClick={addBigCategory}>添加</Button>
                      <Button variant="secondary" size="sm" onClick={() => setShowAddBig(false)}>取消</Button>
                    </div>
                  ) : (
                    <Button variant="ghost" onClick={() => setShowAddBig(true)} className="flex items-center gap-1">
                      <Plus className="w-4 h-4" /> 添加大类
                    </Button>
                  )}
                </td>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-gray-300">
            {/* 渲染大类标题行（始终可见） */}
            {categories.map((big, bigIdx) => {
              return (
                <>
                  {/* 大类标题行 - 始终显示 */}
                  <tr key={`big-${big.code}`} className="bg-white hover:bg-gray-50">
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => toggleBig(big.code)}>
                          {expandedBig.has(big.code) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </Button>
                        <span className="font-mono font-bold text-blue-600 text-sm">{big.code}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center">
                          {renderEditCell('big', big.code, undefined, undefined, big.name)}
                          <span className="text-xs text-gray-400 ml-1">({big.nameEn})</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <span className="font-semibold text-gray-800 text-sm">{big.name}</span>
                          <span className="text-xs text-gray-400 ml-1">({big.nameEn})</span>
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-3"></td>
                    <td className="px-2 py-3"></td>
                    <td className="px-2 py-3"></td>
                    <td className="px-2 py-3"></td>
                  </tr>

                  {/* 如果大类已展开，渲染中类和小类 */}
                  {expandedBig.has(big.code) && big.midCategories.map((mid, midIdx) => {
                    const midKey = `${big.code}${mid.code}`;
                    const isMidExpanded = expandedMid.has(midKey);

                    // 渲染中类标题行
                    return (
                      <>
                        <tr key={`mid-${big.code}-${mid.code}`} className="bg-white hover:bg-gray-50">
                          <td className="px-2 py-2"></td>
                          <td className="px-2 py-2"></td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => toggleMid(big.code, mid.code)}>
                                {isMidExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </Button>
                              <span className="font-mono text-blue-600 font-medium text-sm">{mid.code}</span>
                            </div>
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            <div className="flex items-center gap-4">
                              {isEditing ? renderEditCell('mid', big.code, mid.code, undefined, mid.name) : <span className="font-medium text-gray-800 text-sm">{mid.name}</span>}
                              {isEditing && (
                                <Button variant="ghost" size="sm" onClick={() => setShowAddSub(`${big.code}${mid.code}`)} className="text-emerald-600 flex items-center gap-1">
                                  <Plus className="w-3 h-3" /> 添加小类
                                </Button>
                            )}
                            </div>
                          </td>
                          <td className="px-2 py-2"></td>
                          <td className="px-2 py-2"></td>
                        </tr>

                        {/* 如果中类已展开，渲染小类 */}
                        {isMidExpanded && mid.subCategories.map((sub, subIdx) => (
                          <tr key={`${big.code}${mid.code}${sub.code}`} className="bg-white hover:bg-gray-50">
                            <td className="px-2 py-2"></td>
                            <td className="px-2 py-2"></td>
                            <td className="px-2 py-2"></td>
                            <td className="px-2 py-2"></td>
                            <td className="px-2 py-2">
                              <span className="font-mono text-blue-600 text-sm">{sub.code}</span>
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                              {isEditing ? renderEditCell('sub', big.code, mid.code, sub.code, sub.name) : <span className="text-sm text-gray-700">{sub.name}</span>}
                            </td>
                          </tr>
                        ))}
                      </>
                    );
                  })}

                  {/* 添加中类按钮 - 在大类的最后 */}
                  {isEditing && (
                    <tr key={`add-mid-${big.code}`} className="bg-white hover:bg-gray-50">
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2">
                        <Button variant="ghost" onClick={() => setShowAddMid(big.code)} className="flex items-center gap-1 text-emerald-600">
                          <Plus className="w-4 h-4" /> 添加中类
                        </Button>
                      </td>
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2"></td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 添加中类弹窗 */}
      {showAddMid && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">添加中类</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">中类代码</label>
                <input
                  type="text"
                  value={newMidCode}
                  onChange={(e) => setNewMidCode(e.target.value)}
                  placeholder="两位数字，如：04"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">中类名称</label>
                <input
                  type="text"
                  value={newMidName}
                  onChange={(e) => setNewMidName(e.target.value)}
                  placeholder="中类名称"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={() => setShowAddMid(null)}>
                  取消
                </Button>
                <Button variant="default" onClick={() => addMidCategory(showAddMid.substring(0, 2))}>
                  添加
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 添加小类弹窗 */}
      {showAddSub && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">添加小类</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">小类代码</label>
                <input
                  type="text"
                  value={newSubCode}
                  onChange={(e) => setNewSubCode(e.target.value)}
                  placeholder="两位数字，如：10"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">小类名称</label>
                <input
                  type="text"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  placeholder="小类名称"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={() => setShowAddSub(null)}>
                  取消
                </Button>
                <Button variant="default" onClick={() => addSubCategory(showAddSub.substring(0, 2), showAddSub.substring(2, 4))}>
                  添加
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 保存确认弹窗 */}
      {showSaveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[480px] shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">风险提示</h3>
            </div>
            <div className="mb-6">
              <p className="text-gray-600 mb-3">
                您即将保存对编码规则的修改，请注意以下风险：
              </p>
              <ul className="text-sm text-gray-500 space-y-2 bg-red-50 p-4 rounded-lg">
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  <span>如果修改后的编码规则与系统中已有的物料编码冲突，可能导致系统无法识别该物料</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  <span>删除已被使用的编码分类可能影响历史数据的关联和追溯</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  <span>建议在修改前备份系统数据，确保可以回滚</span>
                </li>
              </ul>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setShowSaveConfirm(false)}>
                取消保存
              </Button>
              <Button variant="destructive" onClick={() => {
                  setShowSaveConfirm(false);
                  setIsEditing(false);
                  alert('编码规则已保存！（演示模式）');
                }}>
                确认保存
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
