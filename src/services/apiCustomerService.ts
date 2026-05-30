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
 * 获取客户列表
 */
export async function getCustomers(params?: { search?: string }): Promise<Customer[]> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  const query = searchParams.toString();
  const response = await enhancedApiClient.get<Customer[]>(`/customers${query ? `?${query}` : ''}`);
  return response || [];
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
  const response = await enhancedApiClient.post<Customer>('/customers', toSnakeCase(data as Record<string, unknown>));
  return response;
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
