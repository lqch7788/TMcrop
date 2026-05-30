/**
 * 客户档案 API 服务
 */
import { enhancedApiClient } from '../lib/apiClient';
import { Customer } from '../types/customer.types';

// 字段映射：camelCase -> snake_case
const FIELD_MAP: Record<string, string> = {
  customerCode: 'customer_code',
  customerName: 'customer_name',
  contactPerson: 'contact_person',
  contactPhone: 'contact_phone',
  deliveryAddress: 'delivery_address',
  remarks: 'remarks',
  createBy: 'create_by',
};

// 反向映射：snake_case -> camelCase
const REVERSE_FIELD_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(FIELD_MAP).map(([camel, snake]) => [snake, camel])
);

/**
 * 转换数据为 snake_case（后端格式）
 */
function toSnakeCase(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const snakeKey = FIELD_MAP[key] || key;
    result[snakeKey] = value;
  }
  return result;
}

/**
 * 规范化客户数据（snake_case -> camelCase）
 */
function normalizeCustomer(customer: Record<string, unknown>): Customer {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(customer)) {
    const camelKey = REVERSE_FIELD_MAP[key] || key;
    result[camelKey] = value;
  }
  return result as unknown as Customer;
}

/**
 * 规范化客户列表
 */
function normalizeCustomers(customers: Record<string, unknown>[]): Customer[] {
  return customers.map(normalizeCustomer);
}

/**
 * 获取客户列表
 */
export async function getCustomers(params?: { search?: string }): Promise<Customer[]> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  const query = searchParams.toString();
  const response = await enhancedApiClient.get<{ data: Record<string, unknown>[]; total: number }>(`/customers${query ? `?${query}` : ''}`);
  // 处理响应格式：API 返回 { data: [], total: 1 }，需要规范化字段
  if (response && typeof response === 'object' && 'data' in response) {
    const data = (response as { data: Record<string, unknown>[] }).data || [];
    return normalizeCustomers(data);
  }
  return [];
}

/**
 * 获取客户详情
 */
export async function getCustomerById(id: string): Promise<Customer | undefined> {
  return await enhancedApiClient.get<Customer>(`/customers/${id}`);
}

/**
 * 创建客户
 */
export async function createCustomer(data: Partial<Customer>): Promise<Customer> {
  const response = await enhancedApiClient.post<{ success: boolean; data: Record<string, unknown> }>('/customers', toSnakeCase(data as Record<string, unknown>));
  // 处理响应格式：{ success: true, data: { ... } }
  if (response && typeof response === 'object' && 'data' in response) {
    return normalizeCustomer((response as { data: Record<string, unknown> }).data);
  }
  // 兼容直接返回数据的情况
  return normalizeCustomer(response as Record<string, unknown>);
}

/**
 * 更新客户
 */
export async function updateCustomer(id: string, data: Partial<Customer>): Promise<boolean> {
  await enhancedApiClient.put(`/customers/${id}`, toSnakeCase(data as Record<string, unknown>));
  return true;
}

/**
 * 删除客户
 */
export async function deleteCustomer(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/customers/${id}`);
  return true;
}
