-- 建立 members 表（教會同工名單，不依賴是否登入過系統）
CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO members (full_name, role) VALUES
('楊澤宇', 'admin'),
('梁家萁', 'admin'),
('劉以愛', 'user'),
('黃冠瑜', 'user'),
('楊澤宏', 'user');

GRANT SELECT ON public.members TO authenticated;
