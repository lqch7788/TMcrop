/**
 * 销售协同系统 API 路由
 *
 * 提供销售协同（市场端）所需的列表数据接口（mock 数据，未对接数据库）：
 * - GET /market/order        销售订单列表
 * - GET /market/customer     客户列表
 * - GET /market/price        价格行情列表
 * - GET /market/channel      销售渠道列表
 * - GET /market/trend        市场行情列表
 * - GET /market/statistics   销售统计列表
 * - GET /market/sales        销售总览列表
 *
 * 所有接口返回统一结构：{ data: [...], total: number }
 */

import { Router } from 'express';

const router = Router();

// =============================================================
// 1. 销售订单 mock 数据（10 条）
// =============================================================
const orders = [
  {
    orderNo: 'SO20260301',
    customerName: '绿源果蔬批发',
    contact: '张经理',
    phone: '13800138001',
    items: [
      { name: '阳光玫瑰葡萄', quantity: 50, unitPrice: 38, subtotal: 1900 },
      { name: '巨峰葡萄', quantity: 30, unitPrice: 22, subtotal: 660 },
    ],
    totalAmount: 2560,
    status: '已完成',
    createDate: '2026-03-01',
    itemsSummary: '阳光玫瑰葡萄50斤+巨峰葡萄30斤',
  },
  {
    orderNo: 'SO20260302',
    customerName: '鲜达连锁超市',
    contact: '李采购',
    phone: '13800138002',
    items: [
      { name: '红提葡萄', quantity: 80, unitPrice: 28, subtotal: 2240 },
    ],
    totalAmount: 2240,
    status: '配送中',
    createDate: '2026-03-02',
    itemsSummary: '红提葡萄80斤',
  },
  {
    orderNo: 'SO20260303',
    customerName: '果汇贸易',
    contact: '王总',
    phone: '13800138003',
    items: [
      { name: '阳光玫瑰葡萄', quantity: 120, unitPrice: 36, subtotal: 4320 },
      { name: '葡萄籽', quantity: 10, unitPrice: 80, subtotal: 800 },
    ],
    totalAmount: 5120,
    status: '待审核',
    createDate: '2026-03-03',
    itemsSummary: '阳光玫瑰葡萄120斤+葡萄籽10袋',
  },
  {
    orderNo: 'SO20260304',
    customerName: '悦享鲜生',
    contact: '赵店长',
    phone: '13800138004',
    items: [
      { name: '夏黑葡萄', quantity: 60, unitPrice: 26, subtotal: 1560 },
      { name: '巨峰葡萄', quantity: 40, unitPrice: 22, subtotal: 880 },
    ],
    totalAmount: 2440,
    status: '待发货',
    createDate: '2026-03-04',
    itemsSummary: '夏黑葡萄60斤+巨峰葡萄40斤',
  },
  {
    orderNo: 'SO20260305',
    customerName: '禾源农贸',
    contact: '孙老板',
    phone: '13800138005',
    items: [
      { name: '阳光玫瑰葡萄', quantity: 200, unitPrice: 40, subtotal: 8000 },
    ],
    totalAmount: 8000,
    status: '已完成',
    createDate: '2026-03-05',
    itemsSummary: '阳光玫瑰葡萄200斤',
  },
  {
    orderNo: 'SO20260306',
    customerName: '鼎盛果品',
    contact: '周经理',
    phone: '13800138006',
    items: [
      { name: '葡萄枝条', quantity: 50, unitPrice: 5, subtotal: 250 },
      { name: '红提葡萄', quantity: 100, unitPrice: 27, subtotal: 2700 },
    ],
    totalAmount: 2950,
    status: '配送中',
    createDate: '2026-03-06',
    itemsSummary: '葡萄枝条50捆+红提葡萄100斤',
  },
  {
    orderNo: 'SO20260307',
    customerName: '天润连锁',
    contact: '吴采购',
    phone: '13800138007',
    items: [
      { name: '巨峰葡萄', quantity: 150, unitPrice: 21, subtotal: 3150 },
    ],
    totalAmount: 3150,
    status: '已取消',
    createDate: '2026-03-07',
    itemsSummary: '巨峰葡萄150斤',
  },
  {
    orderNo: 'SO20260308',
    customerName: '盛康生鲜',
    contact: '郑总',
    phone: '13800138008',
    items: [
      { name: '阳光玫瑰葡萄', quantity: 80, unitPrice: 38, subtotal: 3040 },
      { name: '夏黑葡萄', quantity: 40, unitPrice: 25, subtotal: 1000 },
    ],
    totalAmount: 4040,
    status: '待审核',
    createDate: '2026-03-08',
    itemsSummary: '阳光玫瑰葡萄80斤+夏黑葡萄40斤',
  },
  {
    orderNo: 'SO20260309',
    customerName: '华东果业',
    contact: '冯经理',
    phone: '13800138009',
    items: [
      { name: '红提葡萄', quantity: 300, unitPrice: 26, subtotal: 7800 },
    ],
    totalAmount: 7800,
    status: '配送中',
    createDate: '2026-03-09',
    itemsSummary: '红提葡萄300斤',
  },
  {
    orderNo: 'SO20260310',
    customerName: '都市鲜行',
    contact: '陈店长',
    phone: '13800138010',
    items: [
      { name: '阳光玫瑰葡萄', quantity: 60, unitPrice: 38, subtotal: 2280 },
      { name: '葡萄籽', quantity: 20, unitPrice: 85, subtotal: 1700 },
    ],
    totalAmount: 3980,
    status: '待发货',
    createDate: '2026-03-10',
    itemsSummary: '阳光玫瑰葡萄60斤+葡萄籽20袋',
  },
];

