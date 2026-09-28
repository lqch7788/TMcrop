/**
 * 供应商管理 Zustand Store (V2.1 架构 - 已简化)
 * 数据流：enhancedApiClient → Store → 页面组件
 * 无缓存层，直接调用API
 */
import { create } from 'zustand';
import { Supplier } from '../components/supplier/types';
import { enhancedApiClient } from '../lib/apiClient';

interface SupplierState {
  items: Supplier[];
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;

  loadItems: (force?: boolean) => Promise<void>;
  // 2026-07-18 P2-M4：fetchItems 别名
  fetchItems: (force?: boolean) => Promise<void>;
  addItem: (item: Omit<Supplier, 'id'>) => Promise<Supplier | null>;
  // 2026-09-28：id 更正为 string（DB 主键是 TEXT）
  updateItem: (id: string, updates: Partial<Supplier>) => Promise<Supplier | null>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteItems: (ids: string[]) => Promise<boolean>;

  /** 前端内存搜索（避免重复请求） */
  search: (keyword: string) => Supplier[];
  /** 合作中的供应商下拉选项（status = 合作中 / active） */
  getActiveOptions: () => Array<{ value: string; label: string; code: string }>;
  /**
   * 2026-09-28 审计修复：可供新建业务选择的供应商
   * 默认只返回「合作中」——「暂停/终止」的供应商不应能被选中建立新的入库/采购业务
   * （此前各下游直接吃全量，唯一的状态过滤函数无任何调用方）
   */
  getSelectableOptions: (opts?: { includePaused?: boolean }) => Array<{ value: string; label: string; code: string; status: string }>;
}

/**
 * 前端camelCase → 后端请求体snake_case映射
 *
 * 2026-09-28 审计修复（两处）：
 * ① 只输出**显式传入**的键——原实现给 bank_name/bank_card_number 兜底 `|| ''`、
 *    status 兜底 'active'，局部更新（批量编辑只改电话）会把银行信息清空、
 *    把"暂停"的供应商静默复活；
 * ② status 补第三态「终止」→'terminated'（UI 三处弹窗都提供该选项，原来一律落成 active，
 *    导致"选终止保存后变合作中"、筛选器「终止」永远筛不到数据）
 */
const STATUS_TO_BACKEND: Record<string, string> = {
  '合作中': 'active',
  '暂停': 'paused',
  '终止': 'terminated',
};

function toBackendFields(item: Partial<Supplier>): Record<string, unknown> {
  const map: Record<string, unknown> = {
    supplier_code: item.code,
    supplier_name: item.name,
    contact_person: item.contact,
    mobile_phone: item.mobilePhone,
    work_phone: item.workPhone,
    fax: item.fax,
    address: item.address,
    supplier_type: item.supplierType,
    supplier_attribute: item.supplierAttribute,
    status: item.status !== undefined ? (STATUS_TO_BACKEND[item.status] || item.status) : undefined,
    country: item.country,
    province: item.province,
    city: item.city,
    bank_name: item.bankName,
    bank_card_number: item.bankCardNumber,
    organization: item.organization,
    create_date: item.createDate,
    remarks: item.remarks,
    create_by: item.createBy,
    // 2026-09-28 批次B：三类强制资质证照
    pesticide_license_no: item.pesticideLicenseNo,
    pesticide_license_expiry: item.pesticideLicenseExpiry,
    seed_filing_no: item.seedFilingNo,
    seed_filing_expiry: item.seedFilingExpiry,
    fertilizer_reg_no: item.fertilizerRegNo,
    fertilizer_reg_expiry: item.fertilizerRegExpiry,
    // 2026-09-28 批次C：经营决策字段（数值列显式转 Number，空值落 0）
    is_internal: item.isInternal,
    settlement_type: item.settlementType,
    credit_days: item.creditDays === undefined ? undefined : (Number(item.creditDays) || 0),
    rating: item.rating === undefined ? undefined : (Number(item.rating) || 0),
  };
  // 丢弃 undefined（JSON.stringify 本就会丢，但这里显式过滤避免上层误用）
  return Object.fromEntries(Object.entries(map).filter(([, v]) => v !== undefined));
}

