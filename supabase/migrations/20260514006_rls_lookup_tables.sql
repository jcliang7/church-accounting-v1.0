-- 開啟 RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministry_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_category_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_item_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- members：所有登入者可讀
CREATE POLICY "authenticated can read members"
  ON members FOR SELECT TO authenticated USING (true);

-- ministry_funds
CREATE POLICY "authenticated can read ministry_funds"
  ON ministry_funds FOR SELECT TO authenticated USING (true);

-- subject_category_mapping
CREATE POLICY "authenticated can read subject_category_mapping"
  ON subject_category_mapping FOR SELECT TO authenticated USING (true);

-- accounting_item_mapping
CREATE POLICY "authenticated can read accounting_item_mapping"
  ON accounting_item_mapping FOR SELECT TO authenticated USING (true);

-- payment_methods
CREATE POLICY "authenticated can read payment_methods"
  ON payment_methods FOR SELECT TO authenticated USING (true);
