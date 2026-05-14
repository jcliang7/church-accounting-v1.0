# 資料庫部署說明

## 部署順序（依序在 Supabase SQL Editor 執行）

1. `20260513001_create_tables.sql` － 建立所有資料表
2. `20260513002_seed_data.sql` － 插入初始資料
3. `20260513003_rls_policies.sql` － users 表 RLS 設定
4. `20260513004_grant_privileges.sql` － 授予 authenticated 權限
5. `20260514005_create_members.sql` － 建立 members 表
6. `20260514006_rls_lookup_tables.sql` － 查詢表 RLS 設定

## 環境變數設定
複製 `.env.local.example` 為 `.env.local` 並填入：
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

## Google OAuth 設定
1. Google Cloud Console 建立 OAuth 用戶端
2. 已授權 JavaScript 來源：http://localhost:5173（開發）
3. 已授權重新導向 URI：https://{project}.supabase.co/auth/v1/callback
4. Supabase Authentication → Providers → Google 填入 Client ID 和 Secret