// =============================================================
// 2. 客户 mock 数据（10 条）
// =============================================================
const customers = [
  { customerNo: 'CUS2026001', name: '绿源果蔬批发', contact: '张经理', phone: '13800138001', type: '企业', address: '北京市朝阳区大洋路市场', level: 'VIP', registerDate: '2024-05-12', totalAmount: 128000 },
  { customerNo: 'CUS2026002', name: '鲜达连锁超市', contact: '李采购', phone: '13800138002', type: '企业', address: '上海市浦东新区张江路88号', level: 'VIP', registerDate: '2024-06-03', totalAmount: 215600 },
  { customerNo: 'CUS2026003', name: '果汇贸易', contact: '王总', phone: '13800138003', type: '企业', address: '广州市天河区珠江新城A座', level: '普通', registerDate: '2024-08-15', totalAmount: 55800 },
  { customerNo: 'CUS2026004', name: '悦享鲜生门店', contact: '赵店长', phone: '13800138004', type: '企业', address: '深圳市南山区科技园', level: '普通', registerDate: '2025-01-20', totalAmount: 42600 },
  { customerNo: 'CUS2026005', name: '禾源农贸', contact: '孙老板', phone: '13800138005', type: '企业', address: '南京市雨花台区应天大街', level: 'VIP', registerDate: '2024-03-08', totalAmount: 312000 },
  { customerNo: 'CUS2026006', name: '王女士', contact: '王女士', phone: '13800138006', type: '个人', address: '杭州市西湖区文三路', level: '普通', registerDate: '2025-09-10', totalAmount: 3600 },
  { customerNo: 'CUS2026007', name: '鼎盛果品', contact: '周经理', phone: '13800138007', type: '企业', address: '成都市武侯区高新大道', level: '普通', registerDate: '2024-11-25', totalAmount: 78400 },
  { customerNo: 'CUS2026008', name: '天润连锁', contact: '吴采购', phone: '13800138008', type: '企业', address: '武汉市江汉区解放大道', level: 'VIP', registerDate: '2024-07-19', totalAmount: 168500 },
  { customerNo: 'CUS2026009', name: '李先生', contact: '李先生', phone: '13800138009', type: '个人', address: '重庆市渝中区解放碑', level: '普通', registerDate: '2025-12-01', totalAmount: 1800 },
  { customerNo: 'CUS2026010', name: '盛康生鲜', contact: '郑总', phone: '13800138010', type: '企业', address: '西安市雁塔区高新路', level: '普通', registerDate: '2025-04-22', totalAmount: 62300 },
];

// =============================================================
// 路由实现
// =============================================================

// GET /market/order - 销售订单列表
router.get('/order', (req, res) => {
  res.json({ data: orders, total: orders.length });
});

// GET /market/customer - 客户列表
router.get('/customer', (req, res) => {
  res.json({ data: customers, total: customers.length });
});

