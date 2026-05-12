-- =============================================
-- 人工管理模块 + 相关模块人名替换脚本
-- 将所有俗套人名替换为金庸武侠人物
-- 执行时间: 2026-05-12
-- =============================================

-- =============================================
-- 1. teams 表 - leader_name
-- =============================================
UPDATE teams SET leader_name = '洪七公' WHERE leader_name = '李明辉';
UPDATE teams SET leader_name = '黄药师' WHERE leader_name = '张晓燕';
UPDATE teams SET leader_name = '欧阳锋' WHERE leader_name = '陈建国';
UPDATE teams SET leader_name = '一灯大师' WHERE leader_name = '赵文静';
UPDATE teams SET leader_name = '周伯通' WHERE leader_name = '孙丽娜';
UPDATE teams SET leader_name = '瑛姑' WHERE leader_name = '周建设';

-- =============================================
-- 2. problems 表 - reporter_name, assignee_name
-- =============================================
UPDATE problems SET reporter_name = '郭襄' WHERE reporter_name = '李四';
UPDATE problems SET reporter_name = '仪琳' WHERE reporter_name = '张三';
UPDATE problems SET assignee_name = '田伯光' WHERE assignee_name = '张三';
UPDATE problems SET assignee_name = '蓝凤凰' WHERE assignee_name = '李四';

-- =============================================
-- 3. inspections 表 - inspector_name
-- =============================================
UPDATE inspections SET inspector_name = '虚竹' WHERE inspector_name = '张三';
UPDATE inspections SET inspector_name = '王语嫣' WHERE inspector_name = '李四';

-- =============================================
-- 4. approvals 表 - applicant_name
-- =============================================
UPDATE approvals SET applicant_name = '萧峰' WHERE applicant_name = '张明';

-- =============================================
-- 5. harvest_records 表 - buyer_name
-- =============================================
UPDATE harvest_records SET buyer_name = '任我行' WHERE buyer_name = '张三';
UPDATE harvest_records SET buyer_name = '左冷禅' WHERE buyer_name = '李四';
UPDATE harvest_records SET buyer_name = '林平之' WHERE buyer_name = '王五';

-- =============================================
-- 验证查询
-- =============================================
-- SELECT 'teams:', leader_name FROM teams;
-- SELECT 'problems:', reporter_name, assignee_name FROM problems;
-- SELECT 'inspections:', inspector_name FROM inspections;
-- SELECT 'approvals:', applicant_name FROM approvals;
-- SELECT 'harvest_records:', buyer_name FROM harvest_records;
