/**
 * 销售协同系统 API 服务
 * 对接后端 /api/market/* 路由
 *
 * 包含模块：
 * - 订单管理（order）
 * - 客户管理（customer）
 * - 价格监测（price）
 * - 销售渠道（channel）
 * - 市场行情趋势（trend）
 * - 销售统计（statistics）
 * - 销售总览（sales）
 *
 * 数据流：API → enhancedApiClient → 组件（V2.1 铁律：无缓存层）
 * 网络策略：API 直连，禁止任何 localStorage / IndexedDB 兜底
 */

import { enhancedApiClient } from '../lib/apiClient';

// ========== 实体接口 ==========

/**
 * 销售订单
 */
export interface Order {
  id: string;
  orderNo: string;
  customer: string;
  contact: string;
  phone: string;
  product: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  status: string;            // 待审核 / 待发货 / 配送中 / 已完成 / 已取消
  createDate: string;
  deliveryDate: string;
  remark?: string;
}

/**
 * 客户档案
 */
export interface Customer {
  id: string;
  code: string;
  name: string;
  type: string;              // 批发商 / 超市 / 电商 / 农贸市场 / 个体 / 食堂
  contact: string;
  phone: string;
  address: string;
  creditLevel: string;       // AAA / AA / A / BB
  totalAmount: number;
  orderCount: number;
  lastOrder: string;
  status: string;            // 正常 / 暂停
}

/**
 * 价格监测（行情价格）
 */
export interface Price {
  id: string;
  cropName: string;
  category: string;
  market: string;
  unit: string;
  currentPrice: number;
  yesterdayPrice: number;
  weekPrice: number;
  monthPrice: number;
  trend: string;             // up / down / stable
  changeRate: string;
  alertStatus: string;       // 正常 / 预警
}

/**
 * 销售渠道
 */
export interface Channel {
  id: string;
  code: string;
  name: string;
  type: string;              // 超市 / 电商 / 批发商 / 个体 / 食堂
  region: string;
  contact: string;
  phone: string;
  products: string;
  monthlySales: number;
  orderCount: number;
  status: string;            // 合作中 / 暂停
  joinDate: string;
}

/**
 * 市场行情趋势（按月汇总 + 各市场行情）
 */
export interface Trend {
  id: string;
  month?: string;            // 月份（销售趋势用）
  marketName?: string;       // 市场名称（行情列表用）
  region?: string;
  avgPrice?: number;
  amount?: number;
  orders?: number;
  volume?: number;
  trend?: string;            // 上涨 / 下跌 / 平稳
  topProduct?: string;
  updateTime?: string;
  status?: string;
}

/**
 * 销售统计（按产品维度）
 */
export interface Statistic {
  id: string;
  productName: string;
  category: string;
  totalSales: number;
  totalVolume: number;
  orderCount: number;
  avgPrice: number;
  changeRate?: string;
  trend?: string;
}

/**
 * 销售总览（首页 dashboard 用）
 */
export interface SalesOverview {
  monthSales: number;
  orderCount: number;
  customerCount: number;
  avgPrice: number;
  monthLabel?: string;
  trend?: Array<{ month: string; amount: number; orders: number }>;
  recentOrders?: Array<Order>;
}

// ========== 响应解包 + 字段映射 ==========

/**
 * 后端订单原始字段 → 前端 Order 字段
 * 后端返回：orderNo, customerName, contact, phone, items[], totalAmount, status, createDate, itemsSummary
 * 前端需要：id, orderNo, customer, contact, phone, product, quantity, unitPrice, amount, status, createDate, deliveryDate, remark
 */
