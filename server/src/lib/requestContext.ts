/**
 * 请求上下文（2026-10-25）
 *
 * 背景：
 *   「当前登录基地」原本只能通过 `req.currentBaseOid` 在路由层拿到。
 *   但库存/流转/作物实例的写入有一部分在 service 层（circulation.service、
 *   cropInstance.service、inventory.repository），拿不到 `req`，
 *   于是这些表会写出 base_oid 为空的记录 —— 读过滤收紧后它们会从所有基地消失。
 *
 * 方案：
 *   用 AsyncLocalStorage 在 `currentBaseContext` 中间件里把当前基地放进异步上下文，
 *   service 层通过 `getContextBaseOid()` 取值，不必逐层改函数签名。
 *
 * 约束：
 *   - 只在一次 HTTP 请求的生命周期内有效；脚本/定时任务里调用返回 null
 *   - 不做授权判断，只做上下文传递（授权仍由 dataScope / checkBasePermission 负责）
 */
import { AsyncLocalStorage } from 'async_hooks';

interface RequestContext {
  /** 当前登录基地 OID；null = 未指定 */
  baseOid: string | null;
}

const storage = new AsyncLocalStorage<RequestContext>();

/** 在请求上下文中运行（由 currentBaseContext 中间件调用） */
export function runWithBaseContext<T>(baseOid: string | null, fn: () => T): T {
  return storage.run({ baseOid }, fn);
}

/** 取当前请求的基地 OID；不在请求上下文里返回 null */
export function getContextBaseOid(): string | null {
  return storage.getStore()?.baseOid ?? null;
}
