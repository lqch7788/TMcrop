/**
 * 当前登录基地 Store（2026-10-25）
 *
 * 背景：
 *   系统需要「当前基地」上下文 —— 用户选定一个基地后，
 *   所有业务列表只显示该基地的数据，新建记录自动归属该基地。
 *   此前 Header 顶部的「宁波北仑基地 >>」是硬编码文本，无实际作用。
 *
 * 存储：
 *   用 localStorage 持久化**单个 base_oid**（用户界面偏好，不是业务数据缓存）。
 *   项目铁律禁止的是「业务数据 localStorage 兜底」，此处仅记住"上次选的基地"，
 *   刷新后保持选择，不涉及任何业务数据。
 *
 * 与后端协议：
 *   apiClientRequest 会读取本 store 的 baseOid，注入请求头 `X-Base-Oid`。
 */
import { create } from 'zustand';

const LS_KEY = 'current_base_oid';

/** 基地信息（下拉展示用） */
export interface BaseOption {
  oid: string;
  name: string;
}

interface CurrentBaseState {
  /** 当前基地 OID；null = 未指定（不过滤） */
  baseOid: string | null;
  /** 当前基地名称（展示用） */
  baseName: string | null;
  /** 可选基地列表 */
  options: BaseOption[];
  /** 设置当前基地 */
  setBase: (oid: string | null, name?: string | null) => void;
  /** 设置可选基地列表 */
  setOptions: (list: BaseOption[]) => void;
  /** 从 localStorage 恢复 */
  restore: () => void;
}

function readStored(): { oid: string | null; name: string | null } {
  try {
    const oid = localStorage.getItem(LS_KEY);
    const name = localStorage.getItem(LS_KEY + '_name');
    return { oid: oid || null, name: name || null };
  } catch {
    return { oid: null, name: null };
  }
}

// 模块加载时立即恢复（保证刷新后 Header 与请求头都用上次选的基地）
const initialBase = (() => {
  try {
    return {
      oid: localStorage.getItem(LS_KEY) || null,
      name: localStorage.getItem(LS_KEY + '_name') || null,
    };
  } catch {
    return { oid: null, name: null };
  }
})();

export const useCurrentBaseStore = create<CurrentBaseState>()((set) => ({
  baseOid: initialBase.oid,
  baseName: initialBase.name,
  options: [],

  setBase: (oid, name) => {
    try {
      if (oid) {
        localStorage.setItem(LS_KEY, oid);
        if (name) localStorage.setItem(LS_KEY + '_name', name);
      } else {
        localStorage.removeItem(LS_KEY);
        localStorage.removeItem(LS_KEY + '_name');
      }
    } catch { /* 忽略存储异常 */ }
    set({ baseOid: oid, baseName: name ?? null });
  },

  setOptions: (list) => set({ options: list }),

  restore: () => {
    const { oid, name } = readStored();
    if (oid) set({ baseOid: oid, baseName: name });
  },
}));

/** 非组件环境读取（apiClient 用） */
export function getCurrentBaseOid(): string | null {
  try {
    // 优先 store（运行时最新值），回落 localStorage（模块加载早期）
    const fromStore = useCurrentBaseStore.getState().baseOid;
    if (fromStore) return fromStore;
    return localStorage.getItem(LS_KEY) || null;
  } catch {
    return null;
  }
}

export default useCurrentBaseStore;
