import { useState } from 'react';
import { Hash, Plus, X, Save, Edit2, Trash2, ChevronDown, ChevronRight, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AddMidModal } from '../components/codeRule/AddMidModal';

// 编码规则配置 - 大类(2位字母) + 中类(2位数字) + 流水号(3位数字)
// 完整格式: SU_ + 大类代码 + 中类代码 + 流水号
interface MidCategory {
  code: string;
  name: string;
}

interface BigCategory {
  code: string;
  name: string;
  nameEn: string;
  midCategories: MidCategory[];
}

// 初始分类数据
const initialCategories: BigCategory[] = [
  // 种子与种苗类 SP
  {
    code: 'SP',
    name: '种子与种苗类',
    nameEn: 'Seed & Seedling',
    midCategories: [
      { code: '01', name: '粮食作物种子' },
      { code: '02', name: '经济作物种子' },
      { code: '03', name: '蔬菜种子/种苗' },
      { code: '04', name: '水果苗木' },
      { code: '05', name: '花卉与观赏植物' },
      { code: '06', name: '食用菌/药用菌菌种' },
      { code: '99', name: '其他种质资源' },
    ]
  },
  // 肥料与土壤改良类 FE
  {
    code: 'FE',
    name: '肥料与土壤改良类',
    nameEn: 'Fertilizer & Soil Amendment',
    midCategories: [
      { code: '01', name: '有机肥' },
      { code: '02', name: '化学肥料' },
      { code: '03', name: '微生物菌剂/生物刺激素' },
      { code: '04', name: '土壤调理剂' },
      { code: '05', name: '育苗基质' },
      { code: '99', name: '其他肥料类' },
    ]
  },
  // 农药与植保产品类 PP
  {
    code: 'PP',
    name: '农药与植保产品类',
    nameEn: 'Pesticide & Plant Protection',
    midCategories: [
      { code: '01', name: '杀虫剂' },
      { code: '02', name: '杀菌剂' },
      { code: '03', name: '除草剂' },
      { code: '04', name: '植物生长调节剂' },
      { code: '05', name: '绿色防控产品' },
      { code: '06', name: '生物农药' },
      { code: '99', name: '其他植保产品' },
    ]
  },
  // 农业机械与设备类 EQ
  {
    code: 'EQ',
    name: '农业机械与设备类',
    nameEn: 'Agricultural Machinery & Equipment',
    midCategories: [
      { code: '01', name: '耕作与动力机械' },
      { code: '02', name: '播种/移栽设备' },
      { code: '03', name: '植保机械' },
      { code: '04', name: '收获与采收机械' },
      { code: '05', name: '初加工与分选设备' },
      { code: '99', name: '其他农机设备' },
    ]
  },
  // 设施农业资材类 FA
  {
    code: 'FA',
    name: '设施农业资材类',
    nameEn: 'Facility Agriculture Materials',
    midCategories: [
      { code: '01', name: '温室/大棚骨架材料' },
      { code: '02', name: '覆盖材料' },
      { code: '03', name: '通风降温设备' },
      { code: '04', name: '加温设备' },
      { code: '05', name: '补光系统' },
      { code: '06', name: '智能环控系统' },
      { code: '99', name: '其他设施农业资材' },
    ]
  },
  // 灌溉与水肥一体化类 IR
  {
    code: 'IR',
    name: '灌溉与水肥一体化类',
    nameEn: 'Irrigation & Fertilization',
    midCategories: [
      { code: '01', name: '水泵与水源设备' },
      { code: '02', name: '输水管网' },
      { code: '03', name: '过滤系统' },
      { code: '04', name: '施肥装置' },
      { code: '05', name: '灌溉终端' },
      { code: '99', name: '其他灌溉设备' },
    ]
  },
  // 日常劳保与劳动工具类 OP
  {
    code: 'OP',
    name: '日常劳保与劳动工具类',
    nameEn: 'Labor Protection & Tools',
    midCategories: [
      { code: '01', name: '劳动防护用品' },
      { code: '02', name: '日常手动工具' },
      { code: '03', name: '小型电动工具' },
      { code: '04', name: '清洁与卫生用品' },
      { code: '99', name: '其他作业支持用品' },
    ]
  },
  // 仓储与物流资材类 PH
  {
    code: 'PH',
    name: '仓储与物流资材类',
    nameEn: 'Storage & Logistics Materials',
    midCategories: [
      { code: '01', name: '采收容器' },
      { code: '02', name: '农产品包装材料' },
      { code: '03', name: '冷链设备' },
      { code: '04', name: '装卸与仓储设备' },
      { code: '99', name: '其他采后处理' },
    ]
  },
  // 检测与技术服务类 TS
  {
    code: 'TS',
    name: '检测与技术服务类',
    nameEn: 'Testing & Technical Services',
    midCategories: [
      { code: '01', name: '土壤/水质检测服务' },
      { code: '02', name: '农残快检设备与试剂' },
      { code: '03', name: '农业物联网设备' },
      { code: '04', name: '数字农业软件服务' },
      { code: '05', name: '农业技术咨询与培训' },
      { code: '99', name: '其他技术服务' },
    ]
  },
  // 能源与辅助耗材类 UT
  {
    code: 'UT',
    name: '能源与辅助耗材类',
    nameEn: 'Energy & Auxiliary Consumables',
    midCategories: [
      { code: '01', name: '燃油/润滑油' },
      { code: '02', name: '电力与新能源' },
      { code: '03', name: '通用工业耗材' },
      { code: '99', name: '其他能源与耗材' },
    ]
  },
  // 其他综合类 OT
  {
    code: 'OT',
    name: '其他综合类',
    nameEn: 'Others',
    midCategories: [
      { code: '01', name: '其他未分类供应商' },
    ]
  },
];