// =============================================================
// 3. 价格行情 mock 数据（10 条）
// =============================================================
const prices = [
  { priceNo: 'PR2026001', product: '阳光玫瑰葡萄', basePrice: 36, currentPrice: 38, trend: '上涨', changeRate: 5.6, market: '北京新发地', updateTime: '2026-03-10 09:30' },
  { priceNo: 'PR2026002', product: '巨峰葡萄', basePrice: 24, currentPrice: 22, trend: '下降', changeRate: -8.3, market: '北京新发地', updateTime: '2026-03-10 09:30' },
  { priceNo: 'PR2026003', product: '红提葡萄', basePrice: 28, currentPrice: 28, trend: '平稳', changeRate: 0, market: '上海辉展', updateTime: '2026-03-10 10:00' },
  { priceNo: 'PR2026004', product: '夏黑葡萄', basePrice: 25, currentPrice: 26, trend: '上涨', changeRate: 4.0, market: '广州江南', updateTime: '2026-03-10 10:15' },
  { priceNo: 'PR2026005', product: '葡萄籽', basePrice: 80, currentPrice: 85, trend: '上涨', changeRate: 6.3, market: '深圳布吉', updateTime: '2026-03-10 10:30' },
  { priceNo: 'PR2026006', product: '葡萄枝条', basePrice: 5, currentPrice: 5, trend: '平稳', changeRate: 0, market: '南京众彩', updateTime: '2026-03-10 11:00' },
  { priceNo: 'PR2026007', product: '阳光玫瑰葡萄', basePrice: 36, currentPrice: 37, trend: '上涨', changeRate: 2.8, market: '杭州勾庄', updateTime: '2026-03-10 09:45' },
  { priceNo: 'PR2026008', product: '巨峰葡萄', basePrice: 24, currentPrice: 21, trend: '下降', changeRate: -12.5, market: '成都濛阳', updateTime: '2026-03-10 10:20' },
  { priceNo: 'PR2026009', product: '红提葡萄', basePrice: 28, currentPrice: 30, trend: '上涨', changeRate: 7.1, market: '武汉白沙洲', updateTime: '2026-03-10 11:10' },
  { priceNo: 'PR2026010', product: '夏黑葡萄', basePrice: 25, currentPrice: 24, trend: '下降', changeRate: -4.0, market: '西安雨润', updateTime: '2026-03-10 11:30' },
];

// =============================================================
// 4. 销售渠道 mock 数据（10 条）
// =============================================================
const channels = [
  { channelNo: 'CH2026001', name: '京东自营旗舰店', type: '线上', region: '全国', contact: '京东运营-小王', sales: 320000, status: '运营中', createDate: '2024-02-10' },
  { channelNo: 'CH2026002', name: '天猫旗舰店', type: '线上', region: '全国', contact: '天猫运营-小李', sales: 286000, status: '运营中', createDate: '2024-03-05' },
  { channelNo: 'CH2026003', name: '拼多多旗舰店', type: '线上', region: '全国', contact: '拼多多运营-小张', sales: 158000, status: '运营中', createDate: '2024-04-18' },
  { channelNo: 'CH2026004', name: '抖音电商', type: '线上', region: '全国', contact: '抖音运营-小赵', sales: 198000, status: '运营中', createDate: '2024-06-22' },
  { channelNo: 'CH2026005', name: '盒马鲜生', type: '线下', region: '华东', contact: '盒马采购-陈总', sales: 412000, status: '运营中', createDate: '2024-01-15' },
  { channelNo: 'CH2026006', name: '永辉超市', type: '线下', region: '全国', contact: '永辉采购-林经理', sales: 268000, status: '运营中', createDate: '2024-05-08' },
  { channelNo: 'CH2026007', name: '北京新发地批发', type: '线下', region: '华北', contact: '新发地-老张', sales: 580000, status: '运营中', createDate: '2023-11-20' },
  { channelNo: 'CH2026008', name: '上海辉展批发', type: '线下', region: '华东', contact: '辉展-王老板', sales: 425000, status: '运营中', createDate: '2023-12-12' },
  { channelNo: 'CH2026009', name: '广州江南批发', type: '线下', region: '华南', contact: '江南-李总', sales: 380000, status: '已停用', createDate: '2023-09-08' },
  { channelNo: 'CH2026010', name: '微信社群团购', type: '线上', region: '本地', contact: '社群团长-孙姐', sales: 96000, status: '运营中', createDate: '2024-08-30' },
];