/**
 * 后端API响应 → 前端camelCase映射
 */
function fromBackendFields(record: Record<string, unknown>): Supplier {
  const r = record as any;
  return {
    id: r.id,
    code: r.supplierCode || r.supplier_code || r.code || '',
    name: r.supplierName || r.supplier_name || r.name || '',
    supplierType: r.supplierType || r.supplier_type || r.supplierType || '',
    supplierAttribute: r.supplierAttribute || r.supplier_attribute || r.supplierAttribute || '',
    contact: r.contactPerson || r.contact_person || r.contact || '',
    mobilePhone: r.mobilePhone || r.mobile_phone || r.contactPhone || r.contact_phone || '',
    workPhone: r.workPhone || r.work_phone || '',
    fax: r.fax || '',
    // 2026-09-28：状态回读支持三态（active/paused/terminated）+ 兼容历史 inactive
    status: r.status === 'active' ? '合作中'
      : (r.status === 'paused' || r.status === 'inactive') ? '暂停'
        : r.status === 'terminated' ? '终止'
          : r.status || '',
    country: r.country || '',
    province: r.province || '',
    city: r.city || '',
    address: r.address || '',
    bankName: r.bankName || r.bank_name || '',
    bankCardNumber: r.bankCardNumber || r.bank_card_number || '',
    organization: r.organization || '',
    createDate: r.createDate || r.create_date || '',
    remarks: r.remarks || '',
    // 2026-09-28 批次B：资质证照（camelCase 优先，兼容 snake_case 未过中间件的场景）
    pesticideLicenseNo: r.pesticideLicenseNo || r.pesticide_license_no || '',
    pesticideLicenseExpiry: r.pesticideLicenseExpiry || r.pesticide_license_expiry || '',
    seedFilingNo: r.seedFilingNo || r.seed_filing_no || '',
    seedFilingExpiry: r.seedFilingExpiry || r.seed_filing_expiry || '',
    fertilizerRegNo: r.fertilizerRegNo || r.fertilizer_reg_no || '',
    fertilizerRegExpiry: r.fertilizerRegExpiry || r.fertilizer_reg_expiry || '',
    // 2026-09-28 批次C：经营决策
    isInternal: r.isInternal || r.is_internal || 'external',
    settlementType: r.settlementType || r.settlement_type || '',
    creditDays: Number(r.creditDays ?? r.credit_days ?? 0) || 0,
    rating: Number(r.rating ?? 0) || 0,
  };
}

const STALE_MS = 5 * 60 * 1000; // 5 分钟内不重复请求

