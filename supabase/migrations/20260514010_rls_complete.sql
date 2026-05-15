-- =============================================
-- 完整 RLS Policy 設定（最終版）
-- =============================================

-- 先刪除所有舊的 policies 避免衝突
DROP POLICY IF EXISTS "users can read own profile" ON users;
DROP POLICY IF EXISTS "users can insert own profile" ON users;
DROP POLICY IF EXISTS "admin can read all users" ON users;
DROP POLICY IF EXISTS "admin can update all users" ON users;
DROP POLICY IF EXISTS "authenticated can read members" ON members;
DROP POLICY IF EXISTS "authenticated can read ministry_funds" ON ministry_funds;
DROP POLICY IF EXISTS "authenticated can read subject_category_mapping" ON subject_category_mapping;
DROP POLICY IF EXISTS "authenticated can read accounting_item_mapping" ON accounting_item_mapping;
DROP POLICY IF EXISTS "authenticated can read payment_methods" ON payment_methods;
DROP POLICY IF EXISTS "admin manager can read donors" ON donors;
DROP POLICY IF EXISTS "admin can write donors" ON donors;
DROP POLICY IF EXISTS "admin can insert donors" ON donors;
DROP POLICY IF EXISTS "admin can update donors" ON donors;
DROP POLICY IF EXISTS "admin manager can read offerings" ON offerings;
DROP POLICY IF EXISTS "admin can write offerings" ON offerings;
DROP POLICY IF EXISTS "admin manager can read receipts" ON receipts;
DROP POLICY IF EXISTS "admin can write receipts" ON receipts;
DROP POLICY IF EXISTS "user can read own payment_requests" ON payment_requests;
DROP POLICY IF EXISTS "user can insert own payment_requests" ON payment_requests;
DROP POLICY IF EXISTS "admin can update payment_requests" ON payment_requests;
DROP POLICY IF EXISTS "user can read own expense_items" ON expense_items;
DROP POLICY IF EXISTS "user can write own expense_items" ON expense_items;
DROP POLICY IF EXISTS "authenticated can read offering_types" ON offering_types;
DROP POLICY IF EXISTS "authenticated can read bank_accounts" ON bank_accounts;
DROP POLICY IF EXISTS "authenticated can read system_configs" ON system_configs;

-- =============================================
-- users
-- =============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select"
  ON users FOR SELECT TO authenticated
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "users insert"
  ON users FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users update"
  ON users FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- =============================================
-- members
-- =============================================
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members select"
  ON members FOR SELECT TO authenticated USING (true);

CREATE POLICY "members insert"
  ON members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "members update"
  ON members FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- =============================================
-- donors
-- =============================================
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "donors select"
  ON donors FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

CREATE POLICY "donors insert"
  ON donors FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "donors update"
  ON donors FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- =============================================
-- offerings
-- =============================================
ALTER TABLE offerings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offerings select"
  ON offerings FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

CREATE POLICY "offerings insert"
  ON offerings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "offerings update"
  ON offerings FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- =============================================
-- receipts
-- =============================================
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "receipts select"
  ON receipts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

CREATE POLICY "receipts insert"
  ON receipts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "receipts update"
  ON receipts FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- =============================================
-- payment_requests
-- =============================================
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_requests select"
  ON payment_requests FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    OR applicant_id = (SELECT id FROM members WHERE full_name = (SELECT full_name FROM users WHERE id = auth.uid()))
  );

CREATE POLICY "payment_requests insert"
  ON payment_requests FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "payment_requests update"
  ON payment_requests FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    OR (
      status = 0
      AND applicant_id = (SELECT id FROM members WHERE full_name = (SELECT full_name FROM users WHERE id = auth.uid()))
    )
  );

-- =============================================
-- expense_items
-- =============================================
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_items select"
  ON expense_items FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    OR EXISTS (
      SELECT 1 FROM payment_requests pr
      WHERE pr.id = request_id
      AND pr.applicant_id = (SELECT id FROM members WHERE full_name = (SELECT full_name FROM users WHERE id = auth.uid()))
    )
  );

CREATE POLICY "expense_items insert"
  ON expense_items FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "expense_items update"
  ON expense_items FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM payment_requests pr
      WHERE pr.id = request_id AND pr.status = 0
      AND pr.applicant_id = (SELECT id FROM members WHERE full_name = (SELECT full_name FROM users WHERE id = auth.uid()))
    )
  );

-- =============================================
-- 查詢用主檔（所有登入者可讀，admin 可寫）
-- =============================================
ALTER TABLE ministry_funds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ministry_funds select" ON ministry_funds FOR SELECT TO authenticated USING (true);
CREATE POLICY "ministry_funds insert" ON ministry_funds FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "ministry_funds update" ON ministry_funds FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE offering_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offering_types select" ON offering_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "offering_types insert" ON offering_types FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "offering_types update" ON offering_types FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bank_accounts select" ON bank_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "bank_accounts insert" ON bank_accounts FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "bank_accounts update" ON bank_accounts FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_methods select" ON payment_methods FOR SELECT TO authenticated USING (true);
CREATE POLICY "payment_methods insert" ON payment_methods FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "payment_methods update" ON payment_methods FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE subject_category_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subject_category_mapping select" ON subject_category_mapping FOR SELECT TO authenticated USING (true);
CREATE POLICY "subject_category_mapping insert" ON subject_category_mapping FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "subject_category_mapping update" ON subject_category_mapping FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE accounting_item_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounting_item_mapping select" ON accounting_item_mapping FOR SELECT TO authenticated USING (true);
CREATE POLICY "accounting_item_mapping insert" ON accounting_item_mapping FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "accounting_item_mapping update" ON accounting_item_mapping FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE system_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_configs select" ON system_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "system_configs insert" ON system_configs FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "system_configs update" ON system_configs FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