// =============================================================
// 5. 市场行情 mock 数据（10 条）
// =============================================================
const trends = [
  { trendNo: 'TR2026001', product: '阳光玫瑰葡萄', period: '2026-03 第1周', avgPrice: 37, changeRate: 5.6, volume: 12000, trend: '上涨', date: '2026-03-07' },
  { trendNo: 'TR2026002', product: '巨峰葡萄', period: '2026-03 第1周', avgPrice: 22, changeRate: -8.3, volume: 8500, trend: '下降', date: '2026-03-07' },
  { trendNo: 'TR2026003', product: '红提葡萄', period: '2026-03 第1周', avgPrice: 28, changeRate: 0, volume: 9200, trend: '平稳', date: '2026-03-07' },
  { trendNo: 'TR2026004', product: '夏黑葡萄', period: '2026-03 第1周', avgPrice: 26, changeRate: 4.0, volume: 6800, trend: '上涨', date: '2026-03-07' },
  { trendNo: 'TR2026005', product: '葡萄籽', period: '2026-03 第1周', avgPrice: 83, changeRate: 6.3, volume: 1500, trend: '上涨', date: '2026-03-07' },
  { trendNo: 'TR2026006', product: '阳光玫瑰葡萄', period: '2026-02 第4周', avgPrice: 35, changeRate: 2.9, volume: 10800, trend: '上涨', date: '2026-02-28' },
  { trendNo: 'TR2026007', product: '巨峰葡萄', period: '2026-02 第4周', avgPrice: 24, changeRate: -2.1, volume: 8800, trend: '下降', date: '2026-02-28' },
  { trendNo: 'TR2026008', product: '红提葡萄', period: '2026-02 第4周', avgPrice: 28, changeRate: 1.8, volume: 9300, trend: '上涨', date: '2026-02-28' },
  { trendNo: 'TR2026009', product: '夏黑葡萄', period: '2026-02 第4周', avgPrice: 25, changeRate: 0, volume: 6500, trend: '平稳', date: '2026-02-28' },
  { trendNo: 'TR2026010', product: '葡萄籽', period: '2026-02 第4周', avgPrice: 78, changeRate: -1.3, volume: 1400, trend: '下降', date: '2026-02-28' },
];

// =============================================================
// 6. 销售统计 mock 数据（10 条）
// =============================================================
const statistics = [
  { id: '1', productName: '番茄', category: '茄果类', totalSales: 125600, totalVolume: 18800, orderCount: 156, avgPrice: 6.68, changeRate: '12.5', trend: '上涨' },
  { id: '2', productName: '黄瓜', category: '瓜菜类', totalSales: 98600, totalVolume: 23400, orderCount: 134, avgPrice: 4.21, changeRate: '-8.2', trend: '下跌' },
  { id: '3', productName: '草莓', category: '浆果类', totalSales: 87200, totalVolume: 3480, orderCount: 89, avgPrice: 25.06, changeRate: '6.8', trend: '上涨' },
  { id: '4', productName: '辣椒', category: '茄果类', totalSales: 65400, totalVolume: 7680, orderCount: 98, avgPrice: 8.52, changeRate: '2.1', trend: '平稳' },
  { id: '5', productName: '生菜', category: '叶菜类', totalSales: 42800, totalVolume: 8560, orderCount: 67, avgPrice: 5.0, changeRate: '-5.5', trend: '下跌' },
  { id: '6', productName: '西瓜', category: '瓜果类', totalSales: 35600, totalVolume: 7120, orderCount: 45, avgPrice: 5.0, changeRate: '-3.2', trend: '下跌' },
  { id: '7', productName: '葡萄', category: '浆果类', totalSales: 28400, totalVolume: 2360, orderCount: 34, avgPrice: 12.03, changeRate: '9.8', trend: '上涨' },
  { id: '8', productName: '茄子', category: '茄果类', totalSales: 21200, totalVolume: 2940, orderCount: 56, avgPrice: 7.21, changeRate: '1.5', trend: '平稳' },
  { id: '9', productName: '菠菜', category: '叶菜类', totalSales: 15600, totalVolume: 3460, orderCount: 43, avgPrice: 4.51, changeRate: '3.4', trend: '上涨' },
  { id: '10', productName: '樱桃番茄', category: '茄果类', totalSales: 12800, totalVolume: 920, orderCount: 28, avgPrice: 13.91, changeRate: '2.9', trend: '上涨' },
];

