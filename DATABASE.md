# 資料表說明

中原生命樹財務系統 v1.0 資料庫結構說明。

---

## 1. users — 使用者與角色

對應 Supabase Auth，使用者首次登入時自動建立。

| 欄位 | 型態 | 說明 |
|------|------|------|
| id | UUID PK | 對應 `auth.users.id` |
| email | TEXT | 登入 Email |
| full_name | TEXT | 顯示名稱 |
| role | TEXT | 權限角色：`admin` / `manager` / `user`（預設 `user`）|
| created_at | TIMESTAMPTZ | 建立時間 |

---

## 2. members — 教會同工名單

供支出請款單選擇申請人、監督人、付款人用。與 `users` 獨立，不依賴是否登入過系統。

| 欄位 | 型態 | 說明 |
|------|------|------|
| id | SERIAL PK | 自增 ID |
| full_name | TEXT | 姓名 |
| role | TEXT | 角色：`admin` / `manager` / `user`（預設 `user`）|
| is_active | BOOLEAN | 是否在職（預設 `true`）|

**初始資料：**

| full_name | role |
|-----------|------|
| 楊澤宇 | admin |
| 梁家萁 | admin |
| 劉以愛 | user |
| 黃冠瑜 | user |
| 楊澤宏 | user |

---

## 3. donors — 奉獻者資料

| 欄位 | 型態 | 說明 |
|------|------|------|
| id | UUID PK | 自動產生 |
| main_id | INTEGER | 主編號（可為 null） |
| sub_id | INTEGER | 副編號（預設 `0`）；`0` 只顯示 main_id，`> 0` 顯示 `main_id-sub_id` |
| name | TEXT | 奉獻者姓名 |
| phone | TEXT | 電話 |
| email | TEXT | Email |
| address | TEXT | 地址 |
| receipt_pref | INTEGER | 收據偏好：`0` 待確認 / `1` 單次 / `2` 年度 / `3` 不需要（預設 `0`）|
| is_active | BOOLEAN | 是否在籍（預設 `true`）|
| note | TEXT | 備註 |
| created_at | TIMESTAMPTZ | 建立時間 |

**特殊記錄：**
- `name = '匿名奉獻'`：系統保留記錄，供匿名奉獻使用。
  勾選匿名 checkbox 時，系統自動查詢此記錄填入 donor_id。
  不顯示於奉獻人下拉選單。

---

## 4. offerings — 奉獻紀錄

| 欄位 | 型態 | 說明 |
|------|------|------|
| id | UUID PK | 自動產生 |
| donor_id | UUID FK | 參照 `donors.id`；匿名時填入匿名奉獻固定 UUID |
| receipt_id | UUID FK | 參照 `receipts.id`（選填）|
| offering_type_id | INTEGER FK | 參照 `offering_types.id` |
| offering_detail | TEXT | 奉獻明細，例如：5/10主日、特兒家庭營募款 |
| amount | INTEGER | 金額（新台幣）|
| offering_date | DATE | 奉獻日期 |
| accounting_week | DATE | 週別日期，通常為當週主日；匯款則填匯款日 |
| fund_id | INTEGER FK | 參照 `ministry_funds.id`（事工專款）|
| receipt_pref | INTEGER | 收據開立方式：`0` 待確認 / `1` 單次 / `2` 年度 / `3` 不需要 |
| offering_method_id | INTEGER FK | 參照 `offering_methods.id` |
| bank_account_id | INTEGER FK | 參照 `bank_accounts.id`（轉帳時填寫）|
| transfer_info | TEXT | 末五碼或匯款姓名（轉帳時填寫）|
| is_anonymous | BOOLEAN | 是否匿名（預設 `false`）|
| note | TEXT | 備註 |
| created_at | TIMESTAMPTZ | 建立時間 |

---

## 5. receipts — 收據管理

| 欄位 | 型態 | 說明 |
|------|------|------|
| id | UUID PK | 自動產生 |
| receipt_no | TEXT UNIQUE | 收據號碼 |
| donor_id | UUID FK | 參照 `donors.id` |
| receipt_category | INTEGER | `1` 單次 / `2` 年度 |
| frozen_amount | INTEGER | 金額（鎖定後不可改）|
| issue_date | DATE | 開立日期 |
| status | INTEGER | `1` 正常 / `0` 作廢（預設 `1`）|
| note | TEXT | 備註 |
| created_at | TIMESTAMPTZ | 建立時間 |

---

## 6. payment_requests — 支出請款單表頭

| 欄位 | 型態 | 說明 |
|------|------|------|
| id | UUID PK | 自動產生 |
| temp_id | TEXT | 臨時編號，格式：`T{YYYYMMDD}-{NN}`，例如 `T20260514-01` |
| formal_id | TEXT UNIQUE | 正式編號（核定後填入）|
| accounting_week | DATE | 帳務週別 |
| status | INTEGER | `0` 草稿 / `1` 已核定鎖定（預設 `0`）|
| applicant_id | INTEGER FK | 申請人，參照 `members.id` |
| supervisor_id | INTEGER FK | 監督人，參照 `members.id` |
| payment_method_id | INTEGER FK | 參照 `payment_methods.id` |
| total_amount | INTEGER | 總金額（自動加總，預設 `0`）|
| created_at | TIMESTAMPTZ | 建立時間 |

---

## 7. expense_items — 支出細項

每張請款單可有多筆細項，刪除請款單時連帶刪除。

