-- 更新供应商类型字典
-- 执行方式：sqlite3 server/data/yuanxingtu.db < server/src/db/updateSupplierType.sql

-- 1. 删除现有的供应商类型字典项
DELETE FROM dictionaries WHERE category_code = 'supplier_type';

-- 2. 插入正确的供应商类型（与供应商编码规则保持一致）
-- 供应商编码规则：SU_前缀 + 大类(SP/FE/PP/EQ/FA/IR/OP/PH/TS/UT/OT) + 中类(2位) + 流水号(3位)

INSERT INTO dictionaries (id, category_code, dict_code, dict_label, dict_value, color, sort_order, is_default, status, created_at, updated_at) VALUES
('D001', 'supplier_type', 'SP', '种子与种苗类', 'SP', 'blue', 1, 1, 'active', datetime('now'), datetime('now')),
('D002', 'supplier_type', 'FE', '肥料与土壤改良类', 'FE', 'green', 2, 1, 'active', datetime('now'), datetime('now')),
('D003', 'supplier_type', 'PP', '农药与植保产品类', 'PP', 'red', 3, 1, 'active', datetime('now'), datetime('now')),
('D004', 'supplier_type', 'EQ', '农业机械与设备类', 'EQ', 'orange', 4, 1, 'active', datetime('now'), datetime('now')),
('D005', 'supplier_type', 'FA', '设施农业资材类', 'FA', 'purple', 5, 1, 'active', datetime('now'), datetime('now')),
('D006', 'supplier_type', 'IR', '灌溉与水肥一体化类', 'IR', 'cyan', 6, 1, 'active', datetime('now'), datetime('now')),
('D007', 'supplier_type', 'OP', '日常劳保与劳动工具类', 'OP', 'pink', 7, 1, 'active', datetime('now'), datetime('now')),
('D008', 'supplier_type', 'PH', '仓储与物流资材类', 'PH', 'indigo', 8, 1, 'active', datetime('now'), datetime('now')),
('D009', 'supplier_type', 'TS', '检测与技术服务类', 'TS', 'teal', 9, 1, 'active', datetime('now'), datetime('now')),
('D010', 'supplier_type', 'UT', '能源与辅助耗材类', 'UT', 'yellow', 10, 1, 'active', datetime('now'), datetime('now')),
('D011', 'supplier_type', 'OT', '其他综合类', 'OT', 'gray', 11, 1, 'active', datetime('now'), datetime('now'));

-- 3. 验证更新结果
SELECT '更新后的供应商类型字典：' AS msg;
SELECT id, dict_code, dict_label, sort_order FROM dictionaries WHERE category_code = 'supplier_type' ORDER BY sort_order;
