/**
 * 种源业务逻辑层 (Service)
 * 负责业务逻辑处理和数据转换
 */

import { seedSourceRepository, SeedSourceRepository } from '../repositories/seedSource.repository';
import { SeedSourceQuery, CreateSeedSourceDTO, UpdateSeedSourceDTO } from '../types/seedSource';

/**
 * 种源服务类
 * 提供种源相关业务逻辑
 */
export class SeedSourceService {
  private repository: SeedSourceRepository;

  constructor(repo?: SeedSourceRepository) {
    this.repository = repo || seedSourceRepository;
  }

  /**
   * 获取种源列表
   * @param query 查询条件
   * @returns 种源列表和分页信息
   */
  async getAll(query: SeedSourceQuery) {
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
   * 获取种源详情
   * @param id 种源ID
   * @returns 种源详情
   * @throws 错误如果记录不存在
   */
  async getById(id: string) {
    const item = await this.repository.findById(id);
    if (!item) {
      throw new Error('种源记录不存在');
    }
    return item;
  }

  /**
   * 创建种源
   * @param data 创建数据
   * @returns 创建结果
   */
  async create(data: CreateSeedSourceDTO) {
    // 生成ID
    const newId = data.id || `SS${Date.now()}`;

    // 设置默认值
    const record = {
      ...data,
      id: newId,
      source_origin: data.source_origin || 'external_purchase',
      status: data.status || 'active',
      remaining_quantity: data.remaining_quantity || data.quantity || 0,
      used_quantity: data.used_quantity || 0,
      quantity: data.quantity || 0
    };

    const result = await this.repository.create(record);
    return { id: result.id };
  }

  /**
   * 更新种源
   * @param id 种源ID
   * @param data 更新数据
   * @returns 更新结果
   */
  async update(id: string, data: UpdateSeedSourceDTO) {
    // 检查记录是否存在
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('种源记录不存在');
    }

    await this.repository.update(id, data);
    return { id };
  }

  /**
   * 删除种源
   * @param id 种源ID
   */
  async delete(id: string) {
    // 检查记录是否存在
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('种源记录不存在');
    }

    await this.repository.delete(id);
    return { id };
  }

  /**
   * 批量删除种源
   * @param ids 种源ID数组
   * @returns 删除结果
   */
  async deleteBatch(ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new Error('缺少 ids 参数');
    }

    const deletedCount = await this.repository.deleteBatch(ids);
    return { deletedCount };
  }

  /**
   * 生成种源编码
   * @param dateStr 日期字符串 (YYYYMMDD)
   * @returns 生成的编码，如 ZZ20260513-001
   */
  async generateCode(dateStr: string): Promise<string> {
    // 获取当日最大序号
    const maxSerial = await this.repository.getTodayMaxSerial(dateStr);
    const nextSerial = maxSerial + 1;
    // 格式: ZZ + 日期(8位) + "-" + 流水号(3位)
    const code = `ZZ${dateStr}-${nextSerial.toString().padStart(3, '0')}`;
    return code;
  }
}

// 导出单例
export const seedSourceService = new SeedSourceService();