| 欄位 | 型態 | 說明 |
|------|------|------|
| id | UUID PK | 自動產生 |
| request_id | UUID FK | 參照 `payment_requests.id`（CASCADE DELETE）|
| invoice_date | DATE | 發票／收據日期 |
| invoice_no | TEXT | 發票號碼 |
| budget_type | INTEGER | `1` 一般費用 / `2` 人事費用 |
| fund_id | INTEGER FK | 參照 `ministry_funds.id` |
| subject_id | INTEGER FK | 參照 `subject_category_mapping.id`（支出分類）|
| detail_id | INTEGER FK | 參照 `accounting_item_mapping.id`（科目細項）|
| activity_name | TEXT | 活動名稱 |
| item_name | TEXT | 品項名稱 |
| amount | INTEGER | 金額 |
| payer_id | INTEGER FK | 付款人，參照 `members.id` |
| note | TEXT | 備註 |

---

## 8. offering_types — 奉獻項目主檔

| 欄位 | 型態 | 說明 |
|------|------|------|
| id | SERIAL PK | 自增 ID |
| name | TEXT | 項目名稱（匯出 Excel 用）|
| default_account | TEXT | 預設會計科目（匯出 Excel 用）|
| default_fund_id | INTEGER | 預設事工專款 ID |
| envelope_label | TEXT | 信封標籤，表單顯示用；`NULL` 表示不開放選擇 |

**初始資料：**

| id | name | default_account | default_fund_id | envelope_label |
|----|------|-----------------|-----------------|----------------|
| 1 | 什一奉獻 | 什一奉獻 | 1 | 什一 |
| 2 | 感恩奉獻 | 感恩奉獻 | 1 | 感恩 |
| 3 | 指定奉獻 | 特別奉獻 | NULL | 其他 |
| 4 | 代轉奉獻 | 代轉奉獻 | NULL | NULL |
| 5 | 建殿奉獻 | 建殿奉獻 | NULL | 建殿 |

> 表單僅顯示 `envelope_label IS NOT NULL` 的選項（即排除代轉奉獻）。
> 選「什一」或「感恩」時自動鎖定 `fund_id = 1`；選「建殿」或「其他」時開放下拉。

---

## 9. ministry_funds — 事工專款

| 欄位 | 型態 | 說明 |
|------|------|------|
| id | SERIAL PK | 自增 ID |
| name | TEXT | 專款名稱 |
| is_active | BOOLEAN | 是否啟用（預設 `true`）|

**初始資料：**

| id | name |
|----|------|
| 1 | 經常費＋人事費 |
| 2 | 顯恩基金會 |
| 3 | 五餅二魚家庭扶助基金 |
| 4 | Blessing Mission 宣教基金 |
| 5 | 特兒家庭營 |

---

## 10. bank_accounts — 銀行帳戶

| 欄位 | 型態 | 說明 |
|------|------|------|
| id | SERIAL PK | 自增 ID |
| name | TEXT | 帳戶名稱（顯示用）|
| branch_name | TEXT | 分行名稱 |

**初始資料：**

| id | name | branch_name |
|----|------|-------------|
| 1 | 合庫 | 中原生命樹 |
| 2 | 郵局 | 中原生命樹 |

---

## 11. offering_methods — 奉獻存款方式

| 欄位 | 型態 | 說明 |
|------|------|------|
| id | SERIAL PK | 自增 ID |
| method_name | TEXT | 方式名稱 |

**初始資料：**

| id | method_name |
|----|-------------|
| 1 | 現金 |
| 2 | 轉帳 |

> 奉獻表單依 `method_name` 是否包含「轉帳」決定是否顯示銀行帳戶與末五碼欄位。

---

## 12. payment_methods — 支出方式

| 欄位 | 型態 | 說明 |
|------|------|------|
| id | SERIAL PK | 自增 ID |
| method_name | TEXT | 方式名稱 |
| remarks | TEXT | 備註 |

**初始資料：**

| id | method_name | 說明 |
|----|-------------|------|
| 1 | 現金-3 | 現金支付 |
| 2 | 轉帳 | 銀行轉帳（含銀行帳戶與末五碼欄位）|

> 奉獻表單依 `method_name` 是否包含「轉帳」決定是否顯示銀行帳戶與末五碼欄位。

---

## 13. subject_category_mapping — 會計科目 → 支出分類對照

支出請款表單第一層下拉，選科目後自動帶入支出分類。

| 欄位 | 型態 | 說明 |
|------|------|------|
| id | SERIAL PK | 自增 ID |
| subject_name | TEXT UNIQUE | 科目名稱（例如：主日崇拜、餐費）|
| category_name | TEXT | 對應支出分類（例如：宣教佈道、行政總務）|

共 97 筆初始資料，分類包含：人事費用、教會牧養、宣教佈道、行政總務、關懷、對外奉獻、代轉奉獻、財務事工、保險費、平台手續費、嶺頭禱告宣教中心、轉建堂、甚好-轉建堂。

---

## 14. accounting_item_mapping — 會計科目細項對照

支出請款表單第二層下拉，選細項後自動帶入科目編號與科目名稱。

| 欄位 | 型態 | 說明 |
|------|------|------|
| id | SERIAL PK | 自增 ID |
| item_detail_name | TEXT UNIQUE | 細項名稱（例如：餐費、講員費）|
| account_code | TEXT | 科目編號（例如：`6180`）|
| account_name | TEXT | 科目名稱（例如：伙食費）|

共 64 筆初始資料。

---

## 15. system_configs — 系統設定

| 欄位 | 型態 | 說明 |
|------|------|------|
| id | SERIAL PK | 自增 ID |
| config_key | TEXT UNIQUE | 設定鍵值 |
| config_value | TEXT | 設定內容 |

**初始資料：**

| config_key | config_value |
|------------|-------------|
| church_name | 中原生命樹浸信會 |
| default_supervisor | 楊澤宇 |
| default_branch | 中原生命樹 |
