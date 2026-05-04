-- 修正作物品种数据错误
-- 问题：variety_name 被错误地存储为详细品种名称（如"大叶红颜"）而不是正确的品种名称（如"草莓"）
-- 编码规则：FR01 = 水果类-浆果类, variety_code = 01 对应"草莓"

-- 1. 修正 FR01 (草莓) 的 variety_name
-- FR010100xxx 系列应该是 水果类-浆果类-草莓-xxx
UPDATE crop_varieties
SET variety_name = '草莓'
WHERE crop_code LIKE 'FR01%'
  AND variety_code = '01'
  AND (variety_name != '草莓' OR variety_name IS NULL);

-- 2. 修正 FR02 (蓝莓) 的 variety_name
UPDATE crop_varieties
SET variety_name = '蓝莓'
WHERE crop_code LIKE 'FR02%'
  AND variety_code = '02'
  AND (variety_name != '蓝莓' OR variety_name IS NULL);

-- 3. 修正 FR03 (树莓) 的 variety_name
UPDATE crop_varieties
SET variety_name = '树莓'
WHERE crop_code LIKE 'FR03%'
  AND variety_code = '03'
  AND (variety_name != '树莓' OR variety_name IS NULL);

-- 4. 修正 FR04 (葡萄) 的 variety_name
UPDATE crop_varieties
SET variety_name = '葡萄'
WHERE crop_code LIKE 'FR04%'
  AND variety_code = '04'
  AND (variety_name != '葡萄' OR variety_name IS NULL);

-- 5. 修正 FR05 (猕猴桃) 的 variety_name
UPDATE crop_varieties
SET variety_name = '猕猴桃'
WHERE crop_code LIKE 'FR05%'
  AND variety_code = '05'
  AND (variety_name != '猕猴桃' OR variety_name IS NULL);

-- 6. 修正 FR06 (火龙果) 的 variety_name
UPDATE crop_varieties
SET variety_name = '火龙果'
WHERE crop_code LIKE 'FR06%'
  AND variety_code = '06'
  AND (variety_name != '火龙果' OR variety_name IS NULL);

-- 7. 修正 FR99 (其他浆果) 的 variety_name
UPDATE crop_varieties
SET variety_name = '其他浆果'
WHERE crop_code LIKE 'FR99%'
  AND variety_code = '99'
  AND (variety_name != '其他浆果' OR variety_name IS NULL);

-- 验证修正结果
SELECT crop_code, category_name, type_name, variety_name, sub_variety1_name, detail_variety_code
FROM crop_varieties
WHERE category_code = 'FR'
ORDER BY crop_code
LIMIT 20;