function normalizeOrder(raw: Record<string, unknown>, index: number): Order {
  // 计算数量：所有明细 quantity 之和；单价：所有明细 unitPrice 之和作为综合单价（保留 2 位小数）
  const items = Array.isArray(raw.items) ? (raw.items as Array<Record<string, unknown>>) : [];
  const totalQty = items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
  const totalSubtotal = items.reduce((sum, it) => sum + Number(it.subtotal || 0), 0);
  const avgUnitPrice = totalQty > 0 ? Math.round((totalSubtotal / totalQty) * 100) / 100 : 0;

  return {
    id: String(raw.orderNo || `order-${index}`),
    orderNo: String(raw.orderNo || ''),
    customer: String(raw.customerName || ''),
    contact: String(raw.contact || ''),
    phone: String(raw.phone || ''),
    product: String(raw.itemsSummary || ''),
    quantity: totalQty,
    unitPrice: avgUnitPrice,
    amount: Number(raw.totalAmount || 0),
    status: String(raw.status || ''),
    createDate: String(raw.createDate || ''),
    deliveryDate: '-',
    remark: '',
  };
}

/**
 * 后端客户原始字段 → 前端 Customer 字段
 * 后端返回：customerNo, name, contact, phone, type, address, level, registerDate, totalAmount
 * 前端需要：id, code, name, type, contact, phone, address, creditLevel, totalAmount, orderCount, lastOrder, status
 */
function normalizeCustomer(raw: Record<string, unknown>, index: number): Customer {
  return {
    id: String(raw.customerNo || `customer-${index}`),
    code: String(raw.customerNo || ''),
    name: String(raw.name || ''),
    type: String(raw.type || ''),
    contact: String(raw.contact || ''),
    phone: String(raw.phone || ''),
    address: String(raw.address || ''),
    creditLevel: String(raw.level || '普通'),
    totalAmount: Number(raw.totalAmount || 0),
    orderCount: 0,
    lastOrder: '',
    status: '正常',
  };
}

// ========== API 函数 ==========

/**
 * 获取订单列表
 * GET /api/market/order
 * 后端返回 { data: OrderRaw[], total: number }，解包 data 并规范化字段
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getOrders(): Promise<Order[]> {
  const response = await enhancedApiClient.get<{ data: Record<string, unknown>[]; total: number }>('/market/order');
  if (response && typeof response === 'object' && 'data' in response) {
    const list = (response as { data: Record<string, unknown>[] }).data || [];
    return list.map((row, idx) => normalizeOrder(row, idx));
  }
  return [];
}

/**
 * 获取客户列表
 * GET /api/market/customer
 * 后端返回 { data: CustomerRaw[], total: number }，解包 data 并规范化字段
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getCustomers(): Promise<Customer[]> {
  const response = await enhancedApiClient.get<{ data: Record<string, unknown>[]; total: number }>('/market/customer');
  if (response && typeof response === 'object' && 'data' in response) {
    const list = (response as { data: Record<string, unknown>[] }).data || [];
    return list.map((row, idx) => normalizeCustomer(row, idx));
  }
  return [];
}

/**
 * 获取价格监测列表
 * GET /api/market/price
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getPrices(): Promise<Price[]> {
  const response = await enhancedApiClient.get<{ data: Record<string, unknown>[]; total: number }>('/market/price');
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: Record<string, unknown>[] }).data || [];
  }
  return [];
}

/**
 * 获取销售渠道列表
 * GET /api/market/channel
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getChannels(): Promise<Channel[]> {
  const response = await enhancedApiClient.get<{ data: Record<string, unknown>[]; total: number }>('/market/channel');
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: Record<string, unknown>[] }).data || [];
  }
  return [];
}

/**
 * 获取市场行情趋势列表
 * GET /api/market/trend
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getTrends(): Promise<Trend[]> {
  const response = await enhancedApiClient.get<{ data: Record<string, unknown>[]; total: number }>('/market/trend');
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: Record<string, unknown>[] }).data || [];
  }
  return [];
}

/**
 * 获取销售统计数据
 * GET /api/market/statistics
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getStatistics(): Promise<Statistic[]> {
  const response = await enhancedApiClient.get<{ data: Record<string, unknown>[]; total: number }>('/market/statistics');
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: Record<string, unknown>[] }).data || [];
  }
  return [];
}

/**
 * 获取销售总览数据
 * GET /api/market/sales
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getSalesOverview(): Promise<SalesOverview> {
  return await enhancedApiClient.get<SalesOverview>('/market/sales');
}