/**
 * 统一库存服务 V3.0
 * 基于架构设计：instance_id 追溯 + 事务日志 + 冻结管理 + 乐观锁
 */

import {
  InventoryStock,
  InventoryTransaction,
  InventoryFreeze,
  InventoryStatus,
  StockType,
  SourceType,
  TransactionType,
  BusinessType,
  FrozenType,
  FreezeStatus,
  InventoryOperationResult,
  AvailableQuantityResult,
  InboundRequest,
  OutboundRequest,
  FreezeRequest,
  TraceResult,
  DownstreamTraceResult,
} from '../types/inventory';

import type {
  IInventoryStockRepository,
  IInventoryTransactionRepository,
  IInventoryFreezeRepository,
} from '../types/inventory';

// ============================================
// localStorage 实现（后续可切换到真实数据库）
// ============================================

const STOCK_STORAGE_KEY = 'inventory_stock_v3';
const TRANSACTION_STORAGE_KEY = 'inventory_transaction_v3';
const FREEZE_STORAGE_KEY = 'inventory_freeze_v3';

/** 生成 instance_id */
function generateInstanceId(stockType: StockType): string {
  const prefix = stockType === StockType.SEED ? 'INS' : stockType === StockType.SEEDLING ? 'ISE' : 'IPR';
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const key = `${STOCK_STORAGE_KEY}_${prefix}_${dateStr}`;
  const stored = localStorage.getItem(key);
  const sequence = stored ? parseInt(stored, 10) + 1 : 1;
  localStorage.setItem(key, String(sequence));
  return `${prefix}-${dateStr}-${String(sequence).padStart(3, '0')}`;
}

