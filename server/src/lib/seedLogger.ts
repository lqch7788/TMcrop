/**
 * Seed 日志工具
 * 区分"首次导入"和"已存在跳过"两类日志
 *
 * - seedLog.info()  始终打印：首次启动的真实进度
 * - seedLog.skip()  默认静默：幂等跳过（受 SEED_VERBOSE=1 控制）
 * - seedLog.error() 始终打印：异常情况
 *
 * 使用：
 *   默认（安静模式）：npm run dev
 *   完整模式：       SEED_VERBOSE=1 npm run dev
 */

const isVerbose = process.env.SEED_VERBOSE === '1' || process.env.SEED_VERBOSE === 'true';

export const seedLog = {
  info: (msg: string, ...rest: unknown[]): void => {
    console.log(msg, ...rest);
  },
  skip: (msg: string, ...rest: unknown[]): void => {
    if (isVerbose) console.log(msg, ...rest);
  },
  error: (msg: string, ...rest: unknown[]): void => {
    console.error(msg, ...rest);
  },
};
