# 中原生命樹財務系統 v1.0

中原生命樹浸信會內部財務管理系統，支援奉獻收入記帳、支出請款、奉獻者資料管理，並提供匯出 Excel 功能，以 React + Supabase 建置，部署於 Firebase Hosting。

---

## 技術架構

| 層次 | 技術 |
|------|------|
| 前端框架 | React 19 + Vite 8 |
| 樣式 | Tailwind CSS v4 |
| 路由 | React Router DOM v7 |
| 後端 / 資料庫 | Supabase（PostgreSQL + Auth） |
| 身份驗證 | Supabase Auth（Google OAuth） |
| Excel 匯出 | SheetJS（xlsx） |
| 部署 | Firebase Hosting |

---

## 環境變數

在專案根目錄建立 `.env` 檔，填入以下內容：

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> 兩個值都可以在 Supabase 專案後台 → **Project Settings → API** 中找到。

---

## 本地安裝與啟動

```bash
# 1. 複製專案
git clone https://github.com/jcliang7/church-accounting-v1.0.git
cd church-accounting-v1.0

# 2. 安裝套件
npm install

# 3. 設定環境變數（參考上方說明）
cp .env.example .env
# 編輯 .env，填入 Supabase URL 和 Anon Key

# 4. 啟動開發伺服器
npm run dev
```

瀏覽器開啟 `http://localhost:5173` 即可使用。

---

## Supabase 設定步驟

### 1. 建立新專案

1. 前往 [https://supabase.com](https://supabase.com)，登入後點擊 **New Project**
2. 填入專案名稱、設定資料庫密碼、選擇地區（建議 **Northeast Asia (Tokyo)**）
3. 等待專案初始化完成（約 1 分鐘）

### 2. 執行 SQL 建立資料表與初始資料

> ⚠️ **注意：** `sql/install/` 資料夾目前尚未整理，待系統功能完成後統一匯出。
> 目前請使用 `supabase/migrations/` 資料夾內的 migration 檔案，依序在 Supabase **SQL Editor** 中執行。

進入 Supabase 專案後台 → **SQL Editor**，依下列順序貼上並執行各檔案內容：

| 順序 | 檔案 | 說明 |
|------|------|------|
| 1 | `supabase/migrations/20260513001_create_tables.sql` | 建立所有資料表 |
| 2 | `supabase/migrations/20260513002_seed_data.sql` | 插入初始資料（專款、奉獻項目、科目對照等）|
| 3 | `supabase/migrations/20260514005_create_members.sql` | 建立同工名單表並插入初始成員 |
| 4 | `supabase/migrations/20260514010_rls_complete.sql` | 設定完整的 Row Level Security 權限 |
| 5 | `supabase/migrations/20260514011_fix_column_types.sql` | 修正欄位型態（applicant_id / payer_id）|
| 6 | `supabase/migrations/20260515012_add_offering_detail.sql` | 新增奉獻明細欄位 |

執行完畢後，另需在 Supabase **Table Editor** 或 SQL Editor 手動確認以下項目：
- `donors` 表中有一筆 `name = '匿名奉獻'` 的記錄（供匿名奉獻使用）
- `offering_methods` 表中有 `id=1 現金`、`id=2 轉帳` 兩筆記錄
- `offering_types` 表中 `envelope_label` 欄位已正確填入（什一 / 感恩 / 其他 / 建殿）

### 3. 開啟 Google OAuth

1. 進入 Supabase 後台 → **Authentication → Providers → Google**
2. 將 **Enable Sign in with Google** 切換為開啟
3. 前往 [Google Cloud Console](https://console.cloud.google.com/)：
   - 建立或選擇專案 → **APIs & Services → Credentials**
   - 點擊 **Create Credentials → OAuth 2.0 Client IDs**
   - 應用程式類型選 **Web application**
   - **Authorized redirect URIs** 填入：
     ```
     https://your-project-id.supabase.co/auth/v1/callback
     ```
4. 將 Google 產生的 **Client ID** 和 **Client Secret** 填回 Supabase Google Provider 設定頁
5. 在 Supabase → **Authentication → URL Configuration** 設定：
   - **Site URL**：部署後的正式網址（例如 `https://your-app.web.app`）
   - **Redirect URLs**：同上，加上 `http://localhost:5173`（本地開發用）

---

## Firebase Hosting 部署步驟

### 前置作業

```bash
# 安裝 Firebase CLI（若尚未安裝）
npm install -g firebase-tools

# 登入 Firebase
firebase login
```

### 初始化（第一次部署才需要）

```bash
# 在專案根目錄執行
firebase init hosting
```

設定選項：
- **What do you want to use as your public directory?** → 輸入 `dist`
- **Configure as a single-page app?** → `Yes`
- **Set up automatic builds with GitHub?** → 依需求選擇

### 建置與部署

```bash
# 建置生產版本
npm run build

# 部署到 Firebase Hosting
firebase deploy --only hosting
```

部署完成後，終端機會顯示網址，例如 `https://your-app.web.app`。

> 記得將此網址更新回 Supabase Authentication → URL Configuration 的 Site URL 與 Redirect URLs。

---

## 權限角色說明

| 角色 | 說明 |
|------|------|
| `admin` | 可新增、編輯所有資料；可看到所有請款單 |
| `manager` | 可查看所有請款單與奉獻紀錄，但不可新增/編輯 |
| `user` | 只能查看自己的請款單 |

使用者角色在 `users` 資料表中設定，首次登入時預設為 `user`，需由 admin 在 Supabase Table Editor 手動更改。

---

## 資料表說明

詳見 [DATABASE.md](./DATABASE.md)
