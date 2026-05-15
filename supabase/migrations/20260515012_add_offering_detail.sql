-- 新增奉獻明細欄位
ALTER TABLE offerings ADD COLUMN offering_detail TEXT;

-- 新增 envelope_label 欄位（已在 Supabase 執行過，備份用）
-- ALTER TABLE offering_types ADD COLUMN envelope_label TEXT;
-- UPDATE offering_types SET envelope_label = '什一' WHERE id = 1;
-- UPDATE offering_types SET envelope_label = '感恩' WHERE id = 2;
-- UPDATE offering_types SET envelope_label = '其他' WHERE id = 3;
-- UPDATE offering_types SET envelope_label = '建殿' WHERE id = 5;
