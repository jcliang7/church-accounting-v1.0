-- 修正 payment_requests.applicant_id 型態（UUID → INTEGER 對應 members.id）
ALTER TABLE payment_requests 
ALTER COLUMN applicant_id TYPE INTEGER 
USING NULL;

-- 新增 supervisor_id 欄位
ALTER TABLE payment_requests 
ADD COLUMN supervisor_id INTEGER;

-- 修正 expense_items.payer_id 型態（UUID → INTEGER 對應 members.id）
ALTER TABLE expense_items 
ALTER COLUMN payer_id TYPE INTEGER 
USING NULL;
