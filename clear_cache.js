// 清除 localStorage 中导致数据不匹配的 key
const keysToRemove = [
  'yuanxingtu_tasks',
  'yuanxingtu_tasks_version',
  'yuanxingtu_tasks_records',
  'yuanxingtu_tasks_reminders'
];

keysToRemove.forEach(key => {
  localStorage.removeItem(key);
  console.log('已清除:', key);
});

console.log('已清除所有相关 localStorage 数据，请刷新页面');
