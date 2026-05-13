-- 表一：會計科目對照表1（科目 → 支出分類）
CREATE TABLE subject_category_mapping (
    id SERIAL PRIMARY KEY,
    subject_name TEXT UNIQUE NOT NULL,
    category_name TEXT NOT NULL
);

-- 表二：會計科目對照表2（科目名稱 → 編號 → 項目名稱）
CREATE TABLE accounting_item_mapping (
    id SERIAL PRIMARY KEY,
    item_detail_name TEXT UNIQUE NOT NULL,
    account_code TEXT NOT NULL,
    account_name TEXT NOT NULL
);

-- 表三：奉獻者資料表
CREATE TABLE donors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    main_id INTEGER,
    sub_id INTEGER DEFAULT 0,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    receipt_pref INTEGER DEFAULT 0, -- 0:不需要, 1:單次, 2:年度
    is_active BOOLEAN DEFAULT TRUE,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 表四：事工專款表
CREATE TABLE ministry_funds (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- 表五：奉獻項目主檔
CREATE TABLE offering_types (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    default_account TEXT,
    default_fund_id INTEGER
);

-- 表六：銀行帳戶主檔
CREATE TABLE bank_accounts (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    branch_name TEXT
);

-- 表七：支出方式主檔
CREATE TABLE payment_methods (
    id SERIAL PRIMARY KEY,
    method_name TEXT NOT NULL,
    remarks TEXT
);

-- 表八：使用者與權限表
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 表九：收據管理總表
CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_no TEXT UNIQUE NOT NULL,
    donor_id UUID REFERENCES donors(id),
    receipt_category INTEGER, -- 1:單次, 2:年度
    frozen_amount INTEGER,
    issue_date DATE,
    status INTEGER DEFAULT 1, -- 1:正常, 0:作廢
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 表十：奉獻紀錄明細表
CREATE TABLE offerings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID REFERENCES donors(id),
    receipt_id UUID REFERENCES receipts(id),
    offering_type_id INTEGER REFERENCES offering_types(id),
    amount INTEGER NOT NULL,
    offering_date DATE NOT NULL,
    accounting_week DATE,
    fund_id INTEGER REFERENCES ministry_funds(id),
    receipt_pref INTEGER DEFAULT 0,
    payment_method_id INTEGER,
    bank_account_id INTEGER REFERENCES bank_accounts(id),
    transfer_info TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 表十一：支出請款單總表
CREATE TABLE payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    temp_id TEXT,
    formal_id TEXT UNIQUE,
    accounting_week DATE,
    status INTEGER DEFAULT 0, -- 0:草稿, 1:已核定鎖定
    applicant_id UUID REFERENCES users(id),
    payment_method_id INTEGER REFERENCES payment_methods(id),
    total_amount INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 表十二：支出細項明細表
CREATE TABLE expense_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES payment_requests(id) ON DELETE CASCADE,
    invoice_date DATE,
    invoice_no TEXT,
    budget_type INTEGER, -- 1:一般費用, 2:人事費用
    fund_id INTEGER REFERENCES ministry_funds(id),
    subject_id INTEGER REFERENCES subject_category_mapping(id),
    detail_id INTEGER REFERENCES accounting_item_mapping(id),
    activity_name TEXT,
    item_name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    payer_id UUID REFERENCES users(id),
    remarks TEXT
);

-- 表十三：系統參數表
CREATE TABLE system_configs (
    id SERIAL PRIMARY KEY,
    config_key TEXT UNIQUE NOT NULL,
    config_value TEXT
);