/**
 * 任务派发模块导出
 */

// 主页面
export { DispatchPage } from './DispatchPage';

// Tab组件
export { FarmDispatchTab } from './components/dispatch/FarmDispatchTab';
export { TempTaskTab } from './components/dispatch/TempTaskTab';
export { SmartDispatchTab } from './components/dispatch/SmartDispatchTab';

// 表格组件
export { FarmTaskTable } from './components/dispatch/FarmTaskTable';
export { TempTaskTable } from './components/dispatch/TempTaskTable';
export { SmartTaskTable } from './components/dispatch/SmartTaskTable';

// 表单组件
export { FarmTaskForm } from './components/dispatch/FarmTaskForm';
export { TempTaskForm } from './components/dispatch/TempTaskForm';
export { SmartTaskForm } from './components/dispatch/SmartTaskForm';

// 共享组件
export { ExecutorSelect } from './components/shared/ExecutorSelect';
export { RecommendIndicator, RecommendProgress, RecommendBadge } from './components/shared/RecommendIndicator';
export { TaskDetail } from './components/shared/TaskDetail';

// Hooks
export { useDispatch } from './hooks/useDispatch';
export { useSmartRecommend } from './hooks/useSmartRecommend';

// 类型
export * from './types/dispatch';

// 配置
export * from './config/dispatchConfig';
