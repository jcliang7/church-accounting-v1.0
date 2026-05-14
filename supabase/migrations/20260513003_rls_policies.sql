-- =============================================
-- RLS Policies
-- =============================================

-- users 表
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own profile"
ON users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "users can insert own profile"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "admin can read all users"
ON users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "admin can update all users"
ON users FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
);