// =============================================================
// 7. 销售总览 mock 数据（10 条）
// =============================================================
const sales = [
  { salesNo: 'SA2026001', period: '2026-03 第1周', totalSales: 1258000, onlineSales: 756000, offlineSales: 502000, growth: 10.5, topProduct: '阳光玫瑰葡萄', topRegion: '华北' },
  { salesNo: 'SA2026002', period: '2026-02 第4周', totalSales: 1137000, onlineSales: 682000, offlineSales: 455000, growth: 8.2, topProduct: '阳光玫瑰葡萄', topRegion: '华北' },
  { salesNo: 'SA2026003', period: '2026-02 第3周', totalSales: 1052000, onlineSales: 631000, offlineSales: 421000, growth: 6.7, topProduct: '红提葡萄', topRegion: '华东' },
  { salesNo: 'SA2026004', period: '2026-02 第2周', totalSales: 985000, onlineSales: 591000, offlineSales: 394000, growth: 4.5, topProduct: '阳光玫瑰葡萄', topRegion: '华北' },
  { salesNo: 'SA2026005', period: '2026-02 第1周', totalSales: 942000, onlineSales: 565000, offlineSales: 377000, growth: 3.8, topProduct: '夏黑葡萄', topRegion: '华南' },
  { salesNo: 'SA2026006', period: '2026-01 第4周', totalSales: 908000, onlineSales: 545000, offlineSales: 363000, growth: 2.1, topProduct: '阳光玫瑰葡萄', topRegion: '华北' },
  { salesNo: 'SA2026007', period: '2026-01 第3周', totalSales: 889000, onlineSales: 533000, offlineSales: 356000, growth: -1.2, topProduct: '巨峰葡萄', topRegion: '华中' },
  { salesNo: 'SA2026008', period: '2026-01 第2周', totalSales: 899000, onlineSales: 539000, offlineSales: 360000, growth: 5.6, topProduct: '红提葡萄', topRegion: '华东' },
  { salesNo: 'SA2026009', period: '2026-01 第1周', totalSales: 851000, onlineSales: 510000, offlineSales: 341000, growth: 0.8, topProduct: '阳光玫瑰葡萄', topRegion: '华北' },
  { salesNo: 'SA2026010', period: '2025-12 第4周', totalSales: 844000, onlineSales: 506000, offlineSales: 338000, growth: 7.3, topProduct: '夏黑葡萄', topRegion: '华南' },
];

// =============================================================
// 路由实现
// =============================================================

// GET /market/order - 销售订单列表
router.get('/order', (req, res) => {
  res.json({ data: orders, total: orders.length });
});

// GET /market/customer - 客户列表
router.get('/customer', (req, res) => {
  res.json({ data: customers, total: customers.length });
});

// GET /market/price - 价格行情列表
router.get('/price', (req, res) => {
  res.json({ data: prices, total: prices.length });
});

// GET /market/channel - 销售渠道列表
router.get('/channel', (req, res) => {
  res.json({ data: channels, total: channels.length });
});

// GET /market/trend - 市场行情列表
router.get('/trend', (req, res) => {
  res.json({ data: trends, total: trends.length });
});

// GET /market/statistics - 销售统计列表
router.get('/statistics', (req, res) => {
  res.json({ data: statistics, total: statistics.length });
});

// GET /market/sales - 销售总览（单一对象，对齐前端 SalesOverview interface）
router.get('/sales', (req, res) => {
  const totalSales = sales.reduce((s, x) => s + x.totalSales, 0);
  const totalOnline = sales.reduce((s, x) => s + x.onlineSales, 0);
  const totalOffline = sales.reduce((s, x) => s + x.offlineSales, 0);
  res.json({
    monthSales: totalSales,
    orderCount: sales.length,
    customerCount: Math.round(sales.length * 1.5),
    avgPrice: Math.round(totalSales / Math.max(sales.length, 1) / 100) / 10,
    monthLabel: '本月',
    trend: sales.slice(0, 6).map((x, i) => ({
      month: x.period,
      amount: x.totalSales,
      orders: Math.round(x.totalSales / 5000),
    })),
    recentOrders: sales.slice(0, 5).map((x) => ({
      orderNo: x.salesNo,
      customer: x.topRegion,
      contact: '—',
      phone: '—',
      product: x.topProduct,
      quantity: 0,
      unitPrice: 0,
      amount: x.totalSales,
      status: '已完成',
      createDate: x.period,
      deliveryDate: '—',
      remark: '',
    })),
  });
});

export default router;