/** 生成交易ID */
function generateTransactionId(): string {
  return `TRX-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/** 生成冻结ID */
function generateFreezeId(): string {
  return `FRZ-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

// ============================================
// Repository 实现（localStorage 版本）
// ============================================

class LocalStorageStockRepository implements IInventoryStockRepository {
  private getAll(): InventoryStock[] {
    const stored = localStorage.getItem(STOCK_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private save(stocks: InventoryStock[]): void {
    localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(stocks));
  }

  async create(stock: Omit<InventoryStock, 'version'>): Promise<InventoryStock> {
    const stocks = this.getAll();
    const newStock: InventoryStock = {
      ...stock,
      version: 1,
    };
    stocks.push(newStock);
    this.save(stocks);
    return newStock;
  }

  async findById(instanceId: string): Promise<InventoryStock | null> {
    const stocks = this.getAll();
    return stocks.find(s => s.instanceId === instanceId) || null;
  }

  async findByBusinessId(businessId: string): Promise<InventoryStock | null> {
    const stocks = this.getAll();
    return stocks.find(s => s.businessId === businessId) || null;
  }

  async findAll(filters?: {
    stockType?: StockType;
    status?: InventoryStatus;
    sourceType?: SourceType;
    productionPlanId?: string;
    baseId?: string;
    supplierId?: string;
  }): Promise<InventoryStock[]> {
    let stocks = this.getAll();
    if (filters) {
      if (filters.stockType) stocks = stocks.filter(s => s.stockType === filters.stockType);
      if (filters.status) stocks = stocks.filter(s => s.status === filters.status);
      if (filters.sourceType) stocks = stocks.filter(s => s.sourceType === filters.sourceType);
      if (filters.productionPlanId) stocks = stocks.filter(s => s.productionPlanId === filters.productionPlanId);
      if (filters.baseId) stocks = stocks.filter(s => s.baseId === filters.baseId);
      if (filters.supplierId) stocks = stocks.filter(s => s.supplierId === filters.supplierId);
    }
    return stocks;
  }

  async update(
    instanceId: string,
    updates: Partial<InventoryStock>,
    expectedVersion: number
  ): Promise<InventoryStock> {
    const stocks = this.getAll();
    const index = stocks.findIndex(s => s.instanceId === instanceId);
    if (index === -1) throw new Error(`库存实例 ${instanceId} 不存在`);

    const stock = stocks[index];
    if (stock.version !== expectedVersion) {
      throw new Error(`乐观锁冲突：期望版本 ${expectedVersion}，实际版本 ${stock.version}`);
    }

    stocks[index] = { ...stock, ...updates, version: stock.version + 1 };
    this.save(stocks);
    return stocks[index];
  }

  async updateQuantity(
    instanceId: string,
    newQuantity: number,
    expectedVersion: number
  ): Promise<InventoryStock> {
    return this.update(instanceId, { currentQuantity: newQuantity }, expectedVersion);
  }

  async getStats(filters?: {
    stockType?: StockType;
    baseId?: string;
  }): Promise<{
    totalInstances: number;
    totalQuantity: number;
    byStockType: Record<StockType, { count: number; quantity: number }>;
    lowStockCount: number;
    expiringCount: number;
  }> {
    let stocks = this.getAll();
    if (filters?.stockType) stocks = stocks.filter(s => s.stockType === filters.stockType);
    if (filters?.baseId) stocks = stocks.filter(s => s.baseId === filters.baseId);

    const byStockType = {
      [StockType.SEED]: { count: 0, quantity: 0 },
      [StockType.SEEDLING]: { count: 0, quantity: 0 },
      [StockType.PRODUCT]: { count: 0, quantity: 0 },
    };

    let lowStockCount = 0;
    let expiringCount = 0;
    const now = Date.now();

    for (const stock of stocks) {
      byStockType[stock.stockType].count++;
      byStockType[stock.stockType].quantity += stock.currentQuantity;

      if (stock.status === InventoryStatus.LOW_STOCK) lowStockCount++;

      if (stock.expiryDate) {
        const expiryTime = new Date(stock.expiryDate).getTime();
        if (expiryTime - now < 30 * 24 * 60 * 60 * 1000) expiringCount++;
      }
    }

    return {
      totalInstances: stocks.length,
      totalQuantity: stocks.reduce((sum, s) => sum + s.currentQuantity, 0),
      byStockType,
      lowStockCount,
      expiringCount,
    };
  }
}

class LocalStorageTransactionRepository implements IInventoryTransactionRepository {
  private getAll(): InventoryTransaction[] {
    const stored = localStorage.getItem(TRANSACTION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private save(transactions: InventoryTransaction[]): void {
    localStorage.setItem(TRANSACTION_STORAGE_KEY, JSON.stringify(transactions));
  }

  async create(transaction: Omit<InventoryTransaction, 'id'>): Promise<InventoryTransaction> {
    const transactions = this.getAll();
    const newTx: InventoryTransaction = {
      ...transaction,
      id: generateTransactionId(),
    };
    transactions.push(newTx);
    this.save(transactions);
    return newTx;
  }

  async findByInstanceId(instanceId: string): Promise<InventoryTransaction[]> {
    return this.getAll().filter(t => t.instanceId === instanceId);
  }

  async findByBusinessId(businessId: string): Promise<InventoryTransaction[]> {
    return this.getAll().filter(t => t.businessId === businessId);
  }

  async findAll(filters?: {
    stockType?: StockType;
    transactionType?: TransactionType;
    businessType?: BusinessType;
    startDate?: string;
    endDate?: string;
  }): Promise<InventoryTransaction[]> {
    let txs = this.getAll();
    if (filters) {
      if (filters.stockType) txs = txs.filter(t => t.stockType === filters.stockType);
      if (filters.transactionType) txs = txs.filter(t => t.transactionType === filters.transactionType);
      if (filters.businessType) txs = txs.filter(t => t.businessType === filters.businessType);
      if (filters.startDate) txs = txs.filter(t => t.operateDate >= filters.startDate!);
      if (filters.endDate) txs = txs.filter(t => t.operateDate <= filters.endDate!);
    }
    return txs;
  }
}

class LocalStorageFreezeRepository implements IInventoryFreezeRepository {
  private getAll(): InventoryFreeze[] {
    const stored = localStorage.getItem(FREEZE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private save(freezes: InventoryFreeze[]): void {
    localStorage.setItem(FREEZE_STORAGE_KEY, JSON.stringify(freezes));
  }

  async create(freeze: Omit<InventoryFreeze, 'id'>): Promise<InventoryFreeze> {
    const freezes = this.getAll();
    const newFreeze: InventoryFreeze = {
      ...freeze,
      id: generateFreezeId(),
    };
    freezes.push(newFreeze);
    this.save(freezes);
    return newFreeze;
  }

  async findByInstanceId(instanceId: string): Promise<InventoryFreeze[]> {
    return this.getAll().filter(f => f.instanceId === instanceId);
  }

  async findByBusinessId(businessId: string): Promise<InventoryFreeze[]> {
    return this.getAll().filter(f => f.businessId === businessId);
  }

  async unfreeze(id: string): Promise<InventoryFreeze> {
    const freezes = this.getAll();
    const index = freezes.findIndex(f => f.id === id);
    if (index === -1) throw new Error(`冻结记录 ${id} 不存在`);

    freezes[index] = {
      ...freezes[index],
      status: FreezeStatus.UNFROZEN,
      unfrozenDate: new Date().toISOString(),
    };
    this.save(freezes);
    return freezes[index];
  }

  async updateStatus(id: string, status: FreezeStatus): Promise<InventoryFreeze> {
    const freezes = this.getAll();
    const index = freezes.findIndex(f => f.id === id);
    if (index === -1) throw new Error(`冻结记录 ${id} 不存在`);

    freezes[index] = { ...freezes[index], status };
    this.save(freezes);
    return freezes[index];
  }
}

// ============================================
// 单例实例
// ============================================

const stockRepo = new LocalStorageStockRepository();
const txRepo = new LocalStorageTransactionRepository();
const freezeRepo = new LocalStorageFreezeRepository();

// ============================================
// 库存服务核心方法
// ============================================

/**
 * 计算可用数量
 */
export function calculateAvailableQuantity(stock: InventoryStock): number {
  return Math.max(0, stock.currentQuantity - stock.frozenQuantity);
}

/**
 * 入库操作
 * @param request 入库请求
 * @param operatorId 操作人ID
 * @param operatorName 操作人姓名
 */
export async function inbound(
  request: InboundRequest,
  operatorId: string,
  operatorName: string
): Promise<InventoryOperationResult> {
  try {
    const instanceId = generateInstanceId(request.stockType);
    const now = new Date().toISOString();

    // 1. 创建库存记录
    const stock = await stockRepo.create({
      instanceId,
      stockType: request.stockType,
      businessId: request.businessId,
      businessType: request.businessType,
      cropId: request.cropId,
      cropName: request.cropName,
      varietyId: request.varietyId,
      varietyName: request.varietyName,
      currentQuantity: request.quantity,
      frozenQuantity: 0,
      availableQuantity: request.quantity,
      unit: request.unit,
      sourceType: request.sourceType,
      supplierId: request.supplierId,
      supplierName: request.supplierName,
      baseId: request.baseId,
      baseName: request.baseName,
      productionPlanId: request.productionPlanId,
      productionPlanCode: request.productionPlanCode,
      sourceInstanceId: request.sourceInstanceId,
      sourceBusinessId: request.sourceBusinessId,
      sourceBusinessType: request.sourceBusinessType,
      status: InventoryStatus.IN_STOCK,
      inboundDate: now,
      expiryDate: request.extensions?.expiryDate as string || undefined,
    });

    // 2. 创建交易流水（同一事务中）
    await txRepo.create({
      instanceId,
      stockType: request.stockType,
      transactionType: TransactionType.INBOUND,
      quantity: request.quantity,
      balanceBefore: 0,
      balanceAfter: request.quantity,
      businessId: request.businessId,
      businessType: request.businessType,
      businessCode: request.businessCode,
      operatorId,
      operatorName,
      operateDate: now,
      remarks: request.remarks,
      extensions: request.extensions,
    });

    return {
      success: true,
      instanceId,
      newQuantity: stock.currentQuantity,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '入库失败',
    };
  }
}

/**
 * 出库操作（带乐观锁校验）
 */
export async function outbound(
  request: OutboundRequest
): Promise<InventoryOperationResult> {
  try {
    const stock = await stockRepo.findById(request.instanceId);
    if (!stock) {
      return { success: false, error: `库存实例 ${request.instanceId} 不存在` };
    }

    // 检查可用数量
    const available = calculateAvailableQuantity(stock);
    if (available < request.quantity) {
      return {
        success: false,
        error: `可用数量不足：可用 ${available}，需要 ${request.quantity}`,
      };
    }

    const now = new Date().toISOString();
    const newQuantity = stock.currentQuantity - request.quantity;

    // 1. 更新库存（带版本校验）
    await stockRepo.updateQuantity(request.instanceId, newQuantity, stock.version);

    // 2. 创建交易流水
    await txRepo.create({
      instanceId: request.instanceId,
      stockType: stock.stockType,
      transactionType: TransactionType.OUTBOUND,
      quantity: -request.quantity,
      balanceBefore: stock.currentQuantity,
      balanceAfter: newQuantity,
      businessId: request.businessId,
      businessType: request.businessType,
      businessCode: request.businessCode,
      operatorId: request.operatorId,
      operatorName: request.operatorName,
      operateDate: now,
      remarks: request.remarks,
    });

    // 3. 更新状态
    let newStatus = stock.status;
    if (newQuantity === 0) {
      newStatus = InventoryStatus.EMPTY;
    } else if (newQuantity < stock.frozenQuantity) {
      newStatus = InventoryStatus.FROZEN;
    } else if (newQuantity <= (stock.currentQuantity * 0.2)) {
      newStatus = InventoryStatus.LOW_STOCK;
    }

    if (newStatus !== stock.status) {
      await stockRepo.update(request.instanceId, { status: newStatus }, stock.version + 1);
    }

    return {
      success: true,
      instanceId: request.instanceId,
      newQuantity,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '出库失败',
    };
  }
}

/**
 * 冻结库存（带数量校验）
 */
export async function freezeInventory(
  request: FreezeRequest
): Promise<InventoryOperationResult> {
  try {
    const stock = await stockRepo.findById(request.instanceId);
    if (!stock) {
      return { success: false, error: `库存实例 ${request.instanceId} 不存在` };
    }

    // 校验冻结数量不能超过可用数量
    const available = calculateAvailableQuantity(stock);
    if (available < request.frozenQuantity) {
      return {
        success: false,
        error: `冻结数量超过可用数量：可用 ${available}，欲冻结 ${request.frozenQuantity}`,
      };
    }

    const now = new Date().toISOString();

    // 1. 创建冻结记录
    await freezeRepo.create({
      instanceId: request.instanceId,
      frozenType: request.frozenType,
      frozenQuantity: request.frozenQuantity,
      businessId: request.businessId,
      businessType: request.businessType,
      status: FreezeStatus.FROZEN,
      frozenDate: now,
      operatorId: request.operatorId,
      operatorName: request.operatorName,
      remarks: request.remarks,
    });

    // 2. 更新库存冻结数量
    await stockRepo.update(
      request.instanceId,
      { frozenQuantity: stock.frozenQuantity + request.frozenQuantity },
      stock.version
    );

    // 3. 更新状态为冻结
    if (stock.status === InventoryStatus.IN_STOCK) {
      await stockRepo.update(
        request.instanceId,
        { status: InventoryStatus.FROZEN },
        stock.version + 1
      );
    }

    return {
      success: true,
      instanceId: request.instanceId,
      newQuantity: stock.currentQuantity,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '冻结失败',
    };
  }
}

/**
 * 解冻库存
 */
export async function unfreezeInventory(
  freezeId: string
): Promise<InventoryOperationResult> {
  try {
    const freeze = (await freezeRepo.findByInstanceId('')).find(f => f.id === freezeId);
    if (!freeze) {
      return { success: false, error: `冻结记录 ${freezeId} 不存在` };
    }

    const stock = await stockRepo.findById(freeze.instanceId);
    if (!stock) {
      return { success: false, error: `库存实例 ${freeze.instanceId} 不存在` };
    }

    // 1. 解冻
    await freezeRepo.unfreeze(freezeId);

    // 2. 更新库存冻结数量
    await stockRepo.update(
      freeze.instanceId,
      { frozenQuantity: Math.max(0, stock.frozenQuantity - freeze.frozenQuantity) },
      stock.version
    );

    // 3. 检查是否需要更新状态
    const updatedStock = await stockRepo.findById(freeze.instanceId);
    if (updatedStock && updatedStock.frozenQuantity === 0) {
      const newStatus = updatedStock.currentQuantity > 0
        ? InventoryStatus.IN_STOCK
        : InventoryStatus.EMPTY;
      await stockRepo.update(freeze.instanceId, { status: newStatus }, updatedStock.version + 1);
    }

    return {
      success: true,
      instanceId: freeze.instanceId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '解冻失败',
    };
  }
}

/**
 * 查询可用数量
 */
export async function getAvailableQuantity(
  instanceId: string
): Promise<AvailableQuantityResult | null> {
  const stock = await stockRepo.findById(instanceId);
  if (!stock) return null;

  return {
    instanceId: stock.instanceId,
    currentQuantity: stock.currentQuantity,
    frozenQuantity: stock.frozenQuantity,
    availableQuantity: calculateAvailableQuantity(stock),
  };
}

/**
 * 溯源查询（递归改为循环+批量）
 */
export async function traceUpstream(
  instanceId: string,
  maxDepth: number = 10
): Promise<TraceResult[]> {
  const results: TraceResult[] = [];
  const visited = new Set<string>();
  const queue: { instanceId: string; depth: number }[] = [{ instanceId, depth: 0 }];

  // 循环查询代替递归
  while (queue.length > 0) {
    const current = queue.shift()!;

    if (visited.has(current.instanceId) || current.depth > maxDepth) continue;
    visited.add(current.instanceId);

    const stock = await stockRepo.findById(current.instanceId);
    if (!stock) continue;

    results.push({
      instanceId: stock.instanceId,
      stockType: stock.stockType,
      businessType: stock.businessType,
      businessId: stock.businessId,
      cropName: stock.cropName,
      varietyName: stock.varietyName,
      quantity: stock.currentQuantity,
      inboundDate: stock.inboundDate,
      sourceInstanceId: stock.sourceInstanceId,
    });

    // 批量添加上游引用（避免 N+1）
    if (stock.sourceInstanceId && !visited.has(stock.sourceInstanceId)) {
      queue.push({ instanceId: stock.sourceInstanceId, depth: current.depth + 1 });
    }
  }

  return results;
}

/**
 * 下游追溯
 */
export async function traceDownstream(
  instanceId: string,
  maxDepth: number = 10
): Promise<DownstreamTraceResult[]> {
  // 查找所有以当前 instanceId 为源头的交易记录
  const transactions = await txRepo.findAll({
    businessType: undefined,
  });

  const results: DownstreamTraceResult[] = [];
  const visited = new Set<string>();
  const queue: { instanceId: string; depth: number }[] = [{ instanceId, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (visited.has(current.instanceId) || current.depth > maxDepth) continue;
    visited.add(current.instanceId);

    // 查找所有引用当前实例的出库交易
    const relatedTxs = transactions.filter(
      t => t.transactionType === TransactionType.OUTBOUND &&
           t.businessId === current.instanceId
    );

    for (const tx of relatedTxs) {
      results.push({
        instanceId: tx.instanceId,
        stockType: tx.stockType,
        businessType: tx.businessType,
        businessId: tx.businessId,
        outboundQuantity: Math.abs(tx.quantity),
        outboundDate: tx.operateDate,
        targetInstanceId: tx.businessId,
      });

      if (!visited.has(tx.businessId)) {
        queue.push({ instanceId: tx.businessId, depth: current.depth + 1 });
      }
    }
  }

  return results;
}

/**
 * 获取库存列表
 */
export async function getInventoryList(filters?: {
  stockType?: StockType;
  status?: InventoryStatus;
  sourceType?: SourceType;
  productionPlanId?: string;
  baseId?: string;
  supplierId?: string;
}): Promise<InventoryStock[]> {
  return stockRepo.findAll(filters);
}

/**
 * 根据业务ID获取库存
 */
export async function getInventoryByBusinessId(
  businessId: string
): Promise<InventoryStock | null> {
  return stockRepo.findByBusinessId(businessId);
}

/**
 * 获取交易记录
 */
export async function getTransactions(instanceId: string): Promise<InventoryTransaction[]> {
  return txRepo.findByInstanceId(instanceId);
}

/**
 * 获取冻结记录
 */
export async function getFreezes(instanceId: string): Promise<InventoryFreeze[]> {
  return freezeRepo.findByInstanceId(instanceId);
}

/**
 * 获取库存统计
 */
export async function getInventoryStats(filters?: {
  stockType?: StockType;
  baseId?: string;
}) {
  return stockRepo.getStats(filters);
}

// ============================================
// 导出 Repository 接口（供依赖注入使用）
// ============================================

export {
  stockRepo,
  txRepo,
  freezeRepo,
  IInventoryStockRepository,
  IInventoryTransactionRepository,
  IInventoryFreezeRepository,
};
