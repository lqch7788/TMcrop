/**
 * 采收记录业务逻辑层 (Service)
 * 负责业务逻辑处理和数据转换
 */

import { harvestRepository, HarvestRepository, HarvestRecord, HarvestQuery, HarvestStats } from '../repositories/harvest.repository';

/**
 * 采收服务类
 * 提供采收相关业务逻辑
 */
export class HarvestService {
  private repository: HarvestRepository;

  constructor(repo?: HarvestRepository) {
    this.repository = repo || harvestRepository;
  }

  /**
   * 获取采收记录列表
   * @param query 查询条件
   * @returns 采收列表和分页信息
   */
  async getAll(query: HarvestQuery) {
    const { data, total } = await this.repository.findAll(query);
    return {
      data,
      meta: {
        total,
        page: query.page || 1,
        limit: query.limit || 50
      }
    };
  }

  /**
   * 获取采收记录详情
   * @param id 采收记录ID
   * @returns 采收记录详情
   * @throws 错误如果记录不存在
   */
  async getById(id: string): Promise<HarvestRecord> {
    const item = await this.repository.findById(id);
    if (!item || Object.keys(item).length === 0) {
      throw new Error('采收记录不存在');
    }
    return item;
  }

  /**
   * 创建采收记录
   * @param data 创建数据
   * @returns 创建结果
   */
  async create(data: Partial<HarvestRecord>): Promise<{ id: string }> {
    const newId = data.id || `HV${Date.now()}`;

    // 设置默认值
    const record = {
      ...data,
      id: newId,
      status: data.status || 'pending'
    };

    const result = await this.repository.create(record);
    return { id: result.id! };
  }

  /**
   * 更新采收记录
   * @param id 采收记录ID
   * @param data 更新数据
   * @returns 更新结果
   */
  async update(id: string, data: Partial<HarvestRecord>): Promise<{ id: string }> {
    // 检查记录是否存在
    const existing = await this.repository.findById(id);
    if (!existing || Object.keys(existing).length === 0) {
      throw new Error('采收记录不存在');
    }

    await this.repository.update(id, data);
    return { id };
  }

  /**
   * 删除采收记录
   * @param id 采收记录ID
   */
  async delete(id: string): Promise<{ id: string }> {
    // 检查记录是否存在
    const existing = await this.repository.findById(id);
    if (!existing || Object.keys(existing).length === 0) {
      throw new Error('采收记录不存在');
    }

    await this.repository.delete(id);
    return { id };
  }

  /**
   * 批量更新采收记录
   * @param ids ID数组
   * @param updates 更新数据
   * @returns 更新结果
   */
  async updateBatch(ids: string[], updates: Partial<HarvestRecord>): Promise<{ ids: string[]; updated: number }> {
    const updated = await this.repository.updateBatch(ids, updates);
    return { ids, updated };
  }

  /**
   * 批量删除采收记录
   * @param ids ID数组
   * @returns 删除结果
   */
  async deleteBatch(ids: string[]): Promise<{ deleted: string[]; failed: Array<{ id: string; reason: string }> }> {
    return this.repository.deleteBatch(ids);
  }

  /**
   * 根据批次号获取采收记录
   * @param batchCode 批次号
   * @returns 采收记录列表
   */
  async getByBatchCode(batchCode: string): Promise<HarvestRecord[]> {
    return this.repository.findByBatchCode(batchCode);
  }

  /**
   * 批量获取采收记录
   * @param ids ID数组
   * @returns 采收记录列表
   */
  async getByIds(ids: string[]): Promise<HarvestRecord[]> {
    if (!ids || ids.length === 0) {
      return [];
    }
    return this.repository.findByIds(ids);
  }

  /**
   * 获取采收统计数据
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param cropName 作物名称
   * @param greenhouseName 温室名称
   * @returns 统计数据
   */
  async getStats(startDate?: string, endDate?: string, cropName?: string, greenhouseName?: string): Promise<HarvestStats> {
    return this.repository.getStats(startDate, endDate, cropName, greenhouseName);
  }

  /**
   * 导出采收数据
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param cropName 作物名称
   * @param greenhouseName 温室名称
   * @param status 状态
   * @param format 导出格式
   * @returns 导出数据或CSV内容
   */
  async export(startDate?: string, endDate?: string, cropName?: string, greenhouseName?: string, status?: string, format?: string): Promise<{ data: HarvestRecord[]; meta: { total: number } } | string> {
    const items = await this.repository.export(startDate, endDate, cropName, greenhouseName, status);

    if (format === 'csv') {
      // CSV格式导出
      const headers = [
        '采收单号', '来源ID', '来源名称', '作物名称', '作物品种', '温室名称',
        '采收日期', '采收量', '单位', '单价', '总金额', '品质等级',
        '买家ID', '买家名称', '销售渠道', '状态', '备注', '创建人', '创建时间', '更新时间'
      ];
      const csvRows = [headers.join(',')];
      items.forEach((item: HarvestRecord) => {
        const row = [
          item.harvest_code || '',
          item.source_id || '',
          item.source_name || '',
          item.crop_name || '',
          item.crop_variety || '',
          item.greenhouse_name || '',
          item.harvest_date || '',
          item.harvest_quantity || 0,
          item.unit || '',
          item.unit_price || 0,
          item.total_amount || 0,
          item.quality_grade || '',
          item.buyer_id || '',
          item.buyer_name || '',
          item.sales_channel || '',
          item.status || '',
          (item.remarks || '').replace(/"/g, '""'),
          item.create_by || '',
          item.create_time || '',
          item.update_time || ''
        ].map(v => `"${v}"`).join(',');
        csvRows.push(row);
      });
      return csvRows.join('\n');
    }

    return { data: items, meta: { total: items.length } };
  }

  /**
   * 初始化采收记录
   * @returns 采收记录列表
   */
  async init(): Promise<{ data: HarvestRecord[]; meta: { total: number } }> {
    const items = await this.repository.init();
    return { data: items, meta: { total: items.length } };
  }

  /**
   * 重置采收记录
   */
  async reset(): Promise<void> {
    await this.repository.reset();
  }

  /**
   * 生成采收单号
   * @returns 采收单号
   */
  generateCode(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `HV${year}${month}${day}${hours}${minutes}${seconds}${random}`;
  }
}

// 导出单例
export const harvestService = new HarvestService();
