/**
 * vitest 全局 setupFile - 必须在所有 test file 的 import 之前执行
 *
 * 2026-07-19 P0-fix: 解决两个长期问题
 * 1. auth.ts 顶层 throw (需要 DEMO_MODE / JWT_SECRET)
 *    → vitest transform 会把 `import` hoist 到文件最顶部,在 process.env 设置之前执行,
 *      导致 e2e test 顶部 `process.env.DEMO_MODE = 'true'` 赶不上 `import seedSourceRouter`
 *    → 在 setupFile 里统一设 env var,保证 import auth 时 env var 已生效
 * 2. seedSource.merge.e2e.test.ts 污染 prod db
 *    → DB_PATH_OVERRIDE 由该测试自己设 (在 import db 后,借 db/index.ts lazy resolve 在
 *      initDatabase() 时读取);其他测试不设,继续用 prod db 路径(不会污染因为没大量 INSERT)
 *
 * 注意: 此文件只在 vitest 测试时加载,prod server 不受影响
 */

// 演示模式 + JWT 密钥(防止 auth.ts 顶层 throw)
process.env.DEMO_MODE = 'true';
process.env.JWT_SECRET = 'vitest-test-secret-do-not-use-in-prod';
// 显式 NODE_ENV=test,避免不同 shell 环境导致 auth 误判为 production
process.env.NODE_ENV = process.env.NODE_ENV || 'test';