export default function SupplierCodeRule() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<BigCategory[]>(initialCategories);
  const [expandedBig, setExpandedBig] = useState<Set<string>>(new Set(initialCategories.map(c => c.code)));
  const [editingCell, setEditingCell] = useState<{type: 'big' | 'mid'; bigCode: string; midCode?: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAddBig, setShowAddBig] = useState(false);
  const [showAddMid, setShowAddMid] = useState<string | null>(null);
  const [newBigCode, setNewBigCode] = useState('');
  const [newBigName, setNewBigName] = useState('');
  const [newMidCode, setNewMidCode] = useState('');
  const [newMidName, setNewMidName] = useState('');
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

  // 开始编辑
  const startEdit = (type: 'big' | 'mid', bigCode: string, midCode?: string, currentName?: string) => {
    setEditingCell({ type, bigCode, midCode });
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
          return { ...mid, name: editValue.trim() };
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
  const addMidCategory = (bigCode: string, midCode: string, midName: string) => {
    if (!midCode.trim() || !midName.trim()) return;
    setCategories(prev => prev.map(big => {
      if (big.code !== bigCode) return big;
      return {
        ...big,
        midCategories: [...big.midCategories, {
          code: midCode.trim(),
          name: midName.trim()
        }]
      };
    }));
    setNewMidCode('');
    setNewMidName('');
    setShowAddMid(null);
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

  // 渲染编辑单元格
  const renderEditCell = (type: 'big' | 'mid', bigCode: string, midCode?: string, currentName?: string) => {
    if (editingCell?.type === type && editingCell?.bigCode === bigCode && editingCell?.midCode === midCode) {
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
            className="w-40 px-2 py-1 border border-emerald-500 rounded text-sm focus:outline-none"
            autoFocus
          />
          <button onClick={saveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
            <Save className="w-4 h-4" />
          </button>
          <button onClick={cancelEdit} className="p-1 text-gray-500 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 group">
        <span className="cursor-pointer hover:text-emerald-600" onClick={() => startEdit(type, bigCode, midCode, currentName)}>
          {currentName}
        </span>
        <button
          onClick={() => startEdit(type, bigCode, midCode, currentName)}
          className="opacity-0 group-hover:opacity-100 p-1 text-blue-500 hover:bg-blue-50 rounded transition-opacity"
        >
          <Edit2 className="w-3 h-3" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
              <Hash className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">供应商编码规则</h1>
              <p className="text-gray-500">编码结构：大类代码(2位) + 中类代码(2位) + 流水号(3位)，前缀 SU_</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                <Edit2 className="w-4 h-4" />
                修改规则
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  取消修改
                </button>
                <button
                  onClick={() => setShowSaveConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  <Save className="w-4 h-4" />
                  保存修改
                </button>
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
      <div className="bg-white rounded-xl shadow-sm overflow-hidden w-1/2">
        <table className="w-full">
          <thead className="bg-emerald-600">
            <tr>
              <th className="px-2 py-3 text-left text-base font-semibold text-white w-24">大类代码</th>
              <th className="px-2 py-3 text-left text-base font-semibold text-white">大类名称</th>
              <th className="px-2 py-3 text-left text-base font-semibold text-white w-24">中类代码</th>
              <th className="px-2 py-3 text-left text-base font-semibold text-white w-48">中类名称</th>
            </tr>
            {/* 添加大类按钮 - 表格顶部 */}
            {isEditing && (
              <tr className="bg-white">
                <td colSpan={4} className="px-2 py-2">
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
                      <button onClick={addBigCategory} className="px-3 py-1 bg-emerald-600 text-white rounded text-sm">添加</button>
                      <button onClick={() => setShowAddBig(false)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm">取消</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddBig(true)}
                      className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700"
                    >
                      <Plus className="w-4 h-4" /> 添加大类
                    </button>
                  )}
                </td>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-gray-300">
            {/* 渲染大类标题行（始终可见） */}
            {categories.map((big) => {
              return (
                <>
                  {/* 大类标题行 - 始终显示 */}
                  <tr key={`big-${big.code}`} className="bg-white hover:bg-gray-50">
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleBig(big.code)} className="p-1 hover:bg-gray-300 rounded">
                          {expandedBig.has(big.code) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </button>
                        <span className="font-mono font-bold text-blue-600 text-sm">{big.code}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center">
                          {renderEditCell('big', big.code, undefined, big.name)}
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
                  </tr>

                  {/* 如果大类已展开，渲染中类 */}
                  {expandedBig.has(big.code) && big.midCategories.map((mid) => {
                    return (
                      <tr key={`mid-${big.code}-${mid.code}`} className="bg-white hover:bg-gray-50">
                        <td className="px-2 py-2"></td>
                        <td className="px-2 py-2"></td>
                        <td className="px-2 py-2">
                          <span className="font-mono text-blue-600 font-medium text-sm">{mid.code}</span>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            {isEditing ? renderEditCell('mid', big.code, mid.code, mid.name) : <span className="font-medium text-gray-800 text-sm">{mid.name}</span>}
                            {isEditing && (
                              <button
                                onClick={() => deleteMidCategory(big.code, mid.code)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* 添加中类按钮 - 在大类的最后 */}
                  {isEditing && (
                    <tr key={`add-mid-${big.code}`} className="bg-white hover:bg-gray-50">
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => setShowAddMid(big.code)}
                          className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
                        >
                          <Plus className="w-4 h-4" /> 添加中类
                        </button>
                      </td>
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
      <AddMidModal
        isOpen={!!showAddMid}
        onClose={() => setShowAddMid(null)}
        bigCode={showAddMid || ''}
        onAdd={(midCode, midName) => addMidCategory(showAddMid!, midCode, midName)}
      />

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
                  <span>如果修改后的编码规则与系统中已有的供应商编码冲突，可能导致系统无法识别该供应商</span>
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
              <button
                onClick={() => setShowSaveConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                取消保存
              </button>
              <button
                onClick={() => {
                  setShowSaveConfirm(false);
                  setIsEditing(false);
                  alert('编码规则已保存！（演示模式）');
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                确认保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
