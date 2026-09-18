/**
 * Service 层统一错误处理工具（2026-09-18 抽取自 6 个 service 的重复定义）
 * 之前每个 service 都各自定义一份 7 行的 handleServiceError，重复定义来自 service.ts → 本文件
 */
export function handleServiceError(error: unknown, operation: string): never {
  console.error(`${operation}失败:`, error);
  if (error instanceof Error) throw new Error(`${operation}失败: ${error.message}`);
  throw new Error(`${operation}失败: 未知错误`);
}