export const useSupplierStore = create<SupplierState>()(
  (set, get) => ({
    items: [],
    isLoading: false,
    error: null,
    lastFetch: null,

    loadItems: async (force = false) => {
      // 防止并发
      if (get().isLoading) return;
      // 5 分钟内不重复拉取
      const last = get().lastFetch;
      if (!force && get().items.length > 0 && last != null
          && Date.now() - last < STALE_MS) {
        return;
      }
      set({ isLoading: true, error: null });
      try {
        const resp = await enhancedApiClient.get<Record<string, unknown>[]>('/suppliers?limit=1000');
        const list = Array.isArray(resp) ? resp : [];
        const mapped = list.map(fromBackendFields);
        set({ items: mapped, isLoading: false, lastFetch: Date.now() });
      } catch (error) {
        // logger.error('[useSupplierStore] 获取供应商失败:', error);
        set({ error: error instanceof Error ? error.message : '获取供应商失败', isLoading: false });
      }
    },

    // 2026-07-18 P2-M4：fetchItems 别名
    fetchItems: async (force) => { await get().loadItems(force); },

    /** 前端内存关键字过滤 */
    search: (keyword: string) => {
      const items = get().items;
      if (!keyword.trim()) return items;
      const lower = keyword.toLowerCase().trim();
      return items.filter(s =>
        s.name.toLowerCase().includes(lower) ||
        s.code.toLowerCase().includes(lower) ||
        s.contact.toLowerCase().includes(lower) ||
        s.mobilePhone.includes(keyword)
      );
    },

    /** 合作中的供应商（用于下拉） */
    getActiveOptions: () => {
      return get().items
        .filter(s => s.status === '合作中' || s.status === 'active')
        .map(s => ({ value: String(s.id), label: s.name, code: s.code }));
    },

    /** 可供新建业务选择的供应商（默认仅「合作中」） */
    getSelectableOptions: (opts) => {
      return get().items
        .filter(s => s.status === '合作中' || s.status === 'active'
          || (opts?.includePaused === true && s.status === '暂停'))
        .map(s => ({ value: String(s.id), label: s.name, code: s.code, status: s.status }));
    },

    addItem: async (item) => {
      try {
        const backendData = toBackendFields(item);
        backendData.id = item.code || `SUP${Date.now()}`;
        const result = await enhancedApiClient.post<Record<string, unknown>>('/suppliers', backendData);
        // 2026-09-28：后端现已返回完整记录；用后端结果回填更准（含服务端默认值/审计字段）
        const filled = result && (result as { supplierCode?: string }).supplierCode
          ? fromBackendFields(result)
          : null;
        // Supplier 带索引签名，展开 Omit<Supplier,'id'> 会被收窄 → 显式断言回填类型
        const optimistic: Supplier = { ...(item as Supplier), id: String(result?.id || item.code || `SUP${Date.now()}`) };
        const newItem: Supplier = filled || optimistic;
        set((s) => ({ items: [newItem, ...s.items], error: null }));
        return newItem;
      } catch (error) {
        // 2026-09-28 审计修复：fail-loud——写失败原因写入 store.error（此前只 return null，页面只能说"请重试"）
        set({ error: error instanceof Error ? error.message : '添加供应商失败' });
        return null;
      }
    },

    updateItem: async (id, updates) => {
      try {
        const backendUpdates = toBackendFields(updates);
        const result = await enhancedApiClient.put<Record<string, unknown>>(`/suppliers/${id}`, backendUpdates);
        let found: Supplier | null = null;
        set((s) => {
          const updated = s.items.map((i) => i.id === id
            ? (result && (result as { supplierCode?: string }).supplierCode ? fromBackendFields(result) : ({ ...i, ...updates } as Supplier))
            : i);
          found = updated.find((i) => i.id === id) || null;
          return { items: updated, error: null };
        });
        return found;
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '更新供应商失败' });
        return null;
      }
    },

    deleteItem: async (id) => {
      try {
        await enhancedApiClient.delete(`/suppliers/${id}`);
        set((s) => ({ items: s.items.filter((i) => i.id !== id), error: null }));
        return true;
      } catch (error) {
        // 2026-09-28：删除被引用守卫拦下时，把后端原因（含引用明细）透出
        set({ error: error instanceof Error ? error.message : '删除供应商失败' });
        return false;
      }
    },

    deleteItems: async (ids) => {
      try {
        const results = await Promise.allSettled(ids.map((id) => enhancedApiClient.delete(`/suppliers/${id}`)));
        const okIds = ids.filter((_, i) => results[i].status === 'fulfilled');
        const failedIds = ids.filter((_, i) => results[i].status === 'rejected');
        // 2026-09-28 审计修复：逐条收集——已成功的从列表移除（此前部分失败则整批不回滚本地状态）
        if (okIds.length > 0) set((s) => ({ items: s.items.filter((i) => !okIds.includes(i.id)) }));
        if (failedIds.length > 0) {
          const first = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
          const reason = first?.reason instanceof Error ? first.reason.message : '未知原因';
          set({ error: `${failedIds.length} 条删除失败：${reason}` });
          return false;
        }
        set({ error: null });
        return true;
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '批量删除供应商失败' });
        return false;
      }
    },
  })
);
