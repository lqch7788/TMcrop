/**
 * 供应商编码规则分类数据 Store
 * 数据流：API → IndexedDB → localStorage（三级降级）
 * 保存增删改后的分类层级结构，避免清缓存丢失
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

// 初始分类数据（与 data.ts supplierCategories 保持一致）
const initialCategories: BigCategory[] = [
  {
    code: 'SP', name: '种子与种苗类', nameEn: 'Seed & Seedling',
    midCategories: [
      { code: '01', name: '粮食作物种子' }, { code: '02', name: '经济作物种子' }, { code: '03', name: '蔬菜种子/种苗' },
      { code: '04', name: '水果苗木' }, { code: '05', name: '花卉与观赏植物' }, { code: '06', name: '食用菌/药用菌菌种' }, { code: '99', name: '其他种质资源' },
    ]
  },
  {
    code: 'FE', name: '肥料与土壤改良类', nameEn: 'Fertilizer & Soil Amendment',
    midCategories: [
      { code: '01', name: '有机肥' }, { code: '02', name: '化学肥料' }, { code: '03', name: '微生物菌剂/生物刺激素' },
      { code: '04', name: '土壤调理剂' }, { code: '05', name: '育苗基质' }, { code: '99', name: '其他肥料类' },
    ]
  },
  {
    code: 'PP', name: '农药与植保产品类', nameEn: 'Pesticide & Plant Protection',
    midCategories: [
      { code: '01', name: '杀虫剂' }, { code: '02', name: '杀菌剂' }, { code: '03', name: '除草剂' },
      { code: '04', name: '植物生长调节剂' }, { code: '05', name: '绿色防控产品' }, { code: '06', name: '生物农药' }, { code: '99', name: '其他植保产品' },
    ]
  },
  {
    code: 'EQ', name: '农业机械与设备类', nameEn: 'Agricultural Machinery & Equipment',
    midCategories: [
      { code: '01', name: '耕作与动力机械' }, { code: '02', name: '播种/移栽设备' }, { code: '03', name: '植保机械' },
      { code: '04', name: '收获与采收机械' }, { code: '05', name: '初加工与分选设备' }, { code: '99', name: '其他农机设备' },
    ]
  },
  {
    code: 'FA', name: '设施农业资材类', nameEn: 'Facility Agriculture Materials',
    midCategories: [
      { code: '01', name: '温室/大棚骨架材料' }, { code: '02', name: '覆盖材料' }, { code: '03', name: '通风降温设备' },
      { code: '04', name: '加温设备' }, { code: '05', name: '补光系统' }, { code: '06', name: '智能环控系统' }, { code: '99', name: '其他设施农业资材' },
    ]
  },
  {
    code: 'IR', name: '灌溉与水肥一体化类', nameEn: 'Irrigation & Fertilization',
    midCategories: [
      { code: '01', name: '水泵与水源设备' }, { code: '02', name: '输水管网' }, { code: '03', name: '过滤系统' },
      { code: '04', name: '施肥装置' }, { code: '05', name: '灌溉终端' }, { code: '99', name: '其他灌溉设备' },
    ]
  },
  {
    code: 'OP', name: '日常劳保与劳动工具类', nameEn: 'Labor Protection & Tools',
    midCategories: [
      { code: '01', name: '劳动防护用品' }, { code: '02', name: '日常手动工具' }, { code: '03', name: '小型电动工具' },
      { code: '04', name: '清洁与卫生用品' }, { code: '99', name: '其他作业支持用品' },
    ]
  },
  {
    code: 'PH', name: '仓储与物流资材类', nameEn: 'Storage & Logistics Materials',
    midCategories: [
      { code: '01', name: '采收容器' }, { code: '02', name: '农产品包装材料' }, { code: '03', name: '冷链设备' },
      { code: '04', name: '装卸与仓储设备' }, { code: '99', name: '其他采后处理' },
    ]
  },
  {
    code: 'TS', name: '检测与技术服务类', nameEn: 'Testing & Technical Services',
    midCategories: [
      { code: '01', name: '土壤/水质检测服务' }, { code: '02', name: '农残快检设备与试剂' }, { code: '03', name: '农业物联网设备' },
      { code: '04', name: '数字农业软件服务' }, { code: '05', name: '农业技术咨询与培训' }, { code: '99', name: '其他技术服务' },
    ]
  },
  {
    code: 'UT', name: '能源与辅助耗材类', nameEn: 'Energy & Auxiliary Consumables',
    midCategories: [
      { code: '01', name: '燃油/润滑油' }, { code: '02', name: '电力与新能源' }, { code: '03', name: '通用工业耗材' }, { code: '99', name: '其他能源与耗材' },
    ]
  },
  {
    code: 'OT', name: '其他综合类', nameEn: 'Others',
    midCategories: [
      { code: '01', name: '其他未分类供应商' },
    ]
  },
];

interface SupplierCodeRuleState {
  categories: BigCategory[];
  // 操作方法
  setCategories: (categories: BigCategory[]) => void;
  updateBigName: (bigCode: string, newName: string) => void;
  updateMidName: (bigCode: string, midCode: string, newName: string) => void;
  addBigCategory: (code: string, name: string) => void;
  addMidCategory: (bigCode: string, code: string, name: string) => void;
  deleteBigCategory: (bigCode: string) => void;
  deleteMidCategory: (bigCode: string, midCode: string) => void;
  resetToDefault: () => void;
}

export const useSupplierCodeRuleStore = create<SupplierCodeRuleState>()(
  persist(
    (set) => ({
      categories: initialCategories,

      setCategories: (categories) => set({ categories }),

      updateBigName: (bigCode, newName) =>
        set((state) => ({
          categories: state.categories.map((big) =>
            big.code === bigCode ? { ...big, name: newName } : big
          ),
        })),

      updateMidName: (bigCode, midCode, newName) =>
        set((state) => ({
          categories: state.categories.map((big) =>
            big.code !== bigCode
              ? big
              : {
                  ...big,
                  midCategories: big.midCategories.map((mid) =>
                    mid.code === midCode ? { ...mid, name: newName } : mid
                  ),
                }
          ),
        })),

      addBigCategory: (code, name) =>
        set((state) => ({
          categories: [
            ...state.categories,
            { code, name, nameEn: '', midCategories: [] },
          ],
        })),

      addMidCategory: (bigCode, code, name) =>
        set((state) => ({
          categories: state.categories.map((big) =>
            big.code !== bigCode
              ? big
              : {
                  ...big,
                  midCategories: [...big.midCategories, { code, name }],
                }
          ),
        })),

      deleteBigCategory: (bigCode) =>
        set((state) => ({
          categories: state.categories.filter((big) => big.code !== bigCode),
        })),

      deleteMidCategory: (bigCode, midCode) =>
        set((state) => ({
          categories: state.categories.map((big) =>
            big.code !== bigCode
              ? big
              : {
                  ...big,
                  midCategories: big.midCategories.filter((mid) => mid.code !== midCode),
                }
          ),
        })),

      resetToDefault: () => set({ categories: initialCategories }),
    }),
    {
      name: 'supplier-code-rule-storage',
    }
  )
);
