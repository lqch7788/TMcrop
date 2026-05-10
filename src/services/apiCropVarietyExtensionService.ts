/**
 * 作物品种库扩展 API 服务
 * 调用后端 API 存储用户新增的类型、品种、子品种
 * API失败时降级到 localStorage
 */

const API_BASE = '/api/crop-varieties/extensions';

// localStorage 配置
const TYPE_EXT_STORAGE_KEY = 'yuanxingtu_type_extensions';
const VARIETY_EXT_STORAGE_KEY = 'yuanxingtu_variety_extensions';
const SUB_VARIETY1_EXT_STORAGE_KEY = 'yuanxingtu_subvariety1_extensions';

// 类型扩展
export interface TypeExtension {
  id: string;
  category_code: string;
  category_name?: string;
  type_code: string;
  type_name: string;
  sort_order?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

// 品种扩展
export interface VarietyExtension {
  id: string;
  category_code: string;
  type_code: string;
  variety_code: string;
  variety_name: string;
  sort_order?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

// 子品种1扩展
export interface SubVariety1Extension {
  id: string;
  category_code: string;
  type_code: string;
  variety_code: string;
  sub_variety1_code: string;
  sub_variety1_name: string;
  sort_order?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

// 从 localStorage 读取数据
function getStoredTypeExtensions(): TypeExtension[] {
  try {
    const stored = localStorage.getItem(TYPE_EXT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function getStoredVarietyExtensions(): VarietyExtension[] {
  try {
    const stored = localStorage.getItem(VARIETY_EXT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function getStoredSubVariety1Extensions(): SubVariety1Extension[] {
  try {
    const stored = localStorage.getItem(SUB_VARIETY1_EXT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// 保存数据到 localStorage
function saveTypeExtensions(data: TypeExtension[]): void {
  localStorage.setItem(TYPE_EXT_STORAGE_KEY, JSON.stringify(data));
}

function saveVarietyExtensions(data: VarietyExtension[]): void {
  localStorage.setItem(VARIETY_EXT_STORAGE_KEY, JSON.stringify(data));
}

function saveSubVariety1Extensions(data: SubVariety1Extension[]): void {
  localStorage.setItem(SUB_VARIETY1_EXT_STORAGE_KEY, JSON.stringify(data));
}

// 获取所有类型扩展（带localStorage降级）
export async function getAllTypeExtensions(): Promise<TypeExtension[]> {
  try {
    const res = await fetch(`${API_BASE}/types`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || '获取类型扩展失败');
    saveTypeExtensions(data.data || []);
    return data.data || [];
  } catch (error) {
    console.warn('[品种扩展API] 获取类型扩展失败，降级到localStorage:', error);
    return getStoredTypeExtensions();
  }
}

// 获取指定类别的类型扩展（带localStorage降级）
export async function getTypeExtensionsByCategory(categoryCode: string): Promise<TypeExtension[]> {
  try {
    const res = await fetch(`${API_BASE}/types/${categoryCode}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || '获取类型扩展失败');
    return data.data || [];
  } catch (error) {
    console.warn('[品种扩展API] 获取类型扩展失败，降级到localStorage:', error);
    const stored = getStoredTypeExtensions();
    return stored.filter(t => t.category_code === categoryCode);
  }
}

// 创建类型扩展
export async function addTypeExtension(
  categoryCode: string,
  categoryName: string,
  typeCode: string,
  typeName: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category_code: categoryCode,
      category_name: categoryName,
      type_code: typeCode,
      type_name: typeName
    })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '创建类型扩展失败');
  // 同步到 localStorage
  const stored = getStoredTypeExtensions();
  stored.push(data.data);
  saveTypeExtensions(stored);
}

// 删除类型扩展
export async function deleteTypeExtension(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/types/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '删除类型扩展失败');
  // 从 localStorage 移除
  const stored = getStoredTypeExtensions();
  const filtered = stored.filter(t => t.id !== id);
  saveTypeExtensions(filtered);
}

// 更新类型扩展
export async function updateTypeExtension(
  id: string,
  typeName: string,
  sortOrder?: number,
  status?: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/types/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type_name: typeName,
      sort_order: sortOrder,
      status
    })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '更新类型扩展失败');
  // 同步到 localStorage
  const stored = getStoredTypeExtensions();
  const index = stored.findIndex(t => t.id === id);
  if (index !== -1) {
    stored[index] = { ...stored[index], type_name: typeName, sort_order: sortOrder, status };
    saveTypeExtensions(stored);
  }
}

// 获取所有品种扩展（带localStorage降级）
export async function getAllVarietyExtensions(): Promise<VarietyExtension[]> {
  try {
    const res = await fetch(`${API_BASE}/varieties`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || '获取品种扩展失败');
    saveVarietyExtensions(data.data || []);
    return data.data || [];
  } catch (error) {
    console.warn('[品种扩展API] 获取品种扩展失败，降级到localStorage:', error);
    return getStoredVarietyExtensions();
  }
}

// 获取指定类型的品种扩展（带localStorage降级）
export async function getVarietyExtensionsByType(categoryCode: string, typeCode: string): Promise<VarietyExtension[]> {
  try {
    const res = await fetch(`${API_BASE}/varieties/${categoryCode}/${typeCode}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || '获取品种扩展失败');
    return data.data || [];
  } catch (error) {
    console.warn('[品种扩展API] 获取品种扩展失败，降级到localStorage:', error);
    const stored = getStoredVarietyExtensions();
    return stored.filter(v => v.category_code === categoryCode && v.type_code === typeCode);
  }
}

// 创建品种扩展
export async function addVarietyExtension(
  categoryCode: string,
  typeCode: string,
  varietyCode: string,
  varietyName: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/varieties`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category_code: categoryCode,
      type_code: typeCode,
      variety_code: varietyCode,
      variety_name: varietyName
    })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '创建品种扩展失败');
  // 同步到 localStorage
  const stored = getStoredVarietyExtensions();
  stored.push(data.data);
  saveVarietyExtensions(stored);
}

// 删除品种扩展
export async function deleteVarietyExtension(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/varieties/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '删除品种扩展失败');
  // 从 localStorage 移除
  const stored = getStoredVarietyExtensions();
  const filtered = stored.filter(v => v.id !== id);
  saveVarietyExtensions(filtered);
}

// 更新品种扩展
export async function updateVarietyExtension(
  id: string,
  varietyName: string,
  sortOrder?: number,
  status?: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/varieties/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      variety_name: varietyName,
      sort_order: sortOrder,
      status
    })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '更新品种扩展失败');
  // 同步到 localStorage
  const stored = getStoredVarietyExtensions();
  const index = stored.findIndex(v => v.id === id);
  if (index !== -1) {
    stored[index] = { ...stored[index], variety_name: varietyName, sort_order: sortOrder, status };
    saveVarietyExtensions(stored);
  }
}

// 获取所有子品种1扩展（带localStorage降级）
export async function getAllSubVariety1Extensions(): Promise<SubVariety1Extension[]> {
  try {
    const res = await fetch(`${API_BASE}/subvariety1`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || '获取子品种1扩展失败');
    saveSubVariety1Extensions(data.data || []);
    return data.data || [];
  } catch (error) {
    console.warn('[品种扩展API] 获取子品种1扩展失败，降级到localStorage:', error);
    return getStoredSubVariety1Extensions();
  }
}

// 获取指定品种的子品种1扩展（带localStorage降级）
export async function getSubVariety1ExtensionsByVariety(
  categoryCode: string,
  typeCode: string,
  varietyCode: string
): Promise<SubVariety1Extension[]> {
  try {
    const res = await fetch(`${API_BASE}/subvariety1/${categoryCode}/${typeCode}/${varietyCode}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || '获取子品种1扩展失败');
    return data.data || [];
  } catch (error) {
    console.warn('[品种扩展API] 获取子品种1扩展失败，降级到localStorage:', error);
    const stored = getStoredSubVariety1Extensions();
    return stored.filter(s => s.category_code === categoryCode && s.type_code === typeCode && s.variety_code === varietyCode);
  }
}

// 创建子品种1扩展
export async function addSubVariety1Extension(
  categoryCode: string,
  typeCode: string,
  varietyCode: string,
  subVariety1Code: string,
  subVariety1Name: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/subvariety1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category_code: categoryCode,
      type_code: typeCode,
      variety_code: varietyCode,
      sub_variety1_code: subVariety1Code,
      sub_variety1_name: subVariety1Name
    })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '创建子品种1扩展失败');
  // 同步到 localStorage
  const stored = getStoredSubVariety1Extensions();
  stored.push(data.data);
  saveSubVariety1Extensions(stored);
}

// 删除子品种1扩展
export async function deleteSubVariety1Extension(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/subvariety1/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '删除子品种1扩展失败');
  // 从 localStorage 移除
  const stored = getStoredSubVariety1Extensions();
  const filtered = stored.filter(s => s.id !== id);
  saveSubVariety1Extensions(filtered);
}

// 更新子品种1扩展
export async function updateSubVariety1Extension(
  id: string,
  subVariety1Name: string,
  sortOrder?: number,
  status?: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/subvariety1/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sub_variety1_name: subVariety1Name,
      sort_order: sortOrder,
      status
    })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '更新子品种1扩展失败');
  // 同步到 localStorage
  const stored = getStoredSubVariety1Extensions();
  const index = stored.findIndex(s => s.id === id);
  if (index !== -1) {
    stored[index] = { ...stored[index], sub_variety1_name: subVariety1Name, sort_order: sortOrder, status };
    saveSubVariety1Extensions(stored);
  }
}
