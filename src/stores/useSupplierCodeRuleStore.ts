/**
 * 供应商编码规则 Store
 *
 * 架构：Component → Zustand Store → enhancedApiClient → 后端API (SQLite)
 * 数据流：GET/POST/PUT/DELETE /api/material-code-categories?rule_type=supplier
 *
 * 对接后端: /api/material-code-categories（复用 material_code_categories 表，rule_type='supplier'）
 * 无缓存层，直接调用 API（V2.1 铁律）
 */

import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

// ==================== 类型定义（与组件兼容） ====================

export interface MidCategory {
  code: string;
  name: string;
}

export interface BigCategory {
  code: string;
  name: string;
  nameEn: string;
  midCategories: MidCategory[];
}

/** API 返回的平铺行格式 */
interface FlatCategoryRow {
  id?: string;
  code: string;
  name: string;
  nameEn?: string;
  parentCode?: string;
  level: 'big' | 'mid';
  ruleType?: string;
  sortOrder?: number;
  status?: string;
}

// ==================== 默认数据（fallback 用） ====================

const defaultCategories: BigCategory[] = [
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

// ==================== 平铺行 ↔ 树形结构转换 ====================

/** API 平铺行 → 树形 BigCategory[] */
function rowsToTree(rows: FlatCategoryRow[]): BigCategory[] {
  const bigMap = new Map<string, BigCategory>();

  for (const row of rows) {
    if (row.level === 'big') {
      bigMap.set(row.code, {
        code: row.code,
        name: row.name,
        nameEn: row.nameEn || '',
        midCategories: [],
      });
    }
  }

  for (const row of rows) {
    if (row.level === 'mid' && row.parentCode && bigMap.has(row.parentCode)) {
      const big = bigMap.get(row.parentCode)!;
      // 避免重复添加
      if (!big.midCategories.find(m => m.code === row.code)) {
        big.midCategories.push({ code: row.code, name: row.name });
      }
    }
  }

  return Array.from(bigMap.values());
}

// ==================== Store 接口 ====================

interface SupplierCodeRuleState {
  categories: BigCategory[];
  isLoading: boolean;
  error: string | null;

  // 数据加载
  fetchCategories: () => Promise<void>;

  // 将本地修改同步到后端（迁移用）

  // CRUD 方法（乐观更新 + API 持久化）
  setCategories: (categories: BigCategory[]) => void;
  updateBigName: (bigCode: string, newName: string) => Promise<void>;
  updateMidName: (bigCode: string, midCode: string, newName: string) => Promise<void>;
  addBigCategory: (code: string, name: string) => Promise<void>;
  addMidCategory: (bigCode: string, code: string, name: string) => Promise<void>;
  deleteBigCategory: (bigCode: string) => Promise<void>;
  deleteMidCategory: (bigCode: string, midCode: string) => Promise<void>;
  resetToDefault: () => void;
}

export const useSupplierCodeRuleStore = create<SupplierCodeRuleState>()(
  (set, get)=> ({
      categories: defaultCategories,
      isLoading: false,
      error: null,

      // ---------- 获取分类（从后端 API）----------
      fetchCategories: async () => {
        set({ isLoading: true, error: null });
        try {
          // 2026-09-28 审计修复：enhancedApiClient 对 {success,data} 响应会自动解包成 data（数组），
          // 原写法 `response?.data || []` 恒为 undefined → 分类树永远为空 → 界面回落到硬编码兜底，
          // 规则页的维护结果永远读不到（这是"编码规则页编辑无效"的第二个独立缺陷）
          const response = await enhancedApiClient.get<FlatCategoryRow[] | { data: FlatCategoryRow[] }>(
            '/material-code-categories?rule_type=supplier'
          );
          const data: FlatCategoryRow[] = Array.isArray(response)
            ? response
            : Array.isArray((response as any)?.data)
              ? (response as any).data
              : [];

          if (Array.isArray(data) && data.length > 0) {
            const tree = rowsToTree(data);
            // 2026-09-28 审计修复（重要）：删除"本地 → API 增量同步"逻辑。
            // 该逻辑是 localStorage 时代的遗留（V2.1 铁律已禁止本地持久化），判定条件为
            // "本地内存分类 ≠ 硬编码默认值"——而本地内存一旦被 API 数据覆盖就永远满足，
            // 于是**每次进入页面都会把 71 条分类整份 POST 一遍**；
            // 原本被 404 掩盖（见 fetchCategories 的 URL 修复），URL 修好后立刻变成
            // 无上限重复写：material_code_categories 的 supplier 行从 22/120 涨到 1327/7235。
            // 服务端才是唯一数据源，前端只读不写。
            set({ categories: tree, isLoading: false });
          } else {
            // API 返回空：保留硬编码兜底供首次种子环境使用，但**不再回写服务端**
            set({ isLoading: false });
          }
        } catch (error) {
          // logger.warn('[SupplierCodeRuleStore] API 获取失败，API 失败抛错（V2.1 铁律：无缓存兜底）:', error);
          // zustand persist 自动从 localStorage 恢复
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      // ---------- 整体设置（批量替换）----------
      setCategories: (categories) => set({ categories }),

      // ---------- 更新大类名称 ----------
      updateBigName: async (bigCode, newName) => {
        const prev = get().categories;
        // 乐观更新本地
        set({
          categories: prev.map((big) =>
            big.code === bigCode ? { ...big, name: newName } : big
          ),
        });
        try {
          // 2026-09-28 审计修复：显式带 rule_type（后端缺省会落到 'material' 误改物料规则）+ parent_code 精确定位
          await enhancedApiClient.put(`/material-code-categories/${bigCode}?rule_type=supplier&parent_code=`, {
            name: newName,
          });
        } catch (error) {
          // 2026-09-28 审计修复：不再空吞——写失败必须能从控制台/state 看到（此前界面显示成功、刷新回滚）
          console.error('[SupplierCodeRuleStore] 更新大类名称失败:', error);
          set({ error: error instanceof Error ? error.message : '更新大类名称失败' });
        }
      },

      // ---------- 更新中类名称 ----------
      updateMidName: async (bigCode, midCode, newName) => {
        // 乐观更新本地
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
        }));
        try {
          // 2026-09-28：中类 code 跨大类重复，必须带 parent_code（后端命中多行会 409 拒绝）
          await enhancedApiClient.put(`/material-code-categories/${midCode}?rule_type=supplier&parent_code=${encodeURIComponent(bigCode)}`, {
            name: newName,
          });
        } catch (error) {
          console.error('[SupplierCodeRuleStore] 更新中类名称失败:', error);
          set({ error: error instanceof Error ? error.message : '更新中类名称失败' });
        }
      },

      // ---------- 添加大类 ----------
      addBigCategory: async (code, name) => {
        // 乐观更新本地
        set((state) => ({
          categories: [
            ...state.categories,
            { code, name, nameEn: '', midCategories: [] },
          ],
        }));
        try {
          await enhancedApiClient.post('/material-code-categories', {
            code,
            name,
            nameEn: '',
            parentCode: '',
            level: 'big',
            ruleType: 'supplier',
          });
        } catch (error) {
          // logger.warn('[SupplierCodeRuleStore] 添加大类失败:', error);
        }
      },

      // ---------- 添加中类 ----------
      addMidCategory: async (bigCode, code, name) => {
        // 乐观更新本地
        set((state) => ({
          categories: state.categories.map((big) =>
            big.code !== bigCode
              ? big
              : {
                  ...big,
                  midCategories: [...big.midCategories, { code, name }],
                }
          ),
        }));
        try {
          await enhancedApiClient.post('/material-code-categories', {
            code,
            name,
            nameEn: '',
            parentCode: bigCode,
            level: 'mid',
            ruleType: 'supplier',
          });
        } catch (error) {
          // logger.warn('[SupplierCodeRuleStore] 添加中类失败:', error);
        }
      },

      // ---------- 删除大类（级联删除中类）----------
      deleteBigCategory: async (bigCode) => {
        // 乐观删除本地
        set((state) => ({
          categories: state.categories.filter((big) => big.code !== bigCode),
        }));
        try {
          // 2026-09-28 审计修复：必须带 rule_type（后端缺省 'material' 会跨域误删物料编码规则，
          // 物料与供应商大类 SP/EQ/OP/PH/OT 撞码）+ parent_code='' 精确定位大类
          await enhancedApiClient.delete(`/material-code-categories/${bigCode}?rule_type=supplier&parent_code=`);
        } catch (error) {
          console.error('[SupplierCodeRuleStore] 删除大类失败:', error);
          set({ error: error instanceof Error ? error.message : '删除大类失败' });
        }
      },

      // ---------- 删除中类 ----------
      deleteMidCategory: async (bigCode, midCode) => {
        // 乐观删除本地
        set((state) => ({
          categories: state.categories.map((big) =>
            big.code !== bigCode
              ? big
              : {
                  ...big,
                  midCategories: big.midCategories.filter((mid) => mid.code !== midCode),
                }
          ),
        }));
        try {
          // 2026-09-28：中类 code 跨大类重复，必须带 parent_code（否则一次停用 11 个大类下的同名中类）
          await enhancedApiClient.delete(`/material-code-categories/${midCode}?rule_type=supplier&parent_code=${encodeURIComponent(bigCode)}`);
        } catch (error) {
          console.error('[SupplierCodeRuleStore] 删除中类失败:', error);
          set({ error: error instanceof Error ? error.message : '删除中类失败' });
        }
      },

      // ---------- 重置为默认值 ----------
      resetToDefault: () => set({ categories: defaultCategories }),
    })
);
