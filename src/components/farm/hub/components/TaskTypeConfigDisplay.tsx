/**
 * 任务类型配置只读显示组件（hub 目录下的转发入口）
 *
 * 2026-10-21：本文件此前是 taskDispatch/components/TaskTypeConfigDisplay.tsx 的一份
 *   **逐字复制**，但全项目没有任何地方 import 它（实际使用方是
 *   taskDispatch 版，被 farm/hub/TaskDetailModal、labor/myTasks/TaskDetailModal、
 *   labor/tempTask/TempTaskPage 三处引用）。
 *   两份复制品必然漂移 —— 2026-10-21 修复「[object Object]」显示缺陷时，
 *   若只改一份，另一份就会成为隐藏的坏副本。
 *
 * 处理方式：改为转发 taskDispatch 版（唯一实现），本文件保留以兼容潜在的
 *   历史 import 路径。不删除文件，也不再维护第二份实现。
 */

export { TaskTypeConfigDisplay } from '../../taskDispatch/components/TaskTypeConfigDisplay';
export type { TaskTypeConfigDisplayProps } from '../../taskDispatch/components/TaskTypeConfigDisplay';
