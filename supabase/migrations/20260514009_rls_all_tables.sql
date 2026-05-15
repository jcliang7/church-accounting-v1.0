-- =============================================
-- 完整 RLS Policy 設定
-- =============================================

-- donors（奉獻者）：admin/manager 可讀寫，user 無權限
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manager can read donors"
  ON donors FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );
CREATE POLICY "admin can write donors"
  ON donors FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- offerings（奉獻紀錄）：admin/manager 可讀，admin 可寫
ALTER TABLE offerings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manager can read offerings"
  ON offerings FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );
CREATE POLICY "admin can write offerings"
  ON offerings FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- receipts（收據）：admin/manager 可讀，admin 可寫
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manager can read receipts"
  ON receipts FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );
CREATE POLICY "admin can write receipts"
  ON receipts FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- payment_requests（請款單）：user 只看自己的，admin/manager 看全部
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user can read own payment_requests"
  ON payment_requests FOR SELECT TO authenticated
  USING (
    applicant_id = (SELECT id FROM members WHERE full_name = (SELECT full_name FROM users WHERE id = auth.uid()))
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );
CREATE POLICY "user can insert own payment_requests"
  ON payment_requests FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "admin can update payment_requests"
  ON payment_requests FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- expense_items（支出細項）：跟著 payment_requests 走
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user can read own expense_items"
  ON expense_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payment_requests pr
      WHERE pr.id = request_id
      AND (
        pr.applicant_id = (SELECT id FROM members WHERE full_name = (SELECT full_name FROM users WHERE id = auth.uid()))
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
      )
    )
  );
CREATE POLICY "user can write own expense_items"
  ON expense_items FOR ALL TO authenticated
  USING (true);

-- offering_types
ALTER TABLE offering_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated can read offering_types"
  ON offering_types FOR SELECT TO authenticated USING (true);

-- bank_accounts
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated can read bank_accounts"
  ON bank_accounts FOR SELECT TO authenticated USING (true);

-- system_configs
ALTER TABLE system_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated can read system_configs"
  ON system_configs FOR SELECT TO authenticated USING (true);