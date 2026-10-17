/**
 * 回收站实体注册表
 *
 * 新增可回收实体时：实现 RecycleHandler 并在此注册，删除接口调用 archiveBeforeDelete 即可。
 */
import type { RecycleHandler } from './types';
import { plantingHandler, seedSourceHandler, seedlingHandler } from './handlers/p0.handlers';
import { dailyRecordHandler, fertilizerHandler, pesticideHandler } from './handlers/p1.handlers';
import {
  harvestRecordHandler,
  inventoryStockHandler,
  inventoryTransactionHandler,
  materialFlowHandler,
  plantingHarvestRecordHandler,
  propagationRecordHandler,
  wateringHandler,
} from './handlers/p2.handlers';

const handlers: RecycleHandler[] = [
  seedSourceHandler,
  seedlingHandler,
  plantingHandler,
  fertilizerHandler,
  pesticideHandler,
  dailyRecordHandler,
  // P2：库存/采收/浇水/繁殖/种植采收（可恢复）+ 流水/流转（只归档）
  inventoryStockHandler,
  harvestRecordHandler,
  plantingHarvestRecordHandler,
  wateringHandler,
  propagationRecordHandler,
  inventoryTransactionHandler,
  materialFlowHandler,
];

const registry = new Map<string, RecycleHandler>(handlers.map((h) => [h.entityType, h]));

export function getRecycleHandler(entityType: string): RecycleHandler | undefined {
  return registry.get(entityType);
}

export function listRecycleHandlers(): RecycleHandler[] {
  return [...handlers];
}
