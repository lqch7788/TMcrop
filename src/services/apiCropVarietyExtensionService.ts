/**
 * 作物品种库扩展 API 服务
 * 调用后端 API 存储用户新增的类型、品种、子品种
 */

const API_BASE = '/api/crop-varieties/extensions';

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

// 获取所有类型扩展
export async function getAllTypeExtensions(): Promise<TypeExtension[]> {
  const res = await fetch(`${API_BASE}/types`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '获取类型扩展失败');
  return data.data || [];
}

// 获取指定类别的类型扩展
export async function getTypeExtensionsByCategory(categoryCode: string): Promise<TypeExtension[]> {
  const res = await fetch(`${API_BASE}/types/${categoryCode}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '获取类型扩展失败');
  return data.data || [];
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
}

// 删除类型扩展
export async function deleteTypeExtension(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/types/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '删除类型扩展失败');
}

// 获取所有品种扩展
export async function getAllVarietyExtensions(): Promise<VarietyExtension[]> {
  const res = await fetch(`${API_BASE}/varieties`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '获取品种扩展失败');
  return data.data || [];
}

// 获取指定类型的品种扩展
export async function getVarietyExtensionsByType(categoryCode: string, typeCode: string): Promise<VarietyExtension[]> {
  const res = await fetch(`${API_BASE}/varieties/${categoryCode}/${typeCode}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '获取品种扩展失败');
  return data.data || [];
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
}

// 删除品种扩展
export async function deleteVarietyExtension(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/varieties/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '删除品种扩展失败');
}

// 获取所有子品种1扩展
export async function getAllSubVariety1Extensions(): Promise<SubVariety1Extension[]> {
  const res = await fetch(`${API_BASE}/subvariety1`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '获取子品种1扩展失败');
  return data.data || [];
}

// 获取指定品种的子品种1扩展
export async function getSubVariety1ExtensionsByVariety(
  categoryCode: string,
  typeCode: string,
  varietyCode: string
): Promise<SubVariety1Extension[]> {
  const res = await fetch(`${API_BASE}/subvariety1/${categoryCode}/${typeCode}/${varietyCode}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '获取子品种1扩展失败');
  return data.data || [];
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
}

// 删除子品种1扩展
export async function deleteSubVariety1Extension(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/subvariety1/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '删除子品种1扩展失败');
}
