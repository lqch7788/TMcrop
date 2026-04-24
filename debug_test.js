// 读取 localStorage 检查任务数据
const data = localStorage.getItem('yuanxingtu_tasks');
if (data) {
  const parsed = JSON.parse(data);
  console.log('Version:', parsed.version);
  console.log('Tasks count:', parsed.data?.length || 0);
  console.log('First 3 tasks:', parsed.data?.slice(0, 3).map(t => ({id: t.id, status: t.status, title: t.title})));
